import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import { users, accounts } from "@reading-advantage/db/schema";
import {
  hashPassword,
  requireAuth,
  requireRole,
  revokeAllUserSessions,
  recordAuditEvent,
} from "@reading-advantage/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const resetPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

/**
 * Handles password reset requests by TEACHER/ADMIN.
 * TEACHER can reset STUDENT in their own school.
 * ADMIN can reset STUDENT or TEACHER (not ADMIN).
 * @param request - The incoming request with userId and newPassword
 * @returns Response with success or error status
 */
export async function handleResetPassword(
  request: NextRequest
): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input" }, { status: 400 });
    }

    const { userId, newPassword } = parsed.data;

    // Auth gate
    const cookie = request.cookies.get("session_token")?.value;
    let session;
    try {
      session = await requireAuth(db, cookie);
    } catch {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Role gate
    try {
      session = await requireRole(db, cookie, "TEACHER");
    } catch {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const actor = session.user;

    // Authorization matrix — check actor role BEFORE loading target
    if (actor.role === "STUDENT") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Load target user
    const [target] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!target) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Authorization matrix — check target role and school
    if (actor.role === "TEACHER") {
      if (target.role !== "STUDENT") {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
      if (actor.schoolId !== target.schoolId) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
    }
    if (actor.role === "ADMIN") {
      if (target.role === "ADMIN") {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
    }

    // Hash new password and update credential account
    const hashedPassword = await hashPassword(newPassword);
    await db
      .update(accounts)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(
        and(eq(accounts.userId, userId), eq(accounts.providerId, "credential"))
      )
      .returning();

    // Revoke all sessions for the target user
    await revokeAllUserSessions(db, userId);

    // FR-9: audit event
    const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? null;
    const ua = request.headers.get("user-agent") ?? null;
    recordAuditEvent(
      { actorUserId: actor.id, actorRole: actor.role, ipAddress: ip, userAgent: ua },
      { action: "auth:password_reset", targetType: "user", targetId: userId }
    ).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
