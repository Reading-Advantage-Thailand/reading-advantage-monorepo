import { eq, and, desc, sql, inArray, lt } from "drizzle-orm";
import {
  codecampModules,
  codecampLessons,
  codecampExercises,
  codecampQuizQuestions,
  codecampUserProgress,
  codecampChatConversations,
  codecampChatMessages,
  codecampExerciseRepos,
  codecampPrReviews,
  codecampWebhookEvents,
  users,
  accounts,
} from "@reading-advantage/db/schema";
import { PORTFOLIO_PROJECTS } from "@reading-advantage/db";
import { hashPassword } from "@reading-advantage/auth";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";

// ─── Types ────────────────────────────────────────────────

interface DomainInput<T> {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: T;
}

// ─── Modules ──────────────────────────────────────────────

export async function getModuleBySlug({
  db,
  user,
  tenant,
  input,
}: DomainInput<{ slug: string }>) {
  assertCan(user, "codecamp:read", tenant);

  const [module] = await db
    .select()
    .from(codecampModules)
    .where(eq(codecampModules.slug, input.slug))
    .limit(1);

  if (!module || module.status !== "published") {
    throw new Error("Module not found");
  }

  const lessons = await db
    .select()
    .from(codecampLessons)
    .where(eq(codecampLessons.moduleId, module.id))
    .orderBy(codecampLessons.order);

  const progress = await db
    .select()
    .from(codecampUserProgress)
    .where(
      and(
        eq(codecampUserProgress.userId, user.id),
        eq(codecampUserProgress.moduleId, module.id)
      )
    );

  const completed = progress.filter((p) => p.status === "completed").length;

  return {
    ...module,
    lessons: lessons.map((lesson) => {
      const lessonProgress = progress.find((p) => p.lessonId === lesson.id);
      return {
        id: lesson.id,
        moduleId: lesson.moduleId,
        title: lesson.title,
        description: lesson.description,
        order: lesson.order,
        type: lesson.type,
        userStatus: lessonProgress?.status ?? "not_started",
        userScore: lessonProgress?.score ?? null,
        createdAt: lesson.createdAt,
        updatedAt: lesson.updatedAt,
      };
    }),
    lessonCount: lessons.length,
    completedLessons: completed,
    progress: lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0,
  };
}

export async function getModulesWithProgress({
  db,
  user,
  tenant,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
}) {
  assertCan(user, "codecamp:read", tenant);

  const modules = await db
    .select()
    .from(codecampModules)
    .where(eq(codecampModules.status, "published"))
    .orderBy(codecampModules.order);

  // Only fetch lessons for published modules to avoid leaking draft content
  const moduleIds = modules.map((m) => m.id);
  const lessons = moduleIds.length > 0
    ? await db
        .select()
        .from(codecampLessons)
        .where(inArray(codecampLessons.moduleId, moduleIds))
        .orderBy(codecampLessons.order)
    : [];

  const progress = await db
    .select()
    .from(codecampUserProgress)
    .where(eq(codecampUserProgress.userId, user.id));

  return modules.map((mod) => {
    const modLessons = lessons.filter((l) => l.moduleId === mod.id);
    const modProgress = progress.filter((p) => p.moduleId === mod.id);
    const completed = modProgress.filter((p) => p.status === "completed").length;

    return {
      ...mod,
      lessonCount: modLessons.length,
      completedLessons: completed,
      progress: modLessons.length > 0 ? Math.round((completed / modLessons.length) * 100) : 0,
    };
  });
}

// ─── Lessons ──────────────────────────────────────────────

export async function getLessonsForModule({
  db,
  user,
  tenant,
  input,
}: DomainInput<{ moduleId: string }>) {
  assertCan(user, "codecamp:read", tenant);

  const [module] = await db
    .select()
    .from(codecampModules)
    .where(eq(codecampModules.id, input.moduleId))
    .limit(1);

  if (!module || module.status !== "published") {
    throw new Error("Module not found");
  }

  const lessons = await db
    .select()
    .from(codecampLessons)
    .where(eq(codecampLessons.moduleId, input.moduleId))
    .orderBy(codecampLessons.order);

  const progress = await db
    .select()
    .from(codecampUserProgress)
    .where(
      and(
        eq(codecampUserProgress.userId, user.id),
        eq(codecampUserProgress.moduleId, input.moduleId)
      )
    );

  return lessons.map((lesson) => {
    const lessonProgress = progress.find((p) => p.lessonId === lesson.id);
    return {
      id: lesson.id,
      moduleId: lesson.moduleId,
      title: lesson.title,
      description: lesson.description,
      order: lesson.order,
      type: lesson.type,
      userStatus: lessonProgress?.status ?? "not_started",
      userScore: lessonProgress?.score ?? null,
      createdAt: lesson.createdAt,
      updatedAt: lesson.updatedAt,
    };
  });
}

export async function getLessonWithContent({
  db,
  user,
  tenant,
  input,
}: DomainInput<{ lessonId: string }>) {
  assertCan(user, "codecamp:read", tenant);

  const [lesson] = await db
    .select()
    .from(codecampLessons)
    .where(eq(codecampLessons.id, input.lessonId))
    .limit(1);

  if (!lesson) {
    throw new Error("Lesson not found");
  }

  // Verify parent module is published
  const [module] = await db
    .select()
    .from(codecampModules)
    .where(eq(codecampModules.id, lesson.moduleId))
    .limit(1);

  if (!module || module.status !== "published") {
    throw new Error("Lesson not found");
  }

  const exercises = await db
    .select()
    .from(codecampExercises)
    .where(eq(codecampExercises.lessonId, input.lessonId))
    .orderBy(codecampExercises.order);

  const quizQuestions = await db
    .select()
    .from(codecampQuizQuestions)
    .where(eq(codecampQuizQuestions.lessonId, input.lessonId))
    .orderBy(codecampQuizQuestions.order);

  const [progress] = await db
    .select()
    .from(codecampUserProgress)
    .where(
      and(
        eq(codecampUserProgress.userId, user.id),
        eq(codecampUserProgress.lessonId, input.lessonId)
      )
    )
    .limit(1);

  const { contentJson, ...lessonRest } = lesson;

  const safeContent =
    typeof contentJson === "object" && contentJson !== null
      ? (contentJson as Record<string, unknown>)
      : {};

  return {
    ...lessonRest,
    moduleSlug: module.slug,
    content: safeContent,
    exercises: exercises.map((e) => ({
      ...e,
      hints: Array.isArray(e.hintsJson) ? (e.hintsJson as string[]) : [],
    })),
    quizQuestions: quizQuestions.map((q) => ({
      id: q.id,
      question: q.question,
      options: Array.isArray(q.optionsJson) ? (q.optionsJson as string[]) : [],
      order: q.order,
    })),
    userStatus: progress?.status ?? "not_started",
    userScore: progress?.score ?? null,
  };
}

// ─── Exercises ────────────────────────────────────────────

export async function submitExerciseAttempt({
  db,
  user,
  tenant,
  input,
}: DomainInput<{ exerciseId: string; code: string }>) {
  assertCan(user, "codecamp:submit", tenant);

  const [exercise] = await db
    .select()
    .from(codecampExercises)
    .where(eq(codecampExercises.id, input.exerciseId))
    .limit(1);

  if (!exercise) {
    throw new Error("Exercise not found");
  }

  // Persist attempt as progress update
  await updateUserProgress({
    db,
    user,
    tenant,
    input: {
      lessonId: exercise.lessonId,
      status: "in_progress",
    },
  });

  return {
    exerciseId: input.exerciseId,
    passed: false, // LLM review will determine this; domain layer is agnostic
    feedback: "Submitted for review.",
    hints: Array.isArray(exercise.hintsJson) ? (exercise.hintsJson as string[]) : [],
  };
}

// ─── Quiz ─────────────────────────────────────────────────

export const QUIZ_PASS_THRESHOLD = 70;

export async function submitQuizAnswers({
  db,
  user,
  tenant,
  input,
}: DomainInput<{
  lessonId: string;
  answers: { questionId: string; answer: string }[];
}>) {
  assertCan(user, "codecamp:submit", tenant);

  const questions = await db
    .select()
    .from(codecampQuizQuestions)
    .where(eq(codecampQuizQuestions.lessonId, input.lessonId))
    .orderBy(codecampQuizQuestions.order);

  if (questions.length === 0) {
    throw new Error("No quiz questions found for this lesson");
  }

  let correctCount = 0;
  const details = questions.map((q) => {
    const userAnswer =
      input.answers.find((a) => a.questionId === q.id)?.answer ?? "";
    const isCorrect = userAnswer === q.correctAnswer;
    if (isCorrect) correctCount++;

    return {
      questionId: q.id,
      question: q.question,
      userAnswer,
      correctAnswer: q.correctAnswer,
      isCorrect,
      explanation: q.explanation,
    };
  });

  const score = Math.round((correctCount / questions.length) * 100);

  const passed = score >= QUIZ_PASS_THRESHOLD;

  await updateUserProgress({
    db,
    user,
    tenant,
    input: {
      lessonId: input.lessonId,
      status: passed ? "completed" : "in_progress",
      score,
    },
  });

  return {
    lessonId: input.lessonId,
    score,
    passed,
    total: questions.length,
    correctCount,
    details,
  };
}

export async function markTheoryComplete({
  db,
  user,
  tenant,
  input,
}: DomainInput<{ lessonId: string }>) {
  assertCan(user, "codecamp:submit", tenant);

  const [lesson] = await db
    .select()
    .from(codecampLessons)
    .where(eq(codecampLessons.id, input.lessonId))
    .limit(1);

  if (!lesson) {
    throw new Error("Lesson not found");
  }

  if (lesson.type !== "theory") {
    throw new Error("Lesson is not a theory lesson");
  }

  return updateUserProgress({
    db,
    user,
    tenant,
    input: {
      lessonId: input.lessonId,
      status: "completed",
    },
  });
}

// ─── Chat ─────────────────────────────────────────────────

export async function saveChatMessage({
  db,
  user,
  tenant,
  input,
}: DomainInput<{
  conversationId?: string;
  message: string;
  moduleId?: string;
  lessonId?: string;
  /**
   * Internal parameter — not exposed to clients via the tRPC schema.
   * The streaming route uses this to persist assistant messages.
   * Client-submitted messages always use "user" (enforced by the tRPC schema).
   */
  role?: "user" | "assistant";
}>) {
  assertCan(user, "codecamp:chat", tenant);

  let conversationId = input.conversationId;
  const role = input.role ?? "user";

  return db.transaction(async (tx) => {
    if (conversationId) {
      // Verify ownership before appending
      const [existing] = await tx
        .select()
        .from(codecampChatConversations)
        .where(
          and(
            eq(codecampChatConversations.id, conversationId),
            eq(codecampChatConversations.userId, user.id)
          )
        )
        .limit(1);

      if (!existing) {
        throw new Error("Conversation not found");
      }
    } else if (role === "user") {
      // Only create a new conversation for user messages
      const [conversation] = await tx
        .insert(codecampChatConversations)
        .values({
          userId: user.id,
          title: input.message.slice(0, 60) + (input.message.length > 60 ? "..." : ""),
          moduleId: input.moduleId ?? null,
          lessonId: input.lessonId ?? null,
        })
        .returning();
      conversationId = conversation.id;
    } else {
      throw new Error("Conversation not found");
    }

    const [savedMessage] = await tx
      .insert(codecampChatMessages)
      .values({
        conversationId,
        role,
        content: input.message,
      })
      .returning();

    return {
      conversationId,
      message: savedMessage,
    };
  });
}

export async function getChatHistory({
  db,
  user,
  tenant,
  input,
}: DomainInput<{ conversationId: string }>) {
  assertCan(user, "codecamp:read", tenant);

  const [conversation] = await db
    .select()
    .from(codecampChatConversations)
    .where(
      and(
        eq(codecampChatConversations.id, input.conversationId),
        eq(codecampChatConversations.userId, user.id)
      )
    )
    .limit(1);

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const messages = await db
    .select()
    .from(codecampChatMessages)
    .where(eq(codecampChatMessages.conversationId, input.conversationId))
    .orderBy(codecampChatMessages.createdAt);

  return {
    ...conversation,
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      createdAt: m.createdAt,
    })),
  };
}

export async function getUserConversations({
  db,
  user,
  tenant,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
}) {
  assertCan(user, "codecamp:read", tenant);

  return db
    .select()
    .from(codecampChatConversations)
    .where(eq(codecampChatConversations.userId, user.id))
    .orderBy(desc(codecampChatConversations.updatedAt));
}

// ─── Progress ─────────────────────────────────────────────

export async function updateUserProgress({
  db,
  user,
  tenant,
  input,
}: DomainInput<{
  lessonId: string;
  status?: "not_started" | "in_progress" | "completed";
  score?: number;
}>) {
  assertCan(user, "codecamp:submit", tenant);

  const [lesson] = await db
    .select()
    .from(codecampLessons)
    .where(eq(codecampLessons.id, input.lessonId))
    .limit(1);

  if (!lesson) {
    throw new Error("Lesson not found");
  }

  const now = new Date();
  const nowIso = now.toISOString();

  const [result] = await db
    .insert(codecampUserProgress)
    .values({
      userId: user.id,
      moduleId: lesson.moduleId,
      lessonId: input.lessonId,
      status: input.status ?? "not_started",
      score: input.score ?? 0,
      completedAt: input.status === "completed" ? now : null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [codecampUserProgress.userId, codecampUserProgress.lessonId],
      set: {
        status: input.status !== undefined ? input.status : sql`${codecampUserProgress.status}`,
        score: input.score !== undefined ? input.score : sql`${codecampUserProgress.score}`,
        completedAt:
          input.status === "completed"
            ? sql`COALESCE(${codecampUserProgress.completedAt}, ${nowIso})`
            : input.status !== undefined
              ? sql`${codecampUserProgress.completedAt}`
              : sql`${codecampUserProgress.completedAt}`,
        updatedAt: now,
      },
    })
    .returning();

  return result;
}

// ─── Dashboard ────────────────────────────────────────────

const PORTFOLIO_BY_PHASE: Record<
  string,
  typeof PORTFOLIO_PROJECTS[number]
> = Object.fromEntries(
  PORTFOLIO_PROJECTS.map((p) => [p.phase, p])
);

const PHASE_METADATA: Record<
  string,
  { title: string; description: string; portfolioProject: string; portfolioProjectUrl: string }
> = {
  A: {
    title: "Foundations",
    description: "Master the fundamentals of web development",
    portfolioProject: PORTFOLIO_BY_PHASE["A"]!.title,
    portfolioProjectUrl: PORTFOLIO_BY_PHASE["A"]!.repoUrl,
  },
  B: {
    title: "Frameworks",
    description: "Build interactive applications with React and Next.js",
    portfolioProject: PORTFOLIO_BY_PHASE["B"]!.title,
    portfolioProjectUrl: PORTFOLIO_BY_PHASE["B"]!.repoUrl,
  },
  C: {
    title: "Backend & Data",
    description: "Connect databases and build type-safe APIs",
    portfolioProject: PORTFOLIO_BY_PHASE["C"]!.title,
    portfolioProjectUrl: PORTFOLIO_BY_PHASE["C"]!.repoUrl,
  },
  D: {
    title: "Production",
    description: "Ship production-ready applications to the cloud",
    portfolioProject: PORTFOLIO_BY_PHASE["D"]!.title,
    portfolioProjectUrl: PORTFOLIO_BY_PHASE["D"]!.repoUrl,
  },
};

export async function getUserDashboard({
  db,
  user,
  tenant,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
}) {
  assertCan(user, "codecamp:read", tenant);

  const modules = await getModulesWithProgress({ db, user, tenant });

  const totalLessons = modules.reduce((sum, m) => sum + m.lessonCount, 0);
  const completedLessons = modules.reduce(
    (sum, m) => sum + m.completedLessons,
    0
  );
  const overallProgress =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Group modules by phase
  const phases: Record<
    string,
    {
      title: string;
      description: string;
      portfolioProject: string;
      portfolioProjectUrl: string;
      modules: typeof modules;
      completedLessons: number;
      totalLessons: number;
    }
  > = {};

  for (const phase of ["A", "B", "C", "D"]) {
    const meta = PHASE_METADATA[phase];
    const phaseModules = modules.filter((m) => m.phase === phase);
    const phaseCompleted = phaseModules.reduce(
      (sum, m) => sum + m.completedLessons,
      0
    );
    const phaseTotal = phaseModules.reduce((sum, m) => sum + m.lessonCount, 0);

    phases[phase] = {
      ...meta,
      modules: phaseModules,
      completedLessons: phaseCompleted,
      totalLessons: phaseTotal,
    };
  }

  const conversations = await db
    .select({
      id: codecampChatConversations.id,
      title: codecampChatConversations.title,
      updatedAt: codecampChatConversations.updatedAt,
    })
    .from(codecampChatConversations)
    .where(eq(codecampChatConversations.userId, user.id))
    .orderBy(desc(codecampChatConversations.updatedAt))
    .limit(5);

  return {
    phases,
    totalLessons,
    completedLessons,
    overallProgress,
    recentConversations: conversations,
  };
}

// ─── Exercise Repos ───────────────────────────────────────

export async function getExerciseRepos({
  db,
  user,
  tenant,
  input,
}: DomainInput<{ moduleId?: string }>) {
  assertCan(user, "codecamp:read", tenant);

  const conditions = [];
  if (input.moduleId) {
    conditions.push(eq(codecampExerciseRepos.moduleId, input.moduleId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(codecampExerciseRepos)
    .where(whereClause)
    .orderBy(codecampExerciseRepos.order);
}

export async function getExerciseRepoByUrl({
  db,
  user,
  tenant,
  input,
}: DomainInput<{ repoUrl: string }>) {
  assertCan(user, "codecamp:read", tenant);

  const normalizedUrl = input.repoUrl.replace(/\.git$/, "").replace(/\/$/, "");

  const [repo] = await db
    .select()
    .from(codecampExerciseRepos)
    .where(eq(codecampExerciseRepos.repoUrl, normalizedUrl))
    .limit(1);

  return repo ?? null;
}

export async function linkExerciseRepo({
  db,
  user,
  tenant,
  input,
}: DomainInput<{
  moduleId: string;
  repoUrl: string;
  description: string;
  order: number;
}>) {
  assertCan(user, "admin:dashboard", tenant);

  const [module] = await db
    .select({ id: codecampModules.id })
    .from(codecampModules)
    .where(eq(codecampModules.id, input.moduleId))
    .limit(1);

  if (!module) {
    throw new Error(`Module not found: ${input.moduleId}`);
  }

  // Prevent duplicate repo URLs
  const [existing] = await db
    .select({ id: codecampExerciseRepos.id })
    .from(codecampExerciseRepos)
    .where(eq(codecampExerciseRepos.repoUrl, input.repoUrl))
    .limit(1);

  if (existing) {
    throw new Error("A repo with this URL already exists");
  }

  const [result] = await db
    .insert(codecampExerciseRepos)
    .values({
      moduleId: input.moduleId,
      repoUrl: input.repoUrl,
      description: input.description,
      order: input.order,
    })
    .returning();

  return result;
}

// ─── PR Reviews ───────────────────────────────────────────

export async function getPrReviewsForUser({
  db,
  user,
  tenant,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
}) {
  assertCan(user, "codecamp:read", tenant);

  return db
    .select()
    .from(codecampPrReviews)
    .where(eq(codecampPrReviews.userId, user.id))
    .orderBy(desc(codecampPrReviews.createdAt));
}

export async function createPrReview({
  db,
  user,
  tenant,
  input,
}: DomainInput<{
  exerciseRepoId: string;
  prUrl: string;
}>) {
  assertCan(user, "codecamp:submit", tenant);

  // Validate that the exercise repo exists
  const [repo] = await db
    .select({ id: codecampExerciseRepos.id, moduleId: codecampExerciseRepos.moduleId, repoUrl: codecampExerciseRepos.repoUrl })
    .from(codecampExerciseRepos)
    .where(eq(codecampExerciseRepos.id, input.exerciseRepoId))
    .limit(1);

  if (!repo) {
    throw new Error("Exercise repo not found");
  }

  // Validate PR URL format
  let prUrlObj: URL;
  try {
    prUrlObj = new URL(input.prUrl);
  } catch {
    throw new Error("Invalid PR URL");
  }
  if (prUrlObj.hostname !== "github.com") {
    throw new Error("PR URL must be a GitHub URL");
  }
  const prPathParts = prUrlObj.pathname.split("/").filter(Boolean);
  // Expect: /owner/repo/pull/number
  if (prPathParts.length < 4 || prPathParts[2] !== "pull" || isNaN(Number(prPathParts[3]))) {
    throw new Error("Invalid PR URL: must be a GitHub pull request URL (e.g. https://github.com/owner/repo/pull/123)");
  }

  // Validate PR URL is for the correct exercise repo
  const normalizedExerciseUrl = repo.repoUrl.replace(/\.git$/, "").replace(/\/$/, "").toLowerCase();
  const prTargetUrl = `https://github.com/${prPathParts[0]}/${prPathParts[1]}`.toLowerCase();
  if (prTargetUrl !== normalizedExerciseUrl) {
    const repoName = normalizedExerciseUrl.split("/").pop() ?? "the exercise repo";
    throw new Error(`PR URL must be for the ${repoName} repository`);
  }

  // Check for existing review with the same PR URL to prevent duplicates
  const [existing] = await db
    .select({ id: codecampPrReviews.id })
    .from(codecampPrReviews)
    .where(eq(codecampPrReviews.prUrl, input.prUrl))
    .limit(1);

  if (existing) {
    throw new Error("A review for this PR URL already exists");
  }

  const [result] = await db
    .insert(codecampPrReviews)
    .values({
      exerciseRepoId: input.exerciseRepoId,
      userId: user.id,
      prUrl: input.prUrl,
      reviewStatus: "pending",
    })
    .returning();

  return result;
}

export async function updatePrReview({
  db,
  user,
  tenant,
  input,
}: DomainInput<{
  reviewId: string;
  reviewStatus: "pending" | "reviewed" | "needs_changes" | "approved";
  llmReviewSummary?: string;
}>) {
  assertCan(user, "admin:dashboard", tenant);

  const [result] = await db
    .update(codecampPrReviews)
    .set({
      reviewStatus: input.reviewStatus,
      llmReviewSummary: input.llmReviewSummary ?? null,
      reviewedAt: input.reviewStatus !== "pending" ? new Date() : sql`${codecampPrReviews.reviewedAt}`,
    })
    .where(eq(codecampPrReviews.id, input.reviewId))
    .returning();

  if (!result) {
    throw new Error("Review not found");
  }

  return result;
}

export async function completeApprovedPrReviewLesson({
  db,
  user,
  tenant,
  input,
}: DomainInput<{ reviewId: string }>) {
  assertCan(user, "admin:dashboard", tenant);

  const [review] = await db
    .select()
    .from(codecampPrReviews)
    .where(eq(codecampPrReviews.id, input.reviewId))
    .limit(1);

  if (!review) {
    throw new Error("Review not found");
  }

  if (review.reviewStatus !== "approved") {
    throw new Error("Review is not approved");
  }

  const [repo] = await db
    .select()
    .from(codecampExerciseRepos)
    .where(eq(codecampExerciseRepos.id, review.exerciseRepoId))
    .limit(1);

  if (!repo) {
    throw new Error("Exercise repo not found");
  }

  const lessons = await db
    .select()
    .from(codecampLessons)
    .where(eq(codecampLessons.moduleId, repo.moduleId))
    .orderBy(codecampLessons.order);

  const exerciseLesson = lessons.find((lesson) => lesson.type === "exercise");
  if (!exerciseLesson) {
    throw new Error("Exercise lesson not found");
  }

  const reviewOwner = {
    id: review.userId,
    username: review.userId,
    name: null,
    role: "INTERN" as const,
    schoolId: null,
    xp: 0,
    level: 1,
    cefrLevel: "A1",
  };

  return updateUserProgress({
    db,
    user: reviewOwner,
    tenant,
    input: {
      lessonId: exerciseLesson.id,
      status: "completed",
      score: 100,
    },
  });
}

export async function getPrReviewByPrUrl({
  db,
  user,
  tenant,
  input,
}: DomainInput<{ prUrl: string }>) {
  assertCan(user, "codecamp:read", tenant);

  const conditions = [eq(codecampPrReviews.prUrl, input.prUrl)];
  if (user.role !== "SYSTEM") {
    conditions.push(eq(codecampPrReviews.userId, user.id));
  }

  const [result] = await db
    .select()
    .from(codecampPrReviews)
    .where(and(...conditions))
    .limit(1);

  return result ?? null;
}

// ─── Webhook Diagnostics ─────────────────────────────────

export type CodecampWebhookEventOutcome = "ignored" | "failed";

export async function logWebhookEvent({
  db,
  user,
  tenant,
  input,
}: DomainInput<{
  deliveryId?: string | null;
  event: string;
  action?: string | null;
  repoUrl?: string | null;
  prUrl?: string | null;
  githubUsername?: string | null;
  outcome: CodecampWebhookEventOutcome;
  reason: string;
  payload?: unknown;
}>) {
  assertCan(user, "admin:dashboard", tenant);

  const [result] = await db
    .insert(codecampWebhookEvents)
    .values({
      deliveryId: input.deliveryId ?? null,
      event: input.event,
      action: input.action ?? null,
      repoUrl: input.repoUrl ?? null,
      prUrl: input.prUrl ?? null,
      githubUsername: input.githubUsername ?? null,
      outcome: input.outcome,
      reason: input.reason,
      payloadJson: input.payload ?? null,
    })
    .returning();

  return result;
}

export async function listWebhookEvents({
  db,
  user,
  tenant,
  input,
}: DomainInput<{ limit?: number }>) {
  assertCan(user, "admin:dashboard", tenant);

  const limit = Math.min(Math.max(input.limit ?? 25, 1), 100);

  const rows = await db
    .select()
    .from(codecampWebhookEvents)
    .orderBy(desc(codecampWebhookEvents.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    outcome: row.outcome === "failed" ? "failed" as const : "ignored" as const,
  }));
}

// ─── Module Phase & Prerequisites ─────────────────────────

export async function getModulesByPhase({
  db,
  user,
  tenant,
  input,
}: DomainInput<{ phase: "A" | "B" | "C" | "D" }>) {
  assertCan(user, "codecamp:read", tenant);

  const validPhases = ["A", "B", "C", "D"];
  if (!validPhases.includes(input.phase)) {
    throw new Error("Invalid phase");
  }

  const modules = await db
    .select()
    .from(codecampModules)
    .where(
      and(
        eq(codecampModules.status, "published"),
        eq(codecampModules.phase, input.phase)
      )
    )
    .orderBy(codecampModules.order);

  const moduleIds = modules.map((m) => m.id);
  const lessons = moduleIds.length > 0
    ? await db
        .select()
        .from(codecampLessons)
        .where(inArray(codecampLessons.moduleId, moduleIds))
        .orderBy(codecampLessons.order)
    : [];

  const progress = await db
    .select()
    .from(codecampUserProgress)
    .where(eq(codecampUserProgress.userId, user.id));

  return modules.map((mod) => {
    const modLessons = lessons.filter((l) => l.moduleId === mod.id);
    const modProgress = progress.filter((p) => p.moduleId === mod.id);
    const completed = modProgress.filter((p) => p.status === "completed").length;

    return {
      ...mod,
      lessonCount: modLessons.length,
      completedLessons: completed,
      progress: modLessons.length > 0 ? Math.round((completed / modLessons.length) * 100) : 0,
    };
  });
}

export async function getModuleWithExercises({
  db,
  user,
  tenant,
  input,
}: DomainInput<{ moduleId: string }>) {
  assertCan(user, "codecamp:read", tenant);

  const [module] = await db
    .select()
    .from(codecampModules)
    .where(eq(codecampModules.id, input.moduleId))
    .limit(1);

  if (!module || module.status !== "published") {
    throw new Error("Module not found");
  }

  const repos = await db
    .select()
    .from(codecampExerciseRepos)
    .where(eq(codecampExerciseRepos.moduleId, input.moduleId))
    .orderBy(codecampExerciseRepos.order);

  const lessons = await db
    .select()
    .from(codecampLessons)
    .where(eq(codecampLessons.moduleId, input.moduleId))
    .orderBy(codecampLessons.order);

  const progress = await db
    .select()
    .from(codecampUserProgress)
    .where(
      and(
        eq(codecampUserProgress.userId, user.id),
        eq(codecampUserProgress.moduleId, input.moduleId)
      )
    );

  const completed = progress.filter((p) => p.status === "completed").length;

  return {
    ...module,
    lessons: lessons.map((lesson) => {
      const lessonProgress = progress.find((p) => p.lessonId === lesson.id);
      return {
        id: lesson.id,
        moduleId: lesson.moduleId,
        title: lesson.title,
        description: lesson.description,
        order: lesson.order,
        type: lesson.type,
        userStatus: lessonProgress?.status ?? "not_started",
        userScore: lessonProgress?.score ?? null,
        createdAt: lesson.createdAt,
        updatedAt: lesson.updatedAt,
      };
    }),
    lessonCount: lessons.length,
    completedLessons: completed,
    progress: lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0,
    exerciseRepos: repos,
  };
}

export async function checkModulePrerequisite({
  db,
  user,
  tenant,
  input,
}: DomainInput<{ moduleId: string }>) {
  assertCan(user, "codecamp:read", tenant);

  const [targetModule] = await db
    .select()
    .from(codecampModules)
    .where(eq(codecampModules.id, input.moduleId))
    .limit(1);

  if (!targetModule) {
    throw new Error("Module not found");
  }

  // Module 1 has no prerequisite
  if (targetModule.order <= 1) {
    return { canStart: true };
  }

  // Find the previous published module (highest order less than target)
  const [prevModule] = await db
    .select()
    .from(codecampModules)
    .where(
      and(
        lt(codecampModules.order, targetModule.order),
        eq(codecampModules.status, "published")
      )
    )
    .orderBy(desc(codecampModules.order))
    .limit(1);

  if (!prevModule) {
    return { canStart: true };
  }

  // Check if all lessons in previous module are completed
  const prevLessons = await db
    .select()
    .from(codecampLessons)
    .where(eq(codecampLessons.moduleId, prevModule.id))
    .orderBy(codecampLessons.order);

  if (prevLessons.length === 0) {
    return { canStart: true };
  }

  const progress = await db
    .select()
    .from(codecampUserProgress)
    .where(
      and(
        eq(codecampUserProgress.userId, user.id),
        eq(codecampUserProgress.moduleId, prevModule.id),
        eq(codecampUserProgress.status, "completed")
      )
    );

  const completedLessonIds = new Set(progress.map((p) => p.lessonId));
  const allCompleted = prevLessons.every((lesson) =>
    completedLessonIds.has(lesson.id)
  );

  return { canStart: allCompleted };
}

// ─── Admin ────────────────────────────────────────────────

const PASSWORD_COMPLEXITY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

export async function createInternAccount({
  db,
  user,
  tenant,
  input,
}: DomainInput<{
  username: string;
  name: string;
  password: string;
  githubUsername?: string | null;
}>) {
  assertCan(user, "admin:dashboard", tenant);

  if (!PASSWORD_COMPLEXITY.test(input.password)) {
    throw new Error("Password must contain at least one uppercase letter, one lowercase letter, and one digit");
  }

  const lowerUsername = input.username.toLowerCase();
  const normalizedGithubUsername = (input.githubUsername || input.username)
    .replace(/^@/, "")
    .toLowerCase();

  // Check for existing username before attempting insert
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.username, lowerUsername))
    .limit(1);

  if (existing) {
    throw new Error("Username already exists");
  }

  const [existingGithubUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.githubUsername, normalizedGithubUsername))
    .limit(1);

  if (existingGithubUser) {
    throw new Error("GitHub username already exists");
  }

  const passwordHash = await hashPassword(input.password);
  const userId = crypto.randomUUID();

  const result = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(users)
      .values({
        id: userId,
        username: lowerUsername,
        displayUsername: input.username,
        name: input.name,
        role: "INTERN",
        // Intentionally null: codecamp interns are global, not scoped to a school tenant.
        // See tech-debt.md — may introduce a synthetic "codecamp" tenant later.
        schoolId: null,
        xp: 0,
        level: 1,
        cefrLevel: "A1",
        githubUsername: normalizedGithubUsername,
      })
      .returning();

    await tx.insert(accounts).values({
      id: `${userId}_credential`,
      userId,
      providerId: "credential",
      password: passwordHash,
    });

    return created;
  });

  return result;
}

export async function updateInternGithubUsername({
  db,
  user,
  tenant,
  input,
}: DomainInput<{ userId: string; githubUsername: string | null }>) {
  assertCan(user, "admin:dashboard", tenant);

  const [intern] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, input.userId), eq(users.role, "INTERN")))
    .limit(1);

  if (!intern) {
    throw new Error("Intern not found");
  }

  const normalizedUsername = input.githubUsername
    ? input.githubUsername.replace(/^@/, "").toLowerCase()
    : null;

  const [result] = await db
    .update(users)
    .set({ githubUsername: normalizedUsername })
    .where(eq(users.id, input.userId))
    .returning();

  return result;
}

export async function listInterns({
  db,
  user,
  tenant,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
}) {
  assertCan(user, "admin:dashboard", tenant);

  const interns = await db
    .select()
    .from(users)
    .where(eq(users.role, "INTERN"))
    .orderBy(users.createdAt);

  // Fetch progress summary for each intern
  const modules = await db
    .select()
    .from(codecampModules)
    .where(eq(codecampModules.status, "published"))
    .orderBy(codecampModules.order);

  const moduleIds = modules.map((m) => m.id);
  const internIds = interns.map((i) => i.id);

  const allProgress = moduleIds.length > 0 && internIds.length > 0
    ? await db
        .select()
        .from(codecampUserProgress)
        .where(
          and(
            inArray(codecampUserProgress.moduleId, moduleIds),
            inArray(codecampUserProgress.userId, internIds)
          )
        )
    : [];

  const allLessons = moduleIds.length > 0
    ? await db
        .select()
        .from(codecampLessons)
        .where(inArray(codecampLessons.moduleId, moduleIds))
    : [];

  const allRepos = moduleIds.length > 0
    ? await db
        .select()
        .from(codecampExerciseRepos)
        .where(inArray(codecampExerciseRepos.moduleId, moduleIds))
    : [];

  const allReviews = internIds.length > 0
    ? await db
        .select()
        .from(codecampPrReviews)
        .where(inArray(codecampPrReviews.userId, internIds))
    : [];

  return interns.map((intern) => {
    const internProgress = allProgress.filter((p) => p.userId === intern.id);
    const completedModules = new Set(
      internProgress.filter((p) => p.status === "completed").map((p) => p.moduleId)
    ).size;
    const quizScores = internProgress
      .filter((p) => {
        const lesson = allLessons.find((l) => l.id === p.lessonId);
        return p.score > 0 && lesson?.type === "quiz";
      })
      .map((p) => p.score);
    const quizAverage =
      quizScores.length > 0
        ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
        : 0;

    const internReviews = allReviews.filter((r) => r.userId === intern.id);
    const pending = internReviews.filter((r) => r.reviewStatus === "pending").length;
    const approved = internReviews.filter((r) => r.reviewStatus === "approved").length;
    const latestPrReview = [...internReviews].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;

    const lastActive = internProgress.length > 0
      ? [...internProgress].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0].updatedAt
      : null;

    // Calculate lesson-based overall progress (consistent with getUserDashboard)
    const totalLessons = allLessons.length;
    const completedLessons = internProgress.filter((p) => p.status === "completed").length;
    const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const currentModule = modules.find((mod) => {
      const moduleLessons = allLessons.filter((lesson) => lesson.moduleId === mod.id);
      if (moduleLessons.length === 0) return false;
      const completedForModule = internProgress.filter((p) => p.moduleId === mod.id && p.status === "completed").length;
      return completedForModule < moduleLessons.length;
    }) ?? null;
    const currentModuleHasReview = currentModule
      ? allRepos.some((repo) => repo.moduleId === currentModule.id)
      : false;
    const reviewExpectation = latestPrReview
      ? "review_received" as const
      : currentModuleHasReview
        ? "awaiting_pr" as const
        : "not_expected_yet" as const;

    return {
      userId: intern.id,
      name: intern.name,
      username: intern.username,
      overallProgress,
      completedModules,
      totalModules: modules.length,
      quizAverage,
      prReviewsPending: pending,
      prReviewsApproved: approved,
      reviewExpectation,
      latestPrReview: latestPrReview
        ? {
            prUrl: latestPrReview.prUrl,
            reviewStatus: latestPrReview.reviewStatus,
            llmReviewSummary: latestPrReview.llmReviewSummary,
            createdAt: latestPrReview.createdAt,
          }
        : null,
      lastActiveAt: lastActive,
    };
  });
}

export async function getInternProgress({
  db,
  user,
  tenant,
  input,
}: DomainInput<{ userId: string }>) {
  assertCan(user, "admin:dashboard", tenant);

  const [intern] = await db
    .select()
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);

  if (!intern || intern.role !== "INTERN") {
    throw new Error("Intern not found");
  }

  const modules = await db
    .select()
    .from(codecampModules)
    .where(eq(codecampModules.status, "published"))
    .orderBy(codecampModules.order);

  const moduleIds = modules.map((m) => m.id);
  const lessons = moduleIds.length > 0
    ? await db
        .select()
        .from(codecampLessons)
        .where(inArray(codecampLessons.moduleId, moduleIds))
    : [];

  const progress = await db
    .select()
    .from(codecampUserProgress)
    .where(eq(codecampUserProgress.userId, input.userId));

  const exerciseRepos = moduleIds.length > 0
    ? await db
        .select()
        .from(codecampExerciseRepos)
        .where(inArray(codecampExerciseRepos.moduleId, moduleIds))
    : [];

  const reviews = await db
    .select()
    .from(codecampPrReviews)
    .where(eq(codecampPrReviews.userId, input.userId))
    .orderBy(desc(codecampPrReviews.createdAt));

  const moduleBreakdown = modules.map((mod) => {
    const modLessons = lessons.filter((l) => l.moduleId === mod.id);
    const modProgress = progress.filter((p) => p.moduleId === mod.id);
    const completed = modProgress.filter((p) => p.status === "completed").length;
    const totalLessons = modLessons.length;
    const avgScore = modProgress.length > 0
      ? Math.round(modProgress.reduce((s, p) => s + p.score, 0) / modProgress.length)
      : 0;
    const moduleRepos = exerciseRepos.filter((repo) => repo.moduleId === mod.id);
    const moduleRepoIds = new Set(moduleRepos.map((repo) => repo.id));
    const latestModuleReview = reviews
      .filter((review) => moduleRepoIds.has(review.exerciseRepoId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;

    return {
      moduleId: mod.id,
      title: mod.title,
      completed,
      totalLessons,
      avgScore,
      reviewExpected: moduleRepos.length > 0,
      reviewReceived: latestModuleReview !== null,
      latestPrUrl: latestModuleReview?.prUrl ?? null,
      latestPrReviewStatus: latestModuleReview?.reviewStatus ?? null,
    };
  });

  return {
    userId: intern.id,
    name: intern.name,
    username: intern.username,
    githubUsername: intern.githubUsername ?? null,
    moduleBreakdown,
    quizScores: progress
      .filter((p) => {
        const lesson = lessons.find((l) => l.id === p.lessonId);
        return p.score > 0 && lesson?.type === "quiz";
      })
      .map((p) => ({
        lessonId: p.lessonId,
        lessonTitle: lessons.find((l) => l.id === p.lessonId)?.title ?? "Lesson",
        score: p.score,
      })),
    prReviews: reviews,
  };
}

// ─── Chat Context ──────────────────────────────────────────

/**
 * Fetches module and lesson context for the AI chat system prompt.
 * Replaces raw DB queries previously in the chat API route.
 */
export async function getChatContext({
  db,
  user,
  tenant,
  input,
}: DomainInput<{ moduleId?: string; lessonId?: string }>) {
  assertCan(user, "codecamp:chat", tenant);

  let context = "";

  if (input.moduleId) {
    const [mod] = await db
      .select()
      .from(codecampModules)
      .where(
        and(
          eq(codecampModules.id, input.moduleId),
          eq(codecampModules.status, "published")
        )
      )
      .limit(1);
    if (mod) {
      context += `\n\nCurrent module: ${mod.title} — ${mod.description}`;
    }
  }

  if (input.lessonId) {
    const [lesson] = await db
      .select()
      .from(codecampLessons)
      .where(eq(codecampLessons.id, input.lessonId))
      .limit(1);
    if (lesson) {
      // Only include lesson context if its parent module is published
      const [mod] = await db
        .select({ status: codecampModules.status })
        .from(codecampModules)
        .where(eq(codecampModules.id, lesson.moduleId))
        .limit(1);
      if (mod?.status === "published") {
        context += `\nCurrent lesson: ${lesson.title} — ${lesson.description}`;
      }
    }
  }

  return context;
}

// ─── GitHub Issues (Module 18) ────────────────────────────

export interface PracticeIssue {
  number: number;
  title: string;
  body: string | null;
  htmlUrl: string;
  labels: string[];
  state: string;
}

export async function getPracticeIssues(
  repoOwner: string,
  repoName: string
): Promise<PracticeIssue[]> {
  const url = `https://api.github.com/repos/${encodeURIComponent(repoOwner)}/${encodeURIComponent(repoName)}/issues?state=open&per_page=20`;
  const fetchOptions = {
    headers: { Accept: "application/vnd.github.v3+json" },
    // next.revalidate is a Next.js ISR extension to RequestInit (not in standard types)
    next: { revalidate: 300 },
  } as RequestInit;
  const res = await fetch(url, fetchOptions);
  if (!res.ok) {
    // If GitHub is unreachable, return empty list (graceful degradation)
    console.warn(`[getPracticeIssues] GitHub API returned ${res.status}`);
    return [];
  }
  const data = await res.json() as Array<{
    number: number;
    title: string;
    body: string | null;
    html_url: string;
    labels: Array<{ name: string }>;
    state: string;
    pull_request?: unknown;
  }>;
  // Filter out pull requests (GitHub issues endpoint returns both)
  return data
    .filter((item) => !item.pull_request)
    .map((item) => ({
      number: item.number,
      title: item.title,
      body: item.body,
      htmlUrl: item.html_url,
      labels: item.labels.map((l) => l.name),
      state: item.state,
    }));
}

// ─── Re-exports ───────────────────────────────────────────

export { reviewExercise, reviewResultSchema } from "./review-exercise.js";
export type { ReviewResult } from "./review-exercise.js";
