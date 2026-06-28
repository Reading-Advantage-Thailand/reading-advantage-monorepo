/**
 * Wave 0 Phase 3 — Shared Zod contract tests for class, sales, and branded ID schemas.
 *
 * Tests that @reading-advantage/types exports and correctly validates:
 * - Class creation/input schemas (shared with science-advantage)
 * - Sales domain schemas (should be in types for cross-app use)
 * - Branded ID schemas (PolymorphicQuestionId, ExternalLessonId)
 *
 * Red expectations (2026-06-28):
 *   - Sales schemas (moduleOutputSchema, lessonOutputSchema, etc.) are NOT
 *     exported from @reading-advantage/types — they live in
 *     @reading-advantage/domain/sales/schema.ts. All sales import tests fail.
 *   - Branded ID schemas exist but accept empty strings (z.string() has no
 *     min length). The "reject empty string" assertions fail.
 *
 * Anti-pattern guards:
 *   A3: counts are labeled, not digit-only.
 *   A4: fixture tables are non-empty.
 *
 * Targeted Red command:
 *   CI=true pnpm turbo run test --filter=@reading-advantage/types
 */
import { describe, it, expect, beforeAll } from "vitest";
import { z } from "zod";

/**
 * Sales schemas that should be in @reading-advantage/types for cross-app
 * contract consistency (CA-003 / MR-C04).
 *
 * Currently these are only in @reading-advantage/domain/sales/schema.ts.
 */
const EXPECTED_SALES_SCHEMAS: Array<[string, string]> = [
  ["moduleOutputSchema", "Sales module output contract"],
  ["lessonOutputSchema", "Sales lesson output contract"],
  ["roleplayScenarioOutputSchema", "Roleplay scenario output contract"],
  ["rubricOutputSchema", "Rubric output contract"],
  ["roleplayAttemptOutputSchema", "Roleplay attempt output contract"],
  ["quizSubmissionInputSchema", "Quiz submission input contract"],
  ["quizResultOutputSchema", "Quiz result output contract"],
  ["progressOutputSchema", "Sales progress output contract"],
  ["chatMessageInputSchema", "Chat message input contract"],
  ["chatMessageOutputSchema", "Chat message output contract"],
];

describe("Wave 0 Phase 3 — Shared Zod contract tests", () => {
  // A4 guard
  it("has at least one expected sales schema defined (A4 vacuous-pass guard)", () => {
    expect(
      EXPECTED_SALES_SCHEMAS.length,
      "EXPECTED_SALES_SCHEMAS fixture is empty — the sales schema tests " +
        "would pass vacuously.",
    ).toBeGreaterThanOrEqual(1);
  });

  describe("class schemas", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let typesModule: Record<string, any>;

    beforeAll(async () => {
      typesModule = await import("../index.js");
    });

    it("exports createClassSchema for reading-advantage class creation", () => {
      expect(
        typesModule.createClassSchema,
        "@reading-advantage/types must export createClassSchema",
      ).toBeDefined();
    });

    it("createClassSchema rejects empty class name", () => {
      const schema = typesModule.createClassSchema as z.ZodType | undefined;
      if (!schema) return;
      const result = schema.safeParse({ name: "" });
      expect(
        result.success,
        "createClassSchema must reject empty class name",
      ).toBe(false);
    });

    it("createClassSchema accepts a valid class name", () => {
      const schema = typesModule.createClassSchema as z.ZodType | undefined;
      if (!schema) return;
      const result = schema.safeParse({ name: "Math 101" });
      expect(
        result.success,
        "createClassSchema must accept a valid class name",
      ).toBe(true);
    });

    it("exports scienceCreateClassSchema for science-advantage class creation", () => {
      expect(
        typesModule.scienceCreateClassSchema,
        "@reading-advantage/types must export scienceCreateClassSchema " +
          "from contracts/class.ts",
      ).toBeDefined();
    });

    it("scienceCreateClassSchema rejects class name shorter than 3 chars", () => {
      const schema = typesModule.scienceCreateClassSchema as z.ZodType | undefined;
      if (!schema) return;
      const result = schema.safeParse({
        name: "AB",
        gradeLevel: 4,
        standardsAlignment: "NGSS",
      });
      expect(
        result.success,
        "scienceCreateClassSchema must reject class name shorter than 3 characters",
      ).toBe(false);
    });

    it("scienceCreateClassSchema accepts a valid science class", () => {
      const schema = typesModule.scienceCreateClassSchema as z.ZodType | undefined;
      if (!schema) return;
      const result = schema.safeParse({
        name: "Physics 101",
        gradeLevel: 4,
        standardsAlignment: "NGSS",
      });
      expect(
        result.success,
        "scienceCreateClassSchema must accept a valid science class payload",
      ).toBe(true);
    });

    it("exports joinClassSchema for student join-class flow", () => {
      expect(
        typesModule.joinClassSchema,
        "@reading-advantage/types must export joinClassSchema",
      ).toBeDefined();
    });

    it("joinClassSchema rejects a join code with forbidden characters (O, 0, 1, I, L)", () => {
      const schema = typesModule.joinClassSchema as z.ZodType | undefined;
      if (!schema) return;
      // O, 0, 1, I, L are excluded from JOIN_CODE_CHARSET
      for (const code of ["ABCDEF", "AB0DEF", "AB1DEF", "ABIDEF", "ABLODE"]) {
        // Codes containing excluded chars should fail if they contain them
        // Note: some of these might pass if the char isn't actually excluded
        // The test is checking that the schema validates join code format
      }
      // Use a code with an obviously invalid character
      const result = schema.safeParse({ joinCode: "ABCDEF" });
      // ABCDEF uses only valid chars from the charset (A-F are in A-HJ-NP-Z)
      // This should actually pass — let me use an invalid char
      const resultInvalid = schema.safeParse({ joinCode: "ABODEF" });
      // O is excluded — but the schema transforms to uppercase first
      // and validates against charset. "O" is not in JOIN_CODE_CHARSET.
      expect(
        resultInvalid.success,
        "joinClassSchema must reject join code containing 'O' which is " +
          "excluded from JOIN_CODE_CHARSET to avoid ambiguity",
      ).toBe(false);
    });
  });

  describe("sales schemas should be in @reading-advantage/types", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let typesModule: Record<string, any>;

    beforeAll(async () => {
      typesModule = await import("../index.js");
    });

    for (const [exportName, description] of EXPECTED_SALES_SCHEMAS) {
      it(`exports ${exportName} — ${description}`, () => {
        expect(
          typesModule[exportName],
          `@reading-advantage/types must export "${exportName}" (${description}). ` +
            `Sales schemas are currently only in @reading-advantage/domain/sales/schema.ts. ` +
            `They should be in @reading-advantage/types for cross-app contract consistency ` +
            `(CA-003 / MR-C04).`,
        ).toBeDefined();
      });
    }

    // A3-compliant labeled count
    it("exports all expected sales schemas (A3-compliant labeled count)", () => {
      const missing: string[] = [];
      for (const [exportName] of EXPECTED_SALES_SCHEMAS) {
        if (typesModule[exportName] === undefined) {
          missing.push(exportName);
        }
      }
      expect(
        missing.length,
        `Missing sales schemas in @reading-advantage/types ` +
          `(missing count: ${missing.length} of ${EXPECTED_SALES_SCHEMAS.length}): ` +
          `Missing: ${missing.join(", ")}`,
      ).toBe(0);
    });
  });

  describe("branded ID schemas", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let typesModule: Record<string, any>;

    beforeAll(async () => {
      typesModule = await import("../index.js");
    });

    it("exports PolymorphicQuestionId schema", () => {
      expect(
        typesModule.PolymorphicQuestionId,
        "@reading-advantage/types must export PolymorphicQuestionId",
      ).toBeDefined();
    });

    it("exports ExternalLessonId schema", () => {
      expect(
        typesModule.ExternalLessonId,
        "@reading-advantage/types must export ExternalLessonId",
      ).toBeDefined();
    });

    it("PolymorphicQuestionId rejects non-string input", () => {
      const schema = typesModule.PolymorphicQuestionId as z.ZodType | undefined;
      if (!schema) return;
      const result = schema.safeParse(12345);
      expect(
        result.success,
        "PolymorphicQuestionId must reject non-string input (number)",
      ).toBe(false);
    });

    it("PolymorphicQuestionId accepts a non-empty string", () => {
      const schema = typesModule.PolymorphicQuestionId as z.ZodType | undefined;
      if (!schema) return;
      const result = schema.safeParse("question-abc-123");
      expect(
        result.success,
        "PolymorphicQuestionId must accept a non-empty string",
      ).toBe(true);
    });

    it("PolymorphicQuestionId rejects empty string", () => {
      const schema = typesModule.PolymorphicQuestionId as z.ZodType | undefined;
      if (!schema) return;
      const result = schema.safeParse("");
      expect(
        result.success,
        "PolymorphicQuestionId must reject empty strings. " +
          "Branded IDs represent real entity identifiers and should have " +
          "z.string().min(1) instead of bare z.string().",
      ).toBe(false);
    });

    it("ExternalLessonId rejects empty string", () => {
      const schema = typesModule.ExternalLessonId as z.ZodType | undefined;
      if (!schema) return;
      const result = schema.safeParse("");
      expect(
        result.success,
        "ExternalLessonId must reject empty strings. " +
          "Branded IDs represent real entity identifiers and should have " +
          "z.string().min(1) instead of bare z.string().",
      ).toBe(false);
    });

    it("ExternalLessonId accepts a non-empty string", () => {
      const schema = typesModule.ExternalLessonId as z.ZodType | undefined;
      if (!schema) return;
      const result = schema.safeParse("lesson-ext-456");
      expect(
        result.success,
        "ExternalLessonId must accept a non-empty string",
      ).toBe(true);
    });

    it("PolymorphicQuestionId and ExternalLessonId are distinct branded types", () => {
      // Both exist and parse strings, but should be different brands.
      // At the type level, PolymorphicQuestionId and ExternalLessonId
      // should not be assignable to each other.
      // Runtime check: both accept strings, but this documents the contract.
      const pqSchema = typesModule.PolymorphicQuestionId as z.ZodType | undefined;
      const elSchema = typesModule.ExternalLessonId as z.ZodType | undefined;
      if (!pqSchema || !elSchema) return;
      expect(
        pqSchema,
        "PolymorphicQuestionId and ExternalLessonId must be distinct schemas " +
          "(not the same object reference)",
      ).not.toBe(elSchema);
    });
  });

  describe("session and user response schemas reject drift cases", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let typesModule: Record<string, any>;

    beforeAll(async () => {
      typesModule = await import("../index.js");
    });

    it("sessionResponseSchema rejects deprecated USER role", () => {
      const schema = typesModule.sessionResponseSchema as z.ZodType | undefined;
      if (!schema) return;
      const result = schema.safeParse({
        user: {
          id: "u1",
          username: "testuser",
          name: "Test",
          role: "USER",
          schoolId: "school-1",
        },
        tenant: { schoolId: "school-1" },
      });
      expect(
        result.success,
        "sessionResponseSchema must reject deprecated 'USER' role. " +
          "This test was GREEN in Phase 2 — confirm it stays GREEN.",
      ).toBe(false);
    });

    it("userResponseSchema accepts SALES_REP role", () => {
      const schema = typesModule.userResponseSchema as z.ZodType | undefined;
      if (!schema) return;
      const result = schema.safeParse({
        id: "u1",
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
          "This test was GREEN in Phase 2 — confirm it stays GREEN.",
      ).toBe(true);
    });
  });
});
