import { handleResetPassword } from "@reading-advantage/api/routes/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isLegacyCodecampAuthEnabled } from "@/lib/auth-mode";

/**
 * Updates a product-local credential only while explicit legacy mode owns credentials.
 * @param request Authorized legacy password-reset request.
 * @returns Legacy reset result or the Accounts credential-management handoff.
 */
export async function POST(request: NextRequest): Promise<Response> {
  if (!isLegacyCodecampAuthEnabled()) {
    return NextResponse.json(
      {
        message: "Manage credentials through Accounts.",
        accountsUrl: "https://accounts.reading-advantage.com",
      },
      { status: 409 },
    );
  }

  try {
    return await handleResetPassword(request);
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "reset_password_error",
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
