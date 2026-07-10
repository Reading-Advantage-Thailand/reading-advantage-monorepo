import {
  handleLogin,
  handleLogout,
  handleSession,
} from "@reading-advantage/api/routes/auth";
import {
  deleteSession,
  SESSION_COOKIE_NAME,
} from "@reading-advantage/auth";
import { db } from "@reading-advantage/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  sharedLoginSuccessSchema,
  sharedSessionResponseSchema,
} from "./contracts";

const PRIVATE_NO_STORE = "no-store, private";

function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

/**
 * Authenticates a student through the shared username/password handler.
 * @param request The login request received by the app route.
 * @returns The shared login response, or a fail-closed student-role response.
 */
export async function handleStudentLogin(
  request: NextRequest,
): Promise<NextResponse> {
  const response = await handleLogin(request);
  response.headers.set("Cache-Control", PRIVATE_NO_STORE);
  if (!response.ok) {
    return response;
  }

  const parsed = sharedLoginSuccessSchema.safeParse(await response.clone().json());
  if (parsed.success && parsed.data.user.role === "STUDENT") {
    return response;
  }

  const token = response.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await deleteSession(db, token);
  }

  const forbidden = NextResponse.json(
    { message: "A student account is required" },
    { status: 403, headers: { "Cache-Control": PRIVATE_NO_STORE } },
  );
  clearSessionCookie(forbidden);
  return forbidden;
}

/**
 * Invalidates the current database session through the shared auth handler.
 * @param request The logout request containing the session cookie.
 * @returns The shared logout response.
 */
export async function handleStudentLogout(
  request: NextRequest,
): Promise<NextResponse> {
  const response = await handleLogout(request);
  response.headers.set("Cache-Control", PRIVATE_NO_STORE);
  return response;
}

/**
 * Returns only student sessions from the shared session handler.
 * @param request The request containing the optional session cookie.
 * @returns A private session response, with non-student sessions hidden.
 */
export async function handleStudentSession(
  request: NextRequest,
): Promise<NextResponse> {
  const response = await handleSession(request);
  const parsed = sharedSessionResponseSchema.safeParse(await response.clone().json());

  if (
    !response.ok ||
    (parsed.success &&
      (parsed.data.session === null ||
        parsed.data.session.user.role === "STUDENT"))
  ) {
    response.headers.set("Cache-Control", PRIVATE_NO_STORE);
    return response;
  }

  return NextResponse.json(
    { session: null },
    { headers: { "Cache-Control": PRIVATE_NO_STORE } },
  );
}
