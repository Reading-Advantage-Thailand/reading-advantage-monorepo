import { STUDENT_MCQ_COUNT, STUDENT_SAQ_COUNT, studentQuestionSet } from "@reading-advantage/domain/primary-books";
import {
  db,
  eq,
  and,
  desc,
} from '@reading-advantage/db';
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
import {
  ActivityType,
  QuestionState,
} from "@/types/enum";
import {
  LAQuestion,
  MCQuestion,
  QuestionResult,
  SAQuestion,
  Article,
} from "@/types";
import { currentUser } from "@/lib/session";
import { FlashcardType } from "@/types/enum";

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

/** Raised by getArticleById when no article has the id (the message stays "Article not found"). */
export class ArticleNotFoundError extends Error {
  constructor() {
    super("Article not found");
    this.name = "ArticleNotFoundError";
  }
}

/**
 * Loads an article with its flashcard sentences and words and the activity log rows of one user.
 * The logs of other users never leave this function (they would reach the browser).
 * @param articleId The article.
 * @param userId The signed-in user; without a user the article has no log rows.
 * @returns The article with `sentencsAndWordsForFlashcard` and `articleActivityLog`.
 * @throws {ArticleNotFoundError} When no article has the id.
 */
export const getArticleById = async (articleId: string, userId?: string) => {
  const [article] = await db.select().from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);

  if (!article) {
    throw new ArticleNotFoundError();
  }

  // Stitch the include shape: sentencsAndWordsForFlashcard + articleActivityLog.
  const [sentRow] = await db.select().from(sentencsAndWordsForFlashcards)
    .where(eq(sentencsAndWordsForFlashcards.articleId, articleId))
    .limit(1);

  const activityRows = userId
    ? await db.select().from(articleActivityLogTable)
      .where(and(eq(articleActivityLogTable.articleId, articleId), eq(articleActivityLogTable.userId, userId)))
    : [];

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

/**
 * Builds the answer for an article that has no questions of one type.
 * @param result The empty result to return.
 * @returns No questions with the EMPTY state.
 */
function noQuestions(result: QuestionResult) {
  return { questions: [] as MCQuestion[], result, questionStatus: QuestionState.EMPTY };
}

/**
 * Loads the questions of one type for an article, or the stored result when the student has
 * finished them. An article with no questions of the type gives the EMPTY state.
 * @param articleId The article.
 * @param type The question activity type.
 * @returns The questions, the result, and the question state.
 * @throws When no user is signed in, the article id is empty, the type is unknown, or a query fails.
 */
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
        questions = studentQuestionSet(mcQuestions, STUDENT_MCQ_COUNT)
          .map((q) => ({
            ...q,
            textualEvidence: q.textualEvidence || undefined,
          })) as MCQuestion[];
        break;
      }

      case ActivityType.SA_QUESTION: {
        const saQuestions = await db.select().from(shortAnswerQuestions)
          .where(eq(shortAnswerQuestions.articleId, articleId));
        if (saQuestions.length === 0) return noQuestions(result);
        questions = studentQuestionSet(saQuestions, STUDENT_SAQ_COUNT)[0] as SAQuestion;
        break;
      }

      case ActivityType.LA_QUESTION: {
        const laQuestions = await db.select().from(longAnswerQuestions)
          .where(eq(longAnswerQuestions.articleId, articleId));
        if (laQuestions.length === 0) return noQuestions(result);
        questions = laQuestions[0] as LAQuestion;
        break;
      }

      default:
        throw new Error(`Unsupported activity type: ${type}`);
    }

    // An article without questions of this type still renders (audit S2): no throw.
    if (!questions || (Array.isArray(questions) && questions.length === 0)) {
      return noQuestions(result);
    }

    return { questions, result, questionStatus };
  } catch (error) {
    questionStatus = QuestionState.ERROR;
    throw error;
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
