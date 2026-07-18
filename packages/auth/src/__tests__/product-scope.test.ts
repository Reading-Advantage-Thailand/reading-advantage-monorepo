import { describe, expect, it } from "vitest";

import { productAuthorizationScopeSchema } from "../product-scope.js";

describe("productAuthorizationScopeSchema", () => {
  it("accepts complete company and legacy-school scopes", () => {
    expect(productAuthorizationScopeSchema.safeParse({
      kind: "company",
      applicationKey: "sales",
      organizationId: "20000000-0000-4000-8000-000000000003",
      organizationKey: "internal-company",
    }).success).toBe(true);
    expect(productAuthorizationScopeSchema.safeParse({
      kind: "legacy-school",
      applicationKey: "sales",
      schoolId: "school-a",
    }).success).toBe(true);
  });

  it("rejects partial or mixed boundaries", () => {
    expect(productAuthorizationScopeSchema.safeParse({
      kind: "company",
      applicationKey: "sales",
      organizationId: "20000000-0000-4000-8000-000000000003",
    }).success).toBe(false);
    expect(productAuthorizationScopeSchema.safeParse({
      kind: "company",
      applicationKey: "sales",
      organizationId: "20000000-0000-4000-8000-000000000003",
      organizationKey: "internal-company",
      schoolId: "school-a",
    }).success).toBe(false);
  });
});
