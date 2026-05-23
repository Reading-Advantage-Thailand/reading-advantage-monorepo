import { ExtendedNextRequest } from "./auth-controller";
import { NextRequest, NextResponse } from "next/server";
import { db, eq, and, asc, desc, inArray } from "@reading-advantage/db";
import {
  lessonRecords,
  userActivity,
  userWordRecords,
  userSentenceRecords,
  xpLogs,
  assignments,
  studentAssignments,
} from "@reading-advantage/db/schema";

export interface Context {
  params: Promise<{
    userId: string;
  }>;
}

export async function getLessonStatus(
  req: NextRequest,
  ctx: Context
) {
  const { userId } = await ctx.params;
  try {
    const articleId = req.nextUrl.searchParams.get("articleId");

    if (!articleId) {
      throw new Error("articleId is required");
    }

    const [lessonRecord] = await db
      .select()
      .from(lessonRecords)
      .where(
        and(
          eq(lessonRecords.userId, userId),
          eq(lessonRecords.articleId, articleId)
        )
      )
      .limit(1);

    if (!lessonRecord) {
      return NextResponse.json({ currentPhase: 1, elapsedTime: 0 });
    }

    let currentPhase = 1;
    let elapsedTime = 0;

    for (let phase = 1; phase <= 14; phase++) {
      const phaseKey = `phase${phase}` as keyof typeof lessonRecord;
      const phaseData = lessonRecord[phaseKey] as any;

      if (phaseData?.status === 1) {
        currentPhase = phase;
        if (phase > 1) {
          const prevPhaseKey = `phase${phase - 1}` as keyof typeof lessonRecord;
          const prevPhaseData = lessonRecord[prevPhaseKey] as any;
          elapsedTime = prevPhaseData?.elapsedTime || 0;
        }
        break;
      }
    }

    return NextResponse.json({ currentPhase, elapsedTime });
  } catch (error) {
    console.error("Error getting documents", error);
    return NextResponse.json(
      { message: "Internal server error", results: [] },
      { status: 500 }
    );
  }
}

export async function postLessonStatus(
  req: NextRequest,
  ctx: Context
) {
  const { userId } = await ctx.params;
  try {
    const articleId = req.nextUrl.searchParams.get("articleId");

    if (!articleId) {
      throw new Error("articleId is required");
    }

    const [existingLessonRecord] = await db
      .select({ id: lessonRecords.id })
      .from(lessonRecords)
      .where(
        and(
          eq(lessonRecords.userId, userId),
          eq(lessonRecords.articleId, articleId)
        )
      )
      .limit(1);

    if (existingLessonRecord) {
      await db
        .update(lessonRecords)
        .set({
          phase1: { status: 2, elapsedTime: 0 },
          phase2: { status: 1, elapsedTime: 0 },
        })
        .where(
          and(
            eq(lessonRecords.userId, userId),
            eq(lessonRecords.articleId, articleId)
          )
        );

      return NextResponse.json(
        {
          message:
            "Lesson started successfully! Phase 1 completed, moved to Phase 2.",
        },
        { status: 200 }
      );
    }

    const lessonStatus = {
      phase1: { status: 2, elapsedTime: 0 },
      phase2: { status: 0, elapsedTime: 0 },
      phase3: { status: 0, elapsedTime: 0 },
      phase4: { status: 0, elapsedTime: 0 },
      phase5: { status: 0, elapsedTime: 0 },
      phase6: { status: 0, elapsedTime: 0 },
      phase7: { status: 0, elapsedTime: 0 },
      phase8: { status: 0, elapsedTime: 0 },
      phase9: { status: 0, elapsedTime: 0 },
      phase10: { status: 0, elapsedTime: 0 },
      phase11: { status: 0, elapsedTime: 0 },
      phase12: { status: 0, elapsedTime: 0 },
      phase13: { status: 0, elapsedTime: 0 },
      phase14: { status: 0, elapsedTime: 0 },
    };

    await db.transaction(async (tx) => {
      await tx.insert(lessonRecords).values({
        userId,
        articleId,
        ...lessonStatus,
      });

      const classroomId = req.nextUrl.searchParams.get("classroomId");

      if (classroomId) {
        const [assignment] = await tx
          .select({ id: assignments.id })
          .from(assignments)
          .where(
            and(
              eq(assignments.classroomId, classroomId),
              eq(assignments.articleId, articleId)
            )
          )
          .limit(1);

        if (assignment) {
          const [studentAssignment] = await tx
            .select({ id: studentAssignments.id })
            .from(studentAssignments)
            .where(
              and(
                eq(studentAssignments.assignmentId, assignment.id),
                eq(studentAssignments.studentId, userId)
              )
            )
            .limit(1);

          if (studentAssignment) {
            await tx
              .update(studentAssignments)
              .set({
                status: "IN_PROGRESS",
                startedAt: new Date(),
              })
              .where(eq(studentAssignments.id, studentAssignment.id));
          }
        }
      }
    });

    return NextResponse.json(
      { message: "Create lesson phase status success!" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error creating lesson status", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function putLessonPhaseStatus(
  req: NextRequest,
  ctx: Context
) {
  const { userId } = await ctx.params;
  try {
    const articleId = req.nextUrl.searchParams.get("articleId");
    const { phase, status, elapsedTime } = await req.json();

    if (!articleId || !phase) {
      return NextResponse.json(
        { message: "articleId and phase are required" },
        { status: 400 }
      );
    }

    await db.transaction(async (tx) => {
      const [lessonRecord] = await tx
        .select()
        .from(lessonRecords)
        .where(
          and(
            eq(lessonRecords.userId, userId),
            eq(lessonRecords.articleId, articleId)
          )
        )
        .limit(1);

      if (!lessonRecord) {
        throw new Error("Lesson record not found");
      }

      const updateData: any = {};
      updateData[`phase${phase}`] = { status, elapsedTime };

      if (phase < 14) {
        updateData[`phase${phase + 1}`] = { status: 1, elapsedTime: 0 };
      }

      await tx
        .update(lessonRecords)
        .set(updateData)
        .where(
          and(
            eq(lessonRecords.userId, userId),
            eq(lessonRecords.articleId, articleId)
          )
        );

      const classroomId = req.nextUrl.searchParams.get("classroomId");

      if (classroomId && phase === 13 && status === 2) {
        const [assignment] = await tx
          .select({ id: assignments.id })
          .from(assignments)
          .where(
            and(
              eq(assignments.classroomId, classroomId),
              eq(assignments.articleId, articleId)
            )
          )
          .limit(1);

        if (assignment) {
          const [studentAssignment] = await tx
            .select({ id: studentAssignments.id })
            .from(studentAssignments)
            .where(
              and(
                eq(studentAssignments.assignmentId, assignment.id),
                eq(studentAssignments.studentId, userId)
              )
            )
            .limit(1);

          if (studentAssignment) {
            await tx
              .update(studentAssignments)
              .set({
                status: "COMPLETED",
                completedAt: new Date(),
              })
              .where(eq(studentAssignments.id, studentAssignment.id));
          }
        }
      }
    });

    return NextResponse.json({ message: "Update successful" }, { status: 200 });
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function getUserQuizPerformance(
  req: NextRequest,
  ctx: Context
) {
  const { userId } = await ctx.params;
  try {
    const articleId = req.nextUrl.searchParams.get("articleId");

    if (!articleId) {
      return NextResponse.json(
        { message: "articleId is required" },
        { status: 400 }
      );
    }

    const decodedArticleId = decodeURIComponent(articleId);
    const cleanArticleId = decodedArticleId.split("/")[0];

    const allUserActivities = await db
      .select({
        id: userActivity.id,
        activityType: userActivity.activityType,
        details: userActivity.details,
      })
      .from(userActivity)
      .where(
        and(
          eq(userActivity.userId, userId),
          inArray(userActivity.activityType, ["MC_QUESTION", "SA_QUESTION"]),
          eq(userActivity.completed, true)
        )
      );

    const filteredActivities = allUserActivities.filter((activity) => {
      const details = activity.details as any;
      return details?.articleId === cleanArticleId;
    });

    if (filteredActivities.length === 0) {
      return NextResponse.json({ message: "No Data Exists" }, { status: 404 });
    }

    const activityIds = filteredActivities.map((a) => a.id);
    const allXPLogs = await db
      .select()
      .from(xpLogs)
      .where(
        and(
          eq(xpLogs.userId, userId),
          inArray(xpLogs.activityId, activityIds),
          inArray(xpLogs.activityType, ["MC_QUESTION", "SA_QUESTION"])
        )
      );

    const mcqLogs = allXPLogs.filter((log) => log.activityType === "MC_QUESTION");
    const saqLogs = allXPLogs.filter((log) => log.activityType === "SA_QUESTION");

    const mcqCorrectCount = mcqLogs.reduce(
      (total, log) => total + (log.xpEarned > 0 ? 1 : 0),
      0
    );

    const saqScore = saqLogs.reduce((total, log) => total + log.xpEarned, 0);

    return NextResponse.json(
      {
        mcqScore: mcqCorrectCount,
        saqScore: saqScore,
        mcqCount: mcqLogs.length,
        saqCount: saqLogs.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error getting quiz performance", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

interface LessonWordsContext {
  params: Promise<{
    articleId: string;
  }>;
}

export async function getLessonWords(
  req: NextRequest,
  ctx: LessonWordsContext
) {
  const { articleId } = await ctx.params;
  try {
    const extReq = req as ExtendedNextRequest;
    const userId = extReq.session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    if (!articleId) {
      return NextResponse.json(
        { message: "Article ID is required" },
        { status: 400 }
      );
    }

    const wordRecords = await db
      .select()
      .from(userWordRecords)
      .where(
        and(
          eq(userWordRecords.userId, userId),
          eq(userWordRecords.articleId, articleId),
          eq(userWordRecords.saveToFlashcard, true)
        )
      )
      .orderBy(asc(userWordRecords.createdAt));

    const flashcards = wordRecords.map((record) => {
      const wordData = record.word as any;

      return {
        id: record.id,
        word: {
          vocabulary: wordData.vocabulary || wordData.word || "",
          definition: wordData.definition || {},
          startTime: wordData.startTime || 0,
          endTime: wordData.endTime || 0,
          audioUrl: wordData.audioUrl || null,
        },
        articleId: articleId,
        due: record.due,
        stability: record.stability,
        difficulty: record.difficulty,
        elapsed_days: record.elapsedDays,
        scheduled_days: record.scheduledDays,
        reps: record.reps,
        lapses: record.lapses,
        state: record.state,
        last_review: record.updatedAt,
      };
    });

    return NextResponse.json({
      flashcards,
      total: flashcards.length,
      message: "Lesson words retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting lesson words:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function updateLessonWord(
  req: NextRequest,
  ctx: { params: Promise<{ wordId: string }> }
) {
  const { wordId } = await ctx.params;
  try {
    const extReq = req as ExtendedNextRequest;
    const userId = extReq.session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    if (!wordId) {
      return NextResponse.json(
        { message: "Word ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      due,
      stability,
      difficulty,
      elapsed_days,
      scheduled_days,
      reps,
      lapses,
      state,
    } = body;

    const updateValues: any = { updatedAt: new Date() };
    if (due !== undefined) updateValues.due = new Date(due);
    if (stability !== undefined && stability !== null) updateValues.stability = stability;
    if (difficulty !== undefined && difficulty !== null) updateValues.difficulty = difficulty;
    if (elapsed_days !== undefined && elapsed_days !== null) updateValues.elapsedDays = elapsed_days;
    if (scheduled_days !== undefined && scheduled_days !== null) updateValues.scheduledDays = scheduled_days;
    if (reps !== undefined && reps !== null) updateValues.reps = reps;
    if (lapses !== undefined && lapses !== null) updateValues.lapses = lapses;
    if (state !== undefined && state !== null) updateValues.state = state;

    const [updatedRecord] = await db
      .update(userWordRecords)
      .set(updateValues)
      .where(
        and(
          eq(userWordRecords.id, wordId),
          eq(userWordRecords.userId, userId)
        )
      )
      .returning();

    return NextResponse.json({
      success: true,
      record: updatedRecord,
      message: "Word record updated successfully",
    });
  } catch (error) {
    console.error("Error updating lesson word:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function deleteLessonWord(
  req: NextRequest,
  ctx: { params: Promise<{ wordId: string }> }
) {
  const { wordId } = await ctx.params;
  try {
    const extReq = req as ExtendedNextRequest;
    const userId = extReq.session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    if (!wordId) {
      return NextResponse.json(
        { message: "Word ID is required" },
        { status: 400 }
      );
    }

    await db
      .update(userWordRecords)
      .set({ saveToFlashcard: false, updatedAt: new Date() })
      .where(
        and(
          eq(userWordRecords.id, wordId),
          eq(userWordRecords.userId, userId)
        )
      );

    return NextResponse.json({
      success: true,
      message: "Word removed from flashcards",
    });
  } catch (error) {
    console.error("Error deleting lesson word:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

interface LessonSentencesContext {
  params: Promise<{
    articleId: string;
  }>;
}

export async function getLessonSentences(
  req: NextRequest,
  ctx: LessonSentencesContext
) {
  const { articleId } = await ctx.params;
  try {
    const extReq = req as ExtendedNextRequest;
    const userId = extReq.session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    if (!articleId) {
      return NextResponse.json(
        { message: "Article ID is required" },
        { status: 400 }
      );
    }

    const [existingActivity] = await db
      .select()
      .from(userActivity)
      .where(
        and(
          eq(userActivity.userId, userId),
          eq(userActivity.activityType, "LESSON_SENTENCE_FLASHCARDS"),
          eq(userActivity.targetId, articleId),
          eq(userActivity.completed, true)
        )
      )
      .orderBy(desc(userActivity.createdAt))
      .limit(1);

    if (existingActivity) {
      const xpLogRows = await db
        .select()
        .from(xpLogs)
        .where(
          and(
            eq(xpLogs.userId, userId),
            eq(xpLogs.activityId, existingActivity.id)
          )
        );

      const totalXpEarned = xpLogRows.reduce(
        (sum, log) => sum + (log.xpEarned || 0),
        0
      );

      const timeTaken =
        existingActivity.timer ||
        (existingActivity.details &&
          typeof existingActivity.details === "object" &&
          "timeTaken" in existingActivity.details
          ? (existingActivity.details as any).timeTaken
          : 0);

      const completionData = {
        isCompleted: true,
        completionDate: existingActivity.createdAt,
        xpEarned: totalXpEarned,
        timeTaken: timeTaken,
        details: existingActivity.details || {},
      };

      return NextResponse.json({
        flashcards: [],
        total: 0,
        isCompleted: true,
        completionData,
        message: "Lesson sentence flashcards already completed",
      });
    }

    const sentenceRecords = await db
      .select()
      .from(userSentenceRecords)
      .where(
        and(
          eq(userSentenceRecords.userId, userId),
          eq(userSentenceRecords.articleId, articleId),
          eq(userSentenceRecords.saveToFlashcard, true)
        )
      )
      .orderBy(asc(userSentenceRecords.createdAt));

    const flashcards = sentenceRecords.map((record) => ({
      id: record.id,
      sentence: record.sentence,
      translation: record.translation,
      sn: record.sn,
      timepoint: record.timepoint,
      endTimepoint: record.endTimepoint,
      audioUrl: record.audioUrl,
      articleId: articleId,
      due: record.due,
      stability: record.stability,
      difficulty: record.difficulty,
      elapsed_days: record.elapsedDays,
      scheduled_days: record.scheduledDays,
      reps: record.reps,
      lapses: record.lapses,
      state: record.state,
      last_review: record.updatedAt,
      updateScore: record.updateScore,
    }));

    return NextResponse.json({
      flashcards,
      total: flashcards.length,
      isCompleted: false,
      message: "Lesson sentences retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting lesson sentences:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function updateLessonSentence(
  req: NextRequest,
  ctx: { params: Promise<{ sentenceId: string }> }
) {
  const { sentenceId } = await ctx.params;
  try {
    const extReq = req as ExtendedNextRequest;
    const userId = extReq.session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    if (!sentenceId) {
      return NextResponse.json(
        { message: "Sentence ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      due,
      stability,
      difficulty,
      elapsed_days,
      scheduled_days,
      reps,
      lapses,
      state,
    } = body;

    const updateValues: any = { updatedAt: new Date() };
    if (due !== undefined) updateValues.due = new Date(due);
    if (stability !== undefined && stability !== null) updateValues.stability = stability;
    if (difficulty !== undefined && difficulty !== null) updateValues.difficulty = difficulty;
    if (elapsed_days !== undefined && elapsed_days !== null) updateValues.elapsedDays = elapsed_days;
    if (scheduled_days !== undefined && scheduled_days !== null) updateValues.scheduledDays = scheduled_days;
    if (reps !== undefined && reps !== null) updateValues.reps = reps;
    if (lapses !== undefined && lapses !== null) updateValues.lapses = lapses;
    if (state !== undefined && state !== null) updateValues.state = state;

    const [updatedRecord] = await db
      .update(userSentenceRecords)
      .set(updateValues)
      .where(
        and(
          eq(userSentenceRecords.id, sentenceId),
          eq(userSentenceRecords.userId, userId)
        )
      )
      .returning();

    return NextResponse.json({
      success: true,
      record: updatedRecord,
      message: "Sentence record updated successfully",
    });
  } catch (error) {
    console.error("Error updating lesson sentence:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function deleteLessonSentence(
  req: NextRequest,
  ctx: { params: Promise<{ sentenceId: string }> }
) {
  const { sentenceId } = await ctx.params;
  try {
    const extReq = req as ExtendedNextRequest;
    const userId = extReq.session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    if (!sentenceId) {
      return NextResponse.json(
        { message: "Sentence ID is required" },
        { status: 400 }
      );
    }

    await db
      .update(userSentenceRecords)
      .set({ saveToFlashcard: false, updatedAt: new Date() })
      .where(
        and(
          eq(userSentenceRecords.id, sentenceId),
          eq(userSentenceRecords.userId, userId)
        )
      );

    return NextResponse.json({
      success: true,
      message: "Sentence removed from flashcards",
    });
  } catch (error) {
    console.error("Error deleting lesson sentence:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
