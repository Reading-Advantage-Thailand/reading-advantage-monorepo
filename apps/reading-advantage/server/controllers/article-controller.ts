import { NextRequest, NextResponse } from "next/server";
import { ExtendedNextRequest } from "./auth-controller";
import { z } from "zod";
import { splitTextIntoSentences } from "@/lib/utils";
import { Translate } from "@google-cloud/translate/build/src/v2";
import { generateObject } from "ai";
import { openai, openaiModel } from "@/utils/openai";
import {
  db,
  eq,
  and,
  gt,
  gte,
  lte,
  isNotNull,
  ilike,
  inArray,
  desc,
  asc,
  sql,
} from "@reading-advantage/db";
import { articles, users, userActivity } from "@reading-advantage/db/schema";

// Import genre data
import genreData from "@/data/type-genre.json";

const genresFiction = { Genres: genreData.fiction };
const genresNonfiction = { Genres: genreData.nonfiction };

// GET article by id
// GET /api/articles/[id]
interface RequestContext {
  params: Promise<{
    article_id: string;
  }>;
}

interface GenreCount {
  genre: string;
  fiction?: number;
  nonFiction?: number;
}

interface GenreDocument {
  name: string;
  subgenres: string[];
}

interface GenreResponse {
  value: string;
  label: string;
  subgenres: string[];
}

interface GenresResponse {
  fiction: GenreResponse[];
  nonfiction: GenreResponse[];
}

const nameToValue = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // remove special characters
    .replace(/\s+/g, "-") // replace spaces with hyphens
    .trim();
};

// GET search articles
// GET /api/articles?level=10&type=fiction&genre=Fantasy
// GET /api/v1/articles?type=nonfiction&genre=Career+Guides&subgenre=Career+Change&page=1&limit=10 <--when scroll down

export async function getSearchArticles(req: ExtendedNextRequest) {
  try {
    const userId = req.session?.user.id as string;
    const level = req.session?.user.level?.toString();
    const type = req.nextUrl.searchParams.get("type");
    const genre = req.nextUrl.searchParams.get("genre");
    const subgenre = req.nextUrl.searchParams.get("subgenre");
    const page = Number(req.nextUrl.searchParams.get("page")) || 1;
    const limit = Number(req.nextUrl.searchParams.get("limit")) || 10;
    let selectionType: any[] = ["fiction", "nonfiction"];
    let results: any[] = [];

    if (!level) {
      return NextResponse.json(
        { message: "Level is required" },
        { status: 400 },
      );
    }

    const normalizeGenreDoc = (doc: any) => {
      const name = doc.Name ?? doc.name ?? "";
      const subgenres = doc.Subgenres ?? doc.subgenres ?? [];
      return { Name: name, Subgenres: subgenres };
    };

    const fetchGenres = async (type: string, genre?: string | null) => {
      const genreData = type === "fiction" ? genresFiction : genresNonfiction;
      const rawGenres = genreData.Genres || [];
      const allGenres = rawGenres.map(normalizeGenreDoc);

      if (genre) {
        const genreItem = allGenres.find((data: any) => {
          if (data.Name === genre) return true;
          const slug = nameToValue(data.Name);
          if (slug === genre) return true;
          return false;
        });
        if (genreItem) {
          return genreItem.Subgenres || [];
        }
      }

      return allGenres.map((data: any) => data.Name);
    };

    if (!type) {
      selectionType = ["fiction", "nonfiction"];
    } else if (type && !genre) {
      selectionType = await fetchGenres(type);
    } else if (type && genre) {
      selectionType = await fetchGenres(type, genre);
    }

    const queryStart = performance.now();

    const userLevel = Number(level);
    const offset = (page - 1) * limit;

    const priorityOrder = sql<number>`CASE WHEN ${articles.raLevel} BETWEEN ${userLevel - 1} AND ${userLevel + 1} THEN 0 ELSE 1 END`;

    const rows = await db
      .select({
        id: articles.id,
        type: articles.type,
        genre: articles.genre,
        subGenre: articles.subGenre,
        title: articles.title,
        summary: articles.summary,
        cefrLevel: articles.cefrLevel,
        raLevel: articles.raLevel,
        rating: articles.rating,
        createdAt: articles.createdAt,
        authorId: articles.authorId,
        authorName: users.name,
        userActivityCompleted: userActivity.completed,
      })
      .from(articles)
      .leftJoin(users, eq(articles.authorId, users.id))
      .leftJoin(
        userActivity,
        and(
          eq(userActivity.targetId, articles.id),
          eq(userActivity.userId, userId),
          eq(userActivity.activityType, "ARTICLE_READ"),
        ),
      )
      .where(
        and(
          eq(articles.isPublic, true),
          type ? eq(articles.type, type) : undefined,
          genre ? eq(articles.genre, genre) : undefined,
          subgenre ? eq(articles.subGenre, subgenre) : undefined,
        ),
      )
      .orderBy(priorityOrder, desc(articles.createdAt))
      .limit(limit)
      .offset(offset);

    const queryTime = performance.now() - queryStart;

    results = rows.map((r) => ({
      id: r.id,
      type: r.type,
      genre: r.genre,
      subgenre: r.subGenre,
      title: r.title,
      summary: r.summary,
      cefr_level: r.cefrLevel,
      ra_level: r.raLevel?.toString(),
      average_rating: r.rating || 0,
      created_at: r.createdAt,
      is_read: r.userActivityCompleted !== null,
      is_completed: r.userActivityCompleted === true,
      is_approved: true,
      authorId: r.authorId,
      author: {
        id: r.authorId || null,
        name: r.authorName || null,
      },
    }));

    return NextResponse.json({
      params: {
        level,
        type,
        genre,
        subgenre,
        page,
        limit,
      },
      results,
      selectionType,
    });
  } catch (err) {
    console.error("Error getting documents", err);
    return NextResponse.json(
      {
        message: "[getSearchArticlesOptimized] Internal server error",
        results: [],
        selectionType: ["fiction", "nonfiction"],
        error: err,
      },
      { status: 500 },
    );
  }
}

export async function getArticles(req: ExtendedNextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const title = searchParams.get("title");
    const date = searchParams.get("date");
    const rating = searchParams.get("rating");
    const type = searchParams.get("type");
    const genre = searchParams.get("genre");
    const level = searchParams.get("level");
    const page = Number(searchParams.get("page")) || 1;
    const limitPerPage = 10;

    const convertLevelToArray = (value: string | null) => {
      if (!value) return [];
      return value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "")
        .map((item) => Number(item));
    };

    const convertGenreToString = (value: string | null) => {
      return value ? value.replace(/\+/g, " ") : "";
    };

    const validDate = date === "asc" || date === "desc" ? date : "desc";

    const levelArray = level ? convertLevelToArray(level) : [];

    const rows = await db
      .select({
        id: articles.id,
        type: articles.type,
        genre: articles.genre,
        subGenre: articles.subGenre,
        title: articles.title,
        summary: articles.summary,
        passage: articles.passage,
        imageDescription: articles.imageDescription,
        cefrLevel: articles.cefrLevel,
        raLevel: articles.raLevel,
        rating: articles.rating,
        audioUrl: articles.audioUrl,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt,
      })
      .from(articles)
      .where(
        and(
          eq(articles.isPublic, true),
          type ? eq(articles.type, type) : undefined,
          genre ? eq(articles.genre, convertGenreToString(genre)) : undefined,
          level && levelArray.length > 0
            ? inArray(articles.raLevel, levelArray)
            : undefined,
          rating
            ? and(
                gte(articles.rating, Number(rating)),
                lte(articles.rating, Number(rating)),
              )
            : undefined,
          title ? ilike(articles.title, `%${title}%`) : undefined,
        ),
      )
      .orderBy(
        validDate === "asc" ? asc(articles.createdAt) : desc(articles.createdAt),
      )
      .limit(limitPerPage)
      .offset((page - 1) * limitPerPage);

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error", error: error },
      { status: 500 },
    );
  }
}

export async function getArticleById(
  req: ExtendedNextRequest,
  ctx: RequestContext,
) {
  try {
    const { article_id } = await ctx.params;
    const userId = req.session?.user.id as string;

    const [article] = await db
      .select()
      .from(articles)
      .where(eq(articles.id, article_id))
      .limit(1);

    if (!article) {
      return NextResponse.json(
        { message: "Article not found" },
        { status: 404 },
      );
    }

    // Check if user has read the article and create activity record atomically
    // Wrap in try-catch to handle race conditions when multiple requests arrive simultaneously
    try {
      await db
        .insert(userActivity)
        .values({
          userId,
          activityType: "ARTICLE_READ",
          targetId: article_id,
          completed: false,
          details: {
            articleTitle: article.title,
            level: req.session?.user.level,
          },
        })
        .onConflictDoNothing();
    } catch (error: any) {
      console.error("Error creating user activity:", error);
      // Don't fail the request, just log the error
    }

    // Validate article data
    if (
      !article ||
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
      return NextResponse.json(
        {
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
        },
        { status: 400 },
      );
    }

    const articleSentences = article.sentences;

    const formattedArticle = {
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
      timepoints: articleSentences || {},
      translatedPassage: article.translatedPassage,
      translatedSummary: article.translatedSummary,
      read_count: 0,
    };

    return NextResponse.json(
      {
        article: formattedArticle,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("Error getting documents", err);
    return NextResponse.json(
      { message: "[getArticle] Internal server error", error: err },
      { status: 500 },
    );
  }
}

export async function deleteArticle(
  req: ExtendedNextRequest,
  ctx: { params: Promise<{ article_id: string }> },
) {
  try {
    const { article_id } = await ctx.params;

    const [existing] = await db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.id, article_id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { message: "No such article found" },
        { status: 404 },
      );
    }

    await db.delete(articles).where(eq(articles.id, article_id));

    return NextResponse.json({ message: "Article deleted" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting article", error);
    return NextResponse.json(
      { message: "Internal server error", error: error },
      { status: 500 },
    );
  }
}

export async function getArticleWithParams(req: ExtendedNextRequest) {
  const QueryParamsSchema = z.object({
    userId: z.string().max(50),
    pageSize: z.number().int().positive().max(10),
    typeParam: z.string().min(0).max(50).nullable(),
    genreParam: z.string().min(0).max(50).nullable(),
    subgenreParam: z.string().min(0).max(50).nullable(),
    levelParam: z.number().int().min(0).max(50).nullable(),
    lastDocId: z.string().nullable(),
    searchTermParam: z.string().min(0).max(100).nullable(),
  });

  type QueryParams = z.infer<typeof QueryParamsSchema>;

  function validateQueryParams(params: QueryParams): QueryParams {
    try {
      return QueryParamsSchema.parse(params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors
          .map((err) => `${err.path.join(".")}: ${err.message}`)
          .join(", ");
        throw new Error(`Invalid input parameters: ${errorMessages}`);
      }
      throw error;
    }
  }

  async function fetchArticles(params: {
    userId: string;
    pageSize: number;
    typeParam: string;
    genreParam: string;
    subgenreParam: string;
    levelParam: number;
    lastDocId: string | null;
    searchTermParam: string;
  }) {
    const validatedParams = validateQueryParams(params);

    const {
      userId,
      pageSize,
      typeParam,
      genreParam,
      subgenreParam,
      levelParam,
      lastDocId,
      searchTermParam,
    } = validatedParams;

    const rows = await db
      .select({
        id: articles.id,
        type: articles.type,
        genre: articles.genre,
        subGenre: articles.subGenre,
        title: articles.title,
        summary: articles.summary,
        passage: articles.passage,
        imageDescription: articles.imageDescription,
        cefrLevel: articles.cefrLevel,
        raLevel: articles.raLevel,
        rating: articles.rating,
        audioUrl: articles.audioUrl,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt,
      })
      .from(articles)
      .where(
        and(
          eq(articles.isPublic, true),
          typeParam ? eq(articles.type, typeParam) : undefined,
          genreParam ? eq(articles.genre, genreParam) : undefined,
          subgenreParam ? eq(articles.subGenre, subgenreParam) : undefined,
          levelParam ? eq(articles.raLevel, levelParam) : undefined,
          searchTermParam
            ? ilike(articles.title, `%${searchTermParam}%`)
            : undefined,
          lastDocId ? gt(articles.id, lastDocId) : undefined,
        ),
      )
      .orderBy(asc(articles.id))
      .limit(pageSize + 1);

    const hasMore = rows.length > pageSize;
    const paginatedRows = rows.slice(0, pageSize);

    const articleIds = paginatedRows.map((r) => r.id);
    const activityRows =
      articleIds.length > 0
        ? await db
            .select({
              targetId: userActivity.targetId,
              completed: userActivity.completed,
            })
            .from(userActivity)
            .where(
              and(
                eq(userActivity.userId, userId),
                inArray(userActivity.targetId, articleIds),
                eq(userActivity.activityType, "ARTICLE_READ"),
              ),
            )
        : [];

    const readArticleIds = new Set(activityRows.map((a) => a.targetId));
    const completedArticleIds = new Set(
      activityRows.filter((a) => a.completed).map((a) => a.targetId),
    );

    const results = paginatedRows.map((r) => ({
      id: r.id,
      type: r.type,
      genre: r.genre,
      subgenre: r.subGenre,
      title: r.title,
      summary: r.summary,
      passage: r.passage,
      image_description: r.imageDescription,
      cefr_level: r.cefrLevel,
      ra_level: r.raLevel,
      average_rating: r.rating || 0,
      audio_url: r.audioUrl,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
      is_read: readArticleIds.has(r.id),
      is_completed: completedArticleIds.has(r.id),
      is_approved: true,
    }));

    return {
      passages: results,
      hasMore,
      lastDocId:
        paginatedRows.length > 0
          ? paginatedRows[paginatedRows.length - 1].id
          : null,
    };
  }

  try {
    const userId = req.session?.user.id as string;
    const url = new URL(req.url);
    const searchParams = new URLSearchParams(url.searchParams);
    const pageSize = 10;
    const typeParam = searchParams.get("type") || "";
    const genreParam = searchParams.get("genre") || "";
    const subgenreParam = searchParams.get("subgenre") || "";
    const levelParam = Number(searchParams.get("level"));
    const lastDocId = searchParams.get("lastDocId");
    const searchTermParam = searchParams.get("searchTerm") || "";

    const params = {
      userId,
      pageSize,
      typeParam,
      genreParam,
      subgenreParam,
      levelParam,
      lastDocId,
      searchTermParam,
    };

    const data = await fetchArticles(params);

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("Detailed error:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        error: error.message || error.toString(),
      },
      { status: 500 },
    );
  }
}

export async function updateArticlesByTypeGenre(
  req: Request,
): Promise<Response> {
  try {
    return NextResponse.json(
      { message: "Updated successfully" },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("Error updating articles summary:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function getArticlesByTypeGenre(req: Request): Promise<Response> {
  try {
    const genreCountRows = await db
      .select({
        genre: articles.genre,
        type: articles.type,
        count: sql<number>`count(*)::int`,
      })
      .from(articles)
      .where(and(isNotNull(articles.genre), isNotNull(articles.type)))
      .groupBy(articles.genre, articles.type);

    const genreCountsMap: Record<string, GenreCount> = {};

    genreCountRows.forEach((item) => {
      const genre = item.genre!;
      const type = item.type!;
      const count = item.count;

      if (!genreCountsMap[genre]) {
        genreCountsMap[genre] = { genre };
      }

      if (type.toLowerCase() === "fiction") {
        genreCountsMap[genre].fiction = count;
      } else {
        genreCountsMap[genre].nonFiction = count;
      }
    });

    const resultData = Object.values(genreCountsMap);

    return NextResponse.json(resultData, { status: 200 });
  } catch (error: unknown) {
    console.error("Error fetching articles summary:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export const getGenres = async (req: Request): Promise<Response> => {
  try {
    const rawFiction = genresFiction.Genres || [];
    const fictionGenres: GenreResponse[] = rawFiction.map((genreData: any) => {
      const normalized = {
        Name: genreData.Name ?? genreData.name ?? "",
        Subgenres: genreData.Subgenres ?? genreData.subgenres ?? [],
      };
      return {
        value: nameToValue(normalized.Name),
        label: normalized.Name,
        subgenres: normalized.Subgenres || [],
      };
    });

    const rawNonfiction = genresNonfiction.Genres || [];
    const nonfictionGenres: GenreResponse[] = rawNonfiction.map(
      (genreData: any) => {
        const normalized = {
          Name: genreData.Name ?? genreData.name ?? "",
          Subgenres: genreData.Subgenres ?? genreData.subgenres ?? [],
        };
        return {
          value: nameToValue(normalized.Name),
          label: normalized.Name,
          subgenres: normalized.Subgenres || [],
        };
      },
    );

    fictionGenres.sort((a, b) => a.label.localeCompare(b.label));
    nonfictionGenres.sort((a, b) => a.label.localeCompare(b.label));

    const response: GenresResponse = {
      fiction: fictionGenres,
      nonfiction: nonfictionGenres,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error fetching genres:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch genres",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
};

export enum LanguageType {
  TH = "th",
  EN = "en",
  CN = "cn",
  TW = "tw",
  VI = "vi",
}

async function translatePassageWithGoogle(
  sentences: string[],
  targetLanguage: string,
): Promise<string[]> {
  const translate = new Translate({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  });

  const translatedSentences: string[] = [];

  for (const sentence of sentences) {
    if (sentence.trim()) {
      const [translation] = await translate.translate(sentence, {
        to: getGoogleTranslateCode(targetLanguage),
      });
      translatedSentences.push(translation);
    } else {
      translatedSentences.push(sentence);
    }
  }

  return translatedSentences;
}

async function translatePassageWithGPT(sentences: string[]): Promise<string[]> {
  const translatedSentences: string[] = [];

  for (const sentence of sentences) {
    if (sentence.trim()) {
      const { object } = await generateObject({
        model: openai(openaiModel),
        schema: z.object({
          translated_text: z.string(),
        }),
        prompt: `Translate the following text to English: "${sentence}"`,
      });
      translatedSentences.push(object.translated_text);
    } else {
      translatedSentences.push(sentence);
    }
  }

  return translatedSentences;
}

function getGoogleTranslateCode(languageType: string): string {
  switch (languageType) {
    case "cn":
      return "zh-CN";
    case "tw":
      return "zh-TW";
    case "th":
      return "th";
    case "vi":
      return "vi";
    default:
      return languageType;
  }
}

// POST translate article summary
// POST /api/v1/articles/[article_id]/translate
interface TranslateRequestContext {
  params: Promise<{
    article_id: string;
  }>;
}

export const translateArticleSummary = async (
  request: NextRequest,
  ctx: TranslateRequestContext,
) => {
  try {
    const { article_id } = await ctx.params;
    const { targetLanguage } = await request.json();

    if (!Object.values(LanguageType).includes(targetLanguage)) {
      return NextResponse.json(
        {
          message: "Invalid target language",
        },
        { status: 400 },
      );
    }

    const [article] = await db
      .select({
        id: articles.id,
        summary: articles.summary,
        translatedSummary: articles.translatedSummary,
      })
      .from(articles)
      .where(eq(articles.id, article_id))
      .limit(1);

    if (!article) {
      return NextResponse.json(
        {
          message: "Article not found",
        },
        { status: 404 },
      );
    }

    if (!article.summary) {
      return NextResponse.json(
        {
          message: "Article summary not found",
        },
        { status: 404 },
      );
    }

    const existingTranslations = article.translatedSummary as Record<
      string,
      string[]
    > | null;

    if (existingTranslations && existingTranslations[targetLanguage]) {
      return NextResponse.json({
        message: "article already translated",
        translated_sentences: existingTranslations[targetLanguage],
      });
    }

    const sentences = splitTextIntoSentences(article.summary);
    let translatedSentences: string[] = [];

    try {
      if (targetLanguage === LanguageType.EN) {
        translatedSentences = await translatePassageWithGPT(sentences);
      } else {
        translatedSentences = await translatePassageWithGoogle(
          sentences,
          targetLanguage,
        );
      }

      const updatedTranslations = {
        ...(existingTranslations || {}),
        [targetLanguage]: translatedSentences,
      };

      await db
        .update(articles)
        .set({ translatedSummary: updatedTranslations })
        .where(eq(articles.id, article_id));

      return NextResponse.json({
        message: "translation successful",
        translated_sentences: translatedSentences,
      });
    } catch (translationError) {
      console.error("Translation error:", translationError);
      return NextResponse.json(
        {
          message: "Translation failed",
          error:
            translationError instanceof Error
              ? translationError.message
              : "Unknown error",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
};
