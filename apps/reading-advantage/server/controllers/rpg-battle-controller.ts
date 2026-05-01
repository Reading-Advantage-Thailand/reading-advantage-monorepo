import { prisma } from "@/lib/prisma";
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
        const activity = await prisma.userActivity.create({
          data: {
            userId: userId,
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
          },
        });

        const xpEarned = Math.floor(xp);

        // Create XP log entry if XP was earned
        if (xpEarned > 0) {
          await prisma.xPLog.create({
            data: {
              userId: userId,
              xpEarned: xpEarned,
              activityId: activity.id,
              activityType: "RPG_BATTLE",
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

            // Update Game Ranking
            // Store enemy-specific ranking using enemyId as difficulty
            const difficulty = enemyId || "normal";

            await prisma.gameRanking.upsert({
              where: {
                userId_gameType_difficulty: {
                  userId: userId,
                  gameType: "RPG_BATTLE",
                  difficulty: difficulty,
                },
              },
              update: {
                totalXp: {
                  increment: xpEarned,
                },
              },
              create: {
                userId: userId,
                gameType: "RPG_BATTLE",
                difficulty: difficulty,
                totalXp: xpEarned,
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
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { licenseId: true, schoolId: true },
      });

      if (!currentUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // 3. Fetch rankings from GameRanking table, grouped by enemy (difficulty field)
      const gameRankings = await prisma.gameRanking.findMany({
        where: {
          gameType: "RPG_BATTLE",
          user: {
            licenseId: currentUser.licenseId || undefined,
            schoolId: !currentUser.licenseId ? currentUser.schoolId : undefined,
          },
        },
        include: {
          user: {
            select: {
              name: true,
              image: true,
            },
          },
        },
        orderBy: {
          totalXp: "desc",
        },
      });

      type RankingEntry = {
        userId: string;
        name: string;
        image: string | null;
        xp: number;
      };

      // Group rankings by enemy ID (stored in difficulty field)
      const sortedRankings: Record<string, RankingEntry[]> = {};

      gameRankings.forEach((rank) => {
        const enemyId = rank.difficulty; // difficulty field stores enemyId

        if (!sortedRankings[enemyId]) {
          sortedRankings[enemyId] = [];
        }

        if (sortedRankings[enemyId].length < 10) {
          sortedRankings[enemyId].push({
            userId: rank.userId,
            name: rank.user.name || "Unknown Hero",
            image: rank.user.image,
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
      const vocabularies = await prisma.userWordRecord.findMany({
        where: {
          userId: userId,
          saveToFlashcard: true,
        },
        orderBy: [{ due: "asc" }, { createdAt: "desc" }],
        take: 50,
      });

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
