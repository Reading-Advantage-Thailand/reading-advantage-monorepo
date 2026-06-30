import { generateObject } from "@reading-advantage/ai";
import { google, googleModel } from "@/utils/google";
import { openai, newModel, openaiModel4o } from "@/utils/openai";
import { articleGeneratorSchema } from "@/lib/zod";
import path from "path";
import fs from "fs";
import { ArticleBaseCefrLevel, ArticleType } from "@/types/enum";
import { evaluateRating } from "./evaluate-rating-generator";
import {
  db,
  articles,
  longAnswerQuestions,
  shortAnswerQuestions,
  multipleChoiceQuestions,
} from "@reading-advantage/db";
import { convertCefrLevel } from "@/lib/utils";
import { generateImage } from "./image-generator";
import { generateAudio } from "./audio-generator";
import { generateAudioForWord } from "./audio-word-generator";
import { generateAudioForFlashcard } from "./audio-flashcard-generator";
import { se } from "date-fns/locale";

export interface MultipleChoiceQuestionInput {
  question: string;
  options: string[];
  answer: string;
}

export interface ShortAnswerQuestionInput {
  question: string;
  answer: string;
}

export interface LongAnswerQuestionInput {
  question: string;
}

export interface FlashcardInput {
  sentence: string;
  translation: { th: string; cn: string; tw: string; vi: string };
}

export interface WordlistInput {
  vocabulary: string;
  definitions: { en: string; th: string; cn: string; tw: string; vi: string };
}

export interface GeneratedArticleInput {
  brainstorming: string;
  planning: string;
  title: string;
  passage: string;
  summary: string;
  imageDesc: string;
  translatedSummary: { th: string; cn: string; tw: string; vi: string };
  sentences: string[];
  wordlist: WordlistInput[];
  flashcard: FlashcardInput[];
  multipleChoiceQuestions: MultipleChoiceQuestionInput[];
  shortAnswerQuestions: ShortAnswerQuestionInput[];
  longAnswerQuestions: LongAnswerQuestionInput[];
}

export interface PersistArticleInput {
  article: GeneratedArticleInput;
  data: { genre: string; description: string };
  cefrLevel: string;
  rating: number;
  generateImage: (params: {
    imageDesc: string;
    articleId: string;
    passage: string;
  }) => Promise<{ success: boolean; imageUrls?: string[]; error?: string }>;
  generateAudio: (params: {
    passage: string;
    sentences: string[];
    articleId: string;
  }) => Promise<unknown>;
  generateAudioForFlashcard: (params: {
    sentences: Array<{ sentence: string; translation: { th: string; cn: string; tw: string; vi: string } }>;
    words: Array<{ vocabulary: string; definition: { en: string; th: string; cn: string; tw: string; vi: string } }>;
    articleId: string;
  }) => Promise<unknown>;
  convertCefrLevel: (s: string) => unknown;
  ArticleType: { FICTION: string };
}

interface TxLike {
  insert: (table: unknown) => {
    values: (v: unknown) => {
      returning: (projection?: unknown) => Promise<Array<{ id: string }>>;
    };
  };
}

export class ArticleGenerationError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ArticleGenerationError";
  }
}

/**
 * Persists a generated article and its associated question rows inside a caller-supplied
 * Drizzle transaction (`tx`). Also runs the post-persistence artwork + audio generation
 * and awaits them. FR-3 fixes: (a) the inner `Promise.all` is awaited so a background
 * failure surfaces to the caller; (b) a multiple-choice question whose `answer` is not
 * present in `options` is filtered out instead of being persisted with `correctAnswer: 0`
 * (which would silently store a wrong answer key).
 *
 * @param tx - The Drizzle transaction handle from `db.transaction(async (tx) => ...)`.
 * @param input - The article payload + injected side-effect generators.
 * @returns The id of the persisted article.
 * @throws {ArticleGenerationError} When artwork generation reports failure or background generation throws.
 */
export async function persistGeneratedArticle(
  tx: TxLike,
  input: PersistArticleInput,
): Promise<string> {
  const { article, data, cefrLevel, rating } = input;

  const [createdArticle] = await tx
    .insert(articles)
    .values({
      title: article.title,
      passage: article.passage,
      summary: article.summary,
      translatedSummary: article.translatedSummary,
      imageDescription: article.imageDesc || "",
      genre: data.genre,
      type: ArticleType.FICTION,
      raLevel: input.convertCefrLevel(cefrLevel || ""),
      rating,
      cefrLevel: cefrLevel || "",
      brainstorming: article.brainstorming,
      planning: article.planning,
      topic: data.description,
      content: article.passage,
    })
    .returning();

  const articleId = (createdArticle as { id: string } | undefined)?.id;
  if (!articleId) {
    throw new ArticleGenerationError("Article insert did not return an id");
  }

  if (article.longAnswerQuestions.length > 0) {
    await tx.insert(longAnswerQuestions).values(
      article.longAnswerQuestions.map((question) => ({
        question: question.question,
        articleId,
      })),
    );
  }

  if (article.shortAnswerQuestions.length > 0) {
    await tx.insert(shortAnswerQuestions).values(
      article.shortAnswerQuestions.map((question) => ({
        question: question.question,
        answer: question.answer,
        articleId,
      })),
    );
  }

  const validMcq = article.multipleChoiceQuestions.filter((question) => {
    if (!Array.isArray(question.options)) return false;
    return question.options.indexOf(question.answer) >= 0;
  });

  if (validMcq.length > 0) {
    await tx.insert(multipleChoiceQuestions).values(
      validMcq.map((question) => ({
        question: question.question,
        options: question.options,
        answer: question.answer,
        articleId,
        correctAnswer: question.options.indexOf(question.answer),
      })),
    );
  }

  const skipped = article.multipleChoiceQuestions.length - validMcq.length;
  if (skipped > 0) {
    console.warn(
      `[new-generator] Skipped ${skipped} multiple-choice row(s) whose answer was not present in options.`,
    );
  }

  await Promise.all([
    input.generateImage({
      imageDesc: article.imageDesc,
      articleId,
      passage: article.passage,
    }).then((result) => {
      if (!result.success) {
        throw new ArticleGenerationError(
          `Failed to generate images for article ${articleId}: ${result.error ?? "unknown"}`,
        );
      }
    }),
    input.generateAudio({
      passage: article.passage,
      sentences: article.sentences,
      articleId,
    }),
    input.generateAudioForFlashcard({
      sentences: article.flashcard.map((sentence) => ({
        sentence: sentence.sentence,
        translation: sentence.translation,
      })),
      words: article.wordlist.map((word) => ({
        vocabulary: word.vocabulary,
        definition: word.definitions,
      })),
      articleId,
    }),
  ]);

  return articleId;
}

// interface BatchGenerateParams {
//   type: ArticleType;
//   level: ArticleBaseCefrLevel;
//   amount: number;
// }

// interface GenerationJob {
//   id: string;
//   type: ArticleType;
//   level: ArticleBaseCefrLevel;
//   genre: string;
//   subgenre: string;
//   topic: string;
//   status: "pending" | "processing" | "completed" | "failed";
// }

export const generateArticleNew = async (
  levels: ArticleBaseCefrLevel,
): Promise<void> => {
  console.log("Generating article for level:", levels);

  const rawData = fs.readFileSync(
    path.join(process.cwd(), "data", "new-article-prompts.json"),
    "utf-8",
  );

  const titleData = fs.readFileSync(
    path.join(process.cwd(), "data", "title-a0.json"),
    "utf-8",
  );

  const prompts = JSON.parse(rawData);

  const data =
    JSON.parse(titleData).storyCollection.stories[
      Math.floor(
        Math.random() * JSON.parse(titleData).storyCollection.stories.length,
      )
    ];

  const filteredPrompts = prompts.levels.find(
    (level: any) => level.level === levels,
  );

  // console.log("Filtered prompts:", filteredPrompts);

  const userPrompt = filteredPrompts.userPromptTemplate
    .replace("{genre}", data.genre)
    .replace("{topic}", data.description);

  try {
    const MAX_ATTEMPTS = 3;
    let attempts = 0;
    const article: any = null;
    while (attempts < MAX_ATTEMPTS) {
      try {
        const { object: article } = await generateObject({
          // model: openai(newModel),
          model: google(googleModel),
          schema: articleGeneratorSchema,
          system: filteredPrompts.systemPrompt,
          prompt: userPrompt,
          temperature: 1, //openai model does not support temperature 0
        });

        const { rating, cefrLevel } = await evaluateRating({
          passage: article.passage,
          cefrLevel: levels,
        });

        if (rating >= 2) {
          // FR-3 fix: await the transaction so an inner failure rejects the caller
          // (the previous code dropped the transaction promise — fire-and-forget).
          await db.transaction(async (tx) => {
            await persistGeneratedArticle(tx as never, {
              article: article as GeneratedArticleInput,
              data,
              cefrLevel: cefrLevel || "",
              rating,
              generateImage,
              generateAudio,
              generateAudioForFlashcard,
              convertCefrLevel: convertCefrLevel as unknown as PersistArticleInput["convertCefrLevel"],
              ArticleType,
            });
          });
          console.log("Article generated successfully");
          return;
        }
      } catch (error) {
        attempts++;
        if (attempts === MAX_ATTEMPTS) {
          throw new Error("Failed to generate article");
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    console.error("Error in generateArticleNew:", error);
    throw new Error(`Failed to generate article: ${error}`);
  }
};

// // Generate multiple topics at once to reduce AI calls
// async function generateBatchTopics(
//   type: ArticleType,
//   genres: Array<{ genre: string; subgenre: string }>,
//   amount: number,
// ): Promise<string[]> {
//   const topicPrompt = `Generate ${amount} diverse reading passage topics for ${type} articles covering these genres: ${genres.map((g) => `${g.genre}/${g.subgenre}`).join(", ")}. Return as JSON array of topic strings.`;

//   const { object } = await generateObject({
//     model: google(googleModel),
//     schema: z.object({
//       topics: z.array(z.string()),
//     }),
//     prompt: topicPrompt,
//   });

//   return object.topics;
// }

// // Process articles in parallel batches
// export const generateArticlesBatch = async ({
//   type,
//   level,
//   amount,
// }: BatchGenerateParams): Promise<void> => {
//   const BATCH_SIZE = 3; // Process 3 articles simultaneously
//   const CONCURRENT_LIMIT = 2; // Limit concurrent AI calls

//   try {
//     // 1. Pre-generate all genres and topics in batch
//     const genres = await Promise.all(
//       Array(amount)
//         .fill(null)
//         .map(() => randomSelectGenre({ type })),
//     );

//     const topics = await generateBatchTopics(type, genres, amount);

//     // 2. Create generation jobs
//     const jobs: GenerationJob[] = topics.map((topic, index) => ({
//       id: `${type}-${level}-${Date.now()}-${index}`,
//       type,
//       level,
//       genre: genres[index].genre,
//       subgenre: genres[index].subgenre,
//       topic,
//       status: "pending",
//     }));

//     // 3. Process jobs in batches
//     for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
//       const batch = jobs.slice(i, i + BATCH_SIZE);

//       await Promise.allSettled(batch.map((job) => processArticleJob(job)));

//       // Brief pause between batches to avoid rate limits
//       if (i + BATCH_SIZE < jobs.length) {
//         await new Promise((resolve) => setTimeout(resolve, 1000));
//       }
//     }

//     console.log(
//       `Completed batch generation: ${amount} articles for ${type}/${level}`,
//     );
//   } catch (error) {
//     console.error("Batch generation failed:", error);
//     throw error;
//   }
// };

// async function processArticleJob(job: GenerationJob): Promise<void> {
//   try {
//     job.status = "processing";

//     // Generate core content first (lightweight operations)
//     const content = await generateContentOptimized(job);

//     // Save to database immediately
//     const articleId = await saveArticleCore(content, job);

//     // Queue heavy operations (image, audio) for background processing
//     queueBackgroundTasks(articleId, content);

//     job.status = "completed";
//   } catch (error) {
//     job.status = "failed";
//     console.error(`Job ${job.id} failed:`, error);
//     throw error;
//   }
// }

// // Combine multiple AI calls into single optimized call
// async function generateContentOptimized(
//   job: GenerationJob,
// ): Promise<GeneratedContent> {
//   // Use a single AI call to generate article + initial questions
//   const combinedSchema = z.object({
//     article: articleGeneratorSchema,
//     questions: z.object({
//       multipleChoice: z
//         .array(
//           z.object({
//             question: z.string(),
//             options: z.array(z.string()),
//             answer: z.string(),
//           }),
//         )
//         .min(5)
//         .max(8),
//       shortAnswer: z
//         .array(
//           z.object({
//             question: z.string(),
//             answer: z.string(),
//           }),
//         )
//         .min(3)
//         .max(5),
//       longAnswer: z.object({
//         question: z.string(),
//       }),
//     }),
//   });

//   const combinedPrompt = `
//   Create a complete ${job.type} article for ${job.level} level about "${job.topic}" in the ${job.genre}/${job.subgenre} genre.

//   Include:
//   1. Full article with title, passage, summary, translated summaries, and image description
//   2. 5-8 multiple choice questions
//   3. 3-5 short answer questions
//   4. 1 long answer question

//   Topic: ${job.topic}
//   Genre: ${job.genre}/${job.subgenre}
//   CEFR Level: ${job.level}
//   `;

//   const { object: combined } = await generateObject({
//     model: google(googleModel),
//     schema: combinedSchema,
//     prompt: combinedPrompt,
//     temperature: 0.8,
//   });

//   // Quick rating evaluation (optional - can be skipped for speed)
//   const rating = await evaluateRatingFast(combined.article.passage, job.level);

//   return {
//     article: {
//       ...combined.article,
//       rating: rating.rating,
//       cefrLevel: rating.cefrLevel,
//     },
//     mcq: { questions: combined.questions.multipleChoice },
//     saq: { questions: combined.questions.shortAnswer },
//     laq: combined.questions.longAnswer,
//   };
// }

// // Faster rating evaluation with smaller model
// async function evaluateRatingFast(
//   passage: string,
//   level: ArticleBaseCefrLevel,
// ): Promise<{ rating: number; cefrLevel: string }> {
//   const { object } = await generateObject({
//     model: google("gemini-1.5-flash"), // Use faster, cheaper model
//     schema: z.object({
//       rating: z.number().min(1).max(5),
//       cefrLevel: z.string(),
//     }),
//     prompt: `Rate this passage for ${level} level (1-5 scale) and confirm CEFR level: ${passage.substring(0, 500)}...`,
//     maxTokens: 100, // Limit tokens for speed
//   });

//   return object;
// }

// interface BackgroundTask {
//   type: "image" | "audio" | "wordlist" | "translation";
//   articleId: string;
//   data: any;
//   priority: number;
// }

// class BackgroundTaskQueue {
//   private queue: BackgroundTask[] = [];
//   private processing = false;
//   private readonly CONCURRENT_TASKS = 2;

//   addTask(task: BackgroundTask) {
//     this.queue.push(task);
//     this.queue.sort((a, b) => b.priority - a.priority);
//     this.processQueue();
//   }

//   private async processQueue() {
//     if (this.processing || this.queue.length === 0) return;

//     this.processing = true;

//     while (this.queue.length > 0) {
//       const batch = this.queue.splice(0, this.CONCURRENT_TASKS);

//       await Promise.allSettled(batch.map((task) => this.executeTask(task)));
//     }

//     this.processing = false;
//   }

//   private async executeTask(task: BackgroundTask) {
//     try {
//       switch (task.type) {
//         case "image":
//           await generateImage({
//             imageDesc: task.data.imageDesc,
//             articleId: task.articleId,
//           });
//           break;
//         case "audio":
//           await generateAudio({
//             passage: task.data.passage,
//             articleId: task.articleId,
//           });
//           break;
//         case "wordlist":
//           await generateWordLists(task.articleId);
//           break;
//       }
//     } catch (error) {
//       console.error(
//         `Background task ${task.type} failed for ${task.articleId}:`,
//         error,
//       );
//     }
//   }
// }

// const backgroundQueue = new BackgroundTaskQueue();

// export function queueBackgroundTasks(
//   articleId: string,
//   content: GeneratedContent,
// ) {
//   // Queue tasks with priorities (higher = more important)
//   backgroundQueue.addTask({
//     type: "image",
//     articleId,
//     data: { imageDesc: content.article.imageDesc },
//     priority: 3,
//   });

//   backgroundQueue.addTask({
//     type: "audio",
//     articleId,
//     data: { passage: content.article.passage },
//     priority: 2,
//   });

//   backgroundQueue.addTask({
//     type: "wordlist",
//     articleId,
//     data: {},
//     priority: 1,
//   });
// }

// // Save core article data immediately, update with media later
// async function saveArticleCore(
//   content: GeneratedContent,
//   job: GenerationJob,
// ): Promise<string> {
//   const transaction = await db.$transaction(async (tx) => {
//     // Create article
//     const article = await tx.article.create({
//       data: {
//         title: content.article.title,
//         passage: content.article.passage,
//         summary: content.article.summary,
//         translatedSummary: content.article.translatedSummary,
//         imageDescription: content.article.imageDesc,
//         genre: cleanGenre(job.genre),
//         subGenre: cleanGenre(job.subgenre),
//         type: job.type,
//         rating: content.article.rating,
//         raLevel: convertCefrLevel(content.article.cefrLevel),
//         cefrLevel: content.article.cefrLevel,
//       },
//     });

//     // Create all questions in parallel
//     await Promise.all([
//       // Multiple choice questions
//       tx.multipleChoiceQuestion.createMany({
//         data: content.mcq.questions.map((q) => ({
//           question: q.question,
//           options: q.options,
//           answer: q.answer,
//           articleId: article.id,
//         })),
//       }),

//       // Short answer questions
//       tx.shortAnswerQuestion.createMany({
//         data: content.saq.questions.map((q) => ({
//           question: q.question,
//           answer: q.answer,
//           articleId: article.id,
//         })),
//       }),

//       // Long answer question
//       tx.longAnswerQuestion.create({
//         data: {
//           question: content.laq.question,
//           articleId: article.id,
//         },
//       }),
//     ]);

//     return article.id;
//   });

//   return transaction;
// }

// class TokenManager {
//   private tokenUsage = new Map<string, number>();
//   private readonly TOKEN_LIMITS = {
//     "gemini-1.5-pro": 32000,
//     "gemini-1.5-flash": 8000,
//   };

//   async executeWithTokenManagement<T>(
//     modelName: string,
//     operation: () => Promise<T>,
//     estimatedTokens: number,
//   ): Promise<T> {
//     const currentUsage = this.tokenUsage.get(modelName) || 0;
//     const limit = this.TOKEN_LIMITS[modelName] || 8000;

//     if (currentUsage + estimatedTokens > limit * 0.8) {
//       // Wait before making request to avoid limits
//       await new Promise((resolve) => setTimeout(resolve, 2000));
//       this.tokenUsage.set(modelName, 0);
//     }

//     const result = await operation();
//     this.tokenUsage.set(modelName, currentUsage + estimatedTokens);

//     return result;
//   }
// }

// const tokenManager = new TokenManager();

// export const generateAllArticleOptimized = async (amountPerGenre: number) => {
//   const types: ArticleType[] = [ArticleType.FICTION, ArticleType.NONFICTION];
//   const levels: ArticleBaseCefrLevel[] = [
//     ArticleBaseCefrLevel.A1,
//     ArticleBaseCefrLevel.A2,
//     ArticleBaseCefrLevel.B1,
//     ArticleBaseCefrLevel.B2,
//   ];

//   console.log(
//     `Starting optimized generation of ${types.length * levels.length * amountPerGenre} articles...`,
//   );

//   try {
//     // Process all combinations in parallel with controlled concurrency
//     const promises = [];

//     for (const type of types) {
//       for (const level of levels) {
//         promises.push(
//           generateArticlesBatch({ type, level, amount: amountPerGenre }),
//         );
//       }
//     }

//     // Execute with limited concurrency to avoid overwhelming the system
//     const BATCH_CONCURRENCY = 2;
//     for (let i = 0; i < promises.length; i += BATCH_CONCURRENCY) {
//       const batch = promises.slice(i, i + BATCH_CONCURRENCY);
//       await Promise.allSettled(batch);

//       // Brief pause between major batches
//       if (i + BATCH_CONCURRENCY < promises.length) {
//         await new Promise((resolve) => setTimeout(resolve, 3000));
//       }
//     }

//     console.log("Optimized article generation completed!");
//   } catch (error) {
//     console.error("Optimized generation failed:", error);
//     throw error;
//   }
// };
