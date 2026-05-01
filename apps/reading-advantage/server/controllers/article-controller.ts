import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { Article } from "@/components/models/article-model";
import { ExtendedNextRequest } from "./auth-controller";
import { QuizStatus } from "@prisma/client";
import { z } from "zod";
import { splitTextIntoSentences } from "@/lib/utils";
import { Translate } from "@google-cloud/translate/build/src/v2";
import { generateObject } from "ai";
import { openai, openaiModel } from "@/utils/openai";

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

    // Build Prisma query conditions
    const whereConditions: any = {
      isPublic: true,
    };

    if (type) {
      whereConditions.type = type;
    }
    if (genre) {
      whereConditions.genre = genre;
    }
    if (subgenre) {
      whereConditions.subGenre = subgenre;
    }

    // OPTIMIZED: Single query using raw SQL for better performance
    // This combines the level-range check and fallback into one query
    const queryStart = performance.now();

    // Use Prisma's raw query for optimal performance
    const userLevel = Number(level);
    const offset = (page - 1) * limit;

    const articles = await prisma.$queryRaw<any[]>`
      SELECT 
        a.id,
        a.type,
        a.genre,
        a.sub_genre as "subGenre",
        a.title,
        a.summary,
        a.cefr_level as "cefrLevel",
        a.ra_level as "raLevel",
        a.rating,
        a."createdAt" as "createdAt",
        a.author_id as "authorId",
        u.id as "author_id",
        u.name as "author_name",
        ua.completed as "userActivityCompleted",
        CASE 
          WHEN a.ra_level BETWEEN ${userLevel - 1} AND ${userLevel + 1} THEN 0
          ELSE 1
        END as priority_order
      FROM article a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN "UserActivity" ua ON ua.target_id = a.id 
        AND ua.user_id = ${userId}
        AND ua.activity_type = 'ARTICLE_READ'
      WHERE a.is_public = true
        ${type ? Prisma.sql`AND a.type = ${type}` : Prisma.empty}
        ${genre ? Prisma.sql`AND a.genre = ${genre}` : Prisma.empty}
        ${subgenre ? Prisma.sql`AND a.sub_genre = ${subgenre}` : Prisma.empty}
      ORDER BY priority_order ASC, a."createdAt" DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const queryTime = performance.now() - queryStart;

    // Format results
    results = articles.map((article) => ({
      id: article.id,
      type: article.type,
      genre: article.genre,
      subgenre: article.subGenre,
      title: article.title,
      summary: article.summary,
      cefr_level: article.cefrLevel,
      ra_level: article.raLevel?.toString(),
      average_rating: article.rating || 0,
      created_at: article.createdAt,
      is_read: article.userActivityCompleted !== null,
      is_completed: article.userActivityCompleted === true,
      is_approved: true,
      authorId: article.authorId,
      author: {
        id: article.author_id || null,
        name: article.author_name || null,
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

    // Validate the date parameter
    const validDate = date === "asc" || date === "desc" ? date : "desc";

    // Build where conditions
    const whereConditions: any = {
      isPublic: true,
    };

    if (type) {
      whereConditions.type = type;
    }
    if (genre) {
      whereConditions.genre = convertGenreToString(genre);
    }
    if (level) {
      const levelArray = convertLevelToArray(level);
      if (levelArray.length > 0) {
        whereConditions.raLevel = { in: levelArray };
      }
    }
    if (rating) {
      whereConditions.rating = {
        gte: Number(rating),
        lte: Number(rating),
      };
    }
    if (title) {
      whereConditions.title = {
        contains: title,
        mode: "insensitive",
      };
    }

    const articles = await prisma.article.findMany({
      where: whereConditions,
      orderBy: {
        createdAt: validDate === "asc" ? "asc" : "desc",
      },
      skip: (page - 1) * limitPerPage,
      take: limitPerPage,
      select: {
        id: true,
        type: true,
        genre: true,
        subGenre: true,
        title: true,
        summary: true,
        passage: true,
        imageDescription: true,
        cefrLevel: true,
        raLevel: true,
        rating: true,
        audioUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(articles, { status: 200 });
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

    // Get article from Prisma
    const article = await prisma.article.findUnique({
      where: { id: article_id },
    });

    if (!article) {
      return NextResponse.json(
        { message: "Article not found" },
        { status: 404 },
      );
    }

    // Check if user has read the article and create activity record atomically
    // Wrap in try-catch to handle race conditions when multiple requests arrive simultaneously
    try {
      await prisma.userActivity.upsert({
        where: {
          userId_activityType_targetId: {
            userId: userId,
            activityType: "ARTICLE_READ",
            targetId: article_id,
          },
        },
        create: {
          userId: userId,
          activityType: "ARTICLE_READ",
          targetId: article_id,
          completed: false,
          details: {
            articleTitle: article.title,
            level: req.session?.user.level,
          },
        },
        update: {}, // Do nothing if record already exists
      });
    } catch (error: any) {
      // Ignore unique constraint errors (P2002) - record already exists from concurrent request
      if (error.code !== "P2002") {
        console.error("Error creating user activity:", error);
        // Don't fail the request, just log the error
      }
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

    // Extract sentences (timepoints) from the article
    const articleSentences = article.sentences;

    // Format article to match expected structure
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
      read_count: 0, // This field might need to be calculated differently
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
    // Check if article exists
    const article = await prisma.article.findUnique({
      where: { id: article_id },
    });

    if (!article) {
      return NextResponse.json(
        { message: "No such article found" },
        { status: 404 },
      );
    }

    // Delete the article and all related data (Prisma cascade delete will handle related questions)
    await prisma.article.delete({
      where: { id: article_id },
    });

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
  // Define the schema for input validation
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

    const whereConditions: any = {
      isPublic: true, // Only select articles that are public
    };

    if (typeParam) {
      whereConditions.type = typeParam;
    }
    if (genreParam) {
      whereConditions.genre = genreParam;
    }
    if (subgenreParam) {
      whereConditions.subGenre = subgenreParam;
    }
    if (levelParam) {
      whereConditions.raLevel = levelParam;
    }
    if (searchTermParam) {
      whereConditions.title = {
        contains: searchTermParam,
        mode: "insensitive",
      };
    }

    // Handle cursor-based pagination
    const cursorConditions = lastDocId ? { id: { gt: lastDocId } } : {};

    const articles = await prisma.article.findMany({
      where: {
        ...whereConditions,
        ...cursorConditions,
      },
      orderBy: {
        id: "asc", // Use ID for consistent cursor pagination
      },
      take: pageSize + 1, // Take one more to check if there are more results
      select: {
        id: true,
        type: true,
        genre: true,
        subGenre: true,
        title: true,
        summary: true,
        passage: true,
        imageDescription: true,
        cefrLevel: true,
        raLevel: true,
        rating: true,
        audioUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const hasMore = articles.length > pageSize;
    const paginatedArticles = articles.slice(0, pageSize);

    // Check user activities for read status
    const articleIds = paginatedArticles.map((article) => article.id);
    const userActivities = await prisma.userActivity.findMany({
      where: {
        userId: userId,
        targetId: { in: articleIds },
        activityType: "ARTICLE_READ",
      },
    });

    const readArticleIds = new Set(
      userActivities.map((activity) => activity.targetId),
    );
    const completedArticleIds = new Set(
      userActivities
        .filter((activity) => activity.completed)
        .map((activity) => activity.targetId),
    );

    const results = paginatedArticles.map((article) => ({
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
      updated_at: article.updatedAt,
      is_read: readArticleIds.has(article.id),
      is_completed: completedArticleIds.has(article.id),
      is_approved: true,
    }));

    return {
      passages: results,
      hasMore,
      lastDocId:
        paginatedArticles.length > 0
          ? paginatedArticles[paginatedArticles.length - 1].id
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
    // This function is kept for compatibility but with Prisma,
    // we can calculate genre counts on-demand instead of pre-computing them

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
    // Calculate genre counts on-demand using Prisma
    const genreCounts = await prisma.article.groupBy({
      by: ["genre", "type"],
      _count: {
        _all: true,
      },
      where: {
        genre: { not: null },
        type: { not: null },
      },
    });

    // Transform the results to match the expected format
    const genreCountsMap: Record<string, GenreCount> = {};

    genreCounts.forEach((item) => {
      const genre = item.genre!;
      const type = item.type!;
      const count = item._count._all;

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
    // Normalize and fetch fiction genres from JSON data
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

    // Normalize and fetch nonfiction genres from JSON data
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

    // Sort genres alphabetically by label
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

    const article = await prisma.article.findUnique({
      where: { id: article_id },
      select: {
        id: true,
        summary: true,
        translatedSummary: true,
      },
    });

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

      await prisma.article.update({
        where: { id: article_id },
        data: {
          translatedSummary: updatedTranslations,
        },
      });

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
