import { NextRequest, NextResponse } from "next/server";
import {
  getClassroomController,
  updateClassroomController,
  deleteClassroomController,
} from "@/server/controllers/classroomController";
import { currentUser } from "@/lib/session";

// GET /api/classroom/[id] - Get a specific classroom with students
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await getClassroomController(req, { params });
}

// PATCH /api/classroom/[id] - Update a classroom
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await updateClassroomController(req, { params });
}

// DELETE /api/classroom/[id] - Delete a classroom
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const classroomId = (await params).id;

    const result = await deleteClassroomController(
      classroomId,
      user.id,
      user.role,
    );

    if (result && result.success === false) {
      return NextResponse.json(
        { error: result.error || "Failed to delete classroom" },
        { status: 400 },
      );
    }

    return NextResponse.json(result || { success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "FAILED_DELETE") {
        return NextResponse.json(
          { error: "Failed to delete classroom" },
          { status: 400 },
        );
      }
    }
    return NextResponse.json(
      { error: "Failed to delete classroom" },
      { status: 500 },
    );
  }
}
