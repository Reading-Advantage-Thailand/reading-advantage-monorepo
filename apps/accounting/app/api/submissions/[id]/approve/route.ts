/**
 * Accounting submission approval API route.
 *
 * Thin HTTP boundary only: the session guard authorizes, the company scope
 * always comes from the session's organization identity, and all validation
 * and persistence decisions live in the domain via `@/app/lib/submissions`.
 */
import { requireAccountingSession } from "@/app/lib/auth";
import {
  actorFromUser,
  getSubmissionId,
  isForbiddenError,
  isInvalidInputError,
  isNotFoundError,
  jsonResponse,
  requireSameOrigin,
} from "@/app/lib/route-helpers";
import { approveAccountingSubmission } from "@/app/lib/submissions";

/**
 * Handles POST /api/submissions/[id]/approve: OWNER-only approval of a pending submission.
 * @param request Route request carrying the session cookie.
 * @param context Route context with the submission id.
 * @returns 200 with the approved submission, or 400/403/404 for domain rejections, or the guard's 401/403.
 */
export async function POST(
  request: Request,
  context: { params: { id: string } | Promise<{ id: string }> },
): Promise<Response> {
  const guard = await requireAccountingSession(request);
  if (!guard.ok) return guard.response;
  const origin = requireSameOrigin(request);
  if (!origin.ok) return origin.response;
  const actor = actorFromUser(guard.session.user);
  const submissionId = await getSubmissionId(context);

  try {
    const submission = await approveAccountingSubmission({
      actor,
      submissionId,
    });
    return jsonResponse(submission, 200);
  } catch (error) {
    if (isInvalidInputError(error)) {
      return jsonResponse(
        { message: error.message, fieldErrors: error.fieldErrors },
        400,
      );
    }
    if (isForbiddenError(error)) {
      return jsonResponse({ message: "Forbidden" }, 403);
    }
    if (isNotFoundError(error)) {
      return jsonResponse({ message: "Submission not found" }, 404);
    }
    throw error;
  }
}
