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

import { getSchoolDetail } from "../schoolModel";

const SCHOOL = "00000000-0000-0000-0000-0000000000b1";
const OTHER = "00000000-0000-0000-0000-0000000000b2";
let harness: TestDb;

/** Inserts one user. */
async function seedUser(id: string, role: string, schoolId = SCHOOL) {
  await harness.db.execute(sql`INSERT INTO users (id, username, display_username, name, email, role, school_id)
    VALUES (${id}, ${id}, ${id}, ${id}, ${`${id}@x.test`}, ${role}, ${schoolId})`);
}

/** Inserts one school_admins row. */
async function seedAdminRow(userId: string) {
  await harness.db.execute(sql`INSERT INTO school_admins (school_id, user_id) VALUES (${SCHOOL}, ${userId})`);
}

beforeAll(async () => {
  harness = await createTestDb();
}, 60_000);
afterAll(async () => {
  await harness.close();
});

describe("getSchoolDetail admins", () => {
  beforeEach(async () => {
    await harness.reset();
    await harness.db.execute(sql`INSERT INTO schools (id, name) VALUES (${SCHOOL}, 'A'), (${OTHER}, 'B')`);
  });

  it("counts the ADMIN accounts of a migrated school that has no school_admins rows", async () => {
    await seedUser("adm1", "ADMIN");
    await seedUser("adm2", "ADMIN");
    await seedUser("t1", "TEACHER");
    await seedUser("adm3", "ADMIN", OTHER);
    const school = await getSchoolDetail(SCHOOL);
    expect(school?._count.admins).toBe(2);
    expect(school?.admins.map((a) => a.id).sort()).toEqual(["adm1", "adm2"]);
  });

  it("lists a school_admins row holder and an ADMIN account once each", async () => {
    await seedUser("adm1", "ADMIN");
    await seedUser("t1", "TEACHER");
    await seedUser("adm2", "ADMIN");
    await seedAdminRow("adm1");
    await seedAdminRow("t1");
    const school = await getSchoolDetail(SCHOOL);
    expect(school?._count.admins).toBe(3);
    expect(school?.admins.map((a) => a.user.id).sort()).toEqual(["adm1", "adm2", "t1"]);
  });
});
