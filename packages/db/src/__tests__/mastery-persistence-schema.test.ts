/**
 * Phase S3 Red contract for portable mastery persistence.
 *
 * The suite inspects the public schema barrel, Drizzle metadata, tenant
 * registry, and generated SQL without importing a not-yet-created module.
 * Baseline Red must therefore report missing contracts rather than fail test
 * collection with MODULE_NOT_FOUND.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import * as schema from "../schema/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DB_ROOT = resolve(HERE, "../..");
const REPO_ROOT = resolve(DB_ROOT, "../..");
const MIGRATION_DIR = join(DB_ROOT, "drizzle");
const TENANT_REGISTRY = join(
  REPO_ROOT,
  "packages/domain/src/tenant-registry.ts",
);

type TableContract = {
  exportName: string;
  sqlName: string;
  columns: readonly string[];
  uniqueNames: readonly string[];
  checkNames: readonly string[];
  indexNames: readonly string[];
};

const TABLES: readonly TableContract[] = [
  {
    exportName: "masteryCards",
    sqlName: "mastery_cards",
    columns: [
      "id", "school_id", "student_id", "objective_id", "variant_key",
      "stability", "difficulty", "state", "due_date", "elapsed_days",
      "scheduled_days", "reps", "lapses", "last_review", "params_version",
      "revision", "created_at", "updated_at",
    ],
    uniqueNames: [
      "mastery_cards_school_id_unique",
      "mastery_cards_school_student_objective_variant_unique",
    ],
    checkNames: ["mastery_cards_numeric_bounds_check"],
    indexNames: [
      "mastery_cards_school_student_due_idx",
      "mastery_cards_school_objective_idx",
    ],
  },
  {
    exportName: "masteryReviews",
    sqlName: "mastery_reviews",
    columns: [
      "id", "school_id", "card_id", "student_id", "submission_id", "rating",
      "evidence_json", "state_before_json", "state_after_json", "params_version",
      "reviewed_at", "created_at",
    ],
    uniqueNames: [
      "mastery_reviews_school_id_unique",
      "mastery_reviews_school_card_submission_unique",
    ],
    checkNames: ["mastery_reviews_rating_check"],
    indexNames: [
      "mastery_reviews_school_student_reviewed_idx",
      "mastery_reviews_school_card_reviewed_idx",
    ],
  },
  {
    exportName: "masteryEvidence",
    sqlName: "mastery_evidence",
    columns: [
      "id", "school_id", "review_id", "student_id", "objective_id",
      "variant_key", "source_id", "evidence_ordinal", "evidence_type",
      "retention_strength", "practice_coverage", "evidence_confidence",
      "attempt_count", "provenance_json", "observed_at", "created_at",
    ],
    uniqueNames: ["mastery_evidence_school_source_ordinal_unique"],
    checkNames: ["mastery_evidence_bounds_check"],
    indexNames: [
      "mastery_evidence_school_student_objective_observed_idx",
      "mastery_evidence_school_source_idx",
    ],
  },
  {
    exportName: "masteryStates",
    sqlName: "mastery_states",
    columns: [
      "id", "school_id", "student_id", "objective_id", "mastery_state",
      "mastery_level", "live_retention", "evidence_confidence",
      "graph_release", "revision", "created_at", "updated_at",
    ],
    uniqueNames: ["mastery_states_school_student_objective_unique"],
    checkNames: ["mastery_states_bounds_check"],
    indexNames: [
      "mastery_states_school_student_idx",
      "mastery_states_school_objective_idx",
    ],
  },
  {
    exportName: "masteryPlacements",
    sqlName: "mastery_placements",
    columns: [
      "id", "school_id", "student_id", "objective_id", "mastery_estimate",
      "confidence", "evidence_type", "graph_release", "source_id",
      "replaced_by_direct_at", "placed_at", "created_at", "updated_at",
    ],
    uniqueNames: ["mastery_placements_school_student_objective_release_type_unique"],
    checkNames: ["mastery_placements_bounds_check"],
    indexNames: [
      "mastery_placements_school_student_objective_idx",
      "mastery_placements_school_graph_release_idx",
    ],
  },
  {
    exportName: "masteryCalibrations",
    sqlName: "mastery_calibrations",
    columns: [
      "id", "school_id", "domain", "age_band", "params_version",
      "optimizer_version", "incumbent_params_version", "fsrs_parameters_json",
      "review_count", "student_count", "volume_gate_passed",
      "improves_incumbent", "human_release_approved", "release_eligible",
      "created_at", "updated_at",
    ],
    uniqueNames: ["mastery_calibrations_school_population_version_unique"],
    checkNames: ["mastery_calibrations_release_governance_check"],
    indexNames: ["mastery_calibrations_school_population_idx"],
  },
  {
    exportName: "masteryCommits",
    sqlName: "mastery_commits",
    columns: [
      "id", "school_id", "student_id", "idempotency_key", "request_id",
      "actor_id", "source_type", "source_id", "contract_version",
      "graph_release", "params_version", "status", "result_digest",
      "result_json", "created_at", "updated_at",
    ],
    uniqueNames: ["mastery_commits_school_idempotency_unique"],
    checkNames: ["mastery_commits_status_check"],
    indexNames: [
      "mastery_commits_school_student_created_idx",
      "mastery_commits_school_request_idx",
    ],
  },
] as const;

const schemaExports = schema as Record<string, unknown>;

function tableFor(contract: TableContract): PgTable | undefined {
  return schemaExports[contract.exportName] as PgTable | undefined;
}

function metadataNames(
  values: readonly unknown[],
  fallbackKey: "name" | "config",
): string[] {
  return values
    .map((value) => {
      const record = value as { name?: string; config?: { name?: string } };
      return fallbackKey === "name" ? record.name : record.config?.name;
    })
    .filter((value): value is string => typeof value === "string")
    .sort();
}

describe("Phase S3 mastery persistence schema barrel", () => {
  it("exports exactly the seven required mastery tables", () => {
    expect(
      TABLES.map(({ exportName }) => exportName).filter(
        (exportName) => schemaExports[exportName] !== undefined,
      ),
      "schema/index.ts must re-export all seven tables from schema/mastery.ts",
    ).toEqual(TABLES.map(({ exportName }) => exportName));
  });
});

describe.each(TABLES)("$sqlName Drizzle contract", (contract) => {
  it("exists with the exact SQL name and column set", () => {
    const table = tableFor(contract);
    expect(table, `${contract.exportName} is missing from the schema barrel`).toBeDefined();
    if (!table) return;
    const config = getTableConfig(table);
    expect(config.name).toBe(contract.sqlName);
    expect(config.columns.map(({ name }) => name).sort()).toEqual(
      [...contract.columns].sort(),
    );
    expect(config.columns.find(({ name }) => name === "school_id")?.notNull).toBe(true);
  });

  it("declares the exact unique, check, and index names", () => {
    const table = tableFor(contract);
    expect(table, `${contract.exportName} is missing from the schema barrel`).toBeDefined();
    if (!table) return;
    const config = getTableConfig(table);
    expect(metadataNames(config.uniqueConstraints, "name")).toEqual(
      [...contract.uniqueNames].sort(),
    );
    expect(metadataNames(config.checks, "name")).toEqual(
      [...contract.checkNames].sort(),
    );
    expect(metadataNames(config.indexes, "config")).toEqual(
      [...contract.indexNames].sort(),
    );
  });
});

describe("Phase S3 school-scoped relationships", () => {
  it("uses composite (school_id, parent_id) foreign keys for review and evidence ownership", () => {
    const expected = [
      ["mastery_reviews_school_card_fk", "masteryReviews"],
      ["mastery_evidence_school_review_fk", "masteryEvidence"],
    ] as const;
    for (const [foreignKeyName, exportName] of expected) {
      const table = schemaExports[exportName] as PgTable | undefined;
      expect(table, `${exportName} is missing from the schema barrel`).toBeDefined();
      if (!table) continue;
      const foreignKey = getTableConfig(table).foreignKeys.find(
        (candidate) => candidate.getName() === foreignKeyName,
      );
      expect(foreignKey, `${foreignKeyName} is missing`).toBeDefined();
      if (!foreignKey) continue;
      const reference = foreignKey.reference();
      expect(reference.columns.map(({ name }) => name)).toEqual([
        "school_id",
        exportName === "masteryReviews" ? "card_id" : "review_id",
      ]);
      expect(reference.foreignColumns.map(({ name }) => name)).toEqual([
        "school_id",
        "id",
      ]);
    }
  });
});

describe("Phase S3 tenant registry coverage", () => {
  it("imports and registers all seven tables as FLAT", () => {
    const source = readFileSync(TENANT_REGISTRY, "utf8");
    for (const { exportName } of TABLES) {
      expect(source, `tenant-registry.ts must import ${exportName}`).toMatch(
        new RegExp(`\\b${exportName}\\b`),
      );
      expect(source, `tenant-registry.ts must register ${exportName} as FLAT`).toMatch(
        new RegExp(`register\\(\\s*${exportName}\\s*,\\s*["']FLAT["']\\s*\\)`),
      );
    }
  });
});

describe("Phase S3 generated migration", () => {
  it("creates all seven tables and named constraints without destructive SQL", () => {
    const migrationNames = readdirSync(MIGRATION_DIR).filter((name) =>
      /^\d{4}_.*mastery.*persistence.*\.sql$/i.test(name),
    );
    expect(
      migrationNames,
      "generate one reviewed ####_*mastery*persistence*.sql migration",
    ).toHaveLength(1);
    if (migrationNames.length !== 1) return;
    const sql = readFileSync(join(MIGRATION_DIR, migrationNames[0]!), "utf8");

    for (const contract of TABLES) {
      expect(sql, `migration must create ${contract.sqlName}`).toMatch(
        new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?["']?${contract.sqlName}["']?`, "i"),
      );
      for (const name of [
        ...contract.uniqueNames,
        ...contract.checkNames,
        ...contract.indexNames,
      ]) {
        expect(sql, `migration must include ${name}`).toContain(name);
      }
    }
    expect(sql).toContain("mastery_reviews_school_card_fk");
    expect(sql).toContain("mastery_evidence_school_review_fk");
    expect(sql).not.toMatch(/\bDROP\s+(?:TABLE|COLUMN|SCHEMA|DATABASE|TYPE)\b/i);
    expect(sql).not.toMatch(/\bTRUNCATE\b|\bDELETE\s+FROM\b/i);
  });

  it("does not accept a hand-written migration without the generated schema snapshot", () => {
    const schemaSource = join(DB_ROOT, "src/schema/mastery.ts");
    expect(existsSync(schemaSource), "schema/mastery.ts must own the generated migration").toBe(true);
  });
});
