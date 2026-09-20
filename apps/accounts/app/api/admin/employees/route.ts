import { NextResponse } from "next/server";

import { getIdentityComposition } from "@/lib/server/identity";
import {
  identityAuthenticationEvidence,
  identityErrorResponse,
  readJsonBody,
  requireSameOrigin,
} from "@/lib/server/http";
import {
  accountsHeadResponse,
  accountsOptionsResponse,
  companyIdentityRouteHandlers,
} from "@/lib/server/company-identity-route-bindings";
import {
  companyIdentityCapabilityIds,
  type Employee,
} from "@reading-advantage/backend";

/** Lists all company employees for a company administrator. */
export async function GET(): Promise<NextResponse> {
  try {
    const employees = await companyIdentityRouteHandlers.employeesList(
      async () =>
        (await getIdentityComposition()).executor.execute<Employee[]>({
          capabilityId: companyIdentityCapabilityIds.listEmployees,
          input: {},
          evidence: await identityAuthenticationEvidence(),
        }),
    );
    return NextResponse.json({ employees });
  } catch (error) {
    return identityErrorResponse(error);
  }
}

/** Creates one employee with independent company and application roles. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    await requireSameOrigin(request);
    const body = await readJsonBody(request);
    const employee = await companyIdentityRouteHandlers.employeesCreate(
      async () =>
        (await getIdentityComposition()).executor.execute<Employee>({
          capabilityId: companyIdentityCapabilityIds.createEmployee,
          input: body,
          evidence: await identityAuthenticationEvidence(),
          idempotencyKey: body.idempotencyKey,
        }),
    );
    return NextResponse.json({ employee }, { status: 201 });
  } catch (error) {
    return identityErrorResponse(error);
  }
}

/** Handles the factual HEAD method without returning the employee list body. */
export const HEAD = (): NextResponse =>
  companyIdentityRouteHandlers.employeesListHead(accountsHeadResponse);

/** Handles framework preflight explicitly under its reviewed route binding. */
export const OPTIONS = (): NextResponse =>
  companyIdentityRouteHandlers.employeesCreateOptions(() =>
    accountsOptionsResponse("GET, HEAD, POST, OPTIONS"),
  );
