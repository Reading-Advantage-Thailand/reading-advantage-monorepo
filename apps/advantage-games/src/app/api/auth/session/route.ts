import { handleStudentSession } from "@/lib/auth/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Resolves the current student session through the shared auth service.
 * @param request The request containing an optional session cookie.
 * @returns The current student session or a null session.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    return await handleStudentSession(request);
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      event: "advantage_games_session_error",
      errorType: error instanceof Error ? error.name : "UnknownError",
    }));
    return NextResponse.json(
      { session: null },
      { headers: { "Cache-Control": "no-store, private" } },
    );
  }
}
