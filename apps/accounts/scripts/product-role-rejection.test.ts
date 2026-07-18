import { describe, expect, it } from "vitest";

import type { CompanyOidcIdentity } from "@reading-advantage/auth/company-identity";
import { codecampSessionUser } from "../../codecamp-advantage/lib/company-oidc";
import { marketingSessionUser } from "../../marketing/app/lib/company-oidc";
import { salesSessionUser } from "../../sales-advantage/lib/company-oidc";

function identity(
  aud: string,
  roles: string[],
): CompanyOidcIdentity {
  return {
    status: "ACTIVE",
    sub: "11111111-1111-4111-8111-111111111111",
    username: "company.user",
    displayName: "Company User",
    roles,
    aud,
    sid: "22222222-2222-4222-8222-222222222222",
    organizationId: "33333333-3333-4333-8333-333333333333",
    organizationKey: "internal-company",
    authVersion: 1,
  };
}

describe("product role projections", () => {
  const rejectedRoles: Array<{ roles: string[] }> = [
    { roles: [] },
    { roles: ["UNKNOWN"] },
  ];

  it.each(rejectedRoles)(
    "returns no Marketing principal for empty or unknown roles: %j",
    ({ roles }) => {
      expect(marketingSessionUser(identity("marketing", roles))).toBeNull();
    },
  );

  it.each(rejectedRoles)(
    "returns no Sales principal for empty or unknown roles: %j",
    async ({ roles }) => {
      await expect(salesSessionUser(identity("sales", roles))).resolves.toBeNull();
    },
  );

  it.each(rejectedRoles)(
    "rejects empty or unknown Codecamp roles: %j",
    ({ roles }) => {
      expect(() => codecampSessionUser(identity("codecamp", roles))).toThrow(
        "no recognized Codecamp role",
      );
    },
  );
});
