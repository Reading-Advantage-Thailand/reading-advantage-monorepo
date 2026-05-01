import { prisma } from "@/lib/prisma";
import { splitTextIntoSentences } from "@/lib/utils";
import { Translate } from "@google-cloud/translate/build/src/v2";
import { generateObject } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { openai, openaiModel } from "@/utils/openai";
import { google, googleModel } from "@/utils/google";

interface RequestContext {
  params: Promise<{
    article_id: string;
  }>;
}

export enum LanguageType {
  TH = "th",
  EN = "en",
  CN = "zh-CN",
  TW = "zh-TW",
  VI = "vi",
}

export type TranslateResponse = {
  translated_sentences: string[];
};

export async function translate(request: NextRequest, ctx: RequestContext) {
  const { article_id } = await ctx.params;
  const { type, targetLanguage } = await request.json();

  if (!Object.values(LanguageType).includes(targetLanguage)) {
    return NextResponse.json(
      {
        message: "Invalid target language",
      },
      { status: 400 }
    );
  }

  let article: any = await prisma.article.findUnique({
    where: { id: article_id },
    select: {
      id: true,
      summary: true,
      translatedSummary: true,
      passage: true,
      translatedPassage: true,
      sentences: true,
    },
  });

  let isChapter = false;

  if (!article) {
    article = await prisma.chapter.findUnique({
      where: { id: article_id },
      select: {
        id: true,
        summary: true,
        translatedSummary: true,
        passage: true,
        translatedPassage: true,
        sentences: true,
      },
    });
    isChapter = !!article;
  }

  if (!article) {
    return NextResponse.json(
      {
        message: "Article or Chapter not found",
      },
      { status: 404 }
    );
  }

  if (type === "summary") {
    const existingTranslations = article.translatedSummary as Record<
      string,
      string[]
    > | null;
    if (
      existingTranslations &&
      existingTranslations[targetLanguage]?.length > 0
    ) {
      return NextResponse.json({
        message: "Translation already exists",
        translated_sentences: existingTranslations[targetLanguage],
      });
    }
    const content = article.summary;
    if (!content) {
      return NextResponse.json(
        { message: "Summary not found" },
        { status: 404 }
      );
    }
    const sentences = splitTextIntoSentences(content);
    try {
      const temp = await translatePassageWithGoogle(sentences, targetLanguage);
      const translatedSentences =
        temp[targetLanguage as keyof typeof temp] || [];
      const updatedTranslations = {
        ...(existingTranslations || {}),
        [targetLanguage]: translatedSentences,
      };

      if (isChapter) {
        await prisma.chapter.update({
          where: { id: article_id },
          data: { translatedSummary: updatedTranslations },
        });
      } else {
        await prisma.article.update({
          where: { id: article_id },
          data: { translatedSummary: updatedTranslations },
        });
      }
      return NextResponse.json({
        message: "Translation successful",
        translated_sentences: translatedSentences,
      });
    } catch (error) {
      return NextResponse.json({ message: error }, { status: 500 });
    }
  } else if (type === "passage") {
    const existingTranslations = article.translatedPassage as Record<
      string,
      string[]
    > | null;
    if (
      existingTranslations &&
      existingTranslations[targetLanguage]?.length > 0
    ) {
      return NextResponse.json({
        message: "Translation already exists",
        translated_sentences: existingTranslations[targetLanguage],
      });
    }

    // Extract sentences from article.sentences JSON field
    let sentences: string[] = [];

    if (article.sentences) {
      if (Array.isArray(article.sentences)) {
        // The sentences field contains an array of objects with 'sentences' property
        // Example: [{"file":"...","index":0,"sentences":"People like to travel.",...}, ...]
        sentences = (article.sentences as any[])
          .map((item: any) => {
            // Each item might have a 'sentences' property (note: it's called 'sentences' but contains a single sentence)
            if (item && typeof item === "object" && item.sentences) {
              return typeof item.sentences === "string" ? item.sentences : "";
            }
            // Fallback: if item is a string itself
            if (typeof item === "string") {
              return item;
            }
            return "";
          })
          .filter((s: string) => s.trim().length > 0);
      }
    }

    console.log(
      `Extracted ${sentences.length} sentences from article.sentences field`
    );

    if (sentences.length === 0) {
      return NextResponse.json(
        { message: "No sentences found in article" },
        { status: 404 }
      );
    }

    try {
      const temp = await translatePassageWithGPT(sentences, targetLanguage);
      const translatedSentences =
        temp[targetLanguage as keyof typeof temp] || [];

      // Always include EN sentences in translatedPassage
      const updatedTranslations = {
        ...(existingTranslations || {}),
        en: existingTranslations?.en || sentences, // Keep original EN sentences
        [targetLanguage]: translatedSentences,
      };

      if (isChapter) {
        await prisma.chapter.update({
          where: { id: article_id },
          data: { translatedPassage: updatedTranslations },
        });
      } else {
        await prisma.article.update({
          where: { id: article_id },
          data: { translatedPassage: updatedTranslations },
        });
      }
      return NextResponse.json({
        message: "Translation successful",
        translated_sentences: translatedSentences,
      });
    } catch (error) {
      return NextResponse.json({ message: error }, { status: 500 });
    }
  } else {
    return NextResponse.json({ message: "Invalid type" }, { status: 400 });
  }
}

export async function translateForPrint(request: NextRequest) {
  const { passage, targetLanguage } = await request.json();

  let paragraphs: string[];
  try {
    const parsed = JSON.parse(passage);
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      typeof parsed[0] === "object" &&
      "sentences" in parsed[0]
    ) {
      paragraphs = parsed.map((s: any) => s.sentences);
    } else {
      paragraphs = passage.split("\n\n");
    }
  } catch {
    paragraphs = passage.split("\n\n");
  }

  if (!Object.values(LanguageType).includes(targetLanguage)) {
    return NextResponse.json(
      {
        message: "Invalid target language",
      },
      { status: 400 }
    );
  }

  let translated: {
    cn: string[];
    en: string[];
    th: string[];
    tw: string[];
    vi: string[];
  };
  try {
    const temp = await translatePassageWithGoogle(paragraphs, targetLanguage);
    const translatedSentences = temp[targetLanguage as keyof typeof temp] || [];
    return NextResponse.json({
      message: "translation successful",
      translated_sentences: translatedSentences,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error,
      },
      { status: 500 }
    );
  }
}

async function translatePassageWithGoogle(
  sentences: string[],
  targetLanguage: string
): Promise<Record<string, string[]>> {
  const translate = new Translate({
    projectId: process.env.GOOGLE_PROJECT_ID,
    key: process.env.GOOGLE_TEXT_TO_SPEECH_API_KEY,
  });

  const result: Record<string, string[]> = {
    en: sentences,
  };

  if (targetLanguage !== "en") {
    const [translations] = await translate.translate(sentences, targetLanguage);
    if (!translations) {
      throw new Error("error translating passage with Google");
    }
    if (translations.length !== sentences.length) {
      throw new Error(
        "translated sentences length does not match original sentences length"
      );
    }
    result[targetLanguage] = translations;
  }

  return result;
}

async function translatePassageWithGPT(
  sentences: string[],
  targetLanguage: LanguageType,
  maxRetries: number = 3
): Promise<Record<string, string[]>> {
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // For large number of sentences, translate in batches to improve accuracy
      const batchSize = 20;
      const batches: string[][] = [];

      for (let i = 0; i < sentences.length; i += batchSize) {
        batches.push(sentences.slice(i, i + batchSize));
      }

      const allTranslations: string[] = [];

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];

        // Create a numbered list of sentences for better GPT tracking
        const numberedSentences = batch
          .map((s, i) => `${i + 1}. ${s}`)
          .join("\n");

        const userPrompt = `Translate the following ${batch.length} numbered sentences into ${targetLanguage}. 
Return EXACTLY ${batch.length} translations in the same order, one translation per sentence.

Sentences:
${numberedSentences}`;

        const schema = z.object({
          translations: z
            .array(z.string())
            .length(batch.length)
            .describe(
              `Exactly ${batch.length} ${targetLanguage} translations, one per sentence`
            ),
        });

        const { object: response } = await generateObject({
          model: google(googleModel),
          schema,
          system: `You are a professional translator. You will receive ${batch.length} numbered sentences.
Your task: Translate each sentence into ${targetLanguage} and return EXACTLY ${batch.length} translations in order.
Rules:
- Maintain exact sentence count: ${batch.length} in, ${batch.length} out
- Preserve sentence structure - do NOT merge or split sentences
- Keep the same order as input
- Each translation should correspond 1-to-1 with each input sentence`,
          prompt: userPrompt,
        });

        // Ensure the response array matches the batch sentence count
        if (response.translations.length !== batch.length) {
          throw new Error(
            `Mismatch in batch ${batchIndex + 1}: expected ${batch.length} translations, got ${response.translations.length}`
          );
        }

        allTranslations.push(...response.translations);
      }

      // Final validation
      if (allTranslations.length !== sentences.length) {
        throw new Error(
          `Total mismatch: expected ${sentences.length} translations, got ${allTranslations.length}`
        );
      }

      const result: Record<string, string[]> = {
        en: sentences,
      };

      result[targetLanguage] = allTranslations;

      return result;
    } catch (error) {
      lastError = error;
      console.error(
        `Error generating translated passage (attempt ${attempt}/${maxRetries}):`,
        error
      );

      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s...
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  // If all retries failed, throw the error to be handled by calling function
  throw new Error(
    `Failed to generate translated passage after ${maxRetries} attempts: ${lastError?.message || "Unknown error"}`
  );
}

export async function translateChapterContent(
  request: NextRequest,
  ctx: { params: Promise<{ storyId: string; chapterNumber: string }> }
) {
  const { storyId, chapterNumber } = await ctx.params;
  const { type, targetLanguage } = await request.json();

  if (!Object.values(LanguageType).includes(targetLanguage)) {
    return NextResponse.json(
      { message: "Invalid target language" },
      { status: 400 }
    );
  }

  if (!storyId || typeof storyId !== "string") {
    return NextResponse.json({ message: "Invalid storyId" }, { status: 400 });
  }

  const chapterNum = parseInt(chapterNumber, 10);
  if (isNaN(chapterNum)) {
    return NextResponse.json(
      { message: "Invalid chapter number" },
      { status: 400 }
    );
  }

  const chapter = await prisma.chapter.findUnique({
    where: {
      storyId_chapterNumber: {
        storyId,
        chapterNumber: chapterNum,
      },
    },
  });

  if (!chapter) {
    return NextResponse.json({ message: "Chapter not found" }, { status: 404 });
  }

  if (type === "summary") {
    const existingTranslations = chapter.translatedSummary as Record<
      string,
      string[]
    > | null;

    if (
      existingTranslations &&
      existingTranslations[targetLanguage] &&
      existingTranslations[targetLanguage].length > 0
    ) {
      return NextResponse.json({
        message: "Chapter summary already translated",
        translated_sentences: existingTranslations[targetLanguage],
      });
    }

    if (!chapter.summary) {
      return NextResponse.json(
        { message: "Chapter summary not found" },
        { status: 404 }
      );
    }

    const sentences = splitTextIntoSentences(chapter.summary);
    let translated: Record<string, string[]>;
    try {
      translated = await translatePassageWithGPT(sentences, targetLanguage);

      const updatedTranslations = {
        ...(existingTranslations || {}),
        ...translated,
      };

      await prisma.chapter.update({
        where: {
          storyId_chapterNumber: {
            storyId,
            chapterNumber: chapterNum,
          },
        },
        data: {
          translatedSummary: updatedTranslations,
        },
      });

      return NextResponse.json({
        message: "Translation successful",
        translated_sentences: translated[targetLanguage] || [],
      });
    } catch (error) {
      console.error("Translation error:", error);
      return NextResponse.json(
        { message: "Translation failed" },
        { status: 500 }
      );
    }
  }

  if (type === "content") {
    const existingTranslations = chapter.translatedPassage as Record<
      string,
      string[]
    > | null;

    const translationsForTarget =
      existingTranslations?.[targetLanguage as string] ?? [];

    if (translationsForTarget.length > 0) {
      return NextResponse.json({
        message: "Chapter content already translated",
        translated_sentences: translationsForTarget,
      });
    }

    if (!chapter.passage) {
      return NextResponse.json(
        { message: "Chapter passage not found" },
        { status: 404 }
      );
    }

    let sentences: string[] = [];

    if (Array.isArray(chapter.sentences)) {
      // Normalize possible shapes into a flat string[] for translation
      sentences = (chapter.sentences as any[]).flatMap((s: any) => {
        if (typeof s === "string") return [s];
        if (Array.isArray(s)) return s;
        if (s && typeof s === "object" && s.sentences) {
          return Array.isArray(s.sentences) ? s.sentences : [s.sentences];
        }
        return [];
      });
    } else {
      sentences = [];
    }

    try {
      const temp = await translatePassageWithGPT(sentences, targetLanguage);

      const translatedSentences =
        temp[targetLanguage as keyof typeof temp] || [];

      const updatedTranslations = {
        ...(existingTranslations || {}),
        [targetLanguage]: translatedSentences,
      };

      const updated = await prisma.chapter.update({
        where: {
          storyId_chapterNumber: {
            storyId,
            chapterNumber: chapterNum,
          },
        },
        data: {
          translatedPassage: updatedTranslations,
        },
      });

      return NextResponse.json({
        message: "Translation successful",
        translated_sentences: translatedSentences,
      });
    } catch (error) {
      console.error("[translateChapterContent] Translation error:", error);
      return NextResponse.json(
        { message: "Translation failed" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { message: "Invalid type parameter" },
    { status: 400 }
  );
}

export async function translateStorySummary(
  request: NextRequest,
  ctx: { params: Promise<{ storyId: string }> }
) {
  const { storyId } = await ctx.params;
  const { type, targetLanguage } = await request.json();
  // console.log(`Received request to translate story summary with type: ${type} and targetLanguage: ${targetLanguage}`);

  if (!Object.values(LanguageType).includes(targetLanguage)) {
    // console.log("Invalid target language");
    return NextResponse.json(
      {
        message: "Invalid target language",
      },
      { status: 400 }
    );
  }

  if (!storyId || typeof storyId !== "string") {
    // console.log("Invalid storyId!");
    return NextResponse.json({ message: "Invalid storyId" }, { status: 400 });
  }

  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: { chapters: true },
  });

  if (!story) {
    // console.log("Story not found!");
    return NextResponse.json({ message: "Story not found" }, { status: 404 });
  }

  const storyData = story;
  if (!storyData.storyBible || !(storyData.storyBible as any).summary) {
    // console.log("No summary found!");
    return NextResponse.json({ message: "No summary found" }, { status: 404 });
  }

  if (type === "summary") {
    // console.log("Translating story summary...");
    const existingTranslations = storyData.translatedSummary as Record<
      string,
      string[]
    > | null;

    if (existingTranslations && existingTranslations[targetLanguage]) {
      // console.log("Article already translated");
      return NextResponse.json({
        message: "article already translated",
        translated_sentences: existingTranslations[targetLanguage],
      });
    }

    const sentences = splitTextIntoSentences(
      (storyData.storyBible as any).summary
    );
    let translated: Record<string, string[]>;
    let translatedSentences: string[];
    try {
      translated = await translatePassageWithGoogle(sentences, targetLanguage);
      translatedSentences = translated[targetLanguage] || [];
      const updatedTranslations = {
        ...(existingTranslations || {}),
        [targetLanguage]: translatedSentences,
      };

      await prisma.story.update({
        where: { id: storyId },
        data: {
          translatedSummary: updatedTranslations,
        },
      });
      // console.log("Translation successful");
      return NextResponse.json({
        message: "translation successful",
        translated_sentences: translatedSentences,
      });
    } catch (error) {
      console.error("Translation error:", error);
      return NextResponse.json(
        {
          message: error,
        },
        { status: 500 }
      );
    }
  }

  if (type === "chapter") {
    // console.log("Translating chapter summaries...");
    let allTranslatedSentences: { [key: string]: string[] } = {};
    let allTranslationsExist = true;

    storyData.chapters.forEach((chapter: any, index: number) => {
      if (!chapter.summary) {
        allTranslationsExist = false;
        return;
      }
      const existingTranslations = chapter.translatedSummary as Record<
        string,
        string[]
      > | null;
      if (!existingTranslations || !existingTranslations[targetLanguage]) {
        allTranslationsExist = false;
      } else {
        allTranslatedSentences[index] = existingTranslations[targetLanguage];
      }
    });

    if (allTranslationsExist) {
      // console.log("Chapter summary already translated ", allTranslatedSentences);
      return NextResponse.json({
        message: "chapter summary already translated",
        translated_sentences: allTranslatedSentences,
      });
    }

    try {
      for (let index = 0; index < storyData.chapters.length; index++) {
        const chapter = storyData.chapters[index];
        if (!chapter.summary) {
          continue;
        }
        let translated: Record<string, string[]>;
        let translatedSentences: string[];

        translated = await translatePassageWithGoogle(
          [chapter.summary],
          targetLanguage
        );
        translatedSentences = translated[targetLanguage] || [];

        allTranslatedSentences[index] = translatedSentences;

        const existingTranslations = chapter.translatedSummary as Record<
          string,
          string[]
        > | null;
        const updatedTranslations = {
          ...(existingTranslations || {}),
          [targetLanguage]: translatedSentences,
        };

        await prisma.chapter.update({
          where: { id: chapter.id },
          data: {
            translatedSummary: updatedTranslations,
          },
        });
      }

      // console.log("Translation successful", allTranslatedSentences);

      return NextResponse.json({
        message: "translation successful",
        translated_sentences: allTranslatedSentences,
      });
    } catch (error) {
      console.error("Translation error:", error);
      return NextResponse.json(
        {
          message: error,
        },
        { status: 500 }
      );
    }
  }
}
