import {
  AnswerStatus,
  QuestionState,
} from "@/components/models/questions-model";
import { UserXpEarned } from "@/components/models/user-activity-log-model";
import { db, and, asc, count, eq, inArray, like, or, sql } from "@reading-advantage/db";
import {
  chapters,
  longAnswerQuestions,
  multipleChoiceQuestions,
  shortAnswerQuestions,
  stories,
  storyRecords,
  userActivity,
  users,
  xpLogs,
} from "@reading-advantage/db/schema";
import { NextResponse } from "next/server";
import { getFeedbackWritter } from "./assistant-controller";
import { generateMCQuestion } from "../utils/generators/mc-question-generator";
import { ExtendedNextRequest } from "./auth-controller";
import { ActivityType } from "@/lib/enums";
import { generateSAQuestion } from "../utils/generators/sa-question-generator";
import { generateLAQuestion } from "../utils/generators/la-question-generator";
import { ArticleBaseCefrLevel, ArticleType } from "../models/enum";

interface RequestContext {
  params: Promise<{
    storyId: string;
    chapterNumber: string;
    questionNumber?: string;
  }>;
}

interface SubRequestContext {
  params: Promise<{
    storyId: string;
    chapterNumber: string;
    questionNumber: string;
  }>;
}

interface Heatmap {
  [date: string]: {
    read: number;
    completed: number;
  };
}

interface MCQRecord {
  question_number: number;
  question: string;
  type: "MCQ";
  options: string[];
  answer: string;
  textual_evidence: string;
  correct_answer: string;
  chapter_number: string;
  id: string;
}

interface SARecord {
  id: string;
  chapter_number: string;
  question_number: number;
  question: string;
  type: "SAQ";
  suggested_answer: string;
}

export interface LARecord {
  id: string;
  question: string;
  chapter_number: string;
  question_number: number;
  chapterNumber: string;
  type: "LAQ";
}

async function loadStoryAndChapter(storyId: string, chapterNumber: string) {
  const [story] = await db
    .select()
    .from(stories)
    .where(eq(stories.id, storyId))
    .limit(1);
  if (!story) return { story: null, chapter: null } as const;
  const [chapter] = await db
    .select()
    .from(chapters)
    .where(
      and(
        eq(chapters.storyId, storyId),
        eq(chapters.chapterNumber, parseInt(chapterNumber, 10))
      )
    )
    .limit(1);
  return { story, chapter: chapter ?? null } as const;
}

export async function getStoryMCQuestions(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  const { storyId, chapterNumber } = await ctx.params;
  try {
    if (!storyId || typeof storyId !== "string") {
      return NextResponse.json({ message: "Invalid storyId" }, { status: 400 });
    }

    if (!req.session?.user?.id || typeof req.session.user.id !== "string") {
      return NextResponse.json(
        { message: "User not authenticated" },
        { status: 401 }
      );
    }

    const userId = req.session.user.id;

    const { story, chapter } = await loadStoryAndChapter(storyId, chapterNumber);

    if (!story) {
      return NextResponse.json({ message: "Story not found" }, { status: 404 });
    }
    if (!chapter) {
      return NextResponse.json(
        { message: "Chapter not found" },
        { status: 404 }
      );
    }

    let questions = await db
      .select()
      .from(multipleChoiceQuestions)
      .where(eq(multipleChoiceQuestions.chapterId, chapter.id));

    if (questions.length === 0) {
      // Generate questions as fallback
      const cefrlevel = story.cefrLevel?.replace(/[+-]/g, "") as any;
      const generateMCQ = await generateMCQuestion({
        cefrlevel: cefrlevel,
        type: story.type as any,
        passage: chapter.passage || "",
        title: story.title || "",
        summary: story.summary || "",
        imageDesc: story.imageDescription || "",
      });

      const questionsToCreate = generateMCQ.questions.slice(0, 5);

      for (const question of questionsToCreate) {
        await db.insert(multipleChoiceQuestions).values({
          chapterId: chapter.id,
          question: question.question,
          options: [
            question.correct_answer,
            question.distractor_1,
            question.distractor_2,
            question.distractor_3,
          ],
          correctAnswer: 0,
          answer: question.correct_answer || "",
          textualEvidence: question.textual_evidence || "",
        });
      }

      questions = await db
        .select()
        .from(multipleChoiceQuestions)
        .where(eq(multipleChoiceQuestions.chapterId, chapter.id));
    }

    const questionsMapped = questions.map((q, index) => ({
      ...q,
      chapter_number: chapterNumber,
      question_number: index + 1,
      id: q.id,
      textual_evidence: q.textualEvidence,
    }));

    // Get user activities for MC questions (broad lookup)
    const userActivities = await db
      .select()
      .from(userActivity)
      .where(
        and(
          eq(userActivity.userId, userId),
          eq(userActivity.activityType, ActivityType.MC_QUESTION)
        )
      );

    // Filter to activities for this specific story chapter
    const chapterActivities = userActivities.filter((activity) => {
      let details = activity.details as any;
      if (typeof details === "string") {
        try {
          details = JSON.parse(details);
        } catch (e) {}
      }
      return (
        details?.storyId === storyId &&
        (details?.chapterNumber === parseInt(chapterNumber) ||
          details?.chapter_number === parseInt(chapterNumber))
      );
    });

    // Get XP logs for these chapter activities
    const activityIds = chapterActivities.map((activity) => activity.id);
    const fetchedXpLogs = activityIds.length
      ? await db
          .select()
          .from(xpLogs)
          .where(
            and(
              inArray(xpLogs.activityId, activityIds),
              eq(xpLogs.activityType, ActivityType.MC_QUESTION)
            )
          )
      : [];

    const xpLogMap = new Map(fetchedXpLogs.map((log) => [log.activityId, log]));

    const progress: AnswerStatus[] = [];
    const answeredQuestionIds = new Set();
    const questionData = new Map();

    const sortedActivities = chapterActivities.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    sortedActivities.forEach((activity) => {
      let details = activity.details as any;
      if (typeof details === 'string') {
        try {
          details = JSON.parse(details);
        } catch (e) {}
      }

      const qId = details?.questionId || activity.targetId;
      if (qId) {
        answeredQuestionIds.add(qId);

        const isCorrect = details?.isCorrect ?? false;
        const xpLog = xpLogMap.get(activity.id);
        questionData.set(qId, {
          timer: activity.timer,
          xpEarned: xpLog?.xpEarned || 0,
          selectedAnswer: details?.selectedAnswer,
          correctAnswer: details?.correctAnswer,
          textualEvidence: details?.textualEvidence,
          createdAt: activity.createdAt,
        });

        progress.push(
          isCorrect ? AnswerStatus.CORRECT : AnswerStatus.INCORRECT
        );
      }
    });

    // Fill remaining slots with UNANSWERED
    while (progress.length < 5) {
      progress.push(AnswerStatus.UNANSWERED);
    }

    const currentQuestionIndex = progress.findIndex(
      (p) => p === AnswerStatus.UNANSWERED
    );

    // If there are no UNANSWERED slots, the quiz is completed
    if (currentQuestionIndex === -1) {
      const responseData = {
        state: QuestionState.COMPLETED,
        total: 5,
        progress,
        results: [],
        summary: {
          totalXpEarned: Array.from(questionData.values()).reduce((sum, d) => sum + (d.xpEarned || 0), 0),
          totalTimer: Array.from(questionData.values()).reduce((sum, d) => sum + (d.timer || 0), 0),
          correctAnswers: progress.filter((p) => p === AnswerStatus.CORRECT).length,
          incorrectAnswers: progress.filter((p) => p === AnswerStatus.INCORRECT).length,
        },
      };

      return NextResponse.json(responseData, { status: 200 });
    }

    // Identify answered and unanswered questions for the pool setup
    const answeredQuestions = questions.filter(q => answeredQuestionIds.has(q.id));
    const unansweredFromPool = questions.filter(q => !answeredQuestionIds.has(q.id));

    // Stable shuffle for other questions using a simple hash
    const getSeed = (id: string) => {
      let hash = 0;
      const str = userId + storyId + chapterNumber + id;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      return hash;
    };

    const shuffledUnanswered = unansweredFromPool.sort((a, b) => getSeed(a.id) - getSeed(b.id));
    const questionsForThisChapter = [...answeredQuestions, ...shuffledUnanswered].slice(0, 5);

    if (questionsForThisChapter.length === 0) {
      return NextResponse.json({ message: "No questions found" }, { status: 404 });
    }

    const mcq = questionsForThisChapter.map((q, index) => {
      const qData = questionData.get(q.id) || {};
      const options = [...((q.options as string[]) || [])];
      return {
        id: q.id,
        chapter_number: chapterNumber,
        question_number: index + 1,
        question: q.question,
        options: options.sort(() => 0.5 - Math.random()),
        textual_evidence: q.textualEvidence,
        timer: qData.timer || null,
        xpEarned: qData.xpEarned || 0,
        selectedAnswer: qData.selectedAnswer || null,
        correctAnswer: qData.correctAnswer || null,
      };
    });

    const responseData = {
      state: QuestionState.INCOMPLETE,
      total: 5,
      progress,
      results: mcq,
      summary: {
        totalXpEarned: Array.from(questionData.values()).reduce((sum, d) => sum + (d.xpEarned || 0), 0),
        totalTimer: Array.from(questionData.values()).reduce((sum, d) => sum + (d.timer || 0), 0),
        correctAnswers: progress.filter((p) => p === AnswerStatus.CORRECT).length,
        incorrectAnswers: progress.filter((p) => p === AnswerStatus.INCORRECT).length,
        currentQuestion: progress.filter((p) => p !== AnswerStatus.UNANSWERED).length + 1,
      },
    };

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error("Error in getStoryMCQuestions:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function getStorySAQuestion(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  const { storyId, chapterNumber } = await ctx.params;
  try {
    if (!storyId || typeof storyId !== "string") {
      return NextResponse.json({ message: "Invalid storyId" }, { status: 400 });
    }

    if (!req.session?.user?.id || typeof req.session.user.id !== "string") {
      return NextResponse.json(
        { message: "User not authenticated" },
        { status: 401 }
      );
    }

    const userId = req.session.user.id;

    // Get story with chapter
    const { story, chapter } = await loadStoryAndChapter(storyId, chapterNumber);

    if (!story) {
      return NextResponse.json({ message: "Story not found" }, { status: 404 });
    }

    if (!chapter) {
      return NextResponse.json(
        { message: "Chapter not found" },
        { status: 404 }
      );
    }

    let saQuestions = await db
      .select()
      .from(shortAnswerQuestions)
      .where(eq(shortAnswerQuestions.chapterId, chapter.id));

    if (!saQuestions || saQuestions.length === 0) {
      const generateSAQ = await generateSAQuestion({
        cefrlevel:
          (story.cefrLevel?.replace(/[+-]/g, "") as ArticleBaseCefrLevel) ||
          ArticleBaseCefrLevel.A1,
        type: (story.type as ArticleType) || ArticleType.NONFICTION,
        passage: chapter.passage || "",
        title: story.title || "",
        summary: story.summary || "",
        imageDesc: story.imageDescription || "",
      });

      for (const question of generateSAQ.questions) {
        await db.insert(shortAnswerQuestions).values({
          chapterId: chapter.id,
          question: question.question,
          answer: question.suggested_answer || "",
        });
      }

      saQuestions = await db
        .select()
        .from(shortAnswerQuestions)
        .where(eq(shortAnswerQuestions.chapterId, chapter.id));

      if (!saQuestions || saQuestions.length === 0) {
        return NextResponse.json(
          { message: "No questions found" },
          { status: 404 }
        );
      }
    }

    const question = saQuestions.find((q) => q.chapterId === chapter.id);

    if (!question) {
      return NextResponse.json(
        { message: "No SAQ question found" },
        { status: 404 }
      );
    }

    // Return the DB question id so front-end can post with questionId
    const formattedQuestion = {
      question: question.question,
      suggested_answer: question.answer,
      chapter_number: chapterNumber,
      questionId: question.id,
      id: question.id,
    };

    // Get user activity for this question (article flow):
    // 1) try details.storyId equality,
    // 2) then try details.questionId equality (new guard),
    // 3) then fallback to targetId
    let [userActivityRow] = await db
      .select()
      .from(userActivity)
      .where(
        and(
          eq(userActivity.userId, userId),
          eq(userActivity.activityType, ActivityType.SA_QUESTION),
          eq(userActivity.completed, true),
          sql`${userActivity.details}->>'storyId' = ${storyId}`
        )
      )
      .limit(1);

    if (!userActivityRow) {
      // Try matching by details.questionId (we store questionId in details)
      [userActivityRow] = await db
        .select()
        .from(userActivity)
        .where(
          and(
            eq(userActivity.userId, userId),
            eq(userActivity.activityType, ActivityType.SA_QUESTION),
            eq(userActivity.completed, true),
            sql`${userActivity.details}->>'questionId' = ${question.id}`
          )
        )
        .limit(1);
    }

    if (!userActivityRow) {
      // Fallback to activity keyed by targetId (composite unique)
      [userActivityRow] = await db
        .select()
        .from(userActivity)
        .where(
          and(
            eq(userActivity.userId, userId),
            eq(userActivity.activityType, ActivityType.SA_QUESTION),
            eq(userActivity.targetId, `${question.id}`)
          )
        )
        .limit(1);
    }

    const userRecord = userActivityRow?.details as any;

    if (userRecord && userRecord.status !== AnswerStatus.UNANSWERED) {
      return NextResponse.json(
        {
          message: "User already answered",
          result: {
            id: formattedQuestion.id,
            question: formattedQuestion.question,
          },
          suggested_answer: userRecord.suggested_answer ?? "",
          state: QuestionState.COMPLETED,
          answer: userRecord.answer ?? "",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        state: QuestionState.INCOMPLETE,
        progress: AnswerStatus.UNANSWERED,
        result: {
          id: formattedQuestion.id,
          question: formattedQuestion.question,
          questionId: formattedQuestion.questionId,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function answerStorySAQuestion(
  req: ExtendedNextRequest,
  ctx: {
    params: Promise<{
      storyId: string;
      chapterNumber: string;
      questionNumber: string;
    }>;
  }
) {
  const { storyId, chapterNumber, questionNumber } = await ctx.params;
  try {
    const body = await req.json();
    const { answer, timeRecorded, createActivity = false } = body;

    const userId = req.session?.user.id as string;
    if (!userId) {
      return NextResponse.json(
        { message: "User not authenticated" },
        { status: 401 }
      );
    }

    if (!storyId || !chapterNumber || !questionNumber) {
      return NextResponse.json(
        { message: "Invalid parameters" },
        { status: 400 }
      );
    }

    // Load story and chapter
    const { story, chapter } = await loadStoryAndChapter(storyId, chapterNumber);
    if (!story) {
      return NextResponse.json({ message: "Story not found" }, { status: 404 });
    }
    if (!chapter) {
      return NextResponse.json(
        { message: "Chapter not found" },
        { status: 404 }
      );
    }

    // Treat incoming questionNumber as the DB question id
    const questionId = questionNumber;

    // Try to find the specific question by id first
    let [questionData] = await db
      .select()
      .from(shortAnswerQuestions)
      .where(eq(shortAnswerQuestions.id, questionId))
      .limit(1);

    // Fallback: load questions for chapter and pick first if id not found
    if (!questionData) {
      let saQuestions = await db
        .select()
        .from(shortAnswerQuestions)
        .where(eq(shortAnswerQuestions.chapterId, chapter.id));
      if (!saQuestions || saQuestions.length === 0) {
        // generate if missing
        const generateSAQ = await generateSAQuestion({
          cefrlevel:
            (story.cefrLevel?.replace(/[+-]/g, "") as ArticleBaseCefrLevel) ||
            ArticleBaseCefrLevel.A1,
          type: (story.type as ArticleType) || ArticleType.NONFICTION,
          passage: chapter.passage || "",
          title: story.title || "",
          summary: story.summary || "",
          imageDesc: story.imageDescription || "",
        });

        for (const q of generateSAQ.questions) {
          await db.insert(shortAnswerQuestions).values({
            chapterId: chapter.id,
            question: q.question,
            answer: q.suggested_answer || "",
          });
        }

        saQuestions = await db
          .select()
          .from(shortAnswerQuestions)
          .where(eq(shortAnswerQuestions.chapterId, chapter.id));
      }

      questionData = saQuestions[0];
    }

    if (!questionData) {
      return NextResponse.json(
        { message: "No questions found" },
        { status: 404 }
      );
    }

    // Use composite targetId for chapter-based tracking
    const targetId = `${storyId}_${chapterNumber}`;

    if (createActivity !== false) {
      // Check if user already answered this chapter's SA question
      const [existingActivity] = await db
        .select()
        .from(userActivity)
        .where(
          and(
            eq(userActivity.userId, userId),
            eq(userActivity.activityType, ActivityType.SA_QUESTION),
            eq(userActivity.targetId, targetId)
          )
        )
        .limit(1);

      if (existingActivity) {
        return NextResponse.json(
          {
            message: "User already answered SA question for this chapter",
            results: [],
          },
          { status: 400 }
        );
      }

      // Upsert user activity for SA question (composite unique: userId+activityType+targetId)
      const detailsPayload = {
        storyId,
        chapter_number: chapterNumber,
        questionId: questionData.id,
        question: questionData.question,
        answer,
        suggested_answer: questionData.answer,
        created_at: new Date().toISOString(),
      };

      const [activity] = await db
        .insert(userActivity)
        .values({
          userId,
          activityType: ActivityType.SA_QUESTION,
          targetId,
          timer: timeRecorded,
          completed: true,
          details: detailsPayload,
        })
        .onConflictDoUpdate({
          target: [
            userActivity.userId,
            userActivity.activityType,
            userActivity.targetId,
          ],
          set: {
            completed: true,
            timer: timeRecorded,
            details: detailsPayload,
            updatedAt: new Date(),
          },
        })
        .returning();

      // Award XP once (guard against duplicate xpLog)
      const [existingXpLog] = await db
        .select()
        .from(xpLogs)
        .where(
          and(
            eq(xpLogs.activityId, activity.id),
            eq(xpLogs.activityType, ActivityType.SA_QUESTION)
          )
        )
        .limit(1);
      if (!existingXpLog) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        if (user) {
          const [updatedUser] = await db
            .update(users)
            .set({ xp: user.xp + 3 })
            .where(eq(users.id, userId))
            .returning();
          await db.insert(xpLogs).values({
            userId,
            xpEarned: 3,
            activityId: activity.id,
            activityType: ActivityType.SA_QUESTION,
          });
          if (req.session?.user) req.session.user.xp = updatedUser.xp;
        }
      }
    }

    // Check if SA question is completed for this chapter
    const [saQuestionCompleted] = await db
      .select()
      .from(userActivity)
      .where(
        and(
          eq(userActivity.userId, userId),
          eq(userActivity.activityType, ActivityType.SA_QUESTION),
          eq(userActivity.targetId, targetId),
          eq(userActivity.completed, true)
        )
      )
      .limit(1);

    if (saQuestionCompleted) {
      // Import the updateChapterCompletion function
      const { updateChapterCompletion } = await import("./stories-controller");

      // Update chapter completion status
      await updateChapterCompletion(
        userId,
        storyId,
        parseInt(chapterNumber, 10)
      );
    }

    return NextResponse.json(
      {
        chapter_number: chapterNumber,
        questionId: questionData.id,
        answer,
        suggested_answer: questionData.answer,
        completed: !!saQuestionCompleted,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function answerStoryMCQuestion(
  req: ExtendedNextRequest,
  ctx: {
    params: Promise<{
      storyId: string;
      chapterNumber: string;
      questionNumber: string;
    }>;
  }
) {
  const { storyId, chapterNumber, questionNumber } = await ctx.params;
  try {
    const { selectedAnswer, timeRecorded } = await req.json();
    const userId = req.session?.user.id as string;

    if (!userId) {
      return NextResponse.json(
        { message: "User not authenticated" },
        { status: 401 }
      );
    }

    if (!storyId || !chapterNumber || !questionNumber) {
      return NextResponse.json(
        { message: "Invalid parameters" },
        { status: 400 }
      );
    }

    // Get story with chapter
    const { story, chapter } = await loadStoryAndChapter(storyId, chapterNumber);

    if (!story) {
      return NextResponse.json({ message: "Story not found" }, { status: 404 });
    }

    if (!chapter) {
      return NextResponse.json(
        { message: "Chapter not found" },
        { status: 404 }
      );
    }

    let questions = await db
      .select()
      .from(multipleChoiceQuestions)
      .where(eq(multipleChoiceQuestions.chapterId, chapter.id));

    if (questions.length === 0) {
      const cefrlevel = story.cefrLevel?.replace(/[+-]/g, "") as any;
      const generateMCQ = await generateMCQuestion({
        cefrlevel: cefrlevel,
        type: story.type as any,
        passage: chapter.passage || "",
        title: story.title || "",
        summary: story.summary || "",
        imageDesc: story.imageDescription || "",
      });

      const questionsToCreate = generateMCQ.questions.slice(0, 5);

      for (const question of questionsToCreate) {
        await db.insert(multipleChoiceQuestions).values({
          chapterId: chapter.id,
          question: question.question,
          options: [
            question.correct_answer,
            question.distractor_1,
            question.distractor_2,
            question.distractor_3,
          ],
          correctAnswer: 0,
          answer: question.correct_answer || "",
          textualEvidence: question.textual_evidence || "",
        });
      }

      questions = await db
        .select()
        .from(multipleChoiceQuestions)
        .where(eq(multipleChoiceQuestions.chapterId, chapter.id));
    }

    const questionsMapped = questions.map((q, index) => ({
      ...q,
      question_number: index + 1,
    }));

    const questionData = questionsMapped.find(
      (q) => q.question_number === parseInt(questionNumber, 10)
    );

    if (!questionData) {
      return NextResponse.json(
        { message: "Question not found" },
        { status: 404 }
      );
    }

    const correctAnswer = questionData?.answer;
    const isCorrect = selectedAnswer === correctAnswer;

    const targetId = `${storyId}_${chapterNumber}_mcq_${questionNumber}`;

    // Check if user already answered -> create or update (upsert) so answers can be updated like `answerMCQuestion`
    const detailsPayload = {
      storyId: storyId,
      chapterNumber: chapterNumber,
      questionNumber: questionNumber,
      questionId: questionData.id,
      question: questionData.question,
      selectedAnswer: selectedAnswer,
      correctAnswer: correctAnswer,
      textualEvidence: questionData.textualEvidence,
      isCorrect: isCorrect,
    };

    const [activity] = await db
      .insert(userActivity)
      .values({
        userId,
        activityType: ActivityType.MC_QUESTION,
        targetId,
        timer: timeRecorded,
        completed: true,
        details: detailsPayload,
      })
      .onConflictDoUpdate({
        target: [
          userActivity.userId,
          userActivity.activityType,
          userActivity.targetId,
        ],
        set: {
          completed: true,
          timer: timeRecorded,
          details: detailsPayload,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (isCorrect) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user) {
        const [updatedUser] = await db
          .update(users)
          .set({ xp: user.xp + UserXpEarned.MC_Question })
          .where(eq(users.id, userId))
          .returning();

        await db.insert(xpLogs).values({
          userId: userId,
          xpEarned: UserXpEarned.MC_Question,
          activityId: activity.id,
          activityType: ActivityType.MC_QUESTION,
        });

        if (req.session?.user) {
          req.session.user.xp = updatedUser.xp;
        }
      }
    }

    // Get all user activities for this chapter's MC questions (targetId or legacy fallback)
    const userActivitiesRaw = await db
      .select()
      .from(userActivity)
      .where(
        and(
          eq(userActivity.userId, userId),
          eq(userActivity.activityType, ActivityType.MC_QUESTION),
          or(
            like(userActivity.targetId, `${storyId}_${chapterNumber}_mcq_%`),
            sql`${userActivity.details}->>'storyId' = ${storyId}`
          )
        )
      )
      .orderBy(asc(userActivity.createdAt));

    const userActivities = userActivitiesRaw.filter((activity) => {
      if (activity.targetId?.startsWith(`${storyId}_${chapterNumber}_mcq_`)) {
        return true;
      }
      const details = activity.details as any;
      return (
        details?.storyId === storyId &&
        String(details?.chapterNumber) === String(chapterNumber)
      );
    });

    let progress: AnswerStatus[] = new Array(5).fill(AnswerStatus.UNANSWERED);

    userActivities.forEach((activity) => {
      const details = activity.details as any;
      if (!details) return;

      let questionNum: number | undefined;

      // Try extract from modern targetId first
      if (activity.targetId?.startsWith(`${storyId}_${chapterNumber}_mcq_`)) {
        const parts = activity.targetId.split("_");
        questionNum = parseInt(parts[parts.length - 1], 10);
      } else {
        // Fallback to legacy details
        questionNum = details.questionNumber ? parseInt(details.questionNumber, 10) : undefined;
      }

      const questionIndex = (questionNum || 0) - 1;
      if (
        questionIndex >= 0 &&
        questionIndex < 5 &&
        typeof details.isCorrect === "boolean"
      ) {
        progress[questionIndex] = details.isCorrect
          ? AnswerStatus.CORRECT
          : AnswerStatus.INCORRECT;
      }
    });

    if (!progress.includes(AnswerStatus.UNANSWERED)) {
      // Import the updateChapterCompletion function
      const { updateChapterCompletion } = await import("./stories-controller");

      // Update chapter completion status
      await updateChapterCompletion(
        userId,
        storyId,
        parseInt(chapterNumber, 10)
      );
    }

    const responseData = {
      correct: isCorrect,
      correctAnswer: correctAnswer,
      textualEvidence: questionData.textualEvidence,
      xpEarned: isCorrect ? UserXpEarned.MC_Question : 0,
      userXp: req.session?.user.xp,
    };

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function rateStory(
  req: ExtendedNextRequest,
  ctx: {
    params: Promise<{
      storyId: string;
      chapterNumber: string;
      questionNumber: string;
    }>;
  }
) {
  const { storyId, chapterNumber, questionNumber } = await ctx.params;
  try {
    const { rating } = await req.json();
    const userId = req.session?.user.id as string;

    if (!userId) {
      return NextResponse.json(
        { message: "User not authenticated" },
        { status: 401 }
      );
    }

    // Update story record rating (composite unique: userId + storyId)
    await db
      .insert(storyRecords)
      .values({
        userId,
        storyId,
        rated: rating,
      })
      .onConflictDoUpdate({
        target: [storyRecords.userId, storyRecords.storyId],
        set: {
          rated: rating,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ message: "Rated" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Review rated receive xp === rated star
// export async function xpAwardRated(
//     req: ExtendedNextRequest
// ){
//     try{
//         const { rating } = await req.json();
//         const newXp = req.session?.user.xp as number + rating

//         await db
//             .collection("users")
//             .doc(req.session?.user.id as string)
//             .update({
//                 xp: newXp
//             });
//         return NextResponse.json(
//             { message: "xpAward" },
//             { status: 200 }
//         );
//     }catch(error){
//         console.error(error);
//         return NextResponse.json(
//             { message: "Internal server error" },
//             { status: 500 }
//         );
//     }
// }

export async function retakeStoryMCQuestion(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  const { storyId, chapterNumber } = await ctx.params;
  try {
    const userId = req.session?.user.id as string;

    if (!userId) {
      return NextResponse.json(
        { message: "User not authenticated" },
        { status: 401 }
      );
    }

    if (!storyId || !chapterNumber) {
      return NextResponse.json(
        { message: "Invalid parameters" },
        { status: 400 }
      );
    }

    // Find MCQ userActivity entries for this chapter (targetId or legacy fallback)
    const activitiesToDelete = await db
      .select()
      .from(userActivity)
      .where(
        and(
          eq(userActivity.userId, userId),
          eq(userActivity.activityType, ActivityType.MC_QUESTION),
          or(
            like(userActivity.targetId, `${storyId}_${chapterNumber}_mcq_%`),
            sql`${userActivity.details}->>'storyId' = ${storyId}`
          )
        )
      );

    // Filter to only those that are for this story chapter
    const storyActivityIds = activitiesToDelete
      .filter((activity) => {
        if (activity.targetId?.startsWith(`${storyId}_${chapterNumber}_mcq_`)) {
          return true;
        }
        const details = activity.details as any;
        return (
          details?.storyId === storyId &&
          String(details?.chapterNumber) === String(chapterNumber)
        );
      })
      .map((a) => a.id);

    if (storyActivityIds.length === 0) {
      return NextResponse.json(
        { message: `No records found for chapter ${chapterNumber}` },
        { status: 404 }
      );
    }

    // Delete XP logs for those activities
    await db
      .delete(xpLogs)
      .where(
        and(
          eq(xpLogs.userId, userId),
          eq(xpLogs.activityType, ActivityType.MC_QUESTION),
          inArray(xpLogs.activityId, storyActivityIds)
        )
      );

    // Recalculate total XP from remaining xp logs and update user xp/session
    const remainingXpLogs = await db
      .select()
      .from(xpLogs)
      .where(eq(xpLogs.userId, userId));
    const totalXp = remainingXpLogs.reduce((sum, log) => sum + log.xpEarned, 0);

    await db.update(users).set({ xp: totalXp }).where(eq(users.id, userId));
    if (req.session?.user) {
      req.session.user.xp = totalXp;
    }

    // Delete the userActivity records by id
    await db
      .delete(userActivity)
      .where(inArray(userActivity.id, storyActivityIds));

    return NextResponse.json(
      {
        message: `MCQ progress reset for chapter ${chapterNumber}`,
        state: QuestionState.INCOMPLETE,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in retakeStoryMCQuestion:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function getStoryLAQuestion(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  const { storyId, chapterNumber } = await ctx.params;
  try {
    if (!storyId || typeof storyId !== "string") {
      return NextResponse.json({ message: "Invalid storyId" }, { status: 400 });
    }

    if (!req.session?.user?.id || typeof req.session.user.id !== "string") {
      return NextResponse.json(
        { message: "User not authenticated" },
        { status: 401 }
      );
    }

    const userId = req.session.user.id;

    const { story, chapter } = await loadStoryAndChapter(storyId, chapterNumber);

    if (!story) {
      return NextResponse.json({ message: "Story not found" }, { status: 404 });
    }

    if (!chapter) {
      return NextResponse.json(
        { message: "Chapter not found" },
        { status: 404 }
      );
    }

    let [laQuestion] = await db
      .select()
      .from(longAnswerQuestions)
      .where(eq(longAnswerQuestions.chapterId, chapter.id))
      .limit(1);

    if (!laQuestion) {
      const generatedQuestion = await generateLAQuestion({
        cefrlevel: story.cefrLevel?.replace(
          /[+-]/g,
          ""
        ) as ArticleBaseCefrLevel,
        type: story.type as ArticleType,
        passage: chapter.passage || "",
        title: story.title || "",
        summary: story.summary || "",
        imageDesc: story.imageDescription || "",
      });

      [laQuestion] = await db
        .insert(longAnswerQuestions)
        .values({
          chapterId: chapter.id,
          question: generatedQuestion.question,
        })
        .returning();
    }

    const targetId = `${storyId}_${chapterNumber}`;

    // Check for existing activity with new targetId format
    let [existingActivity] = await db
      .select()
      .from(userActivity)
      .where(
        and(
          eq(userActivity.userId, userId),
          eq(userActivity.activityType, ActivityType.LA_QUESTION),
          eq(userActivity.targetId, targetId),
          eq(userActivity.completed, true)
        )
      )
      .limit(1);

    // If not found, check for old format (backward compatibility)
    if (!existingActivity) {
      [existingActivity] = await db
        .select()
        .from(userActivity)
        .where(
          and(
            eq(userActivity.userId, userId),
            eq(userActivity.activityType, ActivityType.LA_QUESTION),
            eq(userActivity.targetId, `${laQuestion.id}`),
            eq(userActivity.completed, true)
          )
        )
        .limit(1);
    }

    if (existingActivity) {
      const details = existingActivity.details as any;
      return NextResponse.json(
        {
          message: "User already answered",
          result: {
            id: laQuestion.id,
            question: laQuestion.question,
          },
          state: QuestionState.COMPLETED,
          answer: details?.answer,
          completed: true,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        state: QuestionState.INCOMPLETE,
        result: {
          id: laQuestion.id,
          question: laQuestion.question,
        },
        completed: false,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function getStoryFeedbackLAquestion(
  req: ExtendedNextRequest,
  ctx: SubRequestContext
) {
  try {
    const { storyId, chapterNumber, questionNumber } = await ctx.params;

    // Require authenticated user (align with SAQ flow)
    if (!req.session?.user?.id || typeof req.session.user.id !== "string") {
      return NextResponse.json(
        { message: "User not authenticated" },
        { status: 401 }
      );
    }

    if (!storyId || typeof storyId !== "string" || storyId.trim() === "") {
      return NextResponse.json({ message: "Invalid storyId" }, { status: 400 });
    }

    if (!questionNumber || typeof questionNumber !== "string") {
      return NextResponse.json(
        { message: "Invalid questionNumber" },
        { status: 400 }
      );
    }

    const { answer, preferredLanguage } = await req.json();
    if (!answer || !preferredLanguage) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const userId = req.session.user.id;

    // Load story and chapter (ensure LA question exists in DB)
    const { story, chapter } = await loadStoryAndChapter(storyId, chapterNumber);

    if (!story) {
      return NextResponse.json({ message: "Story not found" }, { status: 404 });
    }

    if (!chapter) {
      return NextResponse.json(
        { message: "Chapter not found" },
        { status: 404 }
      );
    }

    // Try to find or create a long answer question for this chapter
    let [laQuestion] = await db
      .select()
      .from(longAnswerQuestions)
      .where(eq(longAnswerQuestions.chapterId, chapter.id))
      .limit(1);

    if (!laQuestion) {
      const generatedQuestion = await generateLAQuestion({
        cefrlevel: story.cefrLevel?.replace(
          /[+-]/g,
          ""
        ) as ArticleBaseCefrLevel,
        type: story.type as ArticleType,
        passage: chapter.passage || "",
        title: story.title || "",
        summary: story.summary || "",
        imageDesc: story.imageDescription || "",
      });

      [laQuestion] = await db
        .insert(longAnswerQuestions)
        .values({
          chapterId: chapter.id,
          question: generatedQuestion.question,
        })
        .returning();
    }

    // Build targetId consistent with other endpoints
    const targetId = `${laQuestion.id}`;

    // Call feedback writer
    let cefrLevelReformatted = story.cefrLevel?.replace(/[+-]/g, "") || "";
    const feedbackResponse = await getFeedbackWritter({
      preferredLanguage,
      targetCEFRLevel: cefrLevelReformatted,
      readingPassage: chapter.summary,
      writingPrompt: laQuestion.question,
      studentResponse: answer,
    });

    const feedbackData = await feedbackResponse.json();

    const randomExample =
      feedbackData.exampleRevisions && feedbackData.exampleRevisions.length
        ? feedbackData.exampleRevisions[
            Math.floor(Math.random() * feedbackData.exampleRevisions.length)
          ]
        : null;

    const result = { ...feedbackData, exampleRevisions: randomExample };

    return NextResponse.json(
      { state: QuestionState.INCOMPLETE, result },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function answerStoryLAQuestion(
  req: ExtendedNextRequest,
  ctx: SubRequestContext
) {
  try {
    const { storyId, chapterNumber, questionNumber } = await ctx.params;

    const {
      answer,
      feedback,
      timeRecorded,
      createActivity = true,
    } = await req.json();

    // Auth
    const userId = req.session?.user.id as string;
    if (!userId) {
      return NextResponse.json(
        { message: "User not authenticated" },
        { status: 401 }
      );
    }

    if (!storyId || !chapterNumber || !questionNumber) {
      return NextResponse.json(
        { message: "Invalid parameters" },
        { status: 400 }
      );
    }

    // Load story and chapter; ensure LA question exists
    const { story, chapter } = await loadStoryAndChapter(storyId, chapterNumber);

    if (!story) {
      return NextResponse.json({ message: "Story not found" }, { status: 404 });
    }

    if (!chapter) {
      return NextResponse.json(
        { message: "Chapter not found" },
        { status: 404 }
      );
    }

    let [laQuestion] = await db
      .select()
      .from(longAnswerQuestions)
      .where(eq(longAnswerQuestions.chapterId, chapter.id))
      .limit(1);
    if (!laQuestion) {
      const generatedQuestion = await generateLAQuestion({
        cefrlevel: story.cefrLevel?.replace(
          /[+-]/g,
          ""
        ) as ArticleBaseCefrLevel,
        type: story.type as ArticleType,
        passage: chapter.passage || "",
        title: story.title || "",
        summary: story.summary || "",
        imageDesc: story.imageDescription || "",
      });
      [laQuestion] = await db
        .insert(longAnswerQuestions)
        .values({ chapterId: chapter.id, question: generatedQuestion.question })
        .returning();
    }

    const targetId = `${storyId}_${chapterNumber}`;

    if (createActivity !== false) {
      // Check if there's an existing activity with old targetId format
      const oldTargetId = `${laQuestion.id}`;
      const [existingActivity] = await db
        .select()
        .from(userActivity)
        .where(
          and(
            eq(userActivity.userId, userId),
            eq(userActivity.activityType, ActivityType.LA_QUESTION),
            eq(userActivity.targetId, oldTargetId)
          )
        )
        .limit(1);

      let activity;
      if (existingActivity) {
        // Update existing activity with new targetId format
        [activity] = await db
          .update(userActivity)
          .set({
            targetId, // Update to new format
            completed: true,
            timer: timeRecorded,
            details: {
              id: targetId,
              time_recorded: timeRecorded,
              question: laQuestion.question,
              answer,
              feedback,
              created_at: new Date().toISOString(),
            },
            updatedAt: new Date(),
          })
          .where(eq(userActivity.id, existingActivity.id))
          .returning();
      } else {
        // Create new activity with new targetId format (composite unique upsert)
        const detailsPayload = {
          id: targetId,
          time_recorded: timeRecorded,
          question: laQuestion.question,
          answer,
          feedback,
          created_at: new Date().toISOString(),
        };
        [activity] = await db
          .insert(userActivity)
          .values({
            userId,
            activityType: ActivityType.LA_QUESTION,
            targetId,
            timer: timeRecorded,
            completed: true,
            details: detailsPayload,
          })
          .onConflictDoUpdate({
            target: [
              userActivity.userId,
              userActivity.activityType,
              userActivity.targetId,
            ],
            set: {
              completed: true,
              timer: timeRecorded,
              details: detailsPayload,
              updatedAt: new Date(),
            },
          })
          .returning();
      }

      // Award XP once (guard)
      if (activity) {
        const [existingXpLog] = await db
          .select()
          .from(xpLogs)
          .where(
            and(
              eq(xpLogs.activityId, activity.id),
              eq(xpLogs.activityType, ActivityType.LA_QUESTION)
            )
          )
          .limit(1);
        if (!existingXpLog) {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);
          if (user) {
            const [updatedUser] = await db
              .update(users)
              .set({ xp: user.xp + 5 })
              .where(eq(users.id, userId))
              .returning();
            await db.insert(xpLogs).values({
              userId,
              xpEarned: 5,
              activityId: activity.id,
              activityType: ActivityType.LA_QUESTION,
            });
            if (req.session?.user) req.session.user.xp = updatedUser.xp;
          }
        }
      }
    }

    // After handling activity creation/update, always check completion across all question types
    let laQuestionCompleted = false;
    try {
      const chapterTargetId = `${storyId}_${chapterNumber}`;

      // Count MCQs for this chapter
      const [{ c: mcqCount }] = await db
        .select({ c: count() })
        .from(userActivity)
        .where(
          and(
            eq(userActivity.userId, userId),
            eq(userActivity.activityType, ActivityType.MC_QUESTION),
            like(userActivity.targetId, `${chapterTargetId}_mcq_%`),
            eq(userActivity.completed, true)
          )
        );

      // Find SAQ using composite or legacy formats
      const [saqFound] = await db
        .select()
        .from(userActivity)
        .where(
          and(
            eq(userActivity.userId, userId),
            eq(userActivity.activityType, ActivityType.SA_QUESTION),
            eq(userActivity.completed, true),
            or(
              eq(userActivity.targetId, chapterTargetId),
              eq(userActivity.targetId, storyId),
              like(userActivity.targetId, `${storyId}_%`),
              sql`${userActivity.details}->>'storyId' = ${storyId}`
            )
          )
        )
        .limit(1);

      // Find LAQ using composite or legacy formats
      const [laqFound] = await db
        .select()
        .from(userActivity)
        .where(
          and(
            eq(userActivity.userId, userId),
            eq(userActivity.activityType, ActivityType.LA_QUESTION),
            eq(userActivity.completed, true),
            or(
              eq(userActivity.targetId, chapterTargetId),
              eq(userActivity.targetId, storyId),
              like(userActivity.targetId, `${storyId}_%`),
              sql`${userActivity.details}->>'storyId' = ${storyId}`
            )
          )
        )
        .limit(1);

      laQuestionCompleted = !!laqFound;

      if (Number(mcqCount) >= 5 && saqFound && laqFound) {
        try {
          const targetIdToUpsert = `${storyId}_${chapterNumber}`;
          const [existingChapterRead] = await db
            .select()
            .from(userActivity)
            .where(
              and(
                eq(userActivity.userId, userId),
                eq(userActivity.activityType, ActivityType.CHAPTER_READ),
                eq(userActivity.targetId, targetIdToUpsert)
              )
            )
            .limit(1);

          if (existingChapterRead) {
            await db
              .update(userActivity)
              .set({ completed: true, updatedAt: new Date() })
              .where(eq(userActivity.id, existingChapterRead.id));
          } else {
            await db.insert(userActivity).values({
              userId,
              activityType: ActivityType.CHAPTER_READ,
              targetId: targetIdToUpsert,
              completed: true,
            });
          }
        } catch (err) {
          console.error(
            "[answerStoryLAQuestion] Failed to upsert CHAPTER_READ:",
            err
          );
        }
      }
    } catch (err) {
      console.error(
        "[answerStoryLAQuestion] Error running completion check:",
        err
      );
    }

    const scores: number[] = feedback
      ? Object.values(feedback.scores || {})
      : [];
    const sumScores = scores.reduce<number>((a, b) => a + (Number(b) || 0), 0);

    return NextResponse.json(
      {
        state: QuestionState.COMPLETED,
        answer,
        result: feedback,
        sumScores,
        completed: !!laQuestionCompleted,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in answerStoryLAQuestion:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function getStoryLAQuestionXP(
  req: ExtendedNextRequest,
  ctx: SubRequestContext
) {
  try {
    const { storyId, chapterNumber, questionNumber } = await ctx.params;

    const { rating } = await req.json();

    const userId = req.session?.user.id as string;
    if (!userId) {
      return NextResponse.json(
        { message: "User not authenticated" },
        { status: 401 }
      );
    }

    // Load story/chapter and ensure LA question exists
    const { story, chapter } = await loadStoryAndChapter(storyId, chapterNumber);

    if (!story)
      return NextResponse.json({ message: "Story not found" }, { status: 404 });
    if (!chapter)
      return NextResponse.json(
        { message: "Chapter not found" },
        { status: 404 }
      );

    let [laQuestion] = await db
      .select()
      .from(longAnswerQuestions)
      .where(eq(longAnswerQuestions.chapterId, chapter.id))
      .limit(1);
    if (!laQuestion) {
      const generatedQuestion = await generateLAQuestion({
        cefrlevel: story.cefrLevel?.replace(
          /[+-]/g,
          ""
        ) as ArticleBaseCefrLevel,
        type: story.type as ArticleType,
        passage: chapter.passage || "",
        title: story.title || "",
        summary: story.summary || "",
        imageDesc: story.imageDescription || "",
      });
      [laQuestion] = await db
        .insert(longAnswerQuestions)
        .values({ chapterId: chapter.id, question: generatedQuestion.question })
        .returning();
    }

    const targetId = `${storyId}_${chapterNumber}`;

    // Find userActivity for this LAQ (check both old and new targetId formats)
    let [userActivityRow] = await db
      .select()
      .from(userActivity)
      .where(
        and(
          eq(userActivity.userId, userId),
          eq(userActivity.activityType, ActivityType.LA_QUESTION),
          or(
            eq(userActivity.targetId, targetId),
            eq(userActivity.targetId, `${laQuestion.id}`)
          )
        )
      )
      .limit(1);

    if (!userActivityRow) {
      [userActivityRow] = await db
        .insert(userActivity)
        .values({
          userId,
          activityType: ActivityType.LA_QUESTION,
          targetId,
          completed: true,
          timer: 0,
          details: {
            id: targetId,
            questionId: laQuestion.id,
            question: laQuestion.question,
            created_at: new Date().toISOString(),
          },
        })
        .returning();
    }

    // Guard XP duplicate
    const [existingXPLog] = await db
      .select()
      .from(xpLogs)
      .where(
        and(
          eq(xpLogs.userId, userId),
          eq(xpLogs.activityId, userActivityRow.id),
          eq(xpLogs.activityType, ActivityType.LA_QUESTION)
        )
      )
      .limit(1);

    if (existingXPLog) {
      return NextResponse.json(
        { message: "XP already awarded for this question", xpEarned: 0 },
        { status: 200 }
      );
    }

    const xpEarned = Math.max(1, Math.floor((Number(rating) || 0) / 2));

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (user) {
      const [updatedUser] = await db
        .update(users)
        .set({ xp: user.xp + xpEarned })
        .where(eq(users.id, userId))
        .returning();

      await db.insert(xpLogs).values({
        userId,
        xpEarned,
        activityId: userActivityRow.id,
        activityType: ActivityType.LA_QUESTION,
      });

      if (req.session?.user) req.session.user.xp = updatedUser.xp;

      // Try to update chapter completion now that LA activity exists and XP was awarded
      try {
        const { updateChapterCompletion } = await import(
          "./stories-controller"
        );
        await updateChapterCompletion(
          userId,
          storyId,
          parseInt(chapterNumber, 10)
        );
      } catch (err) {
        console.error(
          "[getStoryLAQuestionXP] failed to update chapter completion:",
          err
        );
      }

      return NextResponse.json(
        {
          message: "XP awarded successfully",
          xpEarned,
          userXp: updatedUser.xp,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: "User not found", xpEarned: 0 },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error awarding story LAQ XP:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
