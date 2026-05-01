import { NextRequest } from "next/server";
import { unenrollStudentController } from "@/server/controllers/classroomController";

// DELETE /api/classroom/[id]/unenroll - Unenroll a student from a classroom
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await unenrollStudentController(req, { params });
}
