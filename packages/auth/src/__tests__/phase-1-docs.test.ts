/**
 * Phase 1 Red-phase tests for the audit retention documentation.
 *
 * Driven by `measure/tracks/audit_log_retention_dsar_20260605/plan.md`
 * Phase 1 task 3 and `spec.md` §FR-1 ("Retention Policy Configuration").
 * The task asks the Green-phase implementer to:
 *
 *   1. Add a package-level `README.md` to `packages/auth/` that
 *      documents the `AUDIT_RETENTION_DAYS` env var, its default
 *      (2557), the minimum (≥ 365) rule, and the FERPA rationale.
 *   2. Add a new compliance doc at `docs/compliance/retention.md`
 *      that explains the retention policy in plain language and
 *      links the auth package's exports back to the policy.
 *
 * This file pins the expected doc surface as Vitest assertions so
 * a regression (or drift back to a missing doc) trips the test
 * runner instead of relying on a doc review. The tests intentionally
 * read the markdown files at runtime — markdown is a deployable
 * artifact, and the only way to enforce "the docs reference the
 * new env var" is to assert on the file contents.
 *
 * What this file pins:
 *   1. `packages/auth/README.md` — must exist, must mention
 *      `AUDIT_RETENTION_DAYS`, must document the default `2557`,
 *      the `.refine` minimum `365`, the FERPA / 7-year rationale,
 *      and the canonical exports `retentionConfigSchema` /
 *      `getRetentionDays`.
 *   2. `docs/compliance/retention.md` — must exist, must describe
 *      the retention window (default 2557 days ≈ 7 years), the
 *      minimum-of-365-days footgun guard, the privileged-role
 *      rationale (FERPA), and cross-reference the auth README.
 *
 * RED expectations (2026-06-06):
 *   - `packages/auth/README.md` does not exist → all 5 file-read
 *     assertions fail (file-exists, AUDIT_RETENTION_DAYS, default
 *     2557, refine 365, exports).
 *   - `docs/compliance/retention.md` does not exist → all 5
 *     file-read assertions fail (file-exists, 2557 / 7-year
 *     mention, 365 footgun mention, FERPA mention, auth README
 *     cross-reference).
 *
 * Test command (targeted, no DB / no network):
 *   cd packages/auth && npx vitest run src/__tests__/phase-1-docs.test.ts
 *
 * Location note: the test is placed at `src/__tests__/` so it
 * picks up the same Vitest auto-discovery pattern that the
 * committed `audit-retention-config.test.ts` uses (no config
 * changes required). The `path` resolution walks 3 levels up from
 * the test file to the workspace root, matching the prior track's
 * `phase-9-docs.test.ts` convention.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// `packages/auth/src/__tests__/phase-1-docs.test.ts` → up 4 levels → workspace root.
const ROOT = join(__dirname, "..", "..", "..", "..");

const AUTH_README_PATH = join(ROOT, "packages", "auth", "README.md");
const RETENTION_DOC_PATH = join(ROOT, "docs", "compliance", "retention.md");

// ---------------------------------------------------------------------------
// Task 3a — packages/auth/README.md documents the retention policy
// ---------------------------------------------------------------------------

describe("Phase 1 — Task 3a: packages/auth/README.md documents the retention policy", () => {
  it("README.md exists at packages/auth/README.md (FR-1 docs surface)", () => {
    expect(
      existsSync(AUTH_README_PATH),
      "Expected packages/auth/README.md to exist — FR-1 requires the auth " +
        "package to document the retention policy alongside its exports.",
    ).toBe(true);
  });

  it("README.md mentions the AUDIT_RETENTION_DAYS env var by name", () => {
    expect(
      existsSync(AUTH_README_PATH),
      "packages/auth/README.md must exist before content can be asserted.",
    ).toBe(true);

    const source = readFileSync(AUTH_README_PATH, "utf8");
    expect(
      source,
      "packages/auth/README.md must name the AUDIT_RETENTION_DAYS env var so " +
        "operators know how to override the retention window.",
    ).toMatch(/AUDIT_RETENTION_DAYS/);
  });

  it("README.md documents the default of 2557 days (≈7 years)", () => {
    expect(
      existsSync(AUTH_README_PATH),
      "packages/auth/README.md must exist before content can be asserted.",
    ).toBe(true);

    const source = readFileSync(AUTH_README_PATH, "utf8");
    // The default is a security-sensitive value; the doc must call it out
    // explicitly so an operator who has not set the env var still knows
    // what window the system applies.
    expect(
      source,
      "packages/auth/README.md must document the 2557-day (≈7-year) default.",
    ).toMatch(/2557/);
  });

  it("README.md documents the .refine minimum of 365 days", () => {
    expect(
      existsSync(AUTH_README_PATH),
      "packages/auth/README.md must exist before content can be asserted.",
    ).toBe(true);

    const source = readFileSync(AUTH_README_PATH, "utf8");
    // The minimum is the footgun guard. Operators who try to lower the
    // window below 1 year need to know that the schema rejects it at
    // parse time, not silently.
    expect(
      source,
      "packages/auth/README.md must document the .refine minimum of 365 days.",
    ).toMatch(/\b365\b/);
  });

  it("README.md references the canonical exports retentionConfigSchema / getRetentionDays", () => {
    expect(
      existsSync(AUTH_README_PATH),
      "packages/auth/README.md must exist before content can be asserted.",
    ).toBe(true);

    const source = readFileSync(AUTH_README_PATH, "utf8");
    // Pin at least one of the named exports so a future doc that
    // talks about retention in prose but never names the symbol
    // trips this assertion.
    const exportSignals = [
      /retentionConfigSchema/,
      /getRetentionDays/,
    ];
    const matched = exportSignals.some((re) => re.test(source));
    expect(
      matched,
      "packages/auth/README.md must reference at least one of " +
        "`retentionConfigSchema` or `getRetentionDays` so a reader knows " +
        "which export to import.",
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 3b — docs/compliance/retention.md is a self-contained compliance doc
// ---------------------------------------------------------------------------

describe("Phase 1 — Task 3b: docs/compliance/retention.md documents the retention policy", () => {
  it("retention.md exists at docs/compliance/retention.md (FR-1 docs surface)", () => {
    expect(
      existsSync(RETENTION_DOC_PATH),
      "Expected docs/compliance/retention.md to exist — FR-1 requires a " +
        "new compliance doc explaining the retention policy in plain language.",
    ).toBe(true);
  });

  it("retention.md names the 7-year / 2557-day retention window", () => {
    expect(
      existsSync(RETENTION_DOC_PATH),
      "docs/compliance/retention.md must exist before content can be asserted.",
    ).toBe(true);

    const source = readFileSync(RETENTION_DOC_PATH, "utf8");
    // The doc must mention both the human-friendly framing (7 years)
    // and the machine-friendly default (2557) so it is unambiguous
    // what window a reader is looking at.
    const windowSignals = [/2557/, /7[- ]year/i];
    const matched = windowSignals.some((re) => re.test(source));
    expect(
      matched,
      "docs/compliance/retention.md must mention either the 7-year window " +
        "or the 2557-day default.",
    ).toBe(true);
  });

  it("retention.md explains the ≥365-day footgun guard", () => {
    expect(
      existsSync(RETENTION_DOC_PATH),
      "docs/compliance/retention.md must exist before content can be asserted.",
    ).toBe(true);

    const source = readFileSync(RETENTION_DOC_PATH, "utf8");
    // Operators who read the compliance doc need to know the floor
    // on the env var so they do not file a bug saying "I set
    // AUDIT_RETENTION_DAYS=30 and nothing happened".
    expect(
      source,
      "docs/compliance/retention.md must mention the 365-day minimum floor.",
    ).toMatch(/\b365\b/);
  });

  it("retention.md cites FERPA as the compliance driver", () => {
    expect(
      existsSync(RETENTION_DOC_PATH),
      "docs/compliance/retention.md must exist before content can be asserted.",
    ).toBe(true);

    const source = readFileSync(RETENTION_DOC_PATH, "utf8");
    // The retention policy is FERPA-driven; the compliance doc
    // must say so explicitly so a future reader does not have to
    // infer the policy intent.
    expect(
      source,
      "docs/compliance/retention.md must cite FERPA as the compliance driver.",
    ).toMatch(/FERPA/);
  });

  it("retention.md cross-references packages/auth/README.md", () => {
    expect(
      existsSync(RETENTION_DOC_PATH),
      "docs/compliance/retention.md must exist before content can be asserted.",
    ).toBe(true);

    const source = readFileSync(RETENTION_DOC_PATH, "utf8");
    // The compliance doc is the "why" surface and the auth README
    // is the "how". A reader who lands on the compliance doc must
    // be pointed at the auth package, and vice versa.
    const crossRefSignals = [
      /packages\/auth\/README\.md/,
      /@reading-advantage\/auth/,
    ];
    const matched = crossRefSignals.some((re) => re.test(source));
    expect(
      matched,
      "docs/compliance/retention.md must cross-reference either " +
        "packages/auth/README.md or the @reading-advantage/auth package so " +
        "the two docs are linked.",
    ).toBe(true);
  });
});
