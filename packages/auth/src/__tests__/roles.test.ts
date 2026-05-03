import { describe, it, expect } from "vitest";
import { ROLES, ROLE_ROUTES, roleAtLeast } from "../roles.js";

describe("roles", () => {
  it("defines all expected roles", () => {
    expect(ROLES.STUDENT).toBe("STUDENT");
    expect(ROLES.TEACHER).toBe("TEACHER");
    expect(ROLES.ADMIN).toBe("ADMIN");
    expect(ROLES.SYSTEM).toBe("SYSTEM");
  });

  describe("roleAtLeast", () => {
    it("SYSTEM is at least every role", () => {
      expect(roleAtLeast("SYSTEM", "SYSTEM")).toBe(true);
      expect(roleAtLeast("SYSTEM", "ADMIN")).toBe(true);
      expect(roleAtLeast("SYSTEM", "TEACHER")).toBe(true);
      expect(roleAtLeast("SYSTEM", "STUDENT")).toBe(true);
    });

    it("ADMIN is at least every role except SYSTEM", () => {
      expect(roleAtLeast("ADMIN", "ADMIN")).toBe(true);
      expect(roleAtLeast("ADMIN", "TEACHER")).toBe(true);
      expect(roleAtLeast("ADMIN", "STUDENT")).toBe(true);
      expect(roleAtLeast("ADMIN", "SYSTEM")).toBe(false);
    });

    it("TEACHER is at least STUDENT and TEACHER", () => {
      expect(roleAtLeast("TEACHER", "STUDENT")).toBe(true);
      expect(roleAtLeast("TEACHER", "TEACHER")).toBe(true);
      expect(roleAtLeast("TEACHER", "ADMIN")).toBe(false);
      expect(roleAtLeast("TEACHER", "SYSTEM")).toBe(false);
    });

    it("STUDENT is only at least STUDENT", () => {
      expect(roleAtLeast("STUDENT", "STUDENT")).toBe(true);
      expect(roleAtLeast("STUDENT", "TEACHER")).toBe(false);
      expect(roleAtLeast("STUDENT", "ADMIN")).toBe(false);
      expect(roleAtLeast("STUDENT", "SYSTEM")).toBe(false);
    });
  });

  describe("ROLE_ROUTES", () => {
    it("maps each role to a route", () => {
      expect(ROLE_ROUTES.STUDENT).toBe("/student");
      expect(ROLE_ROUTES.TEACHER).toBe("/teacher");
      expect(ROLE_ROUTES.ADMIN).toBe("/admin");
      expect(ROLE_ROUTES.SYSTEM).toBe("/system");
    });
  });
});
