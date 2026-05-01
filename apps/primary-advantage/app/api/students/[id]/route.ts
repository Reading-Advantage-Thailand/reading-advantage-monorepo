import { NextRequest } from "next/server";
import {
  getStudentByIdController,
  updateStudentController,
  deleteStudentController,
} from "@/server/controllers/studentController";

// GET /api/students/[id] - Get specific student
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await getStudentByIdController(request, { params });
}

// PUT /api/students/[id] - Update student
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await updateStudentController(request, { params });
}

// DELETE /api/students/[id] - Delete student
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await deleteStudentController(request, { params });
}
