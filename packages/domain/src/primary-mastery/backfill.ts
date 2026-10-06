/**
 * Backfill of the objective and vocabulary links from the Workbooks export (track
 * primary_objective_tags_20261006, FR-5). The orchestration is pure over a small port so tests
 * run without a database; `createDrizzleTagBackfillPort` is the PostgreSQL implementation.
 */
import { and, eq, inArray } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import {
  longAnswerQuestions,
  multipleChoiceQuestions,
  primaryArticleObjectives,
  primaryArticleWordNodes,
  primaryBookLessons,
  primaryLegacyIdMap,
  primaryQuestionObjectives,
  shortAnswerQuestions,
} from "@reading-advantage/db/schema";
import { createTenantDB } from "../db-contract.js";
import type { KeyDrift, ParsedTagsExport, TagsPackage } from "./contracts.js";
import { resolveObjective } from "./objective-key.js";

/** A question type of the bank and of the link table. */
export type QuestionType = "mcq" | "saq" | "laq";

/** An article objective link row. */
export interface ArticleObjectiveRow {
  articleId: string;
  shortId: string;
  nodeId: string;
  role: "target" | "supporting";
  graphRelease: string;
}

/** A question objective link row. */
export interface QuestionObjectiveRow {
  articleId: string;
  questionId: string;
  questionType: QuestionType;
  shortId: string;
  nodeId: string;
  graphRelease: string;
}

/** A word node link row. */
export interface WordNodeRow {
  articleId: string;
  word: string;
  pos: string;
  nodeId: string;
  role: "glossed" | "recycled";
  graphRelease: string;
}

/** The question bank of a stored lesson package, ids and text only. */
export interface LessonBankText {
  articleId: string | null;
  bank: Record<QuestionType, { id: string; question: string }[]>;
}

/** What the backfill needs from the database. */
export interface TagBackfillPort {
  /** The article uuid of a legacy Prisma cuid, from `primary_legacy_id_map`. */
  articleIdByLegacy(legacyId: string): Promise<string | null>;
  /** The lesson row of a package key: its article and its bank text. */
  lessonByKey(key: string): Promise<LessonBankText | null>;
  /** Question uuids of legacy cuids of one type, from `primary_legacy_id_map`. */
  questionIdsByLegacy(type: QuestionType, legacyIds: string[]): Promise<Map<string, string>>;
  /** The question rows of an article and type, for the text match. */
  questionsOfArticle(articleId: string, type: QuestionType): Promise<{ id: string; question: string }[]>;
  /** Deletes the article's objective and word rows, then writes the given ones. */
  replaceArticleLinks(articleId: string, rows: { articleObjectives: ArticleObjectiveRow[]; wordNodes: WordNodeRow[] }): Promise<void>;
  /** Deletes the objective rows of the given questions, then writes the given ones. */
  replaceQuestionLinks(questionIds: string[], rows: QuestionObjectiveRow[]): Promise<void>;
}

/** The report of one backfill run. */
export interface TagBackfillReport {
  dryRun: boolean;
  packages: number;
  articlesMatched: number;
  articlesNotFound: { key: string; legacyArticleId: string | null }[];
  questionsMatched: number;
  questionsNotMatched: { key: string; id: string; type: QuestionType }[];
  /** Rows written, or in a dry run the rows a real run would write. */
  rowsWritten: { articleObjectives: number; questionObjectives: number; wordNodes: number };
  keyDrift: KeyDrift[];
}

/** Options of one backfill run. */
export interface BackfillPrimaryTagsOptions {
  port: TagBackfillPort;
  export: ParsedTagsExport;
  dryRun?: boolean;
}

const normalize = (text: string): string => text.replace(/\s+/g, " ").trim();

/**
 * Maps the article-level tags of an export package to link rows, without duplicates.
 * @param pkg The export package.
 * @param articleId The article uuid.
 * @param release The GSE and vocabulary graph commits.
 * @returns The article objective and word node rows.
 * @throws When a short id is not in the key; the message names the package.
 */
export function exportArticleRows(pkg: TagsPackage, articleId: string, release: { gse: string; vocabulary: string }): { articleObjectives: ArticleObjectiveRow[]; wordNodes: WordNodeRow[] } {
  const articleObjectives: ArticleObjectiveRow[] = [];
  const seen = new Set<string>();
  for (const objective of pkg.articleObjectives) {
    const key = `${objective.shortId}:${objective.role}`;
    if (seen.has(key)) continue;
    seen.add(key);
    articleObjectives.push({ articleId, shortId: objective.shortId, nodeId: resolveNode(pkg.key, objective.shortId), role: objective.role, graphRelease: release.gse });
  }
  const wordNodes: WordNodeRow[] = [];
  const seenNode = new Set<string>();
  for (const entry of pkg.vocabulary) {
    if (seenNode.has(entry.nodeId)) continue;
    seenNode.add(entry.nodeId);
    wordNodes.push({ articleId, word: entry.word, pos: entry.pos, nodeId: entry.nodeId, role: entry.role, graphRelease: release.vocabulary });
  }
  return { articleObjectives, wordNodes };
}

function resolveNode(key: string, shortId: string): string {
  try {
    return resolveObjective(shortId).nodeId;
  } catch (error) {
    throw new Error(`${key}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Writes the objective and vocabulary links of every export package whose article is in the
 * database. Articles join by legacy id or by package key; questions join by legacy id or, for an
 * imported package, by article, type, and exact question text. Idempotent: every write replaces.
 * @param options The port, the parsed export, and the dry-run switch.
 * @returns What was matched, what was not, and the rows written.
 */
export async function backfillPrimaryTags(options: BackfillPrimaryTagsOptions): Promise<TagBackfillReport> {
  const { port, dryRun = false } = options;
  const release = { gse: options.export.graphRelease.gse.commit, vocabulary: options.export.graphRelease.vocabulary.commit };
  const report: TagBackfillReport = { dryRun, packages: options.export.packages.length, articlesMatched: 0, articlesNotFound: [], questionsMatched: 0, questionsNotMatched: [], rowsWritten: { articleObjectives: 0, questionObjectives: 0, wordNodes: 0 }, keyDrift: options.export.keyDrift };
  for (const pkg of options.export.packages) {
    let lesson: LessonBankText | null | undefined;
    const lessonOf = async (): Promise<LessonBankText | null> => (lesson === undefined ? (lesson = await port.lessonByKey(pkg.key)) : lesson);
    let articleId = pkg.legacy ? await port.articleIdByLegacy(pkg.legacy.articleId) : null;
    if (!articleId) articleId = (await lessonOf())?.articleId ?? null;
    if (!articleId) {
      report.articlesNotFound.push({ key: pkg.key, legacyArticleId: pkg.legacy?.articleId ?? null });
      continue;
    }
    report.articlesMatched += 1;
    const articleRows = exportArticleRows(pkg, articleId, release);

    const questionRows: QuestionObjectiveRow[] = [];
    const matchedIds: string[] = [];
    for (const type of ["mcq", "saq", "laq"] as const) {
      const wanted = pkg.questions.filter((question) => question.type === type && question.objectives.length > 0);
      if (!wanted.length) continue;
      const resolved = new Map<string, string>();
      const legacyIds = wanted.map((question) => pkg.legacy?.questions[question.id]).filter((id): id is string => Boolean(id));
      if (legacyIds.length) {
        const byLegacy = await port.questionIdsByLegacy(type, legacyIds);
        for (const question of wanted) {
          const cuid = pkg.legacy?.questions[question.id];
          const uuid = cuid ? byLegacy.get(cuid) : undefined;
          if (uuid) resolved.set(question.id, uuid);
        }
      }
      if (resolved.size < wanted.length) {
        const bank = (await lessonOf())?.bank[type] ?? [];
        const textOf = new Map(bank.map((item) => [item.id, normalize(item.question)]));
        const rows = textOf.size ? await port.questionsOfArticle(articleId, type) : [];
        const idByText = new Map(rows.map((row) => [normalize(row.question), row.id]));
        for (const question of wanted) {
          if (resolved.has(question.id)) continue;
          const text = textOf.get(question.id);
          const uuid = text ? idByText.get(text) : undefined;
          if (uuid) resolved.set(question.id, uuid);
        }
      }
      for (const question of wanted) {
        const questionId = resolved.get(question.id);
        if (!questionId) {
          report.questionsNotMatched.push({ key: pkg.key, id: question.id, type });
          continue;
        }
        report.questionsMatched += 1;
        matchedIds.push(questionId);
        for (const shortId of new Set(question.objectives)) questionRows.push({ articleId, questionId, questionType: type, shortId, nodeId: resolveNode(pkg.key, shortId), graphRelease: release.gse });
      }
    }

    report.rowsWritten.articleObjectives += articleRows.articleObjectives.length;
    report.rowsWritten.wordNodes += articleRows.wordNodes.length;
    report.rowsWritten.questionObjectives += questionRows.length;
    if (dryRun) continue;
    await port.replaceArticleLinks(articleId, articleRows);
    if (matchedIds.length) await port.replaceQuestionLinks(matchedIds, questionRows);
  }
  return report;
}

const QUESTION_TABLES = { mcq: multipleChoiceQuestions, saq: shortAnswerQuestions, laq: longAnswerQuestions } as const;

/**
 * The `primary_legacy_id_map.table_name` of an article: the legacy table name, as the
 * `tutor_compat` views of migration 0061 and the cutover ETL (spec A6) use it.
 */
export const LEGACY_ARTICLE_TABLE = "article";

/** The `primary_legacy_id_map.table_name` of each question type. */
export const LEGACY_QUESTION_TABLE: Record<QuestionType, string> = { mcq: "multiple_choice_questions", saq: "short_answer_questions", laq: "long_answer_questions" };

/**
 * The PostgreSQL port of the backfill. The link tables are global content (EXEMPT), so the
 * privileged CLI connection runs unscoped.
 * @param rawDb A direct database connection.
 * @returns The port.
 */
export function createDrizzleTagBackfillPort(rawDb: DB): TagBackfillPort {
  const db = createTenantDB(rawDb, { schoolId: null }).unscoped("tag backfill: the content link tables and the catalogue are global (EXEMPT); privileged CLI, no tenant");
  return {
    async articleIdByLegacy(legacyId) {
      const rows = await db.select({ newId: primaryLegacyIdMap.newId }).from(primaryLegacyIdMap).where(and(eq(primaryLegacyIdMap.tableName, LEGACY_ARTICLE_TABLE), eq(primaryLegacyIdMap.legacyId, legacyId))).limit(1);
      return rows[0]?.newId ?? null;
    },
    async lessonByKey(key) {
      const rows = await db.select({ articleId: primaryBookLessons.articleId, pkg: primaryBookLessons.package }).from(primaryBookLessons).where(eq(primaryBookLessons.key, key)).limit(1);
      const row = rows[0];
      if (!row) return null;
      const bank = ((row.pkg as { bank?: Record<string, { id: string; question: string }[]> } | null)?.bank) ?? {};
      return { articleId: row.articleId, bank: { mcq: bank.mcq ?? [], saq: bank.saq ?? [], laq: bank.laq ?? [] } };
    },
    async questionIdsByLegacy(type, legacyIds) {
      if (!legacyIds.length) return new Map();
      const rows = await db.select({ legacyId: primaryLegacyIdMap.legacyId, newId: primaryLegacyIdMap.newId }).from(primaryLegacyIdMap).where(and(eq(primaryLegacyIdMap.tableName, LEGACY_QUESTION_TABLE[type]), inArray(primaryLegacyIdMap.legacyId, legacyIds)));
      return new Map(rows.map((row) => [row.legacyId, row.newId]));
    },
    async questionsOfArticle(articleId, type) {
      const table = QUESTION_TABLES[type];
      return db.select({ id: table.id, question: table.question }).from(table).where(eq(table.articleId, articleId));
    },
    async replaceArticleLinks(articleId, rows) {
      await db.transaction(async (tx) => {
        await tx.delete(primaryArticleObjectives).where(eq(primaryArticleObjectives.articleId, articleId));
        await tx.delete(primaryArticleWordNodes).where(eq(primaryArticleWordNodes.articleId, articleId));
        if (rows.articleObjectives.length) await tx.insert(primaryArticleObjectives).values(rows.articleObjectives);
        if (rows.wordNodes.length) await tx.insert(primaryArticleWordNodes).values(rows.wordNodes);
      });
    },
    async replaceQuestionLinks(questionIds, rows) {
      await db.transaction(async (tx) => {
        await tx.delete(primaryQuestionObjectives).where(inArray(primaryQuestionObjectives.questionId, questionIds));
        if (rows.length) await tx.insert(primaryQuestionObjectives).values(rows);
      });
    },
  };
}
