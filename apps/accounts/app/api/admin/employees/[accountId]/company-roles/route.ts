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
import {
  companyIdentityCapabilityIds,
  type Employee,
} from "@reading-advantage/backend";

/** Replaces company roles without changing any application assignment. */
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
    const employee = await companyIdentityRouteHandlers.employeeCompanyRoles(
      async () =>
        (await getIdentityComposition()).executor.execute<Employee>({
          capabilityId: companyIdentityCapabilityIds.setCompanyRoles,
          input: { ...body, targetAccountId: accountId },
          evidence,
          idempotencyKey: body.idempotencyKey,
        }),
    );
    return NextResponse.json({ employee });
  } catch (error) {
    return identityErrorResponse(error);
  }
}

/** Handles framework preflight explicitly under its reviewed route binding. */
export const OPTIONS = (): NextResponse =>
  companyIdentityRouteHandlers.employeeCompanyRolesOptions(() =>
    accountsOptionsResponse("PUT, OPTIONS"),
  );
