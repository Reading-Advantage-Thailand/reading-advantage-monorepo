import { describe, expect, it } from "vitest";
import { passwordSchema, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from "../password-schema.js";

describe("passwordSchema", () => {
  it("uses 8 and 128 as the length limits", () => {
    expect([PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH]).toEqual([8, 128]);
  });

  it("accepts the boundary lengths", () => {
    expect(passwordSchema.safeParse("a".repeat(8)).success).toBe(true);
    expect(passwordSchema.safeParse("a".repeat(128)).success).toBe(true);
  });

  it("rejects passwords that are too short or too long", () => {
    expect(passwordSchema.safeParse("a".repeat(7)).success).toBe(false);
    expect(passwordSchema.safeParse("a".repeat(129)).success).toBe(false);
  });
});
