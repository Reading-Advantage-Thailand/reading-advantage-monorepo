import { NextRequest, NextResponse } from "next/server";
import { validateSession, SESSION_COOKIE_NAME } from "@reading-advantage/auth";
import { db } from "@reading-advantage/db";
import { markTheoryLessonComplete } from "@reading-advantage/domain/sales";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const session = await validateSession(db, sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user;
    const tenant = { schoolId: user.schoolId };

    const body = await request.json();
    const { lessonId } = body;
    if (!lessonId) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    await markTheoryLessonComplete({ db: db as never, user, tenant }, { lessonId });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark complete error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}