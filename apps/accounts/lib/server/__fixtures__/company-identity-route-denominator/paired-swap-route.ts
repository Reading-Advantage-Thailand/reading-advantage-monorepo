import { companyIdentityCapabilityIds } from "@reading-advantage/backend";
import { companyIdentityRouteHandlers } from "../../company-identity-route-bindings";

export async function PATCH(): Promise<unknown> {
  return companyIdentityRouteHandlers.employeeCompanyRoles(async () => ({
    capabilityId: companyIdentityCapabilityIds.setCompanyRoles,
  }));
}
