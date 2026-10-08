import { describe, it, expect, vi, beforeEach } from "vitest";
import { isStudentUsername, type DB } from "@reading-advantage/db";
import { createMockDb } from "./mock-db.js";
import {
  generateInitialPassword,
  INITIAL_PASSWORD_LENGTH,
  provisionStudentLogins,
} from "../student-login/usernames.js";
import { verifyPassword } from "@reading-advantage/auth";

const SCHOOL = "22222222-2222-4222-8222-222222222222";
const asDb = (db: ReturnType<typeof createMockDb>) => db as unknown as DB;

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

  it("gives each student a permanent two-word username with no email and no class part", async () => {
    const db = createMockDb({ selectSequence: [] });
    const { provisioned: out } = await provisionStudentLogins({
      db: asDb(db),
      schoolId: SCHOOL,
      students: [
        { userId: "u1", classroomId: null },
        { userId: "u2", classroomId: null },
      ],
    });
    expect(out.every((o) => isStudentUsername(o.username))).toBe(true);
    expect(db.select).not.toHaveBeenCalled();
  });

  it("returns a distinct initial password and stores only its argon2id hash", async () => {
    const db = createMockDb({ selectSequence: [[], [], []] });
    const { provisioned: out } = await provisionStudentLogins({
      db: asDb(db),
      schoolId: SCHOOL,
      students: [
        { userId: "u1", classroomId: null },
        { userId: "u2", classroomId: null },
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
      students: [{ userId: "u1", classroomId: null, password: "Chosen-pass-1" }],
    });
    expect(out[0]).toMatchObject({ userId: "u1", initialPassword: null });
    expect(isStudentUsername(out[0]!.username)).toBe(true);
  });

  it("sets username and display username on the user row", async () => {
    const db = createMockDb({ selectSequence: [[], []] });
    await provisionStudentLogins({ db: asDb(db), schoolId: SCHOOL, students: [{ userId: "u1", classroomId: null }] });
    const set = db.update.mock.results[0]!.value.set.mock.calls[0][0];
    expect(isStudentUsername(set.username)).toBe(true);
    expect(set.displayUsername).toBe(set.username);
  });

  it("retries with a fresh name after a unique violation", async () => {
    const db = createMockDb({ selectSequence: [] });
    const set = vi.fn()
      .mockReturnValueOnce({ where: vi.fn().mockRejectedValue(Object.assign(new Error("dup"), { code: "23505" })) })
      .mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }) });
    db.update.mockReturnValue({ set });
    const { provisioned: out } = await provisionStudentLogins({ db: asDb(db), schoolId: SCHOOL, students: [{ userId: "u1", classroomId: null }] });
    expect(set).toHaveBeenCalledTimes(2);
    expect(set.mock.calls[1]![0].username).toBe(out[0]!.username);
    expect(isStudentUsername(out[0]!.username)).toBe(true);
  });

  it("creates the student credential row for each class", async () => {
    const db = createMockDb({ selectSequence: [[{ userId: "u1" }]] });
    await provisionStudentLogins({ db: asDb(db), schoolId: SCHOOL, students: [{ userId: "u1", classroomId: "c1" }] });
    const inserted = db.insert.mock.results.flatMap((r) => r.value.values.mock.calls.map((c: unknown[]) => c[0]));
    expect(JSON.stringify(inserted)).toContain('"schoolId":"22222222-2222-4222-8222-222222222222"');
  });

  it("runs the username update and the account insert of one student in one transaction", async () => {
    const db = createMockDb({ selectSequence: [[], []] });
    await provisionStudentLogins({ db: asDb(db), schoolId: SCHOOL, students: [{ userId: "u1", classroomId: null }] });
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
        { userId: "u1", classroomId: null },
        { userId: "u2", classroomId: null },
      ],
    });
    // The raw database message can list the query params (the new hash), so it never leaves the use-case.
    expect(out.failed).toEqual([{ userId: "u1", reason: "Could not save the login." }]);
    expect(out.provisioned.map((p) => p.userId)).toEqual(["u2"]);
  });
});
