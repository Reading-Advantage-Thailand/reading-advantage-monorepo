// @vitest-environment node
import { randomUUID } from "node:crypto";
import { and, count, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  accounts,
  createPrivilegedDb,
  db,
  loginAttempts,
  salesLessons,
  salesModules,
  salesProgress,
  salesQuizQuestions,
  schools,
  users,
} from "@reading-advantage/db";
import {
  consumeRateLimit,
  createCredentialAccount,
  createPostgresRateLimitStore,
} from "@reading-advantage/auth";
import { createTenantDB } from "@reading-advantage/domain/db-contract";
import { submitQuiz } from "@reading-advantage/domain/sales";

const runRealDatabase = process.env.RUN_SALES_REAL_DB_TESTS === "true";
const describeRealDatabase = runRealDatabase ? describe : describe.skip;

describeRealDatabase("Sales release contract (real PostgreSQL)", () => {
  it("allows exactly ten of eleven concurrent roleplay submissions", async () => {
    const key = `username:sales:roleplay:release-${randomUUID()}`;
    const config = { maxAttempts: 10, windowMs: 60 * 60_000 };
    const store = createPostgresRateLimitStore(db, config);
    const results = await Promise.all(
      Array.from({ length: 11 }, () => consumeRateLimit(store, key, config)),
    );
    expect(results.filter((result) => result.allowed)).toHaveLength(10);
    expect(results.filter((result) => !result.allowed)).toHaveLength(1);
    const identifier = key.slice("username:".length);
    await db
      .delete(loginAttempts)
      .where(
        and(
          eq(loginAttempts.kind, "username"),
          eq(loginAttempts.identifier, identifier),
        ),
      );
  });

  it("rolls back both user and credential when the immutable audit insert fails", async () => {
    const schoolId = randomUUID();
    const suffix = randomUUID().slice(0, 8);
    const username = `rollback.rep.${suffix}`;
    const { db: directDb, client } = createPrivilegedDb();
    try {
      await directDb
        .insert(schools)
        .values({ id: schoolId, name: "Rollback Proof School" });
      const [accountCountBefore] = await directDb
        .select({ value: count() })
        .from(accounts);
      await expect(
        createCredentialAccount(db, {
          username,
          displayUsername: username,
          name: "Rollback Rep",
          password: "Rollback42!",
          role: "SALES_REP",
          schoolId,
          actorUserId: `missing-admin-${suffix}`,
          actorRole: "SALES_ADMIN",
        }),
      ).rejects.toThrow();

      const userRows = await directDb
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, username));
      const [accountCountAfter] = await directDb
        .select({ value: count() })
        .from(accounts);
      expect(userRows).toEqual([]);
      expect(accountCountAfter?.value).toBe(accountCountBefore?.value);
    } finally {
      await client.end();
    }
  });

  it("advances learner activity on a time-separated quiz retry", async () => {
    const schoolId = randomUUID();
    const repId = `sales-retry-${randomUUID()}`;
    const moduleId = randomUUID();
    const lessonId = randomUUID();
    const questionId = randomUUID();
    const { db: directDb, client } = createPrivilegedDb();
    try {
      await directDb.insert(schools).values({
        id: schoolId,
        name: "Sales Retry Activity School",
      });
      const username = `retry.rep.${randomUUID().slice(0, 8)}`;
      await directDb.insert(users).values({
        id: repId,
        username,
        displayUsername: username,
        name: "Retry Rep",
        role: "SALES_REP",
        schoolId,
      });
      await directDb.insert(salesModules).values({
        id: moduleId,
        slug: `retry-${randomUUID().slice(0, 8)}`,
        title: "Retry Activity",
        description: "Retry activity proof",
        order: 1000,
      });
      await directDb.insert(salesLessons).values({
        id: lessonId,
        moduleId,
        title: "Retry Quiz",
        type: "quiz",
        order: 1,
        reviewStatus: "approved",
      });
      await directDb.insert(salesQuizQuestions).values({
        id: questionId,
        lessonId,
        question: "Choose the approved response",
        optionsJson: ["approved", "retry"],
        correctAnswer: "approved",
        explanation: "Approved is correct",
        order: 1,
      });

      const user = {
        id: repId,
        username: "retry-rep",
        name: "Retry Rep",
        role: "SALES_REP" as const,
        schoolId,
        xp: 0,
        level: 1,
        cefrLevel: "A1-" as const,
      };
      const tenant = { schoolId };
      const context = {
        db: createTenantDB(db, tenant),
        user,
        tenant,
      };
      await submitQuiz(context, {
        lessonId,
        answers: { [questionId]: "retry" },
      });
      const [first] = await directDb
        .select({ updatedAt: salesProgress.updatedAt })
        .from(salesProgress)
        .where(
          and(
            eq(salesProgress.userId, repId),
            eq(salesProgress.lessonId, lessonId),
          ),
        )
        .limit(1);

      await new Promise((resolve) => setTimeout(resolve, 25));
      await submitQuiz(context, {
        lessonId,
        answers: { [questionId]: "retry" },
      });
      const [second] = await directDb
        .select({ updatedAt: salesProgress.updatedAt })
        .from(salesProgress)
        .where(
          and(
            eq(salesProgress.userId, repId),
            eq(salesProgress.lessonId, lessonId),
          ),
        )
        .limit(1);

      expect(first?.updatedAt).toBeInstanceOf(Date);
      expect(second?.updatedAt.getTime()).toBeGreaterThan(
        first!.updatedAt.getTime(),
      );
    } finally {
      await directDb.delete(salesModules).where(eq(salesModules.id, moduleId));
      await directDb.delete(users).where(eq(users.id, repId));
      await directDb.delete(schools).where(eq(schools.id, schoolId));
      await client.end();
    }
  });
});
