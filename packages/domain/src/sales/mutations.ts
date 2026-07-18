import { and, eq, sql } from "drizzle-orm";
import {
  salesProgress,
  salesRoleplayAttempts,
  salesLessons,
  salesConversations,
  salesChatMessages,
  salesRubrics,
  salesQuizQuestions,
  users,
} from "@reading-advantage/db/schema";
import { assertCan } from "@reading-advantage/auth";
import type { DB } from "@reading-advantage/db";
import type { SalesDomainContext } from "./contracts.js";
// salesRawDb() wraps TenantDB.unscoped("sales-advantage tables have no schoolId")
// — all sales_* tables are REFERENTIAL (no schoolId column, scoped by userId).
import { salesRawDb } from "./contracts.js";
import type {
  RoleplayEvaluationResult,
  QuizSubmissionInput,
  ChatMessageInput,
  ApproveContentInput,
} from "./schema.js";
import {
  roleplayAudioInputSchema,
  ROLEPLAY_MAX_AUDIO_BYTES,
  ROLEPLAY_MAX_AUDIO_DURATION_MS,
  approveContentOutputSchema,
} from "./schema.js";
import {
  RubricNotApprovedError,
  SalesAuthError,
  RoleplayAudioValidationError,
} from "./errors.js";
import {
  requireAccessibleLesson,
  requireAccessibleScenario,
} from "./learning-path.js";

/**
 * Atomically records first completion while preserving the original timestamp.
 * @param rawDb Raw database adapter for the REFERENTIAL Sales tables.
 * @param userId Learner whose progress is being recorded.
 * @param lessonId Approved accessible lesson being completed.
 * @returns The inserted or updated progress row.
 */
async function upsertCompletedProgress(
  rawDb: DB,
  userId: string,
  lessonId: string,
) {
  const activityAt = new Date();
  const [row] = await rawDb
    .insert(salesProgress)
    .values({
      userId,
      lessonId,
      status: "completed",
      completedAt: activityAt,
      updatedAt: activityAt,
    })
    .onConflictDoUpdate({
      target: [salesProgress.userId, salesProgress.lessonId],
      set: {
        status: "completed",
        completedAt: sql`COALESCE(
          ${salesProgress.completedAt},
          excluded.completed_at
        )`,
        updatedAt: sql`excluded.updated_at`,
      },
    })
    .returning();
  return row;
}

/**
 * Inserts a roleplay attempt after its scenario access has been validated.
 * @param rawDb Raw database adapter for the REFERENTIAL Sales tables.
 * @param userId Learner creating the attempt.
 * @param input Validated scenario and audio metadata.
 * @returns The inserted roleplay attempt.
 */
async function insertRoleplayAttempt(
  rawDb: DB,
  userId: string,
  input: {
    scenarioId: string;
    audioStorageKey: string | null;
    durationMs: number;
  },
) {
  const [row] = await rawDb
    .insert(salesRoleplayAttempts)
    .values({
      scenarioId: input.scenarioId,
      userId,
      ...(input.audioStorageKey
        ? { audioStorageKey: input.audioStorageKey }
        : {}),
      durationMs: input.durationMs,
      attemptNumber: sql<number>`(
        SELECT COALESCE(MAX(existing_attempt."attempt_number"), 0) + 1
        FROM "sales_roleplay_attempts" AS existing_attempt
        WHERE existing_attempt."user_id" = ${userId}
          AND existing_attempt."scenario_id" = ${input.scenarioId}
      )`,
    })
    .returning();
  return row;
}

const ATTEMPT_NUMBER_CONSTRAINT =
  "sales_roleplay_attempts_user_scenario_number_unique";
const MAX_ATTEMPT_NUMBER_RETRIES = 8;

/**
 * Detects the reviewed attempt-number uniqueness conflict from PostgreSQL.
 * @param error Candidate database error.
 * @returns Whether the error is the retryable attempt-number collision.
 */
function isAttemptNumberConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as {
    code?: unknown;
    constraint?: unknown;
    constraint_name?: unknown;
    cause?: unknown;
  };
  const isDirectConflict =
    candidate.code === "23505" &&
    (candidate.constraint === ATTEMPT_NUMBER_CONSTRAINT ||
      candidate.constraint_name === ATTEMPT_NUMBER_CONSTRAINT);
  return (
    isDirectConflict ||
    (candidate.cause !== error && isAttemptNumberConflict(candidate.cause))
  );
}

/**
 * Allocates one attempt number and completes its database lifecycle atomically.
 * @param rawDb Raw database adapter for the Sales relations.
 * @param userId Learner creating the attempt.
 * @param input Validated attempt metadata.
 * @param complete Work that must commit with the new attempt.
 * @returns The completed operation result.
 * @throws The final database error after bounded uniqueness retries.
 */
async function withAllocatedRoleplayAttempt<T>(
  rawDb: DB,
  userId: string,
  input: {
    scenarioId: string;
    audioStorageKey: string | null;
    durationMs: number;
  },
  complete: (
    tx: DB,
    attempt: typeof salesRoleplayAttempts.$inferSelect,
  ) => Promise<T>,
): Promise<T> {
  for (let retry = 0; retry <= MAX_ATTEMPT_NUMBER_RETRIES; retry += 1) {
    try {
      return await rawDb.transaction(async (tx) => {
        const transactionDb = tx as unknown as DB;
        const attempt = await insertRoleplayAttempt(
          transactionDb,
          userId,
          input,
        );
        return complete(transactionDb, attempt);
      });
    } catch (error) {
      if (
        retry === MAX_ATTEMPT_NUMBER_RETRIES ||
        !isAttemptNumberConflict(error)
      ) {
        throw error;
      }
    }
  }
  throw new Error("Roleplay attempt allocation exhausted");
}

/**
 * Marks a theory lesson complete for the current user (upserts progress).
 * @param ctx - The domain context
 * @param input - The lesson id
 * @returns The updated progress row
 */
export async function markTheoryLessonComplete(
  { db, user, tenant }: SalesDomainContext,
  input: { lessonId: string },
) {
  assertCan(user, "sales:read", tenant);
  const rawDb = salesRawDb(db);
  await requireAccessibleLesson(rawDb, user.id, {
    lessonId: input.lessonId,
    expectedType: "theory",
  });
  return upsertCompletedProgress(rawDb, user.id, input.lessonId);
}

/**
 * Creates a new roleplay attempt row. Computes the attempt number from prior attempts.
 *
 * FR-4 contract: `audioStorageKey` may be `null` to indicate that the audio
 * upload to object storage failed. The attempt row is still created so the
 * rep's evaluation can proceed without a backing audio object, but the row
 * will not reference a non-existent storage key.
 * @param ctx - The domain context (user must hold sales:attempt:create)
 * @param input - The scenario id + audio storage key (nullable) + duration
 * @returns The new attempt row (without evaluation)
 */
export async function createRoleplayAttempt(
  { db, user, tenant }: SalesDomainContext,
  input: {
    scenarioId: string;
    audioStorageKey: string | null;
    durationMs: number;
  },
) {
  assertCan(user, "sales:attempt:create", tenant);
  const rawDb = salesRawDb(db);
  await requireAccessibleScenario(rawDb, user.id, input.scenarioId);
  return withAllocatedRoleplayAttempt(
    rawDb,
    user.id,
    input,
    async (_tx, attempt) => attempt,
  );
}

/**
 * Saves the LLM evaluation onto an attempt row. If the attempt passed, marks
 * the parent lesson complete.
 *
 * Phase 4 IDOR guard: the attempt is SELECTed BEFORE any UPDATE so a caller
 * cannot mutate an attempt owned by another user. Attempt ownership is
 * `user.id === attempt.userId`, or a `SALES_ADMIN` whose tenant scoping is
 * satisfied by a users.schoolId lookup. A failed check throws `SalesAuthError`
 * (FORBIDDEN envelope at the API layer) and `db.update` is never invoked.
 * @param ctx - The domain context
 * @param input - The attempt id + evaluation result
 * @returns The updated attempt row
 */
export async function saveAttemptEvaluation(
  { db, user, tenant }: SalesDomainContext,
  input: {
    attemptId: string;
    evaluation: RoleplayEvaluationResult;
    rubricId: string;
  },
) {
  assertCan(user, "sales:attempt:create", tenant);
  const rawDb = salesRawDb(db);
  // IDOR guard — select first, fail closed, never call db.update on miss.
  const [existing] = await rawDb
    .select({
      id: salesRoleplayAttempts.id,
      userId: salesRoleplayAttempts.userId,
      scenarioId: salesRoleplayAttempts.scenarioId,
    })
    .from(salesRoleplayAttempts)
    .where(eq(salesRoleplayAttempts.id, input.attemptId))
    .limit(1);
  if (!existing) {
    throw new SalesAuthError("attempt not found");
  }
  let ownerUser: SalesDomainContext["user"] | undefined;
  if (existing.userId !== user.id) {
    if (user.role !== "SALES_ADMIN") {
      throw new SalesAuthError();
    }
    // Tenant-scoped admin override: verify the attempt owner belongs to the
    // admin's tenant before mutating the row. The users table is FLAT, so
    // querying through the tenant-scoped db auto-injects eq(users.schoolId,
    // tenant.schoolId); an explicit second check defends against a bypass.
    if (!tenant.schoolId) {
      throw new SalesAuthError("attempt not found");
    }
    const [owner] = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        role: users.role,
        schoolId: users.schoolId,
        xp: users.xp,
        level: users.level,
        cefrLevel: users.cefrLevel,
      })
      .from(users)
      .where(eq(users.id, existing.userId))
      .limit(1);
    if (!owner || owner.schoolId !== tenant.schoolId) {
      throw new SalesAuthError("attempt not found");
    }
    ownerUser = owner as unknown as SalesDomainContext["user"];
  }
  const progressUser = ownerUser ?? user;
  const accessibleScenario = await requireAccessibleScenario(
    rawDb,
    progressUser.id,
    existing.scenarioId,
  );
  if (accessibleScenario.rubric.id !== input.rubricId) {
    throw new RubricNotApprovedError(input.rubricId);
  }
  const [updated] = await rawDb
    .update(salesRoleplayAttempts)
    .set({
      llmScoreJson: input.evaluation,
      overallScore: String(input.evaluation.overallScore),
      passed: input.evaluation.passed,
      llmFeedback: input.evaluation.summary,
      transcriptExcerpt: input.evaluation.transcriptExcerpt,
    })
    .where(eq(salesRoleplayAttempts.id, input.attemptId))
    .returning();
  if (input.evaluation.passed) {
    await upsertCompletedProgress(
      rawDb,
      progressUser.id,
      accessibleScenario.lesson.id,
    );
  }
  return updated;
}

/**
 * The full submit-then-evaluate flow: creates the attempt, runs the evaluator,
 * saves the result, and marks the lesson complete on pass.
 *
 * FR-4 contract: `audioStorageKey` may be `null` when the audio upload to
 * object storage failed. The attempt row is still created (so the rep gets
 * an evaluation), but it does not reference a non-existent storage object.
 *
 * Phase 4 audio + privacy gates (anti-pattern A2): audio size, MIME type,
 * declared duration, consent, and retention metadata MUST be validated
 * BEFORE any DB insert, storage call, or provider call. Rejection at this
 * gate throws `RoleplayAudioValidationError` and the provider's `evaluate`
 * callback receives zero invocations on rejected submissions.
 * @param ctx - The domain context
 * @param input - The attempt input + audio buffer + evaluator function +
 *                consentGiven/retentionDays privacy metadata
 * @returns The saved attempt with evaluation
 */
export async function submitRoleplayAttempt(
  ctx: SalesDomainContext,
  input: {
    scenarioId: string;
    audioStorageKey: string | null;
    durationMs: number;
    audio: { buffer: Buffer; mimeType: string };
    consentGiven: boolean;
    retentionDays?: number;
    evaluate: (
      audio: { buffer: Buffer; mimeType: string },
      scenarioId: string,
    ) => Promise<RoleplayEvaluationResult>;
  },
) {
  const { db, user, tenant } = ctx;
  assertCan(user, "sales:attempt:create", tenant);

  // Audio + privacy validation gate — must run before any DB INSERT and
  // before `input.evaluate(...)` so a rejected submission never reaches
  // the LLM provider.
  const parsed = roleplayAudioInputSchema.safeParse({
    audio: input.audio,
    durationMs: input.durationMs,
    consentGiven: input.consentGiven,
    retentionDays: input.retentionDays,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new RoleplayAudioValidationError(
      issue?.message ?? "invalid audio submission",
      issue?.path.join(".") ?? "audio",
    );
  }
  if (input.audio.buffer.length > ROLEPLAY_MAX_AUDIO_BYTES) {
    throw new RoleplayAudioValidationError(
      `audio size ${input.audio.buffer.length} exceeds maximum ${ROLEPLAY_MAX_AUDIO_BYTES}`,
      "audio.buffer",
    );
  }
  if (input.durationMs > ROLEPLAY_MAX_AUDIO_DURATION_MS) {
    throw new RoleplayAudioValidationError(
      `duration ${input.durationMs}ms exceeds maximum ${ROLEPLAY_MAX_AUDIO_DURATION_MS}ms`,
      "durationMs",
    );
  }

  const rawDb = salesRawDb(db) as unknown as DB;
  const accessibleScenario = await requireAccessibleScenario(
    rawDb,
    user.id,
    input.scenarioId,
  );
  const evaluation = await input.evaluate(input.audio, input.scenarioId);
  const saved = await withAllocatedRoleplayAttempt(
    rawDb,
    user.id,
    {
      scenarioId: input.scenarioId,
      audioStorageKey: input.audioStorageKey,
      durationMs: input.durationMs,
    },
    async (tx, attempt) =>
      saveAttemptEvaluation(
        { db: tx, user, tenant },
        {
          attemptId: attempt.id,
          evaluation,
          rubricId: accessibleScenario.rubric.id,
        },
      ),
  );
  return { attempt: saved, evaluation };
}

/**
 * Grades a quiz submission, persists progress with score, returns per-question results.
 * 70% pass threshold (matches codecamp).
 * @param ctx - The domain context
 * @param input - The lesson id + answers map
 * @returns The quiz result with score, pass flag, per-question results
 */
export async function submitQuiz(
  { db, user, tenant }: SalesDomainContext,
  input: QuizSubmissionInput,
) {
  assertCan(user, "sales:quiz:submit", tenant);
  const rawDb = salesRawDb(db);
  await requireAccessibleLesson(rawDb, user.id, {
    lessonId: input.lessonId,
    expectedType: "quiz",
  });
  const questions = await rawDb
    .select()
    .from(salesQuizQuestions)
    .where(eq(salesQuizQuestions.lessonId, input.lessonId))
    .orderBy(salesQuizQuestions.order);
  const results = questions.map((q) => ({
    questionId: q.id,
    correct: input.answers[q.id] === q.correctAnswer,
    explanation: q.explanation,
  }));
  const correctCount = results.filter((r) => r.correct).length;
  const score =
    questions.length > 0
      ? Math.round((correctCount / questions.length) * 100)
      : 0;
  const passed = score >= 70;
  const status: "completed" | "in_progress" = passed
    ? "completed"
    : "in_progress";
  const completedAt = passed ? new Date() : null;
  const activityAt = new Date();

  await rawDb
    .insert(salesProgress)
    .values({
      userId: user.id,
      lessonId: input.lessonId,
      status,
      score: String(score),
      completedAt,
      updatedAt: activityAt,
    })
    .onConflictDoUpdate({
      target: [salesProgress.userId, salesProgress.lessonId],
      set: {
        status: sql`CASE
          WHEN ${salesProgress.status} = 'completed'::sales_progress_status
            OR excluded.status = 'completed'::sales_progress_status
          THEN 'completed'::sales_progress_status
          ELSE 'in_progress'::sales_progress_status
        END`,
        score: sql`GREATEST(
          COALESCE(${salesProgress.score}, excluded.score),
          excluded.score
        )`,
        completedAt: sql`COALESCE(
          ${salesProgress.completedAt},
          excluded.completed_at
        )`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
  return { lessonId: input.lessonId, score, passed, results };
}

/**
 * Asserts that the current user holds the sales:chat permission. Used by the
 * streaming chat route to gate the AI coach endpoint without duplicating the
 * role check at the route layer.
 * @param ctx - The sales domain context (user must hold sales:chat)
 * @throws {AuthError} When the user lacks the sales:chat permission
 */
export function authorizeSalesChat(
  ctx: Pick<SalesDomainContext, "user">,
): void {
  assertCan(ctx.user, "sales:chat", { schoolId: ctx.user.schoolId });
}

/**
 * Appends a chat message to a conversation, creating the conversation if missing.
 * @param ctx - The domain context
 * @param input - The chat message input
 * @returns The saved message and the conversation id
 */
export async function saveChatMessage(
  { db, user, tenant }: SalesDomainContext,
  input: ChatMessageInput,
) {
  assertCan(user, "sales:chat", tenant);
  const rawDb = salesRawDb(db);
  let conversationId = input.conversationId;
  if (conversationId) {
    const [conversation] = await rawDb
      .select({ id: salesConversations.id, userId: salesConversations.userId })
      .from(salesConversations)
      .where(
        and(
          eq(salesConversations.id, conversationId),
          eq(salesConversations.userId, user.id),
        ),
      )
      .limit(1);
    if (!conversation) {
      throw new SalesAuthError("Conversation is unavailable");
    }
  }
  if (!conversationId) {
    const [conv] = await rawDb
      .insert(salesConversations)
      .values({
        userId: user.id,
        lessonId: input.lessonId ?? null,
        moduleId: input.moduleId ?? null,
      })
      .returning();
    conversationId = conv.id;
  }
  const [msg] = await rawDb
    .insert(salesChatMessages)
    .values({
      conversationId,
      role: input.role,
      content: input.content,
    })
    .returning();
  return { message: msg, conversationId };
}

/**
 * Flips the reviewStatus of a lesson or rubric from draft to approved (admin only).
 * @param ctx - The domain context (user must hold sales:curriculum:approve)
 * @param input - The lesson or rubric id to approve
 * @returns The updated row
 */
export async function approveCurriculumContent(
  { db, user, tenant }: SalesDomainContext,
  input: ApproveContentInput,
) {
  assertCan(user, "sales:curriculum:approve", tenant);
  const rawDb = salesRawDb(db);
  if (input.lessonId) {
    const [updated] = await rawDb
      .update(salesLessons)
      .set({ reviewStatus: "approved" })
      .where(eq(salesLessons.id, input.lessonId))
      .returning();
    return approveContentOutputSchema.parse(updated);
  }
  if (input.rubricId) {
    const [updated] = await rawDb
      .update(salesRubrics)
      .set({ reviewStatus: "approved" })
      .where(eq(salesRubrics.id, input.rubricId))
      .returning();
    return approveContentOutputSchema.parse(updated);
  }
  throw new Error("Either lessonId or rubricId is required");
}
