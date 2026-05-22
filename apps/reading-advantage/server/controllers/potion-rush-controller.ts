import { db, and, asc, desc, eq, sql } from "@reading-advantage/db";
import {
  gameRankings,
  userActivity,
  users,
  userSentenceRecords,
  xpLogs,
} from "@reading-advantage/db/schema";
import type { ExtendedNextRequest } from "@/server/controllers/auth-controller";
import { NextResponse } from "next/server";
import { ActivityType, GameType } from "@/lib/enums";

export class PotionRushController {
  static async completeGame(req: ExtendedNextRequest) {
    try {
      const userId = req.session?.user?.id;

      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await req.json();
      const {
        score,
        correctAnswers, // In this context, correct sentences/potions brewed
        totalAttempts, // Total attempts
        accuracy,
        difficulty = "normal",
        gameTime,
      } = body;

      // Validate required fields
      if (
        correctAnswers === undefined ||
        totalAttempts === undefined ||
        accuracy === undefined
      ) {
        return NextResponse.json(
          {
            error: "Missing required fields",
            message: "correctAnswers, totalAttempts, and accuracy are required",
          },
          { status: 400 },
        );
      }

      // Calculate XP: correctAnswers * accuracy * multiplier based on difficulty?
      // For now, keep it simple like Castle Defense: correctAnswers * accuracy
      // Maybe add a difficulty multiplier?
      let difficultyMultiplier = 1;
      if (difficulty === "easy") difficultyMultiplier = 1;
      else if (difficulty === "normal") difficultyMultiplier = 1.2;
      else if (difficulty === "hard") difficultyMultiplier = 1.5;
      else if (difficulty === "extreme") difficultyMultiplier = 2.0;

      const xpEarned = Math.floor(
        correctAnswers * accuracy * difficultyMultiplier,
      );

      // Create unique target ID for this game session
      const uniqueTargetId = `potion-rush-${userId}-${Date.now()}`;

      try {
        // Create user activity record
        const [activity] = await db
          .insert(userActivity)
          .values({
            userId,
            activityType: ActivityType.POTION_RUSH,
            targetId: uniqueTargetId,
            completed: true,
            timer: gameTime || 0,
            details: {
              score,
              correctAnswers,
              totalAttempts,
              accuracy,
              xpEarned,
              difficulty,
              gameSession: uniqueTargetId,
            },
          })
          .returning();

        // Create XP log entry if XP was earned
        if (xpEarned > 0) {
          await db.insert(xpLogs).values({
            userId,
            xpEarned,
            activityId: activity.id,
            activityType: ActivityType.POTION_RUSH,
          });

          // Update user's total XP
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

          if (user) {
            const updatedXp = user.xp + xpEarned;
            await db
              .update(users)
              .set({ xp: updatedXp })
              .where(eq(users.id, userId));

            // Update session if available
            if (req.session?.user) {
              req.session.user.xp = updatedXp;
            }

            // Update Game Ranking
            try {
              await db
                .insert(gameRankings)
                .values({
                  userId,
                  gameType: GameType.POTION_RUSH,
                  difficulty,
                  totalXp: xpEarned,
                })
                .onConflictDoUpdate({
                  target: [gameRankings.userId, gameRankings.gameType, gameRankings.difficulty],
                  set: {
                    totalXp: sql`${gameRankings.totalXp} + ${xpEarned}`,
                    updatedAt: new Date(),
                  },
                });
            } catch (rankingError) {
              console.warn(
                "Failed to update ranking, but game activity saved.",
                rankingError,
              );
            }
          }
        }

        return NextResponse.json({
          message: "Game completed successfully",
          xpEarned,
          activityId: activity.id,
          status: 200,
        });
      } catch (error) {
        console.error("Error logging potion rush activity:", error);
        return NextResponse.json(
          {
            error: "Failed to log activity",
            message: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 },
        );
      }
    } catch (error) {
      console.error("Error completing potion rush game:", error);
      return NextResponse.json(
        {
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  }

  static async getRanking(req: ExtendedNextRequest) {
    try {
      const userId = req.session?.user?.id;

      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // 1. Get current user's license/school info
      const [currentUser] = await db
        .select({ licenseId: users.licenseId, schoolId: users.schoolId })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!currentUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // 2. Fetch rankings from GameRanking table
      const rankingConditions = [eq(gameRankings.gameType, GameType.POTION_RUSH)];
      if (currentUser.licenseId) {
        rankingConditions.push(eq(users.licenseId, currentUser.licenseId));
      } else if (currentUser.schoolId) {
        rankingConditions.push(eq(users.schoolId, currentUser.schoolId));
      }

      const rankingRows = await db
        .select({
          userId: gameRankings.userId,
          totalXp: gameRankings.totalXp,
          difficulty: gameRankings.difficulty,
          userName: users.name,
          userImage: users.image,
        })
        .from(gameRankings)
        .innerJoin(users, eq(gameRankings.userId, users.id))
        .where(and(...rankingConditions))
        .orderBy(desc(gameRankings.totalXp));

      // 3. Group by difficulty
      type RankingEntry = {
        userId: string;
        name: string;
        image: string | null;
        xp: number;
      };

      const sortedRankings: Record<string, RankingEntry[]> = {
        easy: [],
        normal: [],
        hard: [],
        extreme: [],
      };

      rankingRows.forEach((rank) => {
        const difficulty = rank.difficulty;
        if (sortedRankings[difficulty]) {
          // Limit to top 20
          if (sortedRankings[difficulty].length < 20) {
            sortedRankings[difficulty].push({
              userId: rank.userId,
              name: rank.userName || "Unknown Alchemist",
              image: rank.userImage,
              xp: rank.totalXp,
            });
          }
        }
      });

      return NextResponse.json({ rankings: sortedRankings });
    } catch (error) {
      console.error("Error fetching potion rush rankings:", error);
      return NextResponse.json(
        {
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  }

  static async getSentences(req: ExtendedNextRequest) {
    try {
      const userId = req.session?.user?.id;

      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Fetch user's sentence records
      // Prioritize words that are due or low stability
      const records = await db
        .select()
        .from(userSentenceRecords)
        .where(
          and(
            eq(userSentenceRecords.userId, userId),
            eq(userSentenceRecords.saveToFlashcard, true),
          ),
        )
        .orderBy(asc(userSentenceRecords.due), asc(userSentenceRecords.stability))
        .limit(30);

      if (records.length === 0) {
        return NextResponse.json({
          message: "No sentences found. Please learn some sentences first.",
          warning: "NO_SENTENCES",
          sentences: [],
          status: 200,
        });
      }

      // Transform to the format expected by the game
      const url = new URL(req.url);
      const queryLocale = url.searchParams.get("locale");
      const acceptLanguage = req.headers.get("accept-language") || "";

      let locale =
        queryLocale || acceptLanguage.split(",")[0]?.split("-")[0] || "en";

      let translationKey = locale;

      if (locale === "cn") translationKey = "zh-CN";
      else if (locale === "tw") translationKey = "zh-TW";
      else if (locale === "zh") {
        const fullLocale = acceptLanguage.split(",")[0] || "";
        translationKey =
          fullLocale.includes("TW") || fullLocale.includes("HK")
            ? "zh-TW"
            : "zh-CN";
      }

      const gameSentences = records
        .map((record) => {
          let translation = "";
          try {
            const transObj = record.translation as any;
            if (typeof transObj === "string") {
              translation = transObj;
            } else if (transObj && typeof transObj === "object") {
              translation =
                transObj[translationKey] ||
                transObj.th ||
                transObj["zh-CN"] ||
                transObj["zh-TW"] ||
                transObj.vi ||
                transObj.en ||
                record.sentence;
            }
          } catch (e) {
            console.warn("Failed to parse translation for sentence", record.id);
          }

          return {
            id: record.id,
            term: record.sentence,
            translation: translation,
            audioUrl: record.audioUrl,
          };
        })
        .filter((item) => item.term && item.translation);

      if (gameSentences.length < 5) {
        return NextResponse.json({
          message: `You need at least 5 sentences to play. You currently have ${gameSentences.length}.`,
          warning: "INSUFFICIENT_SENTENCES",
          requiredCount: 5,
          currentCount: gameSentences.length,
          sentences: gameSentences,
          status: 200,
        });
      }

      return NextResponse.json({
        message: "Sentences retrieved successfully",
        sentences: gameSentences,
        status: 200,
      });
    } catch (error) {
      console.error("Error fetching sentences for potion rush:", error);
      return NextResponse.json(
        {
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  }
}
