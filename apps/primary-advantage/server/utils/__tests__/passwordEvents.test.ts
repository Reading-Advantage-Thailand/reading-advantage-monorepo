// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revokeAllUserSessions: vi.fn().mockResolvedValue({ revoked: 2 }),
  recordAuditEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@reading-advantage/db", () => ({ db: { marker: "db" } }));
vi.mock("@reading-advantage/auth", () => mocks);

import { afterPasswordWrite } from "../passwordEvents";

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

  it("does not throw when revocation or audit fails", async () => {
    mocks.revokeAllUserSessions.mockRejectedValueOnce(new Error("x"));
    mocks.recordAuditEvent.mockRejectedValueOnce(new Error("y"));
    await expect(
      afterPasswordWrite({ userId: "u1", actor: null, created: false }),
    ).resolves.toBeUndefined();
  });
});
