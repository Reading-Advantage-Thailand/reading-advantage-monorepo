import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DB } from "@reading-advantage/db";
import { createMockDb } from "./mock-db.js";
import { makeStore } from "./student-login-helpers.js";
import { hashClassCode } from "../student-login/codes.js";
import { CLASS_CODE_ALPHABET, nameListOutput } from "../student-login/contracts.js";
import {
  startClassSession,
  endClassSession,
  getNameListForCode,
} from "../student-login/class-session.js";
import { STUDENT_LOGIN_LIMITS } from "../student-login/rate-limits.js";

const recordAuditEvent = vi.hoisted(() => vi.fn());
vi.mock("@reading-advantage/auth", async (orig) => ({
  ...(await orig<typeof import("@reading-advantage/auth")>()),
  recordAuditEvent,
}));

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const SCHOOL = "22222222-2222-4222-8222-222222222222";
const teacher = { id: "t1", username: "t", name: "T", role: "TEACHER" as const, schoolId: SCHOOL, xp: 0, level: 1, cefrLevel: "A1" };
const admin = { ...teacher, id: "a1", role: "ADMIN" as const };
const student = { ...teacher, id: "s1", role: "STUDENT" as const };
const system = { ...teacher, id: "sys", role: "SYSTEM" as const, schoolId: null };
const actor = { ip: "1.1.1.1", userAgent: "ua" };
const classRow = { id: CLASS_ID, schoolId: SCHOOL, teacherId: "t1", archived: false, picturePasswordEnabled: true };
const NOW = new Date("2026-10-05T01:00:00Z");

function asDb(db: ReturnType<typeof createMockDb>): DB {
  return db as unknown as DB;
}

beforeEach(() => {
  recordAuditEvent.mockReset();
  recordAuditEvent.mockResolvedValue(undefined);
});

describe("startClassSession", () => {
  // select order: classroom, missing credentials, code collision
  it("starts a session for the class teacher and stores only the code hash", async () => {
    const db = createMockDb({
      selectSequence: [[classRow], [], []],
      insertReturning: [{ id: "33333333-3333-4333-8333-333333333333" }],
    });
    const out = await startClassSession({ db: asDb(db), user: teacher, actor, input: { classroomId: CLASS_ID }, now: NOW });
    expect([...out.code].every((c) => CLASS_CODE_ALPHABET.includes(c))).toBe(true);
    expect(out.expiresAt.getTime()).toBe(NOW.getTime() + 3 * 60 * 60 * 1000);
    const inserted = db.insert.mock.results.at(-1)!.value.values.mock.calls[0][0];
    expect(inserted.codeHash).toBe(hashClassCode(out.code));
    expect(JSON.stringify(inserted)).not.toContain(out.code);
    expect(inserted).toMatchObject({ schoolId: SCHOOL, classroomId: CLASS_ID, teacherId: "t1" });
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "t1" }),
      expect.objectContaining({ action: "student_login:class_start", targetId: CLASS_ID }),
    );
  });

  it("lets an admin of the school start any class", async () => {
    const db = createMockDb({ selectSequence: [[{ ...classRow, teacherId: "other" }], [], []], insertReturning: [{ id: "33333333-3333-4333-8333-333333333333" }] });
    await expect(startClassSession({ db: asDb(db), user: admin, actor, input: { classroomId: CLASS_ID }, now: NOW })).resolves.toBeDefined();
  });

  it.each([["student", student], ["system", system]])("rejects a %s", async (_n, user) => {
    const db = createMockDb({ selectSequence: [[classRow]] });
    await expect(startClassSession({ db: asDb(db), user, actor, input: { classroomId: CLASS_ID }, now: NOW })).rejects.toMatchObject({ code: "forbidden" });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("rejects a teacher who is not on the class", async () => {
    const db = createMockDb({ selectSequence: [[{ ...classRow, teacherId: "other" }], []] });
    await expect(startClassSession({ db: asDb(db), user: teacher, actor, input: { classroomId: CLASS_ID }, now: NOW })).rejects.toMatchObject({ code: "forbidden" });
  });

  it("accepts a co-teacher from classroom_teachers", async () => {
    const db = createMockDb({ selectSequence: [[{ ...classRow, teacherId: "other" }], [{ id: "x" }], [], []], insertReturning: [{ id: "33333333-3333-4333-8333-333333333333" }] });
    await expect(startClassSession({ db: asDb(db), user: teacher, actor, input: { classroomId: CLASS_ID }, now: NOW })).resolves.toBeDefined();
  });

  it("returns not_found for a class outside the school (tenant scope)", async () => {
    const db = createMockDb({ selectSequence: [[]] });
    await expect(startClassSession({ db: asDb(db), user: teacher, actor, input: { classroomId: CLASS_ID }, now: NOW })).rejects.toMatchObject({ code: "not_found" });
  });

  it("retries when the code collides with an open session", async () => {
    let calls = 0;
    const pick = () => Math.floor(calls++ / 6); // first code AAAAAA, second BBBBBB
    // select order: classroom, missing credentials, collision (hit), collision (none)
    const db = createMockDb({ selectSequence: [[classRow], [], [{ id: "open" }], []], insertReturning: [{ id: "33333333-3333-4333-8333-333333333333" }] });
    const out = await startClassSession({ db: asDb(db), user: teacher, actor, input: { classroomId: CLASS_ID }, now: NOW, pick });
    expect(out.code).toBe("BBBBBB");
  });

  it("retries when the insert hits the unique index", async () => {
    let calls = 0;
    const pick = () => Math.floor(calls++ / 6);
    const db = createMockDb({ selectSequence: [[classRow], [], [], [], []] });
    const values = vi
      .fn()
      .mockImplementationOnce(() => ({ returning: vi.fn().mockRejectedValue(Object.assign(new Error("dup"), { code: "23505" })) }))
      .mockImplementationOnce(() => ({ returning: vi.fn().mockResolvedValue([{ id: "33333333-3333-4333-8333-333333333333" }]) }));
    db.insert.mockReturnValue({ values });
    const out = await startClassSession({ db: asDb(db), user: teacher, actor, input: { classroomId: CLASS_ID }, now: NOW, pick });
    expect(out.code).toBe("BBBBBB");
  });

  it("gives up after too many collisions", async () => {
    const db = createMockDb({ selectSequence: [[classRow], [], [{ id: "open" }]].concat(Array(20).fill([{ id: "open" }])) });
    await expect(startClassSession({ db: asDb(db), user: teacher, actor, input: { classroomId: CLASS_ID }, now: NOW })).rejects.toMatchObject({ code: "unavailable" });
  });

  it("closes an earlier open session of the same class and audits it", async () => {
    const db = createMockDb({
      selectSequence: [[classRow], [], []],
      insertReturning: [{ id: "33333333-3333-4333-8333-333333333333" }],
      updateReturning: [{ id: "old", expiresAt: new Date(NOW.getTime() + 1000) }],
    });
    await startClassSession({ db: asDb(db), user: teacher, actor, input: { classroomId: CLASS_ID }, now: NOW });
    const actions = recordAuditEvent.mock.calls.map((c) => c[1].action);
    expect(actions).toEqual(["student_login:class_end", "student_login:class_start"]);
  });
});

describe("endClassSession", () => {
  it("closes the open session and audits", async () => {
    const db = createMockDb({ selectSequence: [[classRow]], updateReturning: [{ id: "s" }] });
    expect(await endClassSession({ db: asDb(db), user: teacher, actor, input: { classroomId: CLASS_ID }, now: NOW })).toEqual({ closed: 1 });
    expect(recordAuditEvent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: "student_login:class_end" }));
  });

  it("is idempotent when no session is open", async () => {
    const db = createMockDb({ selectSequence: [[classRow]], updateReturning: [] });
    expect(await endClassSession({ db: asDb(db), user: teacher, actor, input: { classroomId: CLASS_ID }, now: NOW })).toEqual({ closed: 0 });
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });

  it("rejects a student", async () => {
    const db = createMockDb({ selectSequence: [[classRow]] });
    await expect(endClassSession({ db: asDb(db), user: student, actor, input: { classroomId: CLASS_ID }, now: NOW })).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("getNameListForCode", () => {
  const session = { id: "ses", schoolId: SCHOOL, classroomId: CLASS_ID };
  const rows = [
    { handle: "c-b", name: "Beam Smith" },
    { handle: "c-a", name: "Ann" },
    { handle: "c-c", name: null },
  ];

  it("returns opaque handles and first names only", async () => {
    const db = createMockDb({ selectSequence: [[session], [{ picturePasswordEnabled: true }], rows] });
    const out = await getNameListForCode({ db: asDb(db), store: makeStore(), ip: "9.9.9.9", input: { code: "ABCDEF" }, now: NOW });
    expect(nameListOutput.parse(out)).toEqual(out);
    expect(out.picturePasswordRequired).toBe(true);
    expect(out.students.map((s) => s.studentId)).toEqual(["c-a", "c-b", "c-c"]);
    expect(out.students.map((s) => s.displayName)).toEqual(["Ann", "Beam", "Student"]);
    expect(JSON.stringify(out)).not.toMatch(/Smith|@|username/);
  });

  it("reports picturePasswordRequired false when the class turned it off", async () => {
    const db = createMockDb({ selectSequence: [[session], [{ picturePasswordEnabled: false }], []] });
    const out = await getNameListForCode({ db: asDb(db), store: makeStore(), ip: null, input: { code: "ABCDEF" }, now: NOW });
    expect(out.picturePasswordRequired).toBe(false);
  });

  it("rejects an unknown, closed, or expired code and counts the miss globally", async () => {
    const store = makeStore();
    const db = createMockDb({ selectSequence: [[]] });
    await expect(getNameListForCode({ db: asDb(db), store, ip: "9.9.9.9", input: { code: "ABCDEF" }, now: NOW })).rejects.toMatchObject({ code: "invalid_code" });
    expect(store.map.get("student-code-miss-global:all")?.failedCount).toBe(1);
  });

  it("stops code entry from an IP above the limit before any lookup", async () => {
    const store = makeStore();
    store.map.set("student-code-ip:9.9.9.9", { failedCount: STUDENT_LOGIN_LIMITS.ip.maxAttempts, windowStart: Date.now() });
    const db = createMockDb({ selectSequence: [[session]] });
    await expect(getNameListForCode({ db: asDb(db), store, ip: "9.9.9.9", input: { code: "ABCDEF" }, now: NOW })).rejects.toMatchObject({ code: "rate_limited" });
    expect(db.select).not.toHaveBeenCalled();
  });

  it("stops all code entry when the global miss bucket is full", async () => {
    const store = makeStore();
    store.map.set("student-code-miss-global:all", { failedCount: STUDENT_LOGIN_LIMITS.globalMiss.maxAttempts, windowStart: Date.now() });
    const db = createMockDb({ selectSequence: [[session]] });
    await expect(getNameListForCode({ db: asDb(db), store, ip: "5.5.5.5", input: { code: "ABCDEF" }, now: NOW })).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("stops requests for a class above the class limit", async () => {
    const store = makeStore();
    store.map.set(`student-code-class:${CLASS_ID}`, { failedCount: STUDENT_LOGIN_LIMITS.classroom.maxAttempts, windowStart: Date.now() });
    const db = createMockDb({ selectSequence: [[session]] });
    await expect(getNameListForCode({ db: asDb(db), store, ip: "5.5.5.5", input: { code: "ABCDEF" }, now: NOW })).rejects.toMatchObject({ code: "rate_limited" });
  });
});
