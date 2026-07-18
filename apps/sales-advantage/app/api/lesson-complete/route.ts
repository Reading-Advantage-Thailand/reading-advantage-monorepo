import { NextRequest, NextResponse } from "next/server";
import { db } from "@reading-advantage/db";
import { markTheoryLessonComplete } from "@reading-advantage/domain/sales";
import { authenticateSalesRequest } from "@/lib/company-oidc";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateSalesRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
