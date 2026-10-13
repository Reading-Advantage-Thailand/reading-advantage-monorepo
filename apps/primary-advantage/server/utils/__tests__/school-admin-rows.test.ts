// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { createTestDb, type TestDb } from "@/server/models/__tests__/helpers/testDb";

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/db")>();
  const dbProxy = new Proxy({}, {
    get(_target, property) {
      const real = (globalThis as Record<string, unknown>).__TEST_DB__ as Record<string | symbol, unknown>;
      const value = real[property];
      return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(real) : value;
    },
  });
  return { ...actual, db: dbProxy };
});

import { loadOwnSchoolAdminRows, withSchoolAdminRows } from "../school-admin-rows";

const S1 = "00000000-0000-0000-0000-0000000000a1";
const S2 = "00000000-0000-0000-0000-0000000000b1";
let h: TestDb;

beforeAll(async () => { h = await createTestDb(); }, 60_000);
afterAll(async () => { await h.close(); });
beforeEach(async () => {
  await h.reset();
  await h.db.execute(sql`INSERT INTO schools (id, name) VALUES (${S1}, 'A'), (${S2}, 'B')`);
  for (const id of ["t1", "t2"]) {
    await h.db.execute(sql`INSERT INTO users (id, username, display_username, name, role, school_id)
      VALUES (${id}, ${id}, ${id}, ${id}, 'TEACHER', ${S1})`);
  }
  await h.db.execute(sql`INSERT INTO school_admins (school_id, user_id) VALUES (${S1}, 't1'), (${S2}, 't2')`);
});

describe("loadOwnSchoolAdminRows", () => {
  it("returns the row of the own school only", async () => {
    expect(await loadOwnSchoolAdminRows("t1", S1)).toHaveLength(1);
    expect(await loadOwnSchoolAdminRows("t2", S1)).toHaveLength(0);
  });
});

describe("withSchoolAdminRows", () => {
  it("adds the SchoolAdmins rows to a TEACHER with a row", async () => {
    const user = await withSchoolAdminRows({ id: "t1", role: "TEACHER", schoolId: S1 });
    expect(user.SchoolAdmins).toHaveLength(1);
    expect(user.SchoolAdmins[0].schoolId).toBe(S1);
  });
  it("adds an empty list for a TEACHER with no row and for other roles", async () => {
    expect((await withSchoolAdminRows({ id: "t2", role: "TEACHER", schoolId: S1 })).SchoolAdmins).toEqual([]);
    expect((await withSchoolAdminRows({ id: "t1", role: "STUDENT", schoolId: S1 })).SchoolAdmins).toEqual([]);
  });
});
