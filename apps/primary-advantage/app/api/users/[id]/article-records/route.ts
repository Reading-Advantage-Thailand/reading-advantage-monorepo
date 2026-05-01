import { NextRequest, NextResponse } from "next/server";
import { fetchUserActivity } from "@/server/controllers/userController";
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
    const data = await fetchUserActivity(id);

    if (!data) {
      return NextResponse.json(
        { error: "User activity not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching user activity:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
