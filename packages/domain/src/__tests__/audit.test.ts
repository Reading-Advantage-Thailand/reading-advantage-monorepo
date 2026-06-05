import { describe, it, expect } from "vitest";
import { queryAuditEvents } from "../audit/index.js";
import { createMockDb } from "./mock-db.js";

const admin = {
  id: "a1",
  username: "admin1",
  name: "Admin",
  role: "ADMIN" as const,
  schoolId: "s1",
};
const student = {
  id: "st1",
  username: "student1",
  name: "Student",
  role: "STUDENT" as const,
  schoolId: "s1",
};
const tenant = { schoolId: "s1" };

describe("queryAuditEvents", () => {
  it("returns audit events for admin", async () => {
    const events = [
      {
        id: "e1",
        actorUserId: "u1",
        actorRole: "STUDENT",
        action: "login",
        targetType: "user",
        targetId: "u1",
        ipAddress: "127.0.0.1",
        userAgent: "test",
        metadata: {},
        createdAt: new Date(),
      },
    ];
    const db = createMockDb({ selectResults: events });

    const result = await queryAuditEvents({
      db: db as never,
      user: admin,
      tenant,
      input: {},
    });

    expect(result.events).toEqual(events);
    expect(result.nextCursor).toBeUndefined();
    expect(db.select).toHaveBeenCalledOnce();
  });

  it("returns nextCursor when more results exist", async () => {
    const events = Array.from({ length: 51 }, (_, i) => ({
      id: `e${i}`,
      actorUserId: "u1",
      actorRole: "STUDENT",
      action: "login",
      targetType: "user",
      targetId: "u1",
      ipAddress: null,
      userAgent: null,
      metadata: {},
      createdAt: new Date(),
    }));
    const db = createMockDb({ selectResults: events });

    const result = await queryAuditEvents({
      db: db as never,
      user: admin,
      tenant,
      input: { limit: 50 },
    });

    expect(result.events).toHaveLength(50);
    expect(result.nextCursor).toBe("e49");
  });

  it("throws AuthError when student tries to query", async () => {
    const db = createMockDb();

    await expect(
      queryAuditEvents({
        db: db as never,
        user: student,
        tenant,
        input: {},
      })
    ).rejects.toThrow(/STUDENT.*audit:read:all/);
  });

  it("throws AuthError when teacher tries to query", async () => {
    const teacher = {
      id: "t1",
      username: "teacher1",
      name: "Teacher",
      role: "TEACHER" as const,
      schoolId: "s1",
    };
    const db = createMockDb();

    await expect(
      queryAuditEvents({
        db: db as never,
        user: teacher,
        tenant,
        input: {},
      })
    ).rejects.toThrow(/TEACHER.*audit:read:all/);
  });
});
