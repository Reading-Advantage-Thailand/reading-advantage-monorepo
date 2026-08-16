import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createSalesMasteryPostgres16Harness,
  runSalesMigrationChainOnPostgres16,
  type SalesMasteryPostgres16Harness,
} from "./sales-mastery-postgres16-harness.js";

const PACKAGE_ROOT = resolve(import.meta.dirname, "../..");
const DRIZZLE_ROOT = resolve(PACKAGE_ROOT, "drizzle");
const META_ROOT = resolve(DRIZZLE_ROOT, "meta");
const JOURNAL_PATH = resolve(META_ROOT, "_journal.json");
const MIGRATION_PATH = resolve(
  PACKAGE_ROOT,
  "drizzle/0052_sales_mastery_tenant_mapping.sql",
);
const TENANT_REGISTRY_PATH = resolve(
  PACKAGE_ROOT,
  "../domain/src/tenant-registry.ts",
);
const PG_TEST_URL = process.env.PG_TEST_URL?.trim();
const liveBehavior = PG_TEST_URL ? describe : describe.skip;

const ORGANIZATION_A = "20000000-0000-4000-8000-000000000101";
const ORGANIZATION_B = "20000000-0000-4000-8000-000000000102";
const ORGANIZATION_C = "20000000-0000-4000-8000-000000000103";
const TENANT_A = "30000000-0000-4000-8000-000000000101";
const TENANT_B = "30000000-0000-4000-8000-000000000102";
const LEARNER_A = "sales:00000000-0000-4000-8000-000000000101";
const CODECAMP_NAMESPACE = "c0deca00-0000-4000-8000-000000000001";
const DIGEST_A = `sha256:${"a".repeat(64)}`;
const DIGEST_B = `sha256:${"b".repeat(64)}`;

interface JournalEntry {
  readonly idx: number;
  readonly tag: string;
  readonly when: number;
}

interface Journal {
  readonly entries: readonly JournalEntry[];
}

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

/** Reads the committed Drizzle migration journal. */
async function readJournal(): Promise<Journal> {
  return JSON.parse(await readFile(JOURNAL_PATH, "utf8")) as Journal;
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
    expect(sql).toContain(CODECAMP_NAMESPACE);
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

  it("keeps migration numbers unique and serial", async () => {
    const journal = await readJournal();
    const migrationNumbers = journal.entries.map(({ tag }) => tag.slice(0, 4));
    expect(
      new Set(migrationNumbers).size,
      "Green must renumber the colliding 0052 migrations",
    ).toBe(migrationNumbers.length);
    expect(new Set(journal.entries.map(({ idx }) => idx)).size).toBe(
      journal.entries.length,
    );
    expect(new Set(journal.entries.map(({ when }) => when)).size).toBe(
      journal.entries.length,
    );
  });

  it("keeps the Sales snapshot linked to the prior journal snapshot", async () => {
    const journal = await readJournal();
    const salesEntry = journal.entries.find(
      ({ tag }) => tag === "0052_sales_mastery_tenant_mapping",
    );
    expect(salesEntry).toBeDefined();
    if (!salesEntry) return;

    const previousEntry = journal.entries.find(
      ({ idx }) => idx === salesEntry.idx - 1,
    );
    expect(previousEntry).toBeDefined();
    if (!previousEntry) return;

    const previousSnapshot = JSON.parse(
      await readFile(
        resolve(META_ROOT, `${previousEntry.tag.slice(0, 4)}_snapshot.json`),
        "utf8",
      ),
    ) as { readonly id: string };
    const salesSnapshot = JSON.parse(
      await readFile(resolve(META_ROOT, "0053_snapshot.json"), "utf8"),
    ) as { readonly prevId: string };
    expect(
      salesSnapshot.prevId,
      "Green must repair the Sales snapshot parent chain",
    ).toBe(previousSnapshot.id);
  });
});

/** Inserts one dedicated Sales mapping fixture. */
async function insertMapping(
  harness: SalesMasteryPostgres16Harness,
  organizationId: string,
  organizationKey: string,
  masteryTenantKey: string,
): Promise<void> {
  await harness.sql`
    INSERT INTO sales_mastery_tenant_mappings (
      application_key,
      organization_id,
      organization_key,
      mastery_tenant_key,
      source_tenant_key,
      provisioned_by,
      request_id
    ) VALUES (
      'sales',
      ${organizationId},
      ${organizationKey},
      ${masteryTenantKey},
      ${`sales:${organizationId}`},
      'phase2-red',
      ${`request:${organizationId}`}
    )
  `;
}

/** Inserts one immutable projection outbox fixture and returns its ID. */
async function insertOutbox(
  harness: SalesMasteryPostgres16Harness,
  input: {
    readonly organizationId: string;
    readonly organizationKey: string;
    readonly masteryTenantKey: string;
    readonly sourceAttemptId: string;
    readonly idempotencyKey: string;
    readonly payloadDigest: string;
  },
): Promise<string> {
  const [row] = await harness.sql<{ id: string }[]>`
    INSERT INTO sales_mastery_projection_outbox (
      application_key,
      organization_id,
      organization_key,
      mastery_tenant_key,
      source_tenant_key,
      learner_principal_id,
      source_application,
      source_attempt_id,
      idempotency_key,
      graph_release,
      bindings_digest,
      rubric_version,
      request_id,
      correlation_id,
      payload_digest,
      payload_json
    ) VALUES (
      'sales',
      ${input.organizationId},
      ${input.organizationKey},
      ${input.masteryTenantKey},
      ${`sales:${input.organizationId}`},
      ${LEARNER_A},
      'sales-advantage',
      ${input.sourceAttemptId},
      ${input.idempotencyKey},
      'knowledge-space-sales-mastery-v1.0.0',
      ${"a".repeat(64)},
      'sales-rubric.v1',
      ${`request:${input.idempotencyKey}`},
      ${`correlation:${input.sourceAttemptId}`},
      ${input.payloadDigest},
      ${JSON.stringify({ objectiveId: "sales.objective", score: 0.9 })}::jsonb
    )
    RETURNING id
  `;
  if (!row) throw new Error("Sales outbox fixture did not return an ID.");
  return row.id;
}

/** Inserts one immutable projection receipt fixture. */
async function insertReceipt(
  harness: SalesMasteryPostgres16Harness,
  outboxId: string,
  idempotencyKey: string,
  commitId: string,
): Promise<void> {
  await harness.sql`
    INSERT INTO sales_mastery_projection_receipts (
      outbox_id,
      mastery_tenant_key,
      organization_id,
      learner_principal_id,
      idempotency_key,
      commit_id,
      result_json
    )
    SELECT
      ${outboxId},
      mastery_tenant_key,
      organization_id,
      learner_principal_id,
      ${idempotencyKey},
      ${commitId},
      ${JSON.stringify({ status: "applied" })}::jsonb
    FROM sales_mastery_projection_outbox
    WHERE id = ${outboxId}
  `;
}

liveBehavior("Sales Phase 2 PostgreSQL 16 behavior", () => {
  let harness: SalesMasteryPostgres16Harness | undefined;

  beforeEach(async () => {
    harness = await createSalesMasteryPostgres16Harness();
  }, 60_000);

  afterEach(async () => {
    await harness?.close();
  }, 30_000);

  it("requires PostgreSQL 16 and an isolated database", () => {
    expect(harness?.databaseName).toMatch(/^sales_phase2_/u);
    expect(harness?.databaseUrl).not.toBe(PG_TEST_URL);
  });

  it("runs the complete migration chain against disposable PostgreSQL", async () => {
    await runSalesMigrationChainOnPostgres16();
  }, 180_000);

  it("enforces mapping uniqueness and rejects a cross-organization tenant target", async () => {
    if (!harness)
      throw new Error("Sales PostgreSQL harness was not initialized.");
    await harness.sql`INSERT INTO schools (id, name) VALUES (${TENANT_A}, 'Sales A'), (${TENANT_B}, 'Sales B')`;
    await insertMapping(harness, ORGANIZATION_A, "sales-a", TENANT_A);
    await insertMapping(harness, ORGANIZATION_B, "sales-b", TENANT_B);

    await expect(
      insertMapping(harness, ORGANIZATION_A, "sales-a-new", TENANT_B),
    ).rejects.toMatchObject({ code: "23505" });

    await expect(
      insertOutbox(harness, {
        organizationId: ORGANIZATION_B,
        organizationKey: "sales-b",
        masteryTenantKey: TENANT_A,
        sourceAttemptId: "cross-org-attempt",
        idempotencyKey: "cross-org-idempotency",
        payloadDigest: DIGEST_A,
      }),
    ).rejects.toMatchObject({ code: "23503" });
  });

  it("keeps organization reads isolated from another organization's outbox", async () => {
    if (!harness)
      throw new Error("Sales PostgreSQL harness was not initialized.");
    await harness.sql`INSERT INTO schools (id, name) VALUES (${TENANT_A}, 'Sales A'), (${TENANT_B}, 'Sales B')`;
    await insertMapping(harness, ORGANIZATION_C, "sales-c", TENANT_A);
    await insertOutbox(harness, {
      organizationId: ORGANIZATION_C,
      organizationKey: "sales-c",
      masteryTenantKey: TENANT_A,
      sourceAttemptId: "isolation-attempt",
      idempotencyKey: "isolation-idempotency",
      payloadDigest: DIGEST_A,
    });

    const [foreignRows] = await harness.sql<{ count: number }[]>`
      SELECT count(*)::integer AS count
      FROM sales_mastery_projection_outbox
      WHERE application_key = 'sales'
        AND organization_id = ${ORGANIZATION_B}
    `;
    expect(foreignRows?.count).toBe(0);
  });

  it("preserves the original outbox row on a conflicting replay", async () => {
    if (!harness)
      throw new Error("Sales PostgreSQL harness was not initialized.");
    await harness.sql`INSERT INTO schools (id, name) VALUES (${TENANT_B}, 'Sales B')`;
    await insertMapping(harness, ORGANIZATION_B, "sales-b-replay", TENANT_B);
    await insertOutbox(harness, {
      organizationId: ORGANIZATION_B,
      organizationKey: "sales-b-replay",
      masteryTenantKey: TENANT_B,
      sourceAttemptId: "replay-attempt",
      idempotencyKey: "replay-idempotency",
      payloadDigest: DIGEST_A,
    });

    await expect(
      insertOutbox(harness, {
        organizationId: ORGANIZATION_B,
        organizationKey: "sales-b-replay",
        masteryTenantKey: TENANT_B,
        sourceAttemptId: "replay-attempt-2",
        idempotencyKey: "replay-idempotency",
        payloadDigest: DIGEST_B,
      }),
    ).rejects.toMatchObject({ code: "23505" });

    const [row] = await harness.sql<{ payloadDigest: string }[]>`
      SELECT payload_digest AS "payloadDigest"
      FROM sales_mastery_projection_outbox
      WHERE mastery_tenant_key = ${TENANT_B}
        AND idempotency_key = 'replay-idempotency'
    `;
    expect(row?.payloadDigest).toBe(DIGEST_A);
  });

  it("converges concurrent first writes to one mapping and one outbox row", async () => {
    if (!harness)
      throw new Error("Sales PostgreSQL harness was not initialized.");
    await harness.sql`INSERT INTO schools (id, name) VALUES (${TENANT_A}, 'Sales A'), (${TENANT_B}, 'Sales B')`;
    const mappingResults = await Promise.all(
      Array.from(
        { length: 8 },
        (_, index) =>
          harness!.sql`
          INSERT INTO sales_mastery_tenant_mappings (
            application_key, organization_id, organization_key,
            mastery_tenant_key, source_tenant_key, provisioned_by, request_id
          ) VALUES (
            'sales', ${ORGANIZATION_A}, 'sales-a-race', ${TENANT_A},
            ${`sales:${ORGANIZATION_A}`}, 'phase2-red', ${`race:${index}`}
          )
          ON CONFLICT (application_key, organization_id) DO NOTHING
          RETURNING organization_id
        `,
      ),
    );
    expect(mappingResults.filter((rows) => rows.length === 1)).toHaveLength(1);

    await insertMapping(harness, ORGANIZATION_B, "sales-b-race", TENANT_B);
    const outboxResults = await Promise.all(
      Array.from(
        { length: 8 },
        (_, index) =>
          harness!.sql`
          INSERT INTO sales_mastery_projection_outbox (
            application_key, organization_id, organization_key,
            mastery_tenant_key, source_tenant_key, learner_principal_id,
            source_application, source_attempt_id, idempotency_key,
            graph_release, bindings_digest, rubric_version, request_id,
            correlation_id, payload_digest, payload_json
          ) VALUES (
            'sales', ${ORGANIZATION_B}, 'sales-b-race', ${TENANT_B},
            ${`sales:${ORGANIZATION_B}`}, ${LEARNER_A}, 'sales-advantage',
            'race-attempt', 'race-idempotency',
            'knowledge-space-sales-mastery-v1.0.0', ${"a".repeat(64)},
            'sales-rubric.v1', ${`race-request:${index}`},
            ${`race-correlation:${index}`}, ${DIGEST_A},
            ${JSON.stringify({ score: 0.9 })}::jsonb
          )
          ON CONFLICT DO NOTHING
          RETURNING id
        `,
      ),
    );
    expect(outboxResults.filter((rows) => rows.length === 1)).toHaveLength(1);
  });

  it("retries a pending outbox intent without duplicating its receipt", async () => {
    if (!harness)
      throw new Error("Sales PostgreSQL harness was not initialized.");
    await harness.sql`INSERT INTO schools (id, name) VALUES (${TENANT_B}, 'Sales B')`;
    await insertMapping(harness, ORGANIZATION_B, "sales-b-retry", TENANT_B);
    const outboxId = await insertOutbox(harness, {
      organizationId: ORGANIZATION_B,
      organizationKey: "sales-b-retry",
      masteryTenantKey: TENANT_B,
      sourceAttemptId: "retry-attempt",
      idempotencyKey: "retry-idempotency",
      payloadDigest: DIGEST_A,
    });
    const [pending] = await harness.sql<{ count: number }[]>`
      SELECT count(*)::integer AS count
      FROM sales_mastery_projection_receipts
      WHERE outbox_id = ${outboxId}
    `;
    expect(pending?.count).toBe(0);

    await insertReceipt(harness, outboxId, "retry-idempotency", "commit-retry");
    await harness.sql`
      INSERT INTO sales_mastery_projection_receipts (
        outbox_id, mastery_tenant_key, organization_id, learner_principal_id,
        idempotency_key, commit_id, result_json
      )
      SELECT outbox_id, mastery_tenant_key, organization_id, learner_principal_id,
        idempotency_key, 'commit-retry-duplicate', result_json
      FROM sales_mastery_projection_receipts
      WHERE outbox_id = ${outboxId}
      ON CONFLICT (outbox_id) DO NOTHING
    `;
    const [receipts] = await harness.sql<{ count: number }[]>`
      SELECT count(*)::integer AS count
      FROM sales_mastery_projection_receipts
      WHERE outbox_id = ${outboxId}
    `;
    expect(receipts?.count).toBe(1);
  });

  it("rejects update, delete, and truncate mutations on append-only tables", async () => {
    if (!harness)
      throw new Error("Sales PostgreSQL harness was not initialized.");
    await harness.sql`INSERT INTO schools (id, name) VALUES (${TENANT_B}, 'Sales B')`;
    await insertMapping(harness, ORGANIZATION_B, "sales-b-append", TENANT_B);
    const outboxId = await insertOutbox(harness, {
      organizationId: ORGANIZATION_B,
      organizationKey: "sales-b-append",
      masteryTenantKey: TENANT_B,
      sourceAttemptId: "append-attempt",
      idempotencyKey: "append-idempotency",
      payloadDigest: DIGEST_A,
    });
    await insertReceipt(
      harness,
      outboxId,
      "append-idempotency",
      "commit-append",
    );

    await expect(
      harness.sql`UPDATE sales_mastery_projection_outbox SET organization_key = 'mutated' WHERE id = ${outboxId}`,
    ).rejects.toMatchObject({ code: "P0001" });
    await expect(
      harness.sql`DELETE FROM sales_mastery_projection_outbox WHERE id = ${outboxId}`,
    ).rejects.toMatchObject({ code: "P0001" });
    await expect(
      harness.sql`TRUNCATE sales_mastery_projection_outbox, sales_mastery_projection_receipts`,
    ).rejects.toMatchObject({ code: "P0001" });
    await expect(
      harness.sql`UPDATE sales_mastery_projection_receipts SET commit_id = 'mutated' WHERE outbox_id = ${outboxId}`,
    ).rejects.toMatchObject({ code: "P0001" });
    await expect(
      harness.sql`DELETE FROM sales_mastery_tenant_mappings WHERE organization_id = ${ORGANIZATION_B}`,
    ).rejects.toMatchObject({ code: "P0001" });
  });
});
