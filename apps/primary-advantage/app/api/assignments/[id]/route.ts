import { NextRequest, NextResponse } from "next/server";
import {
  fetchAssignmentById,
  postUserLessonProgress,
} from "@/server/controllers/assignmentController";
import { currentUser } from "@/lib/session";
import { guardStudentRoute } from "@/lib/student-view";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await fetchAssignmentById(request, { params });
}

/**
 * Saves lesson progress of an assignment. Only a student saves; staff get 403 `PREVIEW_READ_ONLY`.
 * @param request The request with the progress body.
 * @param context The route params with the assignment id.
 * @returns The controller response, 401 without a session, or the preview refusal.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const preview = guardStudentRoute(user, "assignment_progress");
  if (preview) return preview;
  return await postUserLessonProgress(request, { params });
}
