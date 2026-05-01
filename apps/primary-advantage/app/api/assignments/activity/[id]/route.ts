import { NextRequest } from "next/server";
import { fetchAssignmentActivityById } from "@/server/controllers/assignmentController";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await fetchAssignmentActivityById(request, { params });
}
