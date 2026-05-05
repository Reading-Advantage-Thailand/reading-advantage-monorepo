import { describe, it, expect } from "vitest";
import { getMe, getUser, listUsers, updateUser } from "../users/index.js";
import { createMockDb } from "./mock-db.js";
import { createTenantDB } from "../db-contract.js";
import type { DB } from "@reading-advantage/db";

const teacher = { id: "t1", username: "teacher1", name: "T", role: "TEACHER" as const, schoolId: "s1" };
const student = { id: "st1", username: "student1", name: "ST", role: "STUDENT" as const, schoolId: "s1" };
const admin = { id: "a1", username: "admin1", name: "A", role: "ADMIN" as const, schoolId: "s1" };
const system = { id: "sys1", username: "sys1", name: "SYS", role: "SYSTEM" as const, schoolId: null };
const tenant = { schoolId: "s1" };

function wrapDb(db: ReturnType<typeof createMockDb>) {
  return createTenantDB(db as unknown as DB, tenant);
}

describe("getMe", () => {
  it("returns the current user", async () => {
    const userRow = { id: "t1", email: "t@test.com", name: "T", role: "TEACHER", schoolId: "s1", image: null, xp: 100, level: 2, cefrLevel: "A1", createdAt: new Date(), updatedAt: new Date() };
    const db = createMockDb({ selectResults: [userRow] });

    const result = await getMe({ db: wrapDb(db), user: teacher });

    expect(result.id).toBe("t1");
  });

  it("works for SYSTEM user", async () => {
    const userRow = { id: "sys1", email: "sys@test.com", name: "SYS", role: "SYSTEM", schoolId: null, image: null, xp: 0, level: 1, cefrLevel: "A1", createdAt: new Date(), updatedAt: new Date() };
    const db = createMockDb({ selectResults: [userRow] });
    const systemTenant = { schoolId: null };
    const systemDb = createTenantDB(db as unknown as DB, systemTenant);

    const result = await getMe({ db: systemDb, user: system });

    expect(result.id).toBe("sys1");
  });

  it("throws when user is not found", async () => {
    const db = createMockDb({ selectResults: [] });

    await expect(getMe({ db: wrapDb(db), user: teacher })).rejects.toThrow(/User not found/);
  });
});

describe("getUser", () => {
  it("returns user by id", async () => {
    const userRow = { id: "u2", email: "u2@test.com", name: "U2", role: "STUDENT", schoolId: "s1", image: null, xp: 50, level: 1, cefrLevel: "A1", createdAt: new Date(), updatedAt: new Date() };
    const db = createMockDb({ selectResults: [userRow] });

    const result = await getUser({ db: wrapDb(db), user: teacher, tenant, input: { id: "u2" } });

    expect(result.id).toBe("u2");
  });

  it("throws when user is not found", async () => {
    const db = createMockDb({ selectResults: [] });

    await expect(getUser({ db: wrapDb(db), user: teacher, tenant, input: { id: "u2" } })).rejects.toThrow(/User not found/);
  });

  it("rejects users without user:read permission", async () => {
    const db = createMockDb();
    const invalidUser = { id: "x", username: "x", name: "X", role: "GUEST" as unknown as typeof teacher.role, schoolId: "s1" };

    await expect(getUser({ db: wrapDb(db), user: invalidUser, tenant, input: { id: "u2" } })).rejects.toThrow(/user:read/);
  });
});

describe("listUsers", () => {
  it("lists users in caller's school", async () => {
    const userRows = [
      { id: "u1", name: "Alice", email: "a@test.com", role: "STUDENT", schoolId: "s1", image: null, xp: 100, level: 2, cefrLevel: "A1", createdAt: new Date(), updatedAt: new Date() },
    ];
    const db = createMockDb({ selectResults: userRows });

    const result = await listUsers({ db: wrapDb(db), user: teacher, tenant, input: { limit: 50, offset: 0 } });

    expect(result).toEqual(userRows);
  });

  it("filters by role", async () => {
    const db = createMockDb({ selectResults: [] });

    await listUsers({ db: wrapDb(db), user: teacher, tenant, input: { role: "STUDENT", limit: 50, offset: 0 } });

    expect(db.select).toHaveBeenCalledOnce();
  });

  it("rejects student from listing users", async () => {
    const db = createMockDb();

    await expect(
      listUsers({ db: wrapDb(db), user: student, tenant, input: { limit: 50, offset: 0 } })
    ).rejects.toThrow(/user:list/);
  });

  it("rejects teacher from listing users in another school", async () => {
    const db = createMockDb();
    const otherTenant = { schoolId: "s2" };
    const otherDb = createTenantDB(db as unknown as DB, otherTenant);

    await expect(
      listUsers({
        db: otherDb,
        user: { ...teacher, schoolId: "s2" },
        tenant: otherTenant,
        input: { schoolId: "s1", limit: 50, offset: 0 },
      })
    ).rejects.toThrow(/outside your school/);
  });

  it("allows system to query another school", async () => {
    const userRows = [{ id: "u3", name: "Charlie", email: "c@test.com", role: "STUDENT", schoolId: "s2", image: null, xp: 0, level: 1, cefrLevel: "A1", createdAt: new Date(), updatedAt: new Date() }];
    const db = createMockDb({ selectResults: userRows });

    const result = await listUsers({ db: wrapDb(db), user: system, tenant: { schoolId: null }, input: { schoolId: "s2", limit: 50, offset: 0 } });

    expect(result).toEqual(userRows);
  });

  it("rejects non-system query for another school", async () => {
    const db = createMockDb();

    await expect(
      listUsers({ db: wrapDb(db), user: admin, tenant, input: { schoolId: "s2", limit: 50, offset: 0 } })
    ).rejects.toThrow(/outside your school/);
  });
});

describe("updateUser", () => {
  it("allows user to update their own profile", async () => {
    const updatedRow = { id: "st1", name: "New Name", email: "st1@test.com" };
    const db = createMockDb({ updateReturning: [updatedRow] });

    const result = await updateUser({ db: wrapDb(db), user: student, tenant, input: { id: "st1", name: "New Name" } });

    expect(result.name).toBe("New Name");
  });

  it("allows admin to update any profile", async () => {
    const updatedRow = { id: "st1", name: "Admin Updated", email: "st1@test.com" };
    const db = createMockDb({ updateReturning: [updatedRow] });

    const result = await updateUser({ db: wrapDb(db), user: admin, tenant, input: { id: "st1", name: "Admin Updated" } });

    expect(result.name).toBe("Admin Updated");
  });

  it("throws when user tries to update another profile", async () => {
    const db = createMockDb();

    await expect(
      updateUser({ db: wrapDb(db), user: student, tenant, input: { id: "other", name: "Hacked" } })
    ).rejects.toThrow(/user:update/);
  });

  it("throws when user is not found", async () => {
    const db = createMockDb({ updateReturning: [] });

    await expect(
      updateUser({ db: wrapDb(db), user: admin, tenant, input: { id: "missing", name: "New" } })
    ).rejects.toThrow(/User not found/);
  });
});
