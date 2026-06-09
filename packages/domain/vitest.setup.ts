import { vi } from "vitest";

/**
 * Global mock for tenant-registry in domain tests.
 *
 * Tests using real Drizzle tables (tenant-coverage, db-contract) call
 * vi.unmock() to restore the real registry.
 *
 * All other tests use mock DB objects (plain JS objects) that are not in the
 * registry. This mock makes classifyTable fall back to the old hasSchoolId
 * check so existing tests pass unchanged.
 */
vi.mock("./src/tenant-registry.js", () => ({
  classifyTable: (table: unknown) => {
    if (
      table &&
      typeof table === "object" &&
      "schoolId" in (table as Record<string, unknown>) &&
      (table as Record<string, unknown>).schoolId !== undefined
    ) {
      return "FLAT";
    }
    return "EXEMPT";
  },
}));
