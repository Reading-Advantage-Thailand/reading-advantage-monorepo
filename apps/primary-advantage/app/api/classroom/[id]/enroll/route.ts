import { NextRequest } from "next/server";
import { enrollStudentController } from "@/server/controllers/classroomController";

// POST /api/classroom/[id]/enroll - Enroll a student in a classroom
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await enrollStudentController(req, { params });
}
