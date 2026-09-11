/**
 * Article Service
 *
 * Server-side article loading shared by the article API controller and the
 * server page components. Pages call this directly instead of fetching their
 * own app over HTTP.
 */

import { db, eq } from "@reading-advantage/db";
import { articles, userActivity } from "@reading-advantage/db/schema";

export interface FormattedArticle {
  id: string;
  type: string;
  genre: string;
  subgenre: string;
  title: string;
  summary: string;
  passage: string;
  image_description: string;
  cefr_level: string;
  ra_level: number;
  average_rating: number;
  audio_url: string | null;
  created_at: Date;
  timepoints: Record<string, any>;
  translatedPassage: any;
  translatedSummary: any;
  read_count: number;
}

export type ArticleForReaderResult =
  | { ok: true; article: FormattedArticle }
  | { ok: false; status: number; message: string; invalids?: Record<string, boolean> };

/**
 * Loads one article for the reading page and records the ARTICLE_READ
 * activity. Mirrors the GET /api/v1/articles/:article_id behavior.
 * @param articleId The article id.
 * @param userId The reading user's id.
 * @param userLevel The reading user's level.
 * @returns The formatted article or a structured error.
 */
export async function getArticleForReader(
  articleId: string,
  userId: string,
  userLevel?: number | null,
): Promise<ArticleForReaderResult> {
  try {
    const [article] = await db
      .select()
      .from(articles)
      .where(eq(articles.id, articleId))
      .limit(1);

    if (!article) {
      return { ok: false, status: 404, message: "Article not found" };
    }

    // Record the read activity atomically. A conflicting concurrent insert
    // is expected and must not fail the request.
    try {
      await db
        .insert(userActivity)
        .values({
          userId,
          activityType: "ARTICLE_READ",
          targetId: articleId,
          completed: false,
          details: {
            articleTitle: article.title,
            level: userLevel,
          },
        })
        .onConflictDoNothing();
    } catch (error) {
      console.error("Error creating user activity:", error);
    }

    if (
      !article.summary ||
      !article.imageDescription ||
      !article.passage ||
      !article.createdAt ||
      (article.rating !== 0 && !article.rating) ||
      !article.type ||
      !article.title ||
      !article.cefrLevel ||
      !article.raLevel ||
      !article.subGenre ||
      !article.genre ||
      !article.id
    ) {
      return {
        ok: false,
        status: 400,
        message: "Article fields are not correct",
        invalids: {
          summary: !article.summary,
          image_description: !article.imageDescription,
          passage: !article.passage,
          created_at: !article.createdAt,
          average_rating: !article.rating && article.rating !== 0,
          type: !article.type,
          title: !article.title,
          cefr_level: !article.cefrLevel,
          ra_level: !article.raLevel,
          subgenre: !article.subGenre,
          genre: !article.genre,
          id: !article.id,
        },
      };
    }

    const formattedArticle: FormattedArticle = {
      id: article.id,
      type: article.type,
      genre: article.genre,
      subgenre: article.subGenre,
      title: article.title,
      summary: article.summary,
      passage: article.passage,
      image_description: article.imageDescription,
      cefr_level: article.cefrLevel,
      ra_level: article.raLevel,
      average_rating: article.rating || 0,
      audio_url: article.audioUrl,
      created_at: article.createdAt,
      timepoints: article.sentences || {},
      translatedPassage: article.translatedPassage,
      translatedSummary: article.translatedSummary,
      read_count: 0,
    };

    return { ok: true, article: formattedArticle };
  } catch (err) {
    console.error("Error getting documents", err);
    return {
      ok: false,
      status: 500,
      message: "[getArticle] Internal server error",
    };
  }
}
