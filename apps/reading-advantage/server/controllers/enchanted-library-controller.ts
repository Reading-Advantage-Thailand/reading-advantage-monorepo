import { db, and, asc, count, desc, eq, sql } from "@reading-advantage/db";
import {
  gameRankings,
  userActivity,
  users,
  userWordRecords,
  xpLogs,
} from "@reading-advantage/db/schema";
import type { ExtendedNextRequest } from "@/server/controllers/auth-controller";
import { NextResponse } from "next/server";
import { ActivityType, GameType } from "@/lib/enums";

export class EnchantedLibraryController {
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

      // Difficulty multipliers for XP calculation
      const difficultyMultipliers: Record<string, number> = {
        easy: 1.0,
        normal: 1.5,
        hard: 2.0,
        extreme: 3.0,
      };

      const multiplier = difficultyMultipliers[difficulty] || 1.5;

      // Calculate XP: correctAnswers * accuracy * difficulty multiplier
      const xpEarned = Math.floor(correctAnswers * accuracy * multiplier);

      // Create unique target ID for this game session
      const uniqueTargetId = `enchanted-library-${userId}-${Date.now()}`;

      try {
        // Create user activity record
        const [activity] = await db
          .insert(userActivity)
          .values({
            userId,
            activityType: ActivityType.ENCHANTED_LIBRARY,
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
            activityType: ActivityType.ENCHANTED_LIBRARY,
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
                  gameType: GameType.ENCHANTED_LIBRARY,
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
        console.error("Error logging enchanted library activity:", error);
        return NextResponse.json(
          {
            error: "Failed to log activity",
            message: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 },
        );
      }
    } catch (error) {
      console.error("Error completing enchanted library game:", error);
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
      const rankingConditions = [eq(gameRankings.gameType, GameType.ENCHANTED_LIBRARY)];
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
              name: rank.userName || "Unknown Wizard",
              image: rank.userImage,
              xp: rank.totalXp,
            });
          }
        }
      });

      return NextResponse.json({ rankings: sortedRankings });
    } catch (error) {
      console.error("Error fetching enchanted library rankings:", error);
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
      const records = await db
        .select()
        .from(userWordRecords)
        .where(
          and(
            eq(userWordRecords.userId, userId),
            eq(userWordRecords.saveToFlashcard, true),
          ),
        )
        .orderBy(asc(userWordRecords.due), asc(userWordRecords.stability))
        .limit(30); // Get up to 30 words (enough for a game session)

      if (records.length === 0) {
        // Check if user has ANY word records at all
        const [{ value: totalRecords } = { value: 0 }] = await db
          .select({ value: count() })
          .from(userWordRecords)
          .where(eq(userWordRecords.userId, userId));

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
      console.error("Error fetching vocabulary for enchanted library:", error);
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
