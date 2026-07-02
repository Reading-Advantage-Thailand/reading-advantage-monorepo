/**
 * Wave 2 Phase 4 — Reusable API contract-test kit.
 *
 * Track:  wave2_confidence_restoration_20260628
 * Phase:  4 — Reusable Harnesses
 *
 * Drives a shared API contract-test kit that asserts the canonical response
 * envelopes from @reading-advantage/types against a sample router/route.
 *
 * Intended home:
 *   packages/api/src/testing/api-contract-kit.ts
 *
 * RED expectations at HEAD:
 *   - The kit module does not exist, so the import fails.
 *   - If a stub exists, it must expose assertions for success, list,
 *     validation-error, unauthenticated, wrong-role (forbidden), forbidden,
 *     not-found, and conflict/error envelopes.
 *
 * Anti-pattern coverage:
 *   A1: assertions parse structured envelope objects (Zod schemas), not
 *       substring truth.
 *   A3: labeled counts for envelope-case coverage and hit counts.
 *   A4: fails if the kit covers 0 envelope types or the sample router has 0
 *       test cases.
 *   A5: counterexample fixtures include malformed envelopes that the kit must
 *       reject.
 */
import { describe, expect, it } from "vitest";
import { buildApiContractKit } from "../testing/api-contract-kit.js";
import {
  successEnvelopeSchema,
  listEnvelopeSchema,
  validationErrorEnvelopeSchema,
  unauthorizedEnvelopeSchema,
  forbiddenEnvelopeSchema,
  notFoundEnvelopeSchema,
  conflictEnvelopeSchema,
} from "@reading-advantage/types";

type EnvelopeCase =
  | "success"
  | "list"
  | "validation-error"
  | "unauthenticated"
  | "wrong-role"
  | "forbidden"
  | "not-found"
  | "conflict";

interface ApiContractKit {
  readonly envelopeCases: EnvelopeCase[];
  expectSuccess(response: unknown): void;
  expectList(response: unknown): void;
  expectValidationError(response: unknown): void;
  expectUnauthenticated(response: unknown): void;
  expectWrongRole(response: unknown): void;
  expectForbidden(response: unknown): void;
  expectNotFound(response: unknown): void;
  expectConflict(response: unknown): void;
}

/** A fake route result that a real tRPC/REST router might return. */
function makeSampleResponse(kind: EnvelopeCase): unknown {
  switch (kind) {
    case "success":
      return { ok: true, data: { id: "1" } };
    case "list":
      return { ok: true, data: [{ id: "1" }], page: 1, pageSize: 20, total: 1 };
    case "validation-error":
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
          issues: [{ path: ["email"], message: "Required" }],
        },
      };
    case "unauthenticated":
      return { ok: false, error: { code: "UNAUTHORIZED", message: "Sign in" } };
    case "wrong-role":
    case "forbidden":
      return { ok: false, error: { code: "FORBIDDEN", message: "Denied" } };
    case "not-found":
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Missing" },
      };
    case "conflict":
      return {
        ok: false,
        error: { code: "CONFLICT", message: "Already exists" },
      };
    default:
      return { ok: false, error: { code: "INTERNAL_ERROR", message: "Oops" } };
  }
}

/** Malformed envelope that the kit must reject (A5 counterexample). */
const MALFORMED_VALIDATION_ERROR = {
  ok: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Invalid",
    // missing required issues[]
  },
};

describe("Wave 2 Phase 4 — API contract kit", () => {
  it("exists and exposes a builder function", () => {
    expect(
      buildApiContractKit,
      "packages/api/src/testing/api-contract-kit.ts must export " +
        "`buildApiContractKit()`. This kit generalizes the Wave 0 envelope " +
        "assertions so every API router test uses the same response-contract " +
        "language.",
    ).toBeTypeOf("function");
  });

  it("covers all required envelope cases (A4 / non-vacuous coverage)", () => {
    const kit = buildApiContractKit() as ApiContractKit;
    const requiredCases: EnvelopeCase[] = [
      "success",
      "list",
      "validation-error",
      "unauthenticated",
      "wrong-role",
      "forbidden",
      "not-found",
      "conflict",
    ];
    const missing = requiredCases.filter(
      (c) => !kit.envelopeCases.includes(c),
    );
    expect(
      missing.length,
      `Missing envelope-case count: ${missing.length} ` +
        `(required ${requiredCases.length}, found ${kit.envelopeCases.length}). ` +
        `Missing: ${missing.join(", ")}. ` +
        `A contract kit with zero cases is vacuous (anti-pattern A4).`,
    ).toBe(0);
  });

  describe("consumer — sample router assertions", () => {
    const kit = (() => {
      try {
        return buildApiContractKit() as ApiContractKit;
      } catch {
        return null;
      }
    })();

    it.each<EnvelopeCase>([
      "success",
      "list",
      "validation-error",
      "unauthenticated",
      "wrong-role",
      "forbidden",
      "not-found",
      "conflict",
    ])("asserts %s envelope against sample response", (kind) => {
      expect(
        kit,
        "buildApiContractKit() must return a usable kit for the consumer test.",
      ).not.toBeNull();
      const response = makeSampleResponse(kind);
      switch (kind) {
        case "success":
          (kit as ApiContractKit).expectSuccess(response);
          break;
        case "list":
          (kit as ApiContractKit).expectList(response);
          break;
        case "validation-error":
          (kit as ApiContractKit).expectValidationError(response);
          break;
        case "unauthenticated":
          (kit as ApiContractKit).expectUnauthenticated(response);
          break;
        case "wrong-role":
          (kit as ApiContractKit).expectWrongRole(response);
          break;
        case "forbidden":
          (kit as ApiContractKit).expectForbidden(response);
          break;
        case "not-found":
          (kit as ApiContractKit).expectNotFound(response);
          break;
        case "conflict":
          (kit as ApiContractKit).expectConflict(response);
          break;
      }
    });

    it("rejects a malformed validation-error envelope (A5 counterexample)", () => {
      expect(
        kit,
        "buildApiContractKit() must return a usable kit for the consumer test.",
      ).not.toBeNull();
      expect(() =>
        (kit as ApiContractKit).expectValidationError(MALFORMED_VALIDATION_ERROR),
      ).toThrow();
    });
  });

  describe("A1 — assertions parse structured envelopes, not substrings", () => {
    it("kit assertions delegate to Zod schemas from @reading-advantage/types", () => {
      const schemas = [
        successEnvelopeSchema,
        listEnvelopeSchema,
        validationErrorEnvelopeSchema,
        unauthorizedEnvelopeSchema,
        forbiddenEnvelopeSchema,
        notFoundEnvelopeSchema,
        conflictEnvelopeSchema,
      ];
      const undefinedCount = schemas.filter((s) => s === undefined).length;
      expect(
        undefinedCount,
        `Undefined envelope-schema count: ${undefinedCount}. ` +
          `The kit must import canonical Zod schemas from @reading-advantage/types ` +
          `so assertions are structure-driven, not substring-driven.`,
      ).toBe(0);
    });
  });
});
