import { NextResponse } from "next/server";

import { getIdentityComposition } from "@/lib/server/identity";
import { identityAuthenticationEvidence, identityErrorResponse, requireSameOrigin } from "@/lib/server/http";
import { companyIdentityCapabilityIds } from "@reading-advantage/backend";

/** Revokes every Accounts and application session for one employee. */
export async function DELETE(request: Request, context: { params: Promise<{ accountId: string }> }): Promise<NextResponse> {
  try {
    await requireSameOrigin(request);
    const [{ accountId }, body, evidence] = await Promise.all([
      context.params, request.json(), identityAuthenticationEvidence(),
    ]);
    return NextResponse.json(await (await getIdentityComposition()).executor.execute({
      capabilityId: companyIdentityCapabilityIds.revokeSessions,
      input: { ...body, targetAccountId: accountId },
      evidence,
      idempotencyKey: body.idempotencyKey,
    }));
  } catch (error) { return identityErrorResponse(error); }
}
