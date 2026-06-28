/**
 * Wave 0 Phase 3 — Contract adoption proof.
 *
 * Proves that at least one API/router boundary defines a local Zod schema
 * that is structurally identical to an already-exported shared schema from
 * @reading-advantage/types, instead of importing the shared contract.
 *
 * Red expectations (2026-06-28):
 *   The classes router (packages/api/src/routers/classes.ts) defines
 *   `z.object({ name: z.string().min(1).max(100) })` inline for its
 *   `create` procedure input, while @reading-advantage/types exports
 *   `createClassSchema` with the same structure. The "should import shared
 *   schema" assertion fails because the router source does not contain
 *   the import.
 *
 * Findings reference: CA-003 (API contracts inconsistent), MR-C04 (API/type
 * contract drift), Shared Foundation F-SF-007.
 *
 * Anti-pattern guards:
 *   A7: checks specific import path, not broad text filters.
 *
 * Targeted Red command:
 *   CI=true pnpm turbo run test --filter=@reading-advantage/api
 */
import { describe, it, expect, beforeAll } from "vitest";
import { z } from "zod";
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

describe("Wave 0 Phase 3 — Contract adoption proof", () => {
  describe("classes router duplicates createClassSchema from types", () => {
    let routerSource: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let typesModule: Record<string, any>;

    beforeAll(async () => {
      routerSource = readRouterSource("classes.ts");
      typesModule = await import("@reading-advantage/types");
    });

    it("classes router imports classroomResponseSchema from @reading-advantage/types (baseline)", () => {
      // This should PASS — the router already imports the output schema
      expect(
        routerSource,
        "classes.ts must import classroomResponseSchema from " +
          "@reading-advantage/types (this is the existing shared import)",
      ).toMatch(
        /import\s*\{[^}]*classroomResponseSchema[^}]*\}\s*from\s*["']@reading-advantage\/types["']/,
      );
    });

    it("classes router should import createClassSchema from @reading-advantage/types", () => {
      // This should FAIL — the router defines create input inline
      // instead of importing the shared schema.
      expect(
        routerSource,
        "classes.ts must import createClassSchema from " +
          "@reading-advantage/types for its create procedure input. " +
          "Currently the router defines z.object({ name: z.string().min(1).max(100) }) " +
          "inline, which is structurally identical to the exported createClassSchema. " +
          "This is a duplicate contract (CA-003 / MR-C04).",
      ).toMatch(
        /import\s*\{[^}]*createClassSchema[^}]*\}\s*from\s*["']@reading-advantage\/types["']/,
      );
    });

    it("shared createClassSchema exists and validates correctly", () => {
      // This should PASS — the schema exists in types
      expect(
        typesModule.createClassSchema,
        "createClassSchema must be exported from @reading-advantage/types",
      ).toBeDefined();
      const schema = typesModule.createClassSchema as z.ZodType;
      expect(schema.safeParse({ name: "Math 101" }).success).toBe(true);
      expect(schema.safeParse({ name: "" }).success).toBe(false);
    });

    it("router inline schema and shared createClassSchema produce identical validation results", () => {
      // The router uses: z.object({ name: z.string().min(1).max(100) })
      // The types package exports: createClassSchema = z.object({ name: z.string().min(1).max(100) })
      // They should be structurally identical.
      const sharedSchema = typesModule.createClassSchema as z.ZodType;
      const inlineSchema = z.object({ name: z.string().min(1).max(100) });

      const testCases = [
        { input: { name: "Valid Class" }, expected: true },
        { input: { name: "" }, expected: false },
        { input: { name: "A".repeat(101) }, expected: false },
        { input: { name: "A".repeat(100) }, expected: true },
        { input: {}, expected: false },
        { input: { name: 123 }, expected: false },
      ];

      for (const { input, expected } of testCases) {
        const sharedResult = sharedSchema.safeParse(input);
        const inlineResult = inlineSchema.safeParse(input);
        expect(
          sharedResult.success,
          `shared createClassSchema result for ${JSON.stringify(input)}`,
        ).toBe(expected);
        expect(
          inlineResult.success,
          `inline schema result for ${JSON.stringify(input)}`,
        ).toBe(expected);
        // Both should agree
        expect(
          sharedResult.success,
          `shared and inline schemas must produce the same result for ${JSON.stringify(input)}`,
        ).toBe(inlineResult.success);
      }
    });
  });

  describe("sales router imports schemas from domain, not types", () => {
    let routerSource: string;

    beforeAll(() => {
      routerSource = readRouterSource("sales.ts");
    });

    it("sales router imports output schemas from @reading-advantage/domain/sales", () => {
      // This PASSES — the router imports from domain
      expect(
        routerSource,
        "sales.ts must import schemas from @reading-advantage/domain/sales",
      ).toMatch(/import\s*\{[^}]*\}\s*from\s*["']@reading-advantage\/domain\/sales["']/);
    });

    it("sales router does NOT import output schemas from @reading-advantage/types", () => {
      // This PASSES — confirms the current state: sales schemas are not in types
      const hasTypesImport = /import\s*\{[^}]*(?:moduleOutputSchema|lessonOutputSchema|progressOutputSchema)[^}]*\}\s*from\s*["']@reading-advantage\/types["']/.test(
        routerSource,
      );
      expect(
        hasTypesImport,
        "sales.ts should import shared output schemas from " +
          "@reading-advantage/types (not only from domain). " +
          "Currently sales schemas exist only in @reading-advantage/domain/sales/schema.ts. " +
          "This means the contracts are not shared across app boundaries (CA-003).",
      ).toBe(false);
    });
  });
});
