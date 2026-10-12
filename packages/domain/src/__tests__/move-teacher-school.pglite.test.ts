import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { AuthError, type UserContext } from "@reading-advantage/auth";
import { createTestDb, type TestDb } from "./helpers/testDb.js";
import { moveTeacherToSchool } from "../teachers/move-teacher-school.js";

const SCHOOL_A = "10000000-0000-4000-8000-00000000000a";
const SCHOOL_B = "10000000-0000-4000-8000-00000000000b";
const UNKNOWN = "10000000-0000-4000-8000-00000000000f";
const CLASS_A = "20000000-0000-4000-8000-0000000000a1";
const CLASS_A2 = "20000000-0000-4000-8000-0000000000a2";
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

describe("moveTeacherToSchool (PGlite, two schools)", () => {
  let h: TestDb;
  let db: DB;
  const system = person("SYSTEM", null);

  const rows = async (query: string) =>
    (await h.db.execute(sql.raw(query)) as unknown as { rows: Array<Record<string, unknown>> }).rows;
  const linksOf = async (teacherId: string) =>
    (await rows(`select classroom_id from classroom_teachers where teacher_id = '${teacherId}'`)).map((r) => r.classroom_id).sort();
  const schoolOf = async (id: string) => (await rows(`select school_id from users where id = '${id}'`))[0]?.school_id;
  const move = (user: UserContext, teacherId: string, schoolId: string, classroomIds: string[]) =>
    moveTeacherToSchool({ db, user, input: { teacherId, schoolId, classroomIds } });

  beforeAll(async () => {
    h = await createTestDb();
    db = h.db as unknown as DB;
  }, 120_000);
  afterAll(async () => h?.close());
  beforeEach(async () => {
    for (const table of ["audit_events", "classroom_teachers", "classrooms", "users", "schools"]) await h.db.execute(sql.raw(`delete from ${table}`));
    const u = (id: string, role: string, school: string) =>
      `insert into users (id, username, display_username, name, role, school_id) values ('${id}', '${id}', '${id}', '${id}', '${role}', '${school}')`;
    for (const statement of [
      `insert into schools (id, name) values ('${SCHOOL_A}', 'A'), ('${SCHOOL_B}', 'B')`,
      u("mover", "TEACHER", SCHOOL_A),
      u("owner", "TEACHER", SCHOOL_A),
      u("tb", "TEACHER", SCHOOL_B),
      u("stud", "STUDENT", SCHOOL_A),
      `insert into users (id, username, display_username, name, role) values ('SYSTEM-user', 'sys', 'sys', 'sys', 'SYSTEM')`,
      `insert into classrooms (id, name, school_id, teacher_id) values ('${CLASS_A}', 'Class A', '${SCHOOL_A}', 'owner'), ('${CLASS_A2}', 'Class A2', '${SCHOOL_A}', 'owner'), ('${CLASS_B}', 'Class B', '${SCHOOL_B}', 'tb')`,
      `insert into classroom_teachers (classroom_id, teacher_id) values ('${CLASS_A}', 'mover'), ('${CLASS_A}', 'owner'), ('${CLASS_B}', 'tb')`,
    ]) await h.db.execute(sql.raw(statement));
  });

  it("moves the school, swaps the links, and writes one audit event", async () => {
    const out = await move(system, "mover", SCHOOL_B, [CLASS_B]);
    expect(out).toEqual({ teacherId: "mover", schoolId: SCHOOL_B, classroomIds: [CLASS_B] });
    expect(await schoolOf("mover")).toBe(SCHOOL_B);
    expect(await linksOf("mover")).toEqual([CLASS_B]);
    expect(await linksOf("owner")).toEqual([CLASS_A]);
    const audit = await rows(`select actor_user_id, action, target_id, metadata from audit_events`);
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ actor_user_id: "SYSTEM-user", action: "teacher:school:move", target_id: "mover" });
    expect(audit[0]!.metadata).toEqual({ fromSchoolId: SCHOOL_A, toSchoolId: SCHOOL_B, classCount: 1 });
  });

  it("moves with no class and drops the old links", async () => {
    await move(system, "mover", SCHOOL_B, []);
    expect(await linksOf("mover")).toEqual([]);
    expect(await schoolOf("mover")).toBe(SCHOOL_B);
  });

  it("refuses a class of another school with 400 and changes nothing", async () => {
    await expect(move(system, "mover", SCHOOL_B, [CLASS_B, CLASS_A])).rejects.toMatchObject({ code: "CROSS_SCHOOL_CLASSROOM", status: 400 });
    expect(await schoolOf("mover")).toBe(SCHOOL_A);
    expect(await linksOf("mover")).toEqual([CLASS_A]);
    expect(await rows(`select id from audit_events`)).toHaveLength(0);
  });

  it("refuses an owner of classes with 409 and the class names, and changes nothing", async () => {
    const error = await move(system, "owner", SCHOOL_B, [CLASS_B]).catch((e) => e);
    expect(error).toMatchObject({ code: "OWNS_CLASSES", status: 409 });
    expect(error.classNames.sort()).toEqual(["Class A", "Class A2"]);
    expect(await schoolOf("owner")).toBe(SCHOOL_A);
    expect(await linksOf("owner")).toEqual([CLASS_A]);
    expect(await rows(`select id from audit_events`)).toHaveLength(0);
  });

  it("refuses an ADMIN and a TEACHER with FORBIDDEN", async () => {
    await expect(move(person("ADMIN", SCHOOL_A), "mover", SCHOOL_B, [])).rejects.toBeInstanceOf(AuthError);
    await expect(move(person("TEACHER", SCHOOL_A), "mover", SCHOOL_B, [])).rejects.toBeInstanceOf(AuthError);
    expect(await schoolOf("mover")).toBe(SCHOOL_A);
  });

  it("refuses an unknown school, an unknown user, and a non-teacher", async () => {
    await expect(move(system, "mover", UNKNOWN, [])).rejects.toMatchObject({ code: "SCHOOL_NOT_FOUND", status: 404 });
    await expect(move(system, "nobody", SCHOOL_B, [])).rejects.toMatchObject({ code: "TEACHER_NOT_FOUND", status: 404 });
    await expect(move(system, "stud", SCHOOL_B, [])).rejects.toMatchObject({ code: "NOT_A_TEACHER", status: 400 });
    expect(await schoolOf("mover")).toBe(SCHOOL_A);
  });

  it("keeps the owned links when the school stays the same", async () => {
    await move(system, "owner", SCHOOL_A, [CLASS_A]);
    expect(await linksOf("owner")).toEqual([CLASS_A]);
  });
});
