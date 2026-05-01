import { handleUpdateUserActivity } from "@/server/controllers/userController";
import { ActivityType } from "@/types/enum";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { articleId, data, timer, type } = await request.json();

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
