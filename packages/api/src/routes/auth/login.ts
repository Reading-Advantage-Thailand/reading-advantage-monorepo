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
  recordAuditEvent,
  configurePostgresRateLimiter,
  type Role,
} from "@reading-advantage/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { enrichAuthUser } from "./enrich.js";
import { getClientIp } from "./client-ip.js";

// Production rate limiting uses Postgres-backed durable state. The in-memory
// fast-path is dev-only and opt-in via RATE_LIMIT_INMEMORY_FASTPATH=true.
configurePostgresRateLimiter(db);

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

    // Extract client IP once for rate limiting (per-username AND per-IP).
    // getClientIp respects TRUST_PROXY_COUNT so XFF cannot be spoofed from
    // the left when the request passes through known reverse proxies.
    const clientIp = getClientIp(request);

    // Rate limit check
    const rateCheck = await checkRateLimit(
      lowerUsername,
      ...(clientIp ? [clientIp] : []),
    );
    if (!rateCheck.allowed) {
      const retryAfter = rateCheck.retriesAfter ?? 60;
      return NextResponse.json(
        {
          message: `Too many attempts. Try again in ${retryAfter} seconds.`,
          ...(rateCheck.captchaRequired ? { captchaRequired: true } : {}),
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      );
    }

    // Find user by username — wrap DB operations so that connection/query
    // failures surface as 503 (infrastructure) rather than 401 (credential).
    let user: { id: string; username: string; name: string | null; role: Role; schoolId: string | null } | undefined;
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.username, lowerUsername))
        .limit(1);
      user = result[0];
    } catch (dbErr) {
      // FR-5: DB errors return 503, do NOT call recordFailure
      console.error("Login DB error (user lookup):", dbErr instanceof Error ? dbErr.message : "Unknown");
      return NextResponse.json(
        { message: "Service temporarily unavailable" },
        { status: 503 }
      );
    }

    // FR-4: unknown-username timing fix — call verifyPassword with DUMMY_HASH
    if (!user) {
      await verifyPassword(password, DUMMY_HASH);
      await recordFailure(lowerUsername, ...(clientIp ? [clientIp] : []));
      return NextResponse.json(
        {
          message: "Invalid username or password",
          ...(rateCheck.captchaRequired ? { captchaRequired: true } : {}),
        },
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
      // FR-5: DB errors return 503, do NOT call recordFailure
      console.error("Login DB error (account lookup):", dbErr instanceof Error ? dbErr.message : "Unknown");
      return NextResponse.json(
        { message: "Service temporarily unavailable" },
        { status: 503 }
      );
    }

    // FR-4: account-not-found or no-password timing fix
    if (!account || !account.password) {
      await verifyPassword(password, DUMMY_HASH);
      await recordFailure(lowerUsername, ...(clientIp ? [clientIp] : []));
      return NextResponse.json(
        {
          message: "Invalid username or password",
          ...(rateCheck.captchaRequired ? { captchaRequired: true } : {}),
        },
        { status: 401 }
      );
    }

    // Verify password
    let valid: boolean;
    try {
      valid = await verifyPassword(password, account.password);
    } catch (verifyErr) {
      console.error("Login verify error:", verifyErr instanceof Error ? verifyErr.message : "Unknown");
      await recordFailure(lowerUsername, ...(clientIp ? [clientIp] : []));
      return NextResponse.json(
        {
          message: "Invalid username or password",
          ...(rateCheck.captchaRequired ? { captchaRequired: true } : {}),
        },
        { status: 401 }
      );
    }

    if (!valid) {
      // FR-9: emit auth:login_failed audit event
      const ip = clientIp ?? null;
      const ua = request.headers.get("user-agent") ?? null;
      recordAuditEvent(
        { actorUserId: user.id, actorRole: user.role, ipAddress: ip, userAgent: ua },
        { action: "auth:login_failed" }
      ).catch((err) => {
        console.error("Audit event auth:login_failed failed:", err instanceof Error ? err.message : "Unknown");
      });
      await recordFailure(lowerUsername, ...(clientIp ? [clientIp] : []));
      return NextResponse.json(
        {
          message: "Invalid username or password",
          ...(rateCheck.captchaRequired ? { captchaRequired: true } : {}),
        },
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
    await resetLimit(lowerUsername, ...(clientIp ? [clientIp] : []));
    const session = await createSession(db, user.id, {
      ipAddress: clientIp,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    // FR-9: emit auth:login audit event
    const auditIp = clientIp ?? null;
    const auditUa = request.headers.get("user-agent") ?? null;
    recordAuditEvent(
      { actorUserId: user.id, actorRole: user.role, ipAddress: auditIp, userAgent: auditUa },
      { action: "auth:login" }
    ).catch((err) => {
      console.error("Audit event auth:login failed:", err instanceof Error ? err.message : "Unknown");
    });

    // FR-12: return full AuthUser shape
    const enrichedUser = await enrichAuthUser(db, user);

    const response = NextResponse.json({
      success: true,
      user: enrichedUser,
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
