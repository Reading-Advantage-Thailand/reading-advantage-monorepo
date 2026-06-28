/**
 * Wave 0 Phase 2 — Auth response validation tests for malformed
 * login/session payloads.
 *
 * Tests that @reading-advantage/types schemas correctly reject malformed
 * or partial login and session payloads that could allow invalid state
 * mutations.
 *
 * Red expectations (2026-06-28):
 *   - sessionResponseSchema.user.role accepts deprecated "USER" →
 *     the "reject USER" assertion fails.
 *   - userResponseSchema.role rejects SALES_REP/SALES_ADMIN →
 *     the "accept SALES_REP" assertion fails.
 *
 * Targeted command:
 *   CI=true pnpm turbo run test --filter=@reading-advantage/types
 */
import { describe, it, expect } from "vitest";
import {
  loginRequestSchema,
  loginResponseSchema,
  sessionResponseSchema,
  userResponseSchema,
} from "../index.js";

describe("Wave 0 Phase 2 — Auth payload validation", () => {
  describe("loginRequestSchema rejects malformed inputs", () => {
    it("rejects empty email", () => {
      const result = loginRequestSchema.safeParse({
        email: "",
        password: "password123",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing password", () => {
      const result = loginRequestSchema.safeParse({
        email: "user@example.com",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing email", () => {
      const result = loginRequestSchema.safeParse({
        password: "password123",
      });
      expect(result.success).toBe(false);
    });

    it("rejects null body", () => {
      const result = loginRequestSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it("rejects undefined body", () => {
      const result = loginRequestSchema.safeParse(undefined);
      expect(result.success).toBe(false);
    });

    it("rejects non-string password", () => {
      const result = loginRequestSchema.safeParse({
        email: "user@example.com",
        password: 12345,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("loginResponseSchema rejects malformed responses", () => {
    const validUser = {
      id: "user-123",
      email: "user@example.com",
      name: "Test User",
      role: "STUDENT",
      schoolId: "550e8400-e29b-41d4-a716-446655440000",
      xp: 100,
      level: 5,
      cefrLevel: "B1",
      createdAt: new Date(),
    };

    it("rejects response missing accessToken", () => {
      const result = loginResponseSchema.safeParse({
        refreshToken: "refresh-token-abc",
        user: validUser,
      });
      expect(result.success).toBe(false);
    });

    it("rejects response missing refreshToken", () => {
      const result = loginResponseSchema.safeParse({
        accessToken: "access-token-abc",
        user: validUser,
      });
      expect(result.success).toBe(false);
    });

    it("rejects response missing user", () => {
      const result = loginResponseSchema.safeParse({
        accessToken: "access-token-abc",
        refreshToken: "refresh-token-abc",
      });
      expect(result.success).toBe(false);
    });

    it("rejects response with empty accessToken", () => {
      const result = loginResponseSchema.safeParse({
        accessToken: "",
        refreshToken: "refresh-token-abc",
        user: validUser,
      });
      expect(result.success).toBe(false);
    });

    it("rejects response with non-string user fields", () => {
      const result = loginResponseSchema.safeParse({
        accessToken: "token",
        refreshToken: "refresh",
        user: {
          id: 123, // should be string
          email: "test@test.com",
          name: "Test",
          role: "STUDENT",
          schoolId: null,
          xp: 0,
          level: 1,
          cefrLevel: "A1",
          createdAt: new Date(),
        },
      });
      expect(result.success).toBe(false);
    });

    it("accepts a well-formed login response", () => {
      const result = loginResponseSchema.safeParse({
        accessToken: "access-token-abc",
        refreshToken: "refresh-token-abc",
        user: validUser,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("sessionResponseSchema rejects malformed sessions", () => {
    it("rejects session with missing user", () => {
      const result = sessionResponseSchema.safeParse({
        tenant: { schoolId: "school-123" },
      });
      expect(result.success).toBe(false);
    });

    it("rejects session with missing tenant", () => {
      const result = sessionResponseSchema.safeParse({
        user: {
          id: "user-1",
          username: "testuser",
          name: "Test",
          role: "STUDENT",
          schoolId: "school-123",
        },
      });
      expect(result.success).toBe(false);
    });

    it("rejects session with non-string user.id", () => {
      const result = sessionResponseSchema.safeParse({
        user: {
          id: 123,
          username: "testuser",
          name: "Test",
          role: "STUDENT",
          schoolId: "school-123",
        },
        tenant: { schoolId: "school-123" },
      });
      expect(result.success).toBe(false);
    });

    it("rejects deprecated 'USER' role in session", () => {
      const result = sessionResponseSchema.safeParse({
        user: {
          id: "user-1",
          username: "testuser",
          name: "Test",
          role: "USER",
          schoolId: "school-123",
        },
        tenant: { schoolId: "school-123" },
      });
      expect(
        result.success,
        "sessionResponseSchema.user.role must reject deprecated 'USER' role. " +
          "'USER' is not in packages/auth/src/roles.ts ROLES. " +
          "Remove it from the sessionResponseSchema enum.",
      ).toBe(false);
    });

    it("accepts SALES_REP role in session", () => {
      const result = sessionResponseSchema.safeParse({
        user: {
          id: "user-1",
          username: "salesrep",
          name: "Sales Rep",
          role: "SALES_REP",
          schoolId: "school-123",
        },
        tenant: { schoolId: "school-123" },
      });
      expect(
        result.success,
        "sessionResponseSchema must accept SALES_REP role.",
      ).toBe(true);
    });

    it("accepts SALES_ADMIN role in session", () => {
      const result = sessionResponseSchema.safeParse({
        user: {
          id: "user-1",
          username: "salesadmin",
          name: "Sales Admin",
          role: "SALES_ADMIN",
          schoolId: "school-123",
        },
        tenant: { schoolId: "school-123" },
      });
      expect(
        result.success,
        "sessionResponseSchema must accept SALES_ADMIN role.",
      ).toBe(true);
    });
  });

  describe("userResponseSchema accepts all active app roles", () => {
    it("accepts SALES_REP role", () => {
      const result = userResponseSchema.safeParse({
        id: "user-1",
        email: "sr@example.com",
        name: "Sales Rep",
        role: "SALES_REP",
        schoolId: null,
        xp: 0,
        level: 1,
        cefrLevel: "A1",
        createdAt: new Date(),
      });
      expect(
        result.success,
        "userResponseSchema must accept SALES_REP role. " +
          (result.success === false
            ? `Parse error: ${result.error.message}`
            : ""),
      ).toBe(true);
    });

    it("accepts SALES_ADMIN role", () => {
      const result = userResponseSchema.safeParse({
        id: "user-1",
        email: "sa@example.com",
        name: "Sales Admin",
        role: "SALES_ADMIN",
        schoolId: null,
        xp: 0,
        level: 1,
        cefrLevel: "A1",
        createdAt: new Date(),
      });
      expect(
        result.success,
        "userResponseSchema must accept SALES_ADMIN role. " +
          (result.success === false
            ? `Parse error: ${result.error.message}`
            : ""),
      ).toBe(true);
    });

    it("accepts INTERN role", () => {
      const result = userResponseSchema.safeParse({
        id: "user-1",
        email: "intern@example.com",
        name: "Intern",
        role: "INTERN",
        schoolId: null,
        xp: 0,
        level: 1,
        cefrLevel: "A1",
        createdAt: new Date(),
      });
      expect(result.success, "userResponseSchema must accept INTERN role").toBe(true);
    });
  });
});
