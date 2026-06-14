/**
 * Phase 12 — Closeout artifacts contract (Red-phase test for Phase 4).
 *
 * Driven by `measure/tracks/ai_sdk_major_migration/plan.md`
 * Phase 4 (Validate & Close): three tasks whose deliverables are
 *     (1) the live aggregate gate `pnpm turbo run lint test check-types build`
 *         (the live-behavior proof),
 *     (2) the captured `pnpm outdated -r --json` and `pnpm audit --json`
 *         JSON files written to
 *         `measure/tracks/ai_sdk_major_migration/artifacts/`,
 *     (3) the `measure/tech-stack.md` row that records the selected
 *         AI SDK version after the major migration.
 *
 * Per `test-strategy.md` §5 (P4) and §6 (P4 row), the closeout
 * aggregate is the **live-behavior proof** + an **artifact
 * assertion**. The MID role owns the Red contract for this phase,
 * encoding each deliverable as a test that must fail at HEAD:
 *
 *   - Task 1 (aggregate gate) → `gate-result.json` artifact that
 *     records the live `pnpm turbo run lint test check-types build`
 *     exit code (0) and per-package result counts. The MID test
 *     asserts the artifact exists with `exitCode: 0`; the live
 *     behavior (running the gate) is the JR's responsibility and
 *     is documented in the plan record below as the explicit
 *     "JR owns the live gate" plan note. This pairing is
 *     allowed by the Measure workflow ("paired with a live-
 *     behavior proof or an explicit plan note saying which
 *     later role owns the live gate").
 *   - Task 2 (outdated / audit) → two JSON files in the
 *     `artifacts/` dir, parsed, and `outdated.json` is asserted
 *     to contain zero `@ai-sdk/*` rows (the closeout invariant
 *     that no v1 / unselected-major AI SDK package is still
 *     in the resolution graph). The MID test reads the
 *     files from disk; the JR captures them via the
 *     `pnpm outdated -r --json` and `pnpm audit --json`
 *     commands.
 *   - Task 3 (tech-stack update) → `measure/tech-stack.md`
 *     is asserted to declare the selected AI SDK major
 *     versions (`ai ^5.x`, `@ai-sdk/openai ^2.x`,
 *     `@ai-sdk/google ^2.x`) in a clearly-tagged "AI SDK
 *     Migration" row, so downstream agents reading
 *     tech-stack.md can see what major the track closed on
 *     without grepping the lockfile.
 *
 * Test design:
 *   - Pure `node:fs` reads + JSON.parse; no imports from
 *     `@reading-advantage/ai` source, no DB, no network, no
 *     module mocks.
 *   - Path resolution walks from this file
 *     (`packages/ai/src/__tests__/phase-12-closeout-artifacts.test.ts`)
 *     up 3 levels to reach the repo root, then into
 *     `measure/tracks/ai_sdk_major_migration/`.
 *   - All three task `describe` blocks fail RED at HEAD because:
 *       (1) `gate-result.json` does not exist (the live gate has
 *           not been run yet);
 *       (2) `outdated.json` and `audit.json` do not exist
 *           (the `artifacts/` dir itself does not exist);
 *       (3) `measure/tech-stack.md` has the pre-migration row
 *           (`AI SDK | Google + OpenAI providers across all
 *           apps`) but no version row naming the selected
 *           major.
 *   - Once the JR Green-phase lands, the same test file
 *     flips Green: the artifacts exist, parse, satisfy the
 *     no-`@ai-sdk/*`-row invariant, and tech-stack.md has
 *     the new version row.
 *
 * Test command (targeted, no DB / no network / no SDK
 * import; matches `test-strategy.md` §6 P4 row):
 *   pnpm --filter @reading-advantage/ai exec vitest run \
 *     src/__tests__/phase-12-closeout-artifacts.test.ts
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// `packages/ai/src/__tests__/phase-12-closeout-artifacts.test.ts` →
// up 3 → repo root.
const REPO_ROOT = join(__dirname, "../../../..");

const TRACK_DIR = join(REPO_ROOT, "measure/tracks/ai_sdk_major_migration");
const ARTIFACTS_DIR = join(TRACK_DIR, "artifacts");
const GATE_RESULT_PATH = join(ARTIFACTS_DIR, "gate-result.json");
const OUTDATED_PATH = join(ARTIFACTS_DIR, "outdated.json");
const AUDIT_PATH = join(ARTIFACTS_DIR, "audit.json");
const TECH_STACK_PATH = join(REPO_ROOT, "measure/tech-stack.md");

describe("Phase 4 — Task 1: aggregate gate (pnpm turbo run lint test check-types build) is recorded as passing", () => {
  it("artifacts/ directory exists at the expected track-relative path", () => {
    // The Green-phase implementer creates the artifacts dir
    // alongside the captured JSON files. At HEAD the dir does
    // not exist (no Green work has landed yet for P4), so this
    // assertion is the active RED signal.
    expect(
      existsSync(ARTIFACTS_DIR),
      "After Phase 4 task 1 + 2, " +
        "`measure/tracks/ai_sdk_major_migration/artifacts/` must exist " +
        "as the capture directory for the gate-result + outdated + audit JSON. " +
        "Today the dir does not exist; this assertion fails RED.",
    ).toBe(true);
  });

  it("gate-result.json exists and parses as JSON", () => {
    // The Green-phase implementer runs
    //   pnpm turbo run lint test check-types build
    // and writes the exit code (0) and a per-package result
    // summary to gate-result.json. The live gate is the
    // live-behavior proof; this artifact is the durable
    // record the closeout review reads to confirm the gate
    // was green.
    expect(
      existsSync(GATE_RESULT_PATH),
      "After Phase 4 task 1, " +
        "`gate-result.json` must exist at " +
        "`measure/tracks/ai_sdk_major_migration/artifacts/gate-result.json` " +
        "and record the live aggregate-gate exit code. " +
        "Today it does not exist; this assertion fails RED.",
    ).toBe(true);
    // Once the file exists, pin the JSON parse so a corrupt
    // file (e.g. a captured shell log) flips the assertion
    // with a useful diagnostic instead of a TypeError.
    const raw = readFileSync(GATE_RESULT_PATH, "utf8");
    let parsed: unknown;
    expect(
      () => {
        parsed = JSON.parse(raw);
      },
      "gate-result.json must be valid JSON.",
    ).not.toThrow();
    expect(parsed, "gate-result.json must parse to a non-null object.").toBeTypeOf(
      "object",
    );
  });

  it("gate-result.json records exitCode: 0 (the live gate was green)", () => {
    if (!existsSync(GATE_RESULT_PATH)) {
      // The previous assertions already cover the missing-
      // file case; bail here to avoid a misleading double-
      // failure noise. The first it() is the active RED.
      return;
    }
    const raw = readFileSync(GATE_RESULT_PATH, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(
      parsed.exitCode,
      "gate-result.json must record the live gate's exit code. " +
        "The expected value is 0 — the aggregate " +
        "`pnpm turbo run lint test check-types build` is the closeout gate " +
        "and must exit clean. A non-zero value here means the migration " +
        "shipped a regression that the gate caught.",
    ).toBe(0);
    // Pin the command surface so the artifact is identifiable.
    expect(
      parsed.command,
      "gate-result.json must record the gate command so a future reader " +
        "knows which exit code 0 belongs to. The expected value is the " +
        "exact `pnpm turbo run lint test check-types build` invocation " +
        "from `test-strategy.md` §6 P4 row.",
    ).toMatch(/pnpm\s+turbo\s+run\s+lint\s+test\s+check-types\s+build/);
  });
});

describe("Phase 4 — Task 2: pnpm outdated + pnpm audit JSON captured + zero @ai-sdk/* holdouts", () => {
  it("outdated.json exists in the artifacts directory", () => {
    expect(
      existsSync(OUTDATED_PATH),
      "After Phase 4 task 2, " +
        "`measure/tracks/ai_sdk_major_migration/artifacts/outdated.json` must " +
        "exist (captured from `pnpm outdated -r --json`). " +
        "Today the file is missing; this assertion fails RED.",
    ).toBe(true);
  });

  it("outdated.json parses as JSON (pnpm's array-of-package-objects shape)", () => {
    if (!existsSync(OUTDATED_PATH)) {
      return;
    }
    const raw = readFileSync(OUTDATED_PATH, "utf8");
    let parsed: unknown;
    expect(
      () => {
        parsed = JSON.parse(raw);
      },
      "outdated.json must be valid JSON (the output of `pnpm outdated -r --json`).",
    ).not.toThrow();
    // `pnpm outdated -r --json` writes an array; allow either
    // an empty array (the closeout case) or a non-empty array
    // of package records. Both are valid pnpm shapes.
    expect(
      Array.isArray(parsed),
      "outdated.json must be a JSON array (the `pnpm outdated -r --json` shape).",
    ).toBe(true);
  });

  it("outdated.json contains zero @ai-sdk/* rows (closeout invariant)", () => {
    // The closeout invariant: after the migration, no
    // `@ai-sdk/*` package is reported as outdated because
    // every active manifest pins a major that the lockfile
    // has resolved on. Any `@ai-sdk/*` row in `outdated`
    // means a stale major survived the migration (a
    // regression or an un-bumped manifest), so the
    // contract is `expect(rows).toEqual([])`.
    if (!existsSync(OUTDATED_PATH)) {
      return;
    }
    const raw = readFileSync(OUTDATED_PATH, "utf8");
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    const aiSdkRows = parsed.filter((row) => {
      const name = typeof row.name === "string" ? row.name : "";
      return name.startsWith("@ai-sdk/") || name === "ai";
    });
    expect(
      aiSdkRows,
      "outdated.json must contain zero `@ai-sdk/*` or `ai` rows after the " +
        "closeout. The migration targeted the v5 / v2 majors; any such row " +
        "here means a manifest still pins a legacy major and the gate " +
        "should fail until it is bumped. " +
        `Today the file contains ${aiSdkRows.length} such row(s).`,
    ).toEqual([]);
  });

  it("audit.json exists in the artifacts directory", () => {
    expect(
      existsSync(AUDIT_PATH),
      "After Phase 4 task 2, " +
        "`measure/tracks/ai_sdk_major_migration/artifacts/audit.json` must " +
        "exist (captured from `pnpm audit --json`). " +
        "Today the file is missing; this assertion fails RED.",
    ).toBe(true);
  });

  it("audit.json parses as JSON", () => {
    if (!existsSync(AUDIT_PATH)) {
      return;
    }
    const raw = readFileSync(AUDIT_PATH, "utf8");
    expect(
      () => JSON.parse(raw),
      "audit.json must be valid JSON (the output of `pnpm audit --json`).",
    ).not.toThrow();
  });
});

describe("Phase 4 — Task 3: measure/tech-stack.md is updated with the selected AI SDK major", () => {
  it("tech-stack.md exists at the expected Measure path", () => {
    expect(
      () => readFileSync(TECH_STACK_PATH, "utf8"),
    ).not.toThrow();
  });

  it("tech-stack.md declares the selected `ai` major (^5.x)", () => {
    // The Green-phase implementer adds a row (or section)
    // to `tech-stack.md` recording the selected AI SDK
    // major after the migration. Pin a regex that matches
    // the v5 pin pattern in a backticked code span so the
    // assertion fires on the right anchor (not on a
    // mention of "AI SDK" in prose).
    const source = readFileSync(TECH_STACK_PATH, "utf8");
    expect(
      source,
      "tech-stack.md must contain a backticked `ai ^5.x` (or compatible) " +
        "declaration of the selected AI SDK major. " +
        "Today the file's `AI SDK` row says only " +
        "`Google + OpenAI providers across all apps` with no version.",
    ).toMatch(/`ai\s*\^5(\.\d+(\.\d+)?)?/);
  });

  it("tech-stack.md declares the selected `@ai-sdk/openai` major (^2.x)", () => {
    const source = readFileSync(TECH_STACK_PATH, "utf8");
    expect(
      source,
      "tech-stack.md must contain a backticked `@ai-sdk/openai ^2.x` " +
        "declaration of the selected OpenAI provider major. " +
        "The migration's selected major is ^2.x (per P1 Green at `43c31318`); " +
        "today the file does not name a major.",
    ).toMatch(/`@ai-sdk\/openai\s*\^2(\.\d+(\.\d+)?)?/);
  });

  it("tech-stack.md declares the selected `@ai-sdk/google` major (^2.x)", () => {
    const source = readFileSync(TECH_STACK_PATH, "utf8");
    expect(
      source,
      "tech-stack.md must contain a backticked `@ai-sdk/google ^2.x` " +
        "declaration of the selected Google provider major. " +
        "The migration's selected major is ^2.x; " +
        "today the file does not name a major.",
    ).toMatch(/`@ai-sdk\/google\s*\^2(\.\d+(\.\d+)?)?/);
  });

  it("tech-stack.md is tagged with the AI SDK migration track reference so the row is identifiable", () => {
    // A version row is only useful if a future reader can
    // tell *which* track pinned it (the prior
    // `dependency_upgrade_hardening_20260607` track also
    // touched the manifest, so the version is not unique
    // without a track anchor). Pin the ai_sdk_major_migration
    // track ID near the version rows.
    const source = readFileSync(TECH_STACK_PATH, "utf8");
    expect(
      source,
      "tech-stack.md must reference the `ai_sdk_major_migration` track " +
        "near the selected AI SDK version rows so a future reader can " +
        "trace the major decision back to the spec / plan that justified " +
        "it. Today the file has no such reference.",
    ).toMatch(/ai_sdk_major_migration/);
  });
});
