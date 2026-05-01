import { NextRequest } from "next/server";
import { getAvailableStudentsController } from "@/server/controllers/classroomController";

// GET /api/classroom/[id]/available-students - Get available students for enrollment
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await getAvailableStudentsController(req, { params });
}
