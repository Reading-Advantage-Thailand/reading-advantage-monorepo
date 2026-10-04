import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DB } from "@reading-advantage/db";
import { createMockDb } from "./mock-db.js";
import { makeStore } from "./student-login-helpers.js";
import { hashPictureSequence, verifyPictureSequence } from "../student-login/codes.js";
import {
  signInWithPicture,
  signInWithCodeOnly,
  assignPicturePasswords,
  resetPicturePassword,
  setPicturePasswordEnabled,
  getClassLockouts,
  MAX_PICTURE_FAILURES,
  PICTURE_LOCKOUT_MS,
} from "../student-login/picture-password.js";

const recordAuditEvent = vi.hoisted(() => vi.fn());
const createSession = vi.hoisted(() => vi.fn());
vi.mock("@reading-advantage/auth", async (orig) => ({
  ...(await orig<typeof import("@reading-advantage/auth")>()),
  recordAuditEvent,
  createSession,
}));

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const SCHOOL = "22222222-2222-4222-8222-222222222222";
const teacher = { id: "t1", username: "t", name: "T", role: "TEACHER" as const, schoolId: SCHOOL, xp: 0, level: 1, cefrLevel: "A1" };
const student = { ...teacher, id: "s1", role: "STUDENT" as const };
const meta = { ip: "1.1.1.1", userAgent: "ua" };
const classRow = { id: CLASS_ID, schoolId: SCHOOL, teacherId: "t1", archived: false, picturePasswordEnabled: true };
const session = { id: "ses", schoolId: SCHOOL, classroomId: CLASS_ID };
const NOW = new Date("2026-10-05T01:00:00Z");

const asDb = (db: ReturnType<typeof createMockDb>) => db as unknown as DB;

let hash: string;
function credRow(over: Record<string, unknown> = {}) {
  return { credentialId: "cred-1", userId: "stu-1", pictureHash: hash, failedCount: 0, lockedUntil: null, ...over };
}

beforeEach(async () => {
  recordAuditEvent.mockReset();
  recordAuditEvent.mockResolvedValue(undefined);
  createSession.mockReset();
  createSession.mockImplementation(async (_db, userId, opts) => ({
    token: "tok", expiresAt: new Date(NOW.getTime() + 1000), authStrength: opts?.authStrength ?? "full", user: { id: userId, role: "STUDENT" },
  }));
  hash ??= await hashPictureSequence([1, 2, 3]);
});

const signIn = (db: ReturnType<typeof createMockDb>, pictures = [1, 2, 3], store = makeStore()) =>
  signInWithPicture({ db: asDb(db), store, meta, input: { code: "ABCDEF", studentId: "cred-1", pictures }, now: NOW });

describe("signInWithPicture", () => {
  it("signs in with the right pictures and a full session", async () => {
    const db = createMockDb({ selectSequence: [[session], [credRow()]], updateReturning: [{ lockedUntil: null }] });
    const out = await signIn(db);
    expect(out).toMatchObject({ user: { id: "stu-1", role: "STUDENT" }, authStrength: "full", token: "tok" });
    expect(createSession).toHaveBeenCalledWith(expect.anything(), "stu-1", expect.objectContaining({ authStrength: "full", ipAddress: "1.1.1.1" }));
    expect(recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: "stu-1" }), expect.objectContaining({ action: "auth:login" }));
  });

  it("applies the student session policy: school-day expiry, 30 minutes idle, one device", async () => {
    const db = createMockDb({ selectSequence: [[session], [credRow()]], updateReturning: [{ lockedUntil: null }] });
    await signIn(db);
    expect(createSession).toHaveBeenCalledWith(
      expect.anything(),
      "stu-1",
      expect.objectContaining({ expiresAt: new Date("2026-10-05T10:00:00Z"), idleTimeoutSeconds: 1800, singleDevice: true }),
    );
  });

  it("claims the try before the verify and clears the count after a success", async () => {
    const db = createMockDb({ selectSequence: [[session], [credRow({ failedCount: 3 })]], updateReturning: [{ lockedUntil: null }] });
    await signIn(db);
    expect(db.update).toHaveBeenCalledTimes(2);
    const reset = db.update.mock.results[0]!.value.set.mock.calls[1][0];
    expect(reset).toMatchObject({ failedCount: 0, lockedUntil: null });
  });

  it("refuses the right pictures when the claim finds the student locked by a parallel try", async () => {
    // The first read shows no lock, but the atomic claim returns no row.
    const db = createMockDb({ selectSequence: [[session], [credRow()]], updateReturning: [] });
    await expect(signIn(db)).rejects.toMatchObject({ code: "locked" });
    expect(db.update).toHaveBeenCalledOnce();
    expect(createSession).not.toHaveBeenCalled();
  });

  it("rejects wrong pictures with a generic error and counts the failure", async () => {
    const db = createMockDb({ selectSequence: [[session], [credRow()]], updateReturning: [{ lockedUntil: null }] });
    await expect(signIn(db, [3, 2, 1])).rejects.toMatchObject({ code: "invalid_credentials" });
    expect(db.update).toHaveBeenCalledOnce();
    expect(createSession).not.toHaveBeenCalled();
  });

  it("locks for 5 minutes on the 5th wrong try and audits it", async () => {
    expect(MAX_PICTURE_FAILURES).toBe(5);
    expect(PICTURE_LOCKOUT_MS).toBe(5 * 60 * 1000);
    const lockedUntil = new Date(NOW.getTime() + PICTURE_LOCKOUT_MS);
    const db = createMockDb({ selectSequence: [[session], [credRow({ failedCount: 4 })]], updateReturning: [{ lockedUntil }] });
    await expect(signIn(db, [3, 2, 1])).rejects.toMatchObject({ code: "locked", retryAfterSeconds: 300 });
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "stu-1" }),
      expect.objectContaining({ action: "student_login:lockout", targetId: "cred-1", metadata: expect.objectContaining({ classroomId: CLASS_ID }) }),
    );
  });

  it("rejects a locked student even with the right pictures and does not verify", async () => {
    const lockedUntil = new Date(NOW.getTime() + 60_000);
    const db = createMockDb({ selectSequence: [[session], [credRow({ lockedUntil })]] });
    await expect(signIn(db)).rejects.toMatchObject({ code: "locked", retryAfterSeconds: 60 });
    expect(db.update).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });

  it("allows sign-in again once the lock has expired", async () => {
    const db = createMockDb({ selectSequence: [[session], [credRow({ lockedUntil: new Date(NOW.getTime() - 1) })]], updateReturning: [{ lockedUntil: null }] });
    await expect(signIn(db)).resolves.toMatchObject({ authStrength: "full" });
  });

  it("gives the same error for a handle that is not in the class of the code", async () => {
    const db = createMockDb({ selectSequence: [[session], []] });
    await expect(signIn(db)).rejects.toMatchObject({ code: "invalid_credentials" });
    expect(db.update).not.toHaveBeenCalled();
  });

  it("rejects a student that has no picture password yet", async () => {
    const db = createMockDb({ selectSequence: [[session], [credRow({ pictureHash: null })]] });
    await expect(signIn(db)).rejects.toMatchObject({ code: "invalid_credentials" });
  });

  it("rejects an invalid code before any student lookup", async () => {
    const db = createMockDb({ selectSequence: [[]] });
    await expect(signIn(db)).rejects.toMatchObject({ code: "invalid_code" });
    expect(db.select).toHaveBeenCalledOnce();
  });
});

describe("signInWithCodeOnly", () => {
  const run = (db: ReturnType<typeof createMockDb>) =>
    signInWithCodeOnly({ db: asDb(db), store: makeStore(), meta, input: { code: "ABCDEF", studentId: "cred-1" }, now: NOW });

  it("gives a code_only session when the class turned the picture password off", async () => {
    const db = createMockDb({ selectSequence: [[session], [{ picturePasswordEnabled: false }], [credRow()]] });
    const out = await run(db);
    expect(out.authStrength).toBe("code_only");
    expect(createSession).toHaveBeenCalledWith(expect.anything(), "stu-1", expect.objectContaining({ authStrength: "code_only" }));
  });

  it("refuses while the picture password is on", async () => {
    const db = createMockDb({ selectSequence: [[session], [{ picturePasswordEnabled: true }], [credRow()]] });
    await expect(run(db)).rejects.toMatchObject({ code: "forbidden" });
    expect(createSession).not.toHaveBeenCalled();
  });

  it("rejects a handle outside the class", async () => {
    const db = createMockDb({ selectSequence: [[session], [{ picturePasswordEnabled: false }], []] });
    await expect(run(db)).rejects.toMatchObject({ code: "invalid_credentials" });
  });
});

describe("assignPicturePasswords", () => {
  it("hashes a random sequence for each student without one and returns it once", async () => {
    // select order: classroom, missing credentials (none), students without a picture hash
    const db = createMockDb({ selectSequence: [[classRow], [], [{ credentialId: "c1", userId: "u1", name: "Ann" }, { credentialId: "c2", userId: "u2", name: "Bo" }]] });
    const out = await assignPicturePasswords({ db: asDb(db), user: teacher, meta, input: { classroomId: CLASS_ID } });
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ credentialId: "c1", userId: "u1", name: "Ann" });
    expect(out[0]!.pictures).toHaveLength(3);
    expect(db.update).toHaveBeenCalledTimes(2);
    const set = db.update.mock.results[0]!.value.set.mock.calls[0][0];
    expect(set.pictureHash).toContain("$argon2id$");
    expect(await verifyPictureSequence(out[0]!.pictures, set.pictureHash)).toBe(true);
    expect(JSON.stringify(set)).not.toContain(out[0]!.pictures.join("-"));
  });

  it("rejects a student", async () => {
    const db = createMockDb({ selectSequence: [[classRow]] });
    await expect(assignPicturePasswords({ db: asDb(db), user: student, meta, input: { classroomId: CLASS_ID } })).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("resetPicturePassword", () => {
  it("sets a new sequence, unlocks, and audits", async () => {
    const db = createMockDb({ selectSequence: [[classRow], [{ credentialId: "cred-1" }]] });
    const out = await resetPicturePassword({ db: asDb(db), user: teacher, meta, input: { classroomId: CLASS_ID, studentUserId: "stu-1" } });
    expect(out.pictures).toHaveLength(3);
    const set = db.update.mock.results[0]!.value.set.mock.calls[0][0];
    expect(set).toMatchObject({ failedCount: 0, lockedUntil: null });
    expect(await verifyPictureSequence(out.pictures, set.pictureHash)).toBe(true);
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "t1" }),
      expect.objectContaining({ action: "student_login:reset", targetId: "cred-1" }),
    );
  });

  it("returns not_found for a student who is not in the class", async () => {
    const db = createMockDb({ selectSequence: [[classRow], []] });
    await expect(resetPicturePassword({ db: asDb(db), user: teacher, meta, input: { classroomId: CLASS_ID, studentUserId: "x" } })).rejects.toMatchObject({ code: "not_found" });
    expect(db.update).not.toHaveBeenCalled();
  });

  it("rejects a teacher who is not on the class", async () => {
    const db = createMockDb({ selectSequence: [[{ ...classRow, teacherId: "other" }], []] });
    await expect(resetPicturePassword({ db: asDb(db), user: teacher, meta, input: { classroomId: CLASS_ID, studentUserId: "stu-1" } })).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("setPicturePasswordEnabled", () => {
  it("stores the setting and audits it", async () => {
    const db = createMockDb({ selectSequence: [[classRow]] });
    await setPicturePasswordEnabled({ db: asDb(db), user: teacher, meta, input: { classroomId: CLASS_ID, enabled: false } });
    expect(db.update.mock.results[0]!.value.set).toHaveBeenCalledWith(expect.objectContaining({ picturePasswordEnabled: false }));
    expect(recordAuditEvent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: "student_login:picture_setting", metadata: { enabled: false } }));
  });

  it("rejects a student", async () => {
    const db = createMockDb({ selectSequence: [[classRow]] });
    await expect(setPicturePasswordEnabled({ db: asDb(db), user: student, meta, input: { classroomId: CLASS_ID, enabled: false } })).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("getClassLockouts", () => {
  it("lists locked students of the class for the teacher", async () => {
    const lockedUntil = new Date(NOW.getTime() + 1000);
    const db = createMockDb({ selectSequence: [[classRow], [{ userId: "u1", name: "Ann", lockedUntil, failedCount: 0 }]] });
    const out = await getClassLockouts({ db: asDb(db), user: teacher, input: { classroomId: CLASS_ID }, now: NOW });
    expect(out).toEqual([{ userId: "u1", name: "Ann", lockedUntil }]);
  });

  it("rejects a student", async () => {
    const db = createMockDb({ selectSequence: [[classRow]] });
    await expect(getClassLockouts({ db: asDb(db), user: student, input: { classroomId: CLASS_ID } })).rejects.toMatchObject({ code: "forbidden" });
  });
});
