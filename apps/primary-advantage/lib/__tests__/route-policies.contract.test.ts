// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ROLES } from "@reading-advantage/auth";
import {
  POLICY_ROLES,
  protectedRoutes,
  roleDefaultRedirects,
} from "../route-policies";

/**
 * Resolves the required roles for a path using the same prefix match the
 * proxy enforces (first protectedRoutes key the path starts with).
 * @param path The pathname a redirect target points at.
 * @returns The required role list, or undefined when the path is public.
 */
function requiredRolesFor(path: string): readonly string[] | undefined {
  return Object.entries(protectedRoutes).find(([route]) =>
    path.startsWith(route),
  )?.[1];
}

describe("roleDefaultRedirects / protectedRoutes pairing contract", () => {
  it("keeps the sales roles out of the default redirects", () => {
    expect(roleDefaultRedirects).not.toHaveProperty("sales_rep");
    expect(roleDefaultRedirects).not.toHaveProperty("sales_admin");
    expect(roleDefaultRedirects).not.toHaveProperty(ROLES.SALES_REP);
    expect(roleDefaultRedirects).not.toHaveProperty(ROLES.SALES_ADMIN);
  });

  it("redirects every role to a path the proxy admits for that role", () => {
    for (const [roleKey, target] of Object.entries(roleDefaultRedirects)) {
      const canonical = roleKey.toUpperCase();
      expect(POLICY_ROLES, `${roleKey} is not a canonical role`).toContain(
        canonical,
      );
      const required = requiredRolesFor(target);
      if (required === undefined) {
        // Public target: every role is admitted.
        continue;
      }
      expect(
        required,
        `${canonical} redirects to ${target} which it cannot access`,
      ).toContain(canonical);
    }
  });

  it("draws every role list from the canonical enum and leaves none empty", () => {
    for (const [route, roles] of Object.entries(protectedRoutes)) {
      expect(roles.length, `${route} has an empty role list`).toBeGreaterThan(
        0,
      );
      for (const role of roles) {
        expect(
          POLICY_ROLES,
          `${route} names non-canonical role ${role}`,
        ).toContain(role);
      }
    }
  });
});
