import { describe, it, expect } from "vitest";
import { createClass, listClasses } from "../classes/index.js";
import { createMockDb } from "./mock-db.js";
import { createTenantDB } from "../db-contract.js";
import type { DB } from "@reading-advantage/db";

const teacher = { id: "t1", username: "teacher1", name: "T", role: "TEACHER" as const, schoolId: "s1" };
const admin = { id: "a1", username: "admin1", name: "A", role: "ADMIN" as const, schoolId: "s1" };
const student = { id: "st1", username: "student1", name: "ST", role: "STUDENT" as const, schoolId: "s1" };
const tenant = { schoolId: "s1" };

function wrapDb(db: ReturnType<typeof createMockDb>) {
  return createTenantDB(db as unknown as DB, tenant);
}

describe("createClass", () => {
  it("creates a class when teacher has permission", async () => {
    const mockClass = { id: "c1", name: "Math", schoolId: "s1", teacherId: "t1" };
    const db = createMockDb({ insertReturning: [mockClass] });

    const result = await createClass({ db: wrapDb(db), user: teacher, tenant, input: { name: "Math" } });

    expect(result).toEqual(mockClass);
    expect(db.insert).toHaveBeenCalledOnce();
  });

  it("creates a class when admin has permission", async () => {
    const mockClass = { id: "c1", name: "Science", schoolId: "s1", teacherId: "a1" };
    const db = createMockDb({ insertReturning: [mockClass] });

    const result = await createClass({ db: wrapDb(db), user: admin, tenant, input: { name: "Science" } });

    expect(result).toEqual(mockClass);
  });

  it("throws when student tries to create class", async () => {
    const db = createMockDb();

    await expect(
      createClass({ db: wrapDb(db), user: student, tenant, input: { name: "Math" } })
    ).rejects.toThrow(/STUDENT.*class:create/);
  });
});

describe("listClasses", () => {
  it("lists classes for teacher scoped to own teacherId", async () => {
    const classes = [{ id: "c1", name: "Math", teacherId: "t1" }];
    const db = createMockDb({ selectResults: classes });

    const result = await listClasses({
      db: wrapDb(db),
      user: teacher,
      tenant,
      input: { includeArchived: false },
    });

    expect(result).toEqual(classes);
    expect(db.select).toHaveBeenCalledOnce();
  });

  it("lists classes for admin scoped to schoolId", async () => {
    const classes = [{ id: "c1", name: "Math" }, { id: "c2", name: "Science" }];
    const db = createMockDb({ selectResults: classes });

    const result = await listClasses({
      db: wrapDb(db),
      user: admin,
      tenant,
      input: { includeArchived: false },
    });

    expect(result).toEqual(classes);
  });

  it("throws when student tries to list classes", async () => {
    const db = createMockDb();

    await expect(
      listClasses({ db: wrapDb(db), user: student, tenant, input: { includeArchived: false } })
    ).rejects.toThrow(/STUDENT.*class:list/);
  });
});
