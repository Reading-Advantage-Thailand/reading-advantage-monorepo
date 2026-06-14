/**
 * Phase 11 Red-phase contract test for the AI SDK major migration.
 *
 * Track:  `measure/tracks/ai_sdk_major_migration/`
 * Phase:  1 — Contract & Schema Definition
 *
 * The three Phase 1 tasks produce an *artifact*: the version-alignment
 * contract for the new major. This file pins that contract as a set of
 * `node:fs` reads over the manifests and the lockfile. It is a contract
 * test over artifacts, not a proof of live behaviour — the live proof
 * comes in later phases (P2 mocked-SDK call-shape tests, P3 per-app
 * smoke). See `test-strategy.md` §4 "Architecture guardrails" and §5
 * "Per-phase test approach" for the layer assignment.
 *
 * Test command (per test-strategy §6 P1 row, no DB / no network):
 *   cd packages/ai && \
 *     npx vitest run src/__tests__/phase-11-sdk-version-contract.test.ts
 *
 * (or equivalently: `pnpm --filter @reading-advantage/ai exec vitest run
 * src/__tests__/phase-11-sdk-version-contract.test.ts`).
 *
 * RED signal at HEAD (recorded in the commit body):
 *   - Task 1 manifest-major pins fail on the four v1-holdout apps and on
 *     `packages/reading-advantage-scripts`; `packages/ai` and root are
 *     already on the target major so they pass.
 *   - Task 2 DI-shape pin passes today (no direct `@ai-sdk/*` import in
 *     `packages/domain/src/ai/get-recommendation.ts`).
 *   - Task 3 lockfile single-major pins fail — `pnpm-lock.yaml` resolves
 *     BOTH `@ai-sdk/google@1.2.22` AND `@ai-sdk/google@2.0.72`, and the
 *     same v1/v2 split for `@ai-sdk/openai` and `ai`.
 *
 * The "no v1 holdout" assertion in Task 3 is the single most targeted
 * Red flag — it fails for exactly the reason Phase 3 will fix.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// `packages/ai/src/__tests__/phase-11-sdk-version-contract.test.ts`
// → up 3 levels → repo root.
const REPO_ROOT = join(__dirname, "../../../..");

// ─── Target major constants (the contract under test) ────────────────
//
// The track commits to migrating every `@ai-sdk/*` consumer to the
// v2 line. The `ai` package itself aligns to v5. These constants are
// the only place those target majors are named; if Phase 3 needs to
// pivot to a different major, change them here and re-run the test —
// the test-strategy §5 P1 "single target major" rule still holds.
const TARGET_AI_MAJOR = 5;
const TARGET_AI_SDK_PACKAGE_MAJORS: Readonly<Record<string, number>> = {
  "@ai-sdk/google": 2,
  "@ai-sdk/google-vertex": 3,
  "@ai-sdk/openai": 2,
  "@ai-sdk/provider-utils": 3,
  "@ai-sdk/react": 2,
};

// Every manifest Phase 3 must align. `packages/ai` is the chokepoint
// (already v2 today; included so a future drift trips a regression).
// Root has no @ai-sdk deps and is asserted explicitly to lock that.
const AFFECTED_MANIFESTS: ReadonlyArray<{ label: string; path: string }> = [
  { label: "root", path: "package.json" },
  { label: "packages/ai", path: "packages/ai/package.json" },
  {
    label: "packages/reading-advantage-scripts",
    path: "packages/reading-advantage-scripts/package.json",
  },
  { label: "apps/reading-advantage", path: "apps/reading-advantage/package.json" },
  { label: "apps/primary-advantage", path: "apps/primary-advantage/package.json" },
  { label: "apps/codecamp-advantage", path: "apps/codecamp-advantage/package.json" },
];

type DepsBlock = { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

function readManifest(relPath: string): DepsBlock {
  const abs = join(REPO_ROOT, relPath);
  if (!existsSync(abs)) {
    throw new Error(
      `Manifest missing at expected path ${abs} — the Phase 1 task list ` +
        "assumes the v1-holdout apps and scripts package still exist. " +
        "If one was deleted, update AFFECTED_MANIFESTS in this test.",
    );
  }
  return JSON.parse(readFileSync(abs, "utf8")) as DepsBlock;
}

function mergedDeps(manifest: DepsBlock): Record<string, string> {
  return { ...(manifest.dependencies ?? {}), ...(manifest.devDependencies ?? {}) };
}

/** True if the range is satisfied by an installed version of `major.X`. */
function rangeTargetsMajor(range: string, major: number): boolean {
  // The semver caret `^N.` matches any `N.x.y`. `^N.x.y` is equivalent
  // to `>=N.x.y <(N+1).0.0` for non-zero x; for our purposes we only
  // need the major prefix. Accept both `^N.` and bare `N.` and a few
  // other shapes pnpm emits (`~N.x`, workspace: protocol). Workspace
  // links (`workspace:*`) are out of scope for this contract.
  const match = range.match(/^[\^~]?\s*(\d+)\./);
  if (!match) return false;
  return Number(match[1]) === major;
}

function majorOfResolvedVersion(resolvedKey: string): number | null {
  // pnpm-lock keys look like `/ai@5.0.183(zod@3.25.76):` for top-level
  // packages. We grab the digits immediately after the `@` and before
  // the first `.` after them.
  const match = resolvedKey.match(/@(\d+)\.\d+\.\d+/);
  return match ? Number(match[1]) : null;
}

// ─── Task 1: Audit current `@ai-sdk/*` versions and identify breaking
//     changes. Encoded as "every affected manifest declares the target
//     major for every `@ai-sdk/*` package it imports directly". ─────
describe("Phase 11 — Task 1: every affected manifest declares the target @ai-sdk major", () => {
  for (const { label, path: relPath } of AFFECTED_MANIFESTS) {
    it(`${label}/package.json declares the target majors (or omits the dep cleanly)`, () => {
      const manifest = readManifest(relPath);
      const deps = mergedDeps(manifest);

      // `ai` is the umbrella runtime; every consumer that talks to the
      // SDK directly must declare it on the target major. The root
      // manifest intentionally has no `ai` dep (apps hoist it), so
      // we skip the assertion there.
      if (label !== "root" && existsSync(join(REPO_ROOT, relPath))) {
        if ("ai" in deps) {
          expect(
            rangeTargetsMajor(deps.ai, TARGET_AI_MAJOR),
            `${relPath}: \`ai\` must declare ^${TARGET_AI_MAJOR}.x ` +
              `to align with the new major. Today it is \`${deps.ai}\`.`,
          ).toBe(true);
        }
      }

      for (const [pkg, targetMajor] of Object.entries(TARGET_AI_SDK_PACKAGE_MAJORS)) {
        if (pkg in deps) {
          expect(
            rangeTargetsMajor(deps[pkg], targetMajor),
            `${relPath}: \`${pkg}\` must declare ^${targetMajor}.x ` +
              `to align with the new major. Today it is \`${deps[pkg]}\`.`,
          ).toBe(true);
        }
      }

      for (const pkg of Object.keys(deps).filter((name) => name.startsWith("@ai-sdk/"))) {
        expect(
          pkg in TARGET_AI_SDK_PACKAGE_MAJORS,
          `${relPath}: \`${pkg}\` is a direct @ai-sdk dependency but has no ` +
            "Phase 1 target-major contract. Add it to TARGET_AI_SDK_PACKAGE_MAJORS " +
            "or remove the direct dependency.",
        ).toBe(true);
      }
    });
  }

  it("root manifest intentionally has no direct @ai-sdk/* dependency (apps hoist them)", () => {
    // Pinning this as a regression net: the root must not start
    // declaring `@ai-sdk/*` directly, because that would let apps
    // drift off the adapter layer. The apps (and `packages/ai`)
    // own those deps.
    const root = readManifest("package.json");
    const rootDeps = mergedDeps(root);
    for (const pkg of ["@ai-sdk/openai", "@ai-sdk/google", "ai"]) {
      expect(
        pkg in rootDeps,
        `Root package.json must not declare \`${pkg}\` directly; ` +
          "apps and packages/ai own those deps. A direct root " +
          "declaration bypasses the adapter layer (spec FR-5).",
      ).toBe(false);
    }
  });
});

// ─── Task 2: Map all AI adapter call sites in `packages/domain/src/ai/`.
//     Encoded as "the domain consumer stays on the DI shape; the
//     `packages/ai` adapter chokepoint owns the only direct SDK imports".
//     See test-strategy §0 "Spec drift" and §4 "Architecture guardrails".
// ─────────────────────────────────────────────────────────────────────
describe("Phase 11 — Task 2: domain/ai consumer is decoupled from @ai-sdk/*", () => {
  const CONSUMER = "packages/domain/src/ai/get-recommendation.ts";
  const CONSUMER_INDEX = "packages/domain/src/ai/index.ts";

  it(`${CONSUMER} exists at the path the spec names`, () => {
    expect(
      existsSync(join(REPO_ROOT, CONSUMER)),
      `Expected the domain consumer at ${CONSUMER}; the spec was written ` +
        "for packages/domain/src/ai/. If the path moved, update this test " +
        "and the test-strategy §0 'Spec drift' note together.",
    ).toBe(true);
  });

  it(`${CONSUMER} does not import @ai-sdk/* directly (DI shape preserved)`, () => {
    // The DI shape is `deps.generateRecommendation`; consumers receive
    // a typed callable, not the SDK. A direct `@ai-sdk/*` import in
    // the consumer would defeat the adapter chokepoint and is
    // explicitly banned by test-strategy §4.
    const source = readFileSync(join(REPO_ROOT, CONSUMER), "utf8");
    expect(
      /from\s+["']@ai-sdk\//.test(source),
      `${CONSUMER} imports from "@ai-sdk/*" directly. The Phase 2 ` +
        "task says the domain consumer must stay on the DI shape " +
        "(`deps.generateRecommendation`) so the adapter layer is the " +
        "single point that knows about the SDK.",
    ).toBe(false);
  });

  it(`${CONSUMER} consumes an injected generateRecommendation (DI contract)`, () => {
    // Positive pin: the consumer must receive its generate function
    // through a `deps` argument, not by importing the SDK. This is
    // the contract Phase 2 will exercise via vi.mock.
    const source = readFileSync(join(REPO_ROOT, CONSUMER), "utf8");
    expect(
      /\bdeps\b/.test(source) && /generateRecommendation/.test(source),
      `${CONSUMER} must accept \`deps.generateRecommendation\` as a ` +
        "callable parameter so the adapter can inject a mock in tests.",
    ).toBe(true);
  });

  it(`${CONSUMER_INDEX} does not re-export @ai-sdk/* symbols (adapter boundary)`, () => {
    // The barrel must not leak SDK symbols into domain consumers; the
    // boundary is `AIClient` in `packages/ai/src/types.ts`.
    const indexPath = join(REPO_ROOT, CONSUMER_INDEX);
    if (!existsSync(indexPath)) {
      // No barrel: the boundary is the file path itself. No-op.
      return;
    }
    const source = readFileSync(indexPath, "utf8");
    expect(
      /from\s+["']@ai-sdk\//.test(source),
      `${CONSUMER_INDEX} re-exports from "@ai-sdk/*" — the domain ` +
        "barrel must not leak SDK symbols; the boundary is `AIClient` " +
        "in `packages/ai/src/types.ts`.",
    ).toBe(false);
  });
});

// ─── Task 3: Define version-alignment contracts for the new major.
//     Encoded as "the lockfile resolves exactly one major of each
//     `@ai-sdk/*` package, and that major matches the contract above".
//     See test-strategy §3 (zod peer) and §4 (lockfile guardrail).
// ─────────────────────────────────────────────────────────────────────
describe("Phase 11 — Task 3: pnpm-lock.yaml resolves exactly one @ai-sdk major", () => {
  const LOCKFILE = join(REPO_ROOT, "pnpm-lock.yaml");

  function readLockfile(): string {
    if (!existsSync(LOCKFILE)) {
      throw new Error(
        `${LOCKFILE} is missing; Phase 1 cannot run without a ` +
          "lockfile. Run `pnpm install` and re-run the test.",
      );
    }
    return readFileSync(LOCKFILE, "utf8");
  }

  function resolvedMajorsFor(prefix: string): number[] {
    // pnpm-lock top-level entries are `  /<name>@<version>(...):`
    // We scan for the key prefix; `majorOfResolvedVersion` pulls the
    // major out of the version segment.
    const re = new RegExp(`^  \\/${prefix}@([\\d.]+)\\(`, "gm");
    const majors: number[] = [];
    let match: RegExpExecArray | null;
    while ((match = re.exec(readLockfile())) !== null) {
      const major = majorOfResolvedVersion(`${prefix}@${match[1]}`);
      if (major !== null) majors.push(major);
    }
    return majors;
  }

  for (const [pkg, targetMajor] of [
    ["ai", TARGET_AI_MAJOR],
    ...Object.entries(TARGET_AI_SDK_PACKAGE_MAJORS),
  ] as const) {
    it(`lockfile resolves exactly one major of \`${pkg}\` and it is the target major (${targetMajor})`, () => {
      const majors = resolvedMajorsFor(pkg);
      // Unique majors in the resolution graph.
      const unique = Array.from(new Set(majors)).sort((a, b) => a - b);

      // The migration is invalid if a v1 holdout is still in the
      // graph. We assert the *set* of resolved majors is exactly the
      // singleton `{targetMajor}` — Phase 3 must remove the old
      // major from the lockfile when it updates the affected
      // manifests.
      expect(
        unique.length,
        `lockfile resolves \`${pkg}\` on ${unique.length} distinct majors ` +
          `(${unique.join(", ")}); Phase 3 must collapse to a single ` +
          `major (${targetMajor}). Today this means the v1 holdout ` +
          `apps are still pinned to the old major and the lockfile ` +
          `carries both v1 and v2.`,
      ).toBe(1);

      expect(
        unique[0] === targetMajor,
        `lockfile resolves \`${pkg}\` on major ${unique[0]}; the ` +
          `target major is ${targetMajor}. Phase 3 must align to the ` +
          `target major across every consumer.`,
      ).toBe(true);
    });

    it(`lockfile carries no v1 holdout for \`${pkg}\``, () => {
      // Negative form of the previous assertion, for clearer test
      // output: today the lockfile has BOTH v1 and v2 for
      // `@ai-sdk/openai` and `@ai-sdk/google` and `ai`.
      const majors = resolvedMajorsFor(pkg);
      const hasV1Holdout = majors.includes(1) || majors.includes(4);
      // For `ai`, the legacy major is 4; for `@ai-sdk/*`, the legacy
      // major is 1. The assertion is phrased as "no major below
      // target" for forward compatibility.
      const hasLegacyMajor = majors.some((m) => m < targetMajor);
      expect(
        hasLegacyMajor,
        `lockfile still resolves \`${pkg}\` on a legacy major ` +
          `(${majors.join(", ")}). Phase 3 must remove the legacy ` +
          `major (anything < ${targetMajor}) from every affected ` +
          `manifest and rerun \`pnpm install\`.`,
      ).toBe(false);
    });
  }

  it("zod resolves on a single major compatible with the @ai-sdk/* target peer range", () => {
    // Per test-strategy §3 "Cross-phase edge cases" item 1: `ai@5`
    // and `@ai-sdk/*@2` pin zod ranges, and the lockfile must end
    // with one zod major. The current single-resolved zod is 3.25.76
    // (see `pnpm-lock.yaml` 10481 / 10501), which is in both
    // `^3.25.x` and `^4.x.y` peer ranges; we pin the resolved major
    // is a single value to catch a future split.
    const source = readFileSync(LOCKFILE, "utf8");
    const re = /^ {2}\/zod@(\d+)\.\d+\.\d+/gm;
    const majors = new Set<number>();
    let match: RegExpExecArray | null;
    while ((match = re.exec(source)) !== null) {
      majors.add(Number(match[1]));
    }
    expect(
      majors.size,
      `lockfile resolves \`zod\` on ${majors.size} distinct majors ` +
        `(${Array.from(majors).join(", ")}); a single major is ` +
        "required so the AI SDK peer ranges are satisfiable.",
    ).toBe(1);
  });
});
