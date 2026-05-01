import { NextRequest, NextResponse } from "next/server";
import {
  fetchClassrooms,
  createClassroomController,
} from "@/server/controllers/classroomController";
import { currentUser } from "@/lib/session";

// GET /api/classroom - Get all classrooms for a teacher
export async function GET() {
  return await fetchClassrooms();
}

// POST /api/classroom - Create a new classroom
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, grade, classCode } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Classroom name is required" },
        { status: 400 },
      );
    }

    const result = await createClassroomController(
      name,
      user.id,
      grade,
      classCode,
      user.role,
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "FAILED_CREATE") {
        return NextResponse.json(
          { error: "Failed to create classroom" },
          { status: 400 },
        );
      }
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
