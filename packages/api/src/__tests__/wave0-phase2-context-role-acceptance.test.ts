/**
 * Wave 0 Phase 2 — API context roleSchema acceptance test.
 *
 * Proves that the tRPC API context roleSchema accepts all active
 * app roles including SALES_REP and SALES_ADMIN.
 *
 * Red expectations (2026-06-28):
 *   - roleSchema.parse("SALES_REP") throws — enum is
 *     ["INTERN","STUDENT","TEACHER","ADMIN","SYSTEM"].
 *   - roleSchema.parse("SALES_ADMIN") throws — same reason.
 *   - roleSchema.parse("INTERN") succeeds — this is already in the enum.
 *
 * Targeted command:
 *   CI=true pnpm turbo run test --filter=@reading-advantage/api
 */
import { describe, it, expect } from "vitest";
import { roleSchema } from "../context.js";

/**
 * Every active app role must be accepted by the API context roleSchema.
 * Source of truth: packages/auth/src/roles.ts ROLES.
 */
const ACTIVE_APP_ROLES = [
  "INTERN",
  "STUDENT",
  "TEACHER",
  "ADMIN",
  "SYSTEM",
  "SALES_REP",
  "SALES_ADMIN",
] as const;

/**
 * Roles that must NOT be accepted (deprecated/invalid).
 */
const INVALID_ROLES = [
  "USER",
  "HACKER",
  "",
  "student", // lowercase variant
  "Sales_Rep", // wrong case
] as const;

describe("Wave 0 Phase 2 — API context roleSchema parity", () => {
  describe("roleSchema accepts every active app role", () => {
    for (const role of ACTIVE_APP_ROLES) {
      it(`accepts "${role}"`, () => {
        const result = roleSchema.safeParse(role);
        expect(
          result.success,
          `roleSchema must accept the active role "${role}". ` +
            `This role is defined in packages/auth/src/roles.ts ROLES ` +
            `but rejected by the API context roleSchema enum. ` +
            (result.success === false
              ? `Parse error: ${result.error.message}`
              : ""),
        ).toBe(true);
      });
    }
  });

  describe("roleSchema rejects deprecated and invalid roles", () => {
    for (const role of INVALID_ROLES) {
      it(`rejects "${role || "(empty string)"}"`, () => {
        const result = roleSchema.safeParse(role);
        expect(
          result.success,
          `roleSchema must reject the invalid/deprecated role "${role}".`,
        ).toBe(false);
      });
    }
  });

  describe("Active role count matches auth package (A3-compliant labeled count)", () => {
    it("accepts exactly 7 active roles (matching packages/auth/src/roles.ts)", () => {
      const accepted: string[] = [];
      const rejected: string[] = [];
      for (const role of ACTIVE_APP_ROLES) {
        const result = roleSchema.safeParse(role);
        if (result.success) {
          accepted.push(role);
        } else {
          rejected.push(role);
        }
      }
      // A3: labeled count
      expect(
        rejected.length,
        `Active roles rejected by roleSchema (rejected count: ${rejected.length} of ${ACTIVE_APP_ROLES.length}): ` +
          `Missing roles: ${rejected.join(", ")}. ` +
          `roleSchema enum must include: ${ACTIVE_APP_ROLES.join(", ")}`,
      ).toBe(0);
      expect(
        accepted.length,
        `Accepted role count label: ${accepted.length} of ${ACTIVE_APP_ROLES.length}`,
      ).toBe(ACTIVE_APP_ROLES.length);
    });
  });

  describe("roleSchema rejects USER role specifically (deprecated)", () => {
    it("does not accept deprecated 'USER' role", () => {
      const result = roleSchema.safeParse("USER");
      expect(
        result.success,
        "roleSchema must reject the deprecated 'USER' role. " +
          "'USER' is not in packages/auth/src/roles.ts ROLES and " +
          "must not appear in any role schema.",
      ).toBe(false);
    });
  });
});
