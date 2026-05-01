import { NextRequest } from "next/server";
import { fetchStudentAssignments } from "@/server/controllers/assignmentController";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await fetchStudentAssignments(request, { params });
}
