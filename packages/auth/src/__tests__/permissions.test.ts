import { describe, it, expect } from "vitest";
import { hasPermission, PERMISSIONS, type Permission } from "../permissions.js";
import type { Role } from "../roles.js";

describe("permissions", () => {
  const allRoles: Role[] = ["STUDENT", "USER", "TEACHER", "ADMIN"];

  it("defines all expected permission keys", () => {
    const keys = Object.keys(PERMISSIONS);
    expect(keys).toContain("class:create");
    expect(keys).toContain("class:list");
    expect(keys).toContain("class:read");
    expect(keys).toContain("student:list");
    expect(keys).toContain("student:import");
    expect(keys).toContain("assignment:create");
    expect(keys).toContain("assignment:submit");
    expect(keys).toContain("progress:read:own");
    expect(keys).toContain("progress:read:all");
    expect(keys).toContain("article:create");
    expect(keys).toContain("admin:dashboard");
  });

  describe("class permissions", () => {
    it("TEACHER and ADMIN can create classes", () => {
      expect(hasPermission("TEACHER", "class:create")).toBe(true);
      expect(hasPermission("ADMIN", "class:create")).toBe(true);
      expect(hasPermission("STUDENT", "class:create")).toBe(false);
      expect(hasPermission("USER", "class:create")).toBe(false);
    });

    it("all roles except USER can read classes", () => {
      expect(hasPermission("STUDENT", "class:read")).toBe(true);
      expect(hasPermission("TEACHER", "class:read")).toBe(true);
      expect(hasPermission("ADMIN", "class:read")).toBe(true);
      expect(hasPermission("USER", "class:read")).toBe(false);
    });

    it("only STUDENT can join classes", () => {
      expect(hasPermission("STUDENT", "class:join")).toBe(true);
      expect(hasPermission("TEACHER", "class:join")).toBe(false);
      expect(hasPermission("ADMIN", "class:join")).toBe(false);
    });
  });

  describe("assignment permissions", () => {
    it("TEACHER and ADMIN can create assignments", () => {
      expect(hasPermission("TEACHER", "assignment:create")).toBe(true);
      expect(hasPermission("ADMIN", "assignment:create")).toBe(true);
      expect(hasPermission("STUDENT", "assignment:create")).toBe(false);
    });

    it("only STUDENT can submit assignments", () => {
      expect(hasPermission("STUDENT", "assignment:submit")).toBe(true);
      expect(hasPermission("TEACHER", "assignment:submit")).toBe(false);
      expect(hasPermission("ADMIN", "assignment:submit")).toBe(false);
    });

    it("all non-USER roles can read assignments", () => {
      expect(hasPermission("STUDENT", "assignment:read")).toBe(true);
      expect(hasPermission("TEACHER", "assignment:read")).toBe(true);
      expect(hasPermission("ADMIN", "assignment:read")).toBe(true);
      expect(hasPermission("USER", "assignment:read")).toBe(false);
    });
  });

  describe("progress permissions", () => {
    it("all non-USER roles can read own progress", () => {
      expect(hasPermission("STUDENT", "progress:read:own")).toBe(true);
      expect(hasPermission("TEACHER", "progress:read:own")).toBe(true);
      expect(hasPermission("ADMIN", "progress:read:own")).toBe(true);
    });

    it("only TEACHER and ADMIN can read all progress", () => {
      expect(hasPermission("TEACHER", "progress:read:all")).toBe(true);
      expect(hasPermission("ADMIN", "progress:read:all")).toBe(true);
      expect(hasPermission("STUDENT", "progress:read:all")).toBe(false);
    });

    it("only STUDENT can record progress", () => {
      expect(hasPermission("STUDENT", "progress:record")).toBe(true);
      expect(hasPermission("TEACHER", "progress:record")).toBe(false);
    });
  });

  describe("article permissions", () => {
    it("only ADMIN can create articles", () => {
      expect(hasPermission("ADMIN", "article:create")).toBe(true);
      expect(hasPermission("TEACHER", "article:create")).toBe(false);
      expect(hasPermission("STUDENT", "article:create")).toBe(false);
    });

    it("all non-USER roles can read articles", () => {
      expect(hasPermission("STUDENT", "article:read")).toBe(true);
      expect(hasPermission("TEACHER", "article:read")).toBe(true);
      expect(hasPermission("ADMIN", "article:read")).toBe(true);
    });
  });

  describe("admin permissions", () => {
    it("only ADMIN can access admin dashboard", () => {
      expect(hasPermission("ADMIN", "admin:dashboard")).toBe(true);
      expect(hasPermission("TEACHER", "admin:dashboard")).toBe(false);
      expect(hasPermission("STUDENT", "admin:dashboard")).toBe(false);
    });
  });

  describe("hasPermission edge cases", () => {
    it("returns false for roles not listed in permission", () => {
      // USER should fail for most permissions
      const userAllowed: Permission[] = [];
      for (const [perm, roles] of Object.entries(PERMISSIONS)) {
        if ((roles as readonly Role[]).includes("USER")) {
          userAllowed.push(perm as Permission);
        }
      }
      // USER is not allowed for any permission currently
      expect(userAllowed).toHaveLength(0);
    });
  });
});
