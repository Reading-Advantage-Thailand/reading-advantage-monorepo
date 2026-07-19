// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { eq, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  db,
  salesChatMessages,
  salesConversations,
  salesLessons,
  salesModules,
  salesProgress,
  salesQuizQuestions,
  salesRoleplayAttempts,
  salesRoleplayScenarios,
  salesRubrics,
  schools,
  users,
} from "@reading-advantage/db";

import {
  SALES_CURRICULUM_OWNER_APPROVAL_SHA256,
  SALES_CURRICULUM_PREDECESSOR_GRAPH_SHA256,
  buildStaticSalesCurriculumRows,
  curriculumRowsDigest,
  seedStaticSalesCurriculum,
} from "./static-seed";

const expectedDatabaseName = "sales_curriculum_reconciliation_test";
const configuredDatabase = (() => {
  try {
    return new URL(process.env.DATABASE_URL ?? "");
  } catch {
    return undefined;
  }
})();
const configuredDatabaseName = configuredDatabase?.pathname.slice(1) ?? "";
const configuredDatabaseHost = configuredDatabase?.hostname ?? "";
const destructiveTestAcknowledged =
  process.env.SALES_CURRICULUM_RECONCILIATION_TEST_ACK ===
  "DELETE_EXACT_LOCAL_TEST_DATABASE";
const describeRealDatabase =
  process.env.RUN_SALES_CURRICULUM_RECONCILIATION_REAL_DB_TESTS === "true" &&
  destructiveTestAcknowledged &&
  configuredDatabaseName === expectedDatabaseName &&
  ["127.0.0.1", "localhost"].includes(configuredDatabaseHost)
    ? describe
    : describe.skip;
const appRoot = resolve(import.meta.dirname, "..");
const predecessor = JSON.parse(readFileSync(
  resolve(appRoot, "curriculum/predecessor-production.json"),
  "utf8",
)) as ReturnType<typeof buildStaticSalesCurriculumRows>;
const schoolId = "00000000-0000-4000-8000-000000000091";
const userId = "curriculum-reconciliation-user";
const progressId = "00000000-0000-4000-8000-000000000092";
const predecessorLessonId = "2452d8f8-5904-5ecc-a0bb-1adfb4475f37";
const targetLessonId = "3a356602-79ec-50ee-990c-9a3b800de598";

/** Removes all fixture rows in foreign-key-safe order. */
async function cleanFixture(): Promise<void> {
  const databaseIdentity = await db.execute<{ current_database: string }>(
    sql`SELECT current_database()`,
  );
  if (databaseIdentity[0]?.current_database !== expectedDatabaseName) {
    throw new Error(
      `Refusing destructive reconciliation test outside ${expectedDatabaseName}`,
    );
  }
  await db.delete(salesChatMessages);
  await db.delete(salesConversations);
  await db.delete(salesRoleplayAttempts);
  await db.delete(salesProgress);
  await db.delete(salesQuizQuestions);
  await db.delete(salesRoleplayScenarios);
  await db.delete(salesRubrics);
  await db.delete(salesLessons);
  await db.delete(salesModules);
  await db.delete(users).where(eq(users.id, userId));
  await db.delete(schools).where(eq(schools.id, schoolId));
}

/** Inserts the exact captured predecessor plus one microsecond-precise progress row. */
async function insertPredecessor(): Promise<void> {
  await db.insert(schools).values({ id: schoolId, name: "Reconciliation Test" });
  await db.insert(users).values({
    id: userId,
    username: userId,
    displayUsername: userId,
    name: "Reconciliation Test",
    role: "SALES_REP",
    schoolId,
  });
  await db.insert(salesModules).values(predecessor.modules);
  await db.insert(salesLessons).values(predecessor.lessons);
  await db.insert(salesRubrics).values(predecessor.rubrics);
  await db.insert(salesRoleplayScenarios).values(predecessor.scenarios);
  await db.insert(salesQuizQuestions).values(predecessor.quizQuestions);
  await db.execute(sql.raw(`
    INSERT INTO sales_progress
      (id, user_id, lesson_id, status, completed_at, score, created_at, updated_at)
    VALUES (
      '${progressId}',
      '${userId}',
      '${predecessorLessonId}',
      'completed',
      TIMESTAMP '2026-07-18 12:00:00.123456',
      12.30,
      TIMESTAMP '2026-07-18 11:00:00.234567',
      TIMESTAMP '2026-07-18 12:00:00.345678'
    )
  `));
}

/** Reads exact native text representations without JavaScript Date conversion. */
async function readNativeProgress(): Promise<Record<string, string>> {
  const rows = await db.execute<Record<string, string>>(sql.raw(`
    SELECT
      id::text AS id,
      user_id,
      lesson_id::text AS lesson_id,
      status::text AS status,
      to_char(completed_at, 'YYYY-MM-DD HH24:MI:SS.US') AS completed_at,
      score::text AS score,
      to_char(created_at, 'YYYY-MM-DD HH24:MI:SS.US') AS created_at,
      to_char(updated_at, 'YYYY-MM-DD HH24:MI:SS.US') AS updated_at
    FROM sales_progress
    WHERE id = '${progressId}'
  `));
  return rows[0]!;
}

describeRealDatabase(
  "Sales curriculum predecessor reconciliation (real PostgreSQL)",
  () => {
    beforeEach(async () => {
      await cleanFixture();
      await insertPredecessor();
    });

    afterAll(async () => {
      await db.execute(sql.raw(`
        DROP TRIGGER IF EXISTS sales_reconciliation_reject_restore
          ON sales_progress;
        DROP FUNCTION IF EXISTS sales_reconciliation_reject_restore();
      `));
      await cleanFixture();
    });

    it("reconciles and rolls back with exact native numeric and timestamp values", async () => {
      expect(curriculumRowsDigest(predecessor)).toBe(
        SALES_CURRICULUM_PREDECESSOR_GRAPH_SHA256,
      );
      const originalProgress = await readNativeProgress();

      await expect(seedStaticSalesCurriculum(db, {
        approvalSha256: SALES_CURRICULUM_OWNER_APPROVAL_SHA256,
      })).resolves.toBe("reconciled");
      expect(await readNativeProgress()).toEqual({
        ...originalProgress,
        lesson_id: targetLessonId,
      });

      await cleanFixture();
      await insertPredecessor();
      await db.execute(sql.raw(`
        CREATE FUNCTION sales_reconciliation_reject_restore()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $trigger$
        BEGIN
          RAISE EXCEPTION 'reconciliation restore rejected';
        END
        $trigger$;
        CREATE TRIGGER sales_reconciliation_reject_restore
        BEFORE INSERT ON sales_progress
        FOR EACH STATEMENT
        EXECUTE FUNCTION sales_reconciliation_reject_restore();
      `));

      await expect(seedStaticSalesCurriculum(db, {
        approvalSha256: SALES_CURRICULUM_OWNER_APPROVAL_SHA256,
      })).rejects.toThrow("INSERT INTO sales_progress");
      await db.execute(sql.raw(`
        DROP TRIGGER sales_reconciliation_reject_restore ON sales_progress;
        DROP FUNCTION sales_reconciliation_reject_restore();
      `));

      expect(await readNativeProgress()).toEqual(originalProgress);
      await expect(seedStaticSalesCurriculum(db, {
        approvalSha256: "0".repeat(64),
      })).rejects.toThrow(
        "SALES_CURRICULUM_RECONCILIATION_APPROVAL_MISMATCH",
      );
    }, 30_000);
  },
);
