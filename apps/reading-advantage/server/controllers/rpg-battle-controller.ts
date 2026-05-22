import { db, and, asc, desc, eq, sql } from "@reading-advantage/db";
import {
  gameRankings,
  userActivity,
  users,
  userWordRecords,
  xpLogs,
} from "@reading-advantage/db/schema";
import type { ExtendedNextRequest } from "@/server/controllers/auth-controller";
import { NextResponse } from "next/server";
import { battleHeroes } from "@/lib/games/rpgBattleSelection";

export class RpgBattleController {
  static async completeGame(req: ExtendedNextRequest) {
    try {
      const userId = req.session?.user?.id;

      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await req.json();
      const {
        xp,
        accuracy,
        totalAttempts,
        totalCorrect,
        turnsTaken,
        heroId,
        enemyId,
        outcome,
      } = body;

      // Validate required fields
      if (
        xp === undefined ||
        accuracy === undefined ||
        totalAttempts === undefined ||
        totalCorrect === undefined ||
        outcome === undefined
      ) {
        return NextResponse.json(
          {
            error: "Missing required fields",
            message:
              "xp, accuracy, totalAttempts, totalCorrect, and outcome are required",
          },
          { status: 400 },
        );
      }

      // Create unique target ID for this game session
      const uniqueTargetId = `rpg-battle-${userId}-${Date.now()}`;

      try {
        // Create user activity record
        const [activity] = await db
          .insert(userActivity)
          .values({
            userId,
            activityType: "RPG_BATTLE",
            targetId: uniqueTargetId,
            completed: true,
            timer: 0, // Turn-based, so time might not be relevant or can be added later
            details: {
              xp,
              accuracy,
              totalAttempts,
              totalCorrect,
              turnsTaken,
              heroId,
              enemyId,
              outcome,
              gameSession: uniqueTargetId,
            },
          })
          .returning();

        const xpEarned = Math.floor(xp);

        // Create XP log entry if XP was earned
        if (xpEarned > 0) {
          await db.insert(xpLogs).values({
            userId,
            xpEarned,
            activityId: activity.id,
            activityType: "RPG_BATTLE",
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
            // Store enemy-specific ranking using enemyId as difficulty
            const difficulty = enemyId || "normal";

            await db
              .insert(gameRankings)
              .values({
                userId,
                gameType: "RPG_BATTLE",
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
          }
        }

        return NextResponse.json({
          message: "Game completed successfully",
          xpEarned,
          activityId: activity.id,
          status: 200,
        });
      } catch (error) {
        console.error("Error logging rpg battle activity:", error);
        return NextResponse.json(
          {
            error: "Failed to log activity",
            message: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 },
        );
      }
    } catch (error) {
      console.error("Error completing rpg battle game:", error);
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

      // 3. Fetch rankings from GameRanking table, grouped by enemy (difficulty field)
      const rankingConditions = [eq(gameRankings.gameType, "RPG_BATTLE")];
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

      type RankingEntry = {
        userId: string;
        name: string;
        image: string | null;
        xp: number;
      };

      // Group rankings by enemy ID (stored in difficulty field)
      const sortedRankings: Record<string, RankingEntry[]> = {};

      rankingRows.forEach((rank) => {
        const enemyId = rank.difficulty; // difficulty field stores enemyId

        if (!sortedRankings[enemyId]) {
          sortedRankings[enemyId] = [];
        }

        if (sortedRankings[enemyId].length < 10) {
          sortedRankings[enemyId].push({
            userId: rank.userId,
            name: rank.userName || "Unknown Hero",
            image: rank.userImage,
            xp: rank.totalXp,
          });
        }
      });

      return NextResponse.json({ rankings: sortedRankings });
    } catch (error) {
      console.error("Error fetching rpg battle rankings:", error);
      return NextResponse.json(
        {
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  }

  static async getVocabulary(req: ExtendedNextRequest) {
    try {
      const userId = req.session?.user?.id;

      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Fetch user's vocabulary words
      const vocabularies = await db
        .select()
        .from(userWordRecords)
        .where(
          and(
            eq(userWordRecords.userId, userId),
            eq(userWordRecords.saveToFlashcard, true),
          ),
        )
        .orderBy(asc(userWordRecords.due), desc(userWordRecords.createdAt))
        .limit(50);

      if (vocabularies.length === 0) {
        return NextResponse.json({
          message:
            "No vocabulary found. Please save some vocabulary words first.",
          vocabulary: [],
          status: 200,
        });
      }

      const gameVocabulary = vocabularies
        .map((vocab) => {
          const wordData = vocab.word as any;

          const term = wordData.vocabulary || "";
          let translation = "";
          if (wordData.definition) {
            translation =
              wordData.definition.th ||
              wordData.definition.en ||
              wordData.definition.cn ||
              wordData.definition.tw ||
              wordData.definition.vi ||
              "";
          }

          // In RPG battle, we select based on 'power' as well, but that's handled client-side
          // by random assignment if not present. The game store expects 'term' and 'translation'.
          return {
            term,
            translation,
          };
        })
        .filter((item) => item.term && item.translation);

      if (gameVocabulary.length < 5) {
        // Lower threshold than Dragon Flight maybe?
        return NextResponse.json({
          message: `You need at least 5 vocabulary words to play. You currently have ${gameVocabulary.length}.`,
          vocabulary: gameVocabulary,
          status: 200,
        });
      }

      return NextResponse.json({
        message: "Vocabulary retrieved successfully",
        vocabulary: gameVocabulary,
        status: 200,
      });
    } catch (error) {
      console.error("Error fetching vocabulary for rpg battle:", error);
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
