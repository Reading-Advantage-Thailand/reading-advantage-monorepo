import { z } from "zod";

import { financeOperationAuthorizationInputSchema } from "./contracts.js";

const nonBlankStringSchema = z.string().regex(/\S/u);

/** Versioned, data-supplied policy for authorizing Finance Operations calls. */
export const financeAuthorizationPolicySchema = z.strictObject({
  policyVersion: nonBlankStringSchema,
  allowedOperations: z.array(nonBlankStringSchema).min(1),
  approvedAppRoleIds: z.array(nonBlankStringSchema).min(1),
  scopeKind: z.enum(["company", "school"]),
});

/** Validated role, operation, and scope policy for Finance Operations. */
export type FinanceAuthorizationPolicy = z.infer<
  typeof financeAuthorizationPolicySchema
>;

/** Deterministic result of evaluating one Finance Operations authorization. */
export type FinanceAuthorizationEvaluation =
  | { readonly decision: "allow" }
  | {
      readonly decision: "deny";
      readonly reason:
        | "operation-not-allowed"
        | "role-not-approved"
        | "organization-mismatch"
        | "scope-mismatch";
    };

/**
 * Validates and evaluates a finance authorization request in deterministic denial order.
 * @param request Untrusted policy and authorization input to validate and evaluate.
 * @returns An allow decision or the first applicable denial reason.
 * @throws When the policy or authorization input fails runtime validation.
 */
export function evaluateFinanceAuthorization(request: {
  readonly policy: unknown;
  readonly input: unknown;
}): FinanceAuthorizationEvaluation {
  const policy = financeAuthorizationPolicySchema.parse(request.policy);
  const input = financeOperationAuthorizationInputSchema.parse(request.input);

  if (!policy.allowedOperations.includes(input.operation)) {
    return { decision: "deny", reason: "operation-not-allowed" };
  }

  const hasApprovedRole = input.authorizationEvidence.appRoleIds.some(
    (roleId) => policy.approvedAppRoleIds.includes(roleId),
  );
  if (!hasApprovedRole) {
    return { decision: "deny", reason: "role-not-approved" };
  }

  if (input.authorizationEvidence.organizationId !== input.scope.companyId) {
    return { decision: "deny", reason: "organization-mismatch" };
  }

  if (policy.scopeKind === "school") {
    const requestedSchoolId = input.scope.schoolId;
    if (requestedSchoolId === undefined) {
      return { decision: "deny", reason: "scope-mismatch" };
    }
    if (!input.authorizationEvidence.schoolIds?.includes(requestedSchoolId)) {
      return { decision: "deny", reason: "scope-mismatch" };
    }
  }

  return { decision: "allow" };
}
