import { handleUpdateUserActivity } from "@/server/controllers/userController";
import { ActivityType } from "@/types/enum";
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { z } from "zod";
import { guardStudentRoute } from "@/lib/student-view";

const activityLogBodySchema = z.object({
  articleId: z.string().min(1),
  data: z.unknown().optional(),
  timer: z.number().min(0).optional(),
  type: z.nativeEnum(ActivityType).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const preview = guardStudentRoute(user, "user_activity_log");
  if (preview) return preview;

  const { id } = await params;
  if (user.id !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = activityLogBodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  await handleUpdateUserActivity({
    activityType: ActivityType.MC_QUESTION,
    data: {
      responses: [],
      progress: [],
      timer: 0,
    },
  });

  return NextResponse.json({ message: "Activity logged successfully" });
}
