import { randomBytes } from "node:crypto";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import { users, accounts } from "@reading-advantage/db/schema";
import {
  verifyPassword,
  hashPassword,
  PASSWORD_MAX_LENGTH,
  createSession,
  checkRateLimit,
  recordFailure,
  resetLimit,
  SESSION_COOKIE_NAME,
  rehashOnLogin,
  adoptLegacyPassword,
  recordAuditEvent,
  studentSessionOptions,
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

let dummyHashPromise: Promise<string> | undefined;

/**
 * Returns a valid Argon2id hash of random bytes, built once and cached.
 * Login verifies against it for unknown users so that timing matches a real verify.
 * @returns The cached dummy hash, made with the production Argon2id parameters.
 */
export function getDummyHash(): Promise<string> {
  dummyHashPromise ??= hashPassword(randomBytes(32).toString("hex")).catch((err) => {
    dummyHashPromise = undefined;
    throw err;
  });
  return dummyHashPromise;
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  path: "/",
};

const loginSchema = z.object({
  username: z.string().min(1).max(100),
  // Login keeps min(1) so legacy passwords shorter than the set-password minimum still work.
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});

/** Options for `createLoginHandler`. */
export interface LoginHandlerOptions {
  /**
   * When true, a user with no credential password may log in with the legacy
   * `users.password` hash, which is then adopted into the credential account.
   * Only Primary Advantage enables this. The default is false.
   */
  legacyUsersPasswordFallback?: boolean;
  /**
   * When true, a STUDENT session ends at the end of the school day (Asia/Bangkok), after
   * 30 minutes idle, and when the student signs in on another device (FR-9).
   * Other roles keep the 7-day session. Only Primary Advantage enables this. The default is false.
   */
  studentSessionPolicy?: boolean;
  /**
   * When true, a correct temporary password (`accounts.temporary_password_issued_at` set) gives
   * no session: the response is 403 with `code: PASSWORD_CHANGE_REQUIRED`, and the user sets a new
   * password through `createTemporaryPasswordChangeHandler` first (Primary cutover, FR-5).
   * Only Primary Advantage enables this. The default is false.
   */
  temporaryPasswordChange?: boolean;
}

/** The login response code for a correct temporary password that must be changed first. */
export const PASSWORD_CHANGE_REQUIRED = "PASSWORD_CHANGE_REQUIRED";

/**
 * Handles user login with username/password authentication.
 * Implements rate limiting and creates a session on success.
 * The legacy `users.password` fallback is off.
 *
 * @param request - The Next.js request object containing username and password in body
 * @returns NextResponse with user data and session cookie on success
 */
export function handleLogin(request: NextRequest) {
  return loginWithOptions(request, {});
}

/**
 * Builds a login handler with the given options.
 * @param options - Login options, such as the opt-in legacy password fallback.
 * @returns A route handler with the same behavior as `handleLogin` plus the options.
 */
export function createLoginHandler(options: LoginHandlerOptions) {
  return (request: NextRequest) => loginWithOptions(request, options);
}

/** Shared login implementation behind `handleLogin` and `createLoginHandler`. */
async function loginWithOptions(request: NextRequest, options: LoginHandlerOptions) {
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
    let user: { id: string; username: string; name: string | null; role: Role; schoolId: string | null; password?: string | null } | undefined;
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
      await verifyPassword(password, await getDummyHash());
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
    let account: { password: string | null; temporaryPasswordIssuedAt?: Date | null } | undefined;
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

    // Legacy Primary Advantage rows keep the hash on users.password only.
    // Fall back to it when no credential account holds a password.
    let storedHash: string | null = account?.password ?? null;
    let adoptLegacyHash = false;
    if (!storedHash && options.legacyUsersPasswordFallback && user.password) {
      storedHash = user.password;
      adoptLegacyHash = true;
    }

    // FR-4: account-not-found or no-password timing fix
    if (!storedHash) {
      await verifyPassword(password, await getDummyHash());
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
      valid = await verifyPassword(password, storedHash);
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

    // A temporary password opens no session: the user sets a new password first (FR-5).
    if (options.temporaryPasswordChange && !adoptLegacyHash && account?.temporaryPasswordIssuedAt) {
      await resetLimit(lowerUsername, ...(clientIp ? [clientIp] : []));
      return NextResponse.json(
        { message: "Set a new password to continue", code: PASSWORD_CHANGE_REQUIRED },
        { status: 403 },
      );
    }

    // One-shot bcrypt → Argon2id migration (non-blocking)
    try {
      if (adoptLegacyHash) {
        // False means the credential row got a password in the meantime: the legacy hash is stale.
        if (!(await adoptLegacyPassword(db, user.id, password, storedHash))) {
          await recordFailure(lowerUsername, ...(clientIp ? [clientIp] : []));
          return NextResponse.json(
            {
              message: "Invalid username or password",
              ...(rateCheck.captchaRequired ? { captchaRequired: true } : {}),
            },
            { status: 401 }
          );
        }
      } else {
        await rehashOnLogin(db, user.id, password, storedHash);
      }
    } catch (rehashErr) {
      // Log but don't block login — user can retry on next login
      console.warn("Password rehash failed (non-blocking):", rehashErr instanceof Error ? rehashErr.message : "Unknown");
    }

    // Success — create session
    await resetLimit(lowerUsername, ...(clientIp ? [clientIp] : []));
    const studentPolicy =
      options.studentSessionPolicy && user.role === "STUDENT" ? studentSessionOptions() : undefined;
    const session = await createSession(db, user.id, {
      ipAddress: clientIp,
      userAgent: request.headers.get("user-agent") ?? undefined,
      ...studentPolicy,
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

    response.cookies.set(
      SESSION_COOKIE_NAME,
      session.token,
      studentPolicy
        ? { httpOnly: true, secure: COOKIE_OPTIONS.secure, sameSite: "lax", path: "/", expires: studentPolicy.expiresAt }
        : COOKIE_OPTIONS,
    );
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
