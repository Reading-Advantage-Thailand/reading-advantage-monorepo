import { NextRequest } from "next/server";
import {
  getTeacherByIdController,
  updateTeacherController,
  deleteTeacherController,
} from "@/server/controllers/teacherController";

// GET /api/teachers/[id] - Get specific teacher
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await getTeacherByIdController(request, { params });
}

// PUT /api/teachers/[id] - Update teacher
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await updateTeacherController(request, { params });
}

// DELETE /api/teachers/[id] - Delete teacher
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await deleteTeacherController(request, { params });
}
