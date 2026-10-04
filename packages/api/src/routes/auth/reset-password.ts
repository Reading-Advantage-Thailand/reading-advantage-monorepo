import { z } from "zod";
import { and, eq, type SQL } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import { users, accounts, sessions } from "@reading-advantage/db/schema";
import {
  hashPassword,
  requireRole,
  revokeAllUserSessions,
  recordAuditEvent,
  AuthError,
} from "@reading-advantage/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const resetPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

/** The identity facts a reset decision reads about one account. */
export interface ResetPrincipal {
  id: string;
  role: string;
  schoolId: string | null;
}

/** Options for `createResetPasswordHandler`. */
export interface ResetPasswordHandlerOptions {
  /**
   * Replaces the built-in role matrix when set. It receives the session actor and the
   * target row and returns true to allow the reset. The handler applies no school
   * filter of its own, so this function owns the whole decision. The default is unset.
   */
  authorizeTarget?: (actor: ResetPrincipal, target: ResetPrincipal) => boolean | Promise<boolean>;
}

/**
 * Handles password reset requests by TEACHER/ADMIN.
 * TEACHER can reset STUDENT in their own school.
 * ADMIN can reset STUDENT or TEACHER (not ADMIN).
 * @param request - The incoming request with userId and newPassword
 * @returns Response with success or error status
 */
export function handleResetPassword(request: NextRequest): Promise<Response> {
  return resetWithOptions(request, {});
}

/**
 * Builds a reset handler with a caller-supplied target authorization.
 * Primary Advantage uses it to enforce school scope and effective rank.
 * @param options - Reset options, such as `authorizeTarget`.
 * @returns A route handler with the same flow as `handleResetPassword` and the supplied decision.
 */
export function createResetPasswordHandler(options: ResetPasswordHandlerOptions) {
  return (request: NextRequest): Promise<Response> => resetWithOptions(request, options);
}

/** Shared reset implementation behind `handleResetPassword` and `createResetPasswordHandler`. */
async function resetWithOptions(
  request: NextRequest,
  options: ResetPasswordHandlerOptions,
): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input" }, { status: 400 });
    }

    const { userId, newPassword } = parsed.data;

    // Single auth+role gate — requireRole calls requireAuth internally
    const cookie = request.cookies.get("session_token")?.value;
    let session;
    try {
      session = await requireRole(db, cookie, "TEACHER");
    } catch (err) {
      if (err instanceof AuthError && err.code === "UNAUTHORIZED") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const actor = session.user;
    if (actor.role !== "TEACHER" && actor.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Load target user — scope by school for TEACHER actors.
    // ADMIN bypasses school scoping per the authorization matrix.
    const whereParts: SQL[] = [eq(users.id, userId)];
    if (!options.authorizeTarget && actor.role === "TEACHER" && actor.schoolId) {
      whereParts.push(eq(users.schoolId, actor.schoolId));
    }

    const [target] = await db
      .select()
      .from(users)
      .where(whereParts.length === 1 ? whereParts[0] : and(...whereParts))
      .limit(1);

    if (!target) {
      // authorizeTarget callers get the same answer as a refusal, so an id never reveals existence.
      return options.authorizeTarget
        ? NextResponse.json({ message: "Forbidden" }, { status: 403 })
        : NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (options.authorizeTarget) {
      const allowed = await options.authorizeTarget(
        { id: actor.id, role: actor.role, schoolId: actor.schoolId ?? null },
        { id: target.id, role: target.role, schoolId: target.schoolId ?? null },
      );
      if (!allowed) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
    }

    // Authorization matrix — check target role and school
    if (!options.authorizeTarget && actor.role === "TEACHER") {
      if (target.role !== "STUDENT") {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
      if (actor.schoolId !== target.schoolId) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
    }
    if (!options.authorizeTarget && actor.role === "ADMIN") {
      if (target.role !== "STUDENT" && target.role !== "TEACHER") {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
    }

    // Verify credential account exists before update
    const [credAccount] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(
        and(eq(accounts.userId, userId), eq(accounts.providerId, "credential"))
      )
      .limit(1);

    if (!credAccount) {
      return NextResponse.json(
        { message: "Target user has no credential account" },
        { status: 400 }
      );
    }

    // Hash new password and update credential account
    const hashedPassword = await hashPassword(newPassword);
    const writeAccount = (client: Pick<typeof db, "update">) =>
      client
        .update(accounts)
        .set({ password: hashedPassword, updatedAt: new Date() })
        .where(
          and(eq(accounts.userId, userId), eq(accounts.providerId, "credential"))
        );

    if (options.authorizeTarget) {
      // Atomic: a failed revocation rolls back the new password.
      await db.transaction(async (tx) => {
        await writeAccount(tx);
        await tx.delete(sessions).where(eq(sessions.userId, userId));
      });
    } else {
      await writeAccount(db);
      // Revoke all sessions for the target user
      await revokeAllUserSessions(db, userId);
    }

    // FR-9: audit event
    const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? null;
    const ua = request.headers.get("user-agent") ?? null;
    recordAuditEvent(
      { actorUserId: actor.id, actorRole: actor.role, ipAddress: ip, userAgent: ua },
      { action: "auth:password_reset", targetType: "user", targetId: userId }
    ).catch((err) => {
      console.error("Audit event auth:password_reset failed:", err instanceof Error ? err.message : "Unknown");
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
