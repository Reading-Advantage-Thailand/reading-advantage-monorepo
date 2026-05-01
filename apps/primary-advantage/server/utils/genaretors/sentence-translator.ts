import { generateObject } from "ai";
import { google, googleModelLite } from "@/utils/google";
import { prisma } from "@/lib/prisma";
import { SentenceTimepoint } from "@/types";
import z from "zod";

// Translation schema matching your existing pattern
const sentenceTranslationSchema = z.object({
  translatedSentences: z.object({
    th: z.array(z.string()).describe("Thai translations of the sentences"),
    cn: z
      .array(z.string())
      .describe("Simplified Chinese translations of the sentences"),
    tw: z
      .array(z.string())
      .describe("Traditional Chinese translations of the sentences"),
    vi: z
      .array(z.string())
      .describe("Vietnamese translations of the sentences"),
  }),
});

interface TranslateSentencesParams {
  articleId: string;
  targetLanguages?: string[]; // Optional: specify which languages to translate to
  forceRetranslate?: boolean; // Optional: retranslate even if translations exist
}

interface TranslatedSentences {
  th: string[];
  cn: string[];
  tw: string[];
  vi: string[];
}

/**
 * Extract sentences from the article's sentence timepoints
 */
function extractSentencesFromTimepoints(
  sentences: SentenceTimepoint[],
): string[] {
  return sentences.map((sentenceData) => sentenceData.sentence);
}

/**
 * Translate sentences using AI
 */
async function translateSentencesWithAI(
  sentences: string[],
  targetLanguages: string[],
  cefrLevel?: string,
): Promise<TranslatedSentences> {
  const sentenceList = sentences.join("\n");

  const systemPrompt = `You are a professional translator specializing in educational content for language learners. Translate the following sentences accurately while maintaining:

1. Appropriate language level${cefrLevel ? ` for CEFR level ${cefrLevel}` : ""}
2. Natural flow and readability
3. Educational context and meaning
4. Cultural appropriateness

Translate each sentence to:
- th: Thai
- cn: Simplified Chinese  
- tw: Traditional Chinese
- vi: Vietnamese

Maintain the same number of sentences in each translation as the original.`;

  const userPrompt = `Translate these sentences:

${sentenceList}

Provide translations in the exact same order, maintaining sentence structure and meaning appropriate for language learners.`;

  try {
    const result = await generateObject({
      model: google(googleModelLite),
      schema: sentenceTranslationSchema,
      system: systemPrompt,
      prompt: userPrompt,
    });

    return result.object.translatedSentences;
  } catch (error) {
    console.error("Error translating AI :", error);
    throw new Error("Failed to translate sentences with both AI providers");
  }
}

/**
 * Main function to translate sentences and store in database
 */
export async function translateAndStoreSentences({
  articleId,
  targetLanguages = ["th", "cn", "tw", "vi"],
  forceRetranslate = true,
}: TranslateSentencesParams): Promise<void> {
  try {
    // Get the article with current sentences and translations
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: {
        sentences: true,
        translatedPassage: true,
        cefrLevel: true,
      },
    });

    if (!article) {
      throw new Error(`Article with ID ${articleId} not found`);
    }

    if (!article.sentences) {
      throw new Error(
        `No sentences found for article ${articleId}. Generate audio first.`,
      );
    }

    // Check if translations already exist and forceRetranslate is false
    if (article.translatedPassage && !forceRetranslate) {
      console.log(
        `Translations already exist for article ${articleId}. Use forceRetranslate=true to retranslate.`,
      );
      return;
    }

    // Parse the sentences from the JSON field
    const sentenceTimepoints =
      article.sentences as unknown as SentenceTimepoint[];
    const sentences = extractSentencesFromTimepoints(sentenceTimepoints);

    if (sentences.length === 0) {
      throw new Error(`No sentences to translate for article ${articleId}`);
    }

    console.log(
      `Translating ${sentences.length} sentences for article ${articleId}...`,
    );

    // Translate sentences
    const translatedSentences = await translateSentencesWithAI(
      sentences,
      targetLanguages,
      article.cefrLevel,
    );

    // Validate that all translations have the same number of sentences
    const originalCount = sentences.length;
    const translationCounts = {
      th: translatedSentences.th.length,
      cn: translatedSentences.cn.length,
      tw: translatedSentences.tw.length,
      vi: translatedSentences.vi.length,
    };

    const invalidCounts = Object.entries(translationCounts).filter(
      ([_, count]) => count !== originalCount,
    );

    if (invalidCounts.length > 0) {
      console.warn(`Translation count mismatch for article ${articleId}:`, {
        original: originalCount,
        translations: translationCounts,
      });
    }

    // Store translations in database
    await prisma.article.update({
      where: { id: articleId },
      data: {
        translatedPassage: JSON.parse(JSON.stringify(translatedSentences)),
      },
    });

    console.log(
      `Successfully translated and stored sentences for article ${articleId}`,
    );
  } catch (error: any) {
    console.error(
      `Failed to translate sentences for article ${articleId}:`,
      error,
    );
    throw new Error(`Failed to translate sentences: ${error.message}`);
  }
}

/**
 * Get translated sentences for an article
 */
// export async function getTranslatedSentences(
//   articleId: string,
//   language: "th" | "cn" | "tw" | "vi",
// ): Promise<string[]> {
//   const article = await prisma.article.findUnique({
//     where: { id: articleId },
//     select: {
//       translatedSentences: true,
//     },
//   });

//   if (!article?.translatedSentences) {
//     throw new Error(`No translated sentences found for article ${articleId}`);
//   }

//   const translations = article.translatedSentences as TranslatedSentences;
//   return translations[language] || [];
// }

// /**
//  * Batch translate sentences for multiple articles
//  */
// export async function batchTranslateSentences(
//   articleIds: string[],
//   options?: Omit<TranslateSentencesParams, "articleId">,
// ): Promise<void> {
//   console.log(
//     `Starting batch translation for ${articleIds.length} articles...`,
//   );

//   const results = await Promise.allSettled(
//     articleIds.map((articleId) =>
//       translateAndStoreSentences({ articleId, ...options }),
//     ),
//   );

//   const successful = results.filter(
//     (result) => result.status === "fulfilled",
//   ).length;
//   const failed = results.filter(
//     (result) => result.status === "rejected",
//   ).length;

//   console.log(
//     `Batch translation completed: ${successful} successful, ${failed} failed`,
//   );

//   if (failed > 0) {
//     const errors = results
//       .filter(
//         (result): result is PromiseRejectedResult =>
//           result.status === "rejected",
//       )
//       .map((result) => result.reason);

//     console.error("Batch translation errors:", errors);
//   }
// }
