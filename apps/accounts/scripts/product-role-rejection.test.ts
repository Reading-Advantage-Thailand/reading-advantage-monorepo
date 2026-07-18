import { describe, expect, it } from "vitest";

import type { CompanyOidcIdentity } from "@reading-advantage/auth";
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
    "rejects empty or unknown Marketing roles: %j",
    ({ roles }) => {
      expect(() => marketingSessionUser(identity("marketing", roles))).toThrow(
        "no recognized Marketing role",
      );
    },
  );

  it.each(rejectedRoles)(
    "rejects empty or unknown Sales roles: %j",
    async ({ roles }) => {
      await expect(salesSessionUser(identity("sales", roles))).rejects.toThrow(
        "no recognized Sales role",
      );
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
