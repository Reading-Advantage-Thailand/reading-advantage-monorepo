import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const PACKAGE_ROOT = resolve(import.meta.dirname, "../..");
const MIGRATION_PATH = resolve(
  PACKAGE_ROOT,
  "drizzle/0052_sales_mastery_tenant_mapping.sql",
);
const TENANT_REGISTRY_PATH = resolve(
  PACKAGE_ROOT,
  "../../domain/src/tenant-registry.ts",
);

/** Loads the future mapping migration and labels its absent Red behavior. */
async function readPhase2Artifacts(): Promise<{
  readonly migration: string;
  readonly registry: string;
}> {
  try {
    const [migration, registry] = await Promise.all([
      readFile(MIGRATION_PATH, "utf8"),
      readFile(TENANT_REGISTRY_PATH, "utf8"),
    ]);
    return { migration, registry };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new Error(
        "Missing Sales tenant mapping/projection behavior: mapping and outbox migration",
        { cause: error },
      );
    }
    throw error;
  }
}

/** Normalizes SQL source for stable contract assertions. */
function normalizedSql(source: string): string {
  return source.replaceAll('"', "").replace(/\s+/gu, " ").trim();
}

describe("Sales Phase 2 tenant mapping and durable outbox schema", () => {
  it("registers the mapping as tenant-safe application data", async () => {
    const { migration, registry } = await readPhase2Artifacts();
    const sql = normalizedSql(migration);

    expect(sql).toContain("CREATE TABLE sales_mastery_tenant_mappings");
    expect(sql).toMatch(
      /UNIQUE[^;]*application_key[^;]*organization_id|UNIQUE \(application_key, organization_id\)/iu,
    );
    expect(sql).toMatch(/CHECK[^;]*application_key[^;]*sales/iu);
    expect(registry).toContain("salesMasteryTenantMappings");
  });

  it("binds every mapping to a dedicated Sales namespace", async () => {
    const { migration } = await readPhase2Artifacts();
    const sql = normalizedSql(migration);

    expect(sql).toMatch(/mastery_tenant_key[^;]*uuid[^;]*UNIQUE/iu);
    expect(sql).toMatch(/source_tenant_key[^;]*sales:/iu);
    expect(sql).toMatch(/codecamp/iu);
    expect(sql).toMatch(/reject|raise exception/iu);
  });

  it("defines an atomic append-only projection outbox", async () => {
    const { migration } = await readPhase2Artifacts();
    const sql = normalizedSql(migration);

    expect(sql).toContain("CREATE TABLE sales_mastery_projection_outbox");
    for (const field of [
      "organization_id",
      "mastery_tenant_key",
      "learner_principal_id",
      "source_attempt_id",
      "graph_release",
      "rubric_version",
      "request_id",
      "correlation_id",
      "payload_digest",
    ]) {
      expect(sql).toContain(field);
    }
    expect(sql).toMatch(
      /CREATE TRIGGER sales_mastery_projection_outbox_append_only BEFORE UPDATE OR DELETE OR TRUNCATE ON public\.sales_mastery_projection_outbox/iu,
    );
    expect(sql).toMatch(/append.only|append only/iu);
  });
});
