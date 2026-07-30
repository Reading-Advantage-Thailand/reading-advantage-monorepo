import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { sentinelProbes } from "../sentinels.js";
import { standardPackSuccessorAdmissionReceipts } from "../schema/index.js";

const PACKAGE_ROOT = resolve(import.meta.dirname, "../..");

describe("standard-pack successor admission receipt persistence", () => {
  it("exports an immutable global receipt shape with actor-scoped idempotency", () => {
    const config = getTableConfig(standardPackSuccessorAdmissionReceipts);
    const columns = config.columns.map((column) => column.name);
    const uniqueNames = config.uniqueConstraints.map((constraint) => constraint.name);
    const checkNames = config.checks.map((constraint) => constraint.name);

    expect(columns).toEqual(expect.arrayContaining([
      "commitment_digest",
      "candidate_digest",
      "actor_id",
      "policy_id",
      "idempotency_key_fingerprint",
      "request_input_digest",
      "correlation_id",
      "outcome",
      "safe_audit_json",
      "observability_json",
      "receipt_json",
      "recorded_at",
    ]));
    expect(columns).not.toContain("school_id");
    expect(uniqueNames).toContain(
      "standard_pack_successor_admission_receipts_actor_idempotency_unique",
    );
    expect(checkNames).toEqual(expect.arrayContaining([
      "standard_pack_successor_admission_receipts_digest_format_check",
      "standard_pack_successor_admission_receipts_identity_format_check",
      "standard_pack_successor_admission_receipts_outcome_check",
      "standard_pack_successor_admission_receipts_json_object_check",
      "standard_pack_successor_admission_receipts_receipt_projection_check",
      "standard_pack_successor_admission_receipts_receipt_contract_check",
    ]));
  });

  it("ships a generated integrity migration with a registry-identity sentinel", () => {
    const migration = readFileSync(
      resolve(
        PACKAGE_ROOT,
        "drizzle/0046_standard_pack_successor_admission_receipt_integrity.sql",
      ),
      "utf8",
    );
    const journal = JSON.parse(readFileSync(
      resolve(PACKAGE_ROOT, "drizzle/meta/_journal.json"),
      "utf8",
    )) as { entries: Array<{ idx: number; when: number; tag: string }> };
    const prior = journal.entries.find((entry) => entry.idx === 44);
    const successor = journal.entries.find((entry) => entry.idx === 45);
    const integrity = journal.entries.find((entry) => entry.idx === 46);

    expect(migration).toContain(
      "standard_pack_successor_admission_receipts_commitment_candidate_registry_fk",
    );
    expect(migration).toContain(
      "standard_pack_successor_commitments_commitment_candidate_unique",
    );
    expect(migration).toContain(
      "standard_pack_successor_admission_receipts_receipt_contract_check",
    );
    expect(migration).toContain("?& ARRAY");
    expect(migration).toContain("IS NOT DISTINCT FROM");
    expect(migration).toContain("safe_audit_json");
    expect(migration).toContain("observability_json");
    expect(migration).toContain(
      "jsonb_typeof(\"standard_pack_successor_admission_receipts\".\"receipt_json\" -> 'schemaVersion') = 'number'",
    );
    expect(migration).toContain(
      "jsonb_typeof(\"standard_pack_successor_admission_receipts\".\"safe_audit_json\" -> 'actorId') = 'string'",
    );
    expect(migration).toContain(
      "(\"standard_pack_successor_admission_receipts\".\"observability_json\" ->> 'predecessorIndexDigest') ~ '^[a-f0-9]{64}$'",
    );
    expect(prior?.tag).toBe("0044_standard_pack_successor_commitments");
    expect(successor?.tag).toBe("0045_standard_pack_successor_admission_receipts");
    expect(integrity?.tag).toBe("0046_standard_pack_successor_admission_receipt_integrity");
    expect(integrity!.when).toBeGreaterThan(successor!.when);
    expect(migration.indexOf("standard_pack_successor_commitments_commitment_candidate_unique")).toBeLessThan(
      migration.indexOf("standard_pack_successor_admission_receipts_commitment_candidate_registry_fk"),
    );
    expect(sentinelProbes["0045_standard_pack_successor_admission_receipts"]).toEqual({
      tag: "0045_standard_pack_successor_admission_receipts",
      kind: "table",
      target: "standard_pack_successor_admission_receipts",
    });
    expect(sentinelProbes["0046_standard_pack_successor_admission_receipt_integrity"]).toEqual({
      tag: "0046_standard_pack_successor_admission_receipt_integrity",
      kind: "unique_constraint",
      target: "standard_pack_successor_commitments_commitment_candidate_unique",
      table: "standard_pack_successor_commitments",
      columns: ["commitment_digest", "candidate_digest"],
    });
  });
});
