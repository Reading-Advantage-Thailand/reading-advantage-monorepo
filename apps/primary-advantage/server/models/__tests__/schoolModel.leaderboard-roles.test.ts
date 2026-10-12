// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { createTestDb, type TestDb } from "./helpers/testDb";

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/db")>();
  const dbProxy = new Proxy(
    {},
    {
      get(_target, property) {
        const real = (globalThis as Record<string, unknown>).__TEST_DB__ as
          | Record<string | symbol, unknown>
          | undefined;
        if (!real) throw new Error("Test DB not initialized");
        const value = real[property];
        return typeof value === "function"
          ? (value as (...args: unknown[]) => unknown).bind(real)
          : value;
      },
    },
  );
  return { ...actual, db: dbProxy };
});

import { updateSchoolRankingModel, getSchoolLeaderboardModel } from "../schoolModel";

const SCHOOL = "00000000-0000-0000-0000-0000000000a1";
let harness: TestDb;

/** Inserts one user. */
async function seedUser(id: string, role: string) {
  await harness.db.execute(sql`INSERT INTO users (id, username, display_username, name, email, role, school_id)
    VALUES (${id}, ${id}, ${id}, ${id}, ${`${id}@x.test`}, ${role}, ${SCHOOL})`);
}

/** Inserts one xp log row of the current month. */
async function seedXp(userId: string, xp: number) {
  await harness.db.execute(sql`INSERT INTO xp_logs (user_id, xp_earned, activity_id, activity_type)
    VALUES (${userId}, ${xp}, 'a', 'article')`);
}

beforeAll(async () => {
  harness = await createTestDb();
  await harness.db.execute(sql`CREATE TABLE IF NOT EXISTS leaderboards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
    details jsonb,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now())`);
}, 60_000);
afterAll(async () => {
  await harness.db.execute(sql`DROP TABLE IF EXISTS leaderboards`);
  await harness.close();
});

describe.each([
  { shape: "migrated (no roles rows)", withRoles: false },
  { shape: "legacy (roles rows)", withRoles: true },
])("monthly leaderboard, $shape", ({ withRoles }) => {
  beforeEach(async () => {
    await harness.db.execute(sql`DELETE FROM leaderboards`);
    await harness.reset();
    await harness.db.execute(sql`INSERT INTO schools (id, name) VALUES (${SCHOOL}, 'A')`);
    await seedUser("s1", "STUDENT");
    await seedUser("s2", "STUDENT");
    await seedUser("t1", "TEACHER");
    await seedXp("s1", 50);
    await seedXp("s2", 80);
    await seedXp("t1", 500);
    if (withRoles) {
      await harness.db.execute(sql`INSERT INTO roles (name) VALUES ('student'), ('teacher')`);
      await harness.db.execute(sql`INSERT INTO user_roles (user_id, role_id)
        SELECT 's1', id FROM roles WHERE name = 'student'`);
    }
  });

  it("ranks the students by users.role and leaves the teacher out", async () => {
    const update = await updateSchoolRankingModel();
    expect(update.success).toBe(true);
    const out = await getSchoolLeaderboardModel(SCHOOL);
    expect(out.success).toBe(true);
    const results = (out.data as { results: { userId: string; rank: number; xp: number }[] }).results;
    expect(results.map((r) => [r.userId, r.rank, r.xp])).toEqual([["s2", 1, 80], ["s1", 2, 50]]);
  });

  it("gives a student outside the top five a rank", async () => {
    for (let i = 0; i < 6; i++) {
      await seedUser(`x${i}`, "STUDENT");
      await seedXp(`x${i}`, 100 + i);
    }
    await updateSchoolRankingModel();
    const out = await getSchoolLeaderboardModel(SCHOOL, "s1");
    const results = (out.data as { results: { userId: string; rank: number }[] }).results;
    expect(results.find((r) => r.userId === "s1")?.rank).toBe(8);
  });
});
