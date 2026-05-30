import { db } from "@reading-advantage/db";
import { validateSession, SESSION_COOKIE_NAME } from "@reading-advantage/auth";
import { users } from "@reading-advantage/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Handles session retrieval and enrichment with additional user fields.
 *
 * @param request - The Next.js request object containing the session cookie
 * @returns NextResponse with enriched session user data or null if not authenticated
 */
export async function handleSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ session: null });
  }

  const session = await validateSession(db, token);

  if (!session) {
    return NextResponse.json({ session: null });
  }

  // Enrich with additional user fields from Drizzle
  const [dbUser] = await db
    .select({
      xp: users.xp,
      level: users.level,
      cefrLevel: users.cefrLevel,
      email: users.email,
      image: users.image,
      schoolId: users.schoolId,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return NextResponse.json({
    session: {
      user: {
        id: session.user.id,
        username: session.user.username,
        name: session.user.name,
        role: session.user.role,
        schoolId: session.user.schoolId,
        xp: dbUser?.xp ?? 0,
        level: dbUser?.level ?? 0,
        cefrLevel: dbUser?.cefrLevel ?? "",
        email: dbUser?.email ?? null,
        image: dbUser?.image ?? null,
      },
    },
  });
}
