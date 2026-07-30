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
    ]));
  });

  it("ships a generated migration with append-only receipt protection and a sentinel", () => {
    const migration = readFileSync(
      resolve(
        PACKAGE_ROOT,
        "drizzle/0045_standard_pack_successor_admission_receipts.sql",
      ),
      "utf8",
    );
    const journal = JSON.parse(readFileSync(
      resolve(PACKAGE_ROOT, "drizzle/meta/_journal.json"),
      "utf8",
    )) as { entries: Array<{ idx: number; when: number; tag: string }> };
    const prior = journal.entries.find((entry) => entry.idx === 44);
    const successor = journal.entries.find((entry) => entry.idx === 45);

    expect(migration).toContain(
      'CREATE TABLE "standard_pack_successor_admission_receipts"',
    );
    expect(migration).toContain(
      "standard_pack_successor_admission_receipts_actor_idempotency_unique",
    );
    expect(migration).toContain(
      "standard_pack_successor_admission_receipts_commitment_digest_standard_pack_successor_commitments_commitment_digest_fk",
    );
    expect(migration).toContain(
      "standard_pack_successor_admission_receipts_json_object_check",
    );
    expect(migration).toContain(
      "standard_pack_successor_admission_receipts_receipt_projection_check",
    );
    expect(migration).toContain("jsonb_typeof");
    expect(migration).toContain("IS NOT DISTINCT FROM");
    expect(migration).toContain(
      "(\"standard_pack_successor_admission_receipts\".\"receipt_json\" ->> 'recordedAt')::timestamptz IS NOT DISTINCT FROM \"standard_pack_successor_admission_receipts\".\"recorded_at\"",
    );
    expect(migration).toContain(
      '"recorded_at" timestamp with time zone NOT NULL',
    );
    expect(migration).not.toContain(
      '"recorded_at" timestamp with time zone DEFAULT now() NOT NULL',
    );
    expect(migration).toContain(
      "standard_pack_successor_admission_receipts_immutable",
    );
    expect(migration).toContain("BEFORE UPDATE OR DELETE OR TRUNCATE");
    expect(migration).toContain(
      "REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.standard_pack_successor_admission_receipts FROM app_user",
    );
    expect(prior?.tag).toBe("0044_standard_pack_successor_commitments");
    expect(successor?.tag).toBe("0045_standard_pack_successor_admission_receipts");
    expect(successor!.when).toBeGreaterThan(prior!.when);
    expect(sentinelProbes["0045_standard_pack_successor_admission_receipts"]).toEqual({
      tag: "0045_standard_pack_successor_admission_receipts",
      kind: "table",
      target: "standard_pack_successor_admission_receipts",
    });
  });
});
