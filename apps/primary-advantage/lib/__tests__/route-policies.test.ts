// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ROLES } from "@reading-advantage/auth";
import { POLICY_ROLES, protectedRoutes, roleDefaultRedirects } from "../route-policies";
import { STUDENT_HOME } from "../student-home";
import { TEACHER_HOME } from "../teacher-home";

describe("proxy route policies", () => {
  it("covers every role in the canonical role enum", () => {
    expect([...POLICY_ROLES].sort()).toEqual([...Object.values(ROLES)].sort());
    for (const role of Object.values(ROLES)) {
      const covered = Object.values(protectedRoutes).some((roles) =>
        (roles as readonly string[]).includes(role),
      );
      expect(covered, `role ${role} has no proxy policy`).toBe(true);
    }
  });

  it("lands a student on the student home after sign-in (FR-4)", () => {
    expect(STUDENT_HOME).toBe("/student/home");
    expect(roleDefaultRedirects.student).toBe(STUDENT_HOME);
  });

  it("lands a teacher on the teacher dashboard (Lane C Phase 3, audit T1)", () => {
    expect(TEACHER_HOME).toBe("/teacher/dashboard");
    expect(roleDefaultRedirects.teacher).toBe(TEACHER_HOME);
  });

  it("restricts /student to the student role", () => {
    expect([...protectedRoutes["/student"]]).toEqual([ROLES.STUDENT]);
  });

  it("leaves the sign-in and QR card pages open to a signed-out user", () => {
    for (const path of ["/auth/signin", "/auth/card"]) {
      const guard = Object.keys(protectedRoutes).find((route) => path.startsWith(route));
      expect(guard, `${path} is behind ${guard}`).toBeUndefined();
    }
  });

  it("names no role outside the role enum", () => {
    const known = new Set(Object.values(ROLES));
    for (const [route, roles] of Object.entries(protectedRoutes)) {
      for (const role of roles as readonly string[]) {
        expect(known.has(role as (typeof ROLES)[keyof typeof ROLES]), `${route} names unknown role ${role}`).toBe(
          true,
        );
      }
    }
  });
});
