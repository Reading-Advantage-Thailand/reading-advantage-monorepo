import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { AuthError, type UserContext } from "@reading-advantage/auth";
import { createTestDb, type TestDb } from "./helpers/testDb.js";
import { getSchoolLicenseView, listSeatHolders } from "../licenses/license-view.js";

const SCHOOL_A = "10000000-0000-4000-8000-00000000000a";
const SCHOOL_B = "10000000-0000-4000-8000-00000000000b";
const NOW = new Date("2026-10-12T05:00:00Z");

const person = (id: string, role: UserContext["role"], schoolId: string | null): UserContext => ({
  id, username: id, name: id, role, schoolId, xp: 0, level: 1, cefrLevel: "A1-",
});

describe("school license view (PGlite, two schools)", () => {
  let h: TestDb;
  let db: DB;
  const run = (statement: string) => h.db.execute(sql.raw(statement));
  const lic = (key: string, school: string, max: number, status: string, start: string, end: string | null) =>
    `insert into licenses (key, school_name, school_id, name, max_users, status, start_date, expiry_date)
     values ('${key}', 'S', '${school}', 'Lic ${key}', ${max}, '${status}', '${start}', ${end ? `'${end}'` : "null"})`;
  const students = async (school: string, count: number, prefix: string) => {
    for (let i = 1; i <= count; i += 1) {
      const id = `${prefix}${String(i).padStart(3, "0")}`;
      await run(`insert into users (id, username, display_username, name, role, school_id) values ('${id}', '${id}', '${id}', 'Name ${id}', 'STUDENT', '${school}')`);
    }
  };
  const view = (user: UserContext, schoolId = SCHOOL_A) => getSchoolLicenseView({ db, user, schoolId, now: NOW });
  const holders = (user: UserContext, page: number, schoolId = SCHOOL_A) => listSeatHolders({ db, user, schoolId, page });

  beforeAll(async () => {
    h = await createTestDb();
    db = h.db as unknown as DB;
  }, 120_000);
  afterAll(async () => h?.close());
  beforeEach(async () => {
    for (const table of ["school_admins", "classroom_students", "classrooms", "licenses", "users", "schools"]) await run(`delete from ${table}`);
    for (const statement of [
      `insert into schools (id, name) values ('${SCHOOL_A}', 'A'), ('${SCHOOL_B}', 'B')`,
      `insert into users (id, username, display_username, name, role, school_id) values
         ('admin-a', 'admin-a', 'admin-a', 'Admin A', 'ADMIN', '${SCHOOL_A}'),
         ('admin-b', 'admin-b', 'admin-b', 'Admin B', 'ADMIN', '${SCHOOL_B}'),
         ('teach-a', 'teach-a', 'teach-a', 'Teach A', 'TEACHER', '${SCHOOL_A}'),
         ('teach-b', 'teach-b', 'teach-b', 'Teach B', 'TEACHER', '${SCHOOL_B}'),
         ('sys', 'sys', 'sys', 'Sys', 'SYSTEM', null)`,
      lic("A1", SCHOOL_A, 30, "active", "2026-01-01", "2027-01-01"),
      lic("A2", SCHOOL_A, 20, "active", "2025-01-01", "2026-06-01"),
      lic("B1", SCHOOL_B, 500, "active", "2026-01-01", null),
    ]) await run(statement);
    await students(SCHOOL_A, 3, "sa");
    await students(SCHOOL_B, 4, "sb");
  });

  it("lists the licenses of school A with the totals, and no row of school B", async () => {
    const result = await view(person("admin-a", "ADMIN", SCHOOL_A));
    expect(result.licenses.map((l) => l.name).sort()).toEqual(["Lic A1", "Lic A2"]);
    expect(result.licenses.find((l) => l.name === "Lic A1")).toMatchObject({ state: "active", seats: 30, startDate: "2026-01-01", endDate: "2027-01-01" });
    expect(result.licenses.find((l) => l.name === "Lic A2")).toMatchObject({ state: "ended" });
    expect(result).toMatchObject({ seats: 30, seatsUsed: 3, seatsFree: 27, seatsOver: 0, hasActiveLicense: true });
  });

  it("counts students over the limit", async () => {
    await run(`update licenses set max_users = 2 where key = 'A1'`);
    expect(await view(person("admin-a", "ADMIN", SCHOOL_A))).toMatchObject({ seats: 2, seatsUsed: 3, seatsFree: 0, seatsOver: 1 });
  });

  it("gives 0 seats for an ended license, and no over count without an active license", async () => {
    await run(`update licenses set expiry_date = '2026-06-01' where key = 'A1'`);
    expect(await view(person("admin-a", "ADMIN", SCHOOL_A))).toMatchObject({ seats: 0, seatsFree: 0, seatsOver: 0, hasActiveLicense: false });
  });

  it("shows a license with an inactive status as inactive and gives it no seats", async () => {
    await run(`update licenses set status = 'suspended' where key = 'A1'`);
    const result = await view(person("admin-a", "ADMIN", SCHOOL_A));
    expect(result.licenses.find((l) => l.name === "Lic A1")?.state).toBe("inactive");
    expect(result.seats).toBe(0);
  });

  it("returns an empty list for a school without a license", async () => {
    await run(`delete from licenses where school_id = '${SCHOOL_A}'`);
    expect(await view(person("admin-a", "ADMIN", SCHOOL_A))).toMatchObject({ licenses: [], seats: 0, seatsUsed: 3, hasActiveLicense: false });
  });

  it("refuses a TEACHER without a school_admins row, a STUDENT, and an ADMIN of another school", async () => {
    await expect(view(person("teach-a", "TEACHER", SCHOOL_A))).rejects.toBeInstanceOf(AuthError);
    await expect(view(person("sa001", "STUDENT", SCHOOL_A))).rejects.toBeInstanceOf(AuthError);
    await expect(view(person("admin-b", "ADMIN", SCHOOL_B))).rejects.toBeInstanceOf(AuthError);
    await expect(holders(person("teach-a", "TEACHER", SCHOOL_A), 1)).rejects.toBeInstanceOf(AuthError);
    await expect(holders(person("sa001", "STUDENT", SCHOOL_A), 1)).rejects.toBeInstanceOf(AuthError);
  });

  it("passes a TEACHER with a school_admins row of the school, and refuses a row of another school", async () => {
    await run(`insert into school_admins (school_id, user_id) values ('${SCHOOL_A}', 'teach-a'), ('${SCHOOL_A}', 'teach-b')`);
    expect((await view(person("teach-a", "TEACHER", SCHOOL_A))).seats).toBe(30);
    expect((await holders(person("teach-a", "TEACHER", SCHOOL_A), 1)).total).toBe(3);
    await expect(view(person("teach-b", "TEACHER", SCHOOL_B))).rejects.toBeInstanceOf(AuthError);
  });

  it("lets SYSTEM read any school", async () => {
    expect((await view(person("sys", "SYSTEM", null), SCHOOL_B)).seats).toBe(500);
  });

  it("lists the seat holders of school A only, with classes and join date", async () => {
    await run(`insert into classrooms (id, name, school_id, teacher_id) values
      ('20000000-0000-4000-8000-0000000000a1', 'P4-1', '${SCHOOL_A}', 'teach-a'),
      ('20000000-0000-4000-8000-0000000000a2', 'Club', '${SCHOOL_A}', 'teach-a'),
      ('20000000-0000-4000-8000-0000000000b1', 'Other', '${SCHOOL_B}', 'teach-b')`);
    await run(`insert into classroom_students (classroom_id, student_id) values
      ('20000000-0000-4000-8000-0000000000a1', 'sa001'), ('20000000-0000-4000-8000-0000000000a2', 'sa001'),
      ('20000000-0000-4000-8000-0000000000b1', 'sa002')`);
    const page = await holders(person("admin-a", "ADMIN", SCHOOL_A), 1);
    expect(page).toMatchObject({ page: 1, pageSize: 50, total: 3 });
    expect(page.holders.map((x) => x.username)).toEqual(["sa001", "sa002", "sa003"]);
    expect(page.holders[0]).toMatchObject({ name: "Name sa001", classes: ["Club", "P4-1"] });
    expect(page.holders[1]?.classes).toEqual([]);
    expect(typeof page.holders[0]?.joinedAt).toBe("string");
  });

  it("pages the seat holders by 50", async () => {
    await students(SCHOOL_A, 57, "sx");
    const admin = person("admin-a", "ADMIN", SCHOOL_A);
    const first = await holders(admin, 1);
    const second = await holders(admin, 2);
    expect(first).toMatchObject({ total: 60, pageSize: 50 });
    expect(first.holders).toHaveLength(50);
    expect(second.holders).toHaveLength(10);
    expect(new Set([...first.holders, ...second.holders].map((x) => x.id)).size).toBe(60);
    expect((await holders(admin, 3)).holders).toEqual([]);
  });

  it("rejects a page below 1", async () => {
    await expect(holders(person("admin-a", "ADMIN", SCHOOL_A), 0)).rejects.toThrow();
  });
});
