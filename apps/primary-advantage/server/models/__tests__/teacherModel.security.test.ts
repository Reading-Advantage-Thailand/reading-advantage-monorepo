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

import { createTeacher, updateTeacher } from "../teacherModel";
import type { UserWithRoles } from "@/server/utils/auth";

const SCHOOL_A = "00000000-0000-0000-0000-0000000000a1";
const SCHOOL_B = "00000000-0000-0000-0000-0000000000b1";

let harness: TestDb;

/** Builds the caller context a school admin gets from validateUser. */
function adminCaller(schoolId: string): UserWithRoles {
  return {
    id: "caller",
    email: "caller@a.test",
    schoolId,
    level: 1,
    roles: [],
    SchoolAdmins: [{ id: "sa-1", schoolId }],
  };
}

/** Reads the credential hash and school of one user. */
async function snapshot(userId: string) {
  const rows = await harness.db.execute(sql`
    SELECT u.password AS user_password, u.school_id, u.role, a.password AS account_password
    FROM users u LEFT JOIN accounts a ON a.user_id = u.id AND a.provider_id = 'credential'
    WHERE u.id = ${userId}`);
  return rows.rows[0] as Record<string, unknown>;
}

/** Inserts one user with a credential account and an optional school. */
async function seedUser(id: string, role: string, schoolId: string | null) {
  await harness.db.execute(sql`INSERT INTO users (id, username, display_username, name, email, role, school_id, password)
    VALUES (${id}, ${id}, ${id}, ${id}, ${`${id}@x.test`}, ${role}, ${schoolId}, 'orig')`);
  await harness.db.execute(sql`INSERT INTO accounts (id, user_id, provider_id, password)
    VALUES (${`${id}_credential`}, ${id}, 'credential', 'orig')`);
}

/** Grants a legacy user_roles row by role name. */
async function giveRole(userId: string, roleName: string) {
  await harness.db.execute(sql`INSERT INTO user_roles (user_id, role_id)
    SELECT ${userId}, id FROM roles WHERE name = ${roleName}`);
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
  await harness.db.execute(sql`INSERT INTO roles (name) VALUES ('teacher'), ('admin'), ('system'), ('user')`);
  await seedUser("caller", "ADMIN", SCHOOL_A);
});

describe("createTeacher against existing users (C1)", () => {
  it("refuses an existing SYSTEM user and changes nothing", async () => {
    await seedUser("victim-system", "SYSTEM", null);
    const result = await createTeacher({
      name: "x", email: "victim-system@x.test", role: "teacher",
      password: "Takeover-pass-1", force: true, userWithRoles: adminCaller(SCHOOL_A),
    });
    expect(result.success).toBe(false);
    const row = await snapshot("victim-system");
    expect(row.account_password).toBe("orig");
    expect(row.user_password).toBe("orig");
    expect(row.school_id).toBeNull();
  });

  it("refuses an existing ADMIN user in the caller's own school", async () => {
    await seedUser("victim-admin", "ADMIN", SCHOOL_A);
    const result = await createTeacher({
      name: "x", email: "victim-admin@x.test", role: "teacher",
      password: "Takeover-pass-1", force: true, userWithRoles: adminCaller(SCHOOL_A),
    });
    expect(result.success).toBe(false);
    expect((await snapshot("victim-admin")).account_password).toBe("orig");
  });

  it("refuses a teacher who belongs to another school, even with force", async () => {
    await seedUser("victim-teacher", "TEACHER", SCHOOL_B);
    const result = await createTeacher({
      name: "x", email: "victim-teacher@x.test", role: "teacher",
      password: "Takeover-pass-1", force: true, userWithRoles: adminCaller(SCHOOL_A),
    });
    expect(result.success).toBe(false);
    const row = await snapshot("victim-teacher");
    expect(row.account_password).toBe("orig");
    expect(row.school_id).toBe(SCHOOL_B);
  });

  it("refuses an existing school-less teacher without moving it or writing a password", async () => {
    await seedUser("loose-teacher", "TEACHER", null);
    const result = await createTeacher({
      name: "x", email: "loose-teacher@x.test", role: "teacher",
      password: "Takeover-pass-1", userWithRoles: adminCaller(SCHOOL_A),
    });
    expect(result.success).toBe(false);
    const row = await snapshot("loose-teacher");
    expect(row.account_password).toBe("orig");
    expect(row.user_password).toBe("orig");
    expect(row.school_id).toBeNull();
  });

  it("gives one generic refusal for every refused existing account", async () => {
    await seedUser("v-system", "SYSTEM", null);
    await seedUser("v-admin", "ADMIN", SCHOOL_A);
    await seedUser("v-other", "TEACHER", SCHOOL_B);
    await seedUser("v-loose", "STUDENT", null);
    const messages = new Set<string | undefined>();
    for (const id of ["v-system", "v-admin", "v-other", "v-loose"]) {
      const result = await createTeacher({
        name: "x", email: `${id}@x.test`, role: "teacher", userWithRoles: adminCaller(SCHOOL_A),
      });
      expect(result.success).toBe(false);
      messages.add(result.error);
    }
    expect(messages.size).toBe(1);
  });

  it("blocks the account-move then password-takeover chain", async () => {
    // Self-serve owner (session STUDENT + school_admins row) in school A.
    await seedUser("owner", "STUDENT", SCHOOL_A);
    const owner: UserWithRoles = {
      id: "owner", email: "owner@x.test", schoolId: SCHOOL_A, level: 1,
      role: "STUDENT", roles: [], SchoolAdmins: [{ id: "sa-o", schoolId: SCHOOL_A }],
    };
    // Step 1: owner creates helper B with a legacy admin row.
    const helper = await createTeacher({
      name: "b", email: "helper-b@x.test", role: "admin", password: "Helper-pass-123", userWithRoles: owner,
    });
    expect(helper.success).toBe(true);
    const helperCaller: UserWithRoles = {
      id: helper.teacher!.id, email: "helper-b@x.test", schoolId: SCHOOL_A, level: 1,
      role: "TEACHER", roles: [{ role: { id: "r", name: "admin" } }], SchoolAdmins: [],
    };
    // Step 2: B tries to move a school-less victim into school A.
    await seedUser("victim", "STUDENT", null);
    await giveRole("victim", "user");
    const move = await createTeacher({
      name: "v", email: "victim@x.test", role: "admin", userWithRoles: helperCaller,
    });
    expect(move.success).toBe(false);
    // Step 3: B tries to set the victim's password.
    const takeover = await updateTeacher("victim", { password: "Takeover-pass-1" }, helperCaller);
    expect(takeover.success).toBe(false);
    const row = await snapshot("victim");
    expect(row.school_id).toBeNull();
    expect(row.account_password).toBe("orig");
    expect(row.user_password).toBe("orig");
  });

  it("refuses to assign the system role", async () => {
    const result = await createTeacher({
      name: "x", email: "new@x.test", role: "system",
      password: "Valid-pass-123", userWithRoles: adminCaller(SCHOOL_A),
    });
    expect(result.success).toBe(false);
  });
});

describe("updateTeacher scope and target rank (H2)", () => {
  /** An ADMIN session caller with no legacy school_admins row. */
  const sessionAdmin: UserWithRoles = {
    id: "caller", email: "caller@a.test", schoolId: SCHOOL_A, level: 1,
    role: "ADMIN", roles: [], SchoolAdmins: [],
  };

  it("cannot touch a teacher of another school even without a school_admins row", async () => {
    await seedUser("teacher-b", "TEACHER", SCHOOL_B);
    await giveRole("teacher-b", "teacher");
    const result = await updateTeacher("teacher-b", { name: "Hacked", password: "Takeover-pass-1" }, sessionAdmin);
    expect(result.success).toBe(false);
    const row = await snapshot("teacher-b");
    expect(row.account_password).toBe("orig");
  });

  it("cannot set the password of an ADMIN in its own school", async () => {
    await seedUser("admin-2", "ADMIN", SCHOOL_A);
    await giveRole("admin-2", "admin");
    const result = await updateTeacher("admin-2", { password: "Takeover-pass-1" }, sessionAdmin);
    expect(result.success).toBe(false);
    expect((await snapshot("admin-2")).account_password).toBe("orig");
  });

  it("fails closed for a non-SYSTEM caller without a school", async () => {
    await seedUser("teacher-b", "TEACHER", SCHOOL_B);
    await giveRole("teacher-b", "teacher");
    const result = await updateTeacher("teacher-b", { name: "Hacked" }, { ...sessionAdmin, schoolId: null });
    expect(result.success).toBe(false);
  });

  it("updates a same-school teacher and its password", async () => {
    await seedUser("teacher-a", "TEACHER", SCHOOL_A);
    await giveRole("teacher-a", "teacher");
    const result = await updateTeacher("teacher-a", { password: "New-password-1" }, sessionAdmin);
    expect(result.success).toBe(true);
    expect((await snapshot("teacher-a")).account_password).toBe("hash:New-password-1");
  });

  it("lets SYSTEM update a teacher in any school", async () => {
    await seedUser("teacher-b", "TEACHER", SCHOOL_B);
    await giveRole("teacher-b", "teacher");
    const result = await updateTeacher("teacher-b", { name: "Renamed" }, { ...sessionAdmin, role: "SYSTEM", schoolId: null });
    expect(result.success).toBe(true);
  });
});

describe("password writes use effective rank (legacy rows)", () => {
  /** A TEACHER session caller with no legacy rows. */
  const teacherCaller: UserWithRoles = {
    id: "helper", email: "helper@a.test", schoolId: SCHOOL_A, level: 1,
    role: "TEACHER", roles: [], SchoolAdmins: [],
  };

  it("a teacher cannot reset a self-serve owner (session STUDENT + school_admins row)", async () => {
    await seedUser("owner", "STUDENT", SCHOOL_A);
    await giveRole("owner", "admin");
    await harness.db.execute(sql`INSERT INTO school_admins (user_id, school_id) VALUES ('owner', ${SCHOOL_A})`);
    const result = await updateTeacher("owner", { password: "Takeover-pass-1" }, teacherCaller);
    expect(result.success).toBe(false);
    expect((await snapshot("owner")).account_password).toBe("orig");
  });

  it("a teacher cannot reset a co-admin (session TEACHER + legacy admin row)", async () => {
    await seedUser("co-admin", "TEACHER", SCHOOL_A);
    await giveRole("co-admin", "admin");
    const result = await updateTeacher("co-admin", { password: "Takeover-pass-1" }, teacherCaller);
    expect(result.success).toBe(false);
    expect((await snapshot("co-admin")).account_password).toBe("orig");
  });

  it("a co-admin with session TEACHER and a legacy admin row cannot reset the owner", async () => {
    await seedUser("owner", "STUDENT", SCHOOL_A);
    await giveRole("owner", "admin");
    await harness.db.execute(sql`INSERT INTO school_admins (user_id, school_id) VALUES ('owner', ${SCHOOL_A})`);
    const coAdmin: UserWithRoles = { ...teacherCaller, roles: [{ role: { id: "r", name: "admin" } }] };
    const result = await updateTeacher("owner", { password: "Takeover-pass-1" }, coAdmin);
    expect(result.success).toBe(false);
  });

  it("a co-admin with session TEACHER and a legacy admin row can reset a plain teacher", async () => {
    await seedUser("teacher-a", "TEACHER", SCHOOL_A);
    await giveRole("teacher-a", "teacher");
    const coAdmin: UserWithRoles = { ...teacherCaller, roles: [{ role: { id: "r", name: "admin" } }] };
    const result = await updateTeacher("teacher-a", { password: "New-password-1" }, coAdmin);
    expect(result.success).toBe(true);
  });
});

describe("password write events (M1)", () => {
  const sessionAdmin: UserWithRoles = {
    id: "caller", email: "caller@a.test", schoolId: SCHOOL_A, level: 1,
    role: "ADMIN", roles: [], SchoolAdmins: [],
  };

  it("records an audit event for a new teacher without revoking", async () => {
    const result = await createTeacher({
      name: "n", email: "fresh@x.test", role: "teacher", password: "Valid-pass-123", userWithRoles: sessionAdmin,
    });
    expect(result.success).toBe(true);
    expect(eventMocks.afterPasswordWrite).toHaveBeenCalledWith({
      userId: result.teacher!.id, actor: { id: "caller", role: "ADMIN" }, created: true,
    });
  });

  it("revokes and audits when updateTeacher changes a password", async () => {
    await seedUser("teacher-a", "TEACHER", SCHOOL_A);
    await giveRole("teacher-a", "teacher");
    await updateTeacher("teacher-a", { password: "New-password-1" }, sessionAdmin);
    expect(eventMocks.afterPasswordWrite).toHaveBeenCalledWith({
      userId: "teacher-a", actor: { id: "caller", role: "ADMIN" }, created: false,
    });
  });

  it("emits nothing when updateTeacher does not change a password", async () => {
    await seedUser("teacher-a", "TEACHER", SCHOOL_A);
    await giveRole("teacher-a", "teacher");
    await updateTeacher("teacher-a", { name: "Renamed" }, sessionAdmin);
    expect(eventMocks.afterPasswordWrite).not.toHaveBeenCalled();
  });
});
