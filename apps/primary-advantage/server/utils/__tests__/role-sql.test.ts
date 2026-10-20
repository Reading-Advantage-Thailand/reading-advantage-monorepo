// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { users } from "@reading-advantage/db";
import { createTestDb, type TestDb } from "@/server/models/__tests__/helpers/testDb";
import { roleSql, setUserRole } from "../role-sql";

let h: TestDb;

/** Inserts one user with the given session role. */
async function seed(id: string, role: string) {
  await h.db.execute(sql`INSERT INTO users (id, username, display_username, name, role)
    VALUES (${id}, ${id}, ${id}, ${id}, ${role})`);
}

/** Returns the ids that match a role condition, sorted. */
async function matching(cond: ReturnType<typeof roleSql>) {
  const rows = await h.db.select({ id: users.id }).from(users).where(cond);
  return rows.map((r) => r.id).sort();
}

/** Reads the role names in user_roles for one user. */
async function roleRows(id: string) {
  const r = await h.db.execute(sql`SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ${id}`);
  return (r.rows as { name: string }[]).map((x) => x.name);
}

/** Reads users.role. */
async function sessionRole(id: string) {
  const r = await h.db.execute(sql`SELECT role FROM users WHERE id = ${id}`);
  return (r.rows[0] as { role: string }).role;
}

beforeAll(async () => { h = await createTestDb(); }, 60_000);
afterAll(async () => { await h.close(); });
beforeEach(async () => { await h.reset(); });

describe("roleSql with an empty roles table", () => {
  it("matches by users.role, case-insensitive, one or many names", async () => {
    await seed("s1", "STUDENT"); await seed("t1", "TEACHER"); await seed("a1", "ADMIN");
    expect(await matching(roleSql("student"))).toEqual(["s1"]);
    expect(await matching(roleSql(["teacher", "admin"]))).toEqual(["a1", "t1"]);
  });
});

describe("roleSql with legacy rows", () => {
  it("also matches a user_roles row", async () => {
    await h.db.execute(sql`INSERT INTO roles (name) VALUES ('student'), ('teacher')`);
    await seed("s1", "STUDENT"); await seed("odd", "TEACHER");
    await h.db.execute(sql`INSERT INTO user_roles (user_id, role_id) SELECT 'odd', id FROM roles WHERE name = 'student'`);
    expect(await matching(roleSql("student"))).toEqual(["odd", "s1"]);
  });
});

describe("setUserRole", () => {
  it("writes users.role and does not fail when roles is empty", async () => {
    await seed("u1", "TEACHER");
    await setUserRole(h.db as never, "u1", "admin");
    expect(await sessionRole("u1")).toBe("ADMIN");
    expect(await roleRows("u1")).toEqual([]);
  });

  it("replaces the user_roles row when the roles row exists", async () => {
    await h.db.execute(sql`INSERT INTO roles (name) VALUES ('teacher'), ('admin')`);
    await seed("u1", "TEACHER");
    await h.db.execute(sql`INSERT INTO user_roles (user_id, role_id) SELECT 'u1', id FROM roles WHERE name = 'teacher'`);
    await setUserRole(h.db as never, "u1", "ADMIN");
    expect(await sessionRole("u1")).toBe("ADMIN");
    expect(await roleRows("u1")).toEqual(["admin"]);
  });

  it("clears the old row when the target roles row is missing (M-7)", async () => {
    await h.db.execute(sql`INSERT INTO roles (name) VALUES ('teacher')`);
    await seed("u1", "TEACHER");
    await h.db.execute(sql`INSERT INTO user_roles (user_id, role_id) SELECT 'u1', id FROM roles WHERE name = 'teacher'`);
    await setUserRole(h.db as never, "u1", "admin");
    expect(await sessionRole("u1")).toBe("ADMIN");
    expect(await roleRows("u1")).toEqual([]);
  });

  it("clears an old admin row when a demotion finds no teacher roles row (M-7)", async () => {
    await h.db.execute(sql`INSERT INTO roles (name) VALUES ('admin')`);
    await seed("u1", "ADMIN");
    await h.db.execute(sql`INSERT INTO user_roles (user_id, role_id) SELECT 'u1', id FROM roles WHERE name = 'admin'`);
    await setUserRole(h.db as never, "u1", "teacher");
    expect(await sessionRole("u1")).toBe("TEACHER");
    expect(await roleRows("u1")).toEqual([]);
  });

  it("deletes the school_admins rows when the new role is below ADMIN (M-7)", async () => {
    await h.db.execute(sql`INSERT INTO schools (id, name) VALUES ('00000000-0000-0000-0000-0000000000a1', 'A')`);
    await seed("u1", "ADMIN");
    await h.db.execute(sql`INSERT INTO school_admins (school_id, user_id) VALUES ('00000000-0000-0000-0000-0000000000a1', 'u1')`);
    await setUserRole(h.db as never, "u1", "teacher");
    const r = await h.db.execute(sql`SELECT 1 FROM school_admins WHERE user_id = 'u1'`);
    expect(r.rows.length).toBe(0);
  });

  it("keeps the school_admins rows when the new role is ADMIN (M-7)", async () => {
    await h.db.execute(sql`INSERT INTO schools (id, name) VALUES ('00000000-0000-0000-0000-0000000000a1', 'A')`);
    await seed("u1", "TEACHER");
    await h.db.execute(sql`INSERT INTO school_admins (school_id, user_id) VALUES ('00000000-0000-0000-0000-0000000000a1', 'u1')`);
    await setUserRole(h.db as never, "u1", "admin");
    const r = await h.db.execute(sql`SELECT 1 FROM school_admins WHERE user_id = 'u1'`);
    expect(r.rows.length).toBe(1);
  });
});
