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

import { getTeachers, getTeacherStatistics } from "../teacherModel";
import type { UserWithRoles } from "@/server/utils/auth";

const SCHOOL_A = "00000000-0000-0000-0000-0000000000a1";
const SCHOOL_B = "00000000-0000-0000-0000-0000000000b1";

let harness: TestDb;

/** Inserts one user. */
async function seedUser(id: string, role: string, schoolId: string | null) {
  await harness.db.execute(sql`INSERT INTO users (id, username, display_username, name, email, role, school_id, password)
    VALUES (${id}, ${id}, ${id}, ${id}, ${`${id}@x.test`}, ${role}, ${schoolId}, 'orig')`);
}

/** Builds a caller context. */
function caller(role: "SYSTEM" | "ADMIN", schoolId: string | null): UserWithRoles {
  return { id: "caller", email: null, schoolId, level: 1, role, roles: [], SchoolAdmins: [] };
}

const params = { page: 1, limit: 50, search: "", role: "teacher" };

beforeAll(async () => {
  harness = await createTestDb();
}, 60_000);
afterAll(async () => {
  await harness.close();
});
beforeEach(async () => {
  await harness.reset();
  await harness.db.execute(sql`INSERT INTO schools (id, name) VALUES (${SCHOOL_A}, 'A'), (${SCHOOL_B}, 'B')`);
  await harness.db.execute(sql`INSERT INTO roles (name) VALUES ('teacher')`);
  await seedUser("ta", "TEACHER", SCHOOL_A);
  await seedUser("tb", "TEACHER", SCHOOL_B);
  await harness.db.execute(sql`INSERT INTO user_roles (user_id, role_id)
    SELECT u.id, r.id FROM users u, roles r WHERE r.name = 'teacher' AND u.id IN ('ta', 'tb')`);
});

describe("getTeachers schoolId filter (S1)", () => {
  it("filters to one school for SYSTEM", async () => {
    const { teachers } = await getTeachers({ ...params, userWithRoles: caller("SYSTEM", null), schoolId: SCHOOL_B });
    expect(teachers.map((t) => t.id)).toEqual(["tb"]);
  });

  it("lists every school for SYSTEM without the filter", async () => {
    const { teachers } = await getTeachers({ ...params, userWithRoles: caller("SYSTEM", null) });
    expect(teachers.map((t) => t.id).sort()).toEqual(["ta", "tb"]);
  });

  it("ignores the filter for an ADMIN and keeps the own school", async () => {
    const { teachers } = await getTeachers({ ...params, userWithRoles: caller("ADMIN", SCHOOL_A), schoolId: SCHOOL_B });
    expect(teachers.map((t) => t.id)).toEqual(["ta"]);
  });
});

describe("getTeacherStatistics schoolId filter (L-statistics)", () => {
  it("counts one school for SYSTEM with the filter", async () => {
    expect((await getTeacherStatistics(caller("SYSTEM", null), SCHOOL_B)).totalTeachers).toBe(1);
  });

  it("counts every school for SYSTEM without the filter", async () => {
    expect((await getTeacherStatistics(caller("SYSTEM", null))).totalTeachers).toBe(2);
  });

  it("ignores the filter for an ADMIN", async () => {
    expect((await getTeacherStatistics(caller("ADMIN", SCHOOL_A), SCHOOL_B)).totalTeachers).toBe(1);
  });
});
