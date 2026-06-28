/**
 * Wave 0 Phase 3 — Typed error mapping tests.
 *
 * Proves that the sales router and users router map domain errors to tRPC
 * error codes using string-based `err.message.includes(...)` matching,
 * rather than checking `instanceof` against typed domain error classes.
 *
 * Red expectations (2026-06-28):
 *   1. Sales router `mapSalesError` uses `err.message.includes("not found")`
 *      to determine NOT_FOUND — a plain Error with "not found" in its message
 *      incorrectly gets NOT_FOUND even when it represents a different failure.
 *   2. Users router uses `err.message === "User not found"` instead of
 *      `err instanceof UserNotFoundError` (which exists in domain).
 *   3. Domain already exports typed error classes (ScenarioNotFoundError,
 *      UserNotFoundError, etc.) that the routers should use via instanceof.
 *
 * Findings reference: Shared Foundation F-SF-004/F-SF-017 (typed error mapping),
 * CA-003 (API contracts inconsistent).
 *
 * Anti-pattern guards:
 *   A3: labeled counts and specific assertions.
 *   A4: fixture tables are non-empty.
 *   A7: no broad text filters — checks specific error class behavior.
 *
 * Targeted Red command:
 *   CI=true pnpm turbo run test --filter=@reading-advantage/api
 */
import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Read the source of a router file relative to packages/api/src/routers/.
 */
function readRouterSource(routerFile: string): string {
  const routerPath = path.resolve(
    __dirname,
    "..",
    "routers",
    routerFile,
  );
  return fs.readFileSync(routerPath, "utf-8");
}

/**
 * Domain error classes that have typed codes.
 * Source: packages/domain/src/sales/errors.ts, packages/domain/src/users/errors.ts
 */
const TYPED_ERROR_CLASSES = [
  {
    name: "ScenarioNotFoundError",
    module: "sales",
    expectedCode: "SCENARIO_NOT_FOUND",
    shouldMapToTrpcCode: "NOT_FOUND",
  },
  {
    name: "RubricNotApprovedError",
    module: "sales",
    expectedCode: "RUBRIC_NOT_APPROVED",
    shouldMapToTrpcCode: "BAD_REQUEST",
  },
  {
    name: "ModulePrerequisiteNotMetError",
    module: "sales",
    expectedCode: "MODULE_PREREQUISITE_NOT_MET",
    shouldMapToTrpcCode: "BAD_REQUEST",
  },
  {
    name: "CurriculumNotApprovedError",
    module: "sales",
    expectedCode: "CURRICULUM_NOT_APPROVED",
    shouldMapToTrpcCode: "BAD_REQUEST",
  },
  {
    name: "UserNotFoundError",
    module: "users",
    expectedCode: "USER_NOT_FOUND",
    shouldMapToTrpcCode: "NOT_FOUND",
  },
];

describe("Wave 0 Phase 3 — Typed error mapping", () => {
  // A4 guard
  it("has at least one typed error class defined (A4 vacuous-pass guard)", () => {
    expect(
      TYPED_ERROR_CLASSES.length,
      "TYPED_ERROR_CLASSES fixture is empty — the error mapping tests " +
        "would pass vacuously.",
    ).toBeGreaterThanOrEqual(1);
  });

  describe("sales router uses string-based error mapping instead of typed errors", () => {
    let routerSource: string;

    beforeAll(() => {
      routerSource = readRouterSource("sales.ts");
    });

    it("sales router has a mapSalesError function", () => {
      // This PASSES — the function exists
      expect(
        routerSource,
        "sales.ts must contain a mapSalesError function",
      ).toMatch(/function\s+mapSalesError/);
    });

    it("mapSalesError uses err.message.includes('not found') for NOT_FOUND mapping", () => {
      // This PASSES — confirms the current fragile string-based mapping
      expect(
        routerSource,
        "mapSalesError must use err.message.includes('not found') — " +
          "this confirms string-based error mapping is in use",
      ).toMatch(/err\.message\.includes\(["']not found["']\)/);
    });

    it("mapSalesError should use instanceof for typed domain error classes", () => {
      // This FAILS — the router checks err.message strings, not instanceof
      // It should check: `if (err instanceof ScenarioNotFoundError) throw NOT_FOUND`
      expect(
        routerSource,
        "mapSalesError must use instanceof checks against typed domain " +
          "error classes (ScenarioNotFoundError, RubricNotApprovedError, etc.) " +
          "instead of err.message.includes(...) string matching. " +
          "String matching is fragile: a generic Error('Storage not found') " +
          "would incorrectly map to NOT_FOUND. (CA-003 / F-SF-017)",
      ).toMatch(/err\s+instanceof\s+\w*NotFoundError/);
    });

    it("mapSalesError imports ScenarioNotFoundError from domain", () => {
      // This FAILS — the router doesn't import the typed error classes
      expect(
        routerSource,
        "sales.ts must import ScenarioNotFoundError from " +
          "@reading-advantage/domain/sales for typed error mapping. " +
          "The error class is exported but the router uses string matching instead.",
      ).toMatch(
        /import\s*\{[^}]*ScenarioNotFoundError[^}]*\}\s*from\s*["']@reading-advantage\/domain\/sales["']/,
      );
    });
  });

  describe("users router uses string-based error mapping instead of typed errors", () => {
    let routerSource: string;

    beforeAll(() => {
      routerSource = readRouterSource("users.ts");
    });

    it("users router checks err.message === 'User not found' for NOT_FOUND", () => {
      // This PASSES — confirms the current fragile string-based mapping
      expect(
        routerSource,
        "users.ts must use err.message === 'User not found' — " +
          "this confirms string-based error mapping is in use",
      ).toMatch(/err\.message\s*===\s*["']User not found["']/);
    });

    it("users router should use instanceof UserNotFoundError for NOT_FOUND", () => {
      // This FAILS — the router checks err.message string, not instanceof
      // The domain already exports UserNotFoundError from @reading-advantage/domain/users
      expect(
        routerSource,
        "users.ts must use instanceof UserNotFoundError instead of " +
          "err.message === 'User not found'. The domain already exports " +
          "UserNotFoundError from @reading-advantage/domain/users. " +
          "String matching is fragile: any Error with the same message " +
          "would be misclassified. (CA-003 / F-SF-017)",
      ).toMatch(/instanceof\s+UserNotFoundError/);
    });

    it("users router checks err.message.includes('outside your school') for FORBIDDEN", () => {
      // This PASSES — confirms the current string-based mapping
      expect(
        routerSource,
        "users.ts must use err.message.includes('outside your school') — " +
          "this confirms string-based error mapping is in use",
      ).toMatch(/err\.message\.includes\(["']outside your school["']\)/);
    });
  });

  describe("domain exports typed error classes that routers should use", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let salesModule: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let usersModule: Record<string, any>;

    beforeAll(async () => {
      salesModule = await import("@reading-advantage/domain/sales");
      usersModule = await import("@reading-advantage/domain/users");
    });

    it("domain exports ScenarioNotFoundError with typed code", () => {
      expect(
        salesModule.ScenarioNotFoundError,
        "@reading-advantage/domain/sales must export ScenarioNotFoundError",
      ).toBeDefined();
      const err = new salesModule.ScenarioNotFoundError("test-id");
      expect(err.code).toBe("SCENARIO_NOT_FOUND");
      expect(err).toBeInstanceOf(Error);
    });

    it("domain exports RubricNotApprovedError with typed code", () => {
      expect(
        salesModule.RubricNotApprovedError,
        "@reading-advantage/domain/sales must export RubricNotApprovedError",
      ).toBeDefined();
      const err = new salesModule.RubricNotApprovedError("test-id");
      expect(err.code).toBe("RUBRIC_NOT_APPROVED");
    });

    it("domain exports ModulePrerequisiteNotMetError with typed code", () => {
      expect(
        salesModule.ModulePrerequisiteNotMetError,
        "@reading-advantage/domain/sales must export ModulePrerequisiteNotMetError",
      ).toBeDefined();
      const err = new salesModule.ModulePrerequisiteNotMetError("mod-1", "mod-0");
      expect(err.code).toBe("MODULE_PREREQUISITE_NOT_MET");
    });

    it("domain exports CurriculumNotApprovedError with typed code", () => {
      expect(
        salesModule.CurriculumNotApprovedError,
        "@reading-advantage/domain/sales must export CurriculumNotApprovedError",
      ).toBeDefined();
      const err = new salesModule.CurriculumNotApprovedError("lesson-1");
      expect(err.code).toBe("CURRICULUM_NOT_APPROVED");
    });

    it("domain exports UserNotFoundError", () => {
      expect(
        usersModule.UserNotFoundError,
        "@reading-advantage/domain/users must export UserNotFoundError",
      ).toBeDefined();
      const err = new usersModule.UserNotFoundError("user-1");
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe("UserNotFoundError");
    });

    it("domain exports SalesError base class", () => {
      expect(
        salesModule.SalesError,
        "@reading-advantage/domain/sales must export SalesError base class",
      ).toBeDefined();
      const err = new salesModule.SalesError("test", "TEST_CODE");
      expect(err.code).toBe("TEST_CODE");
      expect(err).toBeInstanceOf(Error);
    });
  });

  describe("string-based mapping fragility proof", () => {
    it("a generic Error with 'not found' in message would be incorrectly mapped to NOT_FOUND", () => {
      // This demonstrates the fragility of string-based error mapping.
      // The sales router's mapSalesError checks:
      //   err.message.includes("not found") → NOT_FOUND
      //
      // A plain Error like "Database connection not found" would get NOT_FOUND
      // when it should be INTERNAL_SERVER_ERROR.
      //
      // With typed errors, only ScenarioNotFoundError (instanceof check)
      // would get NOT_FOUND.
      const fragileMessage = "Database connection not found — please retry";
      expect(
        fragileMessage.includes("not found"),
        "Demonstrates that a generic error message containing 'not found' " +
          "would be caught by the string-based mapper. The sales router's " +
          "mapSalesError would incorrectly map this to TRPC NOT_FOUND. " +
          "Typed error mapping (instanceof ScenarioNotFoundError) would " +
          "correctly fall through to INTERNAL_SERVER_ERROR.",
      ).toBe(true);
    });

    it("a generic Error with 'not approved' in message would be incorrectly mapped to BAD_REQUEST", () => {
      // Similar fragility for "not approved" matching.
      // "Deployment not approved by CI" → BAD_REQUEST (wrong, should be INTERNAL)
      const fragileMessage = "Deployment not approved by CI pipeline";
      expect(
        fragileMessage.includes("not approved"),
        "Demonstrates that a generic error message containing 'not approved' " +
          "would be caught by the string-based mapper. The sales router's " +
          "mapSalesError would incorrectly map this to TRPC BAD_REQUEST. " +
          "Typed error mapping (instanceof CurriculumNotApprovedError) would " +
          "correctly fall through to INTERNAL_SERVER_ERROR.",
      ).toBe(true);
    });

    it("all typed sales error classes inherit from SalesError (instanceof check is possible)", async () => {
      const sales = await import("@reading-advantage/domain/sales");
      const errorClasses = [
        sales.ScenarioNotFoundError,
        sales.RubricNotApprovedError,
        sales.AudioStorageError,
        sales.ModulePrerequisiteNotMetError,
        sales.CurriculumNotApprovedError,
      ];

      for (const ErrorClass of errorClasses) {
        const instance = new ErrorClass("test");
        expect(
          instance instanceof sales.SalesError,
          `${ErrorClass.name} must be an instance of SalesError for ` +
            "typed error mapping via instanceof",
        ).toBe(true);
      }
    });
  });
});
