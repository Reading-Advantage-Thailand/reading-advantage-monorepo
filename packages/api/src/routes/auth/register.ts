import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import { users, accounts, schools } from "@reading-advantage/db/schema";
import {
  hashPassword,
  requireAuth,
  requireRole,
} from "@reading-advantage/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const registerSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(200),
  schoolId: z.string().uuid(),
});

/**
 * Handles new user registration with username, password, name, and school.
 * FR-6: Gated behind TEACHER/ADMIN session.
 * FR-16: No longer creates a session for the registered user.
 *
 * @param request - The Next.js request object containing registration data in body
 * @returns NextResponse with created user data on success (no session cookie)
 */
export async function handleRegister(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid input" },
        { status: 400 }
      );
    }

    // FR-6: Gate behind TEACHER/ADMIN session
    const cookie = request.cookies.get("session_token")?.value;
    if (!cookie) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const session = await requireAuth(db, cookie);
    await requireRole(db, cookie, "TEACHER");

    const { username, password, name, schoolId } = parsed.data;
    const lowerUsername = username.toLowerCase();

    // Check for existing user
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, lowerUsername))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { message: "Username already taken" },
        { status: 409 }
      );
    }

    const [school] = await db
      .select({ id: schools.id })
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1);

    if (!school) {
      return NextResponse.json(
        { message: "Invalid school" },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const displayUsername = username;
    const userId = crypto.randomUUID();

    const user = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({
          id: userId,
          username: lowerUsername,
          displayUsername,
          name,
          role: "STUDENT",
          schoolId,
        })
        .returning();

      await tx.insert(accounts).values({
        id: `${userId}_credential`,
        userId,
        providerId: "credential",
        password: hashedPassword,
      });

      return created;
    });

    // FR-16: No session creation — return 201 with created user
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        schoolId: user.schoolId,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      const code = (error as { code?: string }).code;
      if (code === "UNAUTHORIZED") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    console.error("Register error:", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
