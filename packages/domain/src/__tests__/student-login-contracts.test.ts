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
