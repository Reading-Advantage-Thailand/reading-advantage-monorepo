import { handleSession } from "@reading-advantage/api/routes/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    return await handleSession(request);
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "session_error",
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    return NextResponse.json({ user: null }, { status: 200 });
  }
}