import { handleStudentLogin } from "@/lib/auth/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Authenticates a student with the shared first-party auth service.
 * @param request The username/password login request.
 * @returns The structured login response and database session cookie.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    return await handleStudentLogin(request);
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      event: "advantage_games_login_error",
      errorType: error instanceof Error ? error.name : "UnknownError",
    }));
    return NextResponse.json(
      { message: "Authentication is temporarily unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store, private" } },
    );
  }
}
