import { NextRequest } from "next/server";
import {
  fetchAssignmentById,
  postUserLessonProgress,
} from "@/server/controllers/assignmentController";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await fetchAssignmentById(request, { params });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await postUserLessonProgress(request, { params });
}
