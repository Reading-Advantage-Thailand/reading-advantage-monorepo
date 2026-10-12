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
const authMocks = vi.hoisted(() => ({ recordAuditEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/server/utils/passwordEvents", () => ({
  afterPasswordWrite: vi.fn().mockResolvedValue(undefined),
  auditUserDeleted: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@reading-advantage/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@reading-advantage/auth")>()),
  recordAuditEvent: authMocks.recordAuditEvent,
  hashPassword: async (password: string) => `hash:${password}`,
}));

import {
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getTeachers,
  getTeacherById,
  getTeacherStatistics,
} from "../teacherModel";
import type { UserWithRoles } from "@/server/utils/auth";

const SCHOOL_A = "00000000-0000-0000-0000-0000000000a1";
const SCHOOL_B = "00000000-0000-0000-0000-0000000000b1";

let harness: TestDb;

/** An ADMIN session caller of school A. */
const adminA: UserWithRoles = {
  id: "caller", email: "caller@a.test", schoolId: SCHOOL_A, level: 1,
  role: "ADMIN", roles: [], SchoolAdmins: [],
};

/** Inserts one user with a credential account. */
async function seedUser(id: string, role: string, schoolId: string | null) {
  await harness.db.execute(sql`INSERT INTO users (id, username, display_username, name, email, role, school_id, password)
    VALUES (${id}, ${id}, ${id}, ${id}, ${`${id}@x.test`}, ${role}, ${schoolId}, 'orig')`);
}

/** Inserts one session for a user. */
async function seedSession(userId: string) {
  await harness.db.execute(sql`INSERT INTO sessions (id, token, token_hash, user_id, expires_at)
    VALUES (${`s_${userId}`}, ${`t_${userId}`}, ${`h_${userId}`}, ${userId}, now() + interval '1 day')`);
}

/** Reads the role and the session count of a user. */
async function state(userId: string) {
  const r = await harness.db.execute(sql`SELECT u.role,
    (SELECT count(*)::int FROM sessions s WHERE s.user_id = u.id) AS sessions,
    (SELECT count(*)::int FROM user_roles ur WHERE ur.user_id = u.id) AS user_roles
    FROM users u WHERE u.id = ${userId}`);
  return r.rows[0] as { role: string; sessions: number; user_roles: number };
}

beforeAll(async () => {
  harness = await createTestDb();
}, 60_000);
afterAll(async () => {
  await harness.close();
});
beforeEach(async () => {
  authMocks.recordAuditEvent.mockClear();
  await harness.reset();
  await harness.db.execute(sql`INSERT INTO schools (id, name) VALUES (${SCHOOL_A}, 'A'), (${SCHOOL_B}, 'B')`);
  await seedUser("caller", "ADMIN", SCHOOL_A);
});

describe.each([
  { shape: "migrated (no roles rows)", withRoles: false },
  { shape: "legacy (roles rows)", withRoles: true },
])("teacher role change, $shape", ({ withRoles }) => {
  beforeEach(async () => {
    if (withRoles) {
      await harness.db.execute(sql`INSERT INTO roles (name) VALUES ('teacher'), ('admin')`);
    }
  });

  it("writes users.role, ends the sessions, and records the audit event", async () => {
    await seedUser("t1", "TEACHER", SCHOOL_A);
    await seedSession("t1");
    const result = await updateTeacher("t1", { role: "admin" }, adminA);
    expect(result.success).toBe(true);
    const row = await state("t1");
    expect(row.role).toBe("ADMIN");
    expect(row.sessions).toBe(0);
    expect(row.user_roles).toBe(withRoles ? 1 : 0);
    expect(authMocks.recordAuditEvent).toHaveBeenCalledTimes(1);
    const [ctx, payload] = authMocks.recordAuditEvent.mock.calls[0];
    expect(ctx.actorUserId).toBe("caller");
    expect(payload).toMatchObject({
      action: "user:role_changed",
      targetId: "t1",
      metadata: { from: "TEACHER", to: "ADMIN" },
    });
  });

  it("refuses a user of another school and changes nothing", async () => {
    await seedUser("tb", "TEACHER", SCHOOL_B);
    await seedSession("tb");
    const result = await updateTeacher("tb", { role: "admin" }, adminA);
    expect(result.success).toBe(false);
    expect(await state("tb")).toMatchObject({ role: "TEACHER", sessions: 1 });
    expect(authMocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("refuses a user of a higher rank and changes nothing", async () => {
    await seedUser("a2", "ADMIN", SCHOOL_A);
    await seedSession("a2");
    const result = await updateTeacher("a2", { role: "teacher" }, adminA);
    expect(result.success).toBe(false);
    expect(await state("a2")).toMatchObject({ role: "ADMIN", sessions: 1 });
    expect(authMocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("does not end sessions or audit when the role stays the same", async () => {
    await seedUser("t2", "TEACHER", SCHOOL_A);
    await seedSession("t2");
    const result = await updateTeacher("t2", { role: "teacher" }, adminA);
    expect(result.success).toBe(true);
    expect(await state("t2")).toMatchObject({ role: "TEACHER", sessions: 1 });
    expect(authMocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("re-roles an existing same-school teacher through createTeacher", async () => {
    await seedUser("t3", "TEACHER", SCHOOL_A);
    await seedSession("t3");
    const result = await createTeacher({ name: "t3", email: "t3@x.test", role: "admin", userWithRoles: adminA, force: true });
    expect(result.success).toBe(true);
    expect(await state("t3")).toMatchObject({ role: "ADMIN", sessions: 0 });
  });
});

describe.each([
  { shape: "migrated (no roles rows)", withRoles: false },
  { shape: "legacy (roles rows)", withRoles: true },
])("teacher reads, $shape", ({ withRoles }) => {
  beforeEach(async () => {
    if (withRoles) {
      await harness.db.execute(sql`INSERT INTO roles (name) VALUES ('teacher'), ('admin'), ('student')`);
    }
    await seedUser("t1", "TEACHER", SCHOOL_A);
    await seedUser("t2", "TEACHER", SCHOOL_A);
    await seedUser("s1", "STUDENT", SCHOOL_A);
    await seedUser("tb", "TEACHER", SCHOOL_B);
    if (withRoles) {
      await harness.db.execute(sql`INSERT INTO user_roles (user_id, role_id)
        SELECT 't1', id FROM roles WHERE name = 'teacher'`);
    }
  });

  it("lists the teachers and the admin of the school with the right count", async () => {
    const out = await getTeachers({ page: 1, limit: 20, search: "", role: "", userWithRoles: adminA });
    expect(out.teachers.map((t) => t.id).sort()).toEqual(["caller", "t1", "t2"]);
    expect(out.totalCount).toBe(3);
  });

  it("filters the list by one role", async () => {
    const out = await getTeachers({ page: 1, limit: 20, search: "", role: "teacher", userWithRoles: adminA });
    expect(out.teachers.map((t) => t.id).sort()).toEqual(["t1", "t2"]);
    expect(out.totalCount).toBe(2);
  });

  it("returns one teacher by id, and none of another school", async () => {
    expect((await getTeacherById("t2", adminA))?.id).toBe("t2");
    expect(await getTeacherById("tb", adminA)).toBeNull();
    expect(await getTeacherById("s1", adminA)).toBeNull();
  });

  it("counts the teachers in the statistics", async () => {
    expect((await getTeacherStatistics(adminA)).totalTeachers).toBe(3);
  });

  it("deletes a teacher found without a user_roles row", async () => {
    const result = await deleteTeacher("t2", adminA);
    expect(result.success).toBe(true);
    const r = await harness.db.execute(sql`SELECT 1 FROM users WHERE id = 't2'`);
    expect(r.rows.length).toBe(0);
  });
});
