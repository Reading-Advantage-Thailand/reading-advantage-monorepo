/**
 * Accounting submission rejection API route.
 *
 * Thin HTTP boundary only: the session guard authorizes, the company scope
 * always comes from the session's organization identity, and all validation
 * and persistence decisions live in the domain via `@/app/lib/submissions`.
 * The rejection reason is parsed from a JSON body `{ reason }`.
 */
import { requireAccountingSession } from "@/app/lib/auth";
import {
  actorFromUser,
  getSubmissionId,
  isForbiddenError,
  isInvalidInputError,
  isNotFoundError,
  jsonResponse,
} from "@/app/lib/route-helpers";
import { rejectAccountingSubmission } from "@/app/lib/submissions";

/**
 * Handles POST /api/submissions/[id]/reject: OWNER-only rejection with a reason.
 * @param request Route request with JSON body `{ reason }`.
 * @param context Route context with the submission id.
 * @returns 200 with the rejected submission, or 400/403/404 for domain rejections, or the guard's 401/403.
 */
export async function POST(
  request: Request,
  context: { params: { id: string } | Promise<{ id: string }> },
): Promise<Response> {
  const guard = await requireAccountingSession(request);
  if (!guard.ok) return guard.response;
  const actor = actorFromUser(guard.session.user);

  const submissionId = await getSubmissionId(context);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      { message: "Invalid JSON body", fieldErrors: { reason: ["Reason is required"] } },
      400,
    );
  }

  const reason =
    typeof (body as { reason?: unknown })?.reason === "string"
      ? (body as { reason: string }).reason
      : undefined;

  try {
    const submission = await rejectAccountingSubmission({
      actor,
      submissionId,
      reason,
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
