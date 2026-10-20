"use server";

import type { EvidenceMode, QuestionAnswer } from "@reading-advantage/domain/primary-mastery";
import { enqueuePrimaryEvidenceJob } from "@/lib/primary-evidence-queue";
import {
  db,
  eq,
  and,
} from '@reading-advantage/db';
import {
  userActivity,
  articleActivityLogs,
} from '@reading-advantage/db';
import { currentUser } from "@/lib/session";
import { guardStudentAction } from "@/lib/student-view";
import { resolveQuestionXpAward } from "@/lib/authorization";
import { awardQuestionXp } from "@/server/xp/award-question-xp";
import { getLaqFeedback, getSaqFeedback } from "@/server/utils/assistant";
import { ActivityType } from "@/types/enum";

export async function retakeQuiz(articleId: string, type: ActivityType) {
  try {
    const user = await currentUser();

    if (!user) {
      return { error: "User not found" };
    }

    const preview = guardStudentAction(user, "retake_quiz");
    if (preview) return preview;

    const [userActivityRow] = await db.select({ id: userActivity.id })
      .from(userActivity)
      .where(
        and(
          eq(userActivity.targetId, articleId),
          eq(userActivity.activityType, type),
          eq(userActivity.userId, user.id as string),
        ),
      )
      .limit(1);

    if (!userActivityRow) {
      return { error: "User activity not found" };
    }

    const deletedRows = await db.delete(userActivity)
      .where(eq(userActivity.id, userActivityRow.id))
      .returning();

    if (!deletedRows.length) {
      return { error: "Failed to delete user activity" };
    }

    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Failed to retake quiz" };
  }
}

export async function finishQuiz(
  articleId: string,
  data: {
    question?: string;
    suggestedAnswer?: string;
    feedback?: string;
    yourAnswer?: string;
    score?: number;
    responses?: string[];
    timer?: number;
    /** The evidence keys (track primary_mastery_evidence_20261006): one entry per answered question. */
    questions?: QuestionAnswer[];
    mode?: EvidenceMode;
    hintUsed?: boolean;
    audioPlayed?: boolean;
  },
  type: ActivityType,
) {
  const user = await currentUser();

  if (!user) {
    return { error: "User not found" };
  }

  const preview = guardStudentAction(user, "finish_quiz");
  if (preview) return preview;

  // The award is derived server-side from the submission; callers cannot set XP.
  const xpEarned = resolveQuestionXpAward(type, data);

  let isCompleted = {};

  // Mark the completed question type on the article activity log.
  switch (type) {
    case ActivityType.SA_QUESTION:
      isCompleted = { isShortAnswerQuestionCompleted: true };
      break;
    case ActivityType.LA_QUESTION:
      isCompleted = { isLongAnswerQuestionCompleted: true };
      break;
    case ActivityType.MC_QUESTION:
      isCompleted = { isMultipleChoiceQuestionCompleted: true };
      break;
    default:
      isCompleted = {};
  }

  const details = {
    question: data.question,
    suggestedAnswer: data.suggestedAnswer,
    feedback: data.feedback as string,
    yourAnswer: data.yourAnswer,
    score: data.score,
    responses: data.responses,
    // The evidence keys ride beside the legacy ones; the evidence job reads them.
    ...(data.questions ? { questions: data.questions, mode: data.mode ?? "independent", hintUsed: data.hintUsed, audioPlayed: data.audioPlayed } : {}),
  };

  // One transaction: the activity row, the article log, the XP log, the GP grant, and the user XP.
  const changedRowId = await db.transaction(async (tx) => {
    const saved = await awardQuestionXp(tx, {
      userId: user.id as string,
      schoolId: user.schoolId ?? null,
      activityType: type,
      targetId: articleId,
      timer: data.timer,
      details,
      xpEarned,
    });
    if (!saved) return null;

    // Already complete (a double click): success, with no second XP log and no XP.
    if (saved.status !== "saved") return undefined;

    const [activityLog] = await tx.select({ id: articleActivityLogs.id })
      .from(articleActivityLogs)
      .where(
        and(
          eq(articleActivityLogs.articleId, articleId as string),
          eq(articleActivityLogs.userId, user.id as string),
        ),
      )
      .limit(1);

    if (activityLog) {
      await tx.update(articleActivityLogs)
        .set({ ...isCompleted })
        .where(eq(articleActivityLogs.id, activityLog.id));
    } else {
      await tx.insert(articleActivityLogs).values({
        articleId: articleId as string,
        userId: user.id as string,
        ...isCompleted,
      });
    }

    return saved.activityId;
  });

  if (changedRowId === null) {
    return { error: "User not found" };
  }

  // Off the request path: the worker resolves the objectives and commits the evidence.
  // Only a changed row needs it.
  if (changedRowId) {
    await enqueuePrimaryEvidenceJob({ sourceTable: "user_activity", rowId: changedRowId }, user.schoolId);
  }

  return { success: true };
}

export async function getFeedback(value: {
  data: {
    articleId: string;
    question: string;
    answer: string;
    suggestedResponse?: string;
    preferredLanguage: string;
  };
  activityType: ActivityType;
}) {
  const user = await currentUser();

  if (!user) {
    return { error: "User not found" };
  }

  if (value.activityType === ActivityType.LA_QUESTION) {
    const feedback = await getLaqFeedback(value);
    return feedback;
  }

  if (value.activityType === ActivityType.SA_QUESTION) {
    const feedback = await getSaqFeedback(value);
    return feedback;
  }
}