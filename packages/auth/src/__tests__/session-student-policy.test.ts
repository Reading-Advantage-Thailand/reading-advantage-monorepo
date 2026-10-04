import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSession, validateSession } from "../session.js";
import {
  STUDENT_SESSION_IDLE_SECONDS,
  schoolDayEnd,
  studentSessionOptions,
} from "../student-session-policy.js";

vi.mock("@reading-advantage/db", () => ({
  count: vi.fn(() => ({ type: "count" })),
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val, type: "eq" })),
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  gt: vi.fn((col: unknown, val: unknown) => ({ col, val, type: "gt" })),
  inArray: vi.fn((col: unknown, val: unknown) => ({ col, val, type: "inArray" })),
}));
vi.mock("@reading-advantage/db/schema", () => ({
  sessions: { id: "id", tokenHash: "token_hash", userId: "user_id", expiresAt: "expires_at", lastSeenAt: "last_seen_at" },
  users: { id: "id", username: "username", name: "name", role: "role", schoolId: "school_id", xp: "xp", level: "level", cefrLevel: "cefr_level" },
}));
vi.mock("drizzle-orm", () => ({
  count: vi.fn(() => ({ type: "count" })),
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val, type: "eq" })),
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  gt: vi.fn((col: unknown, val: unknown) => ({ col, val, type: "gt" })),
  inArray: vi.fn((col: unknown, val: unknown) => ({ col, val, type: "inArray" })),
}));

const userRow = { id: "u1", username: "kid", name: "Kid", role: "STUDENT", schoolId: "sc1" };

function makeDb(sessionRow: Record<string, unknown>) {
  const values = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([sessionRow]) });
  const deleteWhere = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) });
  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where: updateWhere });
  let n = 0;
  const limit = vi.fn().mockImplementation(async () => (n++ === 0 ? [sessionRow] : [userRow]));
  const db = {
    insert: vi.fn().mockReturnValue({ values }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ for: vi.fn().mockResolvedValue([userRow]), limit }),
      }),
    }),
    delete: vi.fn().mockReturnValue({ where: deleteWhere }),
    update: vi.fn().mockReturnValue({ set }),
    transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(db)),
  };
  return { db: db as never, values, set, deleteWhere };
}

describe("schoolDayEnd (Asia/Bangkok, default 17:00)", () => {
  it("ends the same day when the sign-in is before 17:00 local", () => {
    // 2026-10-05 09:00 Bangkok = 02:00 UTC
    expect(schoolDayEnd(new Date("2026-10-05T02:00:00Z")).toISOString()).toBe("2026-10-05T10:00:00.000Z");
  });
  it("ends the next day when the sign-in is at or after 17:00 local", () => {
    expect(schoolDayEnd(new Date("2026-10-05T10:00:00Z")).toISOString()).toBe("2026-10-06T10:00:00.000Z");
    expect(schoolDayEnd(new Date("2026-10-05T15:00:00Z")).toISOString()).toBe("2026-10-06T10:00:00.000Z");
  });
  it("uses the Bangkok date, not the UTC date, near midnight", () => {
    // 2026-10-05 23:30 UTC = 2026-10-06 06:30 Bangkok -> same Bangkok day 17:00
    expect(schoolDayEnd(new Date("2026-10-05T23:30:00Z")).toISOString()).toBe("2026-10-06T10:00:00.000Z");
  });
});

describe("studentSessionOptions", () => {
  it("sets expiry, idle time, and single device", () => {
    const now = new Date("2026-10-05T02:00:00Z");
    expect(studentSessionOptions(now)).toEqual({
      expiresAt: new Date("2026-10-05T10:00:00Z"),
      idleTimeoutSeconds: STUDENT_SESSION_IDLE_SECONDS,
      singleDevice: true,
    });
    expect(STUDENT_SESSION_IDLE_SECONDS).toBe(1800);
  });
});

describe("createSession with a student policy", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stores expiry, idle time and last seen; ends the other sessions first", async () => {
    const expiresAt = new Date("2026-10-05T10:00:00Z");
    const { db, values, deleteWhere } = makeDb({ id: "s1", userId: "u1", expiresAt });
    const session = await createSession(db, "u1", { expiresAt, idleTimeoutSeconds: 1800, singleDevice: true });
    expect(deleteWhere).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ expiresAt, idleTimeoutSeconds: 1800, lastSeenAt: expect.any(Date) }),
    );
    expect(session.expiresAt).toEqual(expiresAt);
  });

  it("keeps the 7-day default and does not end other sessions without the options", async () => {
    const { db, values, deleteWhere } = makeDb({ id: "s1", userId: "u1", expiresAt: new Date() });
    await createSession(db, "u1");
    expect(deleteWhere).not.toHaveBeenCalled();
    expect(values.mock.calls[0]![0]).not.toHaveProperty("idleTimeoutSeconds");
    expect(values.mock.calls[0]![0]).not.toHaveProperty("lastSeenAt");
  });
});

describe("validateSession idle policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-05T03:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  const base = () => ({
    id: "s1",
    userId: "u1",
    expiresAt: new Date("2026-10-05T10:00:00Z"),
    createdAt: new Date("2026-10-05T02:50:00Z"),
    idleTimeoutSeconds: 1800,
  });

  it("expires and deletes a session idle for more than 30 minutes", async () => {
    const { db, deleteWhere } = makeDb({ ...base(), lastSeenAt: new Date("2026-10-05T02:29:00Z") });
    expect(await validateSession(db, "t")).toBeNull();
    expect(deleteWhere).toHaveBeenCalled();
  });

  it("accepts a session idle for less than 30 minutes", async () => {
    const { db } = makeDb({ ...base(), lastSeenAt: new Date("2026-10-05T02:45:00Z") });
    expect((await validateSession(db, "t"))?.id).toBe("s1");
  });

  it("does not write last seen when the last write is under 60 seconds old", async () => {
    const { db, set } = makeDb({ ...base(), lastSeenAt: new Date("2026-10-05T02:59:30Z") });
    await validateSession(db, "t");
    expect(set).not.toHaveBeenCalled();
  });

  it("writes last seen once the last write is 60 seconds old or more", async () => {
    const { db, set } = makeDb({ ...base(), lastSeenAt: new Date("2026-10-05T02:58:30Z") });
    await validateSession(db, "t");
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ lastSeenAt: new Date("2026-10-05T03:00:00Z") }));
  });

  it("falls back to createdAt when last seen is empty", async () => {
    const { db } = makeDb({ ...base(), createdAt: new Date("2026-10-05T01:00:00Z"), lastSeenAt: null });
    expect(await validateSession(db, "t")).toBeNull();
  });

  it("never checks idle time or writes for a session without the idle option", async () => {
    const { db, set } = makeDb({ id: "s1", userId: "u1", expiresAt: new Date("2026-10-05T10:00:00Z"), idleTimeoutSeconds: null, lastSeenAt: null });
    expect((await validateSession(db, "t"))?.id).toBe("s1");
    expect(set).not.toHaveBeenCalled();
  });

  it("still expires at the end of the school day", async () => {
    vi.setSystemTime(new Date("2026-10-05T10:00:01Z"));
    const { db } = makeDb({ ...base(), lastSeenAt: new Date("2026-10-05T10:00:00Z") });
    expect(await validateSession(db, "t")).toBeNull();
  });
});
