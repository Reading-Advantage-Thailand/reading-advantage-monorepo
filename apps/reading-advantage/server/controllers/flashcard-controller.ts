import { ExtendedNextRequest, assertSelfOrAllowedStaff } from "./auth-controller";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fsrs, generatorParameters, Rating, State } from "ts-fsrs";
import { splitTextIntoSentences } from "@/lib/utils";
import { generateTranslatedPassageFromSentences } from "@/server/utils/generators/translation-generator";

interface RequestContext {
  params: Promise<{
    id: string;
    articleId?: string;
  }>;
}

interface WordList {
  vocabulary: string;
  definition: {
    en: string;
    th: string;
    cn: string;
    tw: string;
    vi: string;
  };
  audioUrl: string;
  endTime: number;
  startTime: number;
  index: number;
  [key: string]: any;
}

export async function getFlashcardStats(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  const { id: routeId } = await ctx.params;
  if (!assertSelfOrAllowedStaff(req, routeId)) {
    return NextResponse.json({ message: "Forbidden - Access denied to this resource" }, { status: 403 });
  }
  const id = routeId;
  try {
    const type = req.nextUrl.searchParams.get("type"); // "vocabulary" or "sentences"

    if (type === "vocabulary") {
      const vocabularies = await prisma.userWordRecord.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
      });

      const stats = calculateFlashcardStats(vocabularies);
      return NextResponse.json({
        message: "Vocabulary stats retrieved",
        stats,
        vocabularies,
        status: 200,
      });
    } else if (type === "sentences") {
      const sentences = await prisma.userSentenceRecord.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
      });

      const stats = calculateFlashcardStats(sentences);
      return NextResponse.json({
        message: "Sentences stats retrieved",
        stats,
        sentences,
        status: 200,
      });
    } else {
      // Return both
      const [vocabularies, sentences] = await Promise.all([
        prisma.userWordRecord.findMany({
          where: { userId: id },
          orderBy: { createdAt: "desc" },
        }),
        prisma.userSentenceRecord.findMany({
          where: { userId: id },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      return NextResponse.json({
        message: "Flashcard stats retrieved",
        vocabularyStats: calculateFlashcardStats(vocabularies),
        sentenceStats: calculateFlashcardStats(sentences),
        vocabularies,
        sentences,
        status: 200,
      });
    }
  } catch (error) {
    console.error("Error getting flashcard stats:", error);
    return NextResponse.json({
      message: "Internal server error",
      error,
      status: 500,
    });
  }
}

function calculateFlashcardStats(cards: any[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return cards.reduce(
    (stats, card) => {
      stats.total++;

      const dueDate = new Date(card.due);
      const cardDate = new Date(
        dueDate.getFullYear(),
        dueDate.getMonth(),
        dueDate.getDate()
      );

      if (cardDate <= today) {
        stats.due++;
      }

      switch (card.state) {
        case 0: // New
          stats.new++;
          break;
        case 1: // Learning
        case 3: // Relearning
          stats.learning++;
          break;
        case 2: // Review
          stats.review++;
          break;
      }

      return stats;
    },
    { total: 0, new: 0, learning: 0, review: 0, due: 0 }
  );
}

export async function updateFlashcardProgress(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  const { id: routeId } = await ctx.params;
  if (!assertSelfOrAllowedStaff(req, routeId)) {
    return NextResponse.json({ message: "Forbidden - Access denied to this resource" }, { status: 403 });
  }
  const id = routeId;
  try {
    const { cardId, rating, type } = await req.json();

    if (!cardId || !rating || !type) {
      return NextResponse.json({
        message: "Missing required fields: cardId, rating, type",
        status: 400,
      });
    }

    const isVocabulary = type === "vocabulary";

    // Get current card with proper typing
    let currentCard;
    if (isVocabulary) {
      currentCard = await prisma.userWordRecord.findUnique({
        where: { id: cardId },
      });
    } else {
      currentCard = await prisma.userSentenceRecord.findUnique({
        where: { id: cardId },
      });
    }

    if (!currentCard || currentCard.userId !== id) {
      return NextResponse.json({
        message: "Card not found or unauthorized",
        status: 404,
      });
    }

    // Calculate next review using FSRS
    const f = fsrs(generatorParameters());
    const now = new Date();

    const cardObj = {
      due: new Date(currentCard.due),
      stability: currentCard.stability,
      difficulty: currentCard.difficulty,
      elapsed_days: currentCard.elapsedDays,
      scheduled_days: currentCard.scheduledDays,
      reps: currentCard.reps,
      lapses: currentCard.lapses,
      state: currentCard.state as State,
      last_review: new Date(),
    };

    const schedulingInfo = f.repeat(cardObj, now);
    // Use the rating provided by user
    let selectedSchedule;
    switch (rating) {
      case 1: // Again
        selectedSchedule = schedulingInfo[Rating.Again];
        break;
      case 2: // Hard
        selectedSchedule = schedulingInfo[Rating.Hard];
        break;
      case 3: // Good
        selectedSchedule = schedulingInfo[Rating.Good];
        break;
      case 4: // Easy
        selectedSchedule = schedulingInfo[Rating.Easy];
        break;
      default:
        selectedSchedule = schedulingInfo[Rating.Good];
    }

    // Update card data structure to match Prisma schema
    const updateData = {
      difficulty: selectedSchedule.card.difficulty,
      due: selectedSchedule.card.due,
      elapsedDays: selectedSchedule.card.elapsed_days,
      lapses: selectedSchedule.card.lapses,
      reps: selectedSchedule.card.reps,
      scheduledDays: selectedSchedule.card.scheduled_days,
      stability: selectedSchedule.card.stability,
      state: selectedSchedule.card.state,
    };

    // Update with proper typing
    if (isVocabulary) {
      await prisma.userWordRecord.update({
        where: { id: cardId },
        data: updateData,
      });
    } else {
      await prisma.userSentenceRecord.update({
        where: { id: cardId },
        data: updateData,
      });
    }

    return NextResponse.json({
      message: "Card progress updated",
      status: 200,
    });
  } catch (error) {
    console.error("Error updating flashcard progress:", error);
    return NextResponse.json({
      message: "Internal server error",
      status: 500,
    });
  }
}

export async function postSaveWordList(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  const { id: routeId } = await ctx.params;
  if (!assertSelfOrAllowedStaff(req, routeId)) {
    return NextResponse.json({ message: "Forbidden - Access denied to this resource" }, { status: 403 });
  }
  const id = routeId;
  try {
    const {
      due,
      stability,
      difficulty,
      elapsed_days,
      scheduled_days,
      reps,
      lapses,
      state,
      articleId,
      storyId,
      chapterNumber,
      saveToFlashcard,
      foundWordsList,
    } = await req.json();

    const wordAllReadySaved: string[] = [];

    await Promise.all(
      foundWordsList.map(async (word: WordList) => {
        const whereClause: any = {
          userId: id,
          word: {
            path: ["vocabulary"],
            equals: word.vocabulary,
          },
        };

        if (articleId) {
          whereClause.articleId = articleId;
        } else if (storyId && chapterNumber !== undefined) {
          whereClause.storyId = storyId;
          whereClause.chapterNumber = Number(chapterNumber);
        }

        const existingRecord = await prisma.userWordRecord.findFirst({
          where: whereClause,
        });

        if (existingRecord) {
          wordAllReadySaved.push(word.vocabulary);
        } else {
          const recordData: any = {
            userId: id,
            saveToFlashcard,
            word: word,
            difficulty,
            due,
            elapsedDays: elapsed_days,
            lapses,
            reps,
            scheduledDays: scheduled_days,
            stability,
            state,
          };

          if (articleId) {
            recordData.articleId = articleId;
          } else if (storyId && chapterNumber !== undefined) {
            recordData.storyId = storyId;
            recordData.chapterNumber = Number(chapterNumber);
          }

          await prisma.userWordRecord.create({
            data: recordData,
          });
        }
      })
    );

    if (wordAllReadySaved.length > 0) {
      return NextResponse.json({
        message: `Word already saved
            ${wordAllReadySaved.join(", ")}`,
        status: 400,
      });
    } else {
      return NextResponse.json({
        message: "Word saved",
        status: 200,
      });
    }
  } catch (error) {
    console.error("postSaveWordList => ", error);
    return NextResponse.json({
      message: "Internal server error",
      status: 500,
    });
  }
}

export async function getWordList(
  req: NextRequest,
  ctx: RequestContext
) {
  const { id: routeId } = await ctx.params;
  if (!assertSelfOrAllowedStaff(req as ExtendedNextRequest, routeId)) {
    return NextResponse.json({ message: "Forbidden - Access denied to this resource" }, { status: 403 });
  }
  const id = routeId;
  try {
    const articleId = req.nextUrl.searchParams.get("articleId");
    const storyId = req.nextUrl.searchParams.get("storyId");
    const chapterNumber = req.nextUrl.searchParams.get("chapterNumber");

    const word = await prisma.userWordRecord.findMany({
      where: {
        userId: id,
        ...(articleId && { articleId }),
        ...(storyId && { storyId }),
        ...(chapterNumber && { chapterNumber: Number(chapterNumber) }),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      message: "User word retrieved",
      word,
      status: 200,
    });
  } catch (error) {
    return NextResponse.json({
      message: "Internal server error",
      error,
      status: 500,
    });
  }
}

export async function deleteWordlist(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  try {
    const { id: routeId } = await ctx.params;
    
    if (!assertSelfOrAllowedStaff(req, routeId)) {
      return NextResponse.json({ message: "Forbidden - Access denied to this resource" }, { status: 403 });
    }
    const id = routeId;
    
    const { id: recordId } = await req.json();

    // Verify ownership
    const record = await prisma.userWordRecord.findUnique({ where: { id: recordId } });
    if (!record || record.userId !== id) {
      return NextResponse.json({ message: "Forbidden - Not your record" }, { status: 403 });
    }

    await prisma.userWordRecord.delete({
      where: {
        id: recordId,
      },
    });

    return NextResponse.json({
      message: "Word deleted",
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({
      message: "Internal server error",
      status: 500,
    });
  }
}

export async function postSentendcesFlashcard(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  const { id: routeId } = await ctx.params;
  if (!assertSelfOrAllowedStaff(req, routeId)) {
    return NextResponse.json({ message: "Forbidden - Access denied to this resource" }, { status: 403 });
  }
  const id = routeId;
  try {
    const {
      articleId,
      storyId,
      chapterNumber,
      sentence,
      translation,
      sn,
      timepoint,
      endTimepoint,
      difficulty,
      due,
      elapsed_days,
      lapses,
      reps,
      scheduled_days,
      stability,
      state,
      audioUrl,
    } = await req.json();

    if (!articleId && (!storyId || chapterNumber === undefined)) {
      return NextResponse.json(
        { message: "Must provide articleId or storyId with chapterNumber" },
        { status: 400 }
      );
    }

    let whereClause: any = {
      userId: id,
      sn: sn,
    };

    if (articleId) {
      whereClause.articleId = articleId;
    } else {
      whereClause.storyId = storyId;
      whereClause.chapterNumber = chapterNumber;
    }

    const existingSentence = await prisma.userSentenceRecord.findFirst({
      where: whereClause,
    });

    if (existingSentence) {
      return NextResponse.json(
        { message: "Sentence already saved" },
        { status: 400 }
      );
    }

    // Prepare the translation object with all available translations from the article
    let fullTranslation = translation;

    if (articleId) {
      // Get the article to fetch all available translations
      const article = await prisma.article.findUnique({
        where: { id: articleId },
        select: {
          translatedPassage: true,
        },
      });

      if (article?.translatedPassage) {
        const translatedPassage = article.translatedPassage as Record<
          string,
          string[]
        > | null;

        if (translatedPassage) {
          // Create a comprehensive translation object with all available languages
          fullTranslation = {};

          // Map language codes to match the database format
          const languageMapping: Record<string, string> = {
            "zh-CN": "cn",
            "zh-TW": "tw",
            th: "th",
            vi: "vi",
            en: "en",
          };

          // Add translations for all available languages at the sentence index
          Object.entries(translatedPassage).forEach(([langCode, sentences]) => {
            const mappedLangCode = languageMapping[langCode] || langCode;
            if (sentences && sentences[sn] !== undefined) {
              fullTranslation[mappedLangCode] = sentences[sn];
            }
          });

          // Keep any existing translation that was passed in (in case client has additional info)
          if (translation && typeof translation === "object") {
            fullTranslation = { ...fullTranslation, ...translation };
          }
        }
      }
    }

    const recordData: any = {
      userId: id,
      sentence,
      translation: fullTranslation,
      sn,
      timepoint,
      endTimepoint,
      difficulty,
      due: new Date(due),
      elapsedDays: elapsed_days,
      lapses,
      reps,
      scheduledDays: scheduled_days,
      stability,
      state,
      audioUrl,
    };

    if (articleId) {
      recordData.articleId = articleId;
    } else {
      recordData.storyId = storyId;
      recordData.chapterNumber = chapterNumber;
    }

    await prisma.userSentenceRecord.create({
      data: recordData,
    });

    return NextResponse.json({
      message: "Sentence saved",
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({
      message: "Internal server error",
      status: 500,
    });
  }
}

export async function getSentencesFlashcard(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  const { id: routeId } = await ctx.params;
  
  if (!assertSelfOrAllowedStaff(req, routeId)) {
    return NextResponse.json({ message: "Forbidden - Access denied to this resource" }, { status: 403 });
  }
  const id = routeId;
  
  const articleId = req.nextUrl.searchParams.get("articleId");
  try {
    const sentences = await prisma.userSentenceRecord.findMany({
      where: {
        userId: id,
        ...(articleId && { articleId }),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Translation backfill has been moved out of the read path to improve performance
    // and prevent race conditions. If translations are missing, the frontend will
    // display a fallback state or prompt the user.
    
    return NextResponse.json({
      message: "User sentence retrieved",
      sentences,
      status: 200,
    });
  } catch (error) {
    console.error("Error retrieving sentences:", error);
    return NextResponse.json({
      message: "Internal server error",
      error,
      status: 500,
    });
  }
}

export async function deleteSentencesFlashcard(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  try {
    const { id: routeId } = await ctx.params;
    
    if (!assertSelfOrAllowedStaff(req, routeId)) {
      return NextResponse.json({ message: "Forbidden - Access denied to this resource" }, { status: 403 });
    }
    const id = routeId;
    
    const { id: recordId } = await req.json();

    // Verify ownership
    const record = await prisma.userSentenceRecord.findUnique({ where: { id: recordId } });
    if (!record || record.userId !== id) {
      return NextResponse.json({ message: "Forbidden - Not your record" }, { status: 403 });
    }

    await prisma.userSentenceRecord.delete({
      where: {
        id: recordId,
      },
    });

    return NextResponse.json({
      message: "Sentence deleted",
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({
      message: "Internal server error",
      status: 500,
    });
  }
}

export async function getVocabulariesFlashcard(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  const { id: routeId } = await ctx.params;
  if (!assertSelfOrAllowedStaff(req, routeId)) {
    return NextResponse.json({ message: "Forbidden - Access denied to this resource" }, { status: 403 });
  }
  const id = routeId;
  try {
    const vocabularies = await prisma.userWordRecord.findMany({
      where: {
        userId: id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      message: "Vocabularies retrieved successfully",
      vocabularies,
      status: 200,
    });
  } catch (error) {
    console.error("Error getting vocabularies:", error);
    return NextResponse.json({
      message: "Internal server error",
      error,
      status: 500,
    });
  }
}

export async function postVocabulariesFlashcard(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  const { id: routeId } = await ctx.params;
  if (!assertSelfOrAllowedStaff(req, routeId)) {
    return NextResponse.json({ message: "Forbidden - Access denied to this resource" }, { status: 403 });
  }
  const id = routeId;
  try {
    const {
      articleId,
      storyId,
      chapterNumber,
      word,
      difficulty = 0,
      due = new Date(),
      elapsed_days = 0,
      lapses = 0,
      reps = 0,
      scheduled_days = 0,
      stability = 0,
      state = 0,
      saveToFlashcard = true,
    } = await req.json();

    const whereClause: any = {
      userId: id,
      word: {
        path: ["vocabulary"],
        equals: word.vocabulary,
      },
    };

    if (articleId) {
      whereClause.articleId = articleId;
    } else if (storyId && chapterNumber !== undefined) {
      whereClause.storyId = storyId;
      whereClause.chapterNumber = Number(chapterNumber);
    }

    const existingVocab = await prisma.userWordRecord.findFirst({
      where: whereClause,
    });

    if (existingVocab) {
      return NextResponse.json(
        { message: "Vocabulary already exists" },
        { status: 400 }
      );
    }

    const recordData: any = {
      userId: id,
      word,
      difficulty,
      due: new Date(due),
      elapsedDays: elapsed_days,
      lapses,
      reps,
      scheduledDays: scheduled_days,
      stability,
      state,
      saveToFlashcard,
    };

    if (articleId) {
      recordData.articleId = articleId;
    } else if (storyId && chapterNumber !== undefined) {
      recordData.storyId = storyId;
      recordData.chapterNumber = Number(chapterNumber);
    }

    await prisma.userWordRecord.create({
      data: recordData,
    });

    return NextResponse.json({
      message: "Vocabulary added successfully",
      status: 201,
    });
  } catch (error) {
    console.error("Error adding vocabulary:", error);
    return NextResponse.json({
      message: "Internal server error",
      status: 500,
    });
  }
}

export async function deleteVocabulariesFlashcard(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  try {
    const { id: routeId } = await ctx.params;
    
    if (!assertSelfOrAllowedStaff(req, routeId)) {
      return NextResponse.json({ message: "Forbidden - Access denied to this resource" }, { status: 403 });
    }
    const id = routeId;

    const { id: recordId } = await req.json();

    // Verify ownership
    const record = await prisma.userWordRecord.findUnique({ where: { id: recordId } });
    if (!record || record.userId !== id) {
      return NextResponse.json({ message: "Forbidden - Not your record" }, { status: 403 });
    }

    await prisma.userWordRecord.delete({
      where: {
        id: recordId,
      },
    });

    return NextResponse.json({
      message: "Vocabulary deleted successfully",
      status: 200,
    });
  } catch (error) {
    console.error("Error deleting vocabulary:", error);
    return NextResponse.json({
      message: "Internal server error",
      status: 500,
    });
  }
}

export async function getClozeTestSentences(
  req: ExtendedNextRequest,
  ctx: { params: Promise<{ deckId: string }> }
) {
  const { deckId } = await ctx.params;
  try {
    const userId = req.session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get sentence flashcards for the user (simplified approach without deck verification for now)
    const sentences = await prisma.userSentenceRecord.findMany({
      where: {
        userId: userId,
        // Add filtering for due sentences if needed
      },
      orderBy: {
        due: "asc",
      },
    });

    if (sentences.length === 0) {
      return NextResponse.json({
        message: "No sentences found",
        sentences: [],
        status: 200,
      });
    }

    // Randomly select 5 sentences from the available sentences
    const shuffledSentences = [...sentences].sort(() => Math.random() - 0.5);
    const selectedSentences = shuffledSentences.slice(0, Math.min(5, sentences.length));

    // Transform selected sentences to ClozeTestData format
    const clozeTests = await Promise.all(
      selectedSentences.map(async (sentence) => {
        // Get article information
        let articleTitle = "Practice Sentence";
        let audioUrl: string | undefined;
        let startTime: number | undefined;
        let endTime: number | undefined;

        if (sentence.articleId) {
          try {
            const article = await prisma.article.findUnique({
              where: { id: sentence.articleId },
              select: {
                title: true,
              },
            });

            if (article && article.title) {
              articleTitle = article.title;
            }
          } catch (error) {
            console.error("Error fetching article:", error);
          }
        }

        // Use audio information from sentence record
        if (sentence.audioUrl) {
          audioUrl = sentence.audioUrl;
          startTime = sentence.timepoint;
          endTime = sentence.endTimepoint;
        }

        // Split sentence into words with position information
        const words = sentence.sentence.split(" ").map((word, index, array) => {
          const previousWords = array.slice(0, index).join(" ");
          const start = previousWords.length + (index > 0 ? 1 : 0); // +1 for space
          return {
            word: word,
            start: start / sentence.sentence.length, // Normalize to 0-1 range
            end: (start + word.length) / sentence.sentence.length,
          };
        });

        // Parse translation JSON safely
        let translation:
          | { th?: string; cn?: string; tw?: string; vi?: string }
          | undefined;

        if (sentence.translation && typeof sentence.translation === "object") {
          const translationObj = sentence.translation as any;
          translation = {
            th: translationObj.th as string,
            cn: translationObj.cn as string,
            tw: translationObj.tw as string,
            vi: translationObj.vi as string,
          };
        }

        return {
          id: sentence.id,
          articleId: sentence.articleId || "",
          articleTitle,
          sentence: sentence.sentence,
          words,
          translation,
          audioUrl,
          startTime,
          endTime,
          difficulty: "medium" as const,
        };
      })
    );

    return NextResponse.json({
      clozeTests,
      totalCount: clozeTests.length,
    });
  } catch (error) {
    console.error("Error fetching sentences for cloze test:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function saveClozeTestResults(req: ExtendedNextRequest) {
  try {
    const userId = req.session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { results, totalScore, totalQuestions, timeTaken, difficulty } = body;

    // Calculate XP earned early in the function
    const xpEarned = Math.floor(totalScore * 2); // 2 XP per correct answer as per UserXpEarned.Sentence_Cloze_Test

    // Update FSRS data for each sentence based on performance
    const updatePromises = results.map(async (result: any) => {
      try {
        const sentence = await prisma.userSentenceRecord.findFirst({
          where: {
            id: result.sentenceId,
            userId: userId,
          },
        });

        if (sentence) {
          // Calculate new FSRS values based on performance
          const rating = result.correct ? 3 : 1; // Good vs Again
          const now = new Date();

          // Simple FSRS-like update (you can enhance this with the actual FSRS library)
          const newStability = result.correct
            ? Math.min(sentence.stability * 1.3, 365)
            : Math.max(sentence.stability * 0.8, 1);

          const newDue = new Date(
            now.getTime() + newStability * 24 * 60 * 60 * 1000
          );
          const newReps = sentence.reps + 1;
          const newLapses = result.correct
            ? sentence.lapses
            : sentence.lapses + 1;

          await prisma.userSentenceRecord.update({
            where: { id: result.sentenceId },
            data: {
              stability: newStability,
              due: newDue,
              reps: newReps,
              lapses: newLapses,
              state: result.correct ? 2 : 1, // Review : Learning
              updatedAt: now,
            },
          });
        }
      } catch (error) {
        console.error(`Error updating sentence ${result.sentenceId}:`, error);
      }
    });

    await Promise.all(updatePromises);

    // Log the activity for XP calculation
    const uniqueTargetId = `cloze-test-${userId}-${Date.now()}`;

    try {
      const activity = await prisma.userActivity.create({
        data: {
          userId: userId,
          activityType: "SENTENCE_CLOZE_TEST",
          targetId: uniqueTargetId,
          completed: true,
          timer: timeTaken,
          details: {
            score: totalScore,
            totalQuestions: totalQuestions,
            accuracy: (totalScore / totalQuestions) * 100,
            difficulty: difficulty,
            timeTaken: timeTaken,
            xpEarned: xpEarned,
            gameSession: uniqueTargetId,
          },
        },
      });

      // Create XP log entry
      if (xpEarned > 0) {
        await prisma.xPLog.create({
          data: {
            userId: userId,
            xpEarned: xpEarned,
            activityId: activity.id,
            activityType: "SENTENCE_CLOZE_TEST",
          },
        });

        // Update user's total XP
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (user) {
          await prisma.user.update({
            where: { id: userId },
            data: { xp: user.xp + xpEarned },
          });

          // Update session if available
          if (req.session?.user) {
            req.session.user.xp = user.xp + xpEarned;
          }
        }
      }
    } catch (error) {
      console.error("Error logging activity:", error);
    }

    return NextResponse.json({
      message: "Cloze test results saved successfully",
      xpEarned: xpEarned,
      updatedSentences: results.length,
    });
  } catch (error) {
    console.error("Error saving cloze test results:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function getSentencesForOrdering(
  req: ExtendedNextRequest,
  ctx: { params: Promise<{ deckId: string }> }
) {
  const { deckId } = await ctx.params;
  try {
    const userId = req.session?.user?.id;

    if (!userId) {
      return NextResponse.json({
        message: "Unauthorized",
        status: 401,
      });
    }

    // Get user's saved sentences (flashcards)
    const sentences = await prisma.userSentenceRecord.findMany({
      where: {
        userId: userId,
      },
      orderBy: { due: "asc" },
    });

    if (sentences.length === 0) {
      return NextResponse.json({
        message: "No sentences found",
        sentenceGroups: [],
        status: 200,
      });
    }

    // Randomly select 5 sentences from the available sentences
    const shuffledSentences = [...sentences].sort(() => Math.random() - 0.5);
    const selectedSentences = shuffledSentences.slice(0, Math.min(5, sentences.length));

    const sentenceGroups = [];

    // Process each selected sentence
    for (const sentence of selectedSentences) {
      let article = null;
      let content = "";
      let title = "";

      // Get the article content
      if (sentence.articleId) {
        article = await prisma.article.findUnique({
          where: { id: sentence.articleId },
          select: {
            title: true,
            passage: true,
            sentences: true,
          },
        });
        if (article) {
          content = article.passage || "";
          title = article.title || "";
        }
      }
      // Note: Story functionality removed as it doesn't exist in current schema

      if (!content) continue;

      // Split content into sentences
      const textSentences = splitTextIntoSentences(content);
      const sentenceIndex = sentence.sn;

      if (sentenceIndex >= textSentences.length) continue;

      // Calculate the range of sentences around the target sentence
      const sentencesAbove = Math.min(sentenceIndex, 2);
      const sentencesBelow = Math.min(
        textSentences.length - sentenceIndex - 1,
        2
      );

      // Ensure we have exactly 5 sentences
      let from = Math.max(sentenceIndex - sentencesAbove, 0);
      let to = Math.min(
        sentenceIndex + sentencesBelow + 1,
        textSentences.length
      );

      // Adjust to get exactly 5 sentences if possible
      while (to - from < 5 && (from > 0 || to < textSentences.length)) {
        if (from > 0) from--;
        else if (to < textSentences.length) to++;
      }

      const surroundingSentences = textSentences.slice(from, to);
      const correctOrder = [...surroundingSentences];

      // Parse article sentences JSON for timepoints
      let articleSentences: any[] = [];
      if (article?.sentences) {
        try {
          articleSentences = Array.isArray(article.sentences)
            ? article.sentences
            : JSON.parse(article.sentences as string);
        } catch (e) {
          console.warn("Failed to parse article sentences:", e);
        }
      }

      // Create sentence objects with metadata
      const sentenceObjects = surroundingSentences.map((text, index) => {
        const globalIndex = from + index;
        const sentenceData = articleSentences[globalIndex] || {};

        return {
          id: `sentence-${sentence.id}-${globalIndex}`,
          text: text,
          translation: sentence.translation,
          audioUrl: sentence.audioUrl || null,
          startTime:
            globalIndex === sentenceIndex
              ? sentence.timepoint
              : sentenceData.timepoint || 0,
          endTime:
            globalIndex === sentenceIndex
              ? sentence.endTimepoint
              : sentenceData.endTimepoint || 0,
          isFromFlashcard: globalIndex === sentenceIndex,
        };
      });

      // Create the sentence group
      const sentenceGroup = {
        id: sentence.id,
        articleId: sentence.articleId || "",
        articleTitle: title,
        flashcardSentence: textSentences[sentenceIndex],
        correctOrder: correctOrder,
        sentences: sentenceObjects,
        difficulty: "medium" as const,
        startIndex: from,
        flashcardIndex: sentenceIndex - from,
      };

      sentenceGroups.push(sentenceGroup);
    }

    return NextResponse.json({
      message: "Sentences for ordering retrieved successfully",
      sentenceGroups,
      status: 200,
    });
  } catch (error) {
    console.error("Error getting sentences for ordering:", error);
    return NextResponse.json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
      status: 500,
    });
  }
}

export async function getWordsForOrdering(
  req: ExtendedNextRequest,
  ctx: { params: Promise<{ deckId: string }> }
) {
  const { deckId } = await ctx.params;
  try {
    const userId = req.session?.user?.id;

    if (!userId) {
      return NextResponse.json({
        message: "Unauthorized",
        status: 401,
      });
    }

    // Get user's saved sentences (flashcards)
    const sentences = await prisma.userSentenceRecord.findMany({
      where: {
        userId: userId,
      },
      orderBy: { due: "asc" },
    });

    if (sentences.length === 0) {
      return NextResponse.json({
        message: "No sentences found",
        sentences: [],
        status: 200,
      });
    }

    // Randomly select 5 sentences from the available sentences
    const shuffledSentences = [...sentences].sort(() => Math.random() - 0.5);
    const selectedSentences = shuffledSentences.slice(0, Math.min(5, sentences.length));

    const processedSentences = [];

    // Process each selected sentence
    for (const sentence of selectedSentences) {
      let article = null;
      let content = "";
      let title = "";

      // Get the article content
      if (sentence.articleId) {
        article = await prisma.article.findUnique({
          where: { id: sentence.articleId },
          select: {
            title: true,
            passage: true,
            sentences: true,
          },
        });
        if (article) {
          content = article.passage || "";
          title = article.title || "";
        }
      }

      if (!content) continue;

      // Use the actual sentence text from the database directly
      const targetSentence = sentence.sentence;

      if (!targetSentence || targetSentence.trim().length === 0) continue;
      
      // Split sentence into words and clean them, but preserve original form
      const originalWords = targetSentence
        .split(/\s+/)
        .filter(word => word.trim().length > 0);
      
      // Create cleaned version for correctOrder (lowercase, no punctuation)
      const cleanedWords = originalWords
        .map(word => word.replace(/[^\w'-]/g, '').toLowerCase())
        .filter(word => word.length > 0);

      if (cleanedWords.length < 3) continue; // Skip very short sentences

      // Create word objects with metadata - use original words for display
      const wordObjects = originalWords.map((word, index) => {
        // Clean the word for matching purposes but keep original for display
        const cleanedWord = word.replace(/[^\w'-]/g, '').toLowerCase();
        
        return {
          id: `word-${sentence.id}-${index}`,
          text: cleanedWord, // Use cleaned version for game logic
          originalText: word, // Keep original with punctuation for reference
          translation: null, // We don't have individual word translations
          audioUrl: sentence.audioUrl || null,
          startTime: sentence.timepoint || 0,
          endTime: sentence.endTimepoint || 0,
          partOfSpeech: "unknown", // Could be enhanced with NLP
        };
      }).filter(word => word.text.length > 0); // Filter out empty words after cleaning

      // Use cleaned words for correct order
      const correctOrder = wordObjects.map(word => word.text);

      // Determine difficulty based on sentence length
      let difficulty: "easy" | "medium" | "hard" = "medium";
      if (correctOrder.length <= 5) difficulty = "easy";
      else if (correctOrder.length >= 10) difficulty = "hard";

      const processedSentence = {
        id: sentence.id,
        articleId: sentence.articleId || "",
        articleTitle: title,
        sentence: targetSentence,
        correctOrder: correctOrder,
        words: wordObjects,
        difficulty,
        context: content.substring(
          Math.max(0, content.indexOf(targetSentence) - 100),
          content.indexOf(targetSentence) + targetSentence.length + 100
        ),
        sentenceTranslations: sentence.translation,
      };

      processedSentences.push(processedSentence);
    }

    return NextResponse.json({
      message: "Words for ordering retrieved successfully",
      sentences: processedSentences,
      status: 200,
    });
  } catch (error) {
    console.error("Error getting words for ordering:", error);
    return NextResponse.json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
      status: 500,
    });
  }
}

export async function saveSentenceOrderingResults(req: ExtendedNextRequest) {
  try {
    const userId = req.session?.user?.id;

    if (!userId) {
      return NextResponse.json({
        message: "Unauthorized",
        status: 401,
      });
    }

    const {
      totalQuestions,
      correctAnswers,
      timeTaken,
      difficulty = "medium",
      gameSession,
      sentenceResults = [], // Array of {sentenceId, isCorrect}
    } = await req.json();

    if (!totalQuestions || correctAnswers === undefined || !timeTaken) {
      return NextResponse.json({
        message:
          "Missing required fields: totalQuestions, correctAnswers, timeTaken",
        status: 400,
      });
    }

    const accuracy = (correctAnswers / totalQuestions) * 100;
    const baseXp = 10; // Base XP per correct answer
    const xpEarned = Math.floor(correctAnswers * baseXp);

    // Update sentence records if results provided
    if (sentenceResults.length > 0) {
      const f = fsrs(generatorParameters());
      const now = new Date();

      const updatePromises = sentenceResults.map(async (result: any) => {
        try {
          const sentence = await prisma.userSentenceRecord.findUnique({
            where: { id: result.sentenceId },
          });

          if (!sentence || sentence.userId !== userId) return;

          // Calculate next review using FSRS
          const cardObj = {
            due: new Date(sentence.due),
            stability: sentence.stability,
            difficulty: sentence.difficulty,
            elapsed_days: sentence.elapsedDays,
            scheduled_days: sentence.scheduledDays,
            reps: sentence.reps,
            lapses: sentence.lapses,
            state: sentence.state as State,
            last_review: new Date(sentence.updatedAt),
          };

          const schedulingInfo = f.repeat(cardObj, now);
          // Use Good rating if correct, Again if incorrect
          const rating = result.isCorrect ? Rating.Good : Rating.Again;
          const selectedSchedule = schedulingInfo[rating];

          // Validate the values before updating
          const newDue = selectedSchedule.card.due;
          const newStability = selectedSchedule.card.stability;
          const newDifficulty = selectedSchedule.card.difficulty;
          const newElapsedDays = selectedSchedule.card.elapsed_days;
          const newScheduledDays = selectedSchedule.card.scheduled_days;
          const newReps = selectedSchedule.card.reps;
          const newLapses = selectedSchedule.card.lapses;
          const newState = selectedSchedule.card.state;

          // Check for invalid values and provide fallbacks
          const isValidDate =
            newDue instanceof Date && !isNaN(newDue.getTime());
          const isValidStability =
            !isNaN(newStability) && isFinite(newStability);
          const isValidDifficulty =
            !isNaN(newDifficulty) && isFinite(newDifficulty);
          const isValidElapsedDays =
            !isNaN(newElapsedDays) && isFinite(newElapsedDays);
          const isValidScheduledDays =
            !isNaN(newScheduledDays) && isFinite(newScheduledDays);

          if (
            !isValidDate ||
            !isValidStability ||
            !isValidDifficulty ||
            !isValidElapsedDays ||
            !isValidScheduledDays
          ) {
            // Use simple fallback logic
            const fallbackDue = new Date();
            if (result.isCorrect) {
              // If correct, review again in 3 days
              fallbackDue.setDate(fallbackDue.getDate() + 3);
            } else {
              // If incorrect, review again in 1 day
              fallbackDue.setDate(fallbackDue.getDate() + 1);
            }

            await prisma.userSentenceRecord.update({
              where: { id: result.sentenceId },
              data: {
                due: fallbackDue,
                stability: result.isCorrect
                  ? Math.max(sentence.stability * 1.2, 1)
                  : Math.max(sentence.stability * 0.8, 0.1),
                difficulty: Math.max(
                  0.1,
                  Math.min(
                    sentence.difficulty + (result.isCorrect ? -0.1 : 0.2),
                    10
                  )
                ),
                elapsedDays: Math.max(0, sentence.elapsedDays + 1),
                scheduledDays: result.isCorrect ? 3 : 1,
                reps: sentence.reps + 1,
                lapses: result.isCorrect
                  ? sentence.lapses
                  : sentence.lapses + 1,
                state: result.isCorrect ? 2 : 1, // Review or Learning
              },
            });
          } else {
            await prisma.userSentenceRecord.update({
              where: { id: result.sentenceId },
              data: {
                due: newDue,
                stability: newStability,
                difficulty: newDifficulty,
                elapsedDays: newElapsedDays,
                scheduledDays: newScheduledDays,
                reps: newReps,
                lapses: newLapses,
                state: newState,
              },
            });
          }
        } catch (error) {
          console.error(`Error updating sentence ${result.sentenceId}:`, error);
        }
      });

      await Promise.all(updatePromises);
    }

    // Log the activity for XP calculation
    const uniqueTargetId =
      gameSession || `sentence-ordering-${userId}-${Date.now()}`;

    const activity = await prisma.userActivity.create({
      data: {
        userId: userId,
        activityType: "SENTENCE_ORDERING",
        targetId: uniqueTargetId,
        completed: true,
        timer: timeTaken,
        details: {
          totalQuestions: totalQuestions,
          correctAnswers: correctAnswers,
          accuracy: accuracy,
          difficulty: difficulty,
          xpEarned: xpEarned,
          gameSession: uniqueTargetId,
        },
      },
    });

    // Create XP log entry
    if (xpEarned > 0) {
      await prisma.xPLog.create({
        data: {
          userId: userId,
          xpEarned: xpEarned,
          activityId: activity.id,
          activityType: "SENTENCE_ORDERING",
        },
      });

      // Get current user data to calculate new XP and level
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { xp: true, level: true, cefrLevel: true },
      });

      if (currentUser) {
        // Import level calculation function
        const { levelCalculation } = await import("@/lib/utils");
        
        const finalXp = (currentUser.xp || 0) + xpEarned;
        const levelData = levelCalculation(finalXp);

        // Update user XP and level
        await prisma.user.update({
          where: { id: userId },
          data: {
            xp: finalXp,
            level:
              typeof levelData.raLevel === "number"
                ? levelData.raLevel
                : parseInt(String(levelData.raLevel)),
            cefrLevel: levelData.cefrLevel,
            updatedAt: new Date(),
          },
        });
      }
    }

    return NextResponse.json({
      message: "Sentence ordering results saved successfully",
      xpEarned: xpEarned,
      accuracy: accuracy,
      status: 200,
    });
  } catch (error) {
    console.error("Error saving sentence ordering results:", error);
    return NextResponse.json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
      status: 500,
    });
  }
}

export async function saveWordOrderingResults(req: ExtendedNextRequest) {
  try {
    const userId = req.session?.user?.id;

    if (!userId) {
      return NextResponse.json({
        message: "Unauthorized",
        status: 401,
      });
    }

    const {
      totalQuestions,
      correctAnswers,
      timeTaken,
      difficulty = "medium",
      gameSession,
      sentenceResults = [], // Array of {sentenceId, isCorrect}
    } = await req.json();

    if (!totalQuestions || correctAnswers === undefined || !timeTaken) {
      return NextResponse.json({
        message:
          "Missing required fields: totalQuestions, correctAnswers, timeTaken",
        status: 400,
      });
    }

    const accuracy = (correctAnswers / totalQuestions) * 100;
    const xpEarned = Math.floor(correctAnswers * 5); // 5 XP per correct answer as per UserXpEarned.Sentence_Word_Ordering

    // Update sentence records if results provided
    if (sentenceResults.length > 0) {
      const f = fsrs(generatorParameters());
      const now = new Date();

      const updatePromises = sentenceResults.map(async (result: any) => {
        try {
          const sentence = await prisma.userSentenceRecord.findUnique({
            where: { id: result.sentenceId },
          });

          if (!sentence || sentence.userId !== userId) return;

          // Calculate next review using FSRS
          const cardObj = {
            due: new Date(sentence.due),
            stability: sentence.stability,
            difficulty: sentence.difficulty,
            elapsedDays: sentence.elapsedDays,
            scheduledDays: sentence.scheduledDays,
            reps: sentence.reps,
            lapses: sentence.lapses,
            state: sentence.state as State,
            last_review: sentence.updatedAt,
          };

          const card = {
            due: cardObj.due,
            stability: cardObj.stability,
            difficulty: cardObj.difficulty,
            elapsed_days: cardObj.elapsedDays,
            scheduled_days: cardObj.scheduledDays,
            reps: cardObj.reps,
            lapses: cardObj.lapses,
            state: cardObj.state,
            last_review: cardObj.last_review,
          };

          const rating = result.isCorrect ? Rating.Good : Rating.Again;
          const recordLog = f.repeat(card, now)[rating];

          // Validate the calculated values
          const newDue = recordLog.card.due;
          const newStability = recordLog.card.stability;
          const newDifficulty = recordLog.card.difficulty;
          const newElapsedDays = recordLog.card.elapsed_days;
          const newScheduledDays = recordLog.card.scheduled_days;
          const newReps = recordLog.card.reps;
          const newLapses = recordLog.card.lapses;
          const newState = recordLog.card.state;

          const isValidDate = newDue instanceof Date && !isNaN(newDue.getTime());
          const isValidStability = !isNaN(newStability) && isFinite(newStability);
          const isValidDifficulty = !isNaN(newDifficulty) && isFinite(newDifficulty);
          const isValidElapsedDays = !isNaN(newElapsedDays) && isFinite(newElapsedDays);
          const isValidScheduledDays = !isNaN(newScheduledDays) && isFinite(newScheduledDays);

          if (
            !isValidDate ||
            !isValidStability ||
            !isValidDifficulty ||
            !isValidElapsedDays ||
            !isValidScheduledDays
          ) {
            // Use simple fallback logic
            const fallbackDue = new Date();
            if (result.isCorrect) {
              fallbackDue.setDate(fallbackDue.getDate() + 3);
            } else {
              fallbackDue.setDate(fallbackDue.getDate() + 1);
            }

            await prisma.userSentenceRecord.update({
              where: { id: result.sentenceId },
              data: {
                due: fallbackDue,
                stability: result.isCorrect
                  ? Math.max(sentence.stability * 1.2, 1)
                  : Math.max(sentence.stability * 0.8, 0.1),
                difficulty: Math.max(
                  0.1,
                  Math.min(
                    sentence.difficulty + (result.isCorrect ? -0.1 : 0.2),
                    10
                  )
                ),
                elapsedDays: Math.max(0, sentence.elapsedDays + 1),
                scheduledDays: result.isCorrect ? 3 : 1,
                reps: sentence.reps + 1,
                lapses: result.isCorrect
                  ? sentence.lapses
                  : sentence.lapses + 1,
                state: result.isCorrect ? 2 : 1, // Review or Learning
              },
            });
          } else {
            await prisma.userSentenceRecord.update({
              where: { id: result.sentenceId },
              data: {
                due: newDue,
                stability: newStability,
                difficulty: newDifficulty,
                elapsedDays: newElapsedDays,
                scheduledDays: newScheduledDays,
                reps: newReps,
                lapses: newLapses,
                state: newState,
              },
            });
          }
        } catch (updateError) {
          console.error(
            `Error updating sentence ${result.sentenceId}:`,
            updateError
          );
        }
      });

      await Promise.all(updatePromises);
    }

    // Log the activity for XP calculation
    const uniqueTargetId =
      gameSession || `word-ordering-${userId}-${Date.now()}`;

    const activity = await prisma.userActivity.create({
      data: {
        userId: userId,
        activityType: "SENTENCE_WORD_ORDERING",
        targetId: uniqueTargetId,
        completed: true,
        timer: timeTaken,
        details: {
          totalQuestions: totalQuestions,
          correctAnswers: correctAnswers,
          accuracy: accuracy,
          difficulty: difficulty,
          xpEarned: xpEarned,
          gameSession: uniqueTargetId,
        },
      },
    });

    // Create XP log entry
    if (xpEarned > 0) {
      await prisma.xPLog.create({
        data: {
          userId: userId,
          xpEarned: xpEarned,
          activityId: activity.id,
          activityType: "SENTENCE_WORD_ORDERING",
        },
      });

      // Update user's total XP
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user) {
        await prisma.user.update({
          where: { id: userId },
          data: { xp: user.xp + xpEarned },
        });

        // Update session if available
        if (req.session?.user) {
          req.session.user.xp = user.xp + xpEarned;
        }
      }
    }

    return NextResponse.json({
      message: "Word ordering results saved successfully",
      xpEarned: xpEarned,
      accuracy: accuracy,
      status: 200,
    });
  } catch (error) {
    console.error("Error saving word ordering results:", error);
    return NextResponse.json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
      status: 500,
    });
  }
}

export async function getFlashcardDeckInfo(req: ExtendedNextRequest) {
  try {
    const userId = req.session?.user?.id;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized",
      });
    }

    // Find user's sentence flashcard deck by checking for sentence records
    const sentences = await prisma.userSentenceRecord.findFirst({
      where: {
        userId: userId,
      },
    });

    if (!sentences) {
      return NextResponse.json({
        success: false,
        error: "No sentence flashcard deck found",
      });
    }

    return NextResponse.json({
      success: true,
      deckId: userId, // Use user ID as deck ID
    });
  } catch (error) {
    console.error("Error getting flashcard deck info:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to get flashcard deck",
    });
  }
}
