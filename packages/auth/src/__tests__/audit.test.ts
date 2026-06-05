import { describe, it, expect, vi, beforeEach } from "vitest";
import { recordAuditEvent, safeMetadata, AuditEventError } from "../audit.js";

vi.mock("@reading-advantage/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

vi.mock("@reading-advantage/db/schema", () => ({
  auditEvents: {
    id: "id",
    actorUserId: "actor_user_id",
    actorRole: "actor_role",
    action: "action",
    targetType: "target_type",
    targetId: "target_id",
    ipAddress: "ip_address",
    userAgent: "user_agent",
    metadata: "metadata",
    createdAt: "created_at",
  },
}));

const mockCtx = {
  actorUserId: "u1",
  actorRole: "STUDENT" as const,
  ipAddress: "127.0.0.1",
  userAgent: "test-agent",
};

describe("safeMetadata", () => {
  it("returns empty object for undefined input", () => {
    expect(safeMetadata(undefined)).toEqual({});
  });

  it("passes through non-PII keys", () => {
    const result = safeMetadata({ lessonId: "l1", dueAt: "2026-01-01" });
    expect(result).toEqual({ lessonId: "l1", dueAt: "2026-01-01" });
  });

  it("redacts password", () => {
    const result = safeMetadata({ password: "plaintext", username: "user1" });
    expect(result.password).toBe("[REDACTED]");
    expect(result.username).toBe("user1");
  });

  it("redacts all known PII keys", () => {
    const piiKeys = [
      "password", "passwd", "secret", "token", "apiKey", "api_key",
      "accessToken", "access_token", "refreshToken", "refresh_token",
      "email", "phone", "ssn", "creditCard", "credit_card", "cvv",
    ];
    const input: Record<string, unknown> = {};
    for (const key of piiKeys) {
      input[key] = "sensitive";
    }
    input.safe = "ok";

    const result = safeMetadata(input);
    for (const key of piiKeys) {
      expect(result[key]).toBe("[REDACTED]");
    }
    expect(result.safe).toBe("ok");
  });

  it("preserves nested objects (only top-level keys are checked)", () => {
    const result = safeMetadata({
      metadata: { password: "still here" },
      safe: true,
    });
    expect(result.metadata).toEqual({ password: "still here" });
    expect(result.safe).toBe(true);
  });
});

describe("recordAuditEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts an audit event row", async () => {
    const { db } = await import("@reading-advantage/db");

    await recordAuditEvent(mockCtx, {
      action: "login",
      targetType: "user",
      targetId: "u1",
    });

    expect(db.insert).toHaveBeenCalled();
    expect(db.insert({} as never).values).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "u1",
        actorRole: "STUDENT",
        action: "login",
        targetType: "user",
        targetId: "u1",
        ipAddress: "127.0.0.1",
        userAgent: "test-agent",
      })
    );
  });

  it("defaults metadata to empty object when not provided", async () => {
    const { db } = await import("@reading-advantage/db");

    await recordAuditEvent(mockCtx, { action: "logout" });

    expect(db.insert({} as never).values).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {},
        targetType: null,
        targetId: null,
      })
    );
  });

  it("redacts PII from metadata", async () => {
    const { db } = await import("@reading-advantage/db");

    await recordAuditEvent(mockCtx, {
      action: "login",
      metadata: { sessionId: "s1", password: "secret123" },
    });

    expect(db.insert({} as never).values).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { sessionId: "s1", password: "[REDACTED]" },
      })
    );
  });

  it("throws AuditEventError when action is empty", async () => {
    await expect(
      recordAuditEvent(mockCtx, { action: "" })
    ).rejects.toThrow(AuditEventError);

    await expect(
      recordAuditEvent(mockCtx, { action: "  " })
    ).rejects.toThrow(/audit action is required/);
  });

  it("throws AuditEventError when DB insert fails", async () => {
    const { db } = await import("@reading-advantage/db");
    vi.mocked(db.insert({} as never).values).mockRejectedValueOnce(
      new Error("connection refused")
    );

    await expect(
      recordAuditEvent(mockCtx, { action: "login" })
    ).rejects.toThrow(AuditEventError);
  });

  it("handles null actorUserId (system actions)", async () => {
    const { db } = await import("@reading-advantage/db");

    await recordAuditEvent(
      { ...mockCtx, actorUserId: null },
      { action: "system:cleanup" }
    );

    expect(db.insert({} as never).values).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: null,
        action: "system:cleanup",
      })
    );
  });
});
