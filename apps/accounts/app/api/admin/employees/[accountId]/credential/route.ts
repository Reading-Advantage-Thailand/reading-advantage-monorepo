import { NextResponse } from "next/server";

import { getIdentityComposition } from "@/lib/server/identity";
import { identityAuthenticationEvidence, identityErrorResponse, requireSameOrigin } from "@/lib/server/http";
import { companyIdentityCapabilityIds } from "@reading-advantage/backend";

/** Resets one credential and revokes every active employee session. */
export async function PUT(request: Request, context: { params: Promise<{ accountId: string }> }): Promise<NextResponse> {
  try {
    await requireSameOrigin(request);
    const [{ accountId }, body, evidence] = await Promise.all([
      context.params, request.json(), identityAuthenticationEvidence(),
    ]);
    return NextResponse.json(await (await getIdentityComposition()).executor.execute({
      capabilityId: companyIdentityCapabilityIds.resetCredential,
      input: { ...body, targetAccountId: accountId },
      evidence,
      idempotencyKey: body.idempotencyKey,
    }));
  } catch (error) { return identityErrorResponse(error); }
}
