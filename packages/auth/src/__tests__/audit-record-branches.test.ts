import { describe, it, expect, vi, beforeEach } from "vitest";

const { values } = vi.hoisted(() => ({ values: vi.fn() }));

vi.mock("@reading-advantage/db", () => ({
  db: { insert: vi.fn(() => ({ values })) },
}));
vi.mock("@reading-advantage/db/schema", () => ({ auditEvents: {} }));

import { AuditEventError, recordAuditEvent, type AuditContext } from "../audit.js";

/** Builds a context with only the actor id, as an untyped caller would send it. */
function ctx(actorUserId: string | null): AuditContext {
  return { actorUserId } as unknown as AuditContext;
}

beforeEach(() => {
  values.mockReset().mockResolvedValue(undefined);
});

describe("recordAuditEvent optional fields and failures", () => {
  it("writes null for every optional context field that is missing", async () => {
    await recordAuditEvent(ctx("u1"), { action: "login" });

    expect(values).toHaveBeenCalledWith({
      actorUserId: "u1",
      actorRole: null,
      action: "login",
      targetType: null,
      targetId: null,
      ipAddress: null,
      userAgent: null,
      metadata: {},
    });
  });

  it("wraps a non-Error rejection as an unknown error and keeps the cause", async () => {
    values.mockRejectedValueOnce("socket closed");

    const error = await recordAuditEvent(ctx(null), { action: "logout" }).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(AuditEventError);
    expect((error as AuditEventError).message).toBe("Failed to record audit event: Unknown error");
    expect((error as AuditEventError).name).toBe("AuditEventError");
    expect((error as AuditEventError).cause).toBe("socket closed");
  });

  it("puts the database error message in the wrapped error", async () => {
    const dbError = new Error("connection refused");
    values.mockRejectedValueOnce(dbError);

    const error = await recordAuditEvent(ctx(null), { action: "login" }).catch(
      (e: unknown) => e,
    );

    expect((error as AuditEventError).message).toBe(
      "Failed to record audit event: connection refused",
    );
    expect((error as AuditEventError).cause).toBe(dbError);
  });

  it("does not write when the action is whitespace only", async () => {
    await expect(recordAuditEvent(ctx(null), { action: "\t\n" })).rejects.toThrow(
      "audit action is required",
    );
    expect(values).not.toHaveBeenCalled();
  });
});
