import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DB } from "@reading-advantage/db";
import { createMockDb } from "./mock-db.js";
import { makeStore } from "./student-login-helpers.js";
import { generateCardToken, hashCardToken } from "../student-login/codes.js";
import { qrTokenSignInInput, QR_TOKEN_LENGTH } from "../student-login/contracts.js";
import { guardCardScan, recordCardMiss, STUDENT_LOGIN_LIMITS } from "../student-login/rate-limits.js";
import { issueClassCardTokens, rotateCardToken, signInWithCardToken } from "../student-login/card-token.js";

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
const NOW = new Date("2026-10-05T01:00:00Z");
const asDb = (db: ReturnType<typeof createMockDb>) => db as unknown as DB;

beforeEach(() => {
  recordAuditEvent.mockReset();
  recordAuditEvent.mockResolvedValue(undefined);
  createSession.mockReset();
  createSession.mockImplementation(async (_db, userId, opts) => ({
    token: "tok", expiresAt: new Date(NOW.getTime() + 1000), authStrength: opts?.authStrength ?? "full", user: { id: userId, role: "STUDENT" },
  }));
});

describe("card tokens", () => {
  it("makes a 256-bit base64url token that the contract accepts", () => {
    const token = generateCardToken();
    expect(token).toHaveLength(QR_TOKEN_LENGTH);
    expect(qrTokenSignInInput.safeParse({ token }).success).toBe(true);
    expect(generateCardToken()).not.toBe(token);
  });
  it("hashes with SHA-256 and never returns the token", () => {
    const token = generateCardToken();
    expect(hashCardToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashCardToken(token)).not.toContain(token);
  });
});

describe("card scan rate limit", () => {
  it("blocks an IP after its failed scans and leaves other IPs and successes alone", async () => {
    const store = makeStore();
    const max = STUDENT_LOGIN_LIMITS.cardMiss.maxAttempts;
    for (let i = 0; i < max; i++) {
      await guardCardScan(store, "1.1.1.1");
      await recordCardMiss(store, "1.1.1.1");
    }
    await expect(guardCardScan(store, "1.1.1.1")).rejects.toMatchObject({ code: "rate_limited" });
    await expect(guardCardScan(store, "2.2.2.2")).resolves.toBeUndefined();
  });
  it("does not count a guard call alone", async () => {
    const store = makeStore();
    for (let i = 0; i < 100; i++) await guardCardScan(store, "1.1.1.1");
    await expect(guardCardScan(store, "1.1.1.1")).resolves.toBeUndefined();
  });
});

describe("signInWithCardToken", () => {
  const input = () => ({ token: generateCardToken() });
  const run = (db: ReturnType<typeof createMockDb>, store = makeStore(), i = input()) =>
    signInWithCardToken({ db: asDb(db), store, meta, input: i, now: NOW });

  it("signs in a student with a full session and the student session policy", async () => {
    const db = createMockDb({ selectSequence: [[{ userId: "stu-1", credentialId: "c1", schoolId: SCHOOL }]] });
    const out = await run(db);
    expect(out).toMatchObject({ user: { id: "stu-1", role: "STUDENT" }, authStrength: "full", token: "tok" });
    expect(createSession).toHaveBeenCalledWith(
      expect.anything(),
      "stu-1",
      expect.objectContaining({ authStrength: "full", idleTimeoutSeconds: 1800, singleDevice: true, expiresAt: new Date("2026-10-05T10:00:00Z") }),
    );
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "stu-1" }),
      expect.objectContaining({ action: "auth:login", metadata: expect.objectContaining({ method: "qr", authStrength: "full" }) }),
    );
  });

  it("rejects an unknown, rotated, or out-of-class token with one generic error and counts a miss", async () => {
    const store = makeStore();
    const db = createMockDb({ selectSequence: [[]] });
    await expect(run(db, store)).rejects.toMatchObject({ code: "invalid_credentials" });
    expect(createSession).not.toHaveBeenCalled();
    expect([...store.map.keys()].some((k) => k.includes("student-card-miss"))).toBe(true);
  });

  it("stops after too many failed scans from one IP", async () => {
    const store = makeStore();
    const db = createMockDb({ selectSequence: [[]] });
    for (let i = 0; i < STUDENT_LOGIN_LIMITS.cardMiss.maxAttempts; i++) {
      await expect(run(db, store)).rejects.toMatchObject({ code: "invalid_credentials" });
    }
    await expect(run(db, store)).rejects.toMatchObject({ code: "rate_limited" });
  });
});

describe("rotateCardToken", () => {
  const rotate = (db: ReturnType<typeof createMockDb>, user = teacher) =>
    rotateCardToken({ db: asDb(db), user, meta, input: { classroomId: CLASS_ID, studentUserId: "stu-1" } });

  it("overwrites the stored hash, returns the new token once, and audits", async () => {
    const db = createMockDb({ selectSequence: [[classRow], [], [{ credentialId: "cred-1" }]] });
    const out = await rotate(db);
    expect(db.delete).toHaveBeenCalledOnce(); // active sessions of the student end at once
    expect(out.credentialId).toBe("cred-1");
    expect(out.token).toHaveLength(QR_TOKEN_LENGTH);
    const set = db.update.mock.results[0]!.value.set.mock.calls[0][0];
    expect(set.cardTokenHash).toBe(hashCardToken(out.token));
    expect(set.rotatedAt).toBeInstanceOf(Date);
    expect(JSON.stringify(set)).not.toContain(out.token);
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "t1" }),
      expect.objectContaining({ action: "student_login:card_rotate", targetId: "cred-1" }),
    );
    expect(JSON.stringify(recordAuditEvent.mock.calls)).not.toContain(out.token);
  });

  it("returns not_found for a student who is not in the class", async () => {
    const db = createMockDb({ selectSequence: [[classRow], [], []] });
    await expect(rotate(db)).rejects.toMatchObject({ code: "not_found" });
    expect(db.update).not.toHaveBeenCalled();
  });

  it("rejects a teacher who is not on the class and a student", async () => {
    await expect(rotate(createMockDb({ selectSequence: [[{ ...classRow, teacherId: "other" }], []] }))).rejects.toMatchObject({ code: "forbidden" });
    await expect(rotate(createMockDb({ selectSequence: [[classRow]] }), student)).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("issueClassCardTokens", () => {
  it("gives a token to each student that has none and audits once", async () => {
    const db = createMockDb({
      selectSequence: [
        [classRow],
        [],
        [{ credentialId: "c1", userId: "u1", name: "Ann" }, { credentialId: "c2", userId: "u2", name: "Bo" }],
      ],
      updateReturning: [{ id: "x" }],
    });
    const out = await issueClassCardTokens({ db: asDb(db), user: teacher, meta, input: { classroomId: CLASS_ID } });
    expect(out.map((o) => o.credentialId)).toEqual(["c1", "c2"]);
    expect(new Set(out.map((o) => o.token)).size).toBe(2);
    expect(db.update).toHaveBeenCalledTimes(2);
    expect(recordAuditEvent).toHaveBeenCalledTimes(1);
    expect(recordAuditEvent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: "student_login:card_issue", metadata: { count: 2 } }));
  });

  it("returns only the tokens that were stored when a parallel call took the row first", async () => {
    const db = createMockDb({
      selectSequence: [[classRow], [], [{ credentialId: "c1", userId: "u1", name: "Ann" }]],
      updateReturning: [],
    });
    const out = await issueClassCardTokens({ db: asDb(db), user: teacher, meta, input: { classroomId: CLASS_ID } });
    expect(out).toEqual([]);
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });
});
