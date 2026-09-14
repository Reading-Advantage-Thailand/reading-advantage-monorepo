// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ROLES } from "@reading-advantage/auth";
import { POLICY_ROLES, protectedRoutes } from "../route-policies";

describe("admin proxy policy", () => {
  it("grants /admin exactly to ADMIN and SYSTEM", () => {
    expect([...protectedRoutes["/admin"]]).toEqual([ROLES.ADMIN, ROLES.SYSTEM]);
  });

  it("grants SALES_ADMIN only through the all-roles /settings policy", () => {
    for (const [route, roles] of Object.entries(protectedRoutes)) {
      if (route === "/settings") {
        // "/settings" is the documented all-canonical-roles catch-all.
        expect([...roles]).toEqual([...POLICY_ROLES]);
        continue;
      }
      expect(roles, `${route} must not grant SALES_ADMIN`).not.toContain(ROLES.SALES_ADMIN);
    }
  });
});
