import { handleStudentLogout } from "@/lib/auth/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Logs the current student out through the shared first-party auth service.
 * @param request The request containing the current session cookie.
 * @returns A response that invalidates and clears the session.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    return await handleStudentLogout(request);
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      event: "advantage_games_logout_error",
      errorType: error instanceof Error ? error.name : "UnknownError",
    }));
    return NextResponse.json(
      { message: "Logout is temporarily unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store, private" } },
    );
  }
}
