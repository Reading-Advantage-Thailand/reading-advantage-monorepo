import {
  AnswerStatus,
  QuestionState,
} from "@/components/models/questions-model";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getFeedbackWritter } from "./assistant-controller";
import { generateLAQuestion } from "../utils/generators/la-question-generator";
import { generateMCQuestion } from "../utils/generators/mc-question-generator";
import { ExtendedNextRequest } from "./auth-controller";
import { generateSAQuestion } from "../utils/generators/sa-question-generator";
import { UserXpEarned } from "@/components/models/user-activity-log-model";
import { LicenseType } from "@prisma/client";

async function getUserLicenseLevel(userId: string): Promise<LicenseType> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        licenseId: true,
        expiredDate: true,
      },
    });

    if (!user) {
      return LicenseType.BASIC;
    }

    if (user.licenseId) {
      const license = await prisma.license.findUnique({
        where: { id: user.licenseId },
        select: { licenseType: true },
      });
      return license?.licenseType || LicenseType.BASIC;
    }

    if (!user.expiredDate) {
      return LicenseType.ENTERPRISE;
    }

    const now = new Date();
    if (user.expiredDate > now) {
      return LicenseType.ENTERPRISE;
    } else {
      return LicenseType.BASIC;
    }
  } catch (error) {
    console.error("Error getting user license level:", error);
    return LicenseType.BASIC;
  }
}

async function checkAndUpdateArticleCompletion(
  userId: string,
  articleId: string
) {
  try {
    // ตรวจสอบระดับ license ของ user
    const licenseLevel = await getUserLicenseLevel(userId);
    // Find all MC_QUESTION activities for this user and filter for this article
    const userMcqActivities = await prisma.userActivity.findMany({
      where: {
        userId: userId,
        activityType: "MC_QUESTION",
        completed: true,
      },
    });

    const mcqForThisArticle = userMcqActivities.filter((activity) => {
      const details = activity.details as any;
      return details?.articleId === articleId;
    });

    const saqActivity = await prisma.userActivity.findFirst({
      where: {
        userId: userId,
        activityType: "SA_QUESTION",
        targetId: articleId,
        completed: true,
      },
    });

    const laqActivity = await prisma.userActivity.findFirst({
      where: {
        userId: userId,
        activityType: "LA_QUESTION",
        targetId: articleId,
        completed: true,
      },
    });

    const mcqCompleted = mcqForThisArticle.length >= 5;
    const saqCompleted = !!saqActivity;
    const laqCompleted = !!laqActivity;

    let allCompleted: boolean;
    // เช็คตามระดับ license
    if (licenseLevel === LicenseType.ENTERPRISE) {
      // สำหรับ ENTERPRISE ต้องทำครบทั้ง MCQ, SAQ และ LAQ
      allCompleted = mcqCompleted && saqCompleted && laqCompleted;
    } else {
      // สำหรับ BASIC และ PREMIUM ต้องทำ MCQ และ SAQ เท่านั้น
      allCompleted = mcqCompleted && saqCompleted;
    }

    if (allCompleted) {
      const existingArticleRead = await prisma.userActivity.findUnique({
        where: {
          userId_activityType_targetId: {
            userId: userId,
            activityType: "ARTICLE_READ",
            targetId: articleId,
          },
        },
      });

      if (existingArticleRead) {
        await prisma.userActivity.update({
          where: { id: existingArticleRead.id },
          data: {
            completed: true,
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.userActivity.create({
          data: {
            userId: userId,
            activityType: "ARTICLE_READ",
            targetId: articleId,
            completed: true,
            details: {
              articleId: articleId,
              allQuestionsCompleted: true,
            },
          },
        });
      }
    }
  } catch (error) {
    console.error("Error checking article completion:", error);
  }
}

interface RequestContext {
  params: Promise<{
    article_id: string;
  }>;
}

interface SubRequestContext {
  params: Promise<{
    article_id: string;
    question_id: string;
  }>;
}

export async function getMCQuestions(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  const { article_id } = await ctx.params;
  try {
    const userId = req.session?.user.id as string;

    if (!userId) {
      return NextResponse.json(
        {
          message: "User not authenticated",
          state: QuestionState.LOADING,
          total: 5,
          progress: [
            AnswerStatus.UNANSWERED,
            AnswerStatus.UNANSWERED,
            AnswerStatus.UNANSWERED,
            AnswerStatus.UNANSWERED,
            AnswerStatus.UNANSWERED,
          ],
          results: [],
        },
        { status: 401 }
      );
    }

    let questions = await prisma.multipleChoiceQuestion.findMany({
      where: { articleId: article_id },
    });

    if (questions.length === 0) {
      const article = await prisma.article.findUnique({
        where: { id: article_id },
      });

      if (!article) {
        return NextResponse.json(
          { message: "Article not found" },
          { status: 404 }
        );
      }

      const cefrlevel = article.cefrLevel?.replace(/[+-]/g, "") as any;

      const generateMCQ = await generateMCQuestion({
        cefrlevel: cefrlevel,
        type: article.type as any,
        passage: article.passage || "",
        title: article.title || "",
        summary: article.summary || "",
        imageDesc: article.imageDescription || "",
      });

      const questionsToCreate = generateMCQ.questions.slice(0, 5);
      for (const question of questionsToCreate) {
        await prisma.multipleChoiceQuestion.create({
          data: {
            articleId: article_id,
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
        where: { articleId: article_id },
      });
    }

    // Fetch all MCQ activities for this user and filter by articleId in details
    // to ensure we find activities regardless of how targetId is set.
    const allUserActivities = await prisma.userActivity.findMany({
      where: {
        userId: userId,
        activityType: "MC_QUESTION",
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const articleActivities = allUserActivities.filter((activity) => {
      const details = activity.details as any;
      return details?.articleId === article_id;
    });

    // Get XP logs for these activities
    const activityIds = articleActivities.map(activity => activity.id);
    const xpLogs = await prisma.xPLog.findMany({
      where: {
        activityId: { in: activityIds },
        activityType: "MC_QUESTION",
      },
    });

    const xpLogMap = new Map(xpLogs.map(log => [log.activityId, log]));

    const progress: AnswerStatus[] = [];
    const answeredQuestionIds = new Set();
    const questionAnswers = new Map();
    const questionData = new Map(); // เก็บข้อมูลเพิ่มเติมของแต่ละคำถาม

    // สร้าง progress array ตามลำดับการตอบ (createdAt) แทนการใช้ question order
    const sortedActivities = articleActivities.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    sortedActivities.forEach((activity) => {
      const details = typeof activity.details === 'string' ? JSON.parse(activity.details) : activity.details as any;
      const questionId = details?.questionId || activity.targetId;
      if (questionId) {
        answeredQuestionIds.add(questionId);
        questionAnswers.set(questionId, details.isCorrect);
        
        const xpLog = xpLogMap.get(activity.id);
        questionData.set(questionId, {
          timer: activity.timer,
          xpEarned: xpLog?.xpEarned || 0,
          selectedAnswer: details.selectedAnswer,
          correctAnswer: details.correctAnswer,
          textualEvidence: details.textualEvidence,
          createdAt: activity.createdAt,
        });

        // เพิ่ม progress ตามลำดับการตอบ
        progress.push(
          details.isCorrect ? AnswerStatus.CORRECT : AnswerStatus.INCORRECT
        );
      }
    });

    // เติม UNANSWERED สำหรับคำถามที่ยังไม่ได้ตอบ
    while (progress.length < 5) {
      progress.push(AnswerStatus.UNANSWERED);
    }

    const currentQuestionIndex = progress.findIndex(
      (p) => p === AnswerStatus.UNANSWERED
    );

    if (currentQuestionIndex === -1) {
      // คำนวณ total XP ที่ได้รับทั้งหมด
      const totalXpEarned = Array.from(questionData.values())
        .reduce((total, data) => total + (data.xpEarned || 0), 0);

      // คำนวณ total timer ที่ใช้ทั้งหมด
      const totalTimer = Array.from(questionData.values())
        .reduce((total, data) => total + (data.timer || 0), 0);

      const responseData = {
        state: QuestionState.COMPLETED,
        total: 5,
        progress,
        results: [], // ไม่ส่ง results เมื่อ complete แล้ว
        summary: {
          totalXpEarned,
          totalTimer,
          correctAnswers: progress.filter(p => p === AnswerStatus.CORRECT).length,
          incorrectAnswers: progress.filter(p => p === AnswerStatus.INCORRECT).length,
        },
      };

      return new NextResponse(JSON.stringify(responseData), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Identify answered and unanswered questions
    const answeredQuestions = questions.filter(q => answeredQuestionIds.has(q.id));
    const unansweredFromPool = questions.filter(q => !answeredQuestionIds.has(q.id));
    
    // Shuffle the pool of unanswered questions to provide variety from the database
    const shuffledUnanswered = unansweredFromPool.sort(() => Math.random() - 0.5);
    
    // Construct the set of 5 questions: prioritize questions already answered, 
    // then fill with random questions from the pool.
    const questionsForThisArticle = [...answeredQuestions, ...shuffledUnanswered].slice(0, 5);

    const unansweredQuestions = questionsForThisArticle.filter(
      (question) => !answeredQuestionIds.has(question.id)
    );

    if (unansweredQuestions.length === 0) {
      const responseData = {
        state: QuestionState.INCOMPLETE,
        total: 5,
        progress,
        results: [],
      };

      return new NextResponse(JSON.stringify(responseData), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    const mcq = questionsForThisArticle.map((q, index) => {
      const qData = questionData.get(q.id) || {};
      const options = [...q.options];
      return {
        id: q.id,
        question: q.question,
        options: options.sort(() => 0.5 - Math.random()),
        textual_evidence: q.textualEvidence,
        timer: qData.timer || null,
        xpEarned: qData.xpEarned || 0,
        selectedAnswer: qData.selectedAnswer || null,
        correctAnswer: qData.correctAnswer || null,
        question_number: index + 1,
      };
    });

    // คำนวณ summary สำหรับคำถามที่ตอบไปแล้ว
    const answeredQuestionData = Array.from(questionData.values());
    const totalXpEarned = answeredQuestionData
      .reduce((total, data) => total + (data.xpEarned || 0), 0);
    const totalTimer = answeredQuestionData
      .reduce((total, data) => total + (data.timer || 0), 0);

    const responseData = {
      state: QuestionState.INCOMPLETE,
      total: 5,
      progress,
      results: mcq,
      summary: {
        totalXpEarned,
        totalTimer,
        correctAnswers: progress.filter(p => p === AnswerStatus.CORRECT).length,
        incorrectAnswers: progress.filter(p => p === AnswerStatus.INCORRECT).length,
        currentQuestion: progress.filter(p => p !== AnswerStatus.UNANSWERED).length + 1,
      },
    };

    return new NextResponse(JSON.stringify(responseData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function getSAQuestion(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  const { article_id } = await ctx.params;
  try {
    const userId = req.session?.user.id as string;

    const existingActivity = await prisma.userActivity.findFirst({
      where: {
        userId: userId,
        activityType: "SA_QUESTION",
        completed: true,
        details: {
          path: ["articleId"],
          equals: article_id,
        },
      },
    });

    let activityWithDetails = existingActivity;
    if (!activityWithDetails) {
      activityWithDetails = await prisma.userActivity.findFirst({
        where: {
          userId: userId,
          activityType: "SA_QUESTION",
          targetId: article_id,
          completed: true,
        },
      });
    }

    if (activityWithDetails) {
      const details = activityWithDetails.details as any;
      return NextResponse.json(
        {
          message: "User already answered",
          result: {
            id: details?.questionId || "",
            question: details?.question || "",
          },
          suggested_answer: details?.suggested_answer || "",
          state: QuestionState.COMPLETED,
          answer: details?.answer || "",
        },
        { status: 200 }
      );
    }

    let questions = await prisma.shortAnswerQuestion.findMany({
      where: { articleId: article_id },
    });

    if (questions.length === 0) {
      const article = await prisma.article.findUnique({
        where: { id: article_id },
      });

      if (!article) {
        return NextResponse.json(
          { message: "Article not found" },
          { status: 404 }
        );
      }

      const cefrlevel = article.cefrLevel?.replace(/[+-]/g, "") as any;

      const generateSAQ = await generateSAQuestion({
        cefrlevel: cefrlevel,
        type: article.type as any,
        passage: article.passage || "",
        title: article.title || "",
        summary: article.summary || "",
        imageDesc: article.imageDescription || "",
      });

      for (const question of generateSAQ.questions) {
        await prisma.shortAnswerQuestion.create({
          data: {
            articleId: article_id,
            question: question.question,
            answer: question.suggested_answer || "",
          },
        });
      }

      questions = await prisma.shortAnswerQuestion.findMany({
        where: { articleId: article_id },
      });
    }

    const randomQuestion =
      questions[Math.floor(Math.random() * questions.length)];

    return NextResponse.json(
      {
        state: QuestionState.INCOMPLETE,
        result: {
          id: randomQuestion.id,
          question: randomQuestion.question,
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

export async function answerSAQuestion(
  req: ExtendedNextRequest,
  ctx: SubRequestContext
) {
  try {
    const { article_id, question_id } = await ctx.params;
    const { answer, timeRecorded } = await req.json();
    const userId = req.session?.user.id as string;

    const question = await prisma.shortAnswerQuestion.findUnique({
      where: { id: question_id },
    });

    if (!question) {
      return NextResponse.json(
        { message: "Question not found" },
        { status: 404 }
      );
    }

    const existingActivity = await prisma.userActivity.findUnique({
      where: {
        userId_activityType_targetId: {
          userId: userId,
          activityType: "SA_QUESTION",
          targetId: article_id,
        },
      },
    });

    let activity;
    if (existingActivity) {
      activity = await prisma.userActivity.update({
        where: { id: existingActivity.id },
        data: {
          completed: true,
          timer: timeRecorded,
          details: {
            questionId: question_id,
            question: question.question,
            answer: answer,
            suggested_answer: question.answer,
            articleId: article_id,
          },
          updatedAt: new Date(),
        },
      });
    } else {
      activity = await prisma.userActivity.create({
        data: {
          userId: userId,
          activityType: "SA_QUESTION",
          targetId: article_id,
          completed: true,
          timer: timeRecorded,
          details: {
            questionId: question_id,
            question: question.question,
            answer: answer,
            suggested_answer: question.answer,
            articleId: article_id,
          },
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user) {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { xp: user.xp + 3 },
      });

      await prisma.xPLog.create({
        data: {
          userId: userId,
          xpEarned: 3,
          activityId: activity.id,
          activityType: "SA_QUESTION",
        },
      });

      if (req.session?.user) {
        req.session.user.xp = updatedUser.xp;
      }
    }

    await checkAndUpdateArticleCompletion(userId, article_id);

    return NextResponse.json(
      {
        state: QuestionState.COMPLETED,
        answer,
        suggested_answer: question.answer,
        xpEarned: 3,
        userXp: req.session?.user.xp,
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

export async function getLAQuestion(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  const { article_id } = await ctx.params;
  try {
    const userId = req.session?.user.id as string;

    const existingActivity = await prisma.userActivity.findFirst({
      where: {
        userId: userId,
        activityType: "LA_QUESTION",
        targetId: article_id,
        completed: true,
      },
    });

    if (existingActivity) {
      const details = existingActivity.details as any;
      return NextResponse.json(
        {
          message: "User already answered",
          result: {
            id: details?.questionId,
            question: details?.question,
          },
          state: QuestionState.COMPLETED,
          answer: details?.answer,
        },
        { status: 400 }
      );
    }

    let questions = await prisma.longAnswerQuestion.findMany({
      where: { articleId: article_id },
    });

    if (questions.length === 0) {
      const article = await prisma.article.findUnique({
        where: { id: article_id },
      });

      if (!article) {
        return NextResponse.json(
          { message: "Article not found" },
          { status: 404 }
        );
      }

      const cefrlevel = article.cefrLevel?.replace(/[+-]/g, "") as any;

      const generateLAQ = await generateLAQuestion({
        cefrlevel: cefrlevel,
        type: article.type as any,
        passage: article.passage || "",
        title: article.title || "",
        summary: article.summary || "",
        imageDesc: article.imageDescription || "",
      });

      await prisma.longAnswerQuestion.create({
        data: {
          articleId: article_id,
          question: generateLAQ.question,
        },
      });

      questions = await prisma.longAnswerQuestion.findMany({
        where: { articleId: article_id },
      });
    }

    const randomQuestion =
      questions[Math.floor(Math.random() * questions.length)];

    return NextResponse.json(
      {
        state: QuestionState.INCOMPLETE,
        result: {
          id: randomQuestion.id,
          question: randomQuestion.question,
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

export async function answerMCQuestion(
  req: ExtendedNextRequest,
  ctx: SubRequestContext
) {
  try {
    const { article_id, question_id } = await ctx.params;
    const { selectedAnswer, timeRecorded } = await req.json();
    const userId = req.session?.user.id as string;

    const question = await prisma.multipleChoiceQuestion.findUnique({
      where: { id: question_id },
    });

    if (!question) {
      return NextResponse.json(
        { message: "Question not found" },
        { status: 404 }
      );
    }

    const isCorrect = selectedAnswer === question.answer;

    const existingActivity = await prisma.userActivity.findUnique({
      where: {
        userId_activityType_targetId: {
          userId: userId,
          activityType: "MC_QUESTION",
          targetId: question_id,
        },
      },
    });

    let activity;
    if (existingActivity) {
      activity = await prisma.userActivity.update({
        where: { id: existingActivity.id },
        data: {
          completed: true,
          timer: timeRecorded,
          details: {
            questionId: question_id,
            articleId: article_id,
            question: question.question,
            selectedAnswer: selectedAnswer,
            correctAnswer: question.answer,
            textualEvidence: question.textualEvidence,
            isCorrect: isCorrect,
          },
          updatedAt: new Date(),
        },
      });
    } else {
      activity = await prisma.userActivity.create({
        data: {
          userId: userId,
          activityType: "MC_QUESTION",
          targetId: question_id,
          completed: true,
          timer: timeRecorded,
          details: {
            questionId: question_id,
            articleId: article_id,
            question: question.question,
            selectedAnswer: selectedAnswer,
            correctAnswer: question.answer,
            textualEvidence: question.textualEvidence,
            isCorrect: isCorrect,
          },
        },
      });
    }

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
            activityType: "MC_QUESTION",
          },
        });
      }
    }

    await checkAndUpdateArticleCompletion(userId, article_id);

    const responseData = {
      correct: isCorrect,
      correctAnswer: question.answer,
      textualEvidence: question.textualEvidence,
      xpEarned: isCorrect ? 1 : 0,
      userXp: req.session?.user.xp,
    };

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error("Error in answerMCQuestion:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function retakeMCQuestion(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  const { article_id } = await ctx.params;
  try {
    const userId = req.session?.user.id as string;

    // Delete all MC_QUESTION activities for this user that belong to this article
    const allUserActivities = await prisma.userActivity.findMany({
      where: {
        userId: userId,
        activityType: "MC_QUESTION",
      },
    });

    const articleActivityIds = allUserActivities
      .filter((activity) => {
        const details = activity.details as any;
        return details?.articleId === article_id;
      })
      .map((activity) => activity.id);

    if (articleActivityIds.length > 0) {
      await prisma.xPLog.deleteMany({
        where: {
          userId: userId,
          activityType: "MC_QUESTION",
          activityId: {
            in: articleActivityIds,
          },
        },
      });

      const remainingXpLogs = await prisma.xPLog.findMany({
        where: {
          userId: userId,
        },
      });

      const totalXp = remainingXpLogs.reduce(
        (sum, log) => sum + log.xpEarned,
        0
      );

      await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          xp: totalXp,
        },
      });

      if (req.session?.user) {
        req.session.user.xp = totalXp;
      }
    }

    if (articleActivityIds.length > 0) {
      await prisma.userActivity.deleteMany({
        where: {
          id: {
            in: articleActivityIds,
          },
        },
      });
    }

    return NextResponse.json(
      { message: "MCQ progress reset successfully" },
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

export async function answerLAQuestion(
  req: ExtendedNextRequest,
  ctx: SubRequestContext
) {
  try {
    const { article_id, question_id } = await ctx.params;
    const { answer, feedback, timeRecorded } = await req.json();
    const userId = req.session?.user.id as string;

    const question = await prisma.longAnswerQuestion.findUnique({
      where: { id: question_id },
    });

    if (!question) {
      return NextResponse.json(
        { message: "Question not found" },
        { status: 404 }
      );
    }

    await prisma.userActivity.upsert({
      where: {
        userId_activityType_targetId: {
          userId: userId,
          activityType: "LA_QUESTION",
          targetId: article_id,
        },
      },
      update: {
        completed: true,
        timer: timeRecorded,
        details: {
          questionId: question_id,
          question: question.question,
          answer: answer,
          feedback: feedback,
        },
        updatedAt: new Date(),
      },
      create: {
        userId: userId,
        activityType: "LA_QUESTION",
        targetId: article_id,
        completed: true,
        timer: timeRecorded,
        details: {
          questionId: question_id,
          question: question.question,
          answer: answer,
          feedback: feedback,
        },
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    let scores: number[] = [];
    let sumScores = 0;

    if (feedback && feedback.scores && typeof feedback.scores === "object") {
      scores = Object.values(feedback.scores);
      sumScores = scores.reduce<number>((a, b) => a + b, 0);
    }

    await checkAndUpdateArticleCompletion(userId, article_id);

    return NextResponse.json(
      {
        state: QuestionState.COMPLETED,
        answer,
        result: feedback,
        sumScores,
        userXp: user.xp,
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

export async function getFeedbackLAquestion(
  req: ExtendedNextRequest,
  ctx: SubRequestContext
) {
  try {
    const { article_id, question_id } = await ctx.params;
    const { answer, preferredLanguage } = await req.json();

    const question = await prisma.longAnswerQuestion.findUnique({
      where: { id: question_id },
    });

    const article = await prisma.article.findUnique({
      where: { id: article_id },
    });

    if (!question || !article) {
      return NextResponse.json(
        { message: "Question or article not found" },
        { status: 404 }
      );
    }

    const cefrLevelReformatted =
      article.cefrLevel?.replace(/[+-]/g, "") || "A1";

    const getFeedback = await getFeedbackWritter({
      preferredLanguage,
      targetCEFRLevel: cefrLevelReformatted,
      readingPassage: article.passage || "",
      writingPrompt: question.question,
      studentResponse: answer,
    });

    if (!getFeedback.ok) {
      throw new Error(
        `Feedback generation failed with status: ${getFeedback.status}`
      );
    }

    const getData = await getFeedback.json();

    if (!getData || typeof getData !== "object") {
      throw new Error("Invalid feedback data received");
    }

    let randomExamples = "";
    if (
      getData.exampleRevisions &&
      Array.isArray(getData.exampleRevisions) &&
      getData.exampleRevisions.length > 0
    ) {
      randomExamples =
        getData.exampleRevisions[
          Math.floor(Math.random() * getData.exampleRevisions.length)
        ];
    } else {
      const scores = getData.scores
        ? (Object.values(getData.scores) as number[])
        : [];
      const averageScore =
        scores.length > 0
          ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length
          : 0;

      if (averageScore >= 4) {
        randomExamples =
          "Excellent work! Your writing meets the expectations for this level. Keep practicing to maintain this high standard.";
      } else {
        randomExamples =
          "No specific revisions needed at this time. Your writing is good for your level.";
      }
    }

    const result = { ...getData, exampleRevisions: randomExamples };

    return NextResponse.json(
      {
        state: QuestionState.INCOMPLETE,
        result,
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

export async function rateArticle(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  const { article_id } = await ctx.params;
  try {
    const { rating } = await req.json();
    const userId = req.session?.user.id as string;

    const activity = await prisma.userActivity.create({
      data: {
        userId: userId,
        activityType: "ARTICLE_RATING",
        targetId: article_id,
        completed: true,
        details: {
          rating: rating,
        },
      },
    });

    return NextResponse.json(
      { message: "Article rated successfully" },
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

export async function getLAQuestionXP(
  req: ExtendedNextRequest,
  ctx: SubRequestContext
) {
  try {
    const { article_id, question_id } = await ctx.params;
    const { rating } = await req.json();
    const userId = req.session?.user.id as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Find the UserActivity for this LA_QUESTION
    const userActivity = await prisma.userActivity.findUnique({
      where: {
        userId_activityType_targetId: {
          userId: userId,
          activityType: "LA_QUESTION",
          targetId: article_id,
        },
      },
    });

    if (!userActivity) {
      return NextResponse.json({ message: "User activity not found" }, { status: 404 });
    }

    const existingXPLog = await prisma.xPLog.findFirst({
      where: {
        userId: userId,
        activityId: userActivity.id,
        activityType: "LA_QUESTION",
      },
    });

    if (existingXPLog) {
      return NextResponse.json(
        { message: "XP already awarded for this question", xpEarned: 0 },
        { status: 200 }
      );
    }

    const xpEarned = Math.max(1, Math.floor(rating / 2));

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { xp: user.xp + xpEarned },
    });

    await prisma.xPLog.create({
      data: {
        userId: userId,
        xpEarned: xpEarned,
        activityId: userActivity.id,
        activityType: "LA_QUESTION",
      },
    });

    if (req.session?.user) {
      req.session.user.xp = updatedUser.xp;
    }

    return NextResponse.json(
      {
        message: "XP awarded successfully",
        xpEarned: xpEarned,
        userXp: updatedUser.xp,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error awarding LAQ XP:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function rateSAQuestion(
  req: ExtendedNextRequest,
  ctx: SubRequestContext
) {
  try {
    const { article_id, question_id } = await ctx.params;
    const { rating } = await req.json();
    const userId = req.session?.user.id as string;

    const existingRating = await prisma.userActivity.findFirst({
      where: {
        userId: userId,
        activityType: "ARTICLE_RATING",
        targetId: question_id,
        completed: true,
        details: {
          path: ["questionId"],
          equals: question_id,
        },
      },
    });

    if (existingRating) {
      return NextResponse.json(
        { message: "Rating already submitted", xpEarned: 0 },
        { status: 200 }
      );
    }

    const activity = await prisma.userActivity.create({
      data: {
        userId: userId,
        activityType: "ARTICLE_RATING",
        targetId: question_id,
        completed: true,
        details: {
          questionId: question_id,
          articleId: article_id,
          rating: rating,
          type: "SA_QUESTION_RATING",
        },
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user) {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { xp: user.xp + rating },
      });

      await prisma.xPLog.create({
        data: {
          userId: userId,
          xpEarned: rating,
          activityId: activity.id,
          activityType: "ARTICLE_RATING",
        },
      });

      if (req.session?.user) {
        req.session.user.xp = updatedUser.xp;
      }
    }

    return NextResponse.json(
      {
        message: "Rating submitted successfully",
        xpEarned: rating,
        userXp: req.session?.user.xp,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error submitting SAQ rating:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
