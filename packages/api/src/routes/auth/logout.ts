import { db } from "@reading-advantage/db";
import { deleteSession, SESSION_COOKIE_NAME } from "@reading-advantage/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Handles user logout by deleting the session and clearing the cookie.
 *
 * @param request - The Next.js request object containing the session cookie
 * @returns NextResponse with cleared session cookie
 */
export async function handleLogout(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await deleteSession(db, token);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
