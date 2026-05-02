import { describe, it, expect } from "vitest";
import { hasPermission, PERMISSIONS, type Permission } from "../permissions.js";
import type { Role } from "../roles.js";

describe("permissions", () => {
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
    it("TEACHER, ADMIN, and SYSTEM can create classes", () => {
      expect(hasPermission("TEACHER", "class:create")).toBe(true);
      expect(hasPermission("ADMIN", "class:create")).toBe(true);
      expect(hasPermission("SYSTEM", "class:create")).toBe(true);
      expect(hasPermission("STUDENT", "class:create")).toBe(false);
    });

    it("all roles can read classes", () => {
      expect(hasPermission("STUDENT", "class:read")).toBe(true);
      expect(hasPermission("TEACHER", "class:read")).toBe(true);
      expect(hasPermission("ADMIN", "class:read")).toBe(true);
      expect(hasPermission("SYSTEM", "class:read")).toBe(true);
    });

    it("only STUDENT can join classes", () => {
      expect(hasPermission("STUDENT", "class:join")).toBe(true);
      expect(hasPermission("TEACHER", "class:join")).toBe(false);
      expect(hasPermission("ADMIN", "class:join")).toBe(false);
      expect(hasPermission("SYSTEM", "class:join")).toBe(false);
    });
  });

  describe("assignment permissions", () => {
    it("TEACHER, ADMIN, and SYSTEM can create assignments", () => {
      expect(hasPermission("TEACHER", "assignment:create")).toBe(true);
      expect(hasPermission("ADMIN", "assignment:create")).toBe(true);
      expect(hasPermission("SYSTEM", "assignment:create")).toBe(true);
      expect(hasPermission("STUDENT", "assignment:create")).toBe(false);
    });

    it("only STUDENT can submit assignments", () => {
      expect(hasPermission("STUDENT", "assignment:submit")).toBe(true);
      expect(hasPermission("TEACHER", "assignment:submit")).toBe(false);
      expect(hasPermission("ADMIN", "assignment:submit")).toBe(false);
      expect(hasPermission("SYSTEM", "assignment:submit")).toBe(false);
    });

    it("all roles can read assignments", () => {
      expect(hasPermission("STUDENT", "assignment:read")).toBe(true);
      expect(hasPermission("TEACHER", "assignment:read")).toBe(true);
      expect(hasPermission("ADMIN", "assignment:read")).toBe(true);
      expect(hasPermission("SYSTEM", "assignment:read")).toBe(true);
    });
  });

  describe("progress permissions", () => {
    it("all roles can read own progress", () => {
      expect(hasPermission("STUDENT", "progress:read:own")).toBe(true);
      expect(hasPermission("TEACHER", "progress:read:own")).toBe(true);
      expect(hasPermission("ADMIN", "progress:read:own")).toBe(true);
      expect(hasPermission("SYSTEM", "progress:read:own")).toBe(true);
    });

    it("only TEACHER, ADMIN, and SYSTEM can read all progress", () => {
      expect(hasPermission("TEACHER", "progress:read:all")).toBe(true);
      expect(hasPermission("ADMIN", "progress:read:all")).toBe(true);
      expect(hasPermission("SYSTEM", "progress:read:all")).toBe(true);
      expect(hasPermission("STUDENT", "progress:read:all")).toBe(false);
    });

    it("only STUDENT can record progress", () => {
      expect(hasPermission("STUDENT", "progress:record")).toBe(true);
      expect(hasPermission("TEACHER", "progress:record")).toBe(false);
    });
  });

  describe("article permissions", () => {
    it("only ADMIN and SYSTEM can create articles", () => {
      expect(hasPermission("ADMIN", "article:create")).toBe(true);
      expect(hasPermission("SYSTEM", "article:create")).toBe(true);
      expect(hasPermission("TEACHER", "article:create")).toBe(false);
      expect(hasPermission("STUDENT", "article:create")).toBe(false);
    });

    it("all roles can read articles", () => {
      expect(hasPermission("STUDENT", "article:read")).toBe(true);
      expect(hasPermission("TEACHER", "article:read")).toBe(true);
      expect(hasPermission("ADMIN", "article:read")).toBe(true);
      expect(hasPermission("SYSTEM", "article:read")).toBe(true);
    });
  });

  describe("admin permissions", () => {
    it("only ADMIN and SYSTEM can access admin dashboard", () => {
      expect(hasPermission("ADMIN", "admin:dashboard")).toBe(true);
      expect(hasPermission("SYSTEM", "admin:dashboard")).toBe(true);
      expect(hasPermission("TEACHER", "admin:dashboard")).toBe(false);
      expect(hasPermission("STUDENT", "admin:dashboard")).toBe(false);
    });
  });
});
