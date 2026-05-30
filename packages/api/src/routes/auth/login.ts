import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import { users, accounts } from "@reading-advantage/db/schema";
import {
  verifyPassword,
  createSession,
  checkRateLimit,
  recordFailure,
  resetLimit,
  SESSION_COOKIE_NAME,
} from "@reading-advantage/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  path: "/",
};

const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(128),
});

/**
 * Handles user login with username/password authentication.
 * Implements rate limiting and creates a session on success.
 *
 * @param request - The Next.js request object containing username and password in body
 * @returns NextResponse with user data and session cookie on success
 */
export async function handleLogin(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid input" },
        { status: 400 }
      );
    }

    const { username, password } = parsed.data;
    const lowerUsername = username.toLowerCase();

    // Rate limit check
    const rateCheck = checkRateLimit(lowerUsername);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { message: `Too many attempts. Try again in ${rateCheck.retriesAfter} seconds.` },
        { status: 429 }
      );
    }

    // Find user by username
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, lowerUsername))
      .limit(1);

    if (!user) {
      recordFailure(lowerUsername);
      return NextResponse.json(
        { message: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Find credential account
    const [account] = await db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.userId, user.id),
          eq(accounts.providerId, "credential")
        )
      )
      .limit(1);

    if (!account || !account.password) {
      recordFailure(lowerUsername);
      return NextResponse.json(
        { message: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Verify password
    const valid = await verifyPassword(password, account.password);
    if (!valid) {
      recordFailure(lowerUsername);
      return NextResponse.json(
        { message: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Success — create session
    resetLimit(lowerUsername);
    const session = await createSession(db, user.id);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        schoolId: user.schoolId,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, session.token, COOKIE_OPTIONS);
    return response;
  } catch (error) {
    console.error("Login error:", error instanceof Error ? error.message : "Unknown");
    if (error instanceof Error && "cause" in error) {
      console.error("Login error cause:", error.cause);
    }
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
