// Red-phase Phase 6 quality-gate pinning tests.
//
// Per `measure/archive/audit_log_retention_dsar_20260605/plan.md` Phase 6
// task #3:
//   "Run `pnpm turbo run {test,check-types,build}
//    --filter=@reading-advantage/auth
//    --filter=@reading-advantage/domain
//    --filter=science-advantage`; all exit 0."
//
// This test file pins the gating infrastructure as a guard:
//
//   1. The three packages in the filter (`@reading-advantage/auth`,
//      `@reading-advantage/domain`, `science-advantage`) MUST each
//      expose the three scripts the gating command lists:
//      `test`, `check-types`, `build`.
//      A turbo run that targets a script the package does not
//      define will fail; this test catches that scenario before
//      the slow turbo invocation runs.
//
//   2. The Phase 1-6 deliverables (test files + implementation
//      files) the gate is meant to validate MUST all be present at
//      the documented paths. A phase marked complete in plan.md
//      without its deliverables on disk is a regression; this test
//      prevents the gate from reporting "all green" against a
//      phantom phase.
//
//   3. The plan's gating command is itself documented in
//      `plan.md` Phase 6 task #3; this test parses the plan to
//      assert the command and the affected packages, so a future
//      refactor of the plan cannot silently rewire the gate.
//
//   4. The two DELETE-path test files (Phase 2 retention,
//      Phase 6 boundary) MUST require `DIRECT_DATABASE_URL` —
//      this is the test-strategy §1 invariant ("any code path that
//      touches `DELETE FROM audit_events` is integration-only")
//      pinned at the file-system level so a refactor that drops
//      the env check is caught immediately.
//
// The test is unit-only (no DB) and runs against the file system
// from the repo root. It is picked up by `pnpm test` in the auth
// package (no vitest config in packages/auth/, so vitest uses
// defaults without any pnpm global setup — see run command below).
//
// Run with:
//   cd packages/auth && npx vitest run src/__tests__/phase-6-quality-gates.test.ts
//   (no DB env required; no pnpm; no global setup)
//
// The Red-phase signal: the test will fail on the
// "science-advantage exposes `check-types` script" assertion, which
// matches the AGENTS.md / tech-debt finding (F-1001) tracked for the
// `ci_typecheck_alignment_20260603` track. The Green-phase work
// adds `"check-types": "tsc --noEmit"` to `apps/science-advantage/package.json`
// and removes `ignoreBuildErrors: true` from `next.config.ts`.

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../../../");
const PLAN_PATH = resolve(
  REPO_ROOT,
  "measure/archive/audit_log_retention_dsar_20260605/plan.md",
);

interface PackageJson {
  name: string;
  scripts?: Record<string, string>;
}

function readPackageJson(relativePath: string): PackageJson {
  const abs = resolve(REPO_ROOT, relativePath);
  if (!existsSync(abs)) {
    throw new Error(`package.json not found at ${abs}`);
  }
  return JSON.parse(readFileSync(abs, "utf-8")) as PackageJson;
}

function planIncludes(text: string, fragment: string): boolean {
  return text.includes(fragment);
}

describe("Phase 6 quality gates — infrastructure pinning", () => {
  describe("Phase 6 task #3: plan documents the gating command", () => {
    it("plan.md Phase 6 task #3 contains the documented gating command", () => {
      // -----------------------------------------------------------------
      // Pin the gating command as written in the plan so a future
      // refactor of the plan cannot silently rewire which packages or
      // scripts the gate runs.
      // -----------------------------------------------------------------
      const plan = readFileSync(PLAN_PATH, "utf-8");
      expect(planIncludes(plan, "pnpm turbo run")).toBe(true);
      expect(planIncludes(plan, "--filter=@reading-advantage/auth")).toBe(true);
      expect(planIncludes(plan, "--filter=@reading-advantage/domain")).toBe(true);
      expect(planIncludes(plan, "--filter=science-advantage")).toBe(true);
      // The three scripts the gate runs.
      expect(planIncludes(plan, "test")).toBe(true);
      expect(planIncludes(plan, "check-types")).toBe(true);
      expect(planIncludes(plan, "build")).toBe(true);
      // The acceptance criterion.
      expect(planIncludes(plan, "all exit 0")).toBe(true);
    });
  });

  describe("Phase 6 task #3: filtered packages expose the gating scripts", () => {
    it("@reading-advantage/auth exposes test + check-types + build", () => {
      // -----------------------------------------------------------------
      // Each package in the filter must define the three scripts the
      // gate runs. A `pnpm turbo run` that targets a missing script
      // fails with a non-zero exit; this test pins the existence of
      // the scripts so the gate cannot silently degrade.
      // -----------------------------------------------------------------
      const pkg = readPackageJson("packages/auth/package.json");
      const scripts = pkg.scripts ?? {};
      expect(scripts["test"]).toBeDefined();
      expect(scripts["check-types"]).toBeDefined();
      expect(scripts["build"]).toBeDefined();
    });

    it("@reading-advantage/domain exposes test + check-types + build", () => {
      const pkg = readPackageJson("packages/domain/package.json");
      const scripts = pkg.scripts ?? {};
      expect(scripts["test"]).toBeDefined();
      expect(scripts["check-types"]).toBeDefined();
      expect(scripts["build"]).toBeDefined();
    });

    it("science-advantage exposes test + check-types + build (Red-phase: check-types missing)", () => {
      // -----------------------------------------------------------------
      // The Red-phase signal: this test currently FAILS because
      // `apps/science-advantage/package.json` does NOT define a
      // `check-types` script. The gating command
      // `pnpm turbo run {test,check-types,build} --filter=science-advantage`
      // therefore exits non-zero on the missing script.
      //
      // The Green-phase fix is tracked in
      // `ci_typecheck_alignment_20260603` (AGENTS.md / tech-debt F-1001,
      // F-1002, F-1003): add `"check-types": "tsc --noEmit"` to
      // `apps/science-advantage/package.json` and remove
      // `ignoreBuildErrors: true` from `next.config.ts`.
      // -----------------------------------------------------------------
      const pkg = readPackageJson("apps/science-advantage/package.json");
      const scripts = pkg.scripts ?? {};
      expect(scripts["test"]).toBeDefined();
      // Red-phase: this assertion fails until check-types is added.
      expect(scripts["check-types"]).toBeDefined();
      expect(scripts["build"]).toBeDefined();
    });
  });

  describe("Phase 6 task #3: Phase 1–6 deliverables are on disk", () => {
    it("Phase 1 (retention config) test file + implementation are present", () => {
      // -----------------------------------------------------------------
      // Phase 1 Green-phase commits (`781ff8a`, `f36ce90`) added the
      // `AUDIT_RETENTION_DAYS` env, the README, the
      // `docs/compliance/retention.md` policy, and the
      // `phase-1-docs.test.ts` doc-content test. The gate cannot
      // validate Phase 1 if any of these are missing.
      // -----------------------------------------------------------------
      expect(
        existsSync(
          resolve(
            REPO_ROOT,
            "packages/auth/src/__tests__/phase-1-docs.test.ts",
          ),
        ),
      ).toBe(true);
      expect(
        existsSync(
          resolve(REPO_ROOT, "packages/auth/src/audit-retention-config.ts"),
        ),
      ).toBe(true);
      expect(
        existsSync(resolve(REPO_ROOT, "packages/auth/README.md")),
      ).toBe(true);
      expect(
        existsSync(resolve(REPO_ROOT, "docs/compliance/retention.md")),
      ).toBe(true);
    });

    it("Phase 2 (purge function) implementation + tests are present", () => {
      expect(
        existsSync(
          resolve(REPO_ROOT, "packages/auth/src/audit-retention.ts"),
        ),
      ).toBe(true);
      expect(
        existsSync(
          resolve(
            REPO_ROOT,
            "packages/auth/src/__tests__/audit-retention.integration.test.ts",
          ),
        ),
      ).toBe(true);
      // The function must be exported from the package barrel.
      const authIndexPath = resolve(REPO_ROOT, "packages/auth/src/index.ts");
      const authIndex = readFileSync(authIndexPath, "utf-8");
      expect(authIndex.includes("purgeExpiredAuditEvents")).toBe(true);
    });

    it("Phase 3 (periodic job) implementation + integration test are present", () => {
      expect(
        existsSync(
          resolve(REPO_ROOT, "packages/auth/src/audit-retention-job.ts"),
        ),
      ).toBe(true);
      expect(
        existsSync(
          resolve(
            REPO_ROOT,
            "packages/auth/src/__tests__/audit-retention-job.integration.test.ts",
          ),
        ),
      ).toBe(true);
    });

    it("Phase 4 (DSAR domain) implementation + tests are present", () => {
      expect(
        existsSync(resolve(REPO_ROOT, "packages/domain/src/audit/dsar.ts")),
      ).toBe(true);
      expect(
        existsSync(
          resolve(
            REPO_ROOT,
            "packages/domain/src/__tests__/dsar.test.ts",
          ),
        ),
      ).toBe(true);
      expect(
        existsSync(
          resolve(
            REPO_ROOT,
            "packages/domain/src/__tests__/dsar.integration.test.ts",
          ),
        ),
      ).toBe(true);
    });

    it("Phase 5 (DSAR route) implementation + integration test are present", () => {
      expect(
        existsSync(
          resolve(
            REPO_ROOT,
            "apps/science-advantage/app/api/admin/dsar/export/route.ts",
          ),
        ),
      ).toBe(true);
      expect(
        existsSync(
          resolve(
            REPO_ROOT,
            "apps/science-advantage/app/api/admin/dsar/export/route.integration.test.ts",
          ),
        ),
      ).toBe(true);
      expect(
        existsSync(
          resolve(
            REPO_ROOT,
            "apps/science-advantage/lib/zip/minimal-zip.ts",
          ),
        ),
      ).toBe(true);
    });

    it("Phase 6 (integration + acceptance) Red-phase test files are present", () => {
      // -----------------------------------------------------------------
      // This is the meta-test for Phase 6 itself: the Red-phase
      // deliverables (the E2E test, the boundary test, this
      // quality-gate test) must all be on disk before the gate
      // can be considered complete.
      // -----------------------------------------------------------------
      expect(
        existsSync(
          resolve(
            REPO_ROOT,
            "apps/science-advantage/app/api/admin/dsar/export/dsar-export-e2e.integration.test.ts",
          ),
        ),
      ).toBe(true);
      expect(
        existsSync(
          resolve(
            REPO_ROOT,
            "packages/auth/src/__tests__/audit-retention-boundary.integration.test.ts",
          ),
        ),
      ).toBe(true);
      // The quality-gate test itself.
      expect(
        existsSync(
          resolve(
            __dirname,
            "phase-6-quality-gates.test.ts",
          ),
        ),
      ).toBe(true);
    });
  });

  describe("Phase 6 task #3: DELETE-path tests gate on DIRECT_DATABASE_URL (test-strategy §1)", () => {
    it("audit-retention.integration.test.ts fails fast when DIRECT_DATABASE_URL is missing", () => {
      // -----------------------------------------------------------------
      // test-strategy §1: "any code path that touches `DELETE FROM
      // audit_events` is integration-only. The mock DB in
      // packages/domain/src/__tests__/mock-db.ts cannot model the
      // privileged-vs-app-role split."
      //
      // The two DELETE-path tests in this track are the Phase 2
      // `audit-retention.integration.test.ts` and the Phase 6
      // `audit-retention-boundary.integration.test.ts`. Both must
      // short-circuit when `DIRECT_DATABASE_URL` is unset; otherwise
      // they would silently hit the app role and fail with a
      // `permission denied for table audit_events` error from
      // postgres — a less clear signal than a fast-fail.
      // -----------------------------------------------------------------
      const phase2 = readFileSync(
        resolve(
          REPO_ROOT,
          "packages/auth/src/__tests__/audit-retention.integration.test.ts",
        ),
        "utf-8",
      );
      expect(phase2.includes("DIRECT_DATABASE_URL")).toBe(true);

      const phase6Boundary = readFileSync(
        resolve(
          REPO_ROOT,
          "packages/auth/src/__tests__/audit-retention-boundary.integration.test.ts",
        ),
        "utf-8",
      );
      expect(phase6Boundary.includes("DIRECT_DATABASE_URL")).toBe(true);
    });
  });
});
