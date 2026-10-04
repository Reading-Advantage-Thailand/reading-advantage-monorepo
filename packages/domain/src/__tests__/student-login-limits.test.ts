import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateClassCode,
  hashClassCode,
  generatePictureSequence,
  hashPictureSequence,
  verifyPictureSequence,
} from "../student-login/codes.js";
import { CLASS_CODE_ALPHABET, CLASS_CODE_LENGTH, classSessionStartOutput } from "../student-login/contracts.js";
import {
  STUDENT_LOGIN_LIMITS,
  guardClassAttempt,
  guardCodeEntry,
  recordCardMiss,
  recordCodeMiss,
} from "../student-login/rate-limits.js";
import { StudentLoginError } from "../student-login/errors.js";
import { auditStudentLogin } from "../student-login/audit.js";
import { resetLimit, configureRateLimiter } from "@reading-advantage/auth";
import { makeStore } from "./student-login-helpers.js";

const recordAuditEvent = vi.hoisted(() => vi.fn());
vi.mock("@reading-advantage/auth", async (orig) => ({
  ...(await orig<typeof import("@reading-advantage/auth")>()),
  recordAuditEvent,
}));

describe("class codes", () => {
  it("uses only the alphabet and the fixed length", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateClassCode();
      expect(code).toHaveLength(CLASS_CODE_LENGTH);
      expect([...code].every((c) => CLASS_CODE_ALPHABET.includes(c))).toBe(true);
      expect(classSessionStartOutput.shape.code.safeParse(code).success).toBe(true);
    }
  });

  it("is deterministic with an injected picker and hashes with SHA-256", () => {
    expect(generateClassCode(() => 0)).toBe("AAAAAA");
    expect(hashClassCode("AAAAAA")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashClassCode("AAAAAA")).not.toBe(hashClassCode("AAAAAB"));
  });
});

describe("picture sequences", () => {
  it("makes 3 indexes below 12 and verifies through argon2id", async () => {
    const seq = generatePictureSequence();
    expect(seq).toHaveLength(3);
    expect(seq.every((n) => Number.isInteger(n) && n >= 0 && n < 12)).toBe(true);
    const hash = await hashPictureSequence([1, 2, 3]);
    expect(hash).toContain("$argon2id$");
    expect(await verifyPictureSequence([1, 2, 3], hash)).toBe(true);
    expect(await verifyPictureSequence([3, 2, 1], hash)).toBe(false);
  });
});

describe("rate limits", () => {
  it("blocks the IP bucket after its maximum", async () => {
    const store = makeStore();
    for (let i = 0; i < STUDENT_LOGIN_LIMITS.ip.maxAttempts; i++) await guardCodeEntry(store, "1.1.1.1");
    await expect(guardCodeEntry(store, "1.1.1.1")).rejects.toMatchObject({ code: "rate_limited" });
    await expect(guardCodeEntry(store, "2.2.2.2")).resolves.toBeUndefined();
  });

  it("blocks every IP once the global failed-lookup bucket is full", async () => {
    const store = makeStore();
    for (let i = 0; i < STUDENT_LOGIN_LIMITS.globalMiss.maxAttempts; i++) await recordCodeMiss(store);
    await expect(guardCodeEntry(store, "3.3.3.3")).rejects.toBeInstanceOf(StudentLoginError);
  });

  it("charges the class bucket per class", async () => {
    const store = makeStore();
    for (let i = 0; i < STUDENT_LOGIN_LIMITS.classroom.maxAttempts; i++) await guardClassAttempt(store, "c1");
    await expect(guardClassAttempt(store, "c1")).rejects.toMatchObject({ code: "rate_limited" });
    await expect(guardClassAttempt(store, "c2")).resolves.toBeUndefined();
  });

  it("uses key namespaces that normal login cannot build or reset", async () => {
    const store = makeStore();
    await guardCodeEntry(store, "1.1.1.1");
    await recordCodeMiss(store);
    await guardClassAttempt(store, "c1");
    await recordCardMiss(store, "1.1.1.1");
    const keys = [...store.map.keys()];
    expect(keys).toHaveLength(4);
    for (const key of keys) expect(key).not.toMatch(/^(ip|username):/);
    // A successful password login resets the `ip` and `username` buckets only.
    configureRateLimiter({ store });
    await resetLimit("1.1.1.1", "1.1.1.1");
    expect(keys.every((k) => store.map.has(k))).toBe(true);
  });

  it("sets retryAfterSeconds on a block", async () => {
    const store = makeStore();
    for (let i = 0; i < STUDENT_LOGIN_LIMITS.classroom.maxAttempts + 1; i++) {
      await guardClassAttempt(store, "c1").catch(() => undefined);
    }
    const err = await guardClassAttempt(store, "c1").catch((e) => e);
    expect(err.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe("audit helper", () => {
  beforeEach(() => {
    recordAuditEvent.mockReset();
  });

  it("writes the action with actor and target", async () => {
    recordAuditEvent.mockResolvedValue(undefined);
    await auditStudentLogin(
      { userId: "t1", role: "TEACHER", ip: "1.1.1.1", userAgent: "ua" },
      "student_login:class_start",
      { type: "classroom", id: "c1" },
      { sessionId: "s1" },
    );
    expect(recordAuditEvent).toHaveBeenCalledWith(
      { actorUserId: "t1", actorRole: "TEACHER", ipAddress: "1.1.1.1", userAgent: "ua" },
      { action: "student_login:class_start", targetType: "classroom", targetId: "c1", metadata: { sessionId: "s1" } },
    );
  });

  it("does not throw when the write fails", async () => {
    recordAuditEvent.mockImplementation(async () => {
      throw new Error("db down");
    });
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(
      auditStudentLogin({ userId: null, role: null, ip: null, userAgent: null }, "auth:login", { type: "user", id: "u" }),
    ).resolves.toBeUndefined();
    spy.mockRestore();
  });
});
