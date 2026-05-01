import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import { ExtendedNextRequest } from "./auth-controller";
import { sendDiscordWebhook } from "../utils/send-discord-webhook";
import { randomSelectGenre } from "../utils/generators/random-select-genre";
import { generateTopic } from "../utils/generators/topic-generator";
import { ArticleBaseCefrLevel, ArticleType } from "../models/enum";
import {
  generateArticle,
  GenerateArticleResponse,
} from "../utils/generators/article-generator";
import { evaluateRating } from "../utils/generators/evaluate-rating-generator";
import { generateMCQuestion } from "../utils/generators/mc-question-generator";
import { generateSAQuestion } from "../utils/generators/sa-question-generator";
import { generateLAQuestion } from "../utils/generators/la-question-generator";
import { generateAudio } from "../utils/generators/audio-generator";
import { generateImage } from "../utils/generators/image-generator";
import { calculateLevel } from "@/lib/calculateLevel";
import { generateWordList } from "../utils/generators/word-list-generator";
import {
  generateAudioForWord,
  WordWithTimePoint,
} from "../utils/generators/audio-words-generator";
import {
  generateTranslatedSummary,
  generateTranslatedPassage,
  generateTranslatedPassageFromSentences,
} from "../utils/generators/translation-generator";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface GenerateArticleRequest {
  type: string;
  genre: string;
  subgenre?: string;
  topic: string;
  cefrLevel: string;
  wordCount: number;
}

interface Context {
  params?: Promise<{
    articleId?: string;
  }>;
}

// Helper function to retry Prisma operations
async function retryPrismaOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      retries++;
      console.error(
        `Prisma operation attempt ${retries}/${maxRetries} failed:`,
        error
      );

      if (retries >= maxRetries) {
        throw new Error(
          `Prisma operation failed after ${maxRetries} attempts: ${error instanceof Error ? error.message : "Unknown Prisma error"}`
        );
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, 1000 * retries));
    }
  }
  throw new Error("This should never be reached");
}

// Function to generate queue
export async function generateQueue(req: ExtendedNextRequest) {
  try {
    const { amountPerGenre } = await req.json();
    if (!amountPerGenre) {
      throw new Error("amountPerGenre is required");
    }
    // initialize
    const timeTaken = Date.now();
    const userAgent = req.headers.get("user-agent") || "";
    const reqUrl = req.url;
    const amount = parseInt(amountPerGenre);

    // Send a message to Discord that the generation has started
    await sendDiscordWebhook({
      title: "Generate Queue",
      embeds: [
        {
          description: {
            "amount per genre": amountPerGenre,
            total: `${amount * 6 * 2}`,
          },
          color: 0x0099ff,
        },
      ],
      color: 0x0099ff,
      reqUrl,
      userAgent,
    });

    // Generate queue for fiction and nonfiction in parallel
    const [fictionResults, nonfictionResults] = await Promise.all([
      generateForGenre(ArticleType.FICTION, amount, reqUrl, userAgent),
      generateForGenre(ArticleType.NONFICTION, amount, reqUrl, userAgent),
    ]);

    // Combine results from both genres
    const combinedResults = fictionResults.concat(nonfictionResults);

    // Count failed results
    const failedCount = combinedResults.filter(
      (result) => result === null
    ).length;
    const successCount = combinedResults.filter(
      (result) => result !== null
    ).length;
    // calculate taken time
    const timeTakenMinutes = (Date.now() - timeTaken) / 1000 / 60;

    // Log failed results
    if (failedCount > 0) {
      console.error(`Failed to generate ${failedCount} articles`);
      // Note: Error logging to database is removed as part of Firestore to Prisma migration
    }

    await sendDiscordWebhook({
      title: "Queue Generation Complete",
      embeds: [
        {
          description: {
            "amount per genre": amountPerGenre,
            total: `${amount * 6 * 2}`,
            failed: `${failedCount} articles`,
            success: `${successCount} articles`,
            "time taken": `${timeTakenMinutes.toFixed(2)} minutes\n`,
            // ":star: failed reasons": failedCount ? "\n" + failedReasons.join("\n") : "none",
          },
          color: 0x0099ff,
        },
      ],
      color: 0x0099ff,
      reqUrl,
      userAgent,
    });

    return NextResponse.json(
      {
        message: "Queue generation complete",
        total: amount * 6 * 2,
        failedCount,
        timeTaken: timeTakenMinutes.toFixed(2),
        results: successCount,
      },
      { status: 200 }
    );
  } catch (error) {
    await sendDiscordWebhook({
      title: "Queue Generation Failed",
      embeds: [
        {
          description: {
            error: `${error}`,
          },
          color: 0xff0000,
        },
      ],
      reqUrl: "unknown",
      userAgent: "unknown",
    });
    return NextResponse.json({ message: error }, { status: 500 });
  }
}

// Function to generate queue for a given genre
// fiction or nonfiction
async function generateForGenre(
  type: ArticleType,
  amountPerGenre: number,
  reqUrl: string,
  userAgent: string
) {
  // Select genre once for this genre type
  const randomGenre = await randomSelectGenre({ type });

  // Generate topics once for this genre
  const generatedTopic = await generateTopic({
    type: type,
    genre: randomGenre.genre,
    subgenre: randomGenre.subgenre,
    amountPerGenre: amountPerGenre,
  });

  const cefrLevels = [
    ArticleBaseCefrLevel.A1,
    ArticleBaseCefrLevel.A2,
    ArticleBaseCefrLevel.B1,
    ArticleBaseCefrLevel.B2,
    ArticleBaseCefrLevel.C1,
    ArticleBaseCefrLevel.C2,
  ];

  // Generate all combinations of topics and levels in parallel
  const results = await Promise.all(
    cefrLevels.flatMap((level) =>
      generatedTopic.topics.map((topic) =>
        queue(
          type,
          randomGenre.genre,
          randomGenre.subgenre,
          topic,
          level,
          reqUrl,
          userAgent
        )
      )
    )
  );

  return results;
}

// Function to generate article, questions, and save to db using Prisma
// Returns a string if failed, otherwise returns an object
async function queue(
  type: ArticleType,
  genre: string,
  subgenre: string,
  topic: string,
  cefrLevel: ArticleBaseCefrLevel,
  reqUrl: string,
  userAgent: string,
  maxRetries: number = 5
) {
  console.log(`[DEBUG] queue() called with:`, {
    type,
    genre,
    subgenre,
    topic,
    cefrLevel,
    reqUrl,
    userAgent,
    maxRetries,
  });

  let attempts = 0;
  let lastError: unknown = null;
  let articleId: string = "";
  let prismaRetries = 0;
  const maxPrismaRetries = 3;

  while (attempts < maxRetries) {
    console.log(
      `[DEBUG] Starting attempt ${attempts + 1}/${maxRetries} to generate article`
    );
    try {
      console.log(`[DEBUG] Calling evaluateArticle()...`);
      // Generate article and evaluate rating using the same approach as generateUserArticle
      const {
        article: generatedArticle,
        rating,
        cefrlevel,
        raLevel,
      } = await evaluateArticle(type, genre, subgenre, topic, cefrLevel);

      console.log(`[DEBUG] evaluateArticle() completed:`, {
        title: generatedArticle.title,
        rating,
        cefrlevel,
        raLevel,
        wordCount: generatedArticle.passage.split(" ").length,
      });

      // Create article using Prisma with retry mechanism
      let article;
      prismaRetries = 0;
      console.log(`[DEBUG] Starting Prisma article creation...`);
      while (prismaRetries < maxPrismaRetries) {
        try {
          console.log(
            `[DEBUG] Prisma create attempt ${prismaRetries + 1}/${maxPrismaRetries}`
          );
          article = await prisma.article.create({
            data: {
              type: type,
              genre,
              subGenre: subgenre,
              title: generatedArticle.title,
              summary: generatedArticle.summary,
              passage: generatedArticle.passage,
              imageDescription: generatedArticle.imageDesc,
              cefrLevel: cefrlevel,
              raLevel,
              rating: rating,
              isPublic: true,
            },
          });
          console.log(`[DEBUG] Article created successfully in Prisma`);
          break;
        } catch (prismaError) {
          prismaRetries++;
          console.error(
            `[DEBUG] Prisma create attempt ${prismaRetries}/${maxPrismaRetries} failed:`,
            prismaError
          );

          if (prismaRetries >= maxPrismaRetries) {
            throw new Error(
              `Failed to save article to database after ${maxPrismaRetries} attempts: ${prismaError instanceof Error ? prismaError.message : "Unknown Prisma error"}`
            );
          }

          // Wait before retrying Prisma operation
          console.log(
            `[DEBUG] Waiting ${1000 * prismaRetries}ms before retrying Prisma operation...`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * prismaRetries)
          );
        }
      }

      if (!article) {
        throw new Error("Failed to create article after all Prisma retries");
      }

      articleId = article.id;
      console.log(`[DEBUG] Article created with ID: ${articleId}`);
      // Generate Image
      console.log(
        `[DEBUG] Starting image generation for articleId: ${articleId}`
      );
      await generateImage({
        imageDesc: generatedArticle.imageDesc,
        articleId,
      });
      console.log(`[DEBUG] Image generation completed`);

      // Generate Questions (same approach as generateUserArticle)
      console.log(`[DEBUG] Starting question generation...`);
      const [mcq, saq, laq] = await Promise.all([
        generateMCQuestion({
          type,
          cefrlevel: cefrLevel,
          passage: generatedArticle.passage,
          title: generatedArticle.title,
          summary: generatedArticle.summary,
          imageDesc: generatedArticle.imageDesc,
        }),
        generateSAQuestion({
          type,
          cefrlevel: cefrLevel,
          passage: generatedArticle.passage,
          title: generatedArticle.title,
          summary: generatedArticle.summary,
          imageDesc: generatedArticle.imageDesc,
        }),
        generateLAQuestion({
          type,
          cefrlevel: cefrLevel,
          passage: generatedArticle.passage,
          title: generatedArticle.title,
          summary: generatedArticle.summary,
          imageDesc: generatedArticle.imageDesc,
        }),
      ]);
      console.log(`[DEBUG] Question generation completed:`, {
        mcqCount: mcq.questions?.length || 0,
        saqCount: saq.questions?.length || 0,
        laqExists: !!laq.question,
      });

      // Transform and save questions using Prisma (same approach as generateUserArticle)
      console.log(`[DEBUG] Starting question transformation...`);
      const transformedMCQuestions = mcq.questions
        .map((q: any) => {
          const options = [
            q.correct_answer,
            q.distractor_1,
            q.distractor_2,
            q.distractor_3,
          ].filter(Boolean);

          if (options.length !== 4) return null;

          const shuffledOptions = [...options].sort(() => Math.random() - 0.5);

          return {
            question: q.question,
            options: shuffledOptions,
            answer: q.correct_answer,
            textualEvidence: q.textual_evidence || "",
            articleId: articleId,
          };
        })
        .filter(
          (q): q is NonNullable<typeof q> =>
            q !== null &&
            q.question &&
            q.options &&
            q.options.length === 4 &&
            q.answer
        );

      const transformedSAQuestions = saq.questions
        .map((q: any) => ({
          question: q.question,
          answer: q.suggested_answer || q.answer,
          articleId: articleId,
        }))
        .filter((q: any) => q.question && q.answer);

      console.log(`[DEBUG] Question transformation completed:`, {
        validMCQCount: transformedMCQuestions.length,
        validSAQCount: transformedSAQuestions.length,
        laqExists: !!laq.question,
      });

      // Save questions to database using Prisma with retry mechanism
      console.log(`[DEBUG] Starting question saving to database...`);
      const questionPromises = [];

      // Save multiple choice questions if valid
      if (transformedMCQuestions.length > 0) {
        questionPromises.push(
          retryPrismaOperation(
            () =>
              prisma.multipleChoiceQuestion.createMany({
                data: transformedMCQuestions,
              }),
            maxPrismaRetries
          )
        );
      }

      // Save short answer questions if valid
      if (transformedSAQuestions.length > 0) {
        questionPromises.push(
          retryPrismaOperation(
            () =>
              prisma.shortAnswerQuestion.createMany({
                data: transformedSAQuestions,
              }),
            maxPrismaRetries
          )
        );
      }

      // Save long answer question if valid
      if (laq.question) {
        questionPromises.push(
          retryPrismaOperation(
            () =>
              prisma.longAnswerQuestion.create({
                data: {
                  question: laq.question,
                  articleId: articleId,
                },
              }),
            maxPrismaRetries
          )
        );
      }

      // Execute all question saves
      if (questionPromises.length > 0) {
        await Promise.all(questionPromises);
        console.log(`[DEBUG] All questions saved successfully`);
      } else {
        console.log(`[DEBUG] No questions to save`);
      }

      // Generate Word List
      console.log(`[DEBUG] Starting word list generation...`);
      const wordList = await generateWordList({
        passage: generatedArticle.passage,
      });
      console.log(`[DEBUG] Word list generation completed:`, {
        wordCount: wordList.word_list?.length || 0,
      });

      // Generate Audio and get timepoints first (to get consistent sentence splitting)
      console.log(`[DEBUG] Starting audio generation...`);
      const sentences = await generateAudio({
        passage: generatedArticle.passage,
        articleId: articleId,
      });
      console.log(`[DEBUG] Audio generation completed:`, {
        sentenceCount: sentences?.length || 0,
      });

      console.log(`[DEBUG] Starting word audio generation...`);
      const wordsWithTimePoints = await generateAudioForWord({
        wordList: wordList.word_list,
        articleId: articleId,
      });
      console.log(`[DEBUG] Word audio generation completed:`, {
        wordsWithTimePointsCount: wordsWithTimePoints?.length || 0,
      });

      // Update article with translations, sentences, and words
      console.log(`[DEBUG] Starting final article update with all data...`);
      await retryPrismaOperation(
        () =>
          prisma.article.update({
            where: { id: articleId },
            data: {
              sentences: sentences,
              words: wordsWithTimePoints,
            },
          }),
        maxPrismaRetries
      );
      console.log(`[DEBUG] Final article update completed`);

      console.log("[DEBUG] Article generation successful!");
      return articleId;
    } catch (error) {
      console.error(
        `[DEBUG] Error during article generation (Attempt ${attempts + 1}/${maxRetries}):`,
        error
      );
      lastError = error;

      // Cleanup on error if article was created
      if (articleId) {
        console.log(
          `[DEBUG] Starting cleanup for failed article: ${articleId}`
        );
        await cleanupFailedPrismaGeneration(articleId);
        articleId = ""; // Reset for next attempt
        console.log(`[DEBUG] Cleanup completed for failed article`);
      }
    }

    attempts++;
    if (attempts < maxRetries) {
      const delay = Math.pow(2, attempts) * 1000;
      console.log(
        `[DEBUG] Retrying in ${delay / 1000} seconds... (Attempt ${attempts + 1}/${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  console.error(
    `[DEBUG] Failed to generate article after ${maxRetries} max retries.`
  );

  let errorMessage = "Unknown error occurred";
  if (lastError instanceof Error) {
    errorMessage = lastError.message;
  } else if (typeof lastError === "string") {
    errorMessage = lastError;
  } else if (lastError) {
    errorMessage = JSON.stringify(lastError);
  }

  console.log(
    `[DEBUG] Sending failure notification to Discord: ${errorMessage}`
  );
  await sendDiscordWebhook({
    title: "Queue Generation Failed",
    embeds: [
      {
        description: { message: errorMessage },
        color: 0xff0000,
      },
    ],
    reqUrl,
    userAgent,
  });

  console.log(
    `[DEBUG] queue() function completed with failure, returning null`
  );
  return null;
}

async function evaluateArticle(
  type: ArticleType,
  genre: string,
  subgenre: string,
  topic: string,
  cefrLevel: ArticleBaseCefrLevel,
  maxAttempts: number = 2
) {
  let attempts = 0;
  // Helper to log attempts
  const logAttempt = (message: string) => {
    console.log(`Attempt (${attempts + 1}/${maxAttempts}): ${message}`);
  };
  while (attempts < maxAttempts) {
    try {
      const generatedArticle = await generateArticle({
        type,
        genre,
        subgenre,
        topic,
        cefrLevel,
      });
      const evaluatedRating = await evaluateRating({
        title: generatedArticle.title,
        summary: generatedArticle.summary,
        type,
        image_description: generatedArticle.imageDesc,
        passage: generatedArticle.passage,
        cefrLevel,
      });
      const { raLevel, cefrLevel: cefr_level } = calculateLevel(
        generatedArticle.passage,
        cefrLevel
      );

      console.log(
        `CEFR ${cefrLevel}, Evaluated Rating: ${evaluatedRating.rating}, Evaluated CEFR: ${cefr_level}, Evaluated raLevel: ${raLevel}`
      );

      if (evaluatedRating.rating > 2) {
        return {
          article: generatedArticle,
          rating: evaluatedRating.rating,
          cefrlevel: cefr_level,
          raLevel,
        };
      }
      // Log failure and increment attempts
      logAttempt(`Rating failed (${evaluatedRating.rating}), regenerating...`);
    } catch (error) {
      console.error(`Error during article generation/evaluation: ${error}`);
    }
    attempts++;
  }
  // All attempts failed
  throw new Error(
    `Failed to generate a suitable article after ${maxAttempts} attempts.`
  );
}

export async function generateUserArticle(req: NextRequest) {
  let articleId: string = "";
  let userId: string = "";

  try {
    //console.log("Starting user article generation...");

    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      //console.log("Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    userId = session.user.id;
    //console.log(`User ID: ${userId}`);

    // Get user data from Prisma to fetch license_id
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        licenseOnUsers: {
          include: {
            license: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let author = user.name || user.email || "Unknown Author";

    // Get school name from the latest active license if needed for additional context
    const latestLicense = user.licenseOnUsers[0]; // Get the first license
    if (latestLicense?.license && !user.name) {
      author = latestLicense.license.schoolName || "Unknown School";
    }

    // Parse request body
    const body: GenerateArticleRequest = await req.json();
    const { type, genre, subgenre, topic, cefrLevel, wordCount } = body;
    //console.log("Request parameters:", {
    //  type,
    //  genre,
    //  subgenre,
    //  topic,
    //  cefrLevel,
    //  wordCount,
    //});

    // Validate required fields
    if (!type || !genre || !topic || !cefrLevel) {
      //console.log("Missing required fields:", {
      //  type,
      //  genre,
      //  topic,
      //  cefrLevel,
      //});
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Convert string values to enums
    const articleType =
      type.toLowerCase() === "fiction"
        ? ArticleType.FICTION
        : ArticleType.NONFICTION;

    const cefrLevelEnum = cefrLevel as ArticleBaseCefrLevel;
    //console.log(`Article type: ${articleType}, CEFR level: ${cefrLevelEnum}`);

    // Generate article
    //console.log("Generating article...");
    const generatedArticle = await generateArticle({
      type: articleType,
      genre,
      subgenre: subgenre || "",
      topic,
      cefrLevel: cefrLevelEnum,
    });
    //console.log("Article generated successfully");

    // Evaluate rating
    //console.log("Evaluating article rating...");
    const evaluatedRating = await evaluateRating({
      title: generatedArticle.title,
      summary: generatedArticle.summary,
      type: articleType,
      image_description: generatedArticle.imageDesc,
      passage: generatedArticle.passage,
      cefrLevel: cefrLevelEnum,
    });
    //console.log(`Article rating: ${evaluatedRating.rating}`);

    // Calculate levels
    //console.log("Calculating levels...");
    const { raLevel, cefrLevel: calculatedCefrLevel } = calculateLevel(
      generatedArticle.passage,
      cefrLevelEnum
    );
    //console.log(
    //  `Calculated CEFR level: ${calculatedCefrLevel}, RA level: ${raLevel}`
    //);

    // Create article using Prisma
    const article = await prisma.article.create({
      data: {
        type: articleType,
        genre,
        subGenre: subgenre || "",
        title: generatedArticle.title,
        summary: generatedArticle.summary,
        passage: generatedArticle.passage,
        imageDescription: generatedArticle.imageDesc,
        cefrLevel: calculatedCefrLevel,
        raLevel,
        rating: evaluatedRating.rating,
        authorId: userId,
        isPublic: false, // Set as private by default for user-generated articles
      },
    });

    articleId = article.id;

    //console.log(`Saving article to database with ID: ${articleId}`);
    //console.log(`Word count: ${generatedArticle.passage.split(" ").length}, Target: ${wordCount}`);
    //console.log(`Author: ${author}`);

    // Generate additional content
    //console.log("Generating additional content...");

    // Generate Image
    //console.log("Generating image...");
    await generateImage({
      imageDesc: generatedArticle.imageDesc,
      articleId: articleId,
    });
    //console.log("Image generated successfully");

    // Generate Questions
    //console.log("Generating questions...");
    const [mcq, saq, laq] = await Promise.all([
      generateMCQuestion({
        type: articleType,
        cefrlevel: cefrLevelEnum,
        passage: generatedArticle.passage,
        title: generatedArticle.title,
        summary: generatedArticle.summary,
        imageDesc: generatedArticle.imageDesc,
      }),
      generateSAQuestion({
        type: articleType,
        cefrlevel: cefrLevelEnum,
        passage: generatedArticle.passage,
        title: generatedArticle.title,
        summary: generatedArticle.summary,
        imageDesc: generatedArticle.imageDesc,
      }),
      generateLAQuestion({
        type: articleType,
        cefrlevel: cefrLevelEnum,
        passage: generatedArticle.passage,
        title: generatedArticle.title,
        summary: generatedArticle.summary,
        imageDesc: generatedArticle.imageDesc,
      }),
    ]);
    //console.log("Questions generated successfully");

    // Save questions to database using Prisma
    //console.log("Saving questions...");

    // Transform and validate questions before saving
    const transformedMCQuestions = mcq.questions
      .map((q: any) => {
        // Create options array with correct answer and distractors
        const options = [
          q.correct_answer,
          q.distractor_1,
          q.distractor_2,
          q.distractor_3,
        ].filter(Boolean); // Remove any undefined values

        if (options.length !== 4) return null; // Must have exactly 4 options

        // Shuffle the options
        const shuffledOptions = [...options].sort(() => Math.random() - 0.5);

        return {
          question: q.question,
          options: shuffledOptions,
          answer: q.correct_answer, // Keep the correct answer as text
          textualEvidence: q.textual_evidence || "",
          articleId: articleId,
        };
      })
      .filter(
        (q): q is NonNullable<typeof q> =>
          q !== null &&
          q.question &&
          q.options &&
          q.options.length === 4 &&
          q.answer
      );

    const transformedSAQuestions = saq.questions
      .map((q: any) => ({
        question: q.question,
        answer: q.suggested_answer || q.answer, // Handle both formats
        articleId: articleId,
      }))
      .filter((q: any) => q.question && q.answer);

    const questionPromises = [];

    // Save multiple choice questions if valid
    if (transformedMCQuestions.length > 0) {
      questionPromises.push(
        prisma.multipleChoiceQuestion.createMany({
          data: transformedMCQuestions,
        })
      );
    }

    // Save short answer questions if valid
    if (transformedSAQuestions.length > 0) {
      questionPromises.push(
        prisma.shortAnswerQuestion.createMany({
          data: transformedSAQuestions,
        })
      );
    }

    // Save long answer question if valid
    if (laq.question) {
      questionPromises.push(
        prisma.longAnswerQuestion.create({
          data: {
            question: laq.question,
            articleId: articleId,
          },
        })
      );
    }

    // Execute all question saves
    if (questionPromises.length > 0) {
      await Promise.all(questionPromises);
    }
    //console.log("Questions saved successfully");

    // Generate Word List
    //console.log("Generating word list...");
    const wordList = await generateWordList({
      passage: generatedArticle.passage,
    });
    //console.log("Word list generated successfully");

    // Generate Audio and get timepoints first (to get consistent sentence splitting)
    //console.log("Generating audio...");
    const sentences = await generateAudio({
      passage: generatedArticle.passage,
      articleId: articleId,
      isUserGenerated: true,
      userId: userId,
    });

    // Generate translations using the sentences from audio generation
    //console.log("Generating translations...");
    let translatedSummary, translatedPassage;
    try {
      // Extract just the sentence text from the audio results
      const sentenceTexts = sentences.map((s) => s.sentences);

      [translatedSummary, translatedPassage] = await Promise.all([
        generateTranslatedSummary({
          summary: generatedArticle.summary,
        }),
        generateTranslatedPassageFromSentences({
          sentences: sentenceTexts,
        }),
      ]);
      //console.log("Translations generated successfully");
    } catch (translationError) {
      console.error("Translation failed after all retries:", translationError);
      // Cleanup the article and related files
      if (articleId) {
        await cleanupFailedPrismaGeneration(articleId);
      }
      throw new Error(
        `Translation failed: ${translationError instanceof Error ? translationError.message : "Unknown translation error"}`
      );
    }

    // Note: We don't update the article with word list here anymore
    // because generateAudioForWord will save the complete words with timepoints

    const wordsWithTimePoints = await generateAudioForWord({
      wordList: wordList.word_list,
      articleId: articleId,
      isUserGenerated: true,
      userId: userId,
    });
    //console.log("Audio generated successfully");

    // Update article with translations
    await prisma.article.update({
      where: { id: articleId },
      data: {
        translatedSummary: translatedSummary,
        translatedPassage: translatedPassage,
      },
    });

    // Get the updated article with timepoints
    const updatedArticle = await prisma.article.findUnique({
      where: { id: articleId },
      include: {
        multipleChoiceQuestions: true,
        shortAnswerQuestions: true,
        longAnswerQuestions: true,
      },
    });

    if (!updatedArticle) {
      throw new Error("Article was created but not found in database");
    }

    // Return the generated article
    //console.log("Returning generated article response");
    return NextResponse.json({
      article: {
        id: articleId,
        type: articleType,
        genre,
        subgenre: subgenre || "",
        title: generatedArticle.title,
        summary: generatedArticle.summary,
        passage: generatedArticle.passage,
        image_description: generatedArticle.imageDesc,
        cefr_level: calculatedCefrLevel,
        ra_level: raLevel,
        average_rating: evaluatedRating.rating,
        audioUrl: `${articleId}.mp3`,
        audioUrlWords: `${articleId}.mp3`,
        created_at: updatedArticle.createdAt.toISOString(),
        timepoints: updatedArticle.sentences || [],
        translatedPassage: translatedPassage,
        translatedSummary: translatedSummary,
        read_count: 0,
        isPublic: false,
        author, // Include author in response
        words: wordsWithTimePoints, // Include words with timepoints and definitions
      },
    });
  } catch (error) {
    console.error("Error generating user article:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );

    // Cleanup on error
    if (articleId) {
      //console.log("Starting cleanup process...");
      await cleanupFailedPrismaGeneration(articleId);
    }

    return NextResponse.json(
      {
        error: "Failed to generate article",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function approveUserArticle(req: NextRequest) {
  try {
    //console.log("Starting article approval process...");

    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      //console.log("Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    //console.log(`User ID: ${userId}`);

    // Parse request body
    const { articleId } = await req.json();
    if (!articleId) {
      return NextResponse.json(
        { error: "Article ID is required" },
        { status: 400 }
      );
    }

    //console.log(`Approving article: ${articleId}`);

    // Get the user's generated article using Prisma
    const article = await prisma.article.findUnique({
      where: {
        id: articleId,
        authorId: userId, // Ensure the article belongs to the requesting user
      },
    });

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    //console.log("Article found, starting approval process...", article);

    // Update article to make it public (approved)
    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: {
        isPublic: true,
        updatedAt: new Date(),
      },
    });

    //console.log("Article approval process completed successfully");

    return NextResponse.json({
      message: "Article approved successfully",
      articleId: articleId,
      isPublic: updatedArticle.isPublic,
    });
  } catch (error) {
    console.error("Error approving article:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );

    return NextResponse.json(
      {
        error: "Failed to approve article",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function getUserGeneratedArticles(req: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user's generated articles using Prisma
    const articles = await prisma.article.findMany({
      where: {
        authorId: userId,
      },
      include: {
        multipleChoiceQuestions: true,
        shortAnswerQuestions: true,
        longAnswerQuestions: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform the data to match the expected format
    const transformedArticles = articles.map((article) => ({
      id: article.id,
      type: article.type,
      genre: article.genre,
      subgenre: article.subGenre,
      title: article.title,
      summary: article.summary,
      passage: article.passage,
      imageDesc: article.imageDescription,
      cefr_level: article.cefrLevel,
      raLevel: article.raLevel,
      rating: article.rating,
      createdAt: article.createdAt.toISOString(),
      updatedAt: article.updatedAt.toISOString(),
      translatedSummary: article.translatedSummary,
      translatedPassage: article.translatedPassage,
      sentences: article.sentences,
      words: article.words,
      status: article.isPublic ? "approved" : "draft", // Map isPublic to status
      multipleChoiceQuestions: article.multipleChoiceQuestions,
      shortAnswerQuestions: article.shortAnswerQuestions,
      longAnswerQuestions: article.longAnswerQuestions,
    }));

    return NextResponse.json({ articles: transformedArticles });
  } catch (error) {
    console.error("Error fetching user articles:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}

export async function updateUserArticle(
  req: NextRequest,
  ctx: Context
): Promise<NextResponse> {
  try {
    const params = ctx.params ? await ctx.params : undefined;
    const articleId = params?.articleId;

    if (!articleId) {
      return NextResponse.json(
        { error: "articleId is required" },
        { status: 400 }
      );
    }
    //console.log(`Starting article update for ID: ${articleId}`);

    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      //console.log("Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    //console.log(`User ID: ${userId}`);

    // Parse request body
    const { title, passage, summary, imageDesc } = await req.json();
    if (!title || !passage || !summary || !imageDesc) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get the existing article using Prisma
    const existingArticle = await prisma.article.findUnique({
      where: {
        id: articleId,
        authorId: userId, // Ensure the article belongs to the requesting user
      },
    });

    if (!existingArticle) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const normalizedCefrLevel = existingArticle.cefrLevel
      ?.replace("+", "")
      ?.toLowerCase();

    if (!normalizedCefrLevel) {
      return NextResponse.json(
        { error: "CEFR level not found in article data" },
        { status: 400 }
      );
    }
    //console.log(
    //  `Normalized CEFR level: ${normalizedCefrLevel} (from ${existingArticle.cefrLevel})`
    //);

    const { raLevel, cefrLevel: calculatedCefrLevel } = calculateLevel(
      passage,
      normalizedCefrLevel
    );

    // 3. Update article data using Prisma
    await prisma.article.update({
      where: { id: articleId },
      data: {
        title,
        passage,
        summary,
        imageDescription: imageDesc,
        cefrLevel: calculatedCefrLevel,
        raLevel,
        updatedAt: new Date(),
      },
    });
    //console.log("Article data updated in database");

    // 4. Delete existing questions using Prisma
    //console.log("Deleting existing questions...");
    await Promise.all([
      prisma.multipleChoiceQuestion.deleteMany({
        where: { articleId },
      }),
      prisma.shortAnswerQuestion.deleteMany({
        where: { articleId },
      }),
      prisma.longAnswerQuestion.deleteMany({
        where: { articleId },
      }),
    ]);

    // Generate new questions
    //console.log("Generating new questions...");
    const [mcq, saq, laq] = await Promise.all([
      generateMCQuestion({
        type: existingArticle.type as ArticleType,
        cefrlevel: normalizedCefrLevel as ArticleBaseCefrLevel,
        passage: passage,
        title: title,
        summary: summary,
        imageDesc: imageDesc,
      }),
      generateSAQuestion({
        type: existingArticle.type as ArticleType,
        cefrlevel: normalizedCefrLevel as ArticleBaseCefrLevel,
        passage: passage,
        title: title,
        summary: summary,
        imageDesc: imageDesc,
      }),
      generateLAQuestion({
        type: existingArticle.type as ArticleType,
        cefrlevel: normalizedCefrLevel as ArticleBaseCefrLevel,
        passage: passage,
        title: title,
        summary: summary,
        imageDesc: imageDesc,
      }),
    ]);

    // Transform and validate questions before saving (same as generateUserArticle)
    const transformedMCQuestions = mcq.questions
      .map((q: any) => {
        // Create options array with correct answer and distractors
        const options = [
          q.correct_answer,
          q.distractor_1,
          q.distractor_2,
          q.distractor_3,
        ].filter(Boolean); // Remove any undefined values

        if (options.length !== 4) return null; // Must have exactly 4 options

        // Shuffle the options
        const shuffledOptions = [...options].sort(() => Math.random() - 0.5);

        return {
          question: q.question,
          options: shuffledOptions,
          answer: q.correct_answer, // Keep the correct answer as text
          textualEvidence: q.textual_evidence || "",
          articleId: articleId,
        };
      })
      .filter(
        (q): q is NonNullable<typeof q> =>
          q !== null &&
          q.question &&
          q.options &&
          q.options.length === 4 &&
          q.answer
      );

    const transformedSAQuestions = saq.questions
      .map((q: any) => ({
        question: q.question,
        answer: q.suggested_answer || q.answer, // Handle both formats
        articleId: articleId,
      }))
      .filter((q: any) => q.question && q.answer);

    const questionPromises = [];

    // Save multiple choice questions if valid
    if (transformedMCQuestions.length > 0) {
      questionPromises.push(
        prisma.multipleChoiceQuestion.createMany({
          data: transformedMCQuestions,
        })
      );
    }

    // Save short answer questions if valid
    if (transformedSAQuestions.length > 0) {
      questionPromises.push(
        prisma.shortAnswerQuestion.createMany({
          data: transformedSAQuestions,
        })
      );
    }

    // Save long answer question if valid
    if (laq.question) {
      questionPromises.push(
        prisma.longAnswerQuestion.create({
          data: {
            question: laq.question,
            articleId: articleId,
          },
        })
      );
    }

    // Execute all question saves
    if (questionPromises.length > 0) {
      await Promise.all(questionPromises);
    }
    //console.log("Questions saved successfully");

    // Generate new word list
    //console.log("Generating new word list...");
    const wordList = await generateWordList({
      passage: passage,
    });

    // Delete old audio files before generating new ones
    //console.log("Deleting old audio files...");
    await cleanupAudioFiles(articleId, userId);

    // Generate new audio first (to get consistent sentence splitting)
    //console.log("Generating new audio...");
    const sentences = await generateAudio({
      passage: passage,
      articleId: articleId,
      isUserGenerated: true,
      userId: userId,
    });

    // Generate translations using the sentences from audio generation
    //console.log("Generating translations...");
    let translatedSummary, translatedPassage;
    try {
      // Extract just the sentence text from the audio results
      const sentenceTexts = sentences.map((s) => s.sentences);

      [translatedSummary, translatedPassage] = await Promise.all([
        generateTranslatedSummary({
          summary: summary,
        }),
        generateTranslatedPassageFromSentences({
          sentences: sentenceTexts,
        }),
      ]);
      //console.log("Translations generated successfully");
    } catch (translationError) {
      console.error("Translation failed after all retries:", translationError);
      // For update operations, we'll throw the error but won't delete the article
      // since it's an existing article being updated
      throw new Error(
        `Translation failed: ${translationError instanceof Error ? translationError.message : "Unknown translation error"}`
      );
    }

    // Generate word audio separately since it returns data
    const wordsWithTimePoints = await generateAudioForWord({
      wordList: wordList.word_list,
      articleId: articleId,
      isUserGenerated: true,
      userId: userId,
    });

    // Update article with translations and word data
    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: {
        translatedSummary: translatedSummary,
        translatedPassage: translatedPassage,
      },
    });

    //console.log("Article update completed successfully");

    return NextResponse.json({
      message: "Article updated successfully",
      article: {
        id: articleId,
        type: existingArticle.type,
        genre: existingArticle.genre,
        subgenre: existingArticle.subGenre,
        title: title,
        summary: summary,
        passage: passage,
        image_description: imageDesc,
        cefr_level: calculatedCefrLevel,
        ra_level: raLevel,
        average_rating: existingArticle.rating,
        audioUrl: `${articleId}.mp3`,
        audioUrlWords: `${articleId}.mp3`,
        created_at: existingArticle.createdAt.toISOString(),
        updated_at: updatedArticle.updatedAt.toISOString(),
        timepoints: updatedArticle.sentences || [],
        translatedPassage: translatedPassage,
        translatedSummary: translatedSummary,
        read_count: 0,
        isPublic: existingArticle.isPublic,
        words: wordsWithTimePoints,
      },
    });
  } catch (error) {
    console.error("Error updating article:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );

    return NextResponse.json(
      {
        error: "Failed to update article",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function cleanupAudioFiles(articleId: string, userId?: string) {
  try {
    // Import Firebase Admin Storage
    const { getStorage } = await import("firebase-admin/storage");
    // ระบุ bucket name โดยตรง
    const bucket = getStorage().bucket(
      "artifacts.reading-advantage.appspot.com"
    );

    // Audio file paths for articles
    const audioFiles = [
      `tts/${articleId}.mp3`,
      `audios-words/${articleId}.mp3`,
    ];

    for (const filePath of audioFiles) {
      try {
        const file = bucket.file(filePath);
        const [exists] = await file.exists();
        if (exists) {
          await file.delete();
          //console.log(`Deleted audio file: ${filePath}`);
        }
      } catch (fileError) {
        // File might not exist, continue
        //console.log(`Could not delete audio file: ${filePath}`);
      }
    }

    //console.log("Audio files cleanup completed");
  } catch (storageError) {
    console.error("Error cleaning up audio files:", storageError);
  }
}

async function cleanupStorageFiles(articleId: string, userId?: string) {
  try {
    // Import Firebase Admin Storage
    const { getStorage } = await import("firebase-admin/storage");
    // ระบุ bucket name โดยตรง
    const bucket = getStorage().bucket(
      "artifacts.reading-advantage.appspot.com"
    );

    // File paths for user-generated content and regular content
    const basePaths = [
      // Regular paths
      `images/${articleId}`,
      `tts/${articleId}`,
      // User-generated paths (if userId provided)
      ...(userId
        ? [
            `users/${userId}/images/${articleId}`,
            `users/${userId}/tts/${articleId}`,
          ]
        : []),
    ];

    const fileExtensions = [".png", ".mp3"];

    for (const basePath of basePaths) {
      for (const ext of fileExtensions) {
        try {
          const filePath = basePath + ext;
          const file = bucket.file(filePath);
          const [exists] = await file.exists();
          if (exists) {
            await file.delete();
            //console.log(`Deleted file: ${filePath}`);
          }
        } catch (fileError) {
          // File might not exist, continue
          //console.log(`Could not delete file: ${basePath}${ext}`);
        }
      }

      // Also try to delete directories
      try {
        const [files] = await bucket.getFiles({ prefix: `${basePath}/` });
        if (files.length > 0) {
          const deletePromises = files.map((file) => file.delete());
          await Promise.all(deletePromises);
          //console.log(
          //  `Deleted ${files.length} files in directory: ${basePath}/`
          //);
        }
      } catch (dirError) {
        //console.log(`Could not delete directory: ${basePath}/`);
      }
    }
  } catch (storageError) {
    console.error("Error cleaning up storage files:", storageError);
  }
}

async function cleanupFailedPrismaGeneration(articleId: string) {
  try {
    //console.log(`Cleaning up failed generation for article: ${articleId}`);

    // Delete article and all related records from database using Prisma
    await prisma.$transaction(async (tx) => {
      // Delete questions first (due to foreign key constraints)
      await tx.multipleChoiceQuestion.deleteMany({
        where: { articleId },
      });

      await tx.shortAnswerQuestion.deleteMany({
        where: { articleId },
      });

      await tx.longAnswerQuestion.deleteMany({
        where: { articleId },
      });

      // Delete the article itself
      await tx.article.delete({
        where: { id: articleId },
      });
    });

    //console.log("Deleted article and questions from database");

    // Delete files from Cloud Storage bucket
    await cleanupStorageFiles(articleId);

    //console.log("Cleanup completed successfully");
  } catch (cleanupError) {
    console.error("Error during cleanup:", cleanupError);
    // Log cleanup error but don't throw to avoid masking original error
  }
}
