import {
  AnswerStatus,
  QuestionState,
} from "@/components/models/questions-model";
import { UserXpEarned } from "@/components/models/user-activity-log-model";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getFeedbackWritter } from "./assistant-controller";
import { generateMCQuestion } from "../utils/generators/mc-question-generator";
import { ExtendedNextRequest } from "./auth-controller";
import { ActivityType, QuizStatus } from "@prisma/client";
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

    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: {
        chapters: {
          where: { chapterNumber: parseInt(chapterNumber, 10) },
        },
      },
    });

    if (!story) {
      return NextResponse.json({ message: "Story not found" }, { status: 404 });
    }
    const chapter = story.chapters[0];
    if (!chapter) {
      return NextResponse.json(
        { message: "Chapter not found" },
        { status: 404 }
      );
    }

    let questions = await prisma.multipleChoiceQuestion.findMany({
      where: { chapterId: chapter.id },
    });

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
        await prisma.multipleChoiceQuestion.create({
          data: {
            chapterId: chapter.id,
            question: question.question,
            options: [
              question.correct_answer,
              question.distractor_1,
              question.distractor_2,
              question.distractor_3,
            ],
            answer: question.correct_answer || "",
            textualEvidence: question.textual_evidence || "",
          },
        });
      }

      questions = await prisma.multipleChoiceQuestion.findMany({
        where: { chapterId: chapter.id },
      });
    }

    const questionsMapped = questions.map((q, index) => ({
      ...q,
      chapter_number: chapterNumber,
      question_number: index + 1,
      id: q.id,
      textual_evidence: q.textualEvidence,
    }));

    // Get user activities for MC questions (broad lookup)
    const userActivities = await prisma.userActivity.findMany({
      where: {
        userId,
        activityType: ActivityType.MC_QUESTION,
      },
    });

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
    const xpLogs = await prisma.xPLog.findMany({
      where: {
        activityId: { in: activityIds },
        activityType: ActivityType.MC_QUESTION,
      },
    });

    const xpLogMap = new Map(xpLogs.map((log) => [log.activityId, log]));

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
      const options = [...q.options];
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
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: {
        chapters: {
          where: { chapterNumber: parseInt(chapterNumber, 10) },
        },
      },
    });

    if (!story) {
      return NextResponse.json({ message: "Story not found" }, { status: 404 });
    }

    const chapter = story.chapters[0];
    if (!chapter) {
      return NextResponse.json(
        { message: "Chapter not found" },
        { status: 404 }
      );
    }

    let shortAnswerQuestions = await prisma.shortAnswerQuestion.findMany({
      where: { chapterId: chapter.id },
    });

    if (!shortAnswerQuestions || shortAnswerQuestions.length === 0) {
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
        await prisma.shortAnswerQuestion.create({
          data: {
            chapterId: chapter.id,
            question: question.question,
            answer: question.suggested_answer || "",
          },
        });
      }

      shortAnswerQuestions = await prisma.shortAnswerQuestion.findMany({
        where: { chapterId: chapter.id },
      });

      if (!shortAnswerQuestions || shortAnswerQuestions.length === 0) {
        return NextResponse.json(
          { message: "No questions found" },
          { status: 404 }
        );
      }
    }

    const question = (shortAnswerQuestions as any[]).find(
      (q: any) => q.chapterId === chapter.id
    );

    if (!question) {
      return NextResponse.json(
        { message: "No SAQ question found" },
        { status: 404 }
      );
    }

    // Return the DB question id so front-end can post with questionId
    const formattedQuestion = {
      question: question.question,
      suggested_answer: (question as any).answer,
      chapter_number: chapterNumber,
      questionId: question.id,
      id: question.id,
    };

    // Get user activity for this question (article flow):
    // 1) try details.storyId equality,
    // 2) then try details.questionId equality (new guard),
    // 3) then fallback to targetId
    let userActivity = await prisma.userActivity.findFirst({
      where: {
        userId,
        activityType: ActivityType.SA_QUESTION,
        completed: true,
        details: {
          path: ["storyId"],
          equals: storyId,
        },
      },
    });

    if (!userActivity) {
      // Try matching by details.questionId (we store questionId in details)
      userActivity = await prisma.userActivity.findFirst({
        where: {
          userId,
          activityType: ActivityType.SA_QUESTION,
          completed: true,
          details: {
            path: ["questionId"],
            equals: question.id,
          },
        },
      });
    }

    if (!userActivity) {
      // Fallback to activity keyed by targetId
      userActivity = await prisma.userActivity.findUnique({
        where: {
          userId_activityType_targetId: {
            userId,
            activityType: ActivityType.SA_QUESTION,
            targetId: `${question.id}`,
          },
        },
      });
    }

    const userRecord = userActivity?.details as any;

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
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: {
        chapters: { where: { chapterNumber: parseInt(chapterNumber, 10) } },
      },
    });
    if (!story) {
      return NextResponse.json({ message: "Story not found" }, { status: 404 });
    }
    const chapter = story.chapters[0];
    if (!chapter) {
      return NextResponse.json(
        { message: "Chapter not found" },
        { status: 404 }
      );
    }

    // Treat incoming questionNumber as the DB question id
    const questionId = questionNumber;

    // Try to find the specific question by id first
    let questionData = await prisma.shortAnswerQuestion.findUnique({
      where: { id: questionId },
    });

    // Fallback: load questions for chapter and pick first if id not found
    if (!questionData) {
      let shortAnswerQuestions = await prisma.shortAnswerQuestion.findMany({
        where: { chapterId: chapter.id },
      });
      if (!shortAnswerQuestions || shortAnswerQuestions.length === 0) {
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
          await prisma.shortAnswerQuestion.create({
            data: {
              chapterId: chapter.id,
              question: q.question,
              answer: q.suggested_answer || "",
            },
          });
        }

        shortAnswerQuestions = await prisma.shortAnswerQuestion.findMany({
          where: { chapterId: chapter.id },
        });
      }

      questionData = (shortAnswerQuestions as any[])[0];
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
      const existingActivity = await prisma.userActivity.findFirst({
        where: {
          userId,
          activityType: ActivityType.SA_QUESTION,
          targetId,
        },
      });

      if (existingActivity) {
        return NextResponse.json(
          {
            message: "User already answered SA question for this chapter",
            results: [],
          },
          { status: 400 }
        );
      }

      // Upsert user activity for SA question
      const activity = await prisma.userActivity.upsert({
        where: {
          userId_activityType_targetId: {
            userId,
            activityType: ActivityType.SA_QUESTION,
            targetId,
          },
        },
        update: {
          completed: true,
          timer: timeRecorded,
          details: {
            storyId,
            chapter_number: chapterNumber,
            questionId: questionData.id,
            question: questionData.question,
            answer,
            suggested_answer: questionData.answer,
            created_at: new Date().toISOString(),
          },
          updatedAt: new Date(),
        },
        create: {
          userId,
          activityType: ActivityType.SA_QUESTION,
          targetId,
          timer: timeRecorded,
          completed: true,
          details: {
            storyId,
            chapter_number: chapterNumber,
            questionId: questionData.id,
            question: questionData.question,
            answer,
            suggested_answer: questionData.answer,
            created_at: new Date().toISOString(),
          },
        },
      });

      // Award XP once (guard against duplicate xPLog)
      const existingXpLog = await prisma.xPLog.findFirst({
        where: {
          activityId: activity.id,
          activityType: ActivityType.SA_QUESTION,
        },
      });
      if (!existingXpLog) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user) {
          const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { xp: user.xp + 3 },
          });
          await prisma.xPLog.create({
            data: {
              userId,
              xpEarned: 3,
              activityId: activity.id,
              activityType: ActivityType.SA_QUESTION,
            },
          });
          if (req.session?.user) req.session.user.xp = updatedUser.xp;
        }
      }
    }

    // Check if SA question is completed for this chapter
    const saQuestionCompleted = await prisma.userActivity.findFirst({
      where: {
        userId,
        activityType: ActivityType.SA_QUESTION,
        targetId,
        completed: true,
      },
    });

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
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: {
        chapters: {
          where: { chapterNumber: parseInt(chapterNumber, 10) },
        },
      },
    });

    if (!story) {
      return NextResponse.json({ message: "Story not found" }, { status: 404 });
    }

    const chapter = story.chapters[0];
    if (!chapter) {
      return NextResponse.json(
        { message: "Chapter not found" },
        { status: 404 }
      );
    }

    let questions = await prisma.multipleChoiceQuestion.findMany({
      where: { chapterId: chapter.id },
    });

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
        await prisma.multipleChoiceQuestion.create({
          data: {
            chapterId: chapter.id,
            question: question.question,
            options: [
              question.correct_answer,
              question.distractor_1,
              question.distractor_2,
              question.distractor_3,
            ],
            answer: question.correct_answer || "",
            textualEvidence: question.textual_evidence || "",
          },
        });
      }

      questions = await prisma.multipleChoiceQuestion.findMany({
        where: { chapterId: chapter.id },
      });
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
    const activity = await prisma.userActivity.upsert({
      where: {
        userId_activityType_targetId: {
          userId,
          activityType: ActivityType.MC_QUESTION,
          targetId,
        },
      },
      update: {
        completed: true,
        timer: timeRecorded,
        details: {
          storyId: storyId,
          chapterNumber: chapterNumber,
          questionNumber: questionNumber,
          questionId: questionData.id,
          question: questionData.question,
          selectedAnswer: selectedAnswer,
          correctAnswer: correctAnswer,
          textualEvidence: questionData.textualEvidence,
          isCorrect: isCorrect,
        },
        updatedAt: new Date(),
      },
      create: {
        userId,
        activityType: ActivityType.MC_QUESTION,
        targetId,
        timer: timeRecorded,
        completed: true,
        details: {
          storyId: storyId,
          chapterNumber: chapterNumber,
          questionNumber: questionNumber,
          questionId: questionData.id,
          question: questionData.question,
          selectedAnswer: selectedAnswer,
          correctAnswer: correctAnswer,
          textualEvidence: questionData.textualEvidence,
          isCorrect: isCorrect,
        },
      },
    });

    if (isCorrect) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user) {
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { xp: user.xp + UserXpEarned.MC_Question },
        });

        await prisma.xPLog.create({
          data: {
            userId: userId,
            xpEarned: UserXpEarned.MC_Question,
            activityId: activity.id,
            activityType: ActivityType.MC_QUESTION,
          },
        });

        if (req.session?.user) {
          req.session.user.xp = updatedUser.xp;
        }
      }
    }

    // Get all user activities for this chapter's MC questions (targetId or legacy fallback)
    const userActivitiesRaw = await prisma.userActivity.findMany({
      where: {
        userId,
        activityType: ActivityType.MC_QUESTION,
        OR: [
          {
            targetId: {
              startsWith: `${storyId}_${chapterNumber}_mcq_`,
            },
          },
          {
            details: {
              path: ["storyId"],
              equals: storyId,
            },
          },
        ],
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const userActivities = userActivitiesRaw.filter((activity) => {
      if (activity.targetId.startsWith(`${storyId}_${chapterNumber}_mcq_`)) {
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
      if (activity.targetId.startsWith(`${storyId}_${chapterNumber}_mcq_`)) {
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

    // Update story record rating
    await prisma.storyRecord.upsert({
      where: {
        userId_storyId: {
          userId,
          storyId,
        },
      },
      update: {
        rated: rating,
        updatedAt: new Date(),
      },
      create: {
        userId,
        storyId,
        rated: rating,
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
    const activitiesToDelete = await prisma.userActivity.findMany({
      where: {
        userId,
        activityType: ActivityType.MC_QUESTION,
        OR: [
          {
            targetId: {
              startsWith: `${storyId}_${chapterNumber}_mcq_`,
            },
          },
          {
            details: {
              path: ["storyId"],
              equals: storyId,
            },
          },
        ],
      },
    });

    // Filter to only those that are for this story chapter
    const storyActivityIds = activitiesToDelete
      .filter((activity) => {
        if (activity.targetId.startsWith(`${storyId}_${chapterNumber}_mcq_`)) {
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
    await prisma.xPLog.deleteMany({
      where: {
        userId,
        activityType: ActivityType.MC_QUESTION,
        activityId: {
          in: storyActivityIds,
        },
      },
    });

    // Recalculate total XP from remaining xp logs and update user xp/session
    const remainingXpLogs = await prisma.xPLog.findMany({ where: { userId } });
    const totalXp = remainingXpLogs.reduce((sum, log) => sum + log.xpEarned, 0);

    await prisma.user.update({ where: { id: userId }, data: { xp: totalXp } });
    if (req.session?.user) {
      req.session.user.xp = totalXp;
    }

    // Delete the userActivity records by id
    await prisma.userActivity.deleteMany({
      where: { id: { in: storyActivityIds } },
    });

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

    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: {
        chapters: {
          where: { chapterNumber: parseInt(chapterNumber, 10) },
        },
      },
    });

    if (!story) {
      return NextResponse.json({ message: "Story not found" }, { status: 404 });
    }

    const chapter = story.chapters[0];
    if (!chapter) {
      return NextResponse.json(
        { message: "Chapter not found" },
        { status: 404 }
      );
    }

    let laQuestion = await prisma.longAnswerQuestion.findFirst({
      where: { chapterId: chapter.id },
    });

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

      laQuestion = await prisma.longAnswerQuestion.create({
        data: {
          chapterId: chapter.id,
          question: generatedQuestion.question,
        },
      });
    }

    const targetId = `${storyId}_${chapterNumber}`;

    // Check for existing activity with new targetId format
    let existingActivity = await prisma.userActivity.findFirst({
      where: {
        userId: userId,
        activityType: ActivityType.LA_QUESTION,
        targetId: targetId,
        completed: true,
      },
    });

    // If not found, check for old format (backward compatibility)
    if (!existingActivity) {
      existingActivity = await prisma.userActivity.findFirst({
        where: {
          userId: userId,
          activityType: ActivityType.LA_QUESTION,
          targetId: `${laQuestion.id}`,
          completed: true,
        },
      });
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
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: {
        chapters: {
          where: { chapterNumber: parseInt(chapterNumber, 10) },
        },
      },
    });

    if (!story) {
      return NextResponse.json({ message: "Story not found" }, { status: 404 });
    }

    const chapter = story.chapters[0];
    if (!chapter) {
      return NextResponse.json(
        { message: "Chapter not found" },
        { status: 404 }
      );
    }

    // Try to find or create a long answer question for this chapter
    let laQuestion = await prisma.longAnswerQuestion.findFirst({
      where: { chapterId: chapter.id },
    });

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

      laQuestion = await prisma.longAnswerQuestion.create({
        data: {
          chapterId: chapter.id,
          question: generatedQuestion.question,
        },
      });
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
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: {
        chapters: {
          where: { chapterNumber: parseInt(chapterNumber, 10) },
        },
      },
    });

    if (!story) {
      return NextResponse.json({ message: "Story not found" }, { status: 404 });
    }

    const chapter = story.chapters[0];
    if (!chapter) {
      return NextResponse.json(
        { message: "Chapter not found" },
        { status: 404 }
      );
    }

    let laQuestion = await prisma.longAnswerQuestion.findFirst({
      where: { chapterId: chapter.id },
    });
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
      laQuestion = await prisma.longAnswerQuestion.create({
        data: { chapterId: chapter.id, question: generatedQuestion.question },
      });
    }

    const targetId = `${storyId}_${chapterNumber}`;

    if (createActivity !== false) {
      // Check if there's an existing activity with old targetId format
      const oldTargetId = `${laQuestion.id}`;
      let existingActivity = await prisma.userActivity.findFirst({
        where: {
          userId,
          activityType: ActivityType.LA_QUESTION,
          targetId: oldTargetId,
        },
      });

      let activity;
      if (existingActivity) {
        // Update existing activity with new targetId format
        activity = await prisma.userActivity.update({
          where: { id: existingActivity.id },
          data: {
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
          },
        });
      } else {
        // Create new activity with new targetId format
        activity = await prisma.userActivity.upsert({
          where: {
            userId_activityType_targetId: {
              userId,
              activityType: ActivityType.LA_QUESTION,
              targetId,
            },
          },
          update: {
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
          },
          create: {
            userId,
            activityType: ActivityType.LA_QUESTION,
            targetId,
            timer: timeRecorded,
            completed: true,
            details: {
              id: targetId,
              time_recorded: timeRecorded,
              question: laQuestion.question,
              answer,
              feedback,
              created_at: new Date().toISOString(),
            },
          },
        });
      }

      // Award XP once (guard)
      if (activity) {
        const existingXpLog = await prisma.xPLog.findFirst({
          where: {
            activityId: activity.id,
            activityType: ActivityType.LA_QUESTION,
          },
        });
        if (!existingXpLog) {
          const user = await prisma.user.findUnique({ where: { id: userId } });
          if (user) {
            const updatedUser = await prisma.user.update({
              where: { id: userId },
              data: { xp: user.xp + 5 },
            });
            await prisma.xPLog.create({
              data: {
                userId,
                xpEarned: 5,
                activityId: activity.id,
                activityType: ActivityType.LA_QUESTION,
              },
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
      const mcqCount = await prisma.userActivity.count({
        where: {
          userId,
          activityType: ActivityType.MC_QUESTION,
          targetId: { startsWith: `${chapterTargetId}_mcq_` },
          completed: true,
        },
      });

      // Find SAQ using composite or legacy formats
      const saqFound = await prisma.userActivity.findFirst({
        where: {
          userId,
          activityType: ActivityType.SA_QUESTION,
          completed: true,
          OR: [
            { targetId: chapterTargetId },
            { targetId: storyId },
            { targetId: { startsWith: `${storyId}_` } },
            { details: { path: ["storyId"], equals: storyId } },
          ],
        },
      });

      // Find LAQ using composite or legacy formats
      const laqFound = await prisma.userActivity.findFirst({
        where: {
          userId,
          activityType: ActivityType.LA_QUESTION,
          completed: true,
          OR: [
            { targetId: chapterTargetId },
            { targetId: storyId },
            { targetId: { startsWith: `${storyId}_` } },
            { details: { path: ["storyId"], equals: storyId } },
          ],
        },
      });

      laQuestionCompleted = !!laqFound;

      if (mcqCount >= 5 && saqFound && laqFound) {
        try {
          const targetIdToUpsert = `${storyId}_${chapterNumber}`;
          const existingChapterRead = await prisma.userActivity.findUnique({
            where: {
              userId_activityType_targetId: {
                userId,
                activityType: ActivityType.CHAPTER_READ,
                targetId: targetIdToUpsert,
              },
            },
          });

          if (existingChapterRead) {
            await prisma.userActivity.update({
              where: { id: existingChapterRead.id },
              data: { completed: true, updatedAt: new Date() },
            });
          } else {
            await prisma.userActivity.create({
              data: {
                userId,
                activityType: ActivityType.CHAPTER_READ,
                targetId: targetIdToUpsert,
                completed: true,
              },
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
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: {
        chapters: { where: { chapterNumber: parseInt(chapterNumber, 10) } },
      },
    });

    if (!story)
      return NextResponse.json({ message: "Story not found" }, { status: 404 });
    const chapter = story.chapters[0];
    if (!chapter)
      return NextResponse.json(
        { message: "Chapter not found" },
        { status: 404 }
      );

    let laQuestion = await prisma.longAnswerQuestion.findFirst({
      where: { chapterId: chapter.id },
    });
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
      laQuestion = await prisma.longAnswerQuestion.create({
        data: { chapterId: chapter.id, question: generatedQuestion.question },
      });
    }

    const targetId = `${storyId}_${chapterNumber}`;

    // Find userActivity for this LAQ (check both old and new targetId formats)
    let userActivity = await prisma.userActivity.findFirst({
      where: {
        userId,
        activityType: ActivityType.LA_QUESTION,
        OR: [{ targetId: targetId }, { targetId: `${laQuestion.id}` }],
      },
    });

    if (!userActivity) {
      userActivity = await prisma.userActivity.create({
        data: {
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
        },
      });
    }

    // Guard XP duplicate
    const existingXPLog = await prisma.xPLog.findFirst({
      where: {
        userId,
        activityId: userActivity.id,
        activityType: ActivityType.LA_QUESTION,
      },
    });

    if (existingXPLog) {
      return NextResponse.json(
        { message: "XP already awarded for this question", xpEarned: 0 },
        { status: 200 }
      );
    }

    const xpEarned = Math.max(1, Math.floor((Number(rating) || 0) / 2));

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { xp: user.xp + xpEarned },
      });

      await prisma.xPLog.create({
        data: {
          userId,
          xpEarned,
          activityId: userActivity.id,
          activityType: ActivityType.LA_QUESTION,
        },
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
