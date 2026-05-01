import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomSelectGenre } from "./random-select-genre";
import { ArticleBaseCefrLevel, ArticleType } from "../../models/enum";
import { generateStoryBible } from "./stories-bible-generator";
import { getCEFRRequirements } from "../CEFR-requirements";
import { generateChapters } from "./stories-chapters-generator";
import { generateStoriesTopic } from "./stories-topic-generator";
import { generateImage } from "./image-generator";
import { deleteStoryAndImages } from "@/utils/deleteStories";
import { evaluateRating } from "./evaluate-rating-generator";
import { calculateLevel } from "@/lib/calculateLevel";
import { sendDiscordWebhook } from "../send-discord-webhook";
import { generateAudio } from "./audio-generator";
import { generateAudioForWord } from "./audio-words-generator";

const CEFRLevels = [
  ArticleBaseCefrLevel.A1,
  ArticleBaseCefrLevel.A2,
  ArticleBaseCefrLevel.B1,
  ArticleBaseCefrLevel.B2,
  ArticleBaseCefrLevel.C1,
  ArticleBaseCefrLevel.C2,
];

export async function generateStories(req: NextRequest) {
  try {
    const startTime = Date.now();
    const body = await req.json();
    const { amountPerGenre } = body;
    if (!amountPerGenre) throw new Error("amountPerGenre is required");

    const amount = parseInt(amountPerGenre);
    const articleTypes = [ArticleType.FICTION];

    let successfulCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    await sendDiscordWebhook({
      title: "Generate Stories",
      embeds: [
        {
          description: {
            "Amount per genre": amountPerGenre,
            "Total stories generating": `${amount * CEFRLevels.length}`,
          },
          color: 0x0099ff,
        },
      ],
      color: 0x0099ff,
      reqUrl: req.url,
      userAgent: req.headers.get("user-agent") || "",
    });

    // Process CEFRLevels in parallel
    const results = await Promise.all(
      CEFRLevels.map(async (level) => {
        for (const type of articleTypes) {
          const genreData = await randomSelectGenre({ type });
          const { genre, subgenre } = genreData;

          const topicData = await generateStoriesTopic({
            type,
            genre,
            subgenre,
            amountPerGenre: amount,
          });
          const topics = topicData.topics;

          for (const topic of topics) {
            let storyId: string;
            let storyBible: any;

            const existingStory = await prisma.story.findFirst({
              where: {
                title: topic,
                cefrLevel: level,
              },
              include: {
                chapters: true,
              },
            });

            if (existingStory) {
              storyId = existingStory.id;
              storyBible = existingStory.storyBible;
              // Calculate and update raLevel for existing story
              try {
                const { raLevel: storyRaLevel } = calculateLevel(
                  existingStory.summary || "",
                  level
                );
                await prisma.story.update({
                  where: { id: storyId },
                  data: { raLevel: storyRaLevel },
                });
              } catch (levelError) {
                console.error(
                  "❌ Updating existing story raLevel failed:",
                  levelError
                );
              }
            } else {
              storyBible = await generateStoryBible({ topic, genre, subgenre });

              // Calculate raLevel for new story based on summary
              const { raLevel: storyRaLevel } = calculateLevel(
                (storyBible as any)?.summary || "",
                level
              );
              const newStory = await prisma.story.create({
                data: {
                  title: topic,
                  summary: (storyBible as any)?.summary || "",
                  imageDescription:
                    (storyBible as any)?.["image-description"] || "",
                  genre,
                  subgenre,
                  type,
                  storyBible: storyBible as any, // Cast to any for JSON storage
                  cefrLevel: level,
                  raLevel: storyRaLevel,
                },
              });
              storyId = newStory.id;
            }

            if (existingStory && existingStory.chapters.length > 0) {
              skippedCount++;
              continue;
            }

            try {
              await generateImage({
                imageDesc: (storyBible as any)?.["image-description"] || "",
                articleId: storyId,
              });
            } catch (imageError) {
              console.error("❌ Image generation failed:", imageError);
              await deleteStoryAndImages(storyId);
              failedCount++;
              continue;
            }

            const chapterCount = Math.floor(Math.random() * 3) + 6;
            const wordCountPerChapter =
              getCEFRRequirements(level).wordCount.fiction;

            const previousChapters = existingStory
              ? existingStory.chapters
              : [];

            try {
              const chapters = await generateChapters({
                type,
                storyBible: storyBible as any, // Cast to expected type
                cefrLevel: level,
                previousChapters: [], // We'll simplify this for now
                chapterCount,
                wordCountPerChapter,
                storyId: storyId,
              });

              if (chapters.length !== chapterCount) {
                throw new Error(
                  `Expected ${chapterCount} chapters, but got ${chapters.length}`
                );
              }

              // Calculate levels before saving chapters
              const { raLevel, cefrLevel: calculatedCefrLevel } =
                calculateLevel((storyBible as any)?.summary || "", level);

              // Save chapters to database using Prisma
              const createdChapters = [];
              for (let i = 0; i < chapters.length; i++) {
                const chapter = chapters[i];
                const createdChapter = await prisma.chapter.create({
                  data: {
                    storyId: storyId,
                    chapterNumber: i + 1,
                    type: type,
                    genre: genre,
                    subGenre: subgenre,
                    cefrLevel: level,
                    raLevel: raLevel,
                    title: chapter.title,
                    passage: chapter.passage,
                    summary: chapter.summary,
                    imageDescription: chapter["image-description"],
                    rating: chapter.rating,
                    wordCount: chapter.analysis?.wordCount,
                    audioUrl: `${storyId}-${i + 1}.mp3`,
                    audioWordUrl: `${storyId}-${i + 1}.json`,
                  },
                });

                // Generate audio and timepoints for chapter (similar to generateUserArticle)
                try {
                  // Generate word list for audio
                  const wordListForAudio =
                    chapter.analysis?.vocabulary.targetWordsUsed || [];

                  // Generate chapter audio with sentences timepoints
                  let sentences: any;
                  for (let attempt = 1; attempt <= 5; attempt++) {
                    try {
                      sentences = await generateAudio({
                        passage: chapter.passage,
                        articleId: `${storyId}-${i + 1}`,
                        isChapter: true,
                        chapterId: createdChapter.id,
                        isUserGenerated: false, // This is system generated
                        userId: "",
                      });
                      break;
                    } catch (audioError) {
                      console.error(
                        `❌ Chapter ${i + 1} audio generation failed (attempt ${attempt}/5):`,
                        audioError
                      );
                      if (attempt === 5) throw audioError;
                    }
                  }

                  // Generate words audio with timepoints
                  let wordsWithTimePoints: any;
                  for (let attempt = 1; attempt <= 5; attempt++) {
                    try {
                      wordsWithTimePoints = await generateAudioForWord({
                        wordList: wordListForAudio,
                        articleId: `${storyId}-${i + 1}`,
                        isChapter: true,
                        chapterId: createdChapter.id,
                        isUserGenerated: false, // This is system generated
                        userId: "",
                      });
                      break;
                    } catch (audioError) {
                      console.error(
                        `❌ Chapter ${i + 1} words audio generation failed (attempt ${attempt}/5):`,
                        audioError
                      );
                      if (attempt === 5) throw audioError;
                    }
                  }

                  // Update chapter with sentences and words timepoints
                  await prisma.chapter.update({
                    where: { id: createdChapter.id },
                    data: {
                      sentences: sentences,
                      words: wordsWithTimePoints,
                    },
                  });
                } catch (audioError) {
                  console.error(
                    `❌ Chapter ${i + 1} audio generation failed:`,
                    audioError
                  );
                  throw audioError;
                }

                createdChapters.push(createdChapter);
              }

              const chapterRatings = chapters.map(
                (chapter) => chapter.rating || 0
              );
              const totalRating = chapterRatings.reduce(
                (sum, rating) => sum + rating,
                0
              );
              let averageRating =
                chapters.length > 0 ? totalRating / chapters.length : 0;

              averageRating = Math.min(
                5,
                Math.max(1, Math.round(averageRating * 4) / 4)
              );

              const cefr_level = calculatedCefrLevel.replace(/[+-]/g, "");

              await prisma.story.update({
                where: { id: storyId },
                data: {
                  averageRating: averageRating,
                  raLevel: raLevel,
                  cefrLevel: cefr_level,
                },
              });

              // Generate chapter images
              for (let i = 0; i < chapters.length; i++) {
                try {
                  await generateImage({
                    imageDesc: chapters[i]["image-description"],
                    articleId: `${storyId}-${i + 1}`,
                  });
                } catch (imageError) {
                  console.error(
                    `❌ Chapter ${i + 1} image generation failed: ${imageError}`
                  );
                  throw imageError;
                }
              }
            } catch (chapterError) {
              console.error("❌ Chapter generation failed:", chapterError);
              await deleteStoryAndImages(storyId);
              failedCount++;
              continue;
            }

            successfulCount++;
          }
        }
      })
    );

    await sendDiscordWebhook({
      title: "Generate Stories Completed",
      embeds: [
        {
          description: {
            Successful: successfulCount.toString(),
            Failed: failedCount.toString(),
            Skipped: skippedCount.toString(),
            "Total time": `${((Date.now() - startTime) / 1000 / 60).toFixed(2)} minutes`,
          },
          color: successfulCount > 0 ? 0x00ff00 : 0xff0000,
        },
      ],
      color: successfulCount > 0 ? 0x00ff00 : 0xff0000,
      reqUrl: req.url,
      userAgent: req.headers.get("user-agent") || "",
    });
    return NextResponse.json({
      message: "Stories generated successfully",
      successfulCount,
      failedCount,
      skippedCount,
    });
  } catch (error) {
    console.error("❌ Error in story generation process:", error);
    await sendDiscordWebhook({
      title: "Generate Stories Failed",
      embeds: [
        {
          description: {
            Error: error instanceof Error ? error.message : String(error),
          },
          color: 0xff0000,
        },
      ],
      color: 0xff0000,
      reqUrl: req.url,
      userAgent: req.headers.get("user-agent") || "",
    });
    return NextResponse.json(
      { error: "Error in story generation process" },
      { status: 500 }
    );
  }
}
