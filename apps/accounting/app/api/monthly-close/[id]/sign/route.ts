/**
 * Accounting monthly close sign API route.
 *
 * Thin HTTP boundary only: the session guard authorizes, the company scope
 * always comes from the session's organization identity, and all validation
 * and persistence decisions live in the domain via `@/app/lib/monthly-close`.
 * The route holds no role test of its own (FR-8). The sign locks the close in
 * the same call, so there is no lock route (D-5).
 */
import { requireAccountingSession } from "@/app/lib/auth";
import { signMonthlyClose } from "@/app/lib/monthly-close";
import {
  actorFromUser,
  isConflictError,
  isForbiddenError,
  isInvalidInputError,
  isNotFoundError,
  jsonResponse,
  requireSameOrigin,
} from "@/app/lib/route-helpers";

/**
 * Reads the close identifier from the route context.
 * @param context Route context with the close id.
 * @returns The close identifier.
 */
async function readCloseId(context: {
  params: { id: string } | Promise<{ id: string }>;
}): Promise<string> {
  const params = await context.params;
  return params.id;
}

/**
 * Handles POST /api/monthly-close/[id]/sign: signs the close and locks it.
 * @param request Route request carrying the session cookie.
 * @param context Route context with the close id.
 * @returns 200 with the locked close, or 400/403/404 for domain rejections, or the guard's 401/403.
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
  const closeId = await readCloseId(context);

  try {
    const close = await signMonthlyClose({ actor, closeId });
    return jsonResponse(close, 200);
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
    if (isConflictError(error)) {
      return jsonResponse(
        { message: "The monthly close changed and cannot be signed" },
        409,
      );
    }
    if (isNotFoundError(error)) {
      return jsonResponse({ message: "Monthly close not found" }, 404);
    }
    throw error;
  }
}
