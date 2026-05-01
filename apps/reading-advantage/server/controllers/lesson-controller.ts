import { ExtendedNextRequest } from "./auth-controller";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    const lessonRecord = await prisma.lessonRecord.findUnique({
      where: {
        userId_articleId: {
          userId,
          articleId,
        },
      },
    });

    if (!lessonRecord) {
      return NextResponse.json({ currentPhase: 1, elapsedTime: 0 });
    }

    let currentPhase = 1;
    let elapsedTime = 0;

    // Check each phase to find the current one (status = 1)
    for (let phase = 1; phase <= 14; phase++) {
      const phaseKey = `phase${phase}` as keyof typeof lessonRecord;
      const phaseData = lessonRecord[phaseKey] as any;

      if (phaseData?.status === 1) {
        currentPhase = phase;
        // Get elapsed time from previous phase if available
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

    const existingLessonRecord = await prisma.lessonRecord.findUnique({
      where: {
        userId_articleId: {
          userId,
          articleId,
        },
      },
    });

    if (existingLessonRecord) {
      // If lesson record exists, update phase 1 as completed and phase 2 as current
      await prisma.lessonRecord.update({
        where: {
          userId_articleId: {
            userId,
            articleId,
          },
        },
        data: {
          phase1: { status: 2, elapsedTime: 0 }, // Phase 1 completed
          phase2: { status: 1, elapsedTime: 0 }, // Phase 2 current
        },
      });

      return NextResponse.json(
        {
          message:
            "Lesson started successfully! Phase 1 completed, moved to Phase 2.",
        },
        { status: 200 }
      );
    }

    // Create lesson status with initial phase configuration
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

    await prisma.$transaction(async (tx) => {
      // Create lesson record
      await tx.lessonRecord.create({
        data: {
          userId,
          articleId,
          ...lessonStatus,
        },
      });

      // Update assignment status if classroomId is provided
      const classroomId = req.nextUrl.searchParams.get("classroomId");

      if (classroomId) {
        // Check if assignment exists
        const assignment = await tx.assignment.findFirst({
          where: {
            classroomId,
            articleId,
          },
        });

        if (assignment) {
          // Check if student assignment exists
          const studentAssignment = await tx.studentAssignment.findFirst({
            where: {
              assignmentId: assignment.id,
              studentId: userId,
            },
          });

          if (studentAssignment) {
            // Update student assignment status to IN_PROGRESS and set startedAt
            await tx.studentAssignment.update({
              where: { id: studentAssignment.id },
              data: { 
                status: "IN_PROGRESS",
                startedAt: new Date(),
              },
            });
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

    await prisma.$transaction(async (tx) => {
      // Get current lesson record
      const lessonRecord = await tx.lessonRecord.findUnique({
        where: {
          userId_articleId: {
            userId,
            articleId,
          },
        },
      });

      if (!lessonRecord) {
        throw new Error("Lesson record not found");
      }

      // Prepare update data for current phase
      const phaseKey = `phase${phase}` as keyof typeof lessonRecord;
      const updateData: any = {};
      updateData[phaseKey] = { status, elapsedTime };

      // If phase < 14, set next phase to status 1 (in progress)
      if (phase < 14) {
        const nextPhaseKey = `phase${phase + 1}` as keyof typeof lessonRecord;
        updateData[nextPhaseKey] = { status: 1, elapsedTime: 0 };
      }

      // Update lesson record
      await tx.lessonRecord.update({
        where: {
          userId_articleId: {
            userId,
            articleId,
          },
        },
        data: updateData,
      });

      // Handle assignment completion if this is phase 13 and status is completed (2)
      const classroomId = req.nextUrl.searchParams.get("classroomId");

      if (classroomId && phase === 13 && status === 2) {
        // Find assignment
        const assignment = await tx.assignment.findFirst({
          where: {
            classroomId,
            articleId,
          },
        });

        if (assignment) {
          // Find student assignment and update status
          const studentAssignment = await tx.studentAssignment.findFirst({
            where: {
              assignmentId: assignment.id,
              studentId: userId,
            },
          });

          if (studentAssignment) {
            await tx.studentAssignment.update({
              where: { id: studentAssignment.id },
              data: { 
                status: "COMPLETED",
                completedAt: new Date(),
              },
            });
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

    // Find all UserActivities for MC and SA questions
    const allUserActivities = await prisma.userActivity.findMany({
      where: {
        userId,
        activityType: {
          in: ["MC_QUESTION", "SA_QUESTION"],
        },
        completed: true,
      },
      select: {
        id: true,
        activityType: true,
        details: true,
      },
    });

    // Filter activities based on articleId in details
    const userActivities = allUserActivities.filter((activity) => {
      const details = activity.details as any;
      return details?.articleId === cleanArticleId;
    });

    if (userActivities.length === 0) {
      return NextResponse.json({ message: "No Data Exists" }, { status: 404 });
    }

    // Get XP logs for these activities
    const activityIds = userActivities.map((a) => a.id);
    const allXPLogs = await prisma.xPLog.findMany({
      where: {
        userId,
        activityId: { in: activityIds },
        activityType: { in: ["MC_QUESTION", "SA_QUESTION"] },
      },
    });

    const mcqLogs = allXPLogs.filter(
      (log) => log.activityType === "MC_QUESTION"
    );
    const saqLogs = allXPLogs.filter(
      (log) => log.activityType === "SA_QUESTION"
    );

    // MCQ: Count correct answers based on XP earned (1 XP = 1 correct answer)
    const mcqCorrectCount = mcqLogs.reduce(
      (total, log) => total + (log.xpEarned > 0 ? 1 : 0),
      0
    );

    // SAQ: Use total XP score as before
    const saqScore = saqLogs.reduce((total, log) => total + log.xpEarned, 0);

    return NextResponse.json(
      {
        mcqScore: mcqCorrectCount, // Count of correct MCQ answers
        saqScore: saqScore, // Sum of SAQ XP scores
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

    // Get all UserWordRecords for this specific article and user
    const userWordRecords = await prisma.userWordRecord.findMany({
      where: {
        userId: userId,
        articleId: articleId,
        saveToFlashcard: true, // Only words saved to flashcard
      },
      orderBy: {
        createdAt: 'asc', // Order by when they were added
      },
    });

    // Transform to flashcard format with FSRS data
    const flashcards = userWordRecords.map((record) => {
      const wordData = record.word as any; // JSON field containing vocabulary data
      
      return {
        id: record.id,
        word: {
          vocabulary: wordData.vocabulary || wordData.word || '',
          definition: wordData.definition || {},
          startTime: wordData.startTime || 0,
          endTime: wordData.endTime || 0,
          audioUrl: wordData.audioUrl || null,
        },
        articleId: articleId,
        // FSRS card data
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

    // Update the UserWordRecord with new FSRS data
    const updatedRecord = await prisma.userWordRecord.update({
      where: {
        id: wordId,
        userId: userId, // Ensure user can only update their own records
      },
      data: {
        due: due ? new Date(due) : undefined,
        stability: stability ?? undefined,
        difficulty: difficulty ?? undefined,
        elapsedDays: elapsed_days ?? undefined,
        scheduledDays: scheduled_days ?? undefined,
        reps: reps ?? undefined,
        lapses: lapses ?? undefined,
        state: state ?? undefined,
        updatedAt: new Date(),
      },
    });

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

    // Delete or mark as not for flashcard
    await prisma.userWordRecord.update({
      where: {
        id: wordId,
        userId: userId, // Ensure user can only delete their own records
      },
      data: {
        saveToFlashcard: false,
        updatedAt: new Date(),
      },
    });

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

    // Check if user has already completed this lesson sentence flashcard activity
    const existingActivity = await prisma.userActivity.findFirst({
      where: {
        userId: userId,
        activityType: "LESSON_SENTENCE_FLASHCARDS",
        targetId: articleId,
        completed: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // If activity is already completed, get XP logs for this activity
    if (existingActivity) {
      const xpLogs = await prisma.xPLog.findMany({
        where: {
          userId: userId,
          activityId: existingActivity.id,
        },
      });

      const totalXpEarned = xpLogs.reduce((sum, log) => sum + (log.xpEarned || 0), 0);
      
      // Get timeTaken from timer field or from details if timer is null
      const timeTaken = existingActivity.timer || 
        (existingActivity.details && typeof existingActivity.details === 'object' && 
         'timeTaken' in existingActivity.details ? 
         (existingActivity.details as any).timeTaken : 0);

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

    // Get all UserSentenceRecords for this specific article and user
    const userSentenceRecords = await prisma.userSentenceRecord.findMany({
      where: {
        userId: userId,
        articleId: articleId,
        saveToFlashcard: true, // Only sentences saved to flashcard
      },
      orderBy: {
        createdAt: 'asc', // Order by when they were added
      },
    });

    // Transform to flashcard format with FSRS data
    const flashcards = userSentenceRecords.map((record) => {
      return {
        id: record.id,
        sentence: record.sentence,
        translation: record.translation,
        sn: record.sn,
        timepoint: record.timepoint,
        endTimepoint: record.endTimepoint,
        audioUrl: record.audioUrl,
        articleId: articleId,
        // FSRS card data
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
      };
    });

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

    // Update the UserSentenceRecord with new FSRS data
    const updatedRecord = await prisma.userSentenceRecord.update({
      where: {
        id: sentenceId,
        userId: userId, // Ensure user can only update their own records
      },
      data: {
        due: due ? new Date(due) : undefined,
        stability: stability ?? undefined,
        difficulty: difficulty ?? undefined,
        elapsedDays: elapsed_days ?? undefined,
        scheduledDays: scheduled_days ?? undefined,
        reps: reps ?? undefined,
        lapses: lapses ?? undefined,
        state: state ?? undefined,
        updatedAt: new Date(),
      },
    });

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

    // Delete or mark as not for flashcard
    await prisma.userSentenceRecord.update({
      where: {
        id: sentenceId,
        userId: userId, // Ensure user can only delete their own records
      },
      data: {
        saveToFlashcard: false,
        updatedAt: new Date(),
      },
    });

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
