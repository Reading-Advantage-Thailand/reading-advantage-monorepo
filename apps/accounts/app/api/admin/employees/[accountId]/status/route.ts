import { NextResponse } from "next/server";

import { getIdentityComposition } from "@/lib/server/identity";
import { identityAuthenticationEvidence, identityErrorResponse, requireSameOrigin } from "@/lib/server/http";
import { companyIdentityCapabilityIds } from "@reading-advantage/backend";

/** Suspends or restores one employee and enforces the last-admin invariant. */
export async function PATCH(request: Request, context: { params: Promise<{ accountId: string }> }): Promise<NextResponse> {
  try {
    await requireSameOrigin(request);
    const [{ accountId }, body, evidence] = await Promise.all([
      context.params, request.json(), identityAuthenticationEvidence(),
    ]);
    const input = { ...body, targetAccountId: accountId };
    return NextResponse.json(await (await getIdentityComposition()).executor.execute({
      capabilityId: companyIdentityCapabilityIds.setEmployeeStatus,
      input,
      evidence,
      idempotencyKey: body.idempotencyKey,
    }));
  } catch (error) { return identityErrorResponse(error); }
}
