import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { sentinelProbes } from "../sentinels.js";
import { standardPackSuccessorCommitments } from "../schema/index.js";

const PACKAGE_ROOT = resolve(import.meta.dirname, "../..");

describe("standard-pack successor commitment persistence", () => {
  it("exports one global immutable record shape with canonical uniqueness keys", () => {
    const config = getTableConfig(standardPackSuccessorCommitments);
    const columns = config.columns.map((column) => column.name);
    const uniqueNames = config.uniqueConstraints.map((constraint) =>
      constraint.name,
    );
    const checkNames = config.checks.map((constraint) => constraint.name);

    expect(columns).toEqual(expect.arrayContaining([
      "predecessor_index_digest",
      "successor_batch_digest",
      "candidate_revision",
      "candidate_json",
      "commitment_json",
      "reserved_at",
    ]));
    expect(columns).not.toContain("school_id");
    expect(uniqueNames).toEqual(expect.arrayContaining([
      "standard_pack_successor_commitments_predecessor_index_unique",
      "standard_pack_successor_commitments_successor_batch_digest_unique",
      "standard_pack_successor_commitments_commitment_digest_unique",
    ]));
    expect(checkNames).toEqual(expect.arrayContaining([
      "standard_pack_successor_commitments_digest_format_check",
      "standard_pack_successor_commitments_candidate_revision_format_check",
      "standard_pack_successor_commitments_successor_release_progress_check",
      "standard_pack_successor_commitments_json_object_check",
      "standard_pack_successor_commitments_candidate_projection_check",
      "standard_pack_successor_commitments_commitment_projection_check",
    ]));
  });

  it("ships an append-only migration and a migration-doctor sentinel", () => {
    const migration = readFileSync(
      resolve(
        PACKAGE_ROOT,
        "drizzle/0044_standard_pack_successor_commitments.sql",
      ),
      "utf8",
    );
    const journal = JSON.parse(readFileSync(
      resolve(PACKAGE_ROOT, "drizzle/meta/_journal.json"),
      "utf8",
    )) as { entries: Array<{ idx: number; when: number; tag: string }> };
    const prior = journal.entries.find((entry) => entry.idx === 43);
    const successor = journal.entries.find((entry) => entry.idx === 44);

    expect(migration).toContain('CREATE TABLE "standard_pack_successor_commitments"');
    expect(migration).toContain(
      "standard_pack_successor_commitments_predecessor_index_unique",
    );
    expect(migration).toContain(
      "standard_pack_successor_commitments_successor_batch_digest_unique",
    );
    expect(migration).toContain("standard_pack_successor_commitments_immutable");
    expect(migration).toContain(
      "standard_pack_successor_commitments_json_object_check",
    );
    expect(migration).toContain(
      "standard_pack_successor_commitments_candidate_projection_check",
    );
    expect(migration).toContain(
      "standard_pack_successor_commitments_commitment_projection_check",
    );
    expect(migration).toContain("jsonb_typeof");
    expect(migration).toContain("IS NOT DISTINCT FROM");
    for (const projection of [
      '("candidate_json" ->> \'predecessorIndexDigest\') IS NOT DISTINCT FROM "predecessor_index_digest"',
      '(("candidate_json" -> \'predecessorRelease\') ->> \'catalogDigest\') IS NOT DISTINCT FROM "predecessor_catalog_digest"',
      '(("candidate_json" -> \'successorRelease\') ->> \'sourceReceiptDigest\') IS NOT DISTINCT FROM "successor_source_receipt_digest"',
      '(("candidate_json" -> \'gitCandidate\') ->> \'revision\') IS NOT DISTINCT FROM "candidate_revision"',
      '("candidate_json" ->> \'candidateDigest\') IS NOT DISTINCT FROM "candidate_digest"',
      '("commitment_json" ->> \'predecessorIndexDigest\') IS NOT DISTINCT FROM "predecessor_index_digest"',
      '(("commitment_json" -> \'predecessorRelease\') ->> \'catalogDigest\') IS NOT DISTINCT FROM "predecessor_catalog_digest"',
      '(("commitment_json" -> \'successorRelease\') ->> \'sourceReceiptDigest\') IS NOT DISTINCT FROM "successor_source_receipt_digest"',
      '("commitment_json" ->> \'commitmentDigest\') IS NOT DISTINCT FROM "commitment_digest"',
    ]) {
      expect(migration).toContain(projection);
    }
    expect(migration).toContain("BEFORE UPDATE OR DELETE OR TRUNCATE");
    expect(migration).toContain(
      "REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.standard_pack_successor_commitments FROM app_user",
    );
    expect(prior?.tag).toBe("0043_codecamp_company_principal_sync");
    expect(successor?.tag).toBe("0044_standard_pack_successor_commitments");
    expect(successor!.when).toBeGreaterThan(prior!.when);
    expect(sentinelProbes["0044_standard_pack_successor_commitments"]).toEqual({
      tag: "0044_standard_pack_successor_commitments",
      kind: "table",
      target: "standard_pack_successor_commitments",
    });
  });
});
