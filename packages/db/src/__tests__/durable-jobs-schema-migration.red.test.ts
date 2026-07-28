import {
  existsSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { durableJobInvalidRowFixtures } from "./fixtures/durable-job-transition-counterexamples.js";

const PACKAGE_ROOT = resolve(import.meta.dirname, "../..");
const REPOSITORY_ROOT = resolve(PACKAGE_ROOT, "../..");
const DRIZZLE_ROOT = resolve(PACKAGE_ROOT, "drizzle");
const SCHEMA_PATH = resolve(PACKAGE_ROOT, "src/schema/jobs.ts");
const SCHEMA_BARREL_PATH = resolve(PACKAGE_ROOT, "src/schema/index.ts");
const TENANT_REGISTRY_PATH = resolve(
  REPOSITORY_ROOT,
  "packages/domain/src/tenant-registry.ts",
);
const OWNERSHIP_MAP_PATH = resolve(
  REPOSITORY_ROOT,
  "packages/architecture-enforcement/src/config/ownership-map.v1.json",
);

const migrationNames = readdirSync(DRIZZLE_ROOT)
  .filter((name) => /^\d+_durable_jobs(?:_platform)?\.sql$/.test(name))
  .sort();
const migrationPath = migrationNames.length === 1
  ? resolve(DRIZZLE_ROOT, migrationNames[0]!)
  : undefined;
const migrationSql = migrationPath === undefined
  ? ""
  : readFileSync(migrationPath, "utf8");
const normalizedSql = migrationSql.replace(/\s+/g, " ");
const schemaSource = existsSync(SCHEMA_PATH) ? readFileSync(SCHEMA_PATH, "utf8") : "";
const schemaBarrel = readFileSync(SCHEMA_BARREL_PATH, "utf8");
const tenantRegistry = readFileSync(TENANT_REGISTRY_PATH, "utf8");
const ownershipMap = JSON.parse(readFileSync(OWNERSHIP_MAP_PATH, "utf8")) as {
  rules: Array<{ id: string; ownershipRootIds: string[] }>;
  ownershipRoots: Array<{ id: string; path: string }>;
};

/**
 * Extracts one CREATE TABLE statement for bounded source-contract assertions.
 * @param tableName PostgreSQL table name.
 * @returns The table statement, or an empty string while Task 11 is absent.
 */
function tableStatement(tableName: string): string {
  const marker = `CREATE TABLE "${tableName}"`;
  const start = migrationSql.indexOf(marker);
  if (start < 0) return "";
  const end = migrationSql.indexOf("\n);", start);
  return end < 0 ? migrationSql.slice(start) : migrationSql.slice(start, end + 3);
}

describe("Task 6 Red durable-jobs schema and migration contract", () => {
  it("requires exactly one governed durable-jobs migration and journal entry", () => {
    expect(
      migrationNames,
      "Intentional Red: Task 11 has not added the reviewed durable-jobs migration.",
    ).toHaveLength(1);
    const journal = JSON.parse(
      readFileSync(resolve(DRIZZLE_ROOT, "meta/_journal.json"), "utf8"),
    ) as { entries: Array<{ tag: string }> };
    const tag = migrationNames[0]?.replace(/\.sql$/, "");
    expect(
      journal.entries.filter((entry) => entry.tag === tag),
      "The durable-jobs migration must be represented exactly once in the Drizzle journal.",
    ).toHaveLength(1);
  });

  it("requires the dedicated jobs schema module and barrel export", () => {
    expect(
      existsSync(SCHEMA_PATH),
      "Intentional Red: Task 11 has not added packages/db/src/schema/jobs.ts.",
    ).toBe(true);
    expect(schemaBarrel).toContain('export * from "./jobs.js";');
    for (const exportName of [
      "durableJobs",
      "durableJobAuditEvents",
      "reviewJobAdoptionAuditEvents",
      "reviewJobDurableBindings",
      "reviewJobDurableAdoption",
      "reviewJobMigrationIssues",
    ]) {
      expect(schemaSource, `Missing Drizzle export ${exportName}.`).toContain(
        `export const ${exportName}`,
      );
    }
  });

  it("declares the complete durable_jobs row without persisting a raw lease token", () => {
    const requiredColumns = [
      "id",
      "job_name",
      "queue_name",
      "tenant_mode",
      "tenant_id",
      "idempotency_key",
      "payload_json",
      "payload_fingerprint",
      "state",
      "attempt",
      "max_attempts",
      "available_at",
      "lease_token_hash",
      "lease_owner",
      "lease_expires_at",
      "redeliver_current_attempt",
      "rerun_requested",
      "rerun_queue_name",
      "rerun_payload_json",
      "rerun_payload_fingerprint",
      "rerun_max_attempts",
      "rerun_available_at",
      "result_json",
      "last_error_code",
      "last_error_summary",
      "completed_at",
      "generation",
      "created_at",
      "updated_at",
    ];
    const table = tableStatement("durable_jobs");

    expect(table, "Intentional Red: durable_jobs table is absent.").not.toBe("");
    for (const column of requiredColumns) {
      expect(table, `durable_jobs is missing column ${column}.`).toContain(`"${column}"`);
    }
    expect(
      `${schemaSource}\n${table}`,
      "Only lease_token_hash may be durable; a raw lease_token column is forbidden.",
    ).not.toMatch(/["'`]lease_token["'`]/);
  });

  it("declares every named check required by all invalid-row fixtures", () => {
    const fixtureConstraintNames = [
      ...new Set(durableJobInvalidRowFixtures.map(({ expectedConstraint }) => expectedConstraint)),
    ].sort();
    const requiredBounds = [
      "durable_jobs_job_name_check",
      "durable_jobs_queue_name_check",
      "durable_jobs_idempotency_key_check",
      "durable_jobs_worker_id_check",
      "durable_jobs_safe_error_check",
      "durable_jobs_hash_format_check",
    ];

    expect(
      fixtureConstraintNames,
      "Fixture coverage must remain non-vacuous.",
    ).toEqual([
      "durable_jobs_attempt_bounds_check",
      "durable_jobs_generation_check",
      "durable_jobs_lease_tuple_check",
      "durable_jobs_redelivery_state_check",
      "durable_jobs_rerun_state_check",
      "durable_jobs_rerun_tuple_check",
      "durable_jobs_safe_error_tuple_check",
      "durable_jobs_state_truth_table_check",
      "durable_jobs_tenant_scope_check",
    ]);
    for (const constraint of [...fixtureConstraintNames, ...requiredBounds]) {
      expect(
        migrationSql,
        `Intentional Red: migration is missing named check ${constraint}.`,
      ).toContain(`"${constraint}"`);
    }
  });

  it("uses two mode-specific partial unique identities and excludes queue_name", () => {
    expect(normalizedSql).toMatch(
      /CREATE UNIQUE INDEX "durable_jobs_global_identity_unique" ON "durable_jobs"[^;]*\("job_name",\s*"idempotency_key"\)[^;]*WHERE[^;]*"tenant_mode"\s*=\s*'global'/i,
    );
    expect(normalizedSql).toMatch(
      /CREATE UNIQUE INDEX "durable_jobs_tenant_identity_unique" ON "durable_jobs"[^;]*\("job_name",\s*"tenant_id",\s*"idempotency_key"\)[^;]*WHERE[^;]*"tenant_mode"\s*=\s*'tenant'/i,
    );
    for (const indexName of [
      "durable_jobs_global_identity_unique",
      "durable_jobs_tenant_identity_unique",
    ]) {
      const indexStatement = normalizedSql.match(
        new RegExp(`CREATE UNIQUE INDEX "${indexName}"[^;]*;`, "i"),
      )?.[0] ?? "";
      expect(indexStatement, `${indexName} must not fork identity by queue.`).not.toContain(
        '"queue_name"',
      );
    }
  });

  it("declares the exact claim, reclaim, and dead-list partial index families", () => {
    const expectedIndexes = [
      ["durable_jobs_global_due_claim_idx", ["queue_name", "available_at", "id"], "pending", "global"],
      ["durable_jobs_tenant_due_claim_idx", ["tenant_id", "queue_name", "available_at", "id"], "pending", "tenant"],
      ["durable_jobs_global_reclaim_queue_idx", ["queue_name", "lease_expires_at", "id"], "running", "global"],
      ["durable_jobs_global_reclaim_idx", ["lease_expires_at", "id"], "running", "global"],
      ["durable_jobs_tenant_reclaim_queue_idx", ["tenant_id", "queue_name", "lease_expires_at", "id"], "running", "tenant"],
      ["durable_jobs_tenant_reclaim_idx", ["tenant_id", "lease_expires_at", "id"], "running", "tenant"],
      ["durable_jobs_global_dead_list_idx", ["queue_name", "updated_at", "id"], "dead", "global"],
      ["durable_jobs_tenant_dead_list_idx", ["tenant_id", "queue_name", "updated_at", "id"], "dead", "tenant"],
    ] as const;

    for (const [name, columns, state, mode] of expectedIndexes) {
      const statement = normalizedSql.match(
        new RegExp(`CREATE INDEX "${name}"[^;]*;`, "i"),
      )?.[0] ?? "";
      expect(statement, `Intentional Red: missing index ${name}.`).not.toBe("");
      let cursor = -1;
      for (const column of columns) {
        const next = statement.indexOf(`"${column}"`, cursor + 1);
        expect(next, `${name} must preserve reviewed column order.`).toBeGreaterThan(cursor);
        cursor = next;
      }
      expect(statement).toContain(`'${state}'`);
      expect(statement).toContain(`'${mode}'`);
    }
  });

  it("declares bounded bridge, control, issue, and separate audit table shapes", () => {
    const tableColumns: Readonly<Record<string, readonly string[]>> = {
      durable_job_audit_events: [
        "id", "requested_job_id", "tenant_mode", "tenant_id", "action", "outcome",
        "prior_state", "actor", "authorization_decision_id", "authorization_decided_at",
        "reason", "correlation_id", "created_at",
      ],
      review_job_adoption_audit_events: [
        "id", "from_mode", "to_mode", "prior_generation", "new_generation", "actor",
        "authorization_decision_id", "authorization_decided_at", "reason", "correlation_id", "created_at",
      ],
      review_job_durable_bindings: [
        "review_job_id", "durable_job_id", "created_at", "created_by", "correlation_id",
      ],
      review_job_durable_adoption: [
        "control_key", "mode", "generation", "updated_at", "updated_by",
      ],
      review_job_migration_issues: [
        "review_job_id", "preflight_run_id", "code", "field_group", "detected_at",
        "resolution_status", "resolution_code", "resolver_subject", "resolved_at",
      ],
    };

    for (const [tableName, columns] of Object.entries(tableColumns)) {
      const statement = tableStatement(tableName);
      expect(statement, `Intentional Red: missing table ${tableName}.`).not.toBe("");
      for (const column of columns) {
        expect(statement, `${tableName} is missing column ${column}.`).toContain(`"${column}"`);
      }
    }
    expect(tableStatement("review_job_durable_bindings")).toMatch(
      /UNIQUE[^\n]*"durable_job_id"|"durable_job_id"[^\n]*UNIQUE/i,
    );
    expect(migrationSql).toContain('"review_job_migration_issues_review_job_code_unique"');
    expect(tableStatement("review_job_migration_issues")).not.toMatch(
      /"(?:payload|normalized_identity|raw_value|raw_error|sql|url|detail)"/i,
    );
  });

  it("declares only allowed adoption CAS edges and a monotonic generation check", () => {
    expect(migrationSql).toContain('"review_job_adoption_generation_check"');
    expect(migrationSql).toContain('"review_job_adoption_edge_check"');
    for (const edge of [
      "legacy:shadow",
      "shadow:legacy",
      "shadow:paused",
      "paused:shadow",
      "paused:generic",
      "generic:paused",
      "paused:legacy",
    ]) {
      expect(migrationSql, `Allowed adoption edge ${edge} must be database-declared.`).toContain(edge);
    }
    expect(migrationSql).not.toContain("legacy:generic");
    expect(migrationSql).not.toContain("generic:legacy");
  });

  it("declares database-owned append-only replay and control audit privileges and triggers", () => {
    expect(normalizedSql).toMatch(/CREATE ROLE "?durable_job_audit_owner"?[^;]*NOLOGIN/i);
    for (const tableName of [
      "durable_job_audit_events",
      "review_job_adoption_audit_events",
    ]) {
      expect(normalizedSql).toMatch(
        new RegExp(`ALTER TABLE "${tableName}" OWNER TO "?durable_job_audit_owner"?`, "i"),
      );
      expect(normalizedSql).toMatch(
        new RegExp(`REVOKE ALL(?: PRIVILEGES)? ON(?: TABLE)? "${tableName}" FROM PUBLIC`, "i"),
      );
      expect(normalizedSql).toMatch(
        new RegExp(`GRANT INSERT(?:, SELECT)? ON(?: TABLE)? "${tableName}" TO "?durable_job_[a-z_]+_runtime"?`, "i"),
      );
      expect(normalizedSql).toMatch(
        new RegExp(`CREATE TRIGGER "${tableName}_reject_update_delete" BEFORE UPDATE OR DELETE ON "${tableName}"`, "i"),
      );
      expect(normalizedSql).toMatch(
        new RegExp(`CREATE TRIGGER "${tableName}_reject_truncate" BEFORE TRUNCATE ON "${tableName}"`, "i"),
      );
    }
    expect(normalizedSql).toMatch(/SET search_path\s*=\s*pg_catalog/i);
    expect(normalizedSql).toMatch(/REVOKE EXECUTE ON FUNCTION[^;]+FROM PUBLIC/i);
    expect(normalizedSql).not.toMatch(/GRANT (?:UPDATE|DELETE|TRUNCATE)[^;]+durable_job_[a-z_]+_runtime/i);
  });

  it("classifies every mixed-scope queue/adoption table as REFERENTIAL", () => {
    for (const exportName of [
      "durableJobs",
      "durableJobAuditEvents",
      "reviewJobAdoptionAuditEvents",
      "reviewJobDurableBindings",
      "reviewJobDurableAdoption",
      "reviewJobMigrationIssues",
    ]) {
      expect(tenantRegistry, `Tenant registry must import ${exportName}.`).toMatch(
        new RegExp(`\\b${exportName}\\b`),
      );
      expect(
        tenantRegistry,
        `${exportName} must fail closed through TenantDB as REFERENTIAL.`,
      ).toMatch(new RegExp(`register\\(${exportName},\\s*"REFERENTIAL"\\)`));
    }
  });

  it("keeps queue SQL ownership at the exact approved PostgreSQL adapter root", () => {
    const rule = ownershipMap.rules.find(({ id }) => id === "DURABLE_JOB_DATABASE_BOUNDARY");
    const adapterRoot = ownershipMap.ownershipRoots.find(
      ({ id }) => id === "postgres-job-adapter",
    );

    expect(rule?.ownershipRootIds).toEqual([
      "database-schema",
      "database-migrations",
      "postgres-job-adapter",
    ]);
    expect(adapterRoot?.path).toBe("packages/backend/src/jobs/adapters/postgres/");
  });
});
