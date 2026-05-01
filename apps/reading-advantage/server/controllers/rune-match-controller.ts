import { prisma } from "@/lib/prisma";
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
        const activity = await prisma.userActivity.create({
          data: {
            userId: userId,
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
          },
        });

        // Create XP log entry if XP was earned
        if (xpEarned > 0) {
          await prisma.xPLog.create({
            data: {
              userId: userId,
              xpEarned: xpEarned,
              activityId: activity.id,
              activityType: "RUNE_MATCH",
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
          }
        }

        // Always update Game Ranking (even if xpEarned is 0)
        await prisma.gameRanking.upsert({
          where: {
            userId_gameType_difficulty: {
              userId: userId,
              gameType: "RUNE_MATCH",
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
            gameType: "RUNE_MATCH",
            difficulty: difficulty,
            totalXp: xpEarned,
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
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { licenseId: true, schoolId: true },
      });

      if (!currentUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // 2. Fetch rankings from GameRanking table
      const { searchParams } = new URL(req.url);
      const difficulty = searchParams.get("difficulty");

      const gameRankings = await prisma.gameRanking.findMany({
        where: {
          gameType: "RUNE_MATCH",
          difficulty: difficulty || undefined, // Filter by difficulty if provided
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
        take: 50,
      });

      // 3. Transform to simple ranking list
      // Since Rune Match might not separate by difficulty strictly in UI yet, we just return overall tops
      // But if we want to group later, we can. For now, simple list.

      const rankings = gameRankings.map((rank) => ({
        userId: rank.userId,
        name: rank.user.name || "Unknown Adventurer",
        image: rank.user.image,
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
