import { NextRequest, NextResponse } from "next/server";
import { fetchUserReminderReread } from "@/server/controllers/userController";
import { currentUser } from "@/lib/session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only teachers and system users can access other users' data
    if (
      user.role !== "teacher" &&
      user.role !== "system" &&
      user.id !== (await params).id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const result = await fetchUserReminderReread(id);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching user reminder reread:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
