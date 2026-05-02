import { describe, it, expect, vi } from "vitest";
import {
  getSession,
  requireAuth,
  requireRole,
  hasRole,
} from "../server.js";
import type { Session } from "../session.js";
import { AuthError } from "../assert.js";

vi.mock("../session.js", () => ({
  validateSession: vi.fn(),
}));

vi.mock("@reading-advantage/db/schema", () => ({}));

import { validateSession } from "../session.js";

const mockValidateSession = vi.mocked(validateSession);

const mockSession: Session = {
  id: "s1",
  token: "token123",
  userId: "u1",
  expiresAt: new Date(Date.now() + 86400000),
  user: {
    id: "u1",
    username: "testuser",
    name: "Test",
    role: "STUDENT",
    schoolId: "s1",
  },
};

const adminSession: Session = {
  ...mockSession,
  user: { ...mockSession.user, role: "ADMIN" },
};

const systemSession: Session = {
  ...mockSession,
  user: { ...mockSession.user, role: "SYSTEM" },
};

describe("getSession", () => {
  it("returns null when no token provided", async () => {
    const result = await getSession({} as any, undefined);
    expect(result).toBeNull();
  });

  it("returns session when token is valid", async () => {
    mockValidateSession.mockResolvedValueOnce(mockSession);
    const result = await getSession({} as any, "token123");
    expect(result).toEqual(mockSession);
  });

  it("returns null when token is invalid", async () => {
    mockValidateSession.mockResolvedValueOnce(null);
    const result = await getSession({} as any, "bad-token");
    expect(result).toBeNull();
  });
});

describe("requireAuth", () => {
  it("returns session when authenticated", async () => {
    mockValidateSession.mockResolvedValueOnce(mockSession);
    const result = await requireAuth({} as any, "token123");
    expect(result).toEqual(mockSession);
  });

  it("throws UNAUTHORIZED when not authenticated", async () => {
    mockValidateSession.mockResolvedValueOnce(null);
    await expect(requireAuth({} as any, "bad-token")).rejects.toThrow(
      AuthError
    );
    await expect(requireAuth({} as any, "bad-token")).rejects.toThrow(
      "Authentication required"
    );
  });
});

describe("requireRole", () => {
  it("returns session when user has sufficient role", async () => {
    mockValidateSession.mockResolvedValueOnce(adminSession);
    const result = await requireRole({} as any, "token", "TEACHER");
    expect(result.user.role).toBe("ADMIN");
  });

  it("throws FORBIDDEN when user has insufficient role", async () => {
    mockValidateSession.mockResolvedValueOnce(mockSession);
    await expect(requireRole({} as any, "token", "ADMIN")).rejects.toThrow(
      AuthError
    );
  });

  it("throws FORBIDDEN for unauthenticated user", async () => {
    mockValidateSession.mockResolvedValueOnce(null);
    await expect(requireRole({} as any, "bad-token", "STUDENT")).rejects.toThrow(
      AuthError
    );
  });
});

describe("hasRole", () => {
  it("returns true for same role", () => {
    expect(hasRole(mockSession, "STUDENT")).toBe(true);
  });

  it("returns true for higher role", () => {
    expect(hasRole(adminSession, "TEACHER")).toBe(true);
    expect(hasRole(adminSession, "STUDENT")).toBe(true);
  });

  it("returns false for insufficient role", () => {
    expect(hasRole(mockSession, "TEACHER")).toBe(false);
    expect(hasRole(mockSession, "ADMIN")).toBe(false);
  });

  it("SYSTEM has all roles", () => {
    expect(hasRole(systemSession, "STUDENT")).toBe(true);
    expect(hasRole(systemSession, "TEACHER")).toBe(true);
    expect(hasRole(systemSession, "ADMIN")).toBe(true);
    expect(hasRole(systemSession, "SYSTEM")).toBe(true);
  });
});
