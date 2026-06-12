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

// ---------------------------------------------------------------------------
// Phase 2 — Task 11: FR-2 assertTenantAccess order and error type
// ---------------------------------------------------------------------------
//
// FR-2 has two parts:
//   (a) `assertTenantAccess` checks `!user.schoolId` BEFORE the
//       ADMIN/SYSTEM bypass — so an admin with no school assignment is
//       denied. The bypass must come first.
//   (b) The function throws a bare `Error`, not `AuthError("FORBIDDEN")` —
//       so callers cannot map it reliably to a 403 response.
//
// Test strategy:
//   - Pass an ADMIN with `schoolId: null`; expect no throw.
//   - Pass a user (any role) into a wrong school; expect the thrown
//     error to be an AuthError with `code === "FORBIDDEN"`.
// ---------------------------------------------------------------------------

import { AuthError } from "../assert.js";

describe("Phase 2 — Task 11: FR-2 assertTenantAccess order and error type", () => {
  it("ADMIN with schoolId = null does NOT throw (admin bypass must precede the schoolId check)", () => {
    // Currently the implementation throws "no school assignment" for
    // an admin with null schoolId because the !user.schoolId check runs
    // before the role bypass. Green must reorder the checks.
    const admin = makeUser("ADMIN", null);
    expect(() => assertTenantAccess(admin, "school-2")).not.toThrow();
    expect(() => assertTenantAccess(admin, "school-1")).not.toThrow();
  });

  it("SYSTEM with schoolId = null does NOT throw (system bypass must precede the schoolId check)", () => {
    const system = makeUser("SYSTEM", null);
    expect(() => assertTenantAccess(system, "school-2")).not.toThrow();
  });

  it("a user in the wrong school throws AuthError with code = 'FORBIDDEN'", () => {
    // The current implementation throws a bare Error("Access denied: ...").
    // Callers cannot map a bare Error to a 403 response — Green must
    // throw AuthError(..., "FORBIDDEN").
    const student = makeUser("STUDENT", "school-1");
    let thrown: unknown = null;
    try {
      assertTenantAccess(student, "school-2");
    } catch (e) {
      thrown = e;
    }
    expect(
      thrown,
      "Expected assertTenantAccess to throw when the user's school does " +
        "not match the target school. A no-op (silent return) is a " +
        "authorization regression.",
    ).toBeInstanceOf(AuthError);
    expect(
      (thrown as AuthError).code,
      "Expected the thrown error to carry `code === 'FORBIDDEN'` so " +
        "route handlers can map it to a 403 response. The current " +
        "implementation throws a bare Error, which callers cannot " +
        "discriminate from a 500-class infrastructure failure.",
    ).toBe("FORBIDDEN");
  });

  it("a TEACHER in the wrong school throws AuthError with code = 'FORBIDDEN'", () => {
    const teacher = makeUser("TEACHER", "school-1");
    let thrown: unknown = null;
    try {
      assertTenantAccess(teacher, "school-2");
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(AuthError);
    expect((thrown as AuthError).code).toBe("FORBIDDEN");
  });
});
