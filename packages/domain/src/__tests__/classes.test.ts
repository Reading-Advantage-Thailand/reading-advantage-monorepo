import { describe, it, expect } from "vitest";
import { createClass, listClasses } from "../classes/index.js";
import { createMockDb, type MockDb } from "./mock-db.js";

const teacher = { id: "t1", email: "t@t.com", name: "T", role: "TEACHER" as const, schoolId: "s1" };
const admin = { id: "a1", email: "a@a.com", name: "A", role: "ADMIN" as const, schoolId: "s1" };
const student = { id: "st1", email: "st@st.com", name: "ST", role: "STUDENT" as const, schoolId: "s1" };
const tenant = { schoolId: "s1" };

describe("createClass", () => {
  it("creates a class when teacher has permission", async () => {
    const mockClass = { id: "c1", name: "Math", schoolId: "s1", teacherId: "t1" };
    const db = createMockDb({ insertReturning: [mockClass] });

    const result = await createClass({ db: db as MockDb, user: teacher, tenant, input: { name: "Math" } });

    expect(result).toEqual(mockClass);
    expect(db.insert).toHaveBeenCalledOnce();
  });

  it("creates a class when admin has permission", async () => {
    const mockClass = { id: "c1", name: "Science", schoolId: "s1", teacherId: "a1" };
    const db = createMockDb({ insertReturning: [mockClass] });

    const result = await createClass({ db: db as MockDb, user: admin, tenant, input: { name: "Science" } });

    expect(result).toEqual(mockClass);
  });

  it("throws when student tries to create class", async () => {
    const db = createMockDb();

    await expect(
      createClass({ db: db as MockDb, user: student, tenant, input: { name: "Math" } })
    ).rejects.toThrow(/STUDENT.*class:create/);
  });
});

describe("listClasses", () => {
  it("lists classes for teacher scoped to own teacherId", async () => {
    const classes = [{ id: "c1", name: "Math", teacherId: "t1" }];
    const db = createMockDb({ selectResults: classes });

    const result = await listClasses({
      db: db as MockDb,
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
      db: db as MockDb,
      user: admin,
      tenant,
      input: { includeArchived: false },
    });

    expect(result).toEqual(classes);
  });

  it("throws when student tries to list classes", async () => {
    const db = createMockDb();

    await expect(
      listClasses({ db: db as MockDb, user: student, tenant, input: { includeArchived: false } })
    ).rejects.toThrow(/STUDENT.*class:list/);
  });
});
