import { handleLogin } from "@reading-advantage/api/routes/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isLegacySalesAuthEnabled } from "@/lib/auth-mode";

/**
 * Uses first-party credential login only for the explicit rollback mode.
 * @param request Browser credential login request.
 * @returns Legacy login response or the Accounts sign-in redirect contract.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isLegacySalesAuthEnabled()) {
    return NextResponse.json(
      {
        message: "Sign in through Accounts",
        signInUrl: "/api/auth/company/start",
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
        event: "sales_legacy_login_error",
        detail: error instanceof Error ? error.message : String(error),
      }),
    );
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
