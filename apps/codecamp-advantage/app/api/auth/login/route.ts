import { handleLogin } from "@reading-advantage/api/routes/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isLegacyCodecampAuthEnabled } from "@/lib/auth-mode";

/**
 * Uses product-local credential login only for the explicit rollback mode.
 * @param request Browser credential login request.
 * @returns Legacy login response or the Accounts handoff contract.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isLegacyCodecampAuthEnabled()) {
    return NextResponse.json(
      {
        message: "Continue with Accounts.",
        authorizationUrl: "/api/auth/company/start",
      },
      { status: 409 },
    );
  }

  try {
    return await handleLogin(request);
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "codecamp_legacy_login_error",
        requestId: request.headers.get("x-request-id") ?? null,
        errorName: error instanceof Error ? error.name : "UnknownError",
      }),
    );
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
