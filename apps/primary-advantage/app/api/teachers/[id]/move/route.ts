import { NextRequest } from "next/server";
import { moveTeacherController } from "@/server/controllers/teacherController";

// POST /api/teachers/[id]/move - Move a teacher to another school (SYSTEM only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await moveTeacherController(request, { params });
}
