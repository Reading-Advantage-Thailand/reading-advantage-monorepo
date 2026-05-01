import { prisma } from "@/lib/prisma";
import type { ExtendedNextRequest } from "@/server/controllers/auth-controller";
import { NextResponse } from "next/server";

export class WizardZombieController {
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

      console.log("WizardZombie Complete:", {
        score,
        correctAnswers,
        totalAttempts,
        accuracy,
        difficulty,
      });

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

      // XP Calculation: Base 10 per correct answer, plus bonus for survival/score
      // For WizardZombie, score is explicitly calculated in game (10 per correct, -5 per wrong)
      // We'll use the game score directly as XP, but ensure it's at least 0.
      const xpEarned = Math.max(0, score || Math.floor(correctAnswers * 10));

      const uniqueTargetId = `wizard-zombie-${userId}-${Date.now()}`;

      try {
        const activity = await prisma.userActivity.create({
          data: {
            userId: userId,
            activityType: "WIZARD_ZOMBIE",
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

        if (xpEarned > 0) {
          await prisma.xPLog.create({
            data: {
              userId: userId,
              xpEarned: xpEarned,
              activityId: activity.id,
              activityType: "WIZARD_ZOMBIE",
            },
          });

          const user = await prisma.user.findUnique({
            where: { id: userId },
          });

          if (user) {
            await prisma.user.update({
              where: { id: userId },
              data: { xp: user.xp + xpEarned },
            });

            if (req.session?.user) {
              req.session.user.xp = user.xp + xpEarned;
            }
          }
        }

        await prisma.gameRanking.upsert({
          where: {
            userId_gameType_difficulty: {
              userId: userId,
              gameType: "WIZARD_VS_ZOMBIE",
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
            gameType: "WIZARD_VS_ZOMBIE",
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
        console.error("Error logging wizard zombie activity:", error);
        return NextResponse.json(
          {
            error: "Failed to log activity",
            message: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 },
        );
      }
    } catch (error) {
      console.error("Error completing wizard zombie game:", error);
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

      // Wizard Zombie needs a decent amount of words to be fun, but we can support fewer
      if (gameVocabulary.length < 5) {
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
      console.error("Error fetching vocabulary for wizard zombie:", error);
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

      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { licenseId: true, schoolId: true },
      });

      if (!currentUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const { searchParams } = new URL(req.url);
      const difficulty = searchParams.get("difficulty");

      const gameRankings = await prisma.gameRanking.findMany({
        where: {
          gameType: "WIZARD_VS_ZOMBIE",
          difficulty: difficulty || undefined,
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

      const rankings = gameRankings.map((rank) => ({
        userId: rank.userId,
        name: rank.user.name || "Unknown Survivor",
        image: rank.user.image,
        xp: rank.totalXp,
        difficulty: rank.difficulty,
      }));

      return NextResponse.json({ rankings });
    } catch (error) {
      console.error("Error fetching wizard zombie rankings:", error);
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
