import { prisma } from "@/lib/prisma";
import type { ExtendedNextRequest } from "@/server/controllers/auth-controller";
import { NextResponse } from "next/server";
import { ActivityType, GameType } from "@prisma/client";

export class DragonRiderController {
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
        correctAnswers,
        totalAttempts,
        dragonCount,
        difficulty = "normal",
        bossPower,
        victory,
      } = body;

      // Validate required fields
      if (
        xp === undefined ||
        accuracy === undefined ||
        correctAnswers === undefined ||
        totalAttempts === undefined
      ) {
        return NextResponse.json(
          {
            error: "Missing required fields",
            message:
              "xp, accuracy, correctAnswers, and totalAttempts are required",
          },
          { status: 400 },
        );
      }

      // Create unique target ID for this game session
      const uniqueTargetId = `dragon-rider-${userId}-${Date.now()}`;

      try {
        // Create user activity record
        const activity = await prisma.userActivity.create({
          data: {
            userId: userId,
            activityType: ActivityType.DRAGON_RIDER,
            targetId: uniqueTargetId,
            completed: true,
            details: {
              xp,
              accuracy,
              correctAnswers,
              totalAttempts,
              dragonCount,
              difficulty,
              bossPower,
              victory,
              gameSession: uniqueTargetId,
            },
          },
        });

        // Create XP log entry if XP was earned
        if (xp > 0) {
          await prisma.xPLog.create({
            data: {
              userId: userId,
              xpEarned: xp,
              activityId: activity.id,
              activityType: ActivityType.DRAGON_RIDER,
            },
          });

          // Update user's total XP
          const user = await prisma.user.findUnique({
            where: { id: userId },
          });

          if (user) {
            await prisma.user.update({
              where: { id: userId },
              data: { xp: user.xp + xp },
            });

            // Update session if available
            if (req.session?.user) {
              req.session.user.xp = user.xp + xp;
            }

            // Update Game Ranking
            try {
              await prisma.gameRanking.upsert({
                where: {
                  userId_gameType_difficulty: {
                    userId: userId,
                    gameType: GameType.DRAGON_RIDER,
                    difficulty: difficulty,
                  },
                },
                update: {
                  totalXp: {
                    increment: xp,
                  },
                },
                create: {
                  userId: userId,
                  gameType: GameType.DRAGON_RIDER,
                  difficulty: difficulty,
                  totalXp: xp,
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
          xpEarned: xp,
          activityId: activity.id,
          status: 200,
        });
      } catch (error) {
        console.error("Error logging dragon rider activity:", error);
        return NextResponse.json(
          {
            error: "Failed to log activity",
            message: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 },
        );
      }
    } catch (error) {
      console.error("Error completing dragon rider game:", error);
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
          gameType: GameType.DRAGON_RIDER,
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
              name: rank.user.name || "Unknown Rider",
              image: rank.user.image,
              xp: rank.totalXp,
            });
          }
        }
      });

      return NextResponse.json({ rankings: sortedRankings });
    } catch (error) {
      console.error("Error fetching dragon rider rankings:", error);
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

      // Fetch user's word records
      // Prioritize words that are due or low stability
      const records = await prisma.userWordRecord.findMany({
        where: {
          userId: userId,
          saveToFlashcard: true,
        },
        orderBy: [
          { due: "asc" }, // Words due for review first
          { stability: "asc" }, // Harder words
        ],
        take: 30, // Get up to 30 words (enough for a game session)
      });

      if (records.length === 0) {
        // Check if user has ANY word records at all
        const totalRecords = await prisma.userWordRecord.count({
          where: { userId: userId },
        });

        // No words saved to flashcards at all
        return NextResponse.json({
          message: "No vocabulary found. Please learn some words first.",
          warning: "NO_VOCABULARY",
          vocabulary: [],
          status: 200,
        });
      }

      // Get user's locale from query param or request headers
      const url = new URL(req.url);
      const queryLocale = url.searchParams.get("locale");
      const acceptLanguage = req.headers.get("accept-language") || "";

      // Use query locale if available
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

      const gameVocabulary = records
        .map((record) => {
          let translation = "";
          let term = "";
          try {
            // word field is Json with structure: { vocabulary: "word", definition: { th: "...", en: "...", etc. } }
            const wordObj = record.word as any;

            if (typeof wordObj === "string") {
              term = wordObj;
              translation = wordObj; // Fallback
            } else if (wordObj && typeof wordObj === "object") {
              // Get the English term from 'vocabulary' or 'vocabularyy' (handle typo)
              term =
                wordObj.vocabulary ||
                wordObj.vocabularyy ||
                wordObj.word ||
                wordObj.term ||
                "";

              // Get translation from 'definition' object
              const defObj = wordObj.definition;
              if (typeof defObj === "string") {
                translation = defObj;
              } else if (defObj && typeof defObj === "object") {
                // Try to get translation in user's language first, then fallback to th, then en as last resort
                translation =
                  defObj[translationKey] ||
                  defObj.th ||
                  defObj.vi ||
                  defObj["zh-CN"] ||
                  defObj["zh-TW"] ||
                  defObj.en ||
                  term;
              } else {
                // Fallback: try old structure with 'translation' object
                const transObj = wordObj.translation;
                if (typeof transObj === "string") {
                  translation = transObj;
                } else if (transObj && typeof transObj === "object") {
                  translation =
                    transObj[translationKey] ||
                    transObj.th ||
                    transObj.vi ||
                    transObj["zh-CN"] ||
                    transObj["zh-TW"] ||
                    transObj.en ||
                    term;
                }
              }
            }
          } catch (e) {
            console.warn("Failed to parse word for record", record.id, e);
          }

          return {
            term: term, // The English word
            translation: translation, // The translation in user's native language
          };
        })
        .filter((item) => item.term && item.translation);

      // Ensure we have at least 5 words for a reasonable game
      if (gameVocabulary.length < 5) {
        return NextResponse.json({
          message: `You need at least 5 words to play. You currently have ${gameVocabulary.length}.`,
          warning: "INSUFFICIENT_VOCABULARY",
          requiredCount: 5,
          currentCount: gameVocabulary.length,
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
      console.error("Error fetching vocabulary for dragon rider:", error);
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
