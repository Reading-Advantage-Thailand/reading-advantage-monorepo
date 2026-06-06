import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportSubjectData, DSAR_ROW_CEILING, type SubjectRef } from "../audit/dsar.js";
import { AuthError } from "@reading-advantage/auth";

vi.mock("@reading-advantage/db", () => ({
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
  users: {
    id: "id",
    username: "username",
    name: "name",
    email: "email",
    role: "role",
    schoolId: "school_id",
    createdAt: "created_at",
  },
}));

function createMockQueryBuilder(resolvedValue: unknown) {
  return {
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    then(
      onFulfilled?: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) {
      return Promise.resolve(resolvedValue).then(onFulfilled, onRejected);
    },
  };
}

function createMockDb(opts: {
  selectResults?: unknown[];
  selectSequence?: unknown[][];
} = {}) {
  let selectCallIndex = 0;
  const getResolvedValue = () => {
    if (opts.selectSequence && opts.selectSequence.length > 0) {
      const result = opts.selectSequence[selectCallIndex % opts.selectSequence.length];
      selectCallIndex++;
      return result;
    }
    return opts.selectResults ?? [];
  };

  return {
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockReturnValue(createMockQueryBuilder(getResolvedValue())),
    })),
  };
}

const adminUser = {
  id: "admin-1",
  username: "admin",
  name: "Admin User",
  role: "ADMIN" as const,
  schoolId: "school-1",
  xp: 0,
  level: 1,
  cefrLevel: "C2",
};

const studentUser = {
  id: "student-1",
  username: "student",
  name: "Student User",
  role: "STUDENT" as const,
  schoolId: "school-1",
  xp: 0,
  level: 1,
  cefrLevel: "A1",
};

const tenant = { schoolId: "school-1" };

describe("exportSubjectData", () => {
  it("throws AuthError when user lacks dsar:export permission", async () => {
    const db = createMockDb();
    await expect(
      exportSubjectData({
        db: db as never,
        user: studentUser,
        tenant,
        subjectRef: { userId: "u1" },
      })
    ).rejects.toThrow(AuthError);
  });

  it("allows ADMIN to export", async () => {
    const profile = {
      id: "u1",
      username: "user1",
      name: "User One",
      email: "u1@example.com",
      role: "STUDENT",
      schoolId: "school-1",
      createdAt: new Date(),
    };
    const db = createMockDb({
      selectSequence: [[profile], []],
    });

    const result = await exportSubjectData({
      db: db as never,
      user: adminUser,
      tenant,
      subjectRef: { userId: "u1" },
    });

    expect(result.status).toBe("ok");
    expect(result.profile).toEqual(profile);
    expect(result.auditEvents).toEqual([]);
  });

  it("allows SYSTEM to export", async () => {
    const profile = {
      id: "u1",
      username: "user1",
      name: "User One",
      email: "u1@example.com",
      role: "STUDENT",
      schoolId: "school-1",
      createdAt: new Date(),
    };
    const db = createMockDb({
      selectSequence: [[profile], []],
    });

    const systemUser = { ...adminUser, role: "SYSTEM" as const };
    const result = await exportSubjectData({
      db: db as never,
      user: systemUser,
      tenant,
      subjectRef: { email: "u1@example.com" },
    });

    expect(result.status).toBe("ok");
    expect(result.profile).toEqual(profile);
  });

  it("returns empty bundle when subject not found", async () => {
    const db = createMockDb({ selectResults: [] });

    const result = await exportSubjectData({
      db: db as never,
      user: adminUser,
      tenant,
      subjectRef: { userId: "nonexistent" },
    });

    expect(result.status).toBe("ok");
    expect(result.profile).toBeNull();
    expect(result.auditEvents).toEqual([]);
    expect(result.totalRows).toBe(0);
  });

  it("respects DSAR_ROW_CEILING and returns tooLarge", async () => {
    const profile = {
      id: "u1",
      username: "user1",
      name: "User One",
      email: "u1@example.com",
      role: "STUDENT",
      schoolId: "school-1",
      createdAt: new Date(),
    };

    // Create more audit events than the ceiling
    const manyEvents = Array.from({ length: DSAR_ROW_CEILING + 10 }, (_, i) => ({
      id: `evt-${i}`,
      actorUserId: "u1",
      action: "test",
      targetType: "user",
      targetId: "u1",
      metadata: null,
      createdAt: new Date(),
    }));

    const db = createMockDb({
      selectSequence: [[profile], manyEvents],
    });

    const result = await exportSubjectData({
      db: db as never,
      user: adminUser,
      tenant,
      subjectRef: { userId: "u1" },
    });

    expect(result.status).toBe("tooLarge");
    expect(result.totalRows).toBeGreaterThan(DSAR_ROW_CEILING);
  });

  it("returns audit events with correct shape", async () => {
    const profile = {
      id: "u1",
      username: "user1",
      name: "User One",
      email: "u1@example.com",
      role: "STUDENT",
      schoolId: "school-1",
      createdAt: new Date(),
    };
    const events = [
      {
        id: "evt-1",
        actorUserId: "u1",
        action: "login",
        targetType: "user",
        targetId: "u1",
        metadata: { sessionId: "s1" },
        createdAt: new Date("2026-01-01"),
      },
    ];

    const db = createMockDb({
      selectSequence: [[profile], events],
    });

    const result = await exportSubjectData({
      db: db as never,
      user: adminUser,
      tenant,
      subjectRef: { userId: "u1" },
    });

    expect(result.status).toBe("ok");
    expect(result.profile).toEqual(profile);
    expect(result.auditEvents).toHaveLength(1);
    expect(result.auditEvents[0]).toMatchObject({
      id: "evt-1",
      action: "login",
      targetType: "user",
    });
    expect(result.totalRows).toBe(1);
  });

  it("DSAR_ROW_CEILING is a positive number", () => {
    expect(DSAR_ROW_CEILING).toBeGreaterThan(0);
  });
});
