import { describe, expect, it } from "vitest";
import {
  CLASS_CODE_ALPHABET,
  CLASS_CODE_LENGTH,
  PICTURE_GRID_SIZE,
  PICTURE_SEQUENCE_LENGTH,
  classSessionStartInput,
  classSessionStartOutput,
  classSessionEndInput,
  codeEntryInput,
  nameListOutput,
  picturePasswordSignInInput,
  qrTokenSignInInput,
  studentSignInOutput,
} from "../student-login/contracts.js";

const uuid = "123e4567-e89b-42d3-a456-426614174000";

// Rows of the lifetime contract cases. Each row is one case (strategy section 6.2).
const acceptedLifetimeRows: unknown[][] = [["3h"], ["until_17"], ["7d"]];
const defaultLifetimeRows: unknown[][] = [
  ["absent", {}],
  ["undefined", { lifetime: undefined }],
];
const refusedLifetimeRows: unknown[][] = ["1d", "30d", "", 7, null].map((value) => [value]);
const nearMissLifetimeRows: unknown[][] = ["7D", "UNTIL_17", " 7d", "7d ", ["7d"], {}, "constructor", "__proto__"].map(
  (value) => [value],
);

describe("student login contracts", () => {
  it("keeps the code alphabet free of look-alike characters", () => {
    expect(CLASS_CODE_ALPHABET).not.toMatch(/[01OIL]/);
    expect(new Set(CLASS_CODE_ALPHABET).size).toBe(CLASS_CODE_ALPHABET.length);
    expect(CLASS_CODE_LENGTH).toBeGreaterThanOrEqual(6);
  });

  it("requires a class id to start and end a class", () => {
    expect(classSessionStartInput.safeParse({ classroomId: uuid }).success).toBe(true);
    expect(classSessionStartInput.safeParse({ classroomId: "x" }).success).toBe(false);
    expect(classSessionEndInput.safeParse({}).success).toBe(false);
  });

  it("returns the code and expiry when a class starts", () => {
    const ok = classSessionStartOutput.safeParse({
      sessionId: uuid,
      code: "ABCD23",
      expiresAt: new Date(),
    });
    expect(ok.success).toBe(true);
  });

  it("normalizes the entered code to upper case", () => {
    expect(codeEntryInput.parse({ code: " abcd23 " }).code).toBe("ABCD23");
  });

  it("rejects codes with wrong length or characters", () => {
    for (const code of ["", "ABC", "ABCD2345X", "ABCD0I", "AB CD2"]) {
      expect(codeEntryInput.safeParse({ code }).success, code).toBe(false);
    }
  });

  it("allows only an id, a display name, and an avatar in the name list", () => {
    const row = { studentId: uuid, displayName: "Nok", avatar: "fox" };
    expect(nameListOutput.safeParse({ picturePasswordRequired: true, students: [row] }).success).toBe(true);
    for (const extra of [{ email: "a@b.c" }, { fullName: "Nok S." }, { username: "u1" }]) {
      expect(nameListOutput.safeParse({ picturePasswordRequired: true, students: [{ ...row, ...extra }] }).success).toBe(false);
    }
  });

  it("accepts exactly 3 picture indexes inside the grid", () => {
    const base = { code: "abcd23", studentId: uuid };
    expect(PICTURE_SEQUENCE_LENGTH).toBe(3);
    expect(PICTURE_GRID_SIZE).toBe(12);
    expect(picturePasswordSignInInput.parse({ ...base, pictures: [0, 11, 5] }).code).toBe("ABCD23");
    for (const pictures of [[0, 1], [0, 1, 2, 3], [0, 1, 12], [-1, 1, 2], [0.5, 1, 2]]) {
      expect(picturePasswordSignInInput.safeParse({ ...base, pictures }).success).toBe(false);
    }
  });

  it("accepts only a 43 character url-safe QR token", () => {
    expect(qrTokenSignInInput.safeParse({ token: "A".repeat(43) }).success).toBe(true);
    expect(qrTokenSignInInput.safeParse({ token: "A".repeat(42) }).success).toBe(false);
    expect(qrTokenSignInInput.safeParse({ token: `${"A".repeat(42)}+` }).success).toBe(false);
  });

  it("limits auth strength to full or code_only", () => {
    const user = { id: "u1", role: "STUDENT" };
    expect(studentSignInOutput.safeParse({ user, authStrength: "full" }).success).toBe(true);
    expect(studentSignInOutput.safeParse({ user, authStrength: "code_only" }).success).toBe(true);
    expect(studentSignInOutput.safeParse({ user, authStrength: "weak" }).success).toBe(false);
  });
});

describe("class session lifetime contract", () => {
  const base = { classroomId: uuid };

  it.each(acceptedLifetimeRows)("accepts the lifetime %s", (lifetime) => {
    const parsed = classSessionStartInput.parse({ ...base, lifetime });
    expect(parsed.lifetime).toBe(lifetime);
  });

  it.each(defaultLifetimeRows)("gives the default 3 hours when lifetime is %s", (_label, extra) => {
    expect(classSessionStartInput.parse({ ...base, ...(extra as object) }).lifetime).toBe("3h");
  });

  it("covers the five refused value rows", () => {
    expect(refusedLifetimeRows).toHaveLength(5);
  });

  it.each(refusedLifetimeRows)("refuses the lifetime %j", (lifetime) => {
    expect(classSessionStartInput.safeParse({ ...base, lifetime }).success).toBe(false);
  });

  it("covers the eight near-miss rows", () => {
    expect(nearMissLifetimeRows).toHaveLength(8);
  });

  it.each(nearMissLifetimeRows)("refuses the near-miss lifetime %j", (lifetime) => {
    expect(classSessionStartInput.safeParse({ ...base, lifetime }).success).toBe(false);
  });

  it("strips client time fields next to the choice", () => {
    const parsed = classSessionStartInput.parse({
      ...base,
      lifetime: "3h",
      expiresAt: "2026-11-18T05:00:00Z",
      minutes: 60,
    });
    expect(parsed).not.toHaveProperty("expiresAt");
    expect(parsed).not.toHaveProperty("minutes");
  });

  it("keeps the start output to three fields", () => {
    const parsed = classSessionStartOutput.parse({ sessionId: uuid, code: "ABCD23", expiresAt: new Date(), codeHash: "leak" });
    expect(Object.keys(parsed).sort()).toEqual(["code", "expiresAt", "sessionId"]);
  });
});
