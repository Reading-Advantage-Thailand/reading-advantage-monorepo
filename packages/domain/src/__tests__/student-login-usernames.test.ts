import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DB } from "@reading-advantage/db";
import { createMockDb } from "./mock-db.js";
import {
  usernamePrefix,
  generateInitialPassword,
  INITIAL_PASSWORD_LENGTH,
  provisionStudentLogins,
} from "../student-login/usernames.js";
import { verifyPassword } from "@reading-advantage/auth";

const SCHOOL = "22222222-2222-4222-8222-222222222222";
const asDb = (db: ReturnType<typeof createMockDb>) => db as unknown as DB;

describe("usernamePrefix", () => {
  it("makes a short lower-case prefix from the class name", () => {
    expect(usernamePrefix("P3A")).toBe("p3a");
    expect(usernamePrefix("Grade 4 / Blue")).toBe("grade4bl");
    expect(usernamePrefix("Café Club")).toBe("cafeclub");
  });
  it("falls back to student when the name has no latin letters or digits", () => {
    expect(usernamePrefix("ห้อง ๑")).toBe("student");
    expect(usernamePrefix(null)).toBe("student");
    expect(usernamePrefix("   ")).toBe("student");
  });
});

describe("generateInitialPassword", () => {
  it("uses only readable lower-case characters and the fixed length", () => {
    for (let i = 0; i < 100; i++) {
      const p = generateInitialPassword();
      expect(p).toHaveLength(INITIAL_PASSWORD_LENGTH);
      expect(p).toMatch(/^[a-hjkmnp-z2-9]+$/);
    }
  });
  it("is deterministic with an injected picker", () => {
    expect(generateInitialPassword(() => 0)).toBe("a".repeat(INITIAL_PASSWORD_LENGTH));
  });
});

describe("provisionStudentLogins", () => {
  beforeEach(() => vi.clearAllMocks());

  it("gives readable unique usernames that continue after the highest existing number", async () => {
    const db = createMockDb({ selectSequence: [[{ username: "p3a1" }, { username: "p3a9" }, { username: "p3ab" }], [], []] });
    const { provisioned: out } = await provisionStudentLogins({
      db: asDb(db),
      schoolId: SCHOOL,
      students: [
        { userId: "u1", classroomName: "P3A", classroomId: null },
        { userId: "u2", classroomName: "P3A", classroomId: null },
      ],
    });
    expect(out.map((o) => o.username)).toEqual(["p3a10", "p3a11"]);
    expect(out.every((o) => o.username === o.username.toLowerCase() && !o.username.includes("@"))).toBe(true);
  });

  it("returns a distinct initial password and stores only its argon2id hash", async () => {
    const db = createMockDb({ selectSequence: [[], [], []] });
    const { provisioned: out } = await provisionStudentLogins({
      db: asDb(db),
      schoolId: SCHOOL,
      students: [
        { userId: "u1", classroomName: "P3A", classroomId: null },
        { userId: "u2", classroomName: "P3A", classroomId: null },
      ],
    });
    expect(out[0]!.initialPassword).not.toBe(out[1]!.initialPassword);
    const valuesCalls = db.insert.mock.results.flatMap((r) => r.value.values.mock.calls.map((c: unknown[]) => c[0] as Record<string, unknown>));
    const account = valuesCalls.find((v) => v.userId === "u1")!;
    expect(account).toMatchObject({ providerId: "credential", userId: "u1" });
    expect(JSON.stringify(valuesCalls)).not.toContain(out[0]!.initialPassword!);
    expect(await verifyPassword(out[0]!.initialPassword!, account.password as string)).toBe(true);
  });

  it("keeps a password the caller gives and returns no initial password for it", async () => {
    const db = createMockDb({ selectSequence: [[], []] });
    const { provisioned: out } = await provisionStudentLogins({
      db: asDb(db),
      schoolId: SCHOOL,
      students: [{ userId: "u1", classroomName: "P3A", classroomId: null, password: "Chosen-pass-1" }],
    });
    expect(out[0]).toEqual({ userId: "u1", username: "p3a1", initialPassword: null });
  });

  it("sets username and display username on the user row", async () => {
    const db = createMockDb({ selectSequence: [[], []] });
    await provisionStudentLogins({ db: asDb(db), schoolId: SCHOOL, students: [{ userId: "u1", classroomName: null, classroomId: null }] });
    const set = db.update.mock.results[0]!.value.set.mock.calls[0][0];
    expect(set).toMatchObject({ username: "student1", displayUsername: "student1" });
  });

  it("retries with a fresh number after a unique violation", async () => {
    const db = createMockDb({ selectSequence: [[], [{ username: "p3a1" }], []] });
    const set = vi.fn()
      .mockReturnValueOnce({ where: vi.fn().mockRejectedValue(Object.assign(new Error("dup"), { code: "23505" })) })
      .mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }) });
    db.update.mockReturnValue({ set });
    const { provisioned: out } = await provisionStudentLogins({ db: asDb(db), schoolId: SCHOOL, students: [{ userId: "u1", classroomName: "P3A", classroomId: null }] });
    expect(out[0]!.username).toBe("p3a2");
  });

  it("creates the student credential row for each class", async () => {
    const db = createMockDb({ selectSequence: [[], [{ userId: "u1" }]] });
    await provisionStudentLogins({ db: asDb(db), schoolId: SCHOOL, students: [{ userId: "u1", classroomName: "P3A", classroomId: "c1" }] });
    const inserted = db.insert.mock.results.flatMap((r) => r.value.values.mock.calls.map((c: unknown[]) => c[0]));
    expect(JSON.stringify(inserted)).toContain('"schoolId":"22222222-2222-4222-8222-222222222222"');
  });

  it("runs the username update and the account insert of one student in one transaction", async () => {
    const db = createMockDb({ selectSequence: [[], []] });
    await provisionStudentLogins({ db: asDb(db), schoolId: SCHOOL, students: [{ userId: "u1", classroomName: "P3A", classroomId: null }] });
    expect(db.transaction).toHaveBeenCalledTimes(1);
  });

  it("reports a student whose login could not be stored and goes on with the others", async () => {
    const db = createMockDb({ selectSequence: [[], [], []] });
    const insert = vi.fn()
      .mockReturnValueOnce({ values: vi.fn().mockReturnValue({ onConflictDoUpdate: vi.fn().mockRejectedValue(new Error("Failed query: insert ... params: $argon2id$v=19$secret")) }) })
      .mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoUpdate: vi.fn().mockResolvedValue([]), onConflictDoNothing: vi.fn().mockResolvedValue([]) }) });
    db.insert = insert;
    const out = await provisionStudentLogins({
      db: asDb(db),
      schoolId: SCHOOL,
      students: [
        { userId: "u1", classroomName: "P3A", classroomId: null },
        { userId: "u2", classroomName: "P3A", classroomId: null },
      ],
    });
    // The raw database message can list the query params (the new hash), so it never leaves the use-case.
    expect(out.failed).toEqual([{ userId: "u1", reason: "Could not save the login." }]);
    expect(out.provisioned.map((p) => p.userId)).toEqual(["u2"]);
  });
});
