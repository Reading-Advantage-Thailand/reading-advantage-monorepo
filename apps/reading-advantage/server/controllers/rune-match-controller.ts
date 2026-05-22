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

export class RuneMatchController {
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
      } = body;

      // Debug log for XP calculation
      console.log("RuneMatch Complete:", {
        score,
        correctAnswers,
        totalAttempts,
        accuracy,
        difficulty,
      });

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

      // Use score as XP earned (fixed reward per monster)
      // If score is not provided or 0, fallback to calculation or 0
      const xpEarned = score || Math.floor(correctAnswers * (accuracy / 100)); // Fallback just in case

      console.log("XP Calculation:", {
        score,
        xpEarned,
      });

      // Create unique target ID for this game session
      const uniqueTargetId = `rune-match-${userId}-${Date.now()}`;

      try {
        // Create user activity record
        const [activity] = await db
          .insert(userActivity)
          .values({
            userId,
            activityType: "RUNE_MATCH",
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
          })
          .returning();

        // Create XP log entry if XP was earned
        if (xpEarned > 0) {
          await db.insert(xpLogs).values({
            userId,
            xpEarned,
            activityId: activity.id,
            activityType: "RUNE_MATCH",
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
          }
        }

        // Always update Game Ranking (even if xpEarned is 0)
        await db
          .insert(gameRankings)
          .values({
            userId,
            gameType: "RUNE_MATCH",
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

        return NextResponse.json({
          message: "Game completed successfully",
          xpEarned,
          activityId: activity.id,
          status: 200,
        });
      } catch (error) {
        console.error("Error logging rune match activity:", error);
        return NextResponse.json(
          {
            error: "Failed to log activity",
            message: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 },
        );
      }
    } catch (error) {
      console.error("Error completing rune match game:", error);
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
          return {
            term,
            translation,
          };
        })
        .filter((item) => item.term && item.translation);

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
      console.error("Error fetching vocabulary for rune match:", error);
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
      const { searchParams } = new URL(req.url);
      const difficulty = searchParams.get("difficulty");

      const rankingConditions = [eq(gameRankings.gameType, "RUNE_MATCH")];
      if (difficulty) {
        rankingConditions.push(eq(gameRankings.difficulty, difficulty));
      }
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
        .orderBy(desc(gameRankings.totalXp))
        .limit(50);

      // 3. Transform to simple ranking list
      // Since Rune Match might not separate by difficulty strictly in UI yet, we just return overall tops
      // But if we want to group later, we can. For now, simple list.

      const rankings = rankingRows.map((rank) => ({
        userId: rank.userId,
        name: rank.userName || "Unknown Adventurer",
        image: rank.userImage,
        xp: rank.totalXp,
        difficulty: rank.difficulty,
      }));

      return NextResponse.json({ rankings });
    } catch (error) {
      console.error("Error fetching rune match rankings:", error);
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
