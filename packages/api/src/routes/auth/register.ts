import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import { users, accounts, schools } from "@reading-advantage/db/schema";
import {
  hashPassword,
  createSession,
  SESSION_COOKIE_NAME,
} from "@reading-advantage/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60,
  path: "/",
};

const registerSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(200),
  schoolId: z.string().uuid(),
});

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

    // Create session
    const session = await createSession(db, userId);

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
    console.error("Register error:", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
