import { eq, and, desc, sql } from "drizzle-orm";
import {
  codecampModules,
  codecampLessons,
  codecampExercises,
  codecampQuizQuestions,
  codecampUserProgress,
  codecampChatConversations,
  codecampChatMessages,
} from "@reading-advantage/db/schema";
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

  const lessons = await db
    .select()
    .from(codecampLessons)
    .orderBy(codecampLessons.order);

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
      ...q,
      options: (q.optionsJson as string[]) || [],
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
  const completedAt = input.status === "completed" ? now : null;

  const [result] = await db
    .insert(codecampUserProgress)
    .values({
      userId: user.id,
      moduleId: lesson.moduleId,
      lessonId: input.lessonId,
      status: input.status ?? "not_started",
      score: input.score ?? 0,
      completedAt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [codecampUserProgress.userId, codecampUserProgress.lessonId],
      set: {
        status: input.status !== undefined ? input.status : sql`${codecampUserProgress.status}`,
        score: input.score !== undefined ? input.score : sql`${codecampUserProgress.score}`,
        completedAt: input.status !== undefined ? completedAt : sql`${codecampUserProgress.completedAt}`,
        updatedAt: now,
      },
    })
    .returning();

  return result;
}

// ─── Dashboard ────────────────────────────────────────────

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
    modules,
    totalLessons,
    completedLessons,
    overallProgress,
    recentConversations: conversations,
  };
}
