import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { db, eq } from "@reading-advantage/db";
import { userSentenceRecords } from "@reading-advantage/db/schema";

export async function GET(_req: NextRequest) {
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
    const rows = await db
      .select({ id: userSentenceRecords.id })
      .from(userSentenceRecords)
      .where(eq(userSentenceRecords.userId, user.id))
      .limit(1);

    if (rows.length === 0) {
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
