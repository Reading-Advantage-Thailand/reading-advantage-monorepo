// @vitest-environment node
import { asc, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  db,
  salesRoleplayAttempts,
  users,
} from "@reading-advantage/db";
import { createRoleplayAttempt } from "../sales/mutations.js";

const runRealDatabase = process.env.RUN_SALES_REAL_DB_TESTS === "true";
const describeRealDatabase = runRealDatabase ? describe : describe.skip;
const scenarioId = "00000000-0000-0000-0000-000000000054";
const userId = "__sales_runtime_concurrency_user__";

describeRealDatabase("Sales roleplay allocation (real PostgreSQL)", () => {
  it("allocates unique sequential numbers for concurrent attempts", async () => {
    await db
      .insert(users)
      .values({
        id: userId,
        username: "__sales_runtime_concurrency__",
        displayUsername: "__sales_runtime_concurrency__",
        name: "Concurrency Probe",
        role: "SALES_REP",
      })
      .onConflictDoNothing();

    const user = {
      id: userId,
      username: "__sales_runtime_concurrency__",
      name: "Concurrency Probe",
      role: "SALES_REP" as const,
      schoolId: null,
      xp: 0,
      level: 1,
      cefrLevel: "A1" as const,
    };
    const tenant = { schoolId: null };

    await Promise.all(
      Array.from({ length: 8 }, () =>
        createRoleplayAttempt(
          { db, user, tenant },
          { scenarioId, audioStorageKey: null, durationMs: 1 },
        ),
      ),
    );

    const attempts = await db
      .select({ attemptNumber: salesRoleplayAttempts.attemptNumber })
      .from(salesRoleplayAttempts)
      .where(eq(salesRoleplayAttempts.userId, userId))
      .orderBy(asc(salesRoleplayAttempts.attemptNumber));

    expect(attempts.map((attempt) => attempt.attemptNumber)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]);
  });
});
