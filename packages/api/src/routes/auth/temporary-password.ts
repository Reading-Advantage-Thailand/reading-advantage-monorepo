import { z } from "zod";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import { users, accounts } from "@reading-advantage/db/schema";
import {
  verifyPassword,
  hashPassword,
  passwordSchema,
  PASSWORD_MAX_LENGTH,
  checkRateLimit,
  recordFailure,
  resetLimit,
  revokeAllUserSessions,
  recordAuditEvent,
} from "@reading-advantage/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getClientIp } from "./client-ip.js";
import { getDummyHash } from "./login.js";

/**
 * The body of a temporary password change: the sign-in name, the temporary password from the
 * hand-out list, and the new password, which must differ from the temporary one.
 */
export const temporaryPasswordChangeSchema = z
  .object({
    username: z.string().min(1).max(100),
    password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
    newPassword: passwordSchema,
  })
  .refine((body) => body.newPassword !== body.password, { path: ["newPassword"] });

/** The response of a successful change; the client then signs in with the new password. */
export const temporaryPasswordChangeResponseSchema = z.object({ success: z.literal(true) });

const INVALID = { message: "Invalid username or password" } as const;

/**
 * Builds the route handler that replaces a temporary password (Primary cutover, FR-5). It checks
 * the temporary password with the login rate limit, stores the new Argon2id hash, clears
 * `temporary_password_issued_at`, ends every session of the user, and records
 * `auth:password_changed`. It opens no session: the client signs in with the new password.
 * @returns The POST handler.
 */
export function createTemporaryPasswordChangeHandler() {
  return (request: NextRequest) => changeTemporaryPassword(request);
}

/**
 * Replaces a temporary password.
 * @param request The request with the change body.
 * @returns 200 on success; 400 for an invalid body; 401 for a wrong name or password or no
 * pending change; 429 when rate limited; 500 on an unexpected error.
 */
async function changeTemporaryPassword(request: NextRequest): Promise<Response> {
  try {
    const parsed = temporaryPasswordChangeSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { message: "The new password needs 8 to 128 characters and must differ from the temporary password" },
        { status: 400 },
      );
    }
    const { username, password, newPassword } = parsed.data;
    const lowerUsername = username.toLowerCase();
    const clientIp = getClientIp(request);
    const limitKeys = clientIp ? [clientIp] : [];

    const rateCheck = await checkRateLimit(lowerUsername, ...limitKeys);
    if (!rateCheck.allowed) {
      const retryAfter = rateCheck.retriesAfter ?? 60;
      return NextResponse.json(
        { message: `Too many attempts. Try again in ${retryAfter} seconds.` },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }

    const [user] = await db.select().from(users).where(eq(users.username, lowerUsername)).limit(1);
    const [account] = user
      ? await db.select().from(accounts)
        .where(and(eq(accounts.userId, user.id), eq(accounts.providerId, "credential")))
        .limit(1)
      : [];
    const pending = account?.password && account.temporaryPasswordIssuedAt ? account.password : null;
    // The same verify cost for every outcome, as in the login.
    const valid = await verifyPassword(password, pending ?? (await getDummyHash())).catch(() => false);
    if (!user || !pending || !valid) {
      await recordFailure(lowerUsername, ...limitKeys);
      return NextResponse.json(INVALID, { status: 401 });
    }

    const hash = await hashPassword(newPassword);
    const updated = await db
      .update(accounts)
      .set({ password: hash, temporaryPasswordIssuedAt: null, updatedAt: new Date() })
      .where(and(eq(accounts.userId, user.id), eq(accounts.providerId, "credential"), isNotNull(accounts.temporaryPasswordIssuedAt)))
      .returning({ id: accounts.id });
    if (updated.length === 0) return NextResponse.json(INVALID, { status: 401 });

    await revokeAllUserSessions(db, user.id);
    await resetLimit(lowerUsername, ...limitKeys);
    recordAuditEvent(
      { actorUserId: user.id, actorRole: user.role, ipAddress: clientIp ?? null, userAgent: request.headers.get("user-agent") ?? null },
      { action: "auth:password_changed", targetType: "user", targetId: user.id },
    ).catch((err) => {
      console.warn("Audit event auth:password_changed failed:", err instanceof Error ? err.message : "Unknown");
    });
    return NextResponse.json(temporaryPasswordChangeResponseSchema.parse({ success: true }));
  } catch (error) {
    console.error("Temporary password change error:", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
