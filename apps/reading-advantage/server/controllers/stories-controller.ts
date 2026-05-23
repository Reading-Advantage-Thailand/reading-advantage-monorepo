import { NextRequest, NextResponse } from "next/server";
import { ExtendedNextRequest } from "./auth-controller";
import { deleteStoryAndImages } from "@/utils/deleteStories";
import { ActivityType } from "@/lib/enums";
import { db, and, asc, desc, eq, inArray, or, sql } from "@reading-advantage/db";
import { chapters, stories } from "@reading-advantage/db/schema";
import { userActivity } from "@reading-advantage/db/schema";
import genreData from "@/data/type-genre.json";

interface RequestContext {
  params: Promise<{
    storyId: string;
    chapterNumber: string;
  }>;
}

async function countActivity(where: ReturnType<typeof and>): Promise<number> {
  const rows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(userActivity)
    .where(where);
  return rows[0]?.c ?? 0;
}

export async function checkChapterCompletion(
  userId: string,
  storyId: string,
  chapterNumber: number
): Promise<boolean> {
  const chapterTargetId = `${storyId}_${chapterNumber}`;

  const mcqCount = await countActivity(
    and(
      eq(userActivity.userId, userId),
      eq(userActivity.activityType, ActivityType.MC_QUESTION),
      sql`${userActivity.targetId} LIKE ${`${chapterTargetId}_mcq_%`}`,
      eq(userActivity.completed, true)
    )!
  );

  // Check SAQ completion (1 question)
  let saqExistsRows = await db
    .select()
    .from(userActivity)
    .where(
      and(
        eq(userActivity.userId, userId),
        eq(userActivity.activityType, ActivityType.SA_QUESTION),
        eq(userActivity.targetId, chapterTargetId),
        eq(userActivity.completed, true)
      )
    )
    .limit(1);
  let saqExists = saqExistsRows[0] ?? null;

  if (!saqExists) {
    const rows = await db
      .select()
      .from(userActivity)
      .where(
        and(
          eq(userActivity.userId, userId),
          eq(userActivity.activityType, ActivityType.SA_QUESTION),
          eq(userActivity.completed, true),
          or(
            eq(userActivity.targetId, storyId),
            sql`${userActivity.targetId} LIKE ${`${storyId}_%`}`,
            sql`${userActivity.details}->>'storyId' = ${storyId}`
          )
        )
      )
      .limit(1);
    saqExists = rows[0] ?? null;
  }

  // Check LAQ completion (1 question)
  let laqExistsRows = await db
    .select()
    .from(userActivity)
    .where(
      and(
        eq(userActivity.userId, userId),
        eq(userActivity.activityType, ActivityType.LA_QUESTION),
        eq(userActivity.targetId, chapterTargetId),
        eq(userActivity.completed, true)
      )
    )
    .limit(1);
  let laqExists = laqExistsRows[0] ?? null;

  if (!laqExists) {
    const rows = await db
      .select()
      .from(userActivity)
      .where(
        and(
          eq(userActivity.userId, userId),
          eq(userActivity.activityType, ActivityType.LA_QUESTION),
          eq(userActivity.completed, true),
          or(
            eq(userActivity.targetId, storyId),
            sql`${userActivity.targetId} LIKE ${`${storyId}_%`}`,
            sql`${userActivity.details}->>'storyId' = ${storyId}`
          )
        )
      )
      .limit(1);
    laqExists = rows[0] ?? null;
  }

  try {
    const passed = mcqCount >= 5 && !!saqExists && !!laqExists;
    if (!passed) {
      try {
        await db
          .select()
          .from(userActivity)
          .where(
            and(
              eq(userActivity.userId, userId),
              eq(userActivity.activityType, ActivityType.MC_QUESTION),
              sql`${userActivity.targetId} LIKE ${`${chapterTargetId}_mcq_%`}`
            )
          )
          .orderBy(asc(userActivity.createdAt));

        await db
          .select()
          .from(userActivity)
          .where(
            and(
              eq(userActivity.userId, userId),
              eq(userActivity.activityType, ActivityType.SA_QUESTION),
              or(
                eq(userActivity.targetId, chapterTargetId),
                eq(userActivity.targetId, storyId),
                sql`${userActivity.targetId} LIKE ${`${storyId}_%`}`,
                sql`${userActivity.details}->>'storyId' = ${storyId}`
              )
            )
          );

        await db
          .select()
          .from(userActivity)
          .where(
            and(
              eq(userActivity.userId, userId),
              eq(userActivity.activityType, ActivityType.LA_QUESTION),
              or(
                eq(userActivity.targetId, chapterTargetId),
                eq(userActivity.targetId, storyId),
                sql`${userActivity.targetId} LIKE ${`${storyId}_%`}`,
                sql`${userActivity.details}->>'storyId' = ${storyId}`
              )
            )
          );
      } catch (e) {
        console.error("Failed to fetch candidate activities", e);
      }
    }
  } catch (e) {
    // ignore
  }

  return mcqCount >= 5 && !!saqExists && !!laqExists;
}

export async function updateChapterCompletion(
  userId: string,
  storyId: string,
  chapterNumber: number
): Promise<void> {
  const targetId = `${storyId}_${chapterNumber}`;
  const isCompleted = await checkChapterCompletion(
    userId,
    storyId,
    chapterNumber
  );

  if (isCompleted) {
    try {
      const existingRows = await db
        .select()
        .from(userActivity)
        .where(
          and(
            eq(userActivity.userId, userId),
            eq(userActivity.activityType, ActivityType.CHAPTER_READ),
            eq(userActivity.targetId, targetId)
          )
        )
        .limit(1);
      const existing = existingRows[0];

      if (existing) {
        await db
          .update(userActivity)
          .set({ completed: true, updatedAt: new Date() })
          .where(eq(userActivity.id, existing.id));
      } else {
        await db.insert(userActivity).values({
          userId,
          activityType: ActivityType.CHAPTER_READ,
          targetId,
          completed: true,
        });
      }
    } catch (err) {
      console.error(
        `[updateChapterCompletion] Failed to upsert CHAPTER_READ userId=${userId} storyId=${storyId} chapter=${chapterNumber} targetId=${targetId}`,
        err
      );
    }
  }
}

export async function getAllStories(req: ExtendedNextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storyId = searchParams.get("storyId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "8", 10);
    const genre = searchParams.get("genre") || null;
    const subgenre = searchParams.get("subgenre") || null;
    const userId = req.session?.user.id as string;
    const userLevel = req.session?.user.level as number;

    const genresFiction = { Genres: genreData.fiction };
    const rawGenres = genresFiction.Genres || [];
    const selectionGenres = rawGenres
      .map((g: any) => g.Name ?? g.name ?? "")
      .filter(Boolean);

    if (storyId) {
      const storyRows = await db
        .select()
        .from(stories)
        .where(eq(stories.id, storyId))
        .limit(1);
      const story = storyRows[0];

      if (!story) {
        return NextResponse.json(
          { message: "Story not found", result: null },
          { status: 404 }
        );
      }

      if (story.raLevel && story.raLevel > userLevel) {
        return NextResponse.json(
          { message: "Story level too high for user", result: null },
          { status: 403 }
        );
      }

      const storyChapters = await db
        .select()
        .from(chapters)
        .where(eq(chapters.storyId, storyId));

      return NextResponse.json({
        result: { ...story, chapters: storyChapters },
      });
    }

    if (page < 1 || limit < 1) {
      return NextResponse.json(
        {
          message: "Invalid pagination parameters",
          results: [],
          selectionGenres,
        },
        { status: 400 }
      );
    }

    const date = searchParams.get("date");
    const rating = searchParams.get("rating");

    const levelParam = searchParams.get("level");
    const levels = levelParam ? levelParam.split(",") : [];

    const conditions = [] as any[];

    if (levels.length > 0) {
      conditions.push(inArray(stories.cefrLevel, levels));
    } else {
      conditions.push(
        or(
          and(
            sql`${stories.raLevel} >= ${userLevel - 3}`,
            sql`${stories.raLevel} <= ${userLevel + 3}`
          ),
          sql`${stories.raLevel} <= ${userLevel}`,
          sql`${stories.raLevel} IS NULL`
        )
      );
    }
    if (genre) conditions.push(eq(stories.genre, genre));
    if (subgenre) conditions.push(eq(stories.subgenre, subgenre));
    if (rating)
      conditions.push(sql`${stories.averageRating} >= ${parseFloat(rating)}`);

    const whereExpr = conditions.length > 0 ? and(...conditions) : undefined;

    const countRows = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(stories)
      .where(whereExpr);
    const totalCount = countRows[0]?.c ?? 0;

    const orderExpr =
      date === "asc" ? asc(stories.createdAt) : desc(stories.createdAt);

    const storyRows = await db
      .select()
      .from(stories)
      .where(whereExpr)
      .orderBy(orderExpr)
      .offset((page - 1) * limit)
      .limit(limit);

    const storyIds = storyRows.map((s) => s.id);
    const allChapters = storyIds.length
      ? await db
          .select()
          .from(chapters)
          .where(inArray(chapters.storyId, storyIds))
      : [];
    const chaptersByStory = new Map<string, typeof allChapters>();
    for (const ch of allChapters) {
      const list = chaptersByStory.get(ch.storyId) ?? [];
      list.push(ch);
      chaptersByStory.set(ch.storyId, list);
    }

    const storiesWithChapters = storyRows.map((s) => ({
      ...s,
      chapters: chaptersByStory.get(s.id) ?? [],
    }));

    const availableStories = await Promise.all(
      storiesWithChapters.map(async (story) => {
        const chapterCount = story.chapters.length;

        const storyReadRows = await db
          .select()
          .from(userActivity)
          .where(
            and(
              eq(userActivity.userId, userId),
              eq(userActivity.activityType, ActivityType.STORIES_READ),
              eq(userActivity.targetId, story.id)
            )
          )
          .limit(1);
        const storyReadActivity = storyReadRows[0];
        const isRead = !!storyReadActivity;

        const completedChapters = await Promise.all(
          story.chapters.map(async (chapter) => {
            const mcqCount = await countActivity(
              and(
                eq(userActivity.userId, userId),
                eq(userActivity.activityType, ActivityType.MC_QUESTION),
                sql`${userActivity.targetId} LIKE ${`${story.id}_${chapter.chapterNumber}_mcq_%`}`,
                eq(userActivity.completed, true)
              )!
            );

            const saqCount = await countActivity(
              and(
                eq(userActivity.userId, userId),
                eq(userActivity.activityType, ActivityType.SA_QUESTION),
                eq(
                  userActivity.targetId,
                  `${story.id}_${chapter.chapterNumber}`
                ),
                eq(userActivity.completed, true)
              )!
            );

            const laqCount = await countActivity(
              and(
                eq(userActivity.userId, userId),
                eq(userActivity.activityType, ActivityType.LA_QUESTION),
                eq(
                  userActivity.targetId,
                  `${story.id}_${chapter.chapterNumber}`
                ),
                eq(userActivity.completed, true)
              )!
            );

            return mcqCount >= 5 && saqCount >= 1 && laqCount >= 1;
          })
        );

        const isComplete =
          completedChapters.filter(Boolean).length === chapterCount;

        if (isComplete && storyReadActivity && !storyReadActivity.completed) {
          await db
            .update(userActivity)
            .set({ completed: true })
            .where(eq(userActivity.id, storyReadActivity.id));
        }

        return {
          ...story,
          is_read: isRead,
          is_completed: isComplete,
        };
      })
    );

    return NextResponse.json({
      params: { genre, subgenre, page, limit },
      results: availableStories,
      selectionGenres,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error("Error getting stories", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        results: [],
        selectionGenres: [],
        error,
      },
      { status: 500 }
    );
  }
}

export async function getStoryById(
  req: ExtendedNextRequest,
  ctx: { params: Promise<{ storyId: string }> }
) {
  const { storyId } = await ctx.params;
  const userId = req.session?.user.id as string;

  if (!storyId) {
    return NextResponse.json(
      { message: "Missing storyId", result: null },
      { status: 400 }
    );
  }

  try {
    const storyRows = await db
      .select()
      .from(stories)
      .where(eq(stories.id, storyId))
      .limit(1);
    const story = storyRows[0];

    if (!story) {
      return NextResponse.json(
        { message: "Story not found", result: null },
        { status: 404 }
      );
    }

    const storyChapters = await db
      .select({
        id: chapters.id,
        chapterNumber: chapters.chapterNumber,
        title: chapters.title,
        summary: chapters.summary,
        rating: chapters.rating,
        userRatingCount: chapters.userRatingCount,
      })
      .from(chapters)
      .where(eq(chapters.storyId, storyId))
      .orderBy(asc(chapters.chapterNumber));

    let storyReadRows = await db
      .select()
      .from(userActivity)
      .where(
        and(
          eq(userActivity.userId, userId),
          eq(userActivity.activityType, ActivityType.STORIES_READ),
          eq(userActivity.targetId, storyId)
        )
      )
      .limit(1);
    let storyReadActivity = storyReadRows[0];

    if (!storyReadActivity) {
      const inserted = await db
        .insert(userActivity)
        .values({
          userId,
          activityType: ActivityType.STORIES_READ,
          targetId: storyId,
          completed: false,
        })
        .returning();
      storyReadActivity = inserted[0];
    }

    const chaptersWithCompletion = await Promise.all(
      storyChapters.map(async (chapter) => {
        const chapterReadRows = await db
          .select()
          .from(userActivity)
          .where(
            and(
              eq(userActivity.userId, userId),
              eq(userActivity.activityType, ActivityType.CHAPTER_READ),
              eq(
                userActivity.targetId,
                `${storyId}_${chapter.chapterNumber}`
              )
            )
          )
          .limit(1);
        const chapterReadActivity = chapterReadRows[0];

        const mcqCount = await countActivity(
          and(
            eq(userActivity.userId, userId),
            eq(userActivity.activityType, ActivityType.MC_QUESTION),
            sql`${userActivity.targetId} LIKE ${`${storyId}_${chapter.chapterNumber}_mcq_%`}`,
            eq(userActivity.completed, true)
          )!
        );

        const saqExistsRows = await db
          .select()
          .from(userActivity)
          .where(
            and(
              eq(userActivity.userId, userId),
              eq(userActivity.activityType, ActivityType.SA_QUESTION),
              eq(
                userActivity.targetId,
                `${storyId}_${chapter.chapterNumber}`
              ),
              eq(userActivity.completed, true)
            )
          )
          .limit(1);
        const saqExists = saqExistsRows[0] ?? null;

        let saqFallback = saqExists;
        if (!saqFallback) {
          const rows = await db
            .select()
            .from(userActivity)
            .where(
              and(
                eq(userActivity.userId, userId),
                eq(userActivity.activityType, ActivityType.SA_QUESTION),
                eq(userActivity.completed, true),
                or(
                  eq(userActivity.targetId, storyId),
                  sql`${userActivity.targetId} LIKE ${`${storyId}_%`}`
                ),
                sql`${userActivity.details}->>'chapter_number' = ${String(chapter.chapterNumber)}`
              )
            )
            .limit(1);
          saqFallback = rows[0] ?? null;
        }

        const laqExistsRows = await db
          .select()
          .from(userActivity)
          .where(
            and(
              eq(userActivity.userId, userId),
              eq(userActivity.activityType, ActivityType.LA_QUESTION),
              eq(
                userActivity.targetId,
                `${storyId}_${chapter.chapterNumber}`
              ),
              eq(userActivity.completed, true)
            )
          )
          .limit(1);
        const laqExists = laqExistsRows[0] ?? null;

        let laqFallback = laqExists;
        if (!laqFallback) {
          const rows = await db
            .select()
            .from(userActivity)
            .where(
              and(
                eq(userActivity.userId, userId),
                eq(userActivity.activityType, ActivityType.LA_QUESTION),
                eq(userActivity.completed, true),
                or(
                  eq(userActivity.targetId, storyId),
                  sql`${userActivity.targetId} LIKE ${`${storyId}_%`}`
                )
              )
            )
            .limit(1);
          laqFallback = rows[0] ?? null;
        }

        const isCompleted = mcqCount >= 5 && !!saqFallback && !!laqFallback;

        return {
          ...chapter,
          is_read: !!chapterReadActivity,
          is_completed: isCompleted,
        };
      })
    );

    const storyWithCompletion = {
      ...story,
      chapters: chaptersWithCompletion,
      is_read: true,
    };

    return NextResponse.json({
      result: storyWithCompletion,
    });
  } catch (error) {
    console.error("Error getting story", error);
    return NextResponse.json(
      { message: "Internal server error", error },
      { status: 500 }
    );
  }
}

export async function updateAverageRating(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  const { storyId, chapterNumber: chapterNumberStr } = await ctx.params;
  const chapterNumber = parseInt(chapterNumberStr, 10);

  if (!storyId || isNaN(chapterNumber)) {
    return NextResponse.json(
      { message: "Missing storyId or invalid chapterNumber", result: null },
      { status: 400 }
    );
  }

  try {
    const data = await req.json();
    const rating = Math.round((data.rating as number) * 4) / 4;

    const chapterRows = await db
      .select()
      .from(chapters)
      .where(
        and(
          eq(chapters.storyId, storyId),
          eq(chapters.chapterNumber, chapterNumber)
        )
      )
      .limit(1);
    const chapter = chapterRows[0];

    if (!chapter) {
      return NextResponse.json(
        { message: "Chapter not found", results: [] },
        { status: 404 }
      );
    }

    await db
      .update(chapters)
      .set({
        rating,
        userRatingCount: (chapter.userRatingCount || 0) + 1,
      })
      .where(
        and(
          eq(chapters.storyId, storyId),
          eq(chapters.chapterNumber, chapterNumber)
        )
      );

    const allChapters = await db
      .select({
        rating: chapters.rating,
        userRatingCount: chapters.userRatingCount,
      })
      .from(chapters)
      .where(eq(chapters.storyId, storyId));

    let totalRating = 0;
    let totalUserCount = 0;

    allChapters.forEach((ch) => {
      if (ch.rating && ch.userRatingCount) {
        totalRating += ch.rating * ch.userRatingCount;
        totalUserCount += ch.userRatingCount;
      }
    });

    const averageRating =
      totalUserCount > 0
        ? Math.round((totalRating / totalUserCount) * 4) / 4
        : 0;

    await db
      .update(stories)
      .set({ averageRating })
      .where(eq(stories.id, storyId));

    return NextResponse.json(
      { message: "Update average rating successfully", averageRating },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating average rating", error);
    return NextResponse.json(
      { message: "Internal server error", results: [] },
      { status: 500 }
    );
  }
}

export async function getChapter(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  const { storyId, chapterNumber: chapterNumberStr } = await ctx.params;
  const chapterNumber = parseInt(chapterNumberStr, 10);
  const userId = req.session?.user.id as string;

  if (!storyId || isNaN(chapterNumber)) {
    return NextResponse.json(
      { message: "Missing storyId or invalid chapterNumber", result: null },
      { status: 400 }
    );
  }

  try {
    const storyRows = await db
      .select()
      .from(stories)
      .where(eq(stories.id, storyId))
      .limit(1);
    const story = storyRows[0];

    if (!story) {
      return NextResponse.json(
        { message: "Story not found", result: null },
        { status: 404 }
      );
    }

    const chapterRows = await db
      .select()
      .from(chapters)
      .where(
        and(
          eq(chapters.storyId, storyId),
          eq(chapters.chapterNumber, chapterNumber)
        )
      )
      .limit(1);
    const chapter = chapterRows[0];

    if (!chapter) {
      return NextResponse.json(
        { message: `Chapter ${chapterNumber} not found`, result: null },
        { status: 404 }
      );
    }

    const timepoints = chapter.sentences || [];

    const totalChapterRows = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(chapters)
      .where(eq(chapters.storyId, storyId));
    const totalChapters = totalChapterRows[0]?.c ?? 0;

    return NextResponse.json({
      storyId,
      chapterNumber,
      ra_Level: story.raLevel,
      type: story.type,
      genre: story.genre,
      subgenre: story.subgenre,
      cefr_level: story.cefrLevel,
      totalChapters,
      chapter: chapter,
      timepoints: timepoints,
    });
  } catch (error) {
    console.error("Error getting chapter", error);
    return NextResponse.json(
      { message: "Internal server error", error },
      { status: 500 }
    );
  }
}

export async function deleteStories(
  req: ExtendedNextRequest,
  ctx: { params: Promise<{ storyId: string }> }
) {
  const { storyId } = await ctx.params;
  try {
    await db.delete(stories).where(eq(stories.id, storyId));

    await deleteStoryAndImages(storyId);

    return NextResponse.json(
      {
        message: "Stories Deleted",
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error", error },
      { status: 500 }
    );
  }
}

export async function logChapterRead(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  const { storyId, chapterNumber: chapterNumberStr } = await ctx.params;
  const chapterNumber = parseInt(chapterNumberStr, 10);
  const userId = req.session?.user.id as string;

  if (!storyId || isNaN(chapterNumber)) {
    return NextResponse.json(
      { message: "Missing storyId or invalid chapterNumber", result: null },
      { status: 400 }
    );
  }

  try {
    const existingRows = await db
      .select()
      .from(userActivity)
      .where(
        and(
          eq(userActivity.userId, userId),
          eq(userActivity.activityType, ActivityType.CHAPTER_READ),
          eq(userActivity.targetId, `${storyId}_${chapterNumber}`)
        )
      )
      .limit(1);
    let chapterReadActivity = existingRows[0];

    if (!chapterReadActivity) {
      const inserted = await db
        .insert(userActivity)
        .values({
          userId,
          activityType: ActivityType.CHAPTER_READ,
          targetId: `${storyId}_${chapterNumber}`,
          completed: false,
        })
        .returning();
      chapterReadActivity = inserted[0];
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error logging chapter read:", error);
    return NextResponse.json(
      { message: "Internal server error", error },
      { status: 500 }
    );
  }
}
