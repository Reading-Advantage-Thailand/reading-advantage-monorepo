import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DB } from "@reading-advantage/db";
import { verifyPassword } from "@reading-advantage/auth";
import { createMockDb } from "./mock-db.js";
import { makeStore } from "./student-login-helpers.js";
import { resetClassPasswordsOutput } from "../student-login/contracts.js";
import { STUDENT_LOGIN_LIMITS } from "../student-login/rate-limits.js";
import { INITIAL_PASSWORD_LENGTH, resetClassPasswords } from "../student-login/usernames.js";

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
const meta = { ip: "1.1.1.1", userAgent: "ua" };
const classRow = { id: CLASS_ID, schoolId: SCHOOL, name: "P3A", teacherId: "t1", archived: false, picturePasswordEnabled: true };
const rows = [
  { userId: "u2", name: "Bo Jones", username: "p3a2" },
  { userId: "u1", name: "Ann Smith", username: "p3a1" },
];
const asDb = (db: ReturnType<typeof createMockDb>) => db as unknown as DB;
const run = (db: ReturnType<typeof createMockDb>, user = teacher, store = makeStore()) =>
  resetClassPasswords({ db: asDb(db), store, user, meta, input: { classroomId: CLASS_ID } });

/** Returns the values written by each `insert(...).values(...)` call (the mock reuses one builder). */
function insertedValues(db: ReturnType<typeof createMockDb>): Record<string, unknown>[] {
  const builders = new Set(db.insert.mock.results.map((r) => r.value));
  return [...builders].flatMap((b) => b.values.mock.calls.map((c: unknown[]) => c[0] as Record<string, unknown>));
}

beforeEach(() => {
  recordAuditEvent.mockReset();
  recordAuditEvent.mockResolvedValue(undefined);
});

describe("resetClassPasswords", () => {
  it("sets a new initial password for each student, returns it once, ends sessions, and audits", async () => {
    const db = createMockDb({ selectSequence: [[classRow], rows] });
    const out = await run(db);

    expect(out.classroomName).toBe("P3A");
    expect(out.failed).toEqual([]);
    expect(out.students.map((s) => [s.name, s.username])).toEqual([["Ann Smith", "p3a1"], ["Bo Jones", "p3a2"]]);
    for (const s of out.students) expect(s.password).toMatch(new RegExp(`^[a-hjkmnp-z2-9]{${INITIAL_PASSWORD_LENGTH}}$`));
    expect(out.students[0]!.password).not.toBe(out.students[1]!.password);

    // Only the argon2id hash is stored, in the credential account the shared login reads.
    const values = insertedValues(db);
    expect(values).toHaveLength(2);
    const ann = values.find((v) => v.userId === "u1")!;
    expect(ann).toMatchObject({ id: "u1_credential", providerId: "credential" });
    expect(ann.password).not.toBe(out.students[0]!.password);
    expect(await verifyPassword(out.students[0]!.password, ann.password as string)).toBe(true);
    // Each student's write and the end of the student's sessions run in one transaction.
    expect(db.transaction).toHaveBeenCalledTimes(2);
    expect(db.delete).toHaveBeenCalledTimes(2);

    expect(recordAuditEvent).toHaveBeenCalledTimes(1);
    const [actor, event] = recordAuditEvent.mock.calls[0]!;
    expect(actor).toMatchObject({ actorUserId: "t1", actorRole: "TEACHER" });
    expect(event).toMatchObject({ action: "student_login:class_password_reset", targetType: "classroom", targetId: CLASS_ID, metadata: { count: 2, failed: 0 } });
    expect(JSON.stringify(recordAuditEvent.mock.calls)).not.toContain(out.students[0]!.password);
    expect(() => resetClassPasswordsOutput.parse(out)).not.toThrow();
  });

  it("lets a school admin reset the class", async () => {
    const db = createMockDb({ selectSequence: [[{ ...classRow, teacherId: "other" }], rows] });
    const out = await run(db, admin);
    expect(out.students).toHaveLength(2);
  });

  it("reports a student whose write fails and keeps the others", async () => {
    const db = createMockDb({ selectSequence: [[classRow], rows] });
    let call = 0;
    db.transaction = vi.fn(async (fn: (tx: typeof db) => Promise<unknown>) => {
      if (call++ === 0) throw new Error("write failed");
      return fn(db);
    }) as typeof db.transaction;
    vi.spyOn(console, "error").mockImplementation(() => {});
    const out = await run(db);
    expect(out.failed).toEqual([{ userId: "u2", name: "Bo Jones" }]);
    expect(out.students.map((s) => s.userId)).toEqual(["u1"]);
    expect(recordAuditEvent.mock.calls[0]![1]).toMatchObject({ metadata: { count: 1, failed: 1 } });
  });

  it("limits resets per class", async () => {
    const store = makeStore();
    for (let i = 0; i < STUDENT_LOGIN_LIMITS.classPasswordReset.maxAttempts; i++) {
      await run(createMockDb({ selectSequence: [[classRow], []] }), teacher, store);
    }
    const db = createMockDb({ selectSequence: [[classRow], rows] });
    await expect(run(db, teacher, store)).rejects.toMatchObject({ code: "rate_limited" });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("rejects a student and a teacher who is not on the class without writing", async () => {
    const asStudent = createMockDb({ selectSequence: [[classRow], rows] });
    await expect(run(asStudent, student)).rejects.toMatchObject({ code: "forbidden" });
    const otherTeacher = createMockDb({ selectSequence: [[{ ...classRow, teacherId: "other" }], []] });
    await expect(run(otherTeacher)).rejects.toMatchObject({ code: "forbidden" });
    expect(asStudent.insert).not.toHaveBeenCalled();
    expect(otherTeacher.insert).not.toHaveBeenCalled();
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });

  it("writes nothing and no audit entry for an empty class", async () => {
    const db = createMockDb({ selectSequence: [[classRow], []] });
    expect(await run(db)).toEqual({ classroomName: "P3A", students: [], failed: [] });
    expect(db.insert).not.toHaveBeenCalled();
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });
});
