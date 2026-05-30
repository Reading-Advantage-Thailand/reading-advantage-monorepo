import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import { users, accounts, schools } from "@reading-advantage/db/schema";
import {
  hashPassword,
  createSession,
  SESSION_COOKIE_NAME,
} from "@reading-advantage/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60,
  path: "/",
};

const DEMO_USERS = [
  { id: "student_demo", username: "student_demo", name: "Student Demo", role: "STUDENT" as const },
  { id: "teacher_demo", username: "teacher_demo", name: "Teacher Demo", role: "TEACHER" as const },
  { id: "admin_demo", username: "admin_demo", name: "Admin Demo", role: "ADMIN" as const },
  { id: "system_demo", username: "system_demo", name: "System Demo", role: "SYSTEM" as const },
];

const impersonateSchema = z.object({
  userId: z.string().min(1),
});

/**
 * Handles impersonation of a demo user for development purposes.
 * Only available in non-production environments.
 *
 * @param request - The Next.js request object containing userId in body
 * @returns NextResponse with session cookie set for the impersonated user
 */
export async function handleImpersonate(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { message: "Not found" },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const parsed = impersonateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid input" },
        { status: 400 }
      );
    }

    const demoUser = DEMO_USERS.find((u) => u.id === parsed.data.userId);
    if (!demoUser) {
      return NextResponse.json(
        { message: "Invalid demo user" },
        { status: 400 }
      );
    }

    let [devSchool] = await db
      .select({ id: schools.id })
      .from(schools)
      .where(eq(schools.name, "Development Demo School"))
      .limit(1);

    if (!devSchool) {
      [devSchool] = await db
        .insert(schools)
        .values({
          name: "Development Demo School",
        })
        .returning({ id: schools.id });
    }

    // Check if user exists
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, demoUser.id))
      .limit(1);

    // Auto-create if not found
    if (!user) {
      const hashedPassword = await hashPassword("Password123!");
      const displayUsername = demoUser.username;

      user = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(users)
          .values({
            id: demoUser.id,
            username: demoUser.username,
            displayUsername,
            name: demoUser.name,
            email: `demo_${demoUser.id}@dev.local`,
            role: demoUser.role,
            schoolId: devSchool.id,
          })
          .returning();

        await tx.insert(accounts).values({
          id: `${demoUser.id}_credential`,
          userId: demoUser.id,
          providerId: "credential",
          password: hashedPassword,
        });

        return created;
      });
    }

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
    console.error("Impersonate error:", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
