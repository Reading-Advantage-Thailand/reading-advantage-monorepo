import { NextResponse } from "next/server";

import { getIdentityComposition } from "@/lib/server/identity";
import { identityAuthenticationEvidence, identityErrorResponse, requireSameOrigin } from "@/lib/server/http";
import { companyIdentityCapabilityIds, type Employee } from "@reading-advantage/backend";

/** Lists all company employees for a company administrator. */
export async function GET(): Promise<NextResponse> {
  try {
    const employees = await (await getIdentityComposition()).executor.execute<Employee[]>({
      capabilityId: companyIdentityCapabilityIds.listEmployees,
      input: {},
      evidence: await identityAuthenticationEvidence(),
    });
    return NextResponse.json({ employees });
  } catch (error) { return identityErrorResponse(error); }
}

/** Creates one employee with independent company and application roles. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    await requireSameOrigin(request);
    const body = await request.json();
    const employee = await (await getIdentityComposition()).executor.execute<Employee>({
      capabilityId: companyIdentityCapabilityIds.createEmployee,
      input: body,
      evidence: await identityAuthenticationEvidence(),
      idempotencyKey: body.idempotencyKey,
    });
    return NextResponse.json({ employee }, { status: 201 });
  } catch (error) { return identityErrorResponse(error); }
}
