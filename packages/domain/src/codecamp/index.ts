import { eq, and, desc, sql, inArray } from "drizzle-orm";
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
  users,
  accounts,
} from "@reading-advantage/db/schema";
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

  return {
    ...lessonRest,
    content: (contentJson as Record<string, unknown>) || {},
    exercises: exercises.map((e) => ({
      ...e,
      hints: (e.hintsJson as string[]) || [],
    })),
    quizQuestions: quizQuestions.map((q) => ({
      id: q.id,
      question: q.question,
      options: (q.optionsJson as string[]) || [],
      order: q.order,
    })),
    userStatus: progress?.status ?? "not_started",
    userScore: progress?.score ?? 0,
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
    hints: (exercise.hintsJson as string[]) || [],
  };
}

// ─── Quiz ─────────────────────────────────────────────────

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

  await updateUserProgress({
    db,
    user,
    tenant,
    input: {
      lessonId: input.lessonId,
      status: "completed",
      score,
    },
  });

  return {
    lessonId: input.lessonId,
    score,
    total: questions.length,
    correctCount,
    details,
  };
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
}>) {
  assertCan(user, "codecamp:chat", tenant);

  let conversationId = input.conversationId;

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
    } else {
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
    }

    const [userMessage] = await tx
      .insert(codecampChatMessages)
      .values({
        conversationId,
        role: "user",
        content: input.message,
      })
      .returning();

    return {
      conversationId,
      message: userMessage,
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
            ? sql`COALESCE(${codecampUserProgress.completedAt}, ${now})`
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

const PHASE_METADATA: Record<
  string,
  { title: string; description: string; portfolioProject: string }
> = {
  A: {
    title: "Foundations",
    description: "Master the fundamentals of web development",
    portfolioProject: "Personal Portfolio Website",
  },
  B: {
    title: "Frameworks",
    description: "Build interactive applications with React and Next.js",
    portfolioProject: "Learning Dashboard",
  },
  C: {
    title: "Backend & Data",
    description: "Connect databases and build type-safe APIs",
    portfolioProject: "Student Progress Tracker",
  },
  D: {
    title: "Production",
    description: "Ship production-ready applications to the cloud",
    portfolioProject: "Production-Ready Tracker",
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
}: DomainInput<{ moduleId: string }>) {
  assertCan(user, "codecamp:read", tenant);

  return db
    .select()
    .from(codecampExerciseRepos)
    .where(eq(codecampExerciseRepos.moduleId, input.moduleId))
    .orderBy(codecampExerciseRepos.order);
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
  assertCan(user, "codecamp:read", tenant);

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
      reviewedAt: new Date(),
    })
    .where(eq(codecampPrReviews.id, input.reviewId))
    .returning();

  if (!result) {
    throw new Error("Review not found");
  }

  return result;
}

export async function getPrReviewByPrUrl({
  db,
  user,
  tenant,
  input,
}: DomainInput<{ prUrl: string }>) {
  assertCan(user, "codecamp:read", tenant);

  const [result] = await db
    .select()
    .from(codecampPrReviews)
    .where(
      and(
        eq(codecampPrReviews.prUrl, input.prUrl),
        eq(codecampPrReviews.userId, user.id)
      )
    )
    .limit(1);

  return result ?? null;
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

  return modules;
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

  // Find the previous module
  const [prevModule] = await db
    .select()
    .from(codecampModules)
    .where(eq(codecampModules.order, targetModule.order - 1))
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

export async function createInternAccount({
  db,
  user,
  tenant,
  input,
}: DomainInput<{
  username: string;
  name: string;
  password: string;
}>) {
  assertCan(user, "admin:dashboard", tenant);

  const passwordHash = await hashPassword(input.password);
  const userId = crypto.randomUUID();
  const lowerUsername = input.username.toLowerCase();

  const result = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(users)
      .values({
        id: userId,
        username: lowerUsername,
        displayUsername: input.username,
        name: input.name,
        role: "INTERN",
        schoolId: null,
        xp: 0,
        level: 1,
        cefrLevel: "A1",
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

  const allProgress = moduleIds.length > 0
    ? await db
        .select()
        .from(codecampUserProgress)
        .where(inArray(codecampUserProgress.moduleId, moduleIds))
    : [];

  const allReviews = await db
    .select()
    .from(codecampPrReviews);

  return interns.map((intern) => {
    const internProgress = allProgress.filter((p) => p.userId === intern.id);
    const completedModules = new Set(
      internProgress.filter((p) => p.status === "completed").map((p) => p.moduleId)
    ).size;
    const quizScores = internProgress
      .filter((p) => p.score > 0)
      .map((p) => p.score);
    const quizAverage =
      quizScores.length > 0
        ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
        : 0;

    const internReviews = allReviews.filter((r) => r.userId === intern.id);
    const pending = internReviews.filter((r) => r.reviewStatus === "pending").length;
    const approved = internReviews.filter((r) => r.reviewStatus === "approved").length;

    const lastActive = internProgress.length > 0
      ? internProgress.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0].updatedAt
      : null;

    return {
      userId: intern.id,
      name: intern.name,
      username: intern.username,
      overallProgress: modules.length > 0 ? Math.round((completedModules / modules.length) * 100) : 0,
      completedModules,
      totalModules: modules.length,
      quizAverage,
      prReviewsPending: pending,
      prReviewsApproved: approved,
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

  if (!intern) {
    throw new Error("Intern not found");
  }

  const modules = await db
    .select()
    .from(codecampModules)
    .where(eq(codecampModules.status, "published"))
    .orderBy(codecampModules.order);

  const progress = await db
    .select()
    .from(codecampUserProgress)
    .where(eq(codecampUserProgress.userId, input.userId));

  const reviews = await db
    .select()
    .from(codecampPrReviews)
    .where(eq(codecampPrReviews.userId, input.userId))
    .orderBy(desc(codecampPrReviews.createdAt));

  const moduleBreakdown = modules.map((mod) => {
    const modProgress = progress.filter((p) => p.moduleId === mod.id);
    const completed = modProgress.filter((p) => p.status === "completed").length;
    const totalLessons = modProgress.length;
    const avgScore = modProgress.length > 0
      ? Math.round(modProgress.reduce((s, p) => s + p.score, 0) / modProgress.length)
      : 0;

    return {
      moduleId: mod.id,
      title: mod.title,
      completed,
      totalLessons,
      avgScore,
    };
  });

  return {
    userId: intern.id,
    name: intern.name,
    username: intern.username,
    moduleBreakdown,
    quizScores: progress.filter((p) => p.score > 0).map((p) => ({ lessonId: p.lessonId, score: p.score })),
    prReviews: reviews,
  };
}
