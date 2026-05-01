import { prisma } from "@/lib/prisma";
import type { ExtendedNextRequest } from "@/server/controllers/auth-controller";
import { NextResponse } from "next/server";
import { ActivityType, GameType } from "@prisma/client";

export class CastleDefenseController {
  static async completeGame(req: ExtendedNextRequest) {
    try {
      const userId = req.session?.user?.id;

      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await req.json();
      const {
        score,
        correctAnswers, // In this context, correct words collected
        totalAttempts, // Total words collected (correct + incorrect)
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

      // Calculate XP: correctAnswers * accuracy
      // Castle defense might yield more XP per sentence than word games
      const xpEarned = Math.floor(correctAnswers * accuracy);

      // Create unique target ID for this game session
      const uniqueTargetId = `castle-defense-${userId}-${Date.now()}`;

      try {
        // Create user activity record
        const activity = await prisma.userActivity.create({
          data: {
            userId: userId,
            activityType: ActivityType.CASTLE_DEFENSE,
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
          },
        });

        // Create XP log entry if XP was earned
        if (xpEarned > 0) {
          await prisma.xPLog.create({
            data: {
              userId: userId,
              xpEarned: xpEarned,
              activityId: activity.id,
              activityType: ActivityType.CASTLE_DEFENSE,
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
            // We use upsert to create or update the ranking
            // Note: GameRanking model might need to support CASTLE_DEFENSE in enum if it uses one
            // Assuming GameRanking uses string or same enum
            try {
              await prisma.gameRanking.upsert({
                where: {
                  userId_gameType_difficulty: {
                    userId: userId,
                    gameType: GameType.CASTLE_DEFENSE,
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
                  gameType: GameType.CASTLE_DEFENSE,
                  difficulty: difficulty,
                  totalXp: xpEarned,
                },
              });
            } catch (rankingError) {
              console.warn(
                "Failed to update ranking, but game activity saved.",
                rankingError,
              );
              // Non-critical failure, continue
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
        console.error("Error logging castle defense activity:", error);
        return NextResponse.json(
          {
            error: "Failed to log activity",
            message: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 },
        );
      }
    } catch (error) {
      console.error("Error completing castle defense game:", error);
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

      // 2. Fetch rankings from GameRanking table
      const gameRankings = await prisma.gameRanking.findMany({
        where: {
          gameType: GameType.CASTLE_DEFENSE,
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
              name: rank.user.name || "Unknown Knight",
              image: rank.user.image,
              xp: rank.totalXp,
            });
          }
        }
      });

      return NextResponse.json({ rankings: sortedRankings });
    } catch (error) {
      console.error("Error fetching castle defense rankings:", error);
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
      const records = await prisma.userSentenceRecord.findMany({
        where: {
          userId: userId,
          saveToFlashcard: true,
        },
        orderBy: [
          { due: "asc" }, // Sentences due for review first
          { stability: "asc" }, // Harder sentences
        ],
        take: 30, // Get up to 30 sentences (enough for a long game)
      });

      if (records.length === 0) {
        // No sentences saved to flashcards at all
        return NextResponse.json({
          message: "No sentences found. Please learn some sentences first.",
          warning: "NO_SENTENCES",
          sentences: [],
          status: 200,
        });
      }

      // Transform to the format expected by the game
      // Get user's locale from request headers
      // Transform to the format expected by the game
      // Get user's locale from query param or request headers
      const url = new URL(req.url);
      const queryLocale = url.searchParams.get("locale");
      const acceptLanguage = req.headers.get("accept-language") || "";

      // Use query locale if available, specific handling for Chinese variants
      let locale =
        queryLocale || acceptLanguage.split(",")[0]?.split("-")[0] || "en";

      // Map locale to translation key
      let translationKey = locale;

      // Handle frontend specific locale codes
      if (locale === "cn") translationKey = "zh-CN";
      else if (locale === "tw") translationKey = "zh-TW";
      else if (locale === "zh") {
        // Fallback for generic 'zh' from headers
        const fullLocale = acceptLanguage.split(",")[0] || "";
        translationKey =
          fullLocale.includes("TW") || fullLocale.includes("HK")
            ? "zh-TW"
            : "zh-CN";
      }

      console.log("  final translationKey:", translationKey);

      console.log("  translationKey:", translationKey);

      const gameSentences = records
        .map((record) => {
          let translation = "";
          try {
            // translation field is Json, assume it has structure like { th: "...", "zh-CN": "...", etc. } or is just a string
            const transObj = record.translation as any;
            if (typeof transObj === "string") {
              translation = transObj;
            } else if (transObj && typeof transObj === "object") {
              // Try to get translation in user's language, fallback to Thai, then English, then sentence itself
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
            term: record.sentence, // The English sentence
            translation: translation, // The translation in user's native language
          };
        })
        .filter((item) => item.term && item.translation);

      // Ensure we have at least 5 sentences for a reasonable game loop
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
      console.error("Error fetching sentences for castle defense:", error);
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
