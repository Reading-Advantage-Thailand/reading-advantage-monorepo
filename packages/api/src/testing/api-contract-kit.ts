/**
 * Wave 2 Phase 4 — Reusable API contract-test kit.
 *
 * Generalizes the Wave 0 response-envelope assertions into a single kit
 * that every API/router test can consume. The kit parses structured
 * envelopes using Zod schemas from `@reading-advantage/types` (no substring
 * truth — anti-pattern A1).
 *
 * The kit exposes:
 *   - `envelopeCases` — the canonical list of envelope kinds the kit covers
 *     so downstream tests can assert coverage is non-vacuous (A4).
 *   - `expectSuccess / expectList / expectValidationError / ...` —
 *     one typed assertion per envelope kind. Each assertion delegates to
 *     the canonical Zod schema and throws a labeled assertion error when
 *     the response shape is wrong.
 *
 * Why this lives here:
 *   - `packages/api/src/testing/` is intentionally NOT in the package's
 *     `exports` map, so the kit is a test utility, not a shipped runtime
 *     API.
 *   - The kit does NOT import any tRPC / Next.js / transport-layer types,
 *     so domain helpers and shared contract tests can both consume it.
 *   - Each `expect*` method is implemented as a thin Zod `.parse` wrapped
 *     with a labeled error so the test failure message cites the case.
 */

import { ZodError, type ZodSchema } from "zod";
import {
  conflictEnvelopeSchema,
  forbiddenEnvelopeSchema,
  listEnvelopeSchema,
  notFoundEnvelopeSchema,
  successEnvelopeSchema,
  unauthorizedEnvelopeSchema,
  validationErrorEnvelopeSchema,
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

/**
 * Run a Zod schema against a response and rethrow Zod errors as labeled
 * `Error` instances so vitest's `toThrow()` matcher captures the message.
 */
function assertAgainstSchema<T>(
  schema: ZodSchema<T>,
  response: unknown,
  caseLabel: EnvelopeCase,
): T {
  const result = schema.safeParse(response);
  if (!result.success) {
    throw new Error(
      `[api-contract-kit] ${caseLabel} envelope failed schema validation: ${formatZodError(result.error)}`,
    );
  }
  return result.data;
}

/**
 * Format a ZodError into a single labeled line so the assertion failure
 * cites the specific issue path and message (A1 — structured, not
 * substring truth).
 */
function formatZodError(err: ZodError): string {
  return err.issues
    .map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`)
    .join("; ");
}

/**
 * Build a contract-test kit bound to the canonical envelopes shipped from
 * `@reading-advantage/types`. The kit is pure (no side effects, no DB
 * calls) so it can be used in any test — unit, integration, or
 * end-to-end — that needs to assert response-shape parity.
 *
 * @returns A reusable assertion kit with one typed `expect*` method per
 *   envelope kind and a labeled `envelopeCases` array for coverage
 *   assertions.
 */
export function buildApiContractKit(): ApiContractKit {
  const envelopeCases: EnvelopeCase[] = [
    "success",
    "list",
    "validation-error",
    "unauthenticated",
    "wrong-role",
    "forbidden",
    "not-found",
    "conflict",
  ];

  return {
    envelopeCases,
    expectSuccess(response) {
      assertAgainstSchema(successEnvelopeSchema, response, "success");
    },
    expectList(response) {
      assertAgainstSchema(listEnvelopeSchema, response, "list");
    },
    expectValidationError(response) {
      assertAgainstSchema(
        validationErrorEnvelopeSchema,
        response,
        "validation-error",
      );
    },
    expectUnauthenticated(response) {
      assertAgainstSchema(
        unauthorizedEnvelopeSchema,
        response,
        "unauthenticated",
      );
    },
    /**
     * `wrong-role` is a semantic distinction (authenticated user without
     * the required role) that maps onto the same FORBIDDEN envelope as
     * `forbidden`. Tests can use `expectWrongRole` when the policy reason
     * is role-mismatch and `expectForbidden` for tenant / ownership
     * boundaries, while the kit enforces both against the same canonical
     * shape.
     */
    expectWrongRole(response) {
      assertAgainstSchema(forbiddenEnvelopeSchema, response, "wrong-role");
    },
    expectForbidden(response) {
      assertAgainstSchema(forbiddenEnvelopeSchema, response, "forbidden");
    },
    expectNotFound(response) {
      assertAgainstSchema(notFoundEnvelopeSchema, response, "not-found");
    },
    expectConflict(response) {
      assertAgainstSchema(conflictEnvelopeSchema, response, "conflict");
    },
  };
}

export type { ApiContractKit, EnvelopeCase };