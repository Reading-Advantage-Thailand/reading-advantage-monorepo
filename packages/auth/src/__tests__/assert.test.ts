import { describe, it, expect } from "vitest";
import { assertCan, AuthError } from "../assert.js";
import type { UserContext } from "../tenant.js";

function makeUser(role: UserContext["role"], schoolId = "school-1"): UserContext {
  return { id: "user-1", email: "test@test.com", name: "Test", role, schoolId };
}

describe("assertCan", () => {
  it("does not throw when user has permission", () => {
    expect(() => assertCan(makeUser("TEACHER"), "class:create")).not.toThrow();
    expect(() => assertCan(makeUser("ADMIN"), "admin:dashboard")).not.toThrow();
    expect(() => assertCan(makeUser("STUDENT"), "class:read")).not.toThrow();
  });

  it("throws AuthError with FORBIDDEN code when user lacks permission", () => {
    try {
      assertCan(makeUser("STUDENT"), "class:create");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).code).toBe("FORBIDDEN");
      expect((err as AuthError).name).toBe("AuthError");
    }
  });

  it("includes role and permission in error message", () => {
    expect(() => assertCan(makeUser("STUDENT"), "admin:dashboard")).toThrow(
      /STUDENT.*admin:dashboard/
    );
  });

  it("throws for USER role on most permissions", () => {
    expect(() => assertCan(makeUser("USER"), "class:list")).toThrow(AuthError);
    expect(() => assertCan(makeUser("USER"), "assignment:read")).toThrow(AuthError);
  });
});

describe("AuthError", () => {
  it("extends Error", () => {
    const err = new AuthError("test", "FORBIDDEN");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AuthError);
  });

  it("has correct code property", () => {
    const err = new AuthError("test", "UNAUTHORIZED");
    expect(err.code).toBe("UNAUTHORIZED");
  });
});
