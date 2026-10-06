/**
 * `recordPrimaryEvidence` (track primary_mastery_evidence_20261006, FR-3 and FR-4): one source
 * event in, one `practice.v1` command per objective out, committed through the canonical
 * Mastery service with an idempotency key per source row, item, and objective. Shadow mode:
 * nothing here changes a screen.
 */
import type { DB } from "@reading-advantage/db";
import { longAnswerQuestions, multipleChoiceQuestions, shortAnswerQuestions } from "@reading-advantage/db/schema";
import type { ActivityPracticeSubmissionEnvelope } from "@reading-advantage/activity-runtime";
import { eq } from "drizzle-orm";
import { projectActivitySubmissionToMastery } from "../activity/activity-mastery-projection.js";
import { createTenantDB } from "../db-contract.js";
import { createDrizzleMasteryPersistence } from "../mastery/index.js";
import type { MasteryPersistencePort } from "../mastery/persistence-ports.js";
import { normalizeWord, stem } from "./coverage.js";
import {
  MAX_EVIDENCE_ITEMS,
  evidenceIdempotencyKey,
  primaryEvidenceEventSchema,
  type CommittedEvidence,
  type FlashcardReviewEvent,
  type GameCompletionEvent,
  type PrimaryEvidenceEvent,
  type QuestionAnswerEvent,
  type RecordPrimaryEvidenceResult,
  type SkippedEvidence,
} from "./evidence-contracts.js";
import { EVIDENCE_POLICY_VERSION, rateEvidence, type EvidenceContext, type EvidenceDecision, type EvidenceOutcome, type EvidenceSurface } from "./evidence-policy.js";
import { GRAPH_RELEASE } from "./objective-key.js";
import { getArticleWordNodes, getQuestionObjectives, type ArticleWordNode, type QuestionObjective } from "./queries.js";

/** What the recorder reads from the tag tables; a port so tests need no database. */
export interface EvidenceResolver {
  /** The objectives of the given questions, by question id. */
  questionObjectives(questionIds: string[]): Promise<Map<string, QuestionObjective[]>>;
  /** The glossary nodes of an article. */
  articleWordNodes(articleId: string): Promise<ArticleWordNode[]>;
  /** The question rows of an article, for the text match of story question items. */
  articleQuestions(articleId: string): Promise<{ id: string; type: string; question: string }[]>;
}

const UNSCOPED_REASON = "evidence resolver reads global content (EXEMPT): question rows and their graph links are shared by every school";

/**
 * The resolver over the Primary database.
 * @param db The database.
 * @returns A resolver backed by the T1 read functions.
 */
export function createDrizzleEvidenceResolver(db: DB): EvidenceResolver {
  const content = createTenantDB(db, { schoolId: null }).unscoped(UNSCOPED_REASON);
  return {
    questionObjectives: (questionIds) => getQuestionObjectives({ db, questionIds }),
    articleWordNodes: (articleId) => getArticleWordNodes({ db, articleId }),
    async articleQuestions(articleId) {
      const rows: { id: string; type: string; question: string }[] = [];
      for (const [type, table] of [["mcq", multipleChoiceQuestions], ["saq", shortAnswerQuestions], ["laq", longAnswerQuestions]] as const) {
        const found = await content.select({ id: table.id, question: table.question }).from(table).where(eq(table.articleId, articleId));
        for (const row of found) rows.push({ id: row.id, type, question: row.question ?? "" });
      }
      return rows;
    },
  };
}

/** Options of one recording. */
export interface RecordPrimaryEvidenceOptions {
  /** The database; optional when both the persistence and the resolver are given (tests). */
  db?: DB;
  tenant: { schoolId: string };
  event: PrimaryEvidenceEvent;
  persistence?: MasteryPersistencePort;
  resolver?: EvidenceResolver;
  /** The server time as ISO text. */
  now?: string;
}

/** One objective to commit for one item. */
interface Target {
  nodeId: string;
  skill: "Reading" | "Listening" | "Vocabulary";
}

const skillOf = (nodeId: string, shortId?: string): Target["skill"] => (nodeId.startsWith("english.vocabulary.") ? "Vocabulary" : shortId?.startsWith("L") ? "Listening" : "Reading");

const normalizeText = (text: string): string => text.replace(/\s+/g, " ").trim().toLowerCase();

/**
 * The nodes of a glossary word: exact normalized form first, then the crude stem (`runs` to `run`).
 * @param nodes The article's word nodes.
 * @param word The word as the surface shows it.
 * @returns The matching nodes; empty for an off-list word.
 */
export function matchWordNodes(nodes: ArticleWordNode[], word: string): ArticleWordNode[] {
  const exact = nodes.filter((node) => normalizeWord(node.word) === normalizeWord(word));
  if (exact.length) return exact;
  return nodes.filter((node) => stem(node.word) === stem(word));
}

function partsFor(rating: EvidenceDecision & { kind: "evidence" }): ActivityPracticeSubmissionEnvelope["parts"] {
  const correct = { partId: "1", rawAnswer: null, isCorrect: true };
  const wrong = { partId: "2", rawAnswer: null, isCorrect: false };
  if (rating.rating === "Good") return [correct];
  if (rating.rating === "Hard") return [correct, wrong];
  return [{ ...wrong, partId: "1" }];
}

function envelopeFor(event: PrimaryEvidenceEvent, surface: EvidenceSurface, itemId: string, target: Target, variantKey: string, decision: EvidenceDecision & { kind: "evidence" }, now: string): ActivityPracticeSubmissionEnvelope {
  const graphVersion = target.skill === "Vocabulary" ? GRAPH_RELEASE.vocabulary.commit : GRAPH_RELEASE.gse.commit;
  const mode = event.kind === "question-step" && event.mode === "teacher_led" ? "guided_practice" : "independent_practice";
  return {
    contractVersion: "practice.v1",
    activityId: `primary:${surface}:${event.sourceTable}:${event.rowId}`,
    mode,
    status: "graded",
    attemptNumber: 1,
    submittedAt: now,
    answers: {},
    parts: partsFor(decision),
    analytics: {
      schemaVersion: "activity_evidence.v1",
      activityId: `primary:${surface}:${event.sourceTable}:${event.rowId}`,
      activityVersion: EVIDENCE_POLICY_VERSION,
      graphVersion,
      objectiveId: target.nodeId,
      variantKey,
      stepId: itemId,
      submissionId: evidenceIdempotencyKey(event, itemId, target.nodeId),
      attemptNumber: 1,
      hintsUsed: decision.hintUsed ? 1 : 0,
      revealsUsed: 0,
      scaffoldLevel: 0,
      interventionLevel: 0,
      evidenceConfidence: decision.confidence,
      timing: { wallClockMs: 0, activeMs: 0 },
    },
  } as unknown as ActivityPracticeSubmissionEnvelope;
}

/** One item of an event after resolution, before the commit. */
interface ResolvedItem {
  itemId: string;
  surface: EvidenceSurface;
  variantKey: string;
  outcome: EvidenceOutcome;
  /** `null` with a reason when the item has nothing to commit. */
  targets: Target[] | { reason: SkippedEvidence["reason"] };
}

async function resolveQuestionStep(event: QuestionAnswerEvent, resolver: EvidenceResolver): Promise<ResolvedItem[]> {
  const objectives = await resolver.questionObjectives([...new Set(event.questions.map((question) => question.questionId))]);
  return event.questions.map((question) => {
    const tags = objectives.get(question.questionId) ?? [];
    return {
      itemId: question.questionId,
      surface: question.questionType,
      variantKey: question.questionType,
      outcome: { correct: question.correct, scoreRatio: question.scoreRatio, blank: question.blank, answerMs: question.answerMs },
      targets: tags.length ? tags.map((tag) => ({ nodeId: tag.nodeId, skill: skillOf(tag.nodeId, tag.shortId) })) : { reason: "no-tag" },
    };
  });
}

async function resolveFlashcard(event: FlashcardReviewEvent, resolver: EvidenceResolver): Promise<ResolvedItem[]> {
  const outcome = { rating: event.rating };
  if (!event.articleId) return [{ itemId: event.word, surface: "flashcard", variantKey: "flashcard", outcome, targets: { reason: "no-article" } }];
  const nodes = matchWordNodes(await resolver.articleWordNodes(event.articleId), event.word);
  return [{ itemId: event.word, surface: "flashcard", variantKey: "flashcard", outcome, targets: nodes.length ? nodes.map((node) => ({ nodeId: node.nodeId, skill: "Vocabulary" as const })) : { reason: "no-tag" } }];
}

async function resolveGameRun(event: GameCompletionEvent, resolver: EvidenceResolver): Promise<ResolvedItem[]> {
  const surface = event.surface;
  const variantKey = surface === "expedition" ? "expedition" : `game:${event.gameId}`;
  const nodes = event.articleId ? await resolver.articleWordNodes(event.articleId) : [];
  const questions = event.articleId && event.items.some((item) => item.kind === "question") ? await resolver.articleQuestions(event.articleId) : [];
  const questionIds = event.items.filter((item) => item.kind === "question").map((item) => questions.find((question) => normalizeText(question.question) === normalizeText(item.label))?.id).filter((id): id is string => Boolean(id));
  const objectives = questionIds.length ? await resolver.questionObjectives(questionIds) : new Map<string, QuestionObjective[]>();
  return event.items.map((item) => {
    const base = { itemId: item.itemId, surface, variantKey, outcome: { correctFirstTry: item.correctFirstTry, solved: item.solved } };
    if (item.kind === "sentence") return { ...base, targets: { reason: "no-evidence" as const } };
    if (!event.articleId) return { ...base, targets: { reason: "no-article" as const } };
    if (item.kind === "question") {
      const question = questions.find((candidate) => normalizeText(candidate.question) === normalizeText(item.label));
      const tags = question ? (objectives.get(question.id) ?? []) : [];
      if (!question) return { ...base, targets: { reason: "unknown-item" as const } };
      return { ...base, targets: tags.length ? tags.map((tag) => ({ nodeId: tag.nodeId, skill: skillOf(tag.nodeId, tag.shortId) })) : { reason: "no-tag" as const } };
    }
    const matched = matchWordNodes(nodes, item.label);
    return { ...base, targets: matched.length ? matched.map((node) => ({ nodeId: node.nodeId, skill: "Vocabulary" as const })) : { reason: "no-tag" as const } };
  });
}

/**
 * Records the evidence of one source event: resolves each item's objectives through the tag
 * tables, rates it by the policy, and commits one command per objective. A replay returns the
 * same receipts and writes nothing.
 * @param options The tenant, the event, and optional persistence, resolver, and clock.
 * @returns The committed objectives and the skipped items with their reasons.
 * @throws When the event fails its contract (a run of more than 200 items included) or a commit fails.
 */
export async function recordPrimaryEvidence(options: RecordPrimaryEvidenceOptions): Promise<RecordPrimaryEvidenceResult> {
  const event = primaryEvidenceEventSchema.parse(options.event);
  if (event.kind === "game-run" && event.items.length > MAX_EVIDENCE_ITEMS) throw new Error(`A game run holds at most ${MAX_EVIDENCE_ITEMS} items`);
  const { schoolId } = options.tenant;
  const now = options.now ?? new Date().toISOString();
  const resolver = options.resolver ?? createDrizzleEvidenceResolver(requireDb(options.db));
  const persistence = options.persistence ?? createDrizzleMasteryPersistence({ db: requireDb(options.db), tenant: { schoolId }, actorId: event.userId });
  const context: Omit<EvidenceContext, "objectiveSkill"> = event.kind === "question-step"
    ? { mode: event.mode, hintUsed: event.hintUsed, audioPlayed: event.audioPlayed }
    : { mode: "independent", audioPlayed: true };

  const items = event.kind === "question-step" ? await resolveQuestionStep(event, resolver) : event.kind === "flashcard-review" ? await resolveFlashcard(event, resolver) : await resolveGameRun(event, resolver);
  const committed: CommittedEvidence[] = [];
  const skipped: SkippedEvidence[] = [];
  for (const item of items) {
    const itemDecision = rateEvidence(item.surface, item.outcome, context);
    if (itemDecision.kind === "skip") {
      skipped.push({ itemId: item.itemId, reason: itemDecision.reason });
      continue;
    }
    if (!Array.isArray(item.targets)) {
      skipped.push({ itemId: item.itemId, reason: item.targets.reason });
      continue;
    }
    for (const target of item.targets) {
      const decision = rateEvidence(item.surface, item.outcome, { ...context, objectiveSkill: target.skill });
      if (decision.kind === "skip") {
        skipped.push({ itemId: item.itemId, objectiveId: target.nodeId, reason: decision.reason });
        continue;
      }
      const receipt = await projectActivitySubmissionToMastery(schoolId, event.userId, envelopeFor(event, item.surface, item.itemId, target, item.variantKey, decision, now), persistence, now);
      committed.push({ itemId: item.itemId, objectiveId: target.nodeId, variantKey: item.variantKey, rating: decision.rating, confidence: decision.confidence, status: receipt.status, commitId: receipt.commitId });
    }
  }
  return { event: { kind: event.kind, sourceTable: event.sourceTable, rowId: event.rowId }, committed, skipped };
}

function requireDb(db: DB | undefined): DB {
  if (!db) throw new Error("recordPrimaryEvidence needs a database when no persistence or resolver is given");
  return db;
}
