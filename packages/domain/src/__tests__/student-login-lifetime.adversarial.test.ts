/**
 * Adversarial tests for the class sign-in session lifetime.
 * Track: primary_class_session_lifetime_20261111, Phase 1. Scope: the time boundaries, the enum
 * bypass, the refusal order, and the tenant scope of the session. These tests read production
 * code only; they change none.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DB } from "@reading-advantage/db";
import type { UserContext } from "@reading-advantage/auth";
import { createMockDb } from "./mock-db.js";
import { TenantScopeError } from "../db-contract.js";
import { classSessionStartInput, type ClassSessionStartInput } from "../student-login/contracts.js";
import { endClassSession, startClassSession } from "../student-login/class-session.js";

const recordAuditEvent = vi.hoisted(() => vi.fn());
vi.mock("@reading-advantage/auth", async (orig) => ({
  ...(await orig<typeof import("@reading-advantage/auth")>()),
  recordAuditEvent,
}));

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const SCHOOL = "22222222-2222-4222-8222-222222222222";
const OTHER_SCHOOL = "44444444-4444-4444-8444-444444444444";
const teacher = { id: "t1", username: "t", name: "T", role: "TEACHER" as const, schoolId: SCHOOL, xp: 0, level: 1, cefrLevel: "A1" };
const student = { ...teacher, id: "s1", role: "STUDENT" as const };
const actor = { ip: "1.1.1.1", userAgent: "ua" };
const classRow = { id: CLASS_ID, schoolId: SCHOOL, teacherId: "t1", archived: false, picturePasswordEnabled: true };
const SESSION = { id: "33333333-3333-4333-8333-333333333333" };
const NOW = new Date("2026-11-11T05:00:00.000Z"); // 12:00 Bangkok
const HOUR_MS = 3_600_000;
const SIX_HOURS_MS = 21_600_000;
const SEVEN_DAYS_MS = 604_800_000;

/** The three values a caller may use. Every other value must be refused. */
const ALLOWED_LIFETIMES = ["6h", "until_17", "7d"] as const;

/**
 * Values that no caller may use as a lifetime. The list holds the near misses of the three
 * choices, the numbers that name a duration, the shapes that a JSON body can carry, and the
 * prototype keys of a plain object.
 */
const BYPASS_VALUES: unknown[] = [
  "7D", "7d ", " 7d", "until_17 ", "UNTIL_17", "168h", "30d", "1d", "3H", "",
  604800000, 10_800_000, 7, 0, -1, true, false, null, Number.NaN, Number.POSITIVE_INFINITY,
  ["7d"], [], { value: "7d" }, {},
  "constructor", "toString", "valueOf", "hasOwnProperty", "__proto__", "prototype",
];

/** Rows for `it.each`: the row index comes last, so every test name stays unique. */
const bypassRows = BYPASS_VALUES.map((value, index) => [value, index] as const);

beforeEach(() => {
  recordAuditEvent.mockReset();
  recordAuditEvent.mockResolvedValue(undefined);
});

/** Casts the mock database to the database type the domain expects. */
function asDb(db: ReturnType<typeof createMockDb>): DB {
  return db as unknown as DB;
}

/** A fixture that writes one session row and nothing else. */
function plainDb(overrides: Parameters<typeof createMockDb>[0] = {}) {
  return createMockDb({ selectSequence: [[classRow], [], []], insertReturning: [SESSION], ...overrides });
}

/**
 * A fixture that can write: a class, a student with no credential row, and an open old session.
 * The refused cases use it, so a refusal cannot pass on a fixture that cannot write.
 */
function writingDb(overrides: Parameters<typeof createMockDb>[0] = {}) {
  return createMockDb({
    selectSequence: [[classRow], [{ userId: "stu-new" }], []],
    updateReturning: [{ id: "old", expiresAt: new Date(NOW.getTime() + HOUR_MS) }],
    insertReturning: [SESSION],
    ...overrides,
  });
}

/** Starts a class with a lifetime value that the type does not allow. */
function startAt(
  db: ReturnType<typeof createMockDb>,
  lifetime: unknown,
  now: Date = NOW,
  user: UserContext = teacher,
) {
  return startClassSession({
    db: asDb(db),
    user,
    actor,
    input: { classroomId: CLASS_ID, lifetime } as unknown as ClassSessionStartInput,
    now,
  });
}

/** Asserts that a call wrote no row and wrote no audit line. */
function expectNoWrite(db: ReturnType<typeof createMockDb>) {
  expect(db.insert).not.toHaveBeenCalled();
  expect(db.update).not.toHaveBeenCalled();
  expect(db.delete).not.toHaveBeenCalled();
  expect(recordAuditEvent).not.toHaveBeenCalled();
}

/** Reads the values of the last insert call. */
function lastInsertValues(db: ReturnType<typeof createMockDb>) {
  const values = db.insert.mock.results.at(-1)!.value.values;
  return values.mock.calls.at(-1)![0] as { expiresAt: Date; startsAt: Date; schoolId: string; classroomId: string };
}

/** Finds the class_start audit call, so a missing call fails before a metadata check passes. */
function classStartAudit() {
  return recordAuditEvent.mock.calls.find((call) => call[1].action === "student_login:class_start");
}

describe("lifetime contract: the enum bypass", () => {
  it("covers the bypass rows", () => {
    expect(BYPASS_VALUES).toHaveLength(30);
  });

  it.each(bypassRows)("refuses the bypass value %j (row %i)", (lifetime, _index) => {
    const parsed = classSessionStartInput.safeParse({ classroomId: CLASS_ID, lifetime });
    expect(parsed.success).toBe(false);
  });

  it("gives the default only for a missing lifetime", () => {
    expect(classSessionStartInput.parse({ classroomId: CLASS_ID }).lifetime).toBe("6h");
    expect(classSessionStartInput.parse({ classroomId: CLASS_ID, lifetime: undefined }).lifetime).toBe("6h");
    expect(classSessionStartInput.safeParse({ classroomId: CLASS_ID, lifetime: null }).success).toBe(false);
  });

  it("strips a client time field next to the choice", () => {
    const parsed = classSessionStartInput.parse({
      classroomId: CLASS_ID,
      lifetime: "7d",
      expiresAt: "2026-12-01T00:00:00.000Z",
      durationMs: SEVEN_DAYS_MS,
      minutes: 10_080,
    });
    expect(Object.keys(parsed).sort()).toEqual(["classroomId", "lifetime"]);
    expect(parsed.lifetime).toBe("7d");
  });

  it("keeps a prototype key out of the parsed body and out of the prototype chain", () => {
    const body = JSON.parse(
      `{"classroomId":"${CLASS_ID}","lifetime":"7d","__proto__":{"polluted":true},"expiresAt":"2026-12-01T00:00:00.000Z"}`,
    );
    const parsed = classSessionStartInput.safeParse(body);
    expect(parsed.success).toBe(true);
    expect(Object.keys(parsed.data!)).toEqual(["classroomId", "lifetime"]);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(parsed.data!, "__proto__")).toBe(false);
  });

  it("accepts only the three choices and nothing else", () => {
    expect(ALLOWED_LIFETIMES).toHaveLength(3);
    let checked = 0;
    for (const lifetime of ALLOWED_LIFETIMES) {
      const parsed = classSessionStartInput.safeParse({ classroomId: CLASS_ID, lifetime });
      expect(parsed.success, lifetime).toBe(true);
      expect(parsed.data!.lifetime).toBe(lifetime);
      checked += 1;
    }
    expect(checked).toBe(3);
  });
});

describe("lifetime domain: the enum bypass", () => {
  it("control: the writing fixture writes the credential, the old close, and the session", async () => {
    const db = writingDb();
    await startAt(db, "6h");
    expect(db.insert).toHaveBeenCalledTimes(2);
    expect(db.update).toHaveBeenCalledTimes(2);
    expect(recordAuditEvent).toHaveBeenCalledTimes(2);
  });

  it.each(bypassRows)("refuses the bypass value %j (row %i) and writes nothing", async (lifetime, _index) => {
    const db = writingDb();
    await expect(startAt(db, lifetime)).rejects.toMatchObject({ code: "invalid_input" });
    expectNoWrite(db);
  });

  it("refuses a bypass value before it writes a row", async () => {
    const db = createMockDb({ selectSequence: [[classRow], [], []], insertReturning: [SESSION] });
    await expect(startAt(db, "constructor")).rejects.toMatchObject({ code: "invalid_input" });
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });
});

describe("lifetime domain: the time boundaries", () => {
  /**
   * The clock, whether the choice works, and the expiry. Bangkok is UTC+7 with no daylight
   * saving, so 17:00 Bangkok is 10:00 UTC on the same Bangkok date.
   */
  const boundaryRows: unknown[][] = [
    ["2026-11-11T09:59:59.999Z", true, "2026-11-11T10:00:00.000Z", 0],
    ["2026-11-11T09:59:59.000Z", true, "2026-11-11T10:00:00.000Z", 1],
    ["2026-11-11T10:00:00.000Z", false, null, 2],
    ["2026-11-11T16:59:59.999Z", false, null, 3],
    ["2026-11-10T16:59:59.999Z", false, null, 4],
    ["2026-11-11T17:00:00.000Z", true, "2026-11-12T10:00:00.000Z", 5],
    ["2026-11-10T17:00:00.000Z", true, "2026-11-11T10:00:00.000Z", 6],
  ];

  it("covers the boundary rows", () => {
    expect(boundaryRows).toHaveLength(7);
  });

  it.each(boundaryRows)("handles until_17 at %s (row %i)", async (iso, allowed, expected, _index) => {
    const db = writingDb();
    const now = new Date(iso as string);
    if (allowed === false) {
      await expect(startAt(db, "until_17", now)).rejects.toMatchObject({ code: "invalid_input" });
      expectNoWrite(db);
      return;
    }
    const out = await startAt(db, "until_17", now);
    expect(out.expiresAt.toISOString()).toBe(expected as string);
    // The expiry of until_17 is always the 17:00 Bangkok instant, so it is 10:00 UTC.
    expect(out.expiresAt.getUTCHours()).toBe(10);
    expect(out.expiresAt.getUTCMinutes()).toBe(0);
    expect(out.expiresAt.getUTCSeconds()).toBe(0);
    expect(out.expiresAt.getUTCMilliseconds()).toBe(0);
    expect(lastInsertValues(db).expiresAt.toISOString()).toBe(expected as string);
  });

  it.each([
    ["2026-11-11T05:00:00.000Z"],
    ["2026-03-07T12:00:00.000Z"],
    ["2026-11-01T12:00:00.000Z"],
  ])("gives 7 days exactly at %s", async (iso) => {
    const now = new Date(iso);
    const db = plainDb();
    const out = await startAt(db, "7d", now);
    expect(out.expiresAt.getTime() - now.getTime()).toBe(SEVEN_DAYS_MS);
    expect(lastInsertValues(db).expiresAt.getTime() - now.getTime()).toBe(SEVEN_DAYS_MS);
  });

  it("gives 6 hours exactly for the choice and for a missing lifetime", async () => {
    const chosen = await startAt(plainDb(), "6h", NOW);
    expect(chosen.expiresAt.getTime() - NOW.getTime()).toBe(SIX_HOURS_MS);
    const missing = await startClassSession({
      db: asDb(plainDb()),
      user: teacher,
      actor,
      input: { classroomId: CLASS_ID },
      now: NOW,
    });
    expect(missing.expiresAt.getTime() - NOW.getTime()).toBe(SIX_HOURS_MS);
  });

  it("keeps every accepted lifetime inside the 7 day maximum", async () => {
    expect(ALLOWED_LIFETIMES).toHaveLength(3);
    let checked = 0;
    for (const lifetime of ALLOWED_LIFETIMES) {
      const now = new Date("2026-11-11T05:00:00.000Z");
      const out = await startAt(plainDb(), lifetime, now);
      const delta = out.expiresAt.getTime() - now.getTime();
      expect(Number.isFinite(out.expiresAt.getTime()), lifetime).toBe(true);
      expect(delta, lifetime).toBeGreaterThan(0);
      expect(delta, lifetime).toBeLessThanOrEqual(SEVEN_DAYS_MS);
      checked += 1;
    }
    expect(checked).toBe(3);
  });
});

describe("lifetime domain: the refusal order", () => {
  it("refuses until_17 at 17:00 before it writes a credential, closes a session, or audits", async () => {
    const db = writingDb();
    await expect(startAt(db, "until_17", new Date("2026-11-11T10:00:00.000Z"))).rejects.toMatchObject({
      code: "invalid_input",
    });
    expectNoWrite(db);
  });

  it("keeps the open old session when the start is refused", async () => {
    const db = writingDb();
    await expect(startAt(db, "until_17", new Date("2026-11-11T16:59:59.999Z"))).rejects.toMatchObject({
      code: "invalid_input",
    });
    expect(db.update).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });

  it("answers forbidden or invalid_input for a student at 23:59 Bangkok, and writes nothing", async () => {
    const db = writingDb();
    const error = await startAt(db, "until_17", new Date("2026-11-11T16:59:00.000Z"), student).catch((caught) => caught);
    expect(["forbidden", "invalid_input"]).toContain((error as { code?: string }).code);
    expectNoWrite(db);
  });

  it("refuses an unknown value before it writes a row", async () => {
    const db = writingDb();
    await expect(startAt(db, "30d")).rejects.toMatchObject({ code: "invalid_input" });
    expectNoWrite(db);
  });
});

describe("lifetime domain: the tenant scope of the session", () => {
  it("refuses a class outside the school with 7 days and writes nothing", async () => {
    const db = createMockDb({ selectSequence: [[]] });
    await expect(startAt(db, "7d")).rejects.toMatchObject({ code: "not_found" });
    expectNoWrite(db);
  });

  it("refuses a teacher of another class with 7 days and writes nothing", async () => {
    const db = createMockDb({ selectSequence: [[{ ...classRow, teacherId: "other" }], []] });
    await expect(startAt(db, "7d")).rejects.toMatchObject({ code: "forbidden" });
    expectNoWrite(db);
  });

  it("refuses a student session with 7 days and writes nothing", async () => {
    const db = writingDb();
    await expect(startAt(db, "7d", NOW, student)).rejects.toMatchObject({ code: "forbidden" });
    expectNoWrite(db);
  });

  it("writes the session row with the school of the authorized class", async () => {
    const db = plainDb();
    await startAt(db, "7d");
    const inserted = lastInsertValues(db) as unknown as { schoolId: string; classroomId: string };
    expect(inserted.schoolId).toBe(SCHOOL);
    expect(inserted.classroomId).toBe(CLASS_ID);
  });

  it("keeps the session insert on the tenant-scoped handle", async () => {
    // A class row of another school cannot reach the session row: the tenant-scoped insert
    // refuses a school id that is not the school of the caller.
    const db = createMockDb({
      selectSequence: [[{ ...classRow, schoolId: OTHER_SCHOOL }], [], []],
      insertReturning: [SESSION],
    });
    const error = await startAt(db, "7d").catch((caught) => caught);
    expect(error).toBeInstanceOf(TenantScopeError);
    const values = db.insert.mock.results[0]!.value.values;
    expect(values).not.toHaveBeenCalled();
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });

  it("refuses to end a class outside the school", async () => {
    const db = createMockDb({ selectSequence: [[]] });
    await expect(
      endClassSession({ db: asDb(db), user: teacher, actor, input: { classroomId: CLASS_ID }, now: NOW }),
    ).rejects.toMatchObject({ code: "not_found" });
    expectNoWrite(db);
  });

  it("refuses to end a class of another teacher", async () => {
    const db = createMockDb({ selectSequence: [[{ ...classRow, teacherId: "other" }], []] });
    await expect(
      endClassSession({ db: asDb(db), user: teacher, actor, input: { classroomId: CLASS_ID }, now: NOW }),
    ).rejects.toMatchObject({ code: "forbidden" });
    expectNoWrite(db);
  });
});

describe("lifetime domain: the audit line", () => {
  it("holds the session id, the expiry, and the lifetime only", async () => {
    const db = plainDb();
    const out = await startAt(db, "7d");
    const call = classStartAudit();
    expect(call).toBeDefined();
    expect(Object.keys(call![1].metadata).sort()).toEqual(["expiresAt", "lifetime", "sessionId"]);
    expect(call![1].metadata).toEqual({
      sessionId: SESSION.id,
      expiresAt: out.expiresAt.toISOString(),
      lifetime: "7d",
    });
  });

  it("records one of the three choices for every accepted lifetime", async () => {
    expect(ALLOWED_LIFETIMES).toHaveLength(3);
    let checked = 0;
    for (const lifetime of ALLOWED_LIFETIMES) {
      recordAuditEvent.mockClear();
      const db = plainDb();
      await startAt(db, lifetime);
      const call = classStartAudit();
      expect(call, lifetime).toBeDefined();
      expect(call![1].metadata.lifetime).toBe(lifetime);
      checked += 1;
    }
    expect(checked).toBe(3);
  });

  it("holds no code, no hash, and no token in the audit line", async () => {
    const db = plainDb();
    const out = await startAt(db, "7d");
    expect(classStartAudit()).toBeDefined();
    const text = JSON.stringify(recordAuditEvent.mock.calls);
    expect(text).not.toContain(out.code);
    expect(text).not.toMatch(/codeHash|token|hash/i);
  });
});
