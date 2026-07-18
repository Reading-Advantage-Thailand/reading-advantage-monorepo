import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { sentinelProbes } from "../sentinels.js";
import { companyProductPrincipals } from "../schema/company-product-principals.js";

describe("company product principal schema", () => {
  it("exports the durable app-scoped identity mapping columns", async () => {
    expect(companyProductPrincipals).toMatchObject({
      organizationId: expect.anything(),
      organizationKey: expect.anything(),
      companyAccountId: expect.anything(),
      applicationKey: expect.anything(),
      localUserId: expect.anything(),
      roleKey: expect.anything(),
      createdAt: expect.anything(),
      updatedAt: expect.anything(),
    });
    await expect(import("../schema/index.js")).resolves.toHaveProperty(
      "companyProductPrincipals",
    );
  });

  it("keeps migration constraints and the migration-doctor sentinel aligned", () => {
    const migration = readFileSync(
      resolve(import.meta.dirname, "../../drizzle/0040_company_product_principals.sql"),
      "utf8",
    );
    expect(migration).toContain('CREATE TABLE "company_product_principals"');
    expect(migration).toContain("PRIMARY KEY");
    expect(migration).toContain(
      'UNIQUE("organization_id","application_key","local_user_id")',
    );
    expect(migration).toContain("company_product_principals_organization_key_check");
    expect(migration).toContain('REFERENCES "public"."users"("id") ON DELETE restrict');
    expect(sentinelProbes["0040_company_product_principals"]).toEqual({
      tag: "0040_company_product_principals",
      kind: "table",
      target: "company_product_principals",
    });
  });
});
