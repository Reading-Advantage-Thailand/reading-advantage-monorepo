/**
 * Accounting submission rejection API route.
 *
 * Thin HTTP boundary only: the session guard authorizes, the company scope
 * always comes from the session's organization identity, and all validation
 * and persistence decisions live in the domain via `@/app/lib/submissions`.
 * The rejection reason is parsed from a JSON body `{ reason }`.
 */
import { requireAccountingSession } from "@/app/lib/auth";
import type { accountingSessionUser } from "@/app/lib/company-oidc";
import { rejectAccountingSubmission } from "@/app/lib/submissions";
import type { AccountingActor } from "@reading-advantage/backend/accounting";

/** Session user projection produced by the accounting guard. */
type AccountingSessionUser = NonNullable<
  ReturnType<typeof accountingSessionUser>
>;

/**
 * Maps the guard's session user to a domain actor.
 * @param user Verified accounting session user.
 * @returns Domain actor carrying account, company, and role.
 */
function actorFromUser(user: AccountingSessionUser): AccountingActor {
  return {
    accountId: user.id,
    companyId: user.organizationId,
    role: user.role,
  };
}

/**
 * Serializes a JSON response body.
 * @param body Response payload.
 * @param status HTTP status code.
 * @returns JSON response.
 */
function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Narrows an unknown thrown value to the route-ready domain invalid-input rejection.
 * @param error Unknown thrown value.
 * @returns True when the error carries a fieldErrors map to return as 400.
 */
function isInvalidInputError(
  error: unknown,
): error is Error & { readonly fieldErrors: Record<string, string[]> } {
  return (
    error instanceof Error &&
    error.name === "AccountingSubmissionError" &&
    (error as { readonly reason?: unknown }).reason === "invalid-input" &&
    typeof (error as { readonly fieldErrors?: unknown }).fieldErrors ===
      "object"
  );
}

/**
 * Checks whether the error is a domain forbidden rejection.
 * @param error Unknown thrown value.
 * @returns True when the error is forbidden.
 */
function isForbiddenError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.name === "AccountingSubmissionError" &&
    (error as { readonly reason?: unknown }).reason === "forbidden"
  );
}

/**
 * Checks whether the error is a domain not-found rejection.
 * @param error Unknown thrown value.
 * @returns True when the error is not-found.
 */
function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.name === "AccountingSubmissionError" &&
    (error as { readonly reason?: unknown }).reason === "not-found"
  );
}

/**
 * Resolves the submission id from the route context.
 * @param context Route context carrying the id param.
 * @returns The submission identifier.
 */
async function getSubmissionId(context: {
  params: { id: string } | Promise<{ id: string }>;
}): Promise<string> {
  const params = await (context.params as Promise<{ id: string }>);
  return (params as { id: string }).id;
}

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
