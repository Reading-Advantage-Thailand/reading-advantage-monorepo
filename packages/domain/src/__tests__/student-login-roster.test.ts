import { describe, it, expect } from "vitest";
import type { DB } from "@reading-advantage/db";
import { createMockDb } from "./mock-db.js";
import { classLoginRosterOutput } from "../student-login/contracts.js";
import { getClassLoginRoster } from "../student-login/roster.js";

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const SCHOOL = "22222222-2222-4222-8222-222222222222";
const SESSION_ID = "33333333-3333-4333-8333-333333333333";
const teacher = { id: "t1", username: "t", name: "T", role: "TEACHER" as const, schoolId: SCHOOL, xp: 0, level: 1, cefrLevel: "A1" };
const student = { ...teacher, id: "s1", role: "STUDENT" as const };
const classRow = { id: CLASS_ID, schoolId: SCHOOL, name: "P3A", teacherId: "t1", archived: false, picturePasswordEnabled: true };
const NOW = new Date("2026-10-05T03:00:00Z");
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);
const asDb = (db: ReturnType<typeof createMockDb>) => db as unknown as DB;
const run = (db: ReturnType<typeof createMockDb>, user = teacher) =>
  getClassLoginRoster({ db: asDb(db), user, input: { classroomId: CLASS_ID }, now: NOW });

const rows = [
  { userId: "u2", name: "Bo Jones", username: "p3a2", pictureHash: null, cardTokenHash: "c".repeat(64) },
  { userId: "u1", name: "Ann Smith", username: "p3a1", pictureHash: "$argon2id$x", cardTokenHash: null },
  { userId: "u3", name: null, username: "p3a3", pictureHash: null, cardTokenHash: null },
];

describe("getClassLoginRoster", () => {
  it("returns the class status and each student's sign-in state without any hash", async () => {
    const expiresAt = new Date(NOW.getTime() + 3600_000);
    const sessions = [
      // Ann: active idle-tracked session, seen 2 minutes ago.
      { userId: "u1", createdAt: minutesAgo(20), lastSeenAt: minutesAgo(2), idleTimeoutSeconds: 1800 },
      // Bo: the session is still before its end time but idle for 45 minutes, so Bo is signed out.
      { userId: "u2", createdAt: minutesAgo(50), lastSeenAt: minutesAgo(45), idleTimeoutSeconds: 1800 },
    ];
    const db = createMockDb({ selectSequence: [[classRow], [{ id: SESSION_ID, expiresAt }], rows, sessions] });
    const out = await run(db);

    expect(out.classroomName).toBe("P3A");
    expect(out.picturePasswordEnabled).toBe(true);
    expect(out.openSession).toEqual({ id: SESSION_ID, expiresAt });
    expect(out.students.map((s) => s.name)).toEqual(["Ann Smith", "Bo Jones", "p3a3"]);
    expect(out.students[0]).toEqual({
      userId: "u1", name: "Ann Smith", username: "p3a1", hasPicturePassword: true, hasCardToken: false,
      signedIn: true, lastSeenAt: minutesAgo(2),
    });
    expect(out.students[1]).toMatchObject({ hasPicturePassword: false, hasCardToken: true, signedIn: false, lastSeenAt: minutesAgo(45) });
    expect(out.students[2]).toMatchObject({ signedIn: false, lastSeenAt: null });
    expect(JSON.stringify(out)).not.toMatch(/argon2|cccc/);
    expect(() => classLoginRosterOutput.parse(out)).not.toThrow();
  });

  it("takes the latest time over all sessions and counts a session without an idle limit as signed in", async () => {
    const sessions = [
      { userId: "u1", createdAt: minutesAgo(300), lastSeenAt: null, idleTimeoutSeconds: null },
      { userId: "u1", createdAt: minutesAgo(90), lastSeenAt: minutesAgo(60), idleTimeoutSeconds: 1800 },
    ];
    const db = createMockDb({ selectSequence: [[classRow], [], [rows[1]], sessions] });
    const out = await run(db);
    expect(out.openSession).toBeNull();
    expect(out.students[0]).toMatchObject({ signedIn: true, lastSeenAt: minutesAgo(60) });
  });

  it("skips the session read for an empty class", async () => {
    const db = createMockDb({ selectSequence: [[classRow], [], []] });
    const out = await run(db);
    expect(out.students).toEqual([]);
    expect(db.select).toHaveBeenCalledTimes(3);
  });

  it("rejects a student", async () => {
    const db = createMockDb({ selectSequence: [[classRow]] });
    await expect(run(db, student)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("rejects a teacher who is not on the class", async () => {
    const db = createMockDb({ selectSequence: [[{ ...classRow, teacherId: "other" }], []] });
    await expect(run(db)).rejects.toMatchObject({ code: "forbidden" });
  });
});
