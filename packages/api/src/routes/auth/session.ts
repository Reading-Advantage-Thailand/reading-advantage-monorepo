import { db } from "@reading-advantage/db";
import { validateSession, SESSION_COOKIE_NAME } from "@reading-advantage/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function handleSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ session: null });
  }

  const session = await validateSession(db, token);

  if (!session) {
    return NextResponse.json({ session: null });
  }

  // Return session without sensitive fields
  return NextResponse.json({
    session: {
      user: {
        id: session.user.id,
        username: session.user.username,
        name: session.user.name,
        role: session.user.role,
        schoolId: session.user.schoolId,
      },
    },
  });
}
