// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { createTestDb, type TestDb } from "../../models/__tests__/helpers/testDb";

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

import { authorizeResetTarget, callerEffectiveRank, resetActorRank } from "../auth";

const SCHOOL_A = "00000000-0000-0000-0000-0000000000a1";
const SCHOOL_B = "00000000-0000-0000-0000-0000000000b1";

let harness: TestDb;

/** Inserts one user. */
async function seedUser(id: string, role: string, schoolId: string | null) {
  await harness.db.execute(sql`INSERT INTO users (id, username, display_username, name, email, role, school_id)
    VALUES (${id}, ${id}, ${id}, ${id}, ${`${id}@x.test`}, ${role}, ${schoolId})`);
}

/** Grants a legacy role row. */
async function giveRole(userId: string, roleName: string) {
  await harness.db.execute(sql`INSERT INTO user_roles (user_id, role_id)
    SELECT ${userId}, id FROM roles WHERE name = ${roleName}`);
}

/** Builds the principal the shared handler passes. */
const principal = (id: string, role: string, schoolId: string | null) => ({ id, role, schoolId });

beforeAll(async () => {
  harness = await createTestDb();
}, 60_000);
afterAll(async () => {
  await harness.close();
});
beforeEach(async () => {
  await harness.reset();
  await harness.db.execute(sql`INSERT INTO schools (id, name) VALUES (${SCHOOL_A}, 'A'), (${SCHOOL_B}, 'B')`);
  await harness.db.execute(sql`INSERT INTO roles (name) VALUES ('teacher'), ('admin'), ('student')`);
});

describe("authorizeResetTarget", () => {
  it("lets an ADMIN reset a teacher in the same school", async () => {
    await seedUser("admin", "ADMIN", SCHOOL_A);
    await seedUser("teacher", "TEACHER", SCHOOL_A);
    expect(await authorizeResetTarget(principal("admin", "ADMIN", SCHOOL_A), principal("teacher", "TEACHER", SCHOOL_A))).toBe(true);
  });

  it("refuses an ADMIN across schools", async () => {
    await seedUser("admin", "ADMIN", SCHOOL_A);
    await seedUser("teacher-b", "TEACHER", SCHOOL_B);
    expect(await authorizeResetTarget(principal("admin", "ADMIN", SCHOOL_A), principal("teacher-b", "TEACHER", SCHOOL_B))).toBe(false);
  });

  it("refuses a school-less actor and never matches null with null", async () => {
    await seedUser("teacher", "TEACHER", null);
    await seedUser("student", "STUDENT", null);
    expect(await authorizeResetTarget(principal("teacher", "TEACHER", null), principal("student", "STUDENT", null))).toBe(false);
    await seedUser("admin", "ADMIN", null);
    expect(await authorizeResetTarget(principal("admin", "ADMIN", null), principal("student", "STUDENT", null))).toBe(false);
  });

  it("refuses a school-less target for a school actor", async () => {
    await seedUser("admin", "ADMIN", SCHOOL_A);
    await seedUser("student", "STUDENT", null);
    expect(await authorizeResetTarget(principal("admin", "ADMIN", SCHOOL_A), principal("student", "STUDENT", null))).toBe(false);
  });

  it("refuses a teacher who resets an owner with session STUDENT and a school_admins row", async () => {
    await seedUser("teacher", "TEACHER", SCHOOL_A);
    await seedUser("owner", "STUDENT", SCHOOL_A);
    await harness.db.execute(sql`INSERT INTO school_admins (user_id, school_id) VALUES ('owner', ${SCHOOL_A})`);
    expect(await authorizeResetTarget(principal("teacher", "TEACHER", SCHOOL_A), principal("owner", "STUDENT", SCHOOL_A))).toBe(false);
  });

  it("refuses a co-admin (session TEACHER, legacy admin row) against a legacy admin and allows a student", async () => {
    await seedUser("co", "TEACHER", SCHOOL_A);
    await giveRole("co", "admin");
    await seedUser("other-admin", "TEACHER", SCHOOL_A);
    await giveRole("other-admin", "admin");
    await seedUser("student", "STUDENT", SCHOOL_A);
    expect(await authorizeResetTarget(principal("co", "TEACHER", SCHOOL_A), principal("other-admin", "TEACHER", SCHOOL_A))).toBe(false);
    expect(await authorizeResetTarget(principal("co", "TEACHER", SCHOOL_A), principal("student", "STUDENT", SCHOOL_A))).toBe(true);
  });

  it("returns the effective actor rank for a co-admin with a legacy admin row", async () => {
    await seedUser("co", "TEACHER", SCHOOL_A);
    await giveRole("co", "admin");
    expect(await resetActorRank(principal("co", "TEACHER", SCHOOL_A))).toBe("ADMIN");
  });

  it("returns no actor rank for an actor without a school", async () => {
    await seedUser("co", "TEACHER", SCHOOL_A);
    expect(await resetActorRank({ id: "co", role: "TEACHER", schoolId: null })).toBeUndefined();
  });

  it("lets a teacher reset a same-school student", async () => {
    await seedUser("teacher", "TEACHER", SCHOOL_A);
    await seedUser("student", "STUDENT", SCHOOL_A);
    expect(await authorizeResetTarget(principal("teacher", "TEACHER", SCHOOL_A), principal("student", "STUDENT", SCHOOL_A))).toBe(true);
  });
});

describe("school_admins rows of another school (M-2)", () => {
  it("does not lift a reset actor through a school_admins row of another school", async () => {
    await seedUser("teacher-x", "TEACHER", SCHOOL_A);
    await seedUser("teacher-y", "TEACHER", SCHOOL_A);
    await harness.db.execute(sql`INSERT INTO school_admins (user_id, school_id) VALUES ('teacher-x', ${SCHOOL_B})`);
    expect(await authorizeResetTarget(principal("teacher-x", "TEACHER", SCHOOL_A), principal("teacher-y", "TEACHER", SCHOOL_A))).toBe(false);
  });

  it("lifts a reset actor through a school_admins row of its own school", async () => {
    await seedUser("teacher-x", "TEACHER", SCHOOL_A);
    await seedUser("teacher-y", "TEACHER", SCHOOL_A);
    await harness.db.execute(sql`INSERT INTO school_admins (user_id, school_id) VALUES ('teacher-x', ${SCHOOL_A})`);
    expect(await authorizeResetTarget(principal("teacher-x", "TEACHER", SCHOOL_A), principal("teacher-y", "TEACHER", SCHOOL_A))).toBe(true);
  });

  it("still counts a school_admins row of any school for a target", async () => {
    await seedUser("admin", "ADMIN", SCHOOL_A);
    await seedUser("odd", "TEACHER", SCHOOL_A);
    await harness.db.execute(sql`INSERT INTO school_admins (user_id, school_id) VALUES ('odd', ${SCHOOL_B})`);
    expect(await authorizeResetTarget(principal("admin", "ADMIN", SCHOOL_A), principal("odd", "TEACHER", SCHOOL_A))).toBe(false);
  });

  it("callerEffectiveRank counts only school_admins rows of the caller's own school", () => {
    const caller = { schoolId: SCHOOL_A, role: "TEACHER", roles: [] };
    expect(callerEffectiveRank({ ...caller, SchoolAdmins: [{ id: "1", schoolId: SCHOOL_B }] })).toBe("TEACHER");
    expect(callerEffectiveRank({ ...caller, SchoolAdmins: [{ id: "1", schoolId: SCHOOL_A }] })).toBe("ADMIN");
    expect(callerEffectiveRank({ ...caller, schoolId: null, SchoolAdmins: [{ id: "1", schoolId: SCHOOL_A }] })).toBe("TEACHER");
  });
});
