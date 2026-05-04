import { describe, it, expect } from "vitest";
import { roleSchema } from "../context.js";

describe("roleSchema", () => {
  it("accepts valid roles", () => {
    expect(roleSchema.parse("STUDENT")).toBe("STUDENT");
    expect(roleSchema.parse("TEACHER")).toBe("TEACHER");
    expect(roleSchema.parse("ADMIN")).toBe("ADMIN");
    expect(roleSchema.parse("SYSTEM")).toBe("SYSTEM");
  });

  it("throws on invalid role strings", () => {
    expect(() => roleSchema.parse("HACKER")).toThrow();
    expect(() => roleSchema.parse("")).toThrow();
    expect(() => roleSchema.parse("student")).toThrow(); // lowercase
  });
});
