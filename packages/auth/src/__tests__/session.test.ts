import { describe, it, expect, vi } from "vitest";
import { createSession, validateSession, deleteSession } from "../session.js";

vi.mock("@reading-advantage/db/schema", () => ({
  sessions: {
    id: "id",
    token: "token",
    userId: "user_id",
    expiresAt: "expires_at",
  },
  users: {
    id: "id",
    username: "username",
    name: "name",
    role: "role",
    schoolId: "school_id",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val, type: "eq" })),
}));

const mockSessionRow = {
  id: "s1",
  token: "abc123token",
  userId: "u1",
  expiresAt: new Date(Date.now() + 86400000),
};

const mockUserRow = {
  id: "u1",
  username: "testuser",
  name: "Test",
  role: "STUDENT",
  schoolId: "s1",
};

function createMockDb(overrides: {
  insertReturning?: unknown[];
  selectResults?: unknown[];
} = {}) {
  const resolvedSelect = overrides.selectResults ?? [];

  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(overrides.insertReturning ?? [mockSessionRow]),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(resolvedSelect),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  };

  return mockDb;
}

type SessionDb = Parameters<typeof createSession>[0];

function asSessionDb(db: ReturnType<typeof createMockDb>): SessionDb {
  return db as unknown as SessionDb;
}

describe("createSession", () => {
  it("creates a session and returns it with user", async () => {
    const db = createMockDb({
      insertReturning: [mockSessionRow],
      selectResults: [mockUserRow],
    });

    const session = await createSession(asSessionDb(db), "u1");

    expect(session.id).toBe("s1");
    expect(session.token).toBeDefined();
    expect(typeof session.token).toBe("string");
    expect(session.userId).toBe("u1");
    expect(session.user.id).toBe("u1");
    expect(session.user.username).toBe("testuser");
    expect(session.user.role).toBe("STUDENT");
    expect(session.user.schoolId).toBe("s1");
    expect(session.expiresAt).toBeInstanceOf(Date);
  });

  it("throws when user not found after session creation", async () => {
    const db = createMockDb({
      insertReturning: [mockSessionRow],
      selectResults: [],
    });

    await expect(createSession(asSessionDb(db), "u1")).rejects.toThrow(
      /User not found/
    );
  });
});

describe("validateSession", () => {
  it("returns session when token is valid", async () => {
    const db = createMockDb({
      selectResults: [mockSessionRow],
    });

    // Override select to return user on second call
    let callCount = 0;
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount <= 1) return Promise.resolve([mockSessionRow]);
            return Promise.resolve([mockUserRow]);
          }),
        }),
      }),
    });

    const session = await validateSession(asSessionDb(db), "abc123token");

    expect(session).not.toBeNull();
    expect(session!.id).toBe("s1");
    expect(session!.user.username).toBe("testuser");
  });

  it("returns null when token not found", async () => {
    const db = createMockDb({ selectResults: [] });

    const session = await validateSession(asSessionDb(db), "bad-token");

    expect(session).toBeNull();
  });

  it("returns null and deletes expired session", async () => {
    const expiredSession = {
      ...mockSessionRow,
      expiresAt: new Date(Date.now() - 86400000),
    };

    const db = createMockDb({ selectResults: [expiredSession] });

    const session = await validateSession(asSessionDb(db), "expired-token");

    expect(session).toBeNull();
    expect(db.delete).toHaveBeenCalled();
  });

  it("returns null when user no longer exists", async () => {
    const db = createMockDb();

    let callCount = 0;
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount <= 1) return Promise.resolve([mockSessionRow]);
            return Promise.resolve([]);
          }),
        }),
      }),
    });

    const session = await validateSession(asSessionDb(db), "valid-token");

    expect(session).toBeNull();
  });
});

describe("deleteSession", () => {
  it("deletes session by token", async () => {
    const db = createMockDb();

    await deleteSession(asSessionDb(db), "some-token");

    expect(db.delete).toHaveBeenCalled();
  });

  it("does not throw when delete fails", async () => {
    const db = createMockDb();
    db.delete.mockReturnValue({
      where: vi.fn().mockRejectedValue(new Error("DB error")),
    });

    await expect(deleteSession(asSessionDb(db), "some-token")).resolves
      .toBeUndefined();
  });
});
