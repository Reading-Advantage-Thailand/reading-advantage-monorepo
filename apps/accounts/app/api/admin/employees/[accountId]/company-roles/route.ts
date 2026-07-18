import { NextResponse } from "next/server";

import { getIdentityComposition } from "@/lib/server/identity";
import { identityAuthenticationEvidence, identityErrorResponse, requireSameOrigin } from "@/lib/server/http";
import { companyIdentityCapabilityIds, type Employee } from "@reading-advantage/backend";

/** Replaces company roles without changing any application assignment. */
export async function PUT(request: Request, context: { params: Promise<{ accountId: string }> }): Promise<NextResponse> {
  try {
    await requireSameOrigin(request);
    const [{ accountId }, body, evidence] = await Promise.all([
      context.params, request.json(), identityAuthenticationEvidence(),
    ]);
    const employee = await (await getIdentityComposition()).executor.execute<Employee>({
      capabilityId: companyIdentityCapabilityIds.setCompanyRoles,
      input: { ...body, targetAccountId: accountId },
      evidence,
      idempotencyKey: body.idempotencyKey,
    });
    return NextResponse.json({ employee });
  } catch (error) { return identityErrorResponse(error); }
}
