import {
  db,
  eq,
  and,
  desc,
  asc,
  inArray,
} from '@reading-advantage/db';
import { shuffle } from "@/lib/shuffle";
import {
  articles,
  userActivity,
  multipleChoiceQuestions,
  shortAnswerQuestions,
  longAnswerQuestions,
  flashcardDecks,
  flashcardCards,
  sentencsAndWordsForFlashcards,
} from '@reading-advantage/db';
import { randomSelectGenre } from "../utils/generators/random-select-genre";
import {
  ActivityType,
  ArticleBaseCefrLevel,
  ArticleType,
  QuestionState,
} from "@/types/enum";
import { generateTopic } from "../utils/generators/topic-generator";
import { generateArticle } from "../utils/generators/article-generator";
import { evaluateRating } from "../utils/generators/evaluate-rating-generator";
import { generateImage } from "../utils/generators/image-generator";
import { generateMCQuestion } from "../utils/generators/mc-question-generator";
import { generateSAQuestion } from "../utils/generators/sa-question-generator";
import { generateLAQuestion } from "../utils/generators/la-question-generator";
import {
  generateWordList,
  WordListResponse,
} from "../utils/generators/wordlist-generator";
import { generateAudio } from "../utils/generators/audio-generator";
import { generateWordLists } from "../utils/generators/audio-word-generator";
import {
  LAQuestion,
  MCQuestion,
  QuestionResult,
  SAQuestion,
  WordList,
  Article,
} from "@/types";
import { cleanGenre, convertCefrLevel } from "@/lib/utils";
import { deleteFile } from "@/utils/storage";
import { currentUser } from "@/lib/session";
import { FlashcardType } from "@/types/enum";

interface GenerateArticleParams {
  type: ArticleType;
  level: ArticleBaseCefrLevel;
}

interface GeneratedContent {
  article: {
    title: string;
    passage: string;
    summary: string;
    brainstorming?: string | null;
    planning?: string | null;
    translatedSummary: {
      th: string;
      cn: string;
      tw: string;
      vi: string;
    };
    imageDesc?: string;
    rating: number;
    cefrLevel: string;
    topic?: string;
    isDraft?: boolean;
    isPublished?: boolean;
    isApproved?: boolean;
    type?: string | ArticleType;
    genre?: string;
    subGenre?: string;
    authorId?: string;
  };
  mcq: {
    questions: Array<{
      question: string;
      options: string[];
      answer: string;
    }>;
  };
  saq: {
    questions: Array<{
      question: string;
      answer: string;
    }>;
  };
  laq: {
    question: string;
  };
}

/**
 * Finds the stored option index for a generated answer.
 * @param options The answer options in display order.
 * @param answer The generated correct answer.
 * @returns The zero-based index of the correct answer.
 * @throws When the answer does not match an option.
 */
function getCorrectAnswer(options: string[], answer: string): number {
  const correctAnswer = options.indexOf(answer);
  if (correctAnswer < 0) throw new Error("The correct answer is not in the options");
  return correctAnswer;
}

const MAX_ATTEMPTS = 3;
const MIN_RATING = 2;

async function generateContent(
  type: ArticleType,
  level: ArticleBaseCefrLevel,
  topic: string,
  genre: string,
  subgenre: string,
): Promise<GeneratedContent> {
  const generatedArticle = await generateArticle({
    type,
    genre,
    subgenre,
    topic,
    cefrLevel: level,
  });

  const evaluatedArticle = await evaluateRating({
    passage: generatedArticle.passage,
    cefrLevel: level,
  });

  if (evaluatedArticle.rating < MIN_RATING) {
    throw new Error("Article rating too low");
  }

  const [mcq, saq, laq] = await Promise.all([
    generateMCQuestion({
      type,
      cefrlevel: level,
      passage: generatedArticle.passage,
      title: generatedArticle.title,
      summary: generatedArticle.summary,
      imageDesc: generatedArticle.imageDesc,
    }),
    generateSAQuestion({
      type,
      cefrlevel: level,
      passage: generatedArticle.passage,
      title: generatedArticle.title,
      summary: generatedArticle.summary,
      imageDesc: generatedArticle.imageDesc,
    }),
    generateLAQuestion({
      type,
      cefrlevel: level,
      passage: generatedArticle.passage,
      title: generatedArticle.title,
      summary: generatedArticle.summary,
      imageDesc: generatedArticle.imageDesc,
    }),
  ]);

  return {
    article: {
      ...generatedArticle,
      rating: evaluatedArticle.rating,
      cefrLevel: evaluatedArticle.cefrLevel as string,
    },
    mcq,
    saq,
    laq,
  };
}

/**
 * Persists generated article content and questions.
 * @param content The generated article content.
 * @returns Nothing after all records are stored.
 */
export async function saveArticleContent(
  content: GeneratedContent,
): Promise<void> {
  const { article, mcq, saq, laq } = content;
  const multipleChoiceRows = mcq.questions.map((question) => ({
    ...question,
    correctAnswer: getCorrectAnswer(question.options, question.answer),
  }));

  // First create the article to get its ID
  // Exclude fields that need transformation or don't exist in Prisma schema
  const {
    imageDesc,
    isDraft,
    isPublished,
    isApproved,
    authorId,
    ...articleData
  } = article;

  const [createdArticle] = await db.insert(articles).values({
    title: articleData.title,
    content: articleData.passage,
    passage: articleData.passage,
    summary: articleData.summary,
    translatedSummary: articleData.translatedSummary,
    imageDescription: imageDesc || "",
    genre: cleanGenre(article?.genre || ""),
    subGenre: cleanGenre(article?.subGenre || ""),
    type: article.type || "",
    cefrLevel: article.cefrLevel,
    raLevel: convertCefrLevel(article.cefrLevel),
    isDraft: isDraft || false,
    isPublished: isPublished || false,
    isApproved: isApproved || false,
    authorId,
    topic: article.topic,
    rating: article.rating,
  }).returning();

  const articleId = createdArticle.id;

  await Promise.all([
    // Generate and save image
    generateImage({
      imageDesc: article.imageDesc || "",
      articleId,
      passage: article.passage,
    }),

    // Save questions
    db.insert(longAnswerQuestions).values({
      question: laq.question,
      articleId,
    }),

    // Save short answer questions
    ...saq.questions.map((question) =>
      db.insert(shortAnswerQuestions).values({
        question: question.question,
        answer: question.answer,
        articleId,
      }),
    ),

    // Save multiple choice questions
    ...multipleChoiceRows.map((mcq) =>
      db.insert(multipleChoiceQuestions).values({
        question: mcq.question,
        options: mcq.options,
        answer: mcq.answer,
        correctAnswer: mcq.correctAnswer,
        articleId,
      }),
    ),

    // Generate word audio
    generateWordLists(articleId),
  ]);

  return;
}

export const generateQuestions = async (
  type: ArticleType,
  cefrLevel: ArticleBaseCefrLevel,
  passage: string,
  title: string,
  summary: string,
  imageDesc: string,
) => {
  const [mcq, saq, laq] = await Promise.all([
    generateMCQuestion({
      type,
      cefrlevel: cefrLevel,
      passage,
      title,
      summary,
      imageDesc,
    }),
    generateSAQuestion({
      type,
      cefrlevel: cefrLevel,
      passage,
      title,
      summary,
      imageDesc,
    }),
    generateLAQuestion({
      type,
      cefrlevel: cefrLevel,
      passage,
      title,
      summary,
      imageDesc,
    }),
  ]);
  return { mcq, saq, laq };
};

export const generateArticles = async ({
  type,
  level,
}: GenerateArticleParams): Promise<void> => {
  try {
    const randomGenre = await randomSelectGenre({ type });
    if (!randomGenre?.genre || !randomGenre?.subgenre) {
      throw new Error("Failed to generate genre");
    }

    const generatedTopic = await generateTopic({
      type,
      genre: randomGenre.genre,
      subgenre: randomGenre.subgenre,
    });

    if (!generatedTopic.topics) {
      throw new Error("Failed to generate topic");
    }

    let attempts = 0;
    let content: GeneratedContent | null = null;

    while (attempts < MAX_ATTEMPTS) {
      try {
        content = await generateContent(
          type,
          level,
          generatedTopic.topics,
          randomGenre.genre,
          randomGenre.subgenre,
        );
        break;
      } catch (error) {
        attempts++;
        if (attempts === MAX_ATTEMPTS) {
          throw new Error(
            `Failed to generate content after ${MAX_ATTEMPTS} attempts`,
          );
        }
        // Wait before retrying with exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, attempts - 1)),
        );
      }
    }

    if (!content) {
      throw new Error("Failed to generate content");
    }

    await saveArticleContent(content);
  } catch (error) {
    console.error("Error generating article:", error);
    throw error;
  }
};

export const getArticlesWithParams = async (params: {
  title?: string;
  type?: string;
  genre?: string;
  subgenre?: string;
  cefrLevel?: string;
  limit: number;
  offset: number;
}) => {
  const { title, type, genre, subgenre, cefrLevel, limit, offset } = params;

  // Build where clause incrementally.
  const whereConditions: any[] = [];
  if (title) {
    // Prisma `contains` + `mode: 'insensitive'` → ILIKE
    whereConditions.push(
       
      // Use raw SQL via drizzle's sql template literal to preserve ILIKE semantics
      // We import `sql` lazily inline for clarity.
      // @ts-ignore - inline import
      sqlIlike(articles.title, `%${title}%`),
    );
  }
  if (type) whereConditions.push(eq(articles.type, type));
  if (genre) {
    whereConditions.push(sqlIlike(articles.genre, `%${genre}%`));
  }
  if (subgenre) {
    whereConditions.push(sqlIlike(articles.subGenre, `%${subgenre}%`));
  }
  if (cefrLevel) whereConditions.push(eq(articles.cefrLevel, cefrLevel));
  // Always filter to non-draft articles.
  whereConditions.push(eq(articles.isDraft, false));

  const articlesRows = await db.select().from(articles)
    .where(whereConditions.length ? and(...whereConditions) : undefined)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(articles.createdAt));

  const [countRow] = await db.select({ value: countStar() })
    .from(articles)
    .where(whereConditions.length ? and(...whereConditions) : undefined);
  const totalArticles = Number(countRow?.value ?? 0);

  return {
    articles: articlesRows,
    totalArticles,
  };
};

// Local helpers for ILIKE + COUNT(*). Imported lazily to keep the top imports tidy.
import { sql, count as countStar, ilike as ilikeFn } from '@reading-advantage/db';
function sqlIlike(column: any, pattern: string) {
  return sql`${column} ILIKE ${pattern}`;
}
void ilikeFn; // kept for parity — actual call uses sql template above

export const getArticleById = async (articleId: string) => {
  const [article] = await db.select().from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);

  if (!article) {
    throw new Error("Article not found");
  }

  // Stitch the include shape: sentencsAndWordsForFlashcard + articleActivityLog.
  const [sentRow] = await db.select().from(sentencsAndWordsForFlashcards)
    .where(eq(sentencsAndWordsForFlashcards.articleId, articleId))
    .limit(1);

  const activityRows = await db.select().from(articleActivityLogTable)
    .where(eq(articleActivityLogTable.articleId, articleId));

  return {
    article: {
      ...article,
      sentencsAndWordsForFlashcard: sentRow ?? null,
      articleActivityLog: activityRows,
    },
  };
};

// Local import for the article activity log table (lives in primary.ts).
import { articleActivityLogs as articleActivityLogTable } from '@reading-advantage/db';

export const getQuestionsByArticleId = async (
  articleId: string,
  type: ActivityType,
): Promise<{
  questions: MCQuestion[] | SAQuestion | LAQuestion;
  result: QuestionResult;
  questionStatus: QuestionState;
}> => {
  const userId = await currentUser();

  if (!userId) {
    throw new Error("User not found");
  }

  if (!articleId) {
    throw new Error("Article ID is required");
  }

  let questionStatus: QuestionState = QuestionState.INCOMPLETE;
  let questions: MCQuestion[] | SAQuestion | LAQuestion;
  let result: QuestionResult = {
    details: {
      timer: 0,
    },
    completed: false,
  };

  try {
    // Check if questions are already completed
    const activities = await db.select().from(userActivity)
      .where(
        and(
          eq(userActivity.userId, userId.id),
          eq(userActivity.targetId, articleId),
          eq(userActivity.activityType, type),
          eq(userActivity.completed, true),
        ),
      );

    // Map activities to QuestionResult type
    if (activities.length > 0) {
      const activity = activities[0];
      result = {
        details: activity.details as {
          responses?: string[];
          progress?: number[];
          timer: number;
        },
        completed: activity.completed ?? false,
      };
      questionStatus = QuestionState.COMPLETED;
      return { questions: [] as MCQuestion[], result, questionStatus };
    }

    // Get questions based on type
    switch (type) {
      case ActivityType.MC_QUESTION: {
        const mcQuestions = await db.select().from(multipleChoiceQuestions)
          .where(eq(multipleChoiceQuestions.articleId, articleId));
        questions = shuffle(mcQuestions)
          .slice(0, 5)
          .map((q) => ({
            ...q,
            textualEvidence: q.textualEvidence || undefined,
          })) as MCQuestion[];
        break;
      }

      case ActivityType.SA_QUESTION: {
        const saQuestions = await db.select().from(shortAnswerQuestions)
          .where(eq(shortAnswerQuestions.articleId, articleId));
        if (saQuestions.length === 0) {
          throw new Error(`No SA questions found for article ${articleId}`);
        }
        questions = saQuestions[0] as SAQuestion;
        break;
      }

      case ActivityType.LA_QUESTION: {
        const laQuestions = await db.select().from(longAnswerQuestions)
          .where(eq(longAnswerQuestions.articleId, articleId));
        if (laQuestions.length === 0) {
          throw new Error(`No LA questions found for article ${articleId}`);
        }
        questions = laQuestions[0] as LAQuestion;
        break;
      }

      default:
        throw new Error(`Unsupported activity type: ${type}`);
    }

    if (!questions || (Array.isArray(questions) && questions.length === 0)) {
      questionStatus = QuestionState.ERROR;
      throw new Error(
        `No questions found for article ${articleId} and type ${type}`,
      );
    }

    return { questions, result, questionStatus };
  } catch (error) {
    questionStatus = QuestionState.ERROR;
    throw error;
  }
};

export const deleteArticleByIdModel = async (articleId: string) => {
  try {
    await db.transaction(async (tx) => {
      await tx.delete(articles).where(eq(articles.id, articleId));

      const result = await deleteFile(articleId);

      if (!result) {
        throw new Error("Failed to delete associated file");
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting article:", error);
    return { success: false };
  }
};

export const getAllFlashcards = async (userId: string) => {
  const deck = await db.select().from(flashcardDecks)
    .where(
      and(
        eq(flashcardDecks.userId, userId),
        eq(flashcardDecks.type, FlashcardType.SENTENCE),
      ),
    )
    .limit(1);

  if (!deck.length) {
    return null;
  }

  const cards = await db.select().from(flashcardCards)
    .where(eq(flashcardCards.deckId, deck[0].id));

  return { ...deck[0], cards };
};

export const deleteFlashcardById = async (flashcardId: string) => {
  const [deleted] = await db.delete(flashcardCards)
    .where(eq(flashcardCards.id, flashcardId))
    .returning();
  return deleted;
};

export const getArticleActivity = async (articleId: string) => {
  try {
    const user = await currentUser();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if already exists
    const [existingActivity] = await db.select().from(userActivity)
      .where(
        and(
          eq(userActivity.userId, user.id as string),
          eq(userActivity.targetId, articleId),
          eq(userActivity.activityType, ActivityType.ARTICLE_READ),
        ),
      )
      .limit(1);

    const [article] = await db.select({
      type: articles.type,
      genre: articles.genre,
      subGenre: articles.subGenre,
    })
      .from(articles)
      .where(eq(articles.id, articleId))
      .limit(1);

    if (!existingActivity) {
      // Create new article read activity
      await db.insert(userActivity).values({
        userId: user.id as string,
        activityType: ActivityType.ARTICLE_READ,
        targetId: articleId,
        timer: 0,
        details: {
          accessedAt: new Date(),
          type: article?.type,
          genre: article?.genre,
          subGenre: article?.subGenre,
        },
        completed: false,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error tracking article access:", error);
    return { error: "Failed to track article access" };
  }
};

/**
 * Stores generated article content as a draft.
 * @param article The generated article fields.
 * @param type The article type.
 * @param genre The article genre.
 * @param subgenre The article subgenre.
 * @returns The stored draft result.
 */
export const saveArticleAsDraftModel = async (
  article: GeneratedContent["article"],
  type: ArticleType,
  genre: string,
  subgenre: string,
) => {
  try {
    const user = await currentUser();

    if (!user) {
      throw new Error("User not found");
    }

    await db.insert(articles).values({
      title: article.title,
      content: article.passage,
      passage: article.passage,
      summary: article.summary,
      translatedSummary: article.translatedSummary,
      imageDescription: article.imageDesc || "",
      brainstorming: article.brainstorming,
      planning: article.planning,
      genre: cleanGenre(genre as string),
      subGenre: cleanGenre(subgenre as string),
      topic: article.topic,
      type,
      rating: article.rating,
      raLevel: convertCefrLevel(article.cefrLevel),
      cefrLevel: article.cefrLevel,
      isDraft: true,
      authorId: user.id as string,
    });

    return;
  } catch (error) {
    console.error("Error saving article as draft:", error);
    throw error;
  }
};

export const getCustomArticle = async (userId: string) => {
  try {
    return await db.select().from(articles)
      .where(eq(articles.authorId, userId));
  } catch (error) {
    console.error("Error getting custom article:", error);
    throw error;
  }
};

export const createdArticleCustom = async (
  article: GeneratedContent["article"],
) => {
  try {
    const user = await currentUser();

    if (!user) {
      throw new Error("User not found");
    }

    const {
      title,
      passage,
      summary,
      imageDesc,
      type,
      cefrLevel,
      genre,
      subGenre,
    } = article;

    const { mcq, saq, laq } = await generateQuestions(
      type as ArticleType,
      cefrLevel as ArticleBaseCefrLevel,
      passage,
      title,
      summary,
      imageDesc || "",
    );

    const content = {
      article: {
        ...article,
        authorId: user.id as string,
        isPublished: true,
        isApproved: true,
      },
      mcq,
      saq,
      laq,
    };

    await saveArticleContent(content);

    return;
  } catch (error) {
    console.error("Error creating custom article:", error);
    throw error;
  }
};

/**
 * Approves a custom article and stores its generated content.
 * @param articleId The custom article identifier.
 * @returns The updated article result.
 */
export const updateAprovedCustomArticle = async (articleId: string) => {
  try {
    const [article] = await db.select().from(articles)
      .where(eq(articles.id, articleId))
      .limit(1);

    if (!article) {
      throw new Error("Article not found");
    }
    if (
      !article.type ||
      !article.cefrLevel ||
      !article.passage ||
      !article.summary ||
      !article.imageDescription
    ) {
      throw new Error("Article generation fields are incomplete");
    }

    const { mcq, saq, laq } = await generateQuestions(
      article.type as ArticleType,
      article.cefrLevel as ArticleBaseCefrLevel,
      article.passage,
      article.title,
      article.summary,
      article.imageDescription,
    );
    const multipleChoiceRows = mcq.questions.map((question) => ({
      ...question,
      correctAnswer: getCorrectAnswer(question.options, question.answer),
    }));

    await Promise.all([
      // Generate and save image
      generateImage({
        imageDesc: article.imageDescription,
        articleId,
        passage: article.passage,
      }),

      // Save questions
      db.insert(longAnswerQuestions).values({
        question: laq.question,
        articleId,
      }),

      // Save short answer questions
      ...saq.questions.map((question) =>
        db.insert(shortAnswerQuestions).values({
          question: question.question,
          answer: question.answer,
          articleId,
        }),
      ),

      // Save multiple choice questions
      ...multipleChoiceRows.map((mcq) =>
        db.insert(multipleChoiceQuestions).values({
          question: mcq.question,
          options: mcq.options,
          answer: mcq.answer,
          correctAnswer: mcq.correctAnswer,
          articleId,
        }),
      ),

      // Generate word audio
      generateWordLists(articleId),
    ]);

    await db.update(articles)
      .set({
        isDraft: false,
        isPublished: true,
        isApproved: true,
        updatedAt: new Date(),
      })
      .where(eq(articles.id, articleId));

    return;
  } catch (error) {
    console.error("Error updating custom article:", error);
    throw error;
  }
};

export const checkExistingArticle = async (articleId: string) => {
  try {
    const [article] = await db.select().from(articles)
      .where(eq(articles.id, articleId))
      .limit(1);
    return article;
  } catch (error) {
    console.error("Error updating custom article:", error);
    throw error;
  }
};
