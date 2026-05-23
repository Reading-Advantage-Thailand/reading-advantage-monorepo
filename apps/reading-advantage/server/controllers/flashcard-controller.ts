import { ExtendedNextRequest, assertSelfOrAllowedStaff } from "./auth-controller";
import { NextRequest, NextResponse } from "next/server";
import { db, eq, and, asc, desc, sql } from "@reading-advantage/db";
import {
  userWordRecords,
  userSentenceRecords,
  userActivity,
  xpLogs,
  users,
} from "@reading-advantage/db/schema";
import { articles } from "@reading-advantage/db/schema";
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
    const type = req.nextUrl.searchParams.get("type");

    if (type === "vocabulary") {
      const vocabularies = await db
        .select()
        .from(userWordRecords)
        .where(eq(userWordRecords.userId, id))
        .orderBy(desc(userWordRecords.createdAt));

      const stats = calculateFlashcardStats(vocabularies);
      return NextResponse.json({
        message: "Vocabulary stats retrieved",
        stats,
        vocabularies,
        status: 200,
      });
    } else if (type === "sentences") {
      const sentences = await db
        .select()
        .from(userSentenceRecords)
        .where(eq(userSentenceRecords.userId, id))
        .orderBy(desc(userSentenceRecords.createdAt));

      const stats = calculateFlashcardStats(sentences);
      return NextResponse.json({
        message: "Sentences stats retrieved",
        stats,
        sentences,
        status: 200,
      });
    } else {
      const [vocabularies, sentences] = await Promise.all([
        db
          .select()
          .from(userWordRecords)
          .where(eq(userWordRecords.userId, id))
          .orderBy(desc(userWordRecords.createdAt)),
        db
          .select()
          .from(userSentenceRecords)
          .where(eq(userSentenceRecords.userId, id))
          .orderBy(desc(userSentenceRecords.createdAt)),
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
        case 0:
          stats.new++;
          break;
        case 1:
        case 3:
          stats.learning++;
          break;
        case 2:
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

    let currentCard: any;
    if (isVocabulary) {
      const [row] = await db
        .select()
        .from(userWordRecords)
        .where(eq(userWordRecords.id, cardId))
        .limit(1);
      currentCard = row;
    } else {
      const [row] = await db
        .select()
        .from(userSentenceRecords)
        .where(eq(userSentenceRecords.id, cardId))
        .limit(1);
      currentCard = row;
    }

    if (!currentCard || currentCard.userId !== id) {
      return NextResponse.json({
        message: "Card not found or unauthorized",
        status: 404,
      });
    }

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
    let selectedSchedule;
    switch (rating) {
      case 1:
        selectedSchedule = schedulingInfo[Rating.Again];
        break;
      case 2:
        selectedSchedule = schedulingInfo[Rating.Hard];
        break;
      case 3:
        selectedSchedule = schedulingInfo[Rating.Good];
        break;
      case 4:
        selectedSchedule = schedulingInfo[Rating.Easy];
        break;
      default:
        selectedSchedule = schedulingInfo[Rating.Good];
    }

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

    if (isVocabulary) {
      await db
        .update(userWordRecords)
        .set(updateData)
        .where(eq(userWordRecords.id, cardId));
    } else {
      await db
        .update(userSentenceRecords)
        .set(updateData)
        .where(eq(userSentenceRecords.id, cardId));
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
        const conditions: any[] = [
          eq(userWordRecords.userId, id),
          sql`${userWordRecords.word}->>'vocabulary' = ${word.vocabulary}`,
        ];

        if (articleId) {
          conditions.push(eq(userWordRecords.articleId, articleId));
        } else if (storyId && chapterNumber !== undefined) {
          conditions.push(eq(userWordRecords.storyId, storyId));
          conditions.push(eq(userWordRecords.chapterNumber, Number(chapterNumber)));
        }

        const [existingRecord] = await db
          .select({ id: userWordRecords.id })
          .from(userWordRecords)
          .where(and(...conditions))
          .limit(1);

        if (existingRecord) {
          wordAllReadySaved.push(word.vocabulary);
        } else {
          const recordData: any = {
            userId: id,
            saveToFlashcard,
            word: word,
            difficulty,
            due: new Date(due),
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

          await db.insert(userWordRecords).values(recordData);
        }
      })
    );

    if (wordAllReadySaved.length > 0) {
      return NextResponse.json({
        message: `Word already saved\n            ${wordAllReadySaved.join(", ")}`,
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

    const conditions: any[] = [eq(userWordRecords.userId, id)];
    if (articleId) conditions.push(eq(userWordRecords.articleId, articleId));
    if (storyId) conditions.push(eq(userWordRecords.storyId, storyId));
    if (chapterNumber) conditions.push(eq(userWordRecords.chapterNumber, Number(chapterNumber)));

    const word = await db
      .select()
      .from(userWordRecords)
      .where(and(...conditions))
      .orderBy(desc(userWordRecords.createdAt));

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

    const [record] = await db
      .select({ id: userWordRecords.id, userId: userWordRecords.userId })
      .from(userWordRecords)
      .where(eq(userWordRecords.id, recordId))
      .limit(1);

    if (!record || record.userId !== id) {
      return NextResponse.json({ message: "Forbidden - Not your record" }, { status: 403 });
    }

    await db.delete(userWordRecords).where(eq(userWordRecords.id, recordId));

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

    const conditions: any[] = [
      eq(userSentenceRecords.userId, id),
      eq(userSentenceRecords.sn, sn),
    ];

    if (articleId) {
      conditions.push(eq(userSentenceRecords.articleId, articleId));
    } else {
      conditions.push(eq(userSentenceRecords.storyId, storyId));
      conditions.push(eq(userSentenceRecords.chapterNumber, chapterNumber));
    }

    const [existingSentence] = await db
      .select({ id: userSentenceRecords.id })
      .from(userSentenceRecords)
      .where(and(...conditions))
      .limit(1);

    if (existingSentence) {
      return NextResponse.json(
        { message: "Sentence already saved" },
        { status: 400 }
      );
    }

    let fullTranslation = translation;

    if (articleId) {
      const [article] = await db
        .select({ translatedPassage: articles.translatedPassage })
        .from(articles)
        .where(eq(articles.id, articleId))
        .limit(1);

      if (article?.translatedPassage) {
        const translatedPassage = article.translatedPassage as Record<
          string,
          string[]
        > | null;

        if (translatedPassage) {
          fullTranslation = {};

          const languageMapping: Record<string, string> = {
            "zh-CN": "cn",
            "zh-TW": "tw",
            th: "th",
            vi: "vi",
            en: "en",
          };

          Object.entries(translatedPassage).forEach(([langCode, sentences]) => {
            const mappedLangCode = languageMapping[langCode] || langCode;
            if (sentences && sentences[sn] !== undefined) {
              fullTranslation[mappedLangCode] = sentences[sn];
            }
          });

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

    await db.insert(userSentenceRecords).values(recordData);

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
    const conditions: any[] = [eq(userSentenceRecords.userId, id)];
    if (articleId) conditions.push(eq(userSentenceRecords.articleId, articleId));

    const sentences = await db
      .select()
      .from(userSentenceRecords)
      .where(and(...conditions))
      .orderBy(desc(userSentenceRecords.createdAt));

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

    const [record] = await db
      .select({ id: userSentenceRecords.id, userId: userSentenceRecords.userId })
      .from(userSentenceRecords)
      .where(eq(userSentenceRecords.id, recordId))
      .limit(1);

    if (!record || record.userId !== id) {
      return NextResponse.json({ message: "Forbidden - Not your record" }, { status: 403 });
    }

    await db.delete(userSentenceRecords).where(eq(userSentenceRecords.id, recordId));

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
    const vocabularies = await db
      .select()
      .from(userWordRecords)
      .where(eq(userWordRecords.userId, id))
      .orderBy(desc(userWordRecords.createdAt));

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

    const conditions: any[] = [
      eq(userWordRecords.userId, id),
      sql`${userWordRecords.word}->>'vocabulary' = ${word.vocabulary}`,
    ];

    if (articleId) {
      conditions.push(eq(userWordRecords.articleId, articleId));
    } else if (storyId && chapterNumber !== undefined) {
      conditions.push(eq(userWordRecords.storyId, storyId));
      conditions.push(eq(userWordRecords.chapterNumber, Number(chapterNumber)));
    }

    const [existingVocab] = await db
      .select({ id: userWordRecords.id })
      .from(userWordRecords)
      .where(and(...conditions))
      .limit(1);

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

    await db.insert(userWordRecords).values(recordData);

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

    const [record] = await db
      .select({ id: userWordRecords.id, userId: userWordRecords.userId })
      .from(userWordRecords)
      .where(eq(userWordRecords.id, recordId))
      .limit(1);

    if (!record || record.userId !== id) {
      return NextResponse.json({ message: "Forbidden - Not your record" }, { status: 403 });
    }

    await db.delete(userWordRecords).where(eq(userWordRecords.id, recordId));

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

    const sentences = await db
      .select()
      .from(userSentenceRecords)
      .where(eq(userSentenceRecords.userId, userId))
      .orderBy(asc(userSentenceRecords.due));

    if (sentences.length === 0) {
      return NextResponse.json({
        message: "No sentences found",
        sentences: [],
        status: 200,
      });
    }

    const shuffledSentences = [...sentences].sort(() => Math.random() - 0.5);
    const selectedSentences = shuffledSentences.slice(0, Math.min(5, sentences.length));

    const clozeTests = await Promise.all(
      selectedSentences.map(async (sentence) => {
        let articleTitle = "Practice Sentence";
        let audioUrl: string | undefined;
        let startTime: number | undefined;
        let endTime: number | undefined;

        if (sentence.articleId) {
          try {
            const [article] = await db
              .select({ title: articles.title })
              .from(articles)
              .where(eq(articles.id, sentence.articleId))
              .limit(1);

            if (article?.title) {
              articleTitle = article.title;
            }
          } catch (error) {
            console.error("Error fetching article:", error);
          }
        }

        if (sentence.audioUrl) {
          audioUrl = sentence.audioUrl;
          startTime = sentence.timepoint;
          endTime = sentence.endTimepoint;
        }

        const words = sentence.sentence.split(" ").map((word, index, array) => {
          const previousWords = array.slice(0, index).join(" ");
          const start = previousWords.length + (index > 0 ? 1 : 0);
          return {
            word: word,
            start: start / sentence.sentence.length,
            end: (start + word.length) / sentence.sentence.length,
          };
        });

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

    const xpEarned = Math.floor(totalScore * 2);

    const updatePromises = results.map(async (result: any) => {
      try {
        const [sentence] = await db
          .select()
          .from(userSentenceRecords)
          .where(
            and(
              eq(userSentenceRecords.id, result.sentenceId),
              eq(userSentenceRecords.userId, userId)
            )
          )
          .limit(1);

        if (sentence) {
          const rating = result.correct ? 3 : 1;
          const now = new Date();

          const newStability = result.correct
            ? Math.min(sentence.stability * 1.3, 365)
            : Math.max(sentence.stability * 0.8, 1);

          const newDue = new Date(
            now.getTime() + newStability * 24 * 60 * 60 * 1000
          );
          const newReps = sentence.reps + 1;
          const newLapses = result.correct ? sentence.lapses : sentence.lapses + 1;

          await db
            .update(userSentenceRecords)
            .set({
              stability: newStability,
              due: newDue,
              reps: newReps,
              lapses: newLapses,
              state: result.correct ? 2 : 1,
              updatedAt: now,
            })
            .where(eq(userSentenceRecords.id, result.sentenceId));
        }
      } catch (error) {
        console.error(`Error updating sentence ${result.sentenceId}:`, error);
      }
    });

    await Promise.all(updatePromises);

    const uniqueTargetId = `cloze-test-${userId}-${Date.now()}`;

    try {
      const [activity] = await db
        .insert(userActivity)
        .values({
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
        })
        .returning();

      if (xpEarned > 0) {
        await db.insert(xpLogs).values({
          userId: userId,
          xpEarned: xpEarned,
          activityId: activity.id,
          activityType: "SENTENCE_CLOZE_TEST",
        });

        const [user] = await db
          .select({ xp: users.xp })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (user) {
          await db
            .update(users)
            .set({ xp: (user.xp ?? 0) + xpEarned })
            .where(eq(users.id, userId));

          if (req.session?.user) {
            req.session.user.xp = (user.xp ?? 0) + xpEarned;
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

    const sentences = await db
      .select()
      .from(userSentenceRecords)
      .where(eq(userSentenceRecords.userId, userId))
      .orderBy(asc(userSentenceRecords.due));

    if (sentences.length === 0) {
      return NextResponse.json({
        message: "No sentences found",
        sentenceGroups: [],
        status: 200,
      });
    }

    const shuffledSentences = [...sentences].sort(() => Math.random() - 0.5);
    const selectedSentences = shuffledSentences.slice(0, Math.min(5, sentences.length));

    const sentenceGroups = [];

    for (const sentence of selectedSentences) {
      let articleRow: { title: string | null; passage: string | null; sentences: unknown } | null = null;
      let content = "";
      let title = "";

      if (sentence.articleId) {
        const [art] = await db
          .select({
            title: articles.title,
            passage: articles.passage,
            sentences: articles.sentences,
          })
          .from(articles)
          .where(eq(articles.id, sentence.articleId))
          .limit(1);
        if (art) {
          articleRow = art;
          content = art.passage || "";
          title = art.title || "";
        }
      }

      if (!content) continue;

      const textSentences = splitTextIntoSentences(content);
      const sentenceIndex = sentence.sn;

      if (sentenceIndex >= textSentences.length) continue;

      const sentencesAbove = Math.min(sentenceIndex, 2);
      const sentencesBelow = Math.min(
        textSentences.length - sentenceIndex - 1,
        2
      );

      let from = Math.max(sentenceIndex - sentencesAbove, 0);
      let to = Math.min(
        sentenceIndex + sentencesBelow + 1,
        textSentences.length
      );

      while (to - from < 5 && (from > 0 || to < textSentences.length)) {
        if (from > 0) from--;
        else if (to < textSentences.length) to++;
      }

      const surroundingSentences = textSentences.slice(from, to);
      const correctOrder = [...surroundingSentences];

      let articleSentences: any[] = [];
      if (articleRow?.sentences) {
        try {
          articleSentences = Array.isArray(articleRow.sentences)
            ? articleRow.sentences
            : JSON.parse(articleRow.sentences as string);
        } catch (e) {
          console.warn("Failed to parse article sentences:", e);
        }
      }

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

      sentenceGroups.push({
        id: sentence.id,
        articleId: sentence.articleId || "",
        articleTitle: title,
        flashcardSentence: textSentences[sentenceIndex],
        correctOrder: correctOrder,
        sentences: sentenceObjects,
        difficulty: "medium" as const,
        startIndex: from,
        flashcardIndex: sentenceIndex - from,
      });
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

    const sentences = await db
      .select()
      .from(userSentenceRecords)
      .where(eq(userSentenceRecords.userId, userId))
      .orderBy(asc(userSentenceRecords.due));

    if (sentences.length === 0) {
      return NextResponse.json({
        message: "No sentences found",
        sentences: [],
        status: 200,
      });
    }

    const shuffledSentences = [...sentences].sort(() => Math.random() - 0.5);
    const selectedSentences = shuffledSentences.slice(0, Math.min(5, sentences.length));

    const processedSentences = [];

    for (const sentence of selectedSentences) {
      let content = "";
      let title = "";

      if (sentence.articleId) {
        const [art] = await db
          .select({ title: articles.title, passage: articles.passage })
          .from(articles)
          .where(eq(articles.id, sentence.articleId))
          .limit(1);
        if (art) {
          content = art.passage || "";
          title = art.title || "";
        }
      }

      if (!content) continue;

      const targetSentence = sentence.sentence;

      if (!targetSentence || targetSentence.trim().length === 0) continue;

      const originalWords = targetSentence
        .split(/\s+/)
        .filter((word) => word.trim().length > 0);

      const cleanedWords = originalWords
        .map((word) => word.replace(/[^\w'-]/g, "").toLowerCase())
        .filter((word) => word.length > 0);

      if (cleanedWords.length < 3) continue;

      const wordObjects = originalWords
        .map((word, index) => {
          const cleanedWord = word.replace(/[^\w'-]/g, "").toLowerCase();

          return {
            id: `word-${sentence.id}-${index}`,
            text: cleanedWord,
            originalText: word,
            translation: null,
            audioUrl: sentence.audioUrl || null,
            startTime: sentence.timepoint || 0,
            endTime: sentence.endTimepoint || 0,
            partOfSpeech: "unknown",
          };
        })
        .filter((word) => word.text.length > 0);

      const correctOrder = wordObjects.map((word) => word.text);

      let difficulty: "easy" | "medium" | "hard" = "medium";
      if (correctOrder.length <= 5) difficulty = "easy";
      else if (correctOrder.length >= 10) difficulty = "hard";

      processedSentences.push({
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
      });
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
      sentenceResults = [],
    } = await req.json();

    if (!totalQuestions || correctAnswers === undefined || !timeTaken) {
      return NextResponse.json({
        message:
          "Missing required fields: totalQuestions, correctAnswers, timeTaken",
        status: 400,
      });
    }

    const accuracy = (correctAnswers / totalQuestions) * 100;
    const baseXp = 10;
    const xpEarned = Math.floor(correctAnswers * baseXp);

    if (sentenceResults.length > 0) {
      const f = fsrs(generatorParameters());
      const now = new Date();

      const updatePromises = sentenceResults.map(async (result: any) => {
        try {
          const [sentence] = await db
            .select()
            .from(userSentenceRecords)
            .where(eq(userSentenceRecords.id, result.sentenceId))
            .limit(1);

          if (!sentence || sentence.userId !== userId) return;

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
          const rating = result.isCorrect ? Rating.Good : Rating.Again;
          const selectedSchedule = schedulingInfo[rating];

          const newDue = selectedSchedule.card.due;
          const newStability = selectedSchedule.card.stability;
          const newDifficulty = selectedSchedule.card.difficulty;
          const newElapsedDays = selectedSchedule.card.elapsed_days;
          const newScheduledDays = selectedSchedule.card.scheduled_days;
          const newReps = selectedSchedule.card.reps;
          const newLapses = selectedSchedule.card.lapses;
          const newState = selectedSchedule.card.state;

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
            const fallbackDue = new Date();
            if (result.isCorrect) {
              fallbackDue.setDate(fallbackDue.getDate() + 3);
            } else {
              fallbackDue.setDate(fallbackDue.getDate() + 1);
            }

            await db
              .update(userSentenceRecords)
              .set({
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
                lapses: result.isCorrect ? sentence.lapses : sentence.lapses + 1,
                state: result.isCorrect ? 2 : 1,
              })
              .where(eq(userSentenceRecords.id, result.sentenceId));
          } else {
            await db
              .update(userSentenceRecords)
              .set({
                due: newDue,
                stability: newStability,
                difficulty: newDifficulty,
                elapsedDays: newElapsedDays,
                scheduledDays: newScheduledDays,
                reps: newReps,
                lapses: newLapses,
                state: newState,
              })
              .where(eq(userSentenceRecords.id, result.sentenceId));
          }
        } catch (error) {
          console.error(`Error updating sentence ${result.sentenceId}:`, error);
        }
      });

      await Promise.all(updatePromises);
    }

    const uniqueTargetId =
      gameSession || `sentence-ordering-${userId}-${Date.now()}`;

    const [activity] = await db
      .insert(userActivity)
      .values({
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
      })
      .returning();

    if (xpEarned > 0) {
      await db.insert(xpLogs).values({
        userId: userId,
        xpEarned: xpEarned,
        activityId: activity.id,
        activityType: "SENTENCE_ORDERING",
      });

      const [currentUser] = await db
        .select({ xp: users.xp, level: users.level, cefrLevel: users.cefrLevel })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (currentUser) {
        const { levelCalculation } = await import("@/lib/utils");

        const finalXp = (currentUser.xp || 0) + xpEarned;
        const levelData = levelCalculation(finalXp);

        await db
          .update(users)
          .set({
            xp: finalXp,
            level:
              typeof levelData.raLevel === "number"
                ? levelData.raLevel
                : parseInt(String(levelData.raLevel)),
            cefrLevel: levelData.cefrLevel,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
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
      sentenceResults = [],
    } = await req.json();

    if (!totalQuestions || correctAnswers === undefined || !timeTaken) {
      return NextResponse.json({
        message:
          "Missing required fields: totalQuestions, correctAnswers, timeTaken",
        status: 400,
      });
    }

    const accuracy = (correctAnswers / totalQuestions) * 100;
    const xpEarned = Math.floor(correctAnswers * 5);

    if (sentenceResults.length > 0) {
      const f = fsrs(generatorParameters());
      const now = new Date();

      const updatePromises = sentenceResults.map(async (result: any) => {
        try {
          const [sentence] = await db
            .select()
            .from(userSentenceRecords)
            .where(eq(userSentenceRecords.id, result.sentenceId))
            .limit(1);

          if (!sentence || sentence.userId !== userId) return;

          const card = {
            due: new Date(sentence.due),
            stability: sentence.stability,
            difficulty: sentence.difficulty,
            elapsed_days: sentence.elapsedDays,
            scheduled_days: sentence.scheduledDays,
            reps: sentence.reps,
            lapses: sentence.lapses,
            state: sentence.state as State,
            last_review: sentence.updatedAt,
          };

          const rating = result.isCorrect ? Rating.Good : Rating.Again;
          const recordLog = f.repeat(card, now)[rating];

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
            const fallbackDue = new Date();
            if (result.isCorrect) {
              fallbackDue.setDate(fallbackDue.getDate() + 3);
            } else {
              fallbackDue.setDate(fallbackDue.getDate() + 1);
            }

            await db
              .update(userSentenceRecords)
              .set({
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
                lapses: result.isCorrect ? sentence.lapses : sentence.lapses + 1,
                state: result.isCorrect ? 2 : 1,
              })
              .where(eq(userSentenceRecords.id, result.sentenceId));
          } else {
            await db
              .update(userSentenceRecords)
              .set({
                due: newDue,
                stability: newStability,
                difficulty: newDifficulty,
                elapsedDays: newElapsedDays,
                scheduledDays: newScheduledDays,
                reps: newReps,
                lapses: newLapses,
                state: newState,
              })
              .where(eq(userSentenceRecords.id, result.sentenceId));
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

    const uniqueTargetId =
      gameSession || `word-ordering-${userId}-${Date.now()}`;

    const [activity] = await db
      .insert(userActivity)
      .values({
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
      })
      .returning();

    if (xpEarned > 0) {
      await db.insert(xpLogs).values({
        userId: userId,
        xpEarned: xpEarned,
        activityId: activity.id,
        activityType: "SENTENCE_WORD_ORDERING",
      });

      const [user] = await db
        .select({ xp: users.xp })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user) {
        await db
          .update(users)
          .set({ xp: (user.xp ?? 0) + xpEarned })
          .where(eq(users.id, userId));

        if (req.session?.user) {
          req.session.user.xp = (user.xp ?? 0) + xpEarned;
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

    const [sentences] = await db
      .select({ id: userSentenceRecords.id })
      .from(userSentenceRecords)
      .where(eq(userSentenceRecords.userId, userId))
      .limit(1);

    if (!sentences) {
      return NextResponse.json({
        success: false,
        error: "No sentence flashcard deck found",
      });
    }

    return NextResponse.json({
      success: true,
      deckId: userId,
    });
  } catch (error) {
    console.error("Error getting flashcard deck info:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to get flashcard deck",
    });
  }
}
