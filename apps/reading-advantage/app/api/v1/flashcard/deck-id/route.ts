import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    // Find user's sentence flashcard deck by checking for sentence records
    const sentences = await prisma.userSentenceRecord.findFirst({
      where: {
        userId: user.id,
      },
    });

    if (!sentences) {
      return NextResponse.json({
        success: false,
        error: "No sentence flashcard deck found",
      });
    }

    return NextResponse.json({
      success: true,
      deckId: user.id, // Use user ID as deck ID for now
    });
  } catch (error) {
    console.error("Error getting flashcard deck:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get flashcard deck",
      },
      { status: 500 }
    );
  }
}
