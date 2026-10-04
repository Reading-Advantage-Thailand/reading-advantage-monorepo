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
const eventMocks = vi.hoisted(() => ({ afterPasswordWrite: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/server/utils/passwordEvents", () => eventMocks);
vi.mock("@reading-advantage/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@reading-advantage/auth")>()),
  hashPassword: async (password: string) => `hash:${password}`,
}));

import { updateStudent, createStudent } from "../studentModel";
import type { UserWithRoles } from "@/server/utils/auth";

const SCHOOL_A = "00000000-0000-0000-0000-0000000000a1";
const SCHOOL_B = "00000000-0000-0000-0000-0000000000b1";

let harness: TestDb;

/** An ADMIN session caller with no legacy school_admins row. */
const sessionAdmin: UserWithRoles = {
  id: "caller", email: "caller@a.test", schoolId: SCHOOL_A, level: 1,
  role: "ADMIN", roles: [], SchoolAdmins: [],
};

/** Reads the credential hash and school of one user. */
async function snapshot(userId: string) {
  const rows = await harness.db.execute(sql`
    SELECT u.password AS user_password, u.school_id, u.name, a.password AS account_password
    FROM users u LEFT JOIN accounts a ON a.user_id = u.id AND a.provider_id = 'credential'
    WHERE u.id = ${userId}`);
  return rows.rows[0] as Record<string, unknown>;
}

/** Inserts one student-role user with a credential account. */
async function seedStudent(id: string, role: string, schoolId: string | null) {
  await harness.db.execute(sql`INSERT INTO users (id, username, display_username, name, email, role, school_id, password)
    VALUES (${id}, ${id}, ${id}, ${id}, ${`${id}@x.test`}, ${role}, ${schoolId}, 'orig')`);
  await harness.db.execute(sql`INSERT INTO accounts (id, user_id, provider_id, password)
    VALUES (${`${id}_credential`}, ${id}, 'credential', 'orig')`);
  await harness.db.execute(sql`INSERT INTO user_roles (user_id, role_id)
    SELECT ${id}, id FROM roles WHERE name = 'student'`);
}

beforeAll(async () => {
  harness = await createTestDb();
}, 60_000);
afterAll(async () => {
  await harness.close();
});
beforeEach(async () => {
  eventMocks.afterPasswordWrite.mockClear();
  await harness.reset();
  await harness.db.execute(sql`INSERT INTO schools (id, name) VALUES (${SCHOOL_A}, 'A'), (${SCHOOL_B}, 'B')`);
  await harness.db.execute(sql`INSERT INTO roles (name) VALUES ('student'), ('teacher')`);
});

describe("updateStudent scope and target rank (H2)", () => {
  it("cannot touch a student of another school without a school_admins row", async () => {
    await seedStudent("student-b", "STUDENT", SCHOOL_B);
    const result = await updateStudent("student-b", { name: "Hacked", password: "Takeover-pass-1" }, sessionAdmin);
    expect(result.success).toBe(false);
    const row = await snapshot("student-b");
    expect(row.account_password).toBe("orig");
    expect(row.name).toBe("student-b");
  });

  it("refuses a password write when the target session role outranks STUDENT", async () => {
    await seedStudent("odd-admin", "ADMIN", SCHOOL_A);
    const result = await updateStudent("odd-admin", { password: "Takeover-pass-1" }, sessionAdmin);
    expect(result.success).toBe(false);
    expect((await snapshot("odd-admin")).account_password).toBe("orig");
  });

  it("fails closed for a non-SYSTEM caller without a school", async () => {
    await seedStudent("student-b", "STUDENT", SCHOOL_B);
    const result = await updateStudent("student-b", { name: "Hacked" }, { ...sessionAdmin, schoolId: null });
    expect(result.success).toBe(false);
  });

  it("updates a same-school student and its password", async () => {
    await seedStudent("student-a", "STUDENT", SCHOOL_A);
    const result = await updateStudent("student-a", { password: "New-password-1" }, sessionAdmin);
    expect(result.success).toBe(true);
    expect((await snapshot("student-a")).account_password).toBe("hash:New-password-1");
  });

  it("lets SYSTEM update a student in any school", async () => {
    await seedStudent("student-b", "STUDENT", SCHOOL_B);
    const result = await updateStudent("student-b", { name: "Renamed" }, { ...sessionAdmin, role: "SYSTEM", schoolId: null });
    expect(result.success).toBe(true);
  });
});

describe("updateStudent effective target rank", () => {
  it("a teacher cannot set the password of a student who holds a school_admins row", async () => {
    await seedStudent("owner", "STUDENT", SCHOOL_A);
    await harness.db.execute(sql`INSERT INTO school_admins (user_id, school_id) VALUES ('owner', ${SCHOOL_A})`);
    const teacher: UserWithRoles = { ...sessionAdmin, role: "TEACHER" };
    const result = await updateStudent("owner", { password: "Takeover-pass-1" }, teacher);
    expect(result.success).toBe(false);
    expect((await snapshot("owner")).account_password).toBe("orig");
  });
});

describe("createStudent fails closed without a school (M2)", () => {
  it("refuses a non-SYSTEM caller without a school", async () => {
    const result = await createStudent({
      name: "n", email: "fresh@x.test", cefrLevel: "A1", password: "Valid-pass-123",
      userWithRoles: { ...sessionAdmin, schoolId: null },
    });
    expect(result.success).toBe(false);
    const rows = await harness.db.execute(sql`SELECT id FROM users WHERE email = 'fresh@x.test'`);
    expect(rows.rows).toHaveLength(0);
  });

  it("rejects a classroom of another school", async () => {
    await seedStudent("caller", "ADMIN", SCHOOL_A);
    await harness.db.execute(sql`INSERT INTO classrooms (id, name, school_id, teacher_id) VALUES ('00000000-0000-0000-0000-0000000000c1', 'B class', ${SCHOOL_B}, 'caller')`);
    const result = await createStudent({
      name: "n", email: "fresh@x.test", cefrLevel: "A1", classroomId: "00000000-0000-0000-0000-0000000000c1", userWithRoles: sessionAdmin,
    });
    expect(result.success).toBe(false);
  });
});

describe("password write events (M1)", () => {
  it("records an audit event for a new student without revoking", async () => {
    const result = await createStudent({
      name: "n", email: "fresh@x.test", cefrLevel: "A1", password: "Valid-pass-123", userWithRoles: sessionAdmin,
    });
    expect(result.success).toBe(true);
    expect(eventMocks.afterPasswordWrite).toHaveBeenCalledWith({
      userId: result.student!.id, actor: { id: "caller", role: "ADMIN" }, created: true,
    });
  });

  it("revokes and audits when updateStudent changes a password", async () => {
    await seedStudent("student-a", "STUDENT", SCHOOL_A);
    await updateStudent("student-a", { password: "New-password-1" }, sessionAdmin);
    expect(eventMocks.afterPasswordWrite).toHaveBeenCalledWith({
      userId: "student-a", actor: { id: "caller", role: "ADMIN" }, created: false,
    });
  });
});
