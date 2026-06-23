import { db, eq, and, isNull } from '@reading-advantage/db';
import { currentUser } from "@/lib/session";
import { articles, lessonProgress, articleActivityLogs } from '@reading-advantage/db';

/**
 * Get an article by ID for standalone lesson (without assignment).
 *
 * Returns the article plus its sentence/word flashcard payload and the
 * per-question tables (multiple choice / short answer / long answer).
 */
export async function getArticleForLesson(articleId: string) {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error("User is not authenticated");
    }

    const [article] = await db
      .select()
      .from(articles)
      .where(eq(articles.id, articleId))
      .limit(1);

    if (!article) {
      throw new Error("Article not found");
    }

    // Attach related rows that the original Prisma `include` stitched together.
    // We load each table independently and merge the fields onto the article
    // so that downstream code (Phase 4-5) sees the same shape it used to.
    const [sentences, mcqs, saqs, laqs] = await Promise.all([
      db.select().from(sentencsAndWordsForFlashcards)
        .where(eq(sentencsAndWordsForFlashcards.articleId, articleId))
        .limit(1),
      db.select().from(multipleChoiceQuestions)
        .where(eq(multipleChoiceQuestions.articleId, articleId)),
      db.select().from(shortAnswerQuestions)
        .where(eq(shortAnswerQuestions.articleId, articleId)),
      db.select().from(longAnswerQuestions)
        .where(eq(longAnswerQuestions.articleId, articleId)),
    ]);

    return {
      ...article,
      sentencsAndWordsForFlashcard: sentences[0] ?? null,
      multipleChoiceQuestions: mcqs,
      shortAnswerQuestions: saqs,
      longAnswerQuestions: laqs,
    };
  } catch (error) {
    console.error("Model Error - getArticleForLesson:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to get article for lesson");
  }
}

// Local table alias — the lesson-model originally used `sentencsAndWordsForFlashcard`
// (singular) which matches the Prisma model name. In the Drizzle schema the table is
// `sentencsAndWordsForFlashcards` (plural). We import the plural form here.
import {
  sentencsAndWordsForFlashcards,
  multipleChoiceQuestions,
  shortAnswerQuestions,
  longAnswerQuestions,
} from '@reading-advantage/db';

/**
 * Update user lesson progress for standalone lessons (without assignment).
 */
export async function updateStandaloneLessonProgress(
  userId: string,
  articleId: string,
  progress: number,
  timeSpent: number,
) {
  try {
    const [existingProgress] = await db
      .select()
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, userId),
          eq(lessonProgress.articleId, articleId),
          isNull(lessonProgress.assignmentId),
        ),
      )
      .limit(1);

    if (existingProgress) {
      // Update existing progress
      await db
        .update(lessonProgress)
        .set({
          progress,
          timeSpent,
          isCompleted: progress === 100,
          updatedAt: new Date(),
        })
        .where(eq(lessonProgress.id, existingProgress.id));
    } else {
      // Create new progress record (and ensure an article activity log exists)
      await db.transaction(async (tx) => {
        await tx.insert(lessonProgress).values({
          userId,
          articleId,
          assignmentId: null,
          progress,
          timeSpent,
          isCompleted: progress === 100,
        });

        const [existingActivity] = await tx
          .select()
          .from(articleActivityLogs)
          .where(
            and(
              eq(articleActivityLogs.articleId, articleId),
              eq(articleActivityLogs.userId, userId),
            ),
          )
          .limit(1);

        if (!existingActivity) {
          await tx.insert(articleActivityLogs).values({
            articleId,
            userId,
          });
        }
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Model Error - updateStandaloneLessonProgress:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to update standalone lesson progress");
  }
}

/**
 * Get user progress for a standalone lesson.
 */
export async function getStandaloneLessonProgress(
  userId: string,
  articleId: string,
) {
  try {
    const [progress] = await db
      .select()
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, userId),
          eq(lessonProgress.articleId, articleId),
          isNull(lessonProgress.assignmentId),
        ),
      )
      .limit(1);

    // Return default progress if not found
    if (!progress) {
      return {
        progress: 0,
        timeSpent: 0,
        isCompleted: false,
      };
    }

    return progress;
  } catch (error) {
    console.error("Model Error - getStandaloneLessonProgress:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to get standalone lesson progress");
  }
}

/**
 * Get article activity for standalone lesson (used for sentence activities).
 * The original Prisma `select` clause projected only the four `is*Completed`
 * columns — we keep that shape.
 */
export async function getArticleActivity(articleId: string, userId: string) {
  try {
    const [activity] = await db
      .select({
        isSentenceMatchingCompleted: articleActivityLogs.isSentenceMatchingCompleted,
        isSentenceOrderingCompleted: articleActivityLogs.isSentenceOrderingCompleted,
        isSentenceWordOrderingCompleted: articleActivityLogs.isSentenceWordOrderingCompleted,
        isSentenceClozeTestCompleted: articleActivityLogs.isSentenceClozeTestCompleted,
      })
      .from(articleActivityLogs)
      .where(
        and(
          eq(articleActivityLogs.articleId, articleId),
          eq(articleActivityLogs.userId, userId),
        ),
      )
      .limit(1);

    // Return default values if not found
    if (!activity) {
      return {
        isSentenceMatchingCompleted: false,
        isSentenceOrderingCompleted: false,
        isSentenceWordOrderingCompleted: false,
        isSentenceClozeTestCompleted: false,
      };
    }

    return activity;
  } catch (error) {
    console.error("Model Error - getArticleActivity:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to get article activity");
  }
}