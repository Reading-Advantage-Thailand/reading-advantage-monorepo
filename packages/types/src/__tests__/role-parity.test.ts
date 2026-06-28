/**
 * Wave 0 Phase 2 — Cross-package role parity test.
 *
 * Proves that @reading-advantage/types role schemas accept the same
 * active role set as @reading-advantage/auth ROLES.
 *
 * Red expectations (2026-06-28):
 *   - userResponseSchema.role enum is ["INTERN","STUDENT","TEACHER","ADMIN","SYSTEM"]
 *     — missing SALES_REP and SALES_ADMIN → parse fails.
 *   - sessionResponseSchema.user.role includes deprecated "USER" → the
 *     "USER must be rejected" assertion fails.
 *
 * Targeted command:
 *   CI=true pnpm turbo run test --filter=@reading-advantage/types
 */
import { describe, it, expect } from "vitest";
import {
  userResponseSchema,
  sessionResponseSchema,
  loginResponseSchema,
} from "../index.js";

/**
 * The canonical active role set.
 * Source of truth: packages/auth/src/roles.ts ROLES object.
 * If this set drifts from the auth package, this test will catch it
 * via the auth parity test in packages/auth.
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
 * Roles that are deprecated and must NOT be accepted by any role schema.
 */
const DEPRECATED_ROLES = ["USER"] as const;

describe("Wave 0 Phase 2 — Role parity in @reading-advantage/types", () => {
  describe("ACTIVE_APP_ROLES fixture is non-empty (A4 guard)", () => {
    it("has at least one active role defined", () => {
      expect(
        ACTIVE_APP_ROLES.length,
        "ACTIVE_APP_ROLES fixture is empty — the parity test would pass " +
          "vacuously. Ensure the fixture lists every role from " +
          "packages/auth/src/roles.ts ROLES.",
      ).toBeGreaterThanOrEqual(1);
    });

    it("has at least one deprecated role defined", () => {
      expect(
        DEPRECATED_ROLES.length,
        "DEPRECATED_ROLES fixture is empty — the rejection test would pass " +
          "vacuously.",
      ).toBeGreaterThanOrEqual(1);
    });
  });

  describe("userResponseSchema.role accepts every active app role", () => {
    for (const role of ACTIVE_APP_ROLES) {
      it(`accepts "${role}"`, () => {
        const result = userResponseSchema.shape.role.safeParse(role);
        expect(
          result.success,
          `userResponseSchema.role must accept the active role "${role}". ` +
            `Missing roles in the enum indicate a parity gap with ` +
            `packages/auth/src/roles.ts ROLES. ` +
            (result.success === false
              ? `Parse error: ${result.error.message}`
              : ""),
        ).toBe(true);
      });
    }

    it("accepts all active roles in a labeled count (A3-compliant)", () => {
      const accepted: string[] = [];
      const rejected: string[] = [];
      for (const role of ACTIVE_APP_ROLES) {
        const result = userResponseSchema.shape.role.safeParse(role);
        if (result.success) {
          accepted.push(role);
        } else {
          rejected.push(role);
        }
      }
      // A3: labeled integer, not digit-only regex
      const missingRolesLabel = `Missing in userResponseSchema.role: ${rejected.join(", ")}`;
      expect(
        rejected.length,
        `Active roles rejected by userResponseSchema.role (rejected count: ${rejected.length} of ${ACTIVE_APP_ROLES.length}): ${missingRolesLabel}`,
      ).toBe(0);
    });
  });

  describe("sessionResponseSchema.user.role accepts every active app role", () => {
    for (const role of ACTIVE_APP_ROLES) {
      it(`accepts "${role}"`, () => {
        const result = sessionResponseSchema.shape.user.shape.role.safeParse(role);
        expect(
          result.success,
          `sessionResponseSchema.user.role must accept the active role "${role}". ` +
            (result.success === false
              ? `Parse error: ${result.error.message}`
              : ""),
        ).toBe(true);
      });
    }
  });

  describe("sessionResponseSchema.user.role rejects deprecated roles", () => {
    for (const role of DEPRECATED_ROLES) {
      it(`rejects deprecated role "${role}"`, () => {
        const result = sessionResponseSchema.shape.user.shape.role.safeParse(role);
        expect(
          result.success,
          `sessionResponseSchema.user.role must REJECT the deprecated role "${role}". ` +
            `The deprecated role is still accepted — remove it from the enum.`,
        ).toBe(false);
      });
    }
  });

  describe("userResponseSchema.role rejects deprecated roles", () => {
    for (const role of DEPRECATED_ROLES) {
      it(`rejects deprecated role "${role}"`, () => {
        const result = userResponseSchema.shape.role.safeParse(role);
        // userResponseSchema currently does not include USER, so this
        // should pass. It's included as a forward guard.
        expect(result.success).toBe(false);
      });
    }
  });

  describe("loginResponseSchema validates correctly shaped payloads", () => {
    it("rejects a login response with missing accessToken", () => {
      const result = loginResponseSchema.safeParse({
        refreshToken: "tok",
        user: {
          id: "u1",
          email: "test@example.com",
          name: "Test",
          role: "STUDENT",
          schoolId: null,
          xp: 0,
          level: 1,
          cefrLevel: "A1",
          createdAt: new Date(),
        },
      });
      expect(result.success, "loginResponseSchema must reject missing accessToken").toBe(false);
    });

    it("rejects a login response with missing user", () => {
      const result = loginResponseSchema.safeParse({
        accessToken: "tok",
        refreshToken: "rtok",
      });
      expect(result.success, "loginResponseSchema must reject missing user object").toBe(false);
    });

    it("rejects a login response with invalid role in user", () => {
      const result = loginResponseSchema.safeParse({
        accessToken: "tok",
        refreshToken: "rtok",
        user: {
          id: "u1",
          email: "test@example.com",
          name: "Test",
          role: "HACKER",
          schoolId: null,
          xp: 0,
          level: 1,
          cefrLevel: "A1",
          createdAt: new Date(),
        },
      });
      expect(result.success, "loginResponseSchema must reject invalid role 'HACKER'").toBe(false);
    });
  });
});
