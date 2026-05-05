import { describe, it, expect } from "vitest";
import { assertTenantAccess } from "../tenant.js";
import type { UserContext } from "../tenant.js";

function makeUser(
  role: UserContext["role"],
  schoolId: string | null = "school-1"
): UserContext {
  return { id: "user-1", username: "testuser", name: "Test", role, schoolId, xp: 0, level: 1, cefrLevel: "A1-" };
}

describe("assertTenantAccess", () => {
  it("admin can access any school", () => {
    const admin = makeUser("ADMIN", "school-1");
    expect(() => assertTenantAccess(admin, "school-2")).not.toThrow();
    expect(() => assertTenantAccess(admin, "school-1")).not.toThrow();
  });

  it("system can access any school", () => {
    const system = makeUser("SYSTEM", "school-1");
    expect(() => assertTenantAccess(system, "school-2")).not.toThrow();
    expect(() => assertTenantAccess(system, "school-1")).not.toThrow();
  });

  it("student can access own school", () => {
    const student = makeUser("STUDENT", "school-1");
    expect(() => assertTenantAccess(student, "school-1")).not.toThrow();
  });

  it("student cannot access different school", () => {
    const student = makeUser("STUDENT", "school-1");
    expect(() => assertTenantAccess(student, "school-2")).toThrow(
      /Access denied/
    );
  });

  it("teacher can access own school", () => {
    const teacher = makeUser("TEACHER", "school-1");
    expect(() => assertTenantAccess(teacher, "school-1")).not.toThrow();
  });

  it("teacher cannot access different school", () => {
    const teacher = makeUser("TEACHER", "school-1");
    expect(() => assertTenantAccess(teacher, "school-2")).toThrow(
      /Access denied/
    );
  });

  it("user with no school assignment throws", () => {
    const user = makeUser("STUDENT", null);
    expect(() => assertTenantAccess(user, "school-1")).toThrow(
      /no school assignment/
    );
  });
});
