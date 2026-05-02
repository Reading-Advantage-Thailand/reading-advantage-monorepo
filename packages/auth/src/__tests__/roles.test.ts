import { describe, it, expect } from "vitest";
import { ROLES, ROLE_HIERARCHY, roleAtLeast } from "../roles.js";

describe("roles", () => {
  it("defines all expected roles", () => {
    expect(ROLES.STUDENT).toBe("STUDENT");
    expect(ROLES.USER).toBe("USER");
    expect(ROLES.TEACHER).toBe("TEACHER");
    expect(ROLES.ADMIN).toBe("ADMIN");
  });

  describe("roleAtLeast", () => {
    it("ADMIN is at least every role", () => {
      expect(roleAtLeast("ADMIN", "ADMIN")).toBe(true);
      expect(roleAtLeast("ADMIN", "TEACHER")).toBe(true);
      expect(roleAtLeast("ADMIN", "USER")).toBe(true);
      expect(roleAtLeast("ADMIN", "STUDENT")).toBe(true);
    });

    it("TEACHER is at least STUDENT and USER", () => {
      expect(roleAtLeast("TEACHER", "STUDENT")).toBe(true);
      expect(roleAtLeast("TEACHER", "USER")).toBe(true);
      expect(roleAtLeast("TEACHER", "TEACHER")).toBe(true);
      expect(roleAtLeast("TEACHER", "ADMIN")).toBe(false);
    });

    it("STUDENT is only at least STUDENT", () => {
      expect(roleAtLeast("STUDENT", "STUDENT")).toBe(true);
      expect(roleAtLeast("STUDENT", "USER")).toBe(false);
      expect(roleAtLeast("STUDENT", "TEACHER")).toBe(false);
      expect(roleAtLeast("STUDENT", "ADMIN")).toBe(false);
    });

    it("USER is at least STUDENT and USER", () => {
      expect(roleAtLeast("USER", "STUDENT")).toBe(true);
      expect(roleAtLeast("USER", "USER")).toBe(true);
      expect(roleAtLeast("USER", "TEACHER")).toBe(false);
      expect(roleAtLeast("USER", "ADMIN")).toBe(false);
    });
  });
});
