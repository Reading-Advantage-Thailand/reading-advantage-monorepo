import { handleLogin } from "@reading-advantage/api/routes/auth";
import {
  deleteSession,
  SESSION_COOKIE_NAME,
} from "@reading-advantage/auth";
import { db } from "@reading-advantage/db";
import { resolveLegacySalesCompanyPrincipal } from "@reading-advantage/domain";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isLegacySalesAuthEnabled } from "@/lib/auth-mode";

const sourceLoginSchema = z.object({
  success: z.literal(true),
  user: z.object({ id: z.string().uuid() }).passthrough(),
});

/**
 * Clears a newly issued legacy session after Sales authorization is denied.
 * @returns A forbidden response with the legacy cookie expired.
 */
function deniedLegacyResponse(): NextResponse {
  const response = NextResponse.json(
    { message: "Sales access is not assigned" },
    { status: 403 },
  );
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}

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

  let issuedToken: string | undefined;
  try {
    const sourceResponse = await handleLogin(request);
    if (!sourceResponse.ok) return sourceResponse;

    const sourceLogin = sourceLoginSchema.parse(
      await sourceResponse.clone().json(),
    );
    issuedToken = sourceResponse.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!issuedToken) {
      throw new Error("Legacy login did not issue a session cookie.");
    }

    const principal = await resolveLegacySalesCompanyPrincipal(
      db,
      sourceLogin.user.id,
    );
    if (!principal) {
      await deleteSession(db, issuedToken);
      return deniedLegacyResponse();
    }

    const response = NextResponse.json({
      success: true,
      user: principal.user,
    });
    response.cookies.set(SESSION_COOKIE_NAME, issuedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });
    return response;
  } catch (error) {
    if (issuedToken) {
      await deleteSession(db, issuedToken).catch(() => undefined);
    }
    console.error(
      JSON.stringify({
        level: "error",
        event: "sales_legacy_login_error",
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
