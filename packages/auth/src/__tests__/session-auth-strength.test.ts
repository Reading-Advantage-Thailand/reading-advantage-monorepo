import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSession, validateSession, deleteSession } from "../session.js";

vi.mock("@reading-advantage/db", () => ({
  count: vi.fn(() => ({ type: "count" })),
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val, type: "eq" })),
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  gt: vi.fn((col: unknown, val: unknown) => ({ col, val, type: "gt" })),
  inArray: vi.fn((col: unknown, val: unknown) => ({ col, val, type: "inArray" })),
}));

vi.mock("@reading-advantage/db/schema", () => ({
  sessions: {
    id: "id",
    token: "token",
    tokenHash: "token_hash",
    userId: "user_id",
    expiresAt: "expires_at",
    createdAt: "created_at",
    ipAddress: "ip_address",
    userAgent: "user_agent",
    authStrength: "auth_strength",
  },
  users: {
    id: "id",
    username: "username",
    name: "name",
    role: "role",
    schoolId: "school_id",
    xp: "xp",
    level: "level",
    cefrLevel: "cefr_level",
  },
}));

vi.mock("drizzle-orm", () => ({
  count: vi.fn(() => ({ type: "count" })),
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val, type: "eq" })),
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  gt: vi.fn((col: unknown, val: unknown) => ({ col, val, type: "gt" })),
  inArray: vi.fn((col: unknown, val: unknown) => ({ col, val, type: "inArray" })),
}));

const sessionRow = {
  id: "s1",
  userId: "u1",
  expiresAt: new Date(Date.now() + 86400000),
};
const userRow = { id: "u1", username: "kid", name: "Kid", role: "STUDENT", schoolId: "sc1" };

function makeDb(rows: unknown[]) {
  const values = vi.fn().mockReturnValue({
    returning: vi.fn().mockImplementation(async () => [rows[0]]),
  });
  let n = 0;
  const limit = vi.fn().mockImplementation(async () => (n++ === 0 ? [rows[0]] : [userRow]));
  const db = {
    insert: vi.fn().mockReturnValue({ values }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          for: vi.fn().mockResolvedValue([userRow]),
          limit,
        }),
      }),
    }),
    delete: vi.fn(),
    transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(db)),
  };
  return { db: db as unknown as Parameters<typeof createSession>[0], values };
}

describe("session authStrength", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stores code_only and returns it from createSession", async () => {
    const { db, values } = makeDb([{ ...sessionRow, authStrength: "code_only" }]);
    // createSession selects the count first, then the user; reuse the same mock chain.
    const session = await createSession(db, "u1", { authStrength: "code_only" });
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ authStrength: "code_only" }));
    expect(session.authStrength).toBe("code_only");
  });

  it("does not store a value and returns full by default", async () => {
    const { db, values } = makeDb([{ ...sessionRow, authStrength: null }]);
    const session = await createSession(db, "u1");
    expect(values.mock.calls[0]![0]).not.toHaveProperty("authStrength");
    expect(session.authStrength).toBe("full");
  });

  it("validateSession returns code_only from the row", async () => {
    const { db } = makeDb([{ ...sessionRow, authStrength: "code_only" }]);
    expect((await validateSession(db, "t"))?.authStrength).toBe("code_only");
  });

  it("validateSession treats NULL as full", async () => {
    const { db } = makeDb([{ ...sessionRow, authStrength: null }]);
    expect((await validateSession(db, "t"))?.authStrength).toBe("full");
  });

  it("validateSession fails closed: an unknown value is code_only", async () => {
    const { db } = makeDb([{ ...sessionRow, authStrength: "weird" }]);
    expect((await validateSession(db, "t"))?.authStrength).toBe("code_only");
  });
});
