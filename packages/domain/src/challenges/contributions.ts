import { eq } from "drizzle-orm";
import type { Tenant, UserContext } from "@reading-advantage/auth";
import {
  gameChallengeContributions,
  gameChallengeDefinitions,
  gameChallengeRuns,
} from "@reading-advantage/db/schema";
import {
  classChallengeDefinitionSchema,
  challengeCompletionRunReferenceSchema,
  getReadToSelectAudioCompletionCounts,
  learningEvidenceSchema,
} from "@reading-advantage/game-contracts";

import type { TenantDB } from "../db-contract.js";
import { requireClassChallengeAccess } from "./access.js";

/** Saved completion facts accepted by the challenge contribution helper. */
export interface ChallengeSavedCompletion {
  readonly id: string;
  readonly schoolId: string;
  readonly userId: string;
  readonly gameType: string;
  readonly difficulty: string;
  readonly victory: boolean;
  readonly correctAnswers: number;
  readonly totalAttempts: number;
  /** Database timestamp from the saved completion row. */
  readonly createdAt: Date;
  readonly metadata?: Record<string, unknown>;
}

/** Result of one optional class-goal contribution attempt. */
export type ChallengeContributionResult =
  | { readonly status: "contributed"; readonly challengeId: string }
  | {
    readonly status: "ignored";
    readonly reason:
      | "run-not-found"
      | "wrong-owner"
      | "invalid-definition"
      | "ineligible-member"
      | "teacher-disabled"
      | "not-active"
      | "completion-mismatch"
      | "unsuccessful-completion"
      | "modality-mismatch"
      | "duplicate";
  };

/**
 * Records one eligible class contribution inside an active completion transaction.
 * A learner contributes once per challenge after a victorious run with at least one validated language attempt.
 * Reading contributions trust saved counters because current reading completions do not identify the pinned content.
 * @param tx Active tenant transaction that already saved the game completion.
 * @param user Authenticated completion owner.
 * @param tenant Authenticated school tenant.
 * @param completion Server-saved completion facts.
 * @param runId Opaque server-issued run identity.
 * @param now Server clock used for expiry checks.
 * @returns A contributed result or a structured ignored reason.
 * @throws When an unexpected database or membership query fails.
 */
export async function recordChallengeContribution({
  tx,
  user,
  tenant,
  completion,
  runId,
  now = () => new Date(),
}: {
  tx: TenantDB;
  user: UserContext;
  tenant: Tenant;
  completion: ChallengeSavedCompletion;
  runId: string;
  now?: () => Date;
}): Promise<ChallengeContributionResult> {
  if (!tenant.schoolId
    || completion.schoolId !== tenant.schoolId
    || completion.userId !== user.id) return { status: "ignored", reason: "wrong-owner" };
  const reference = challengeCompletionRunReferenceSchema.safeParse({ runId });
  if (!reference.success) return { status: "ignored", reason: "run-not-found" };
  const [run] = await tx.select().from(gameChallengeRuns)
    .where(eq(gameChallengeRuns.id, reference.data.runId))
    .limit(1);
  if (!run) return { status: "ignored", reason: "run-not-found" };
  if (run.schoolId !== tenant.schoolId || run.userId !== user.id) {
    return { status: "ignored", reason: "wrong-owner" };
  }
  const [stored] = await tx.select().from(gameChallengeDefinitions)
    .where(eq(gameChallengeDefinitions.id, run.challengeId))
    .limit(1);
  if (!stored || stored.schoolId !== tenant.schoolId) {
    return { status: "ignored", reason: "invalid-definition" };
  }
  if (!isValidDate(stored.startsAt) || !isValidDate(stored.expiresAt) || !isValidDate(run.createdAt) || !isValidDate(run.expiresAt)) {
    return { status: "ignored", reason: "invalid-definition" };
  }
  const parsedDefinition = classChallengeDefinitionSchema.safeParse({
    id: stored.id,
    schoolId: stored.schoolId,
    classId: stored.classId,
    createdByUserId: stored.createdByUserId,
    title: stored.title,
    gameId: stored.gameId,
    gameVersion: stored.gameVersion,
    contentLocale: stored.contentLocale,
    content: stored.contentJson,
    seed: stored.seed,
    difficulty: stored.difficulty,
    modality: stored.modalityJson,
    startsAt: stored.startsAt.toISOString(),
    expiresAt: stored.expiresAt.toISOString(),
    target: stored.target,
    teacherParticipationEnabled: stored.teacherParticipationEnabled,
  });
  if (!parsedDefinition.success) return { status: "ignored", reason: "invalid-definition" };
  const definition = parsedDefinition.data;
  try {
    await requireClassChallengeAccess({ db: tx, user, tenant, classId: definition.classId });
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Class not found")) {
      return { status: "ignored", reason: "ineligible-member" };
    }
    throw error;
  }
  if (user.role === "TEACHER" && !definition.teacherParticipationEnabled) {
    return { status: "ignored", reason: "teacher-disabled" };
  }
  const currentTime = now();
  if (!isValidDate(currentTime)
    || !isValidDate(completion.createdAt)
    || currentTime < stored.startsAt
    || currentTime >= run.expiresAt
    || currentTime >= stored.expiresAt
    || completion.createdAt < run.createdAt
    || completion.createdAt >= run.expiresAt
    || completion.createdAt >= stored.expiresAt
    || completion.createdAt > currentTime) {
    return { status: "ignored", reason: "not-active" };
  }
  if (completion.gameType !== definition.gameId || completion.difficulty !== definition.difficulty) {
    return { status: "ignored", reason: "completion-mismatch" };
  }
  if (!completion.victory || completion.totalAttempts <= 0) {
    return { status: "ignored", reason: "unsuccessful-completion" };
  }
  if (!matchesChallengeModality(
    definition.modality.modality,
    definition.content.items.length,
    completion,
  )) {
    return { status: "ignored", reason: "modality-mismatch" };
  }

  const [inserted] = await tx.insert(gameChallengeContributions).values({
    schoolId: tenant.schoolId,
    challengeId: definition.id,
    runId: run.id,
    userId: user.id,
    completionId: completion.id,
  }).onConflictDoNothing().returning({ id: gameChallengeContributions.id });
  return inserted
    ? { status: "contributed", challengeId: definition.id }
    : { status: "ignored", reason: "duplicate" };
}

/** Checks reading or audio evidence against the stored challenge modality. */
function matchesChallengeModality(
  modality: "reading" | "read-to-select-audio",
  contentItemCount: number,
  completion: ChallengeSavedCompletion,
): boolean {
  const rawEvidence = completion.metadata?.learningEvidence;
  if (modality === "reading") return rawEvidence === undefined;
  const evidence = learningEvidenceSchema.safeParse(rawEvidence);
  if (!evidence.success || evidence.data.effectiveModality !== "read-to-select-audio") return false;
  if (evidence.data.itemCount !== contentItemCount
    || evidence.data.questions.length !== contentItemCount
    || evidence.data.questions.some(({ selectionAttempts }) =>
      !selectionAttempts.some(({ completedQuestion }) => completedQuestion))) return false;
  const counts = getReadToSelectAudioCompletionCounts(evidence.data);
  return counts !== undefined
    && counts.totalAttempts === completion.totalAttempts
    && counts.correctAnswers === completion.correctAnswers;
}

/** Checks a database or server clock timestamp before conversion or comparison. */
function isValidDate(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}
