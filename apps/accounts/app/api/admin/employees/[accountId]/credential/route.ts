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

/** Resets one credential and revokes every active employee session. */
export async function PUT(
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
      await companyIdentityRouteHandlers.employeeCredential(
        async () =>
          (await getIdentityComposition()).executor.execute({
            capabilityId: companyIdentityCapabilityIds.resetCredential,
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
  companyIdentityRouteHandlers.employeeCredentialOptions(() =>
    accountsOptionsResponse("PUT, OPTIONS"),
  );
