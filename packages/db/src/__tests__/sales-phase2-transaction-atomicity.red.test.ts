import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { salesMasteryProjectionReceipts } from "@reading-advantage/db";
import { drizzle } from "drizzle-orm/postgres-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDrizzleMasteryPersistence } from "../../../domain/dist/mastery/drizzle-mastery-persistence.js";
import {
  createSalesMasteryProjection,
  SALES_MASTERY_BINDINGS_DIGEST,
  SALES_MASTERY_GRAPH_RELEASE,
} from "../../../domain/dist/sales-mastery.js";
import { salesCurriculumBindings } from "../../../sales-knowledge/dist/index.js";

import {
  createSalesMasteryPostgres16Harness,
  type SalesMasteryPostgres16Harness,
} from "./sales-mastery-postgres16-harness.js";

const PACKAGE_ROOT = resolve(import.meta.dirname, "../..");
const MASTERY_MIGRATION_PATH = resolve(
  PACKAGE_ROOT,
  "drizzle/0027_mastery_persistence.sql",
);
const PG_TEST_URL = process.env.PG_TEST_URL?.trim();
const REQUIRE_LIVE_BEHAVIOR =
  process.env.REQUIRE_SALES_PHASE2_ATOMICITY_LIVE === "true";
const liveBehavior =
  PG_TEST_URL || REQUIRE_LIVE_BEHAVIOR ? describe : describe.skip;
const ISSUER = "https://accounts.example.test";
const ORGANIZATION_ID = "20000000-0000-4000-8000-000000000601";
const COMPANY_ACCOUNT_ID = "00000000-0000-4000-8000-000000000601";
const PRINCIPAL_ID = `sales:${COMPANY_ACCOUNT_ID}`;
const VALID_IDENTITY_TOKEN = "internal-company-identity-token";
const SOURCE_ATTEMPT_ID = "sales-phase2-transaction-atomicity-attempt-001";
const IDEMPOTENCY_KEY = "sales-phase2-transaction-atomicity-idempotency-001";
const NOW = new Date("2026-08-17T12:00:00.000Z");

interface VerifiedIdentity {
  readonly issuer: string;
  readonly expiresAt: string;
  readonly organizationId: string;
  readonly organizationKey: "internal-company";
  readonly principalId: string;
}

interface IdentityVerifier {
  verify(input: {
    readonly identity: unknown;
    readonly expectedAudience: "sales";
  }): Promise<VerifiedIdentity>;
}

interface MasteryPort {
  readSnapshot(input: unknown): Promise<unknown>;
  commitMasteryEvidence(input: unknown): Promise<unknown>;
  approveMasteryCalibration(input: unknown): Promise<unknown>;
}

interface PersistenceFactoryOptions {
  readonly database: unknown;
  readonly tenant: { readonly schoolId: string };
  readonly sourceTenantKey: string;
  readonly actorId: string;
}

interface PersistenceFactory {
  create(options: PersistenceFactoryOptions): MasteryPort;
}

interface Projection {
  resolveTenant(input: unknown): Promise<{
    readonly masteryTenantKey: string;
  }>;
  project(input: unknown, options?: unknown): Promise<unknown>;
  retryPending(input: unknown): Promise<unknown>;
}

interface ProjectionFactoryOptions {
  readonly database: unknown;
  readonly companyIdentity: IdentityVerifier;
  readonly masteryFactory: PersistenceFactory;
}

interface Database {
  select(): unknown;
  insert(table: unknown): unknown;
  transaction(
    callback: (transaction: unknown) => Promise<unknown>,
    options?: unknown,
  ): Promise<unknown>;
}

interface Reachability {
  masteryCommitExecutions: number;
  salesReceiptInsertions: number;
}

/** Applies one SQL migration split at Drizzle statement breakpoints. */
async function applyMigration(
  sql: SalesMasteryPostgres16Harness["sql"],
  path: string,
): Promise<void> {
  const source = await readFile(path, "utf8");
  for (const statement of source.split("--> statement-breakpoint")) {
    if (statement.trim()) await sql.unsafe(statement);
  }
}

/** Creates the minimum parent schema required by Mastery foreign keys. */
async function createMasteryParentSchema(
  harness: SalesMasteryPostgres16Harness,
): Promise<void> {
  await harness.sql.unsafe(`
    ALTER TABLE schools
      ADD COLUMN district text,
      ADD COLUMN province text,
      ADD COLUMN country text NOT NULL DEFAULT 'Thailand',
      ADD COLUMN contact_name text,
      ADD COLUMN contact_email text,
      ADD COLUMN owner_id text,
      ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
      ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now()
  `);
  await harness.sql.unsafe(`
    CREATE TABLE users (
      id text PRIMARY KEY,
      school_id uuid
    )
  `);
  await applyMigration(harness.sql, MASTERY_MIGRATION_PATH);
  await harness.sql.unsafe(`
    CREATE TABLE mastery_principals (
      school_id uuid NOT NULL,
      student_id text NOT NULL,
      source_tenant_key text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT mastery_principals_school_student_unique
        UNIQUE (school_id, student_id)
    )
  `);
}

/** Returns the trusted Company Identity result used by the test verifier. */
function verifiedIdentity(): VerifiedIdentity {
  return {
    issuer: ISSUER,
    expiresAt: new Date(NOW.getTime() + 60 * 60 * 1000).toISOString(),
    organizationId: ORGANIZATION_ID,
    organizationKey: "internal-company",
    principalId: PRINCIPAL_ID,
  };
}

/** Creates the trusted Company Identity verifier double. */
function identityVerifier(): IdentityVerifier {
  return {
    verify: vi.fn(async (input) => {
      if (
        input.identity !== VALID_IDENTITY_TOKEN ||
        input.expectedAudience !== "sales"
      ) {
        throw new Error("COMPANY_IDENTITY_VERIFICATION_FAILED");
      }
      return verifiedIdentity();
    }),
  };
}

/** Returns one reviewed Sales quiz payload from the admitted release. */
function approvedPayload(): Record<string, unknown> {
  const binding = salesCurriculumBindings.bindings.find(
    (candidate) => candidate.activityKind === "quiz-question",
  );
  if (!binding || !binding.variantId || !binding.objectiveIds[0]) {
    throw new Error("The approved Sales quiz binding is unavailable.");
  }
  return {
    objectiveId: binding.objectiveIds[0],
    variantKey: binding.variantId,
    rubricVersion: "sales-rubric.v1",
    score: 0.9,
  };
}

/** Creates one trusted Sales projection command without caller-selected scope. */
function projectionInput(): Record<string, unknown> {
  return {
    identity: VALID_IDENTITY_TOKEN,
    sourceAttemptId: SOURCE_ATTEMPT_ID,
    idempotencyKey: IDEMPOTENCY_KEY,
    sourceApplication: "sales-advantage",
    graphRelease: SALES_MASTERY_GRAPH_RELEASE,
    bindingsDigest: SALES_MASTERY_BINDINGS_DIGEST,
    payload: approvedPayload(),
  };
}

/** Records receipt insertion and fails only the Sales receipt insert boundary. */
function transactionWithReceiptFailure(
  transaction: unknown,
  reachability: Reachability,
): unknown {
  return new Proxy(transaction as object, {
    get(target, property) {
      if (property === "insert") {
        return (table: unknown) => {
          if (table === salesMasteryProjectionReceipts) {
            reachability.salesReceiptInsertions += 1;
            throw new Error("forced Sales receipt insertion failure");
          }
          const insert = (target as { insert(table: unknown): unknown }).insert;
          return insert.call(target, table);
        };
      }
      const value = Reflect.get(target, property);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

/** Creates a database adapter that fails receipt insertion on root and active transaction handles. */
function receiptFailingDatabase(
  database: Database,
  reachability: Reachability,
  activeTransactions: unknown[],
): Database {
  return {
    select: database.select.bind(database),
    insert(table: unknown) {
      if (table === salesMasteryProjectionReceipts) {
        reachability.salesReceiptInsertions += 1;
        throw new Error("forced Sales receipt insertion failure");
      }
      return database.insert(table);
    },
    transaction(callback, options) {
      const wrappedCallback = (transaction: unknown) => {
        const activeTransaction = transactionWithReceiptFailure(
          transaction,
          reachability,
        );
        activeTransactions.push(activeTransaction);
        return callback(activeTransaction);
      };
      return options === undefined
        ? database.transaction(wrappedCallback)
        : database.transaction(wrappedCallback, options);
    },
  };
}

/** Wraps a Mastery port and records that its commit path became reachable. */
function instrumentMasteryPort(
  port: MasteryPort,
  reachability: Reachability,
): MasteryPort {
  return {
    readSnapshot: (input) => port.readSnapshot(input),
    async commitMasteryEvidence(input) {
      reachability.masteryCommitExecutions += 1;
      return port.commitMasteryEvidence(input);
    },
    approveMasteryCalibration: (input) => port.approveMasteryCalibration(input),
  };
}

/** Creates the trusted projection with the only three accepted dependencies. */
function createProjection(
  database: Database,
  reachability: Reachability,
  activeTransactions: unknown[],
  scopes: PersistenceFactoryOptions[],
): Projection {
  const factory = createSalesMasteryProjection as unknown as (
    options: ProjectionFactoryOptions,
  ) => Projection;
  return factory({
    database: receiptFailingDatabase(
      database,
      reachability,
      activeTransactions,
    ),
    companyIdentity: identityVerifier(),
    masteryFactory: {
      create(options) {
        scopes.push(options);
        const persistenceDatabase = options.database ?? database;
        return instrumentMasteryPort(
          createDrizzleMasteryPersistence({
            db: persistenceDatabase,
            tenant: options.tenant,
            sourceTenantKey: options.sourceTenantKey,
            actorId: options.actorId,
          }) as unknown as MasteryPort,
          reachability,
        );
      },
    },
  });
}

liveBehavior("Sales Phase 2 transaction atomicity Red", () => {
  let harness: SalesMasteryPostgres16Harness | undefined;

  beforeEach(async () => {
    harness = await createSalesMasteryPostgres16Harness();
    await createMasteryParentSchema(harness);
  }, 60_000);

  afterEach(async () => {
    const currentHarness = harness;
    harness = undefined;
    await currentHarness?.close();
  }, 30_000);

  it("keeps the outbox pending and rolls back Mastery when receipt insertion fails", async () => {
    if (!harness) {
      throw new Error("Sales PostgreSQL harness was not initialized.");
    }

    const database = drizzle(harness.sql) as unknown as Database;
    const reachability: Reachability = {
      masteryCommitExecutions: 0,
      salesReceiptInsertions: 0,
    };
    const activeTransactions: unknown[] = [];
    const scopes: PersistenceFactoryOptions[] = [];
    const projection = createProjection(
      database,
      reachability,
      activeTransactions,
      scopes,
    );
    const binding = await projection.resolveTenant({
      identity: VALID_IDENTITY_TOKEN,
    });

    await harness.sql`
      INSERT INTO users (id, school_id)
      VALUES (${PRINCIPAL_ID}, ${binding.masteryTenantKey})
    `;
    await expect(
      projection.project(projectionInput(), { failDelivery: true }),
    ).rejects.toMatchObject({
      code: "PERSISTENCE_UNAVAILABLE",
      retryable: true,
    });

    await expect(
      projection.retryPending({
        identity: VALID_IDENTITY_TOKEN,
        sourceAttemptId: SOURCE_ATTEMPT_ID,
      }),
    ).rejects.toMatchObject({
      code: "PERSISTENCE_UNAVAILABLE",
      retryable: true,
    });

    expect(reachability).toEqual({
      masteryCommitExecutions: 1,
      salesReceiptInsertions: 1,
    });
    expect(scopes).toHaveLength(1);

    const [pendingOutbox] = await harness.sql<
      {
        id: string;
        sourceAttemptId: string;
        idempotencyKey: string;
        learnerPrincipalId: string;
        pending: boolean;
      }[]
    >`
      SELECT
        outbox.id::text AS id,
        outbox.source_attempt_id AS "sourceAttemptId",
        outbox.idempotency_key AS "idempotencyKey",
        outbox.learner_principal_id AS "learnerPrincipalId",
        NOT EXISTS (
          SELECT 1
          FROM sales_mastery_projection_receipts AS receipt
          WHERE receipt.outbox_id = outbox.id
        ) AS pending
      FROM sales_mastery_projection_outbox AS outbox
      WHERE outbox.source_attempt_id = ${SOURCE_ATTEMPT_ID}
    `;
    expect(pendingOutbox).toMatchObject({
      sourceAttemptId: SOURCE_ATTEMPT_ID,
      idempotencyKey: IDEMPOTENCY_KEY,
      learnerPrincipalId: PRINCIPAL_ID,
      pending: true,
    });

    const [counts] = await harness.sql<
      {
        outbox: string;
        receipts: string;
        principals: string;
        cards: string;
        reviews: string;
        states: string;
        placements: string;
        calibrations: string;
        commits: string;
        evidence: string;
      }[]
    >`
      SELECT
        (SELECT count(*)::text FROM sales_mastery_projection_outbox WHERE source_attempt_id = ${SOURCE_ATTEMPT_ID}) AS outbox,
        (SELECT count(*)::text FROM sales_mastery_projection_receipts WHERE idempotency_key = ${IDEMPOTENCY_KEY}) AS receipts,
        (SELECT count(*)::text FROM mastery_principals WHERE school_id = ${binding.masteryTenantKey}) AS principals,
        (SELECT count(*)::text FROM mastery_cards WHERE school_id = ${binding.masteryTenantKey}) AS cards,
        (SELECT count(*)::text FROM mastery_reviews WHERE school_id = ${binding.masteryTenantKey}) AS reviews,
        (SELECT count(*)::text FROM mastery_states WHERE school_id = ${binding.masteryTenantKey}) AS states,
        (SELECT count(*)::text FROM mastery_placements WHERE school_id = ${binding.masteryTenantKey}) AS placements,
        (SELECT count(*)::text FROM mastery_calibrations WHERE school_id = ${binding.masteryTenantKey}) AS calibrations,
        (SELECT count(*)::text FROM mastery_commits WHERE school_id = ${binding.masteryTenantKey}) AS commits,
        (SELECT count(*)::text FROM mastery_evidence WHERE school_id = ${binding.masteryTenantKey}) AS evidence
    `;
    expect.soft(counts).toEqual({
      outbox: "1",
      receipts: "0",
      principals: "0",
      cards: "0",
      reviews: "0",
      states: "0",
      placements: "0",
      calibrations: "0",
      commits: "0",
      evidence: "0",
    });
    expect.soft(scopes[0]?.database).toBeDefined();
    expect.soft(activeTransactions).toContain(scopes[0]?.database);
  }, 180_000);
});
