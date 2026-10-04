/**
 * Real-Postgres checks for student login (run 2a). Runs only when `PG_TEST_URL` points at a
 * scratch database that has migrations 0000-0063 applied, for example:
 * `PG_TEST_URL=postgres://postgres:postgres@localhost:5432/lane_b_scratch pnpm exec vitest run <this file>`.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { eq, inArray, like } from "drizzle-orm";

const url = process.env.PG_TEST_URL;
if (url) process.env.DATABASE_URL = url;

describe.skipIf(!url)("student login against Postgres", () => {
  const tag = randomUUID().slice(0, 8);
  const ids = { schoolA: randomUUID(), schoolB: randomUUID(), class1: randomUUID(), class2: randomUUID(), classB: randomUUID() };
  const user = (id: string, role: "TEACHER" | "STUDENT" | "ADMIN", schoolId: string, name: string) => ({
    id: `${tag}-${id}`, username: `${tag}-${id}`, displayUsername: `${tag}-${id}`, name, role, schoolId,
  });
  const fixtures = [
    user("t1", "TEACHER", ids.schoolA, "Teacher One"),
    user("t2", "TEACHER", ids.schoolA, "Teacher Two"),
    user("tb", "TEACHER", ids.schoolB, "Teacher B"),
    user("s1", "STUDENT", ids.schoolA, "Ann Smith"),
    user("s2", "STUDENT", ids.schoolA, "Bo Jones"),
    user("s3", "STUDENT", ids.schoolA, "Cy Other"),
  ];
  const asUser = (u: (typeof fixtures)[number]) => ({ ...u, xp: 0, level: 1, cefrLevel: "A1" });
  const meta = { ip: "10.0.0.1", userAgent: "vitest" };

  let db: typeof import("@reading-advantage/db").db;
  let store: import("@reading-advantage/auth").RateLimitStore;
  let schema: typeof import("@reading-advantage/db/schema");
  let sl: typeof import("../student-login/index.js");

  beforeAll(async () => {
    ({ db } = await import("@reading-advantage/db"));
    schema = await import("@reading-advantage/db/schema");
    const auth = await import("@reading-advantage/auth");
    sl = await import("../student-login/index.js");
    store = auth.createPostgresRateLimitStore(db);
    await db.insert(schema.schools).values([{ id: ids.schoolA, name: `${tag} A` }, { id: ids.schoolB, name: `${tag} B` }]);
    await db.insert(schema.users).values(fixtures);
    await db.insert(schema.classrooms).values([
      { id: ids.class1, name: `${tag} c1`, schoolId: ids.schoolA, teacherId: `${tag}-t1` },
      { id: ids.class2, name: `${tag} c2`, schoolId: ids.schoolA, teacherId: `${tag}-t2` },
      { id: ids.classB, name: `${tag} cb`, schoolId: ids.schoolB, teacherId: `${tag}-tb` },
    ]);
    await db.insert(schema.classroomStudents).values([
      { classroomId: ids.class1, studentId: `${tag}-s1` },
      { classroomId: ids.class1, studentId: `${tag}-s2` },
      { classroomId: ids.class2, studentId: `${tag}-s3` },
    ]);
  });

  afterAll(async () => {
    if (!db) return;
    const userIds = fixtures.map((f) => f.id);
    await db.delete(schema.sessions).where(inArray(schema.sessions.userId, userIds));
    await db.delete(schema.auditEvents).where(inArray(schema.auditEvents.actorUserId, userIds));
    await db.delete(schema.loginAttempts).where(like(schema.loginAttempts.identifier, "student-code-class:%"));
    await db.delete(schema.classrooms).where(inArray(schema.classrooms.id, [ids.class1, ids.class2, ids.classB]));
    await db.delete(schema.users).where(inArray(schema.users.id, userIds));
    await db.delete(schema.schools).where(inArray(schema.schools.id, [ids.schoolA, ids.schoolB]));
  });

  const t1 = () => asUser(fixtures[0]!);

  it("starts a class, lists opaque names, and rejects an expired or ended code", async () => {
    const started = await sl.startClassSession({ db, user: t1(), actor: meta, input: { classroomId: ids.class1 } });
    const list = await sl.getNameListForCode({ db, store, ip: "10.0.0.2", input: { code: started.code } });
    expect(list.students.map((s) => s.displayName)).toEqual(["Ann", "Bo"]);
    const handles = list.students.map((s) => s.studentId);
    expect(handles).not.toContain(`${tag}-s1`);
    const creds = await db.select().from(schema.primaryStudentCredentials).where(inArray(schema.primaryStudentCredentials.userId, [`${tag}-s1`, `${tag}-s2`]));
    expect(creds.map((c) => c.id).sort()).toEqual([...handles].sort());
    expect(JSON.stringify(list)).not.toMatch(/Smith|Jones/);

    await db.update(schema.primaryClassLoginSessions).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(schema.primaryClassLoginSessions.id, started.sessionId));
    await expect(sl.getNameListForCode({ db, store, ip: "10.0.0.2", input: { code: started.code } })).rejects.toMatchObject({ code: "invalid_code" });

    const second = await sl.startClassSession({ db, user: t1(), actor: meta, input: { classroomId: ids.class1 } });
    await expect(sl.getNameListForCode({ db, store, ip: "10.0.0.2", input: { code: second.code } })).resolves.toBeDefined();
    expect(await sl.endClassSession({ db, user: t1(), actor: meta, input: { classroomId: ids.class1 } })).toEqual({ closed: 1 });
    await expect(sl.getNameListForCode({ db, store, ip: "10.0.0.2", input: { code: second.code } })).rejects.toMatchObject({ code: "invalid_code" });
  });

  it("replaces an open session on restart, keeping one open row per class", async () => {
    const a = await sl.startClassSession({ db, user: t1(), actor: meta, input: { classroomId: ids.class1 } });
    const b = await sl.startClassSession({ db, user: t1(), actor: meta, input: { classroomId: ids.class1 } });
    await expect(sl.getNameListForCode({ db, store, ip: "10.0.0.3", input: { code: a.code } })).rejects.toMatchObject({ code: "invalid_code" });
    await expect(sl.getNameListForCode({ db, store, ip: "10.0.0.3", input: { code: b.code } })).resolves.toBeDefined();
    await sl.endClassSession({ db, user: t1(), actor: meta, input: { classroomId: ids.class1 } });
  });

  it("refuses other teachers, other schools, and a duplicate open code at the index", async () => {
    await expect(sl.startClassSession({ db, user: asUser(fixtures[1]!), actor: meta, input: { classroomId: ids.class1 } })).rejects.toMatchObject({ code: "forbidden" });
    await expect(sl.startClassSession({ db, user: asUser(fixtures[2]!), actor: meta, input: { classroomId: ids.class1 } })).rejects.toMatchObject({ code: "not_found" });
    const a = await sl.startClassSession({ db, user: t1(), actor: meta, input: { classroomId: ids.class1 } });
    const hash = (await db.select().from(schema.primaryClassLoginSessions).where(eq(schema.primaryClassLoginSessions.id, a.sessionId)))[0]!.codeHash;
    await expect(
      db.insert(schema.primaryClassLoginSessions).values({ schoolId: ids.schoolA, classroomId: ids.class2, teacherId: `${tag}-t2`, codeHash: hash, expiresAt: new Date(Date.now() + 1000) }),
    ).rejects.toThrow();
    await sl.endClassSession({ db, user: t1(), actor: meta, input: { classroomId: ids.class1 } });
  });

  it("signs in with pictures, locks after 5 wrong tries, and unlocks on reset", async () => {
    const [assigned] = await sl.assignPicturePasswords({ db, user: t1(), meta, input: { classroomId: ids.class1 } }).then((r) => [r]);
    expect(assigned).toHaveLength(2);
    const ann = assigned!.find((a) => a.userId === `${tag}-s1`)!;
    const { code } = await sl.startClassSession({ db, user: t1(), actor: meta, input: { classroomId: ids.class1 } });
    const attempt = (pictures: number[], studentId = ann.credentialId, c = code) =>
      sl.signInWithPicture({ db, store, meta, input: { code: c, studentId, pictures } });

    const ok = await attempt(ann.pictures);
    expect(ok).toMatchObject({ authStrength: "full", user: { id: `${tag}-s1` } });
    const row = (await db.select().from(schema.sessions).where(eq(schema.sessions.userId, `${tag}-s1`)))[0]!;
    expect(row.authStrength).toBeNull();

    const wrong = ann.pictures.map((n) => (n + 1) % 12);
    for (let i = 0; i < 4; i++) await expect(attempt(wrong)).rejects.toMatchObject({ code: "invalid_credentials" });
    await expect(attempt(wrong)).rejects.toMatchObject({ code: "locked" });
    await expect(attempt(ann.pictures)).rejects.toMatchObject({ code: "locked" });
    const lockouts = await sl.getClassLockouts({ db, user: t1(), input: { classroomId: ids.class1 } });
    expect(lockouts.map((l) => l.userId)).toEqual([`${tag}-s1`]);
    const audit = await db.select().from(schema.auditEvents).where(eq(schema.auditEvents.actorUserId, `${tag}-s1`));
    expect(audit.map((a) => a.action)).toContain("student_login:lockout");

    const reset = await sl.resetPicturePassword({ db, user: t1(), meta, input: { classroomId: ids.class1, studentUserId: `${tag}-s1` } });
    await expect(attempt(ann.pictures)).rejects.toMatchObject({ code: "invalid_credentials" });
    await expect(attempt(reset.pictures)).resolves.toMatchObject({ authStrength: "full" });
    expect(await sl.getClassLockouts({ db, user: t1(), input: { classroomId: ids.class1 } })).toEqual([]);

    // A handle from another class does not work with this class's code.
    const other = (await db.select().from(schema.primaryStudentCredentials).where(eq(schema.primaryStudentCredentials.userId, `${tag}-s3`)))[0];
    await sl.ensureStudentCredentials(db, ids.schoolA, ids.class2);
    const s3 = (await db.select().from(schema.primaryStudentCredentials).where(eq(schema.primaryStudentCredentials.userId, `${tag}-s3`)))[0]!;
    expect(other ?? s3).toBeDefined();
    await expect(attempt([0, 1, 2], s3.id)).rejects.toMatchObject({ code: "invalid_credentials" });
    await sl.endClassSession({ db, user: t1(), actor: meta, input: { classroomId: ids.class1 } });
  });

  it("gives a code_only session only while the picture password is off", async () => {
    const { code } = await sl.startClassSession({ db, user: t1(), actor: meta, input: { classroomId: ids.class1 } });
    const [bo] = (await db.select().from(schema.primaryStudentCredentials).where(eq(schema.primaryStudentCredentials.userId, `${tag}-s2`)));
    const run = () => sl.signInWithCodeOnly({ db, store, meta, input: { code, studentId: bo!.id } });
    await expect(run()).rejects.toMatchObject({ code: "forbidden" });
    await sl.setPicturePasswordEnabled({ db, user: t1(), meta, input: { classroomId: ids.class1, enabled: false } });
    expect((await sl.getNameListForCode({ db, store, ip: "10.0.0.4", input: { code } })).picturePasswordRequired).toBe(false);
    await expect(run()).resolves.toMatchObject({ authStrength: "code_only" });
    const rows = await db.select().from(schema.sessions).where(eq(schema.sessions.userId, `${tag}-s2`));
    expect(rows.map((r) => r.authStrength)).toEqual(["code_only"]);
    await sl.endClassSession({ db, user: t1(), actor: meta, input: { classroomId: ids.class1 } });
  });
});
