import { prisma } from "@/lib/prisma";
import type { ExtendedNextRequest } from "@/server/controllers/auth-controller";
import { NextResponse } from "next/server";

export class MagicDefenseController {
  static async completeGame(req: ExtendedNextRequest) {
    try {
      const userId = req.session?.user?.id;

      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await req.json();
      const {
        score,
        correctAnswers,
        totalAttempts,
        accuracy,
        difficulty = "NORMAL", // Default to NORMAL if not provided
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
          { status: 400 }
        );
      }

      // Calculate XP: correctAnswers * accuracy
      const xpEarned = Math.floor(correctAnswers * accuracy);

      // Create unique target ID for this game session
      const uniqueTargetId = `magic-defense-${userId}-${Date.now()}`;

      try {
        // Create user activity record
        const activity = await prisma.userActivity.create({
          data: {
            userId: userId,
            activityType: "MAGIC_DEFENSE",
            targetId: uniqueTargetId,
            completed: true,
            details: {
              score,
              correctAnswers,
              totalAttempts,
              accuracy,
              xpEarned,
              difficulty,
              gameSession: uniqueTargetId,
            },
          },
        });

        // Create XP log entry if XP was earned
        if (xpEarned > 0) {
          await prisma.xPLog.create({
            data: {
              userId: userId,
              xpEarned: xpEarned,
              activityId: activity.id,
              activityType: "MAGIC_DEFENSE",
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
            await prisma.gameRanking.upsert({
              where: {
                userId_gameType_difficulty: {
                  userId: userId,
                  gameType: "MAGIC_DEFENSE",
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
                gameType: "MAGIC_DEFENSE",
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
        console.error("Error logging magic defense activity:", error);
        return NextResponse.json(
          {
            error: "Failed to log activity",
            message: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error("Error completing magic defense game:", error);
      return NextResponse.json(
        {
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
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

      // 2. Fetch rankings from GameRanking table
      const gameRankings = await prisma.gameRanking.findMany({
        where: {
          gameType: "MAGIC_DEFENSE",
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

      gameRankings.forEach((rank) => {
        const difficulty = rank.difficulty;
        if (sortedRankings[difficulty]) {
          // Limit to top 20
          if (sortedRankings[difficulty].length < 20) {
            sortedRankings[difficulty].push({
              userId: rank.userId,
              name: rank.user.name || "Unknown Wizard",
              image: rank.user.image,
              xp: rank.totalXp,
            });
          }
        }
      });

      return NextResponse.json({ rankings: sortedRankings });
    } catch (error) {
      console.error("Error fetching magic defense rankings:", error);
      return NextResponse.json(
        {
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
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
      // Prioritize words that are due for review (spaced repetition)
      const vocabularies = await prisma.userWordRecord.findMany({
        where: {
          userId: userId,
          saveToFlashcard: true,
        },
        orderBy: [
          { due: "asc" }, // Words due for review first
          { createdAt: "desc" }, // Then recent words
        ],
        take: 50, // Get up to 50 words
      });

      if (vocabularies.length === 0) {
        return NextResponse.json({
          message:
            "No vocabulary found. Please save some vocabulary words first.",
          vocabulary: [],
          status: 200,
        });
      }

      // Transform to the format expected by the game
      // VocabularyItem { term: string, translation: string }
      const gameVocabulary = vocabularies
        .map((vocab) => {
          const wordData = vocab.word as any;

          // Extract vocabulary and definition
          const term = wordData.vocabulary || "";

          // Get translation (prefer Thai, fallback to English)
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

          return {
            term,
            translation,
          };
        })
        .filter((item) => item.term && item.translation); // Filter out invalid entries

      // Ensure we have at least 10 words for a good game experience
      if (gameVocabulary.length < 10) {
        return NextResponse.json({
          message: `You need at least 10 vocabulary words to play. You currently have ${gameVocabulary.length}.`,
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
      console.error("Error fetching vocabulary for magic defense:", error);
      return NextResponse.json(
        {
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  }
}
