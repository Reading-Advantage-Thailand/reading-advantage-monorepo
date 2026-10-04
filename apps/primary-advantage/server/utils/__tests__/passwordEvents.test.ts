// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revokeAllUserSessions: vi.fn().mockResolvedValue({ revoked: 2 }),
  recordAuditEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@reading-advantage/db", () => ({ db: { marker: "db" } }));
vi.mock("@reading-advantage/auth", () => mocks);

import { afterPasswordWrite, auditUserDeleted } from "../passwordEvents";

describe("afterPasswordWrite", () => {
  beforeEach(() => vi.clearAllMocks());

  it("revokes sessions and audits a password change", async () => {
    await afterPasswordWrite({ userId: "u1", actor: { id: "a1", role: "admin" }, created: false });
    expect(mocks.revokeAllUserSessions).toHaveBeenCalledWith({ marker: "db" }, "u1");
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "a1", actorRole: "ADMIN" }),
      expect.objectContaining({ action: "auth:password_reset", targetId: "u1" }),
    );
  });

  it("audits a new account without revoking sessions", async () => {
    await afterPasswordWrite({ userId: "u2", actor: null, created: true });
    expect(mocks.revokeAllUserSessions).not.toHaveBeenCalled();
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: null, actorRole: null }),
      expect.objectContaining({ action: "user:created", targetId: "u2" }),
    );
  });

  it("keeps the audit best-effort when it fails", async () => {
    mocks.recordAuditEvent.mockRejectedValueOnce(new Error("y"));
    await expect(
      afterPasswordWrite({ userId: "u1", actor: null, created: false }),
    ).resolves.toBeUndefined();
  });

  it("surfaces a failed revocation to the caller", async () => {
    mocks.revokeAllUserSessions.mockRejectedValueOnce(new Error("x"));
    await expect(
      afterPasswordWrite({ userId: "u1", actor: null, created: false }),
    ).rejects.toThrow("session revocation failed");
  });

  it("skips revocation when the sessions already ended in the write transaction", async () => {
    await afterPasswordWrite({ userId: "u1", actor: null, created: false, sessionsRevoked: true });
    expect(mocks.revokeAllUserSessions).not.toHaveBeenCalled();
  });
});

describe("auditUserDeleted", () => {
  it("records a user:deleted event and never throws", async () => {
    await auditUserDeleted({ userId: "u9", actor: { id: "a1", role: "admin" } });
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "a1", actorRole: "ADMIN" }),
      expect.objectContaining({ action: "user:deleted", targetId: "u9" }),
    );
    mocks.recordAuditEvent.mockRejectedValueOnce(new Error("y"));
    await expect(auditUserDeleted({ userId: "u9", actor: null })).resolves.toBeUndefined();
  });
});
