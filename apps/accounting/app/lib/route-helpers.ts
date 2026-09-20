import type { accountingSessionUser } from "@/app/lib/company-oidc";
import type { AccountingActor } from "@reading-advantage/backend/accounting";

/** Session user projection produced by the accounting guard. */
export type AccountingSessionUser = NonNullable<
  ReturnType<typeof accountingSessionUser>
>;

/**
 * Maps the guard's session user to a domain actor; the company scope derives
 * from the session's organization identity, never from request input.
 * @param user Verified accounting session user.
 * @returns Domain actor carrying account, company, and role.
 */
export function actorFromUser(
  user: AccountingSessionUser,
): AccountingActor & { role: AccountingSessionUser["role"] } {
  return { accountId: user.id, companyId: user.organizationId, role: user.role };
}

/**
 * Serializes a JSON response body.
 * @param body Response payload.
 * @param status HTTP status code.
 * @returns JSON response with a JSON content type.
 */
export function jsonResponse(body: unknown, status: number): Response {
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
export function isInvalidInputError(
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
export function isForbiddenError(error: unknown): boolean {
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
export function isNotFoundError(error: unknown): boolean {
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
export async function getSubmissionId(context: {
  params: { id: string } | Promise<{ id: string }>;
}): Promise<string> {
  const params = await (context.params as Promise<{ id: string }>);
  return (params as { id: string }).id;
}
