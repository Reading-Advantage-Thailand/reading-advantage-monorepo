import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { drizzle } from "drizzle-orm/postgres-js";
import { createDrizzleMasteryPersistence } from "../../../domain/dist/mastery/drizzle-mastery-persistence.js";
import {
  createSalesMasteryProjection,
  SALES_MASTERY_BINDINGS_DIGEST,
  SALES_MASTERY_GRAPH_RELEASE,
} from "../../../domain/dist/sales-mastery.js";
import type { MasteryPersistencePort } from "../../../domain/dist/mastery/persistence-ports.js";
import { salesCurriculumBindings } from "../../../sales-knowledge/dist/index.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
const liveBehavior = PG_TEST_URL ? describe : describe.skip;
const ISSUER = "https://accounts.example.test";
const ORGANIZATION_A = "20000000-0000-4000-8000-000000000301";
const COMPANY_ACCOUNT_A = "00000000-0000-4000-8000-000000000301";
const PRINCIPAL_A = `sales:${COMPANY_ACCOUNT_A}`;
const MASTERY_TENANT_A = "30000000-0000-4000-8000-000000000301";
const VALID_IDENTITY_TOKEN = "internal-company-identity-token";
const NOW = new Date("2026-08-16T12:00:00.000Z");
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

interface VerifiedSalesIdentity {
  readonly issuer: string;
  readonly expiresAt: string;
  readonly organizationId: string;
  readonly organizationKey: "internal-company";
  readonly principalId: string;
}

interface CompanyIdentityVerificationPort {
  verify(input: {
    readonly identity: unknown;
    readonly expectedAudience: "sales";
  }): Promise<VerifiedSalesIdentity>;
}

interface SalesPersistenceFactoryOptions {
  readonly tenant: { readonly schoolId: string };
  readonly sourceTenantKey: string;
  readonly actorId: string;
}

interface SalesPersistenceFactory {
  create(options: SalesPersistenceFactoryOptions): MasteryPersistencePort;
}

interface ExpectedSalesProjection {
  resolveTenant(input: unknown): Promise<unknown>;
  project(input: unknown): Promise<unknown>;
  readEvidence(input: unknown): Promise<unknown>;
  retryPending(input: unknown): Promise<unknown>;
}

interface ExpectedSalesProjectionFactoryOptions {
  readonly database: unknown;
  readonly companyIdentity: CompanyIdentityVerificationPort;
  readonly masteryFactory: SalesPersistenceFactory;
}

interface ProjectionReceipt {
  readonly status: "applied" | "replayed";
  readonly outboxId: string;
  readonly commitId: string;
}

type ExpectedSalesProjectionFactory = (
  options: ExpectedSalesProjectionFactoryOptions,
) => ExpectedSalesProjection;

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

/** Creates the minimum user table required by the Mastery foreign keys. */
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

/** Creates the internal Company Identity result for the durable Sales test. */
function verifiedIdentity(): VerifiedSalesIdentity {
  return {
    issuer: ISSUER,
    expiresAt: new Date(NOW.getTime() + 60 * 60 * 1000).toISOString(),
    organizationId: ORGANIZATION_A,
    organizationKey: "internal-company",
    principalId: PRINCIPAL_A,
  };
}

/** Creates the internal verifier used by the expected projection seam. */
function identityVerifier(): CompanyIdentityVerificationPort {
  return {
    verify: vi.fn(async (input) => {
      if (input.identity !== VALID_IDENTITY_TOKEN) {
        throw new Error("RAW_COMPANY_IDENTITY_CLAIMS_UNTRUSTED");
      }
      return verifiedIdentity();
    }),
  };
}

/** Returns one reviewed Sales quiz coordinate from the immutable release. */
function approvedQuizPayload(): Record<string, unknown> {
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

/** Creates one durable Sales projection command with an internal identity token. */
function projectionInput(): Record<string, unknown> {
  return {
    identity: VALID_IDENTITY_TOKEN,
    sourceAttemptId: "sales-review-a-durable-attempt-001",
    idempotencyKey: "sales-review-a-durable-idempotency-001",
    sourceApplication: "sales-advantage",
    graphRelease: SALES_MASTERY_GRAPH_RELEASE,
    bindingsDigest: SALES_MASTERY_BINDINGS_DIGEST,
    payload: approvedQuizPayload(),
  };
}

/** Creates a projection through the expected internal seams before Green exists. */
function createExpectedProjection(
  options: ExpectedSalesProjectionFactoryOptions,
): ExpectedSalesProjection {
  const factory =
    createSalesMasteryProjection as unknown as ExpectedSalesProjectionFactory;
  return factory(options);
}

liveBehavior("Sales Phase 2 Review A durable projection Red", () => {
  let harness: SalesMasteryPostgres16Harness | undefined;

  beforeEach(async () => {
    harness = await createSalesMasteryPostgres16Harness();
    await createMasteryParentSchema(harness);
  }, 60_000);

  afterEach(async () => {
    await harness?.close();
  }, 30_000);

  it("SMC-P2-RA-001/004 persists valid UUIDs and binds Sales source tenant and actor", async () => {
    if (!harness) {
      throw new Error("Sales PostgreSQL harness was not initialized.");
    }
    const database = drizzle(harness.sql);
    await harness.sql`
      INSERT INTO schools (id, name)
      VALUES (${MASTERY_TENANT_A}, 'Sales Mastery A')
      ON CONFLICT (id) DO NOTHING;
    `;
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
        ${ORGANIZATION_A},
        'internal-company',
        ${MASTERY_TENANT_A},
        ${`sales:${ORGANIZATION_A}`},
        'review-a-red',
        'review-a-red-request'
      );
    `;
    await harness.sql`
      INSERT INTO users (id, school_id)
      VALUES (${PRINCIPAL_A}, ${MASTERY_TENANT_A})
      `;

    const scopes: SalesPersistenceFactoryOptions[] = [];
    const projection = createExpectedProjection({
      database,
      companyIdentity: identityVerifier(),
      masteryFactory: {
        create(options) {
          scopes.push(options);
          return createDrizzleMasteryPersistence({
            db: database,
            tenant: options.tenant,
            sourceTenantKey: options.sourceTenantKey,
            actorId: options.actorId,
          });
        },
      },
    });
    const receipt = (await projection.project(
      projectionInput(),
    )) as ProjectionReceipt;
    expect(receipt).toMatchObject({ status: "applied" });
    expect(receipt.outboxId).toMatch(UUID_PATTERN);
    expect(receipt.commitId).toMatch(UUID_PATTERN);
    expect(scopes).toEqual([
      {
        tenant: { schoolId: MASTERY_TENANT_A },
        sourceTenantKey: `sales:${ORGANIZATION_A}`,
        actorId: PRINCIPAL_A,
      },
    ]);

    const [outbox] = await harness.sql<
      {
        id: string;
        masteryTenantKey: string;
        sourceTenantKey: string;
        learnerPrincipalId: string;
      }[]
    >`
        SELECT
          id::text AS id,
          mastery_tenant_key::text AS "masteryTenantKey",
          source_tenant_key AS "sourceTenantKey",
          learner_principal_id AS "learnerPrincipalId"
        FROM sales_mastery_projection_outbox
        WHERE organization_id = ${ORGANIZATION_A}
      `;
    expect(outbox?.id).toMatch(UUID_PATTERN);
    expect(outbox).toMatchObject({
      masteryTenantKey: MASTERY_TENANT_A,
      sourceTenantKey: `sales:${ORGANIZATION_A}`,
      learnerPrincipalId: PRINCIPAL_A,
    });

    const [storedReceipt] = await harness.sql<{ id: string }[]>`
        SELECT id::text AS id
        FROM sales_mastery_projection_receipts
        WHERE outbox_id = ${receipt.outboxId}
      `;
    expect(storedReceipt?.id).toMatch(UUID_PATTERN);

    const [principal] = await harness.sql<
      {
        schoolId: string;
        studentId: string;
        sourceTenantKey: string;
      }[]
    >`
        SELECT
          school_id::text AS "schoolId",
          student_id AS "studentId",
          source_tenant_key AS "sourceTenantKey"
        FROM mastery_principals
        WHERE student_id = ${PRINCIPAL_A}
    `;
    expect(principal).toEqual({
      schoolId: MASTERY_TENANT_A,
      studentId: PRINCIPAL_A,
      sourceTenantKey: `sales:${ORGANIZATION_A}`,
    });

    const [commit] = await harness.sql<
      { studentId: string; actorId: string }[]
    >`
        SELECT student_id AS "studentId", actor_id AS "actorId"
        FROM mastery_commits
        WHERE id = ${receipt.commitId}
      `;
    expect(commit).toEqual({
      studentId: PRINCIPAL_A,
      actorId: PRINCIPAL_A,
    });
  }, 180_000);
});
