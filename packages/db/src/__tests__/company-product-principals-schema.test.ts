import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { getTableConfig } from "drizzle-orm/pg-core";
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

  it("globally binds one local principal to one application", () => {
    const constraints = getTableConfig(
      companyProductPrincipals,
    ).uniqueConstraints;
    const constraint = constraints.find(
      (candidate) =>
        candidate.name ===
        "company_product_principals_application_local_unique",
    );
    expect(constraint?.columns.map((column) => column.name)).toEqual([
      "application_key",
      "local_user_id",
    ]);
    const accountConstraint = constraints.find(
      (candidate) =>
        candidate.name ===
        "company_product_principals_application_account_unique",
    );
    expect(accountConstraint?.columns.map((column) => column.name)).toEqual([
      "application_key",
      "company_account_id",
    ]);
  });

  it("keeps migration constraints and the migration-doctor sentinel aligned", () => {
    const migration = readFileSync(
      resolve(
        import.meta.dirname,
        "../../drizzle/0040_company_product_principals.sql",
      ),
      "utf8",
    );
    expect(migration).toContain('CREATE TABLE "company_product_principals"');
    expect(migration).toContain("PRIMARY KEY");
    expect(migration).toContain(
      'UNIQUE("organization_id","application_key","local_user_id")',
    );
    expect(migration).toContain(
      "company_product_principals_organization_key_check",
    );
    expect(migration).toContain(
      'REFERENCES "public"."users"("id") ON DELETE restrict',
    );
    expect(sentinelProbes["0040_company_product_principals"]).toEqual({
      tag: "0040_company_product_principals",
      kind: "table",
      target: "company_product_principals",
    });

    const hardeningMigration = readFileSync(
      resolve(
        import.meta.dirname,
        "../../drizzle/0042_company_product_principal_local_unique.sql",
      ),
      "utf8",
    );
    const preflight = hardeningMigration.indexOf("HAVING COUNT(*) > 1");
    const constraintDrop = hardeningMigration.indexOf("DROP CONSTRAINT");
    const globalConstraint = hardeningMigration.indexOf(
      'UNIQUE("application_key","local_user_id")',
    );
    expect(preflight).toBeGreaterThanOrEqual(0);
    expect(constraintDrop).toBeGreaterThan(preflight);
    expect(globalConstraint).toBeGreaterThan(constraintDrop);
    expect(
      sentinelProbes["0042_company_product_principal_local_unique"],
    ).toEqual({
      tag: "0042_company_product_principal_local_unique",
      kind: "unique_constraint",
      target: "company_product_principals_application_local_unique",
      table: "company_product_principals",
      columns: ["application_key", "local_user_id"],
    });
    expect(hardeningMigration).toContain("sales:");
    expect(hardeningMigration).toContain("UPDATE sales_progress");
    expect(hardeningMigration).toContain(
      "company_product_principals_application_account_unique",
    );
    expect(hardeningMigration).toContain("sync_sales_company_principal");
    expect(hardeningMigration).toContain("source.school_id");
    expect(hardeningMigration).toContain("mapping.local_user_id NOT IN");
    expect(hardeningMigration).toContain(
      "Sales organization change requires an explicit mapping manifest",
    );
  });
  it("defines the constrained Codecamp principal synchronization function", () => {
    const migration = readFileSync(
      resolve(
        import.meta.dirname,
        "../../drizzle/0043_codecamp_company_principal_sync.sql",
      ),
      "utf8",
    );
    expect(migration).toContain("sync_codecamp_company_principal");
    expect(migration).toMatch(/LANGUAGE plpgsql[\s\S]*SECURITY DEFINER/);
    expect(migration).toContain("SET search_path = pg_catalog");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("mapping_found := FOUND");
    expect(migration).toContain("ERRCODE = 'RA002'");
    expect(migration).toContain("'codecamp:' || p_company_account_id::text");
    expect(migration).toContain("p_role_key = 'REVOKED'");
    expect(migration).toMatch(/AS \$\$[\s\S]*\$\$;/);
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.sync_codecamp_company_principal",
    );
  });
});
