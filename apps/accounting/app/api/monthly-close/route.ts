/**
 * Accounting monthly close API route.
 *
 * Thin HTTP boundary only: the session guard authorizes, the company scope
 * always comes from the session's organization identity, and all validation
 * and persistence decisions live in the domain via `@/app/lib/monthly-close`.
 * The route holds no role test of its own (FR-8).
 */
import { requireAccountingSession } from "@/app/lib/auth";
import {
  listMonthlyCloses,
  openMonthlyClose,
} from "@/app/lib/monthly-close";
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
 * Reads the period month of an open request.
 * @param request Route request carrying the JSON body.
 * @returns The period month of the body.
 * @throws When the body holds no period month.
 */
async function readPeriodMonth(request: Request): Promise<string> {
  const body = (await request.json()) as { readonly periodMonth?: unknown };
  if (typeof body.periodMonth !== "string" || body.periodMonth.length === 0) {
    throw new Error("periodMonth is missing");
  }
  return body.periodMonth;
}

/**
 * Handles GET /api/monthly-close: the closes visible to the actor.
 * @param request Route request carrying the session cookie.
 * @returns 200 with the visible closes, or 400/403/404 for domain rejections, or the guard's 401/403.
 */
export async function GET(request: Request): Promise<Response> {
  const guard = await requireAccountingSession(request);
  if (!guard.ok) return guard.response;
  const actor = actorFromUser(guard.session.user);

  try {
    const closes = await listMonthlyCloses({ actor });
    return jsonResponse(closes, 200);
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
      return jsonResponse({ message: "Monthly close not found" }, 404);
    }
    throw error;
  }
}

/**
 * Handles POST /api/monthly-close: opens the close of one period month.
 * @param request Route request carrying the session cookie and the period month.
 * @returns 200 with the open close, or 400/403/404 for domain rejections, or the guard's 401/403.
 */
export async function POST(request: Request): Promise<Response> {
  const guard = await requireAccountingSession(request);
  if (!guard.ok) return guard.response;
  const origin = requireSameOrigin(request);
  if (!origin.ok) return origin.response;
  const actor = actorFromUser(guard.session.user);

  let periodMonth: string;
  try {
    periodMonth = await readPeriodMonth(request);
  } catch {
    return jsonResponse({ message: "Invalid request body" }, 400);
  }

  try {
    const close = await openMonthlyClose({ actor, periodMonth });
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
        { message: "A monthly close already exists for this period month" },
        409,
      );
    }
    if (isNotFoundError(error)) {
      return jsonResponse({ message: "Monthly close not found" }, 404);
    }
    throw error;
  }
}
