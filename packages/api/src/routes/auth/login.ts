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
  rehashOnLogin,
} from "@reading-advantage/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHRzYWx0$uTb0iMnAqN7uKjB8Y3N4v7J8k2L5mQwR9tY1xZ3aBcD";

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

    // Find user by username — wrap DB operations so that connection/query
    // failures surface as 401 (invalid credentials) rather than 500.
    // A 5xx on the auth path leaks infrastructure details and breaks
    // rate-limiting observability (see Phase 2 prod-smoke test).
    let user: { id: string; username: string; name: string | null; role: string; schoolId: string | null } | undefined;
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.username, lowerUsername))
        .limit(1);
      user = result[0];
    } catch (dbErr) {
      console.error("Login DB error (user lookup):", dbErr instanceof Error ? dbErr.message : "Unknown");
      recordFailure(lowerUsername);
      return NextResponse.json(
        { message: "Invalid username or password" },
        { status: 401 }
      );
    }

    if (!user) {
      recordFailure(lowerUsername);
      return NextResponse.json(
        { message: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Find credential account
    let account: { password: string | null } | undefined;
    try {
      const result = await db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.userId, user.id),
            eq(accounts.providerId, "credential")
          )
        )
        .limit(1);
      account = result[0];
    } catch (dbErr) {
      console.error("Login DB error (account lookup):", dbErr instanceof Error ? dbErr.message : "Unknown");
      recordFailure(lowerUsername);
      return NextResponse.json(
        { message: "Invalid username or password" },
        { status: 401 }
      );
    }

    if (!account || !account.password) {
      recordFailure(lowerUsername);
      return NextResponse.json(
        { message: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Verify password
    let valid: boolean;
    try {
      valid = await verifyPassword(password, account.password);
    } catch (verifyErr) {
      console.error("Login verify error:", verifyErr instanceof Error ? verifyErr.message : "Unknown");
      recordFailure(lowerUsername);
      return NextResponse.json(
        { message: "Invalid username or password" },
        { status: 401 }
      );
    }

    if (!valid) {
      recordFailure(lowerUsername);
      return NextResponse.json(
        { message: "Invalid username or password" },
        { status: 401 }
      );
    }

    // One-shot bcrypt → Argon2id migration (non-blocking)
    try {
      await rehashOnLogin(db, user.id, password, account.password);
    } catch (rehashErr) {
      // Log but don't block login — user can retry on next login
      console.warn("Password rehash failed (non-blocking):", rehashErr instanceof Error ? rehashErr.message : "Unknown");
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
