import { eq, and } from "drizzle-orm";
import {
  salesProgress,
  salesRoleplayAttempts,
  salesRoleplayScenarios,
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
  RoleplayAttemptInput,
  RoleplayEvaluationResult,
  QuizSubmissionInput,
  ChatMessageInput,
  CreateRepInput,
  ApproveContentInput,
} from "./schema.js";
import {
  roleplayAudioInputSchema,
  ROLEPLAY_MAX_AUDIO_BYTES,
  ROLEPLAY_MAX_AUDIO_DURATION_MS,
} from "./schema.js";
import {
  ScenarioNotFoundError,
  RubricNotApprovedError,
  SalesAuthError,
  RoleplayAudioValidationError,
} from "./errors.js";

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
  const [existing] = await rawDb
    .select()
    .from(salesProgress)
    .where(
      and(
        eq(salesProgress.userId, user.id),
        eq(salesProgress.lessonId, input.lessonId),
      ),
    )
    .limit(1);
  if (existing) {
    const [updated] = await rawDb
      .update(salesProgress)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(salesProgress.id, existing.id))
      .returning();
    return updated;
  }
  const [row] = await rawDb
    .insert(salesProgress)
    .values({
      userId: user.id,
      lessonId: input.lessonId,
      status: "completed",
      completedAt: new Date(),
    })
    .returning();
  return row;
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
  input: { scenarioId: string; audioStorageKey: string | null; durationMs: number },
) {
  assertCan(user, "sales:attempt:create", tenant);
  const rawDb = salesRawDb(db);
  const [scenario] = await rawDb
    .select()
    .from(salesRoleplayScenarios)
    .where(eq(salesRoleplayScenarios.id, input.scenarioId))
    .limit(1);
  if (!scenario) throw new ScenarioNotFoundError(input.scenarioId);
  const prior = await rawDb
    .select()
    .from(salesRoleplayAttempts)
    .where(
      and(
        eq(salesRoleplayAttempts.scenarioId, input.scenarioId),
        eq(salesRoleplayAttempts.userId, user.id),
      ),
    );
  const attemptNumber = prior.length + 1;
  const [row] = await rawDb
    .insert(salesRoleplayAttempts)
    .values({
      scenarioId: input.scenarioId,
      userId: user.id,
      ...(input.audioStorageKey ? { audioStorageKey: input.audioStorageKey } : {}),
      durationMs: input.durationMs,
      attemptNumber,
    })
    .returning();
  return row;
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
    .select({ id: salesRoleplayAttempts.id, userId: salesRoleplayAttempts.userId })
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
    const [attempt] = await rawDb
      .select()
      .from(salesRoleplayAttempts)
      .where(eq(salesRoleplayAttempts.id, input.attemptId))
      .limit(1);
    if (attempt) {
      const [scenario] = await rawDb
        .select()
        .from(salesRoleplayScenarios)
        .where(eq(salesRoleplayScenarios.id, attempt.scenarioId))
        .limit(1);
      if (scenario) {
        const progressUser = ownerUser ?? user;
        await markTheoryLessonComplete(
          { db: rawDb as unknown as SalesDomainContext["db"], user: progressUser, tenant },
          { lessonId: scenario.lessonId },
        );
      }
    }
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
  const attempt = await createRoleplayAttempt(
    { db: rawDb as unknown as SalesDomainContext["db"], user, tenant },
    {
      scenarioId: input.scenarioId,
      audioStorageKey: input.audioStorageKey,
      durationMs: input.durationMs,
    },
  );
  const [scenario] = await rawDb
    .select()
    .from(salesRoleplayScenarios)
    .where(eq(salesRoleplayScenarios.id, input.scenarioId))
    .limit(1);
  if (!scenario) throw new ScenarioNotFoundError(input.scenarioId);
  const [rubric] = await rawDb
    .select()
    .from(salesRubrics)
    .where(eq(salesRubrics.id, scenario.rubricId))
    .limit(1);
  if (!rubric || rubric.reviewStatus !== "approved") {
    throw new RubricNotApprovedError(scenario.rubricId);
  }
  const evaluation = await input.evaluate(input.audio, input.scenarioId);
  const saved = await saveAttemptEvaluation(
    { db: rawDb as unknown as SalesDomainContext["db"], user, tenant },
    { attemptId: attempt.id, evaluation, rubricId: rubric.id },
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
  const [existing] = await rawDb
    .select()
    .from(salesProgress)
    .where(
      and(
        eq(salesProgress.userId, user.id),
        eq(salesProgress.lessonId, input.lessonId),
      ),
    )
    .limit(1);
  if (existing) {
    await rawDb
      .update(salesProgress)
      .set({
        status: "completed",
        score: String(score),
        completedAt: new Date(),
      })
      .where(eq(salesProgress.id, existing.id));
  } else {
    await rawDb.insert(salesProgress).values({
      userId: user.id,
      lessonId: input.lessonId,
      status: "completed",
      score: String(score),
      completedAt: new Date(),
    });
  }
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
 * Creates a new rep account (admin only). The caller is responsible for hashing
 * the password and inserting the user row; this function returns the input
 * validated so the API layer can call the auth package.
 * @param ctx - The domain context (user must hold sales:admin:create-rep)
 * @param input - The rep account fields
 * @returns The validated input
 */
export async function createRepAccount(
  { db, user, tenant }: SalesDomainContext,
  input: CreateRepInput,
) {
  assertCan(user, "sales:admin:create-rep", tenant);
  return input;
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
    return updated;
  }
  if (input.rubricId) {
    const [updated] = await rawDb
      .update(salesRubrics)
      .set({ reviewStatus: "approved" })
      .where(eq(salesRubrics.id, input.rubricId))
      .returning();
    return updated;
  }
  throw new Error("Either lessonId or rubricId is required");
}
