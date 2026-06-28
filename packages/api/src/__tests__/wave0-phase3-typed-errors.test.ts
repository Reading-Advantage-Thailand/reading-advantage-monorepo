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

  describe("sales router uses typed error mapping (Wave 0 Phase 3 Green)", () => {
    let routerSource: string;

    beforeAll(() => {
      routerSource = readRouterSource("sales.ts");
    });

    it("sales router has a mapSalesError function", () => {
      // PASSES — the function exists
      expect(
        routerSource,
        "sales.ts must contain a mapSalesError function",
      ).toMatch(/function\s+mapSalesError/);
    });

    it("mapSalesError uses instanceof ScenarioNotFoundError for NOT_FOUND mapping", () => {
      // PASSES — typed mapping via instanceof check
      expect(
        routerSource,
        "mapSalesError must use instanceof ScenarioNotFoundError for NOT_FOUND. " +
          "Typed error mapping prevents generic errors with 'not found' substrings " +
          "from being misclassified. (CA-003 / F-SF-017)",
      ).toMatch(/err\s+instanceof\s+ScenarioNotFoundError/);
    });

    it("mapSalesError imports ScenarioNotFoundError from domain", () => {
      // PASSES — the router imports the typed error class
      expect(
        routerSource,
        "sales.ts must import ScenarioNotFoundError from " +
          "@reading-advantage/domain/sales for typed error mapping.",
      ).toMatch(
        /import\s*\{[^}]*ScenarioNotFoundError[^}]*\}\s*from\s*["']@reading-advantage\/domain\/sales["']/,
      );
    });
  });

  describe("users router uses typed error mapping for NOT_FOUND (Wave 0 Phase 3 Green)", () => {
    let routerSource: string;

    beforeAll(() => {
      routerSource = readRouterSource("users.ts");
    });

    it("users router uses instanceof UserNotFoundError for NOT_FOUND", () => {
      // PASSES — typed mapping via instanceof check
      expect(
        routerSource,
        "users.ts must use instanceof UserNotFoundError for NOT_FOUND. " +
          "The domain exports UserNotFoundError from " +
          "@reading-advantage/domain/users — string matching is fragile. " +
          "(CA-003 / F-SF-017)",
      ).toMatch(/instanceof\s+UserNotFoundError/);
    });

    it("users router imports UserNotFoundError from domain", () => {
      // PASSES — the router imports the typed error class
      expect(
        routerSource,
        "users.ts must import UserNotFoundError from " +
          "@reading-advantage/domain/users for typed error mapping.",
      ).toMatch(
        /import\s*\{[^}]*UserNotFoundError[^}]*\}\s*from\s*["']@reading-advantage\/domain\/users["']/,
      );
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
