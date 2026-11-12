import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DB } from "@reading-advantage/db";
import { createMockDb } from "./mock-db.js";
import { makeStore } from "./student-login-helpers.js";
import { hashClassCode } from "../student-login/codes.js";
import { CLASS_CODE_ALPHABET, nameListOutput, type ClassSessionStartInput } from "../student-login/contracts.js";
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
  it("starts a six-hour session for the class teacher and stores only the code hash", async () => {
    const db = createMockDb({
      selectSequence: [[classRow], [], []],
      insertReturning: [{ id: "33333333-3333-4333-8333-333333333333" }],
    });
    const out = await startClassSession({ db: asDb(db), user: teacher, actor, input: { classroomId: CLASS_ID }, now: NOW });
    expect([...out.code].every((c) => CLASS_CODE_ALPHABET.includes(c))).toBe(true);
    expect(out.expiresAt.getTime()).toBe(NOW.getTime() + 6 * 60 * 60 * 1000);
    const inserted = db.insert.mock.results.at(-1)!.value.values.mock.calls[0][0];
    expect(inserted.codeHash).toBe(hashClassCode(out.code));
    expect(inserted.expiresAt).toEqual(out.expiresAt);
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

  it("adds the last-name initial only when two students share a first name (owner decision 2026-10-08)", async () => {
    const twins = [
      { handle: "c-1", name: "Beam Smith" },
      { handle: "c-2", name: "Beam Tan" },
      { handle: "c-3", name: "Ann Lee" },
    ];
    const db = createMockDb({ selectSequence: [[session], [{ picturePasswordEnabled: false }], twins] });
    const out = await getNameListForCode({ db: asDb(db), store: makeStore(), ip: "9.9.9.9", input: { code: "ABCDEF" }, now: NOW });
    expect(out.students.map((s) => s.displayName)).toEqual(["Ann", "Beam S.", "Beam T."]);
    expect(JSON.stringify(out)).not.toMatch(/Smith|Tan|Lee/);
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

// Fixed clocks of the lifetime cases (strategy section 6.2). Bangkok is UTC+7 with no daylight saving.
const LIFETIME_NOW = new Date("2026-11-11T05:00:00Z"); // 12:00 Bangkok
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const LIFETIME_SESSION = { id: "33333333-3333-4333-8333-333333333333" };

/** Mocks the select and insert chains of one lifetime start (class read, no missing credential, no collision). */
function lifetimeDb(overrides: Parameters<typeof createMockDb>[0] = {}) {
  return createMockDb({
    selectSequence: [[classRow], [], []],
    insertReturning: [LIFETIME_SESSION],
    ...overrides,
  });
}

/** Starts a class with a lifetime value that the type does not know at HEAD. */
function startAt(db: ReturnType<typeof createMockDb>, lifetime: unknown, now: Date = LIFETIME_NOW) {
  return startClassSession({
    db: asDb(db),
    user: teacher,
    actor,
    input: { classroomId: CLASS_ID, lifetime } as unknown as ClassSessionStartInput,
    now,
  });
}

/** Reads the values of the last insert call (the session row when the last insert is the session). */
function lastInsertValues(db: ReturnType<typeof createMockDb>) {
  return db.insert.mock.results.at(-1)!.value.values.mock.calls[0][0] as { expiresAt: Date; startsAt: Date };
}

/** Finds the class_start audit call, so a missing call fails before a metadata check passes. */
function classStartAudit() {
  return recordAuditEvent.mock.calls.find((call) => call[1].action === "student_login:class_start");
}

describe("startClassSession lifetime", () => {
  it.each([
    ["6h", "2026-11-11T11:00:00.000Z"],
    ["7d", "2026-11-18T05:00:00.000Z"],
    ["until_17", "2026-11-11T10:00:00.000Z"],
  ])("computes the expiry for %s and stores the same value", async (lifetime, expected) => {
    const db = lifetimeDb();
    const out = await startAt(db, lifetime);
    expect(out.expiresAt.toISOString()).toBe(expected);
    const inserted = lastInsertValues(db);
    expect(inserted.expiresAt.toISOString()).toBe(expected);
    expect(inserted.startsAt).toEqual(LIFETIME_NOW);
    expect(Object.keys(out).sort()).toEqual(["code", "expiresAt", "sessionId"]);
  });

  it("works at the last second before 17:00 Bangkok", async () => {
    const out = await startAt(lifetimeDb(), "until_17", new Date("2026-11-11T09:59:59Z"));
    expect(out.expiresAt.toISOString()).toBe("2026-11-11T10:00:00.000Z");
  });

  it.each([
    ["17:00 Bangkok", "2026-11-11T10:00:00Z"],
    ["23:59 Bangkok", "2026-11-11T16:59:00Z"],
    ["the last instant before midnight Bangkok", "2026-11-10T16:59:59.999Z"],
  ])("refuses until_17 at %s with invalid_input", async (_label, iso) => {
    await expect(startAt(lifetimeDb(), "until_17", new Date(iso))).rejects.toMatchObject({ code: "invalid_input" });
  });

  it("works at the first instant of the Bangkok day", async () => {
    const out = await startAt(lifetimeDb(), "until_17", new Date("2026-11-10T17:00:00.000Z"));
    expect(out.expiresAt.toISOString()).toBe("2026-11-11T10:00:00.000Z");
  });

  it("uses the Bangkok date when the UTC date still shows the day before", async () => {
    const out = await startAt(lifetimeDb(), "until_17", new Date("2026-11-11T17:30:00Z"));
    expect(out.expiresAt.toISOString()).toBe("2026-11-12T10:00:00.000Z");
  });

  it("accepts only a lifetime inside the 7 day maximum", async () => {
    const choices = ["6h", "until_17", "7d"];
    expect(choices).toHaveLength(3);
    let checked = 0;
    for (const lifetime of choices) {
      const out = await startAt(lifetimeDb(), lifetime);
      const delta = out.expiresAt.getTime() - LIFETIME_NOW.getTime();
      expect(Number.isFinite(out.expiresAt.getTime())).toBe(true);
      expect(delta).toBeGreaterThan(0);
      expect(delta).toBeLessThanOrEqual(7 * DAY_MS);
      checked += 1;
    }
    expect(checked).toBe(3);
  });

  it.each(["6h", "7d", "until_17"])("records the chosen lifetime %s in the class_start audit line", async (lifetime) => {
    const db = lifetimeDb();
    const out = await startAt(db, lifetime);
    const call = classStartAudit();
    expect(call).toBeDefined();
    expect(call![1].metadata).toEqual({
      sessionId: LIFETIME_SESSION.id,
      expiresAt: out.expiresAt.toISOString(),
      lifetime,
    });
  });

  it("records the default 6 hours in the audit line", async () => {
    const out = await startAt(lifetimeDb(), undefined);
    const call = classStartAudit();
    expect(call).toBeDefined();
    expect(call![1].metadata).toEqual({
      sessionId: LIFETIME_SESSION.id,
      expiresAt: out.expiresAt.toISOString(),
      lifetime: "6h",
    });
  });

  it("keeps the code and the hashes out of a 7 day audit line", async () => {
    const out = await startAt(lifetimeDb(), "7d");
    expect(classStartAudit()).toBeDefined();
    const text = JSON.stringify(recordAuditEvent.mock.calls);
    expect(text).not.toContain(out.code);
    expect(text).not.toMatch(/codeHash/);
  });

  it("uses the new lifetime on a restart and still closes the old session", async () => {
    const db = lifetimeDb({ updateReturning: [{ id: "old", expiresAt: new Date(LIFETIME_NOW.getTime() + HOUR_MS) }] });
    const out = await startAt(db, "7d");
    const actions = recordAuditEvent.mock.calls.map((call) => call[1].action);
    expect(actions).toEqual(["student_login:class_end", "student_login:class_start"]);
    const call = classStartAudit();
    expect(call).toBeDefined();
    expect(call![1].metadata).toMatchObject({ sessionId: LIFETIME_SESSION.id, lifetime: "7d" });
    expect(out.expiresAt.toISOString()).toBe("2026-11-18T05:00:00.000Z");
  });

  const unknownRows: unknown[][] = ["30d", "1d", "", 7, null, "constructor", "toString", "__proto__", "hasOwnProperty"].map(
    (value) => [value],
  );

  it.each(unknownRows)("refuses the unknown lifetime %j with invalid_input and no write", async (lifetime) => {
    const db = lifetimeDb();
    await expect(startAt(db, lifetime)).rejects.toMatchObject({ code: "invalid_input" });
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
    expect(db.delete).not.toHaveBeenCalled();
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });

  // The fixture writes for 6 hours, so a refusal case cannot pass on a fixture that cannot write (A4, F1).
  function writingDb() {
    return createMockDb({
      selectSequence: [[classRow], [{ userId: "stu-new" }], []],
      updateReturning: [{ id: "old", expiresAt: new Date(LIFETIME_NOW.getTime() + HOUR_MS) }],
      insertReturning: [LIFETIME_SESSION],
    });
  }

  it("control: the writing fixture writes the credential, the old close, and the session", async () => {
    const db = writingDb();
    await startAt(db, "6h");
    expect(db.insert).toHaveBeenCalledTimes(2);
    expect(db.update).toHaveBeenCalledTimes(2);
    expect(recordAuditEvent).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["17:00 Bangkok", "2026-11-11T10:00:00Z"],
    ["23:59 Bangkok", "2026-11-11T16:59:00Z"],
  ])("refuses until_17 at %s before it writes any row", async (_label, iso) => {
    const db = writingDb();
    await expect(startAt(db, "until_17", new Date(iso))).rejects.toMatchObject({ code: "invalid_input" });
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
    expect(db.delete).not.toHaveBeenCalled();
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });

  it("refuses an unknown value before it writes any row", async () => {
    const db = writingDb();
    await expect(startAt(db, "30d")).rejects.toMatchObject({ code: "invalid_input" });
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
    expect(db.delete).not.toHaveBeenCalled();
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });

  it.each([["student", student], ["system", system]])("rejects a %s with 7 days and writes nothing", async (_label, user) => {
    const db = lifetimeDb();
    await expect(
      startClassSession({
        db: asDb(db),
        user,
        actor,
        input: { classroomId: CLASS_ID, lifetime: "7d" } as unknown as ClassSessionStartInput,
        now: LIFETIME_NOW,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("returns not_found for another school with 7 days and writes nothing", async () => {
    const db = createMockDb({ selectSequence: [[]] });
    await expect(
      startClassSession({
        db: asDb(db),
        user: teacher,
        actor,
        input: { classroomId: CLASS_ID, lifetime: "7d" } as unknown as ClassSessionStartInput,
        now: LIFETIME_NOW,
      }),
    ).rejects.toMatchObject({ code: "not_found" });
    expect(db.insert).not.toHaveBeenCalled();
  });
});
