import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { sentinelProbes } from "../sentinels.js";

const PACKAGE_ROOT = resolve(import.meta.dirname, "../..");
const MIGRATION_PATH = resolve(
  PACKAGE_ROOT,
  "drizzle/0050_finance_operations_records.sql",
);
const SNAPSHOT_PATH = resolve(PACKAGE_ROOT, "drizzle/meta/0050_snapshot.json");
const SCHEMA_PATH = resolve(PACKAGE_ROOT, "src/schema/finance-operations.ts");
const DOCTOR_PATH = resolve(PACKAGE_ROOT, "scripts/migration-ledger-doctor.ts");

const RECORD_NONBLANK_CHECKS = [
  ["finance_records_company_id_check", "company_id ~ '[^[:space:]]'"],
  ["finance_records_record_id_check", "record_id ~ '[^[:space:]]'"],
  [
    "finance_records_school_id_check",
    "school_id IS NULL OR school_id ~ '[^[:space:]]'",
  ],
  ["finance_records_source_system_check", "source_system ~ '[^[:space:]]'"],
  ["finance_records_source_version_check", "source_version ~ '[^[:space:]]'"],
  [
    "finance_records_source_record_id_check",
    "source_record_id ~ '[^[:space:]]'",
  ],
  ["finance_records_import_batch_id_check", "import_batch_id ~ '[^[:space:]]'"],
  [
    "finance_records_correction_reason_check",
    "correction_reason IS NULL OR correction_reason ~ '[^[:space:]]'",
  ],
] as const;

const OUTBOX_NONBLANK_CHECKS = [
  [
    "finance_record_success_audit_outbox_event_id_check",
    "event_id ~ '[^[:space:]]'",
  ],
  [
    "finance_record_success_audit_outbox_company_id_check",
    "company_id ~ '[^[:space:]]'",
  ],
  [
    "finance_record_success_audit_outbox_school_id_check",
    "school_id IS NULL OR school_id ~ '[^[:space:]]'",
  ],
  [
    "finance_record_success_audit_outbox_actor_subject_id_check",
    "actor_subject_id ~ '[^[:space:]]'",
  ],
  [
    "finance_record_success_audit_outbox_object_id_check",
    "object_id ~ '[^[:space:]]'",
  ],
  [
    "finance_record_success_audit_outbox_request_id_check",
    "request_id ~ '[^[:space:]]'",
  ],
  [
    "finance_record_success_audit_outbox_correlation_id_check",
    "correlation_id ~ '[^[:space:]]'",
  ],
] as const;

/** Normalizes whitespace and quoted PostgreSQL identifiers for source assertions. */
function normalizedSql(source: string): string {
  return source.replaceAll('"', "").replace(/\s+/gu, " ").trim();
}

/** Extracts and hashes one reviewed trigger-function body from the migration. */
function functionBodySha256(source: string, functionName: string): string {
  const declaration = `CREATE OR REPLACE FUNCTION public.${functionName}()`;
  const declarationOffset = source.indexOf(declaration);
  const bodyMarker = "AS $$\n";
  const bodyOffset = source.indexOf(bodyMarker, declarationOffset);
  const bodyEnd = source.indexOf("\n$$;", bodyOffset);
  if (declarationOffset < 0 || bodyOffset < 0 || bodyEnd < 0) {
    throw new Error(`Missing reviewed trigger function ${functionName}.`);
  }
  const body = source.slice(bodyOffset + bodyMarker.length, bodyEnd);
  return createHash("sha256")
    .update(body.replace(/\s+/gu, " ").trim())
    .digest("hex");
}

describe("Finance Operations adversarial persistence contract", () => {
  it("uses POSIX-space-aware checks for every nonblank record and outbox field", async () => {
    const sql = normalizedSql(await readFile(MIGRATION_PATH, "utf8"));
    const schema = await readFile(SCHEMA_PATH, "utf8");
    const snapshot = JSON.parse(await readFile(SNAPSHOT_PATH, "utf8")) as {
      readonly tables: Record<
        string,
        {
          readonly checkConstraints: Record<string, { readonly value: string }>;
        }
      >;
    };

    for (const [constraint, expression] of [
      ...RECORD_NONBLANK_CHECKS,
      ...OUTBOX_NONBLANK_CHECKS,
    ]) {
      expect(
        sql,
        `${constraint} must require at least one non-POSIX-space character`,
      ).toContain(`CONSTRAINT ${constraint} CHECK (${expression})`);
    }

    for (const [table, checks] of [
      ["public.finance_records", RECORD_NONBLANK_CHECKS],
      ["public.finance_record_success_audit_outbox", OUTBOX_NONBLANK_CHECKS],
    ] as const) {
      for (const [constraint, expression] of checks) {
        const snapshotExpression = snapshot.tables[table]?.checkConstraints[
          constraint
        ]?.value
          .replaceAll('"', "")
          .replaceAll(`${table.slice("public.".length)}.`, "");
        expect(snapshotExpression).toBe(expression);
      }
    }

    expect(schema).not.toContain("btrim(");
    expect([...schema.matchAll(/~ '\[\^\[:space:\]\]'/gu)]).toHaveLength(15);
    expect(sql).not.toContain("btrim(");
  });

  it("locks append-only enforcement to qualified UPDATE, DELETE, and TRUNCATE triggers", async () => {
    const sql = normalizedSql(await readFile(MIGRATION_PATH, "utf8"));

    expect(sql).toMatch(
      /CREATE OR REPLACE FUNCTION public\.finance_records_reject_mutation\(\) RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog/u,
    );
    expect(sql).toMatch(
      /CREATE OR REPLACE FUNCTION public\.finance_record_success_audit_outbox_reject_mutation\(\) RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog/u,
    );
    expect(sql).toMatch(
      /CREATE TRIGGER finance_records_append_only BEFORE UPDATE OR DELETE OR TRUNCATE ON public\.finance_records FOR EACH STATEMENT EXECUTE FUNCTION public\.finance_records_reject_mutation\(\)/u,
    );
    expect(sql).toContain(
      "REVOKE ALL ON FUNCTION public.finance_records_reject_mutation() FROM PUBLIC",
    );
    expect(sql).toContain(
      "REVOKE ALL ON FUNCTION public.finance_record_success_audit_outbox_reject_mutation() FROM PUBLIC",
    );
  });

  it("requires a composite migration sentinel for every Finance security trigger", async () => {
    const doctor = await readFile(DOCTOR_PATH, "utf8");

    expect(sentinelProbes["0050_finance_operations_records"]).toEqual({
      tag: "0050_finance_operations_records",
      kind: "all",
      target: "finance_operations_security_triggers",
      allOf: [
        {
          tag: "0050_finance_operations_records",
          kind: "trigger",
          target: "finance_records_append_only",
          table: "finance_records",
          triggerFunction: "finance_records_reject_mutation",
          triggerTiming: "BEFORE",
          triggerLevel: "STATEMENT",
          triggerEvents: ["UPDATE", "DELETE", "TRUNCATE"],
          triggerFunctionBodySha256:
            "25ee2e95f1b3af7dd0364983c52ea676b92022bad137989fda6c99ecc6ea04f8",
          triggerFunctionConfig: ["search_path=pg_catalog"],
          triggerFunctionLanguage: "plpgsql",
          triggerFunctionSecurityDefiner: false,
        },
        {
          tag: "0050_finance_operations_records",
          kind: "trigger",
          target: "finance_records_validate_supersession",
          table: "finance_records",
          triggerFunction: "finance_records_validate_supersession",
          triggerTiming: "BEFORE",
          triggerLevel: "ROW",
          triggerEvents: ["INSERT"],
          triggerFunctionBodySha256:
            "3eaf3dd126968543da171d5c519846435a30090f56c240f4696009324b0035c5",
          triggerFunctionConfig: ["search_path=pg_catalog"],
          triggerFunctionLanguage: "plpgsql",
          triggerFunctionSecurityDefiner: false,
        },
        {
          tag: "0050_finance_operations_records",
          kind: "trigger",
          target: "finance_record_success_audit_outbox_append_only",
          table: "finance_record_success_audit_outbox",
          triggerFunction:
            "finance_record_success_audit_outbox_reject_mutation",
          triggerTiming: "BEFORE",
          triggerLevel: "STATEMENT",
          triggerEvents: ["UPDATE", "DELETE", "TRUNCATE"],
          triggerFunctionBodySha256:
            "ffdc972243ee796fc25cf4dd35a5ce7af2aeb1ccf3606371d6b3ef26c527af3b",
          triggerFunctionConfig: ["search_path=pg_catalog"],
          triggerFunctionLanguage: "plpgsql",
          triggerFunctionSecurityDefiner: false,
        },
      ],
    });
    const migration = await readFile(MIGRATION_PATH, "utf8");
    for (const probe of sentinelProbes["0050_finance_operations_records"]
      ?.allOf ?? []) {
      expect(probe.triggerFunction).toBeDefined();
      expect(probe.triggerFunctionBodySha256).toBe(
        functionBodySha256(migration, probe.triggerFunction ?? ""),
      );
    }
    expect(doctor).toMatch(/probe\.kind === "all"/u);
    expect(doctor).toMatch(/probe\.allOf/u);
    expect(doctor).toMatch(/probe\.kind === "trigger"/u);
    expect(doctor).toMatch(/pg_trigger/u);
    expect(doctor).toMatch(/trigger_record\.tgtype/u);
    expect(doctor).toMatch(/trigger_record\.tgfoid/u);
    expect(doctor).toMatch(/trigger_record\.tgenabled IN \('O', 'A'\)/u);
    expect(doctor).toMatch(/tgisinternal/u);
    expect(doctor).toMatch(/trigger_function\.prosrc/u);
    expect(doctor).toMatch(/trigger_function\.proconfig/u);
    expect(doctor).toMatch(/trigger_function\.prosecdef/u);
    expect(doctor).toMatch(/pg_language/u);
    expect(doctor).toMatch(/createHash\("sha256"\)/u);
  });

  it("requires a database-owned scoped supersession check before a correction can append", async () => {
    const sql = normalizedSql(await readFile(MIGRATION_PATH, "utf8"));

    expect(sql).toMatch(
      /CREATE OR REPLACE FUNCTION public\.finance_records_validate_supersession\(\) RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog/u,
    );
    expect(sql).toContain(
      "REVOKE ALL ON FUNCTION public.finance_records_validate_supersession() FROM PUBLIC",
    );
    expect(sql).toMatch(
      /CREATE TRIGGER finance_records_validate_supersession BEFORE INSERT ON public\.finance_records FOR EACH ROW EXECUTE FUNCTION public\.finance_records_validate_supersession\(\)/u,
    );
    expect(sql).toContain("company_id = NEW.company_id");
    expect(sql).toContain("school_id IS NOT DISTINCT FROM NEW.school_id");
    expect(sql).toContain("record_id = NEW.supersedes_record_id");
    expect(sql).toMatch(/RAISE EXCEPTION[^;]+superseded/u);
  });
});
