// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ROLES } from "@reading-advantage/auth";
import { POLICY_ROLES, protectedRoutes } from "../route-policies";

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

  it("restricts /student to the student role", () => {
    expect([...protectedRoutes["/student"]]).toEqual([ROLES.STUDENT]);
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
