import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { AuthError, type UserContext } from "@reading-advantage/auth";
import { createTestDb, type TestDb } from "./helpers/testDb.js";
import { setClassroomTeachers, SetClassroomTeachersError } from "../classes/set-classroom-teachers.js";

const SCHOOL_A = "10000000-0000-4000-8000-00000000000a";
const SCHOOL_B = "10000000-0000-4000-8000-00000000000b";
const CLASS_A = "20000000-0000-4000-8000-0000000000a1";
const CLASS_B = "20000000-0000-4000-8000-0000000000b1";

const person = (role: UserContext["role"], schoolId: string | null): UserContext => ({
  id: `${role}-user`,
  username: role,
  name: role,
  role,
  schoolId,
  xp: 0,
  level: 1,
  cefrLevel: "A1-",
});

describe("setClassroomTeachers (PGlite, two schools)", () => {
  let h: TestDb;
  let db: DB;
  const admin = person("ADMIN", SCHOOL_A);

  /** Reads the teacher ids of a class, sorted. */
  const teachersOf = async (classroomId: string): Promise<string[]> => {
    const rows = await h.db.execute(sql.raw(`select teacher_id from classroom_teachers where classroom_id = '${classroomId}'`));
    return (rows as unknown as { rows: Array<{ teacher_id: string }> }).rows.map((r) => r.teacher_id).sort();
  };
  const run = (user: UserContext, classroomId: string, teacherIds: string[]) =>
    setClassroomTeachers({ db, user, input: { classroomId, teacherIds } });

  beforeAll(async () => {
    h = await createTestDb();
    db = h.db as unknown as DB;
  }, 120_000);
  afterAll(async () => h?.close());
  beforeEach(async () => {
    for (const table of ["classroom_teachers", "classrooms", "users", "schools"]) await h.db.execute(sql.raw(`delete from ${table}`));
    const u = (id: string, role: string, school: string) =>
      `insert into users (id, username, display_username, name, role, school_id) values ('${id}', '${id}', '${id}', '${id}', '${role}', '${school}')`;
    for (const statement of [
      `insert into schools (id, name) values ('${SCHOOL_A}', 'A'), ('${SCHOOL_B}', 'B')`,
      u("owner", "TEACHER", SCHOOL_A),
      u("t1", "TEACHER", SCHOOL_A),
      u("t2", "TEACHER", SCHOOL_A),
      u("stud", "STUDENT", SCHOOL_A),
      u("adm2", "ADMIN", SCHOOL_A),
      u("tb", "TEACHER", SCHOOL_B),
      `insert into classrooms (id, name, school_id, teacher_id) values ('${CLASS_A}', 'CA', '${SCHOOL_A}', 'owner'), ('${CLASS_B}', 'CB', '${SCHOOL_B}', 'tb')`,
      `insert into classroom_teachers (classroom_id, teacher_id) values ('${CLASS_A}', 'owner'), ('${CLASS_B}', 'tb')`,
    ]) await h.db.execute(sql.raw(statement));
  });

  it("adds two teachers and keeps the owner", async () => {
    const out = await run(admin, CLASS_A, ["t1", "t2"]);
    expect(out).toEqual({ classroomId: CLASS_A, teacherIds: ["owner", "t1", "t2"] });
    expect(await teachersOf(CLASS_A)).toEqual(["owner", "t1", "t2"]);
  });

  it("removes a teacher that leaves the list and keeps the other", async () => {
    await run(admin, CLASS_A, ["t1", "t2"]);
    await run(admin, CLASS_A, ["t1"]);
    expect(await teachersOf(CLASS_A)).toEqual(["owner", "t1"]);
  });

  it("keeps the owner when the list is empty or omits the owner", async () => {
    await run(admin, CLASS_A, ["t1"]);
    await run(admin, CLASS_A, []);
    expect(await teachersOf(CLASS_A)).toEqual(["owner"]);
  });

  it("adds no duplicate pair, also for a repeated id and a second save", async () => {
    await run(admin, CLASS_A, ["t1", "t1", "owner"]);
    await run(admin, CLASS_A, ["t1"]);
    expect(await teachersOf(CLASS_A)).toEqual(["owner", "t1"]);
  });

  it("removes an existing duplicate row of one pair", async () => {
    await h.db.execute(sql.raw(`insert into classroom_teachers (classroom_id, teacher_id) values ('${CLASS_A}', 'owner')`));
    await run(admin, CLASS_A, ["t1"]);
    expect(await teachersOf(CLASS_A)).toEqual(["owner", "t1"]);
  });

  it("refuses a teacher of another school and changes nothing", async () => {
    await expect(run(admin, CLASS_A, ["t1", "tb"])).rejects.toMatchObject({ code: "CROSS_SCHOOL_TEACHER", status: 400 });
    expect(await teachersOf(CLASS_A)).toEqual(["owner"]);
  });

  it("refuses an unknown user id", async () => {
    await expect(run(admin, CLASS_A, ["nobody"])).rejects.toBeInstanceOf(SetClassroomTeachersError);
    expect(await teachersOf(CLASS_A)).toEqual(["owner"]);
  });

  it("refuses a user who is not a TEACHER (student, admin) and changes nothing", async () => {
    await expect(run(admin, CLASS_A, ["t1", "stud"])).rejects.toMatchObject({ code: "NOT_A_TEACHER" });
    await expect(run(admin, CLASS_A, ["adm2"])).rejects.toMatchObject({ code: "NOT_A_TEACHER" });
    expect(await teachersOf(CLASS_A)).toEqual(["owner"]);
  });

  it("gives FORBIDDEN to an ADMIN of another school and changes nothing", async () => {
    await expect(run(person("ADMIN", SCHOOL_B), CLASS_A, ["t1"])).rejects.toBeInstanceOf(AuthError);
    expect(await teachersOf(CLASS_A)).toEqual(["owner"]);
  });

  it("gives FORBIDDEN to a TEACHER and a STUDENT", async () => {
    await expect(run(person("TEACHER", SCHOOL_A), CLASS_A, ["t1"])).rejects.toBeInstanceOf(AuthError);
    await expect(run(person("STUDENT", SCHOOL_A), CLASS_A, ["t1"])).rejects.toBeInstanceOf(AuthError);
  });

  it("lets SYSTEM edit the class of any school, with the teachers of that school", async () => {
    const system = person("SYSTEM", null);
    await run(system, CLASS_A, ["t2"]);
    expect(await teachersOf(CLASS_A)).toEqual(["owner", "t2"]);
    await expect(run(system, CLASS_B, ["t1"])).rejects.toMatchObject({ code: "CROSS_SCHOOL_TEACHER" });
  });

  it("returns 404 for an unknown class", async () => {
    await expect(run(admin, "20000000-0000-4000-8000-0000000000ff", [])).rejects.toMatchObject({ code: "CLASSROOM_NOT_FOUND", status: 404 });
  });
});
