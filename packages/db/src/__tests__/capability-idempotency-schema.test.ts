import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { capabilityIdempotencyRecords } from "../schema/index.js";

const PACKAGE_ROOT = resolve(import.meta.dirname, "../..");

describe("capability idempotency persistence", () => {
  it("exports the fingerprint-only Drizzle table with reviewed constraints", () => {
    const config = getTableConfig(capabilityIdempotencyRecords);
    const columns = config.columns.map((column) => column.name);
    const uniqueNames = config.uniqueConstraints.map((constraint) =>
      constraint.name,
    );
    const checkNames = config.checks.map((constraint) => constraint.name);

    expect(columns).toContain("key_fingerprint");
    expect(columns).toContain("input_fingerprint");
    expect(columns).not.toContain("idempotency_key");
    expect(columns).not.toContain("raw_key");
    expect(uniqueNames).toContain("capability_idempotency_namespace_key_unique");
    expect(uniqueNames).toContain("capability_idempotency_ownership_token_unique");
    expect(checkNames).toEqual(expect.arrayContaining([
      "capability_idempotency_scope_check",
      "capability_idempotency_state_check",
      "capability_idempotency_owner_state_check",
      "capability_idempotency_tenant_key_check",
    ]));
  });

  it("ships migration 0038 after the stable Sales migration 0037", () => {
    const migration = readFileSync(
      resolve(PACKAGE_ROOT, "drizzle/0038_capability_idempotency_records.sql"),
      "utf8",
    );
    const journal = JSON.parse(readFileSync(
      resolve(PACKAGE_ROOT, "drizzle/meta/_journal.json"),
      "utf8",
    )) as { entries: Array<{ idx: number; when: number; tag: string }> };
    const sales = journal.entries.find((entry) => entry.idx === 37);
    const kernel = journal.entries.find((entry) => entry.idx === 38);

    expect(migration).toContain('CREATE TABLE "capability_idempotency_records"');
    expect(migration).toContain('"key_fingerprint" text NOT NULL');
    expect(migration).not.toContain('"raw_key"');
    expect(sales?.tag).toBe("0037_sales_roleplay_attempt_number_unique");
    expect(kernel?.tag).toBe("0038_capability_idempotency_records");
    expect(kernel!.when).toBeGreaterThan(sales!.when);
  });
});
