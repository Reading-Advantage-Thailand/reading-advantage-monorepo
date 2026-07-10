/**
 * Phase S3 remediation Red contracts for physical mastery tenant ownership.
 *
 * These tests intentionally exercise PostgreSQL/PGlite and the migration
 * ledger directly. They must not import Domain or create a db -> domain
 * dependency; adapter authority, CAS, concurrency, and error mapping belong to
 * the domain-owned integration suite.
 */
import { PGlite } from "@electric-sql/pglite";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../schema/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DB_ROOT = resolve(HERE, "../..");
const MIGRATIONS_ROOT = join(DB_ROOT, "drizzle");

const SCHOOL_A = "11111111-1111-4111-8111-111111111111";
const SCHOOL_B = "22222222-2222-4222-8222-222222222222";
const STUDENT_A = "mastery-owner-a";
const STUDENT_A2 = "mastery-owner-a2";
const STUDENT_B = "mastery-owner-b";
const NOW = new Date("2026-07-10T04:00:00.000Z");

interface Journal {
  entries: Array<{ idx: number; tag: string }>;
}

type TestDatabase = ReturnType<typeof drizzle<typeof schema>>;

function migrationScripts(): string[] {
  const journal = JSON.parse(
    readFileSync(join(MIGRATIONS_ROOT, "meta/_journal.json"), "utf8"),
  ) as Journal;
  return journal.entries
    .map(({ tag }) => {
      const source = readFileSync(join(MIGRATIONS_ROOT, `${tag}.sql`), "utf8");
      // PGlite cannot load pgcrypto. This matches the established domain PGlite
      // harness and keeps the mastery DDL on the real ledger path.
      if (/digest\s*\(/i.test(source)) return null;
      return source.replace(/CREATE EXTENSION IF NOT EXISTS \w+;\s*/gi, "");
    })
    .filter((source): source is string => source !== null);
}

async function createDatabase(): Promise<{
  client: PGlite;
  db: TestDatabase;
}> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  for (const migration of migrationScripts()) {
    await client.exec(migration);
  }
  return { client, db };
}

async function resetDatabase(db: TestDatabase): Promise<void> {
  const result = await db.execute(
    sql.raw(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'drizzle_migrations'",
    ),
  );
  const names = (result.rows as Array<{ tablename: string }>)
    .map(({ tablename }) => tablename)
    .filter(Boolean);
  if (names.length > 0) {
    await db.execute(
      sql.raw(`TRUNCATE TABLE ${names.join(", ")} RESTART IDENTITY CASCADE`),
    );
  }
}

async function seedOwners(db: TestDatabase): Promise<void> {
  await db.insert(schema.schools).values([
    { id: SCHOOL_A, name: "Mastery School A" },
    { id: SCHOOL_B, name: "Mastery School B" },
  ]);
  await db.insert(schema.users).values([
    {
      id: STUDENT_A,
      username: STUDENT_A,
      displayUsername: STUDENT_A,
      schoolId: SCHOOL_A,
    },
    {
      id: STUDENT_A2,
      username: STUDENT_A2,
      displayUsername: STUDENT_A2,
      schoolId: SCHOOL_A,
    },
    {
      id: STUDENT_B,
      username: STUDENT_B,
      displayUsername: STUDENT_B,
      schoolId: SCHOOL_B,
    },
  ]);
}

function cardValues({
  id = "aaaaaaaa-0000-4000-8000-000000000001",
  schoolId = SCHOOL_A,
  studentId = STUDENT_A,
  objectiveId = "codecamp.variables",
}: {
  id?: string;
  schoolId?: string;
  studentId?: string;
  objectiveId?: string;
} = {}) {
  return {
    id,
    schoolId,
    studentId,
    objectiveId,
    variantKey: "recognition",
    stability: 2,
    difficulty: 5,
    state: "review",
    dueDate: NOW,
    elapsedDays: 1,
    scheduledDays: 2,
    reps: 1,
    lapses: 0,
    paramsVersion: "fsrs.codecamp.v1",
    revision: 0,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function reviewValues({
  id = "aaaaaaaa-0000-4000-8000-000000000002",
  schoolId = SCHOOL_A,
  studentId = STUDENT_A,
  cardId = "aaaaaaaa-0000-4000-8000-000000000001",
  submissionId = "submission-1",
}: {
  id?: string;
  schoolId?: string;
  studentId?: string;
  cardId?: string;
  submissionId?: string;
} = {}) {
  return {
    id,
    schoolId,
    cardId,
    studentId,
    submissionId,
    rating: "good",
    evidenceJson: { evidenceReasons: ["correct"] },
    stateBeforeJson: { state: "learning" },
    stateAfterJson: { state: "review" },
    paramsVersion: "fsrs.codecamp.v1",
    reviewedAt: NOW,
    createdAt: NOW,
  };
}

function evidenceValues({
  id = "aaaaaaaa-0000-4000-8000-000000000003",
  schoolId = SCHOOL_A,
  studentId = STUDENT_A,
  reviewId = "aaaaaaaa-0000-4000-8000-000000000002",
  sourceId = "submission-1",
  evidenceOrdinal = 0,
}: {
  id?: string;
  schoolId?: string;
  studentId?: string;
  reviewId?: string;
  sourceId?: string;
  evidenceOrdinal?: number;
} = {}) {
  return {
    id,
    schoolId,
    reviewId,
    studentId,
    objectiveId: "codecamp.variables",
    variantKey: "recognition",
    sourceId,
    evidenceOrdinal,
    evidenceType: "practice_review",
    retentionStrength: 0.8,
    practiceCoverage: 1,
    evidenceConfidence: 0.8,
    attemptCount: 1,
    provenanceJson: { graphRelease: "codecamp.graph.v1" },
    observedAt: NOW,
    createdAt: NOW,
  };
}

describe("Phase S3 remediation: physical tenant ownership", () => {
  let client: PGlite;
  let db: TestDatabase;

  beforeAll(async () => {
    ({ client, db } = await createDatabase());
  }, 120_000);

  beforeEach(async () => {
    await resetDatabase(db);
    await seedOwners(db);
  });

  afterAll(async () => {
    await client?.close();
  });

  it("control: preserves nullable school ownership for global SYSTEM users", async () => {
    await expect(
      db.insert(schema.users).values({
        id: "global-system-user",
        username: "global-system-user",
        displayUsername: "global-system-user",
        role: "SYSTEM",
        schoolId: null,
      }),
    ).resolves.toBeDefined();
  });

  it("rejects a school-A mastery card owned by a school-B user", async () => {
    await expect(
      db.insert(schema.masteryCards).values(
        cardValues({ schoolId: SCHOOL_A, studentId: STUDENT_B }),
      ),
      "RED S3-CORRECTNESS-002: (school_id, student_id) must reference users(school_id, id)",
    ).rejects.toThrow(/foreign key|23503|users_school/i);
  });

  it("control: accepts a mastery card whose user belongs to the same school", async () => {
    await expect(
      db.insert(schema.masteryCards).values(cardValues()),
    ).resolves.toBeDefined();
  });

  it("rejects a review whose student differs from the referenced card owner", async () => {
    await db.insert(schema.masteryCards).values(cardValues());
    await expect(
      db.insert(schema.masteryReviews).values(
        reviewValues({ studentId: STUDENT_A2 }),
      ),
      "RED owner-chain: review must reference (school_id, card_id, student_id)",
    ).rejects.toThrow(/foreign key|23503|school_card_student/i);
  });

  it("rejects evidence whose student differs from the referenced review owner", async () => {
    await db.insert(schema.masteryCards).values(cardValues());
    await db.insert(schema.masteryReviews).values(reviewValues());
    await expect(
      db.insert(schema.masteryEvidence).values(
        evidenceValues({ studentId: STUDENT_A2 }),
      ),
      "RED owner-chain: evidence must reference (school_id, review_id, student_id)",
    ).rejects.toThrow(/foreign key|23503|school_review_student/i);
  });

  it("prevents an existing card owner from changing while reviews reference it", async () => {
    await db.insert(schema.masteryCards).values(cardValues());
    await db.insert(schema.masteryReviews).values(reviewValues());
    await expect(
      db
        .update(schema.masteryCards)
        .set({ studentId: STUDENT_A2 })
        .where(
          and(
            eq(schema.masteryCards.schoolId, SCHOOL_A),
            eq(schema.masteryCards.id, cardValues().id),
          ),
        ),
      "RED immutable owner chain: referenced card student identity cannot be retargeted",
    ).rejects.toThrow(/foreign key|23503|school_card_student/i);
  });

  it("control: enforces FK-safe card-before-review write order", async () => {
    await expect(
      db.insert(schema.masteryReviews).values(reviewValues()),
    ).rejects.toBeDefined();

    await expect(
      db.transaction(async (transaction) => {
        await transaction.insert(schema.masteryCards).values(cardValues());
        await transaction.insert(schema.masteryReviews).values(reviewValues());
        await transaction.insert(schema.masteryEvidence).values(evidenceValues());
      }),
    ).resolves.toBeUndefined();
  });

  it("control: rolls back the parent card when a later FK write fails", async () => {
    await expect(
      db.transaction(async (transaction) => {
        await transaction.insert(schema.masteryCards).values(cardValues());
        await transaction.insert(schema.masteryReviews).values(
          reviewValues({
            id: "aaaaaaaa-0000-4000-8000-000000000009",
            cardId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
          }),
        );
      }),
    ).rejects.toBeDefined();

    const cards = await db
      .select({ id: schema.masteryCards.id })
      .from(schema.masteryCards)
      .where(eq(schema.masteryCards.id, cardValues().id));
    expect(cards).toEqual([]);
  });

  it("restores placement uniqueness for one graph release and evidence type", async () => {
    const base = {
      id: "bbbbbbbb-0000-4000-8000-000000000001",
      schoolId: SCHOOL_A,
      studentId: STUDENT_A,
      objectiveId: "codecamp.variables",
      masteryEstimate: 0.6,
      confidence: "medium",
      evidenceType: "two_probe",
      graphRelease: "codecamp.graph.v1",
      sourceId: "placement-1",
      seedProvenanceJson: { source: "placement" },
      placedAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    };
    await db.insert(schema.masteryPlacements).values(base);
    await expect(
      db.insert(schema.masteryPlacements).values({
        ...base,
        id: "bbbbbbbb-0000-4000-8000-000000000002",
        sourceId: "placement-2",
      }),
      "RED S3-CORRECTNESS-006: duplicate placement natural key must be rejected",
    ).rejects.toThrow(/unique|duplicate|23505|placement/i);
  });

  it("restores calibration uniqueness for one population parameter version", async () => {
    const base = {
      id: "cccccccc-0000-4000-8000-000000000001",
      schoolId: SCHOOL_A,
      domain: "codecamp",
      ageBand: "secondary",
      paramsVersion: "fsrs.codecamp.v1",
      optimizerVersion: "optimizer.v1",
      incumbentParamsVersion: "fsrs.codecamp.v0",
      fsrsParametersJson: { weights: [1, 2, 3] },
      reviewCount: 1_000,
      studentCount: 100,
      volumeGatePassed: true,
      improvesIncumbent: true,
      humanReleaseApproved: true,
      releaseEligible: true,
      createdAt: NOW,
      updatedAt: NOW,
    };
    await db.insert(schema.masteryCalibrations).values(base);
    await expect(
      db.insert(schema.masteryCalibrations).values({
        ...base,
        id: "cccccccc-0000-4000-8000-000000000002",
      }),
      "RED S3-CORRECTNESS-006: duplicate calibration natural key must be rejected",
    ).rejects.toThrow(/unique|duplicate|23505|calibration/i);
  });
});
