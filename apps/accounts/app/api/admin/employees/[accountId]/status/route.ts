import { NextResponse } from "next/server";

import { getIdentityComposition } from "@/lib/server/identity";
import {
  identityAuthenticationEvidence,
  identityErrorResponse,
  readJsonBody,
  requireSameOrigin,
} from "@/lib/server/http";
import {
  accountsOptionsResponse,
  companyIdentityRouteHandlers,
} from "@/lib/server/company-identity-route-bindings";
import { companyIdentityCapabilityIds } from "@reading-advantage/backend";

/** Suspends or restores one employee and enforces the last-admin invariant. */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ accountId: string }> },
): Promise<NextResponse> {
  try {
    await requireSameOrigin(request);
    const [{ accountId }, body, evidence] = await Promise.all([
      context.params,
      readJsonBody(request),
      identityAuthenticationEvidence(),
    ]);
    return NextResponse.json(
      await companyIdentityRouteHandlers.employeeStatus(
        async () =>
          (await getIdentityComposition()).executor.execute({
            capabilityId: companyIdentityCapabilityIds.setEmployeeStatus,
            input: { ...body, targetAccountId: accountId },
            evidence,
            idempotencyKey: body.idempotencyKey,
          }),
      ),
    );
  } catch (error) {
    return identityErrorResponse(error);
  }
}

/** Handles framework preflight explicitly under its reviewed route binding. */
export const OPTIONS = (): NextResponse =>
  companyIdentityRouteHandlers.employeeStatusOptions(() =>
    accountsOptionsResponse("PATCH, OPTIONS"),
  );
