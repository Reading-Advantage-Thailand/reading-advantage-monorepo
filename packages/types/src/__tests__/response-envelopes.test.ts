/**
 * Wave 0 Phase 3 — Shared response envelope contract tests.
 *
 * Proves that @reading-advantage/types exports standard response envelope
 * schemas for: success, list, validation error, unauthorized, forbidden,
 * not found, conflict, and internal error.
 *
 * Red expectations (2026-06-28):
 *   None of the envelope schemas are exported from @reading-advantage/types
 *   yet. Every `toBeDefined()` assertion will fail because the named export
 *   does not exist on the module.
 *
 * Anti-pattern guards:
 *   A3: every count/assertion uses labeled messages, not digit-only regex.
 *   A4: fixture table has 8 envelope types (non-empty); test fails if 0.
 *
 * Targeted Red command:
 *   CI=true pnpm turbo run test --filter=@reading-advantage/types
 */
import { describe, it, expect, beforeAll } from "vitest";
import { z } from "zod";

/**
 * The canonical set of shared response envelopes that every API boundary
 * should use. Each entry is [exportName, description].
 *
 * Source of truth: Cross-App CA-003 (API contracts inconsistent),
 * Shared Foundation F-SF-007/F-SF-017.
 */
const EXPECTED_ENVELOPES: Array<[string, string]> = [
  ["successEnvelopeSchema", "Standard success response envelope"],
  ["listEnvelopeSchema", "Paginated list response envelope"],
  ["validationErrorEnvelopeSchema", "Validation error response envelope"],
  ["unauthorizedEnvelopeSchema", "Unauthorized (401) error envelope"],
  ["forbiddenEnvelopeSchema", "Forbidden (403) error envelope"],
  ["notFoundEnvelopeSchema", "Not found (404) error envelope"],
  ["conflictEnvelopeSchema", "Conflict (409) error envelope"],
  ["internalErrorEnvelopeSchema", "Internal server error (500) envelope"],
];

describe("Wave 0 Phase 3 — Response envelope schemas exist in @reading-advantage/types", () => {
  // A4 guard: ensure the fixture table is non-empty
  it("has at least one expected envelope defined (A4 vacuous-pass guard)", () => {
    expect(
      EXPECTED_ENVELOPES.length,
      "EXPECTED_ENVELOPES fixture is empty — the envelope existence tests " +
        "would pass vacuously. Ensure the fixture lists every required " +
        "response envelope from CA-003/F-SF-007.",
    ).toBeGreaterThanOrEqual(1);
  });

  describe("each expected envelope schema is exported", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let typesModule: Record<string, any>;

    beforeAll(async () => {
      typesModule = await import("../index.js");
    });

    for (const [exportName, description] of EXPECTED_ENVELOPES) {
      it(`exports ${exportName} — ${description}`, () => {
        expect(
          typesModule[exportName],
          `@reading-advantage/types must export "${exportName}" (${description}). ` +
            `Shared response envelopes are required by CA-003 and F-SF-007 for ` +
            `consistent API error handling across all apps.`,
        ).toBeDefined();
      });
    }

    // A3-compliant labeled count of missing exports
    it("exports all expected envelopes (A3-compliant labeled count)", () => {
      const missing: string[] = [];
      for (const [exportName] of EXPECTED_ENVELOPES) {
        if (typesModule[exportName] === undefined) {
          missing.push(exportName);
        }
      }
      expect(
        missing.length,
        `Missing envelope schemas in @reading-advantage/types ` +
          `(missing count: ${missing.length} of ${EXPECTED_ENVELOPES.length}): ` +
          `Missing: ${missing.join(", ")}`,
      ).toBe(0);
    });
  });

  describe("envelope schemas validate canonical payloads", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let typesModule: Record<string, any>;

    beforeAll(async () => {
      typesModule = await import("../index.js");
    });

    it("successEnvelopeSchema parses a valid success payload", () => {
      const schema = typesModule.successEnvelopeSchema;
      if (!schema) return; // skip if missing (will be caught by existence test)
      const result = (schema as z.ZodType).safeParse({
        ok: true,
        data: { id: "1", name: "test" },
      });
      expect(
        result.success,
        "successEnvelopeSchema must parse a valid { ok: true, data } payload",
      ).toBe(true);
    });

    it("successEnvelopeSchema rejects a payload missing 'ok' field", () => {
      const schema = typesModule.successEnvelopeSchema;
      if (!schema) return;
      const result = (schema as z.ZodType).safeParse({
        data: { id: "1" },
      });
      expect(
        result.success,
        "successEnvelopeSchema must reject a payload without 'ok' field",
      ).toBe(false);
    });

    it("validationErrorEnvelopeSchema parses a valid validation error", () => {
      const schema = typesModule.validationErrorEnvelopeSchema;
      if (!schema) return;
      const result = (schema as z.ZodType).safeParse({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
          issues: [{ path: ["email"], message: "Required" }],
        },
      });
      expect(
        result.success,
        "validationErrorEnvelopeSchema must parse a valid validation error payload",
      ).toBe(true);
    });

    it("notFoundEnvelopeSchema parses a valid not-found error", () => {
      const schema = typesModule.notFoundEnvelopeSchema;
      if (!schema) return;
      const result = (schema as z.ZodType).safeParse({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Resource not found",
        },
      });
      expect(
        result.success,
        "notFoundEnvelopeSchema must parse a valid not-found error payload",
      ).toBe(true);
    });

    it("internalErrorEnvelopeSchema does not leak stack traces", () => {
      const schema = typesModule.internalErrorEnvelopeSchema;
      if (!schema) return;
      const result = (schema as z.ZodType).safeParse({
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Something went wrong",
          stack: "Error: at line 42...",
        },
      });
      expect(
        result.success,
        "internalErrorEnvelopeSchema must reject payloads that include 'stack' " +
          "field — stack traces must not be part of the response contract",
      ).toBe(false);
    });
  });
});
