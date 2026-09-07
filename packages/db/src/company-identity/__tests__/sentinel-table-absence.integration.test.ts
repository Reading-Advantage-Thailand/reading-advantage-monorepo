import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { checkTableSentinel } from "../../sentinel-evaluation.js";
import { sentinelProbes } from "../../sentinels.js";
import { withCompanyIdentityScratchDatabase } from "./test-postgres.js";

describe("migration 0056 table-absence sentinel", () => {
  it("fails before relocation and passes after the migration drops both old tables", async () => {
    await withCompanyIdentityScratchDatabase(async ({ adminSql }) => {
      await adminSql.unsafe(`
        CREATE TABLE accounting_submissions (id integer PRIMARY KEY);
        CREATE TABLE finance_records (id integer PRIMARY KEY);
        CREATE TABLE finance_record_success_audit_outbox (id integer PRIMARY KEY);
      `);
      const probe = sentinelProbes["0056_great_clint_barton"]!;
      const absentTargets = probe.allOf!
        .filter(({ kind }) => kind === "table_absent")
        .map(({ target }) => target);
      for (const target of absentTargets) {
        expect(await checkTableSentinel(adminSql, "table_absent", target)).toBe(false);
      }

      const migration = readFileSync(
        resolve(import.meta.dirname, "../../../drizzle/0056_great_clint_barton.sql"),
        "utf8",
      );
      await adminSql.unsafe(migration);
      expect(await checkTableSentinel(adminSql, "table", "accounting_submissions")).toBe(true);
      for (const target of absentTargets) {
        expect(await checkTableSentinel(adminSql, "table_absent", target)).toBe(true);
      }
    });
  }, 30_000);
});
