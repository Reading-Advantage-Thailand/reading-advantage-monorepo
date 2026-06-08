import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import nextConfig from "../../next.config";

/**
 * Phase 2 — Cold-start optimization artifact contract.
 *
 * These are the **artifact-contract** tests described in
 * `measure/tracks/codecamp_infra_cold_start_20260608/test-strategy.md`
 * (Phase 2 row, "Unit (Vitest, local)" column). They parse the real
 * `Dockerfile`, `cloudbuild.yaml`, and `next.config.ts` and assert the
 * four contract guarantees that any Phase 2 implementation must satisfy.
 *
 * Contract under test:
 *   (a) `Dockerfile` defines a multi-stage `runner` stage.
 *   (b) The final image is NOT built `FROM deps` (i.e. the runner stage
 *       does not extend the heavy deps stage that holds the full
 *       `node_modules` tree).
 *   (c) `cloudbuild.yaml`'s `deploy-cloudrun` step's args include the
 *       chosen lever: `--min-instances=1` (test-strategy §7 handoff:
 *       "recommend min-instances=1 as fastest").
 *   (d) `next.config.ts` keeps `output: "standalone"` so the multi-stage
 *       build can copy only the traced subset of `node_modules` into the
 *       runner image.
 *
 * These tests are **artifact-contract only** — they prove the deploy
 * artifact is well-formed but do not prove runtime behaviour. Live
 * runtime proof is owned by:
 *   - Phase 1 `sampleColdStart` baseline (committed `c7b38bd2`),
 *   - Phase 2 local-image smoke (`scripts/smoke-local-image.sh`,
 *     gated behind `CODECAMP_LOCAL_IMAGE_SMOKE=1`, bounded by 60s),
 *   - Phase 3 re-sampling of prod after deploy.
 *
 * **Chosen lever.** Per test-strategy §7 handoff, the implementer picks
 * one of three Phase 2 levers. This track selects `--min-instances=1` as
 * the fastest, highest-impact lever (a single Cloud Run arg). The other
 * two levers (image-size reduction, Next.js startup hooks) are evaluated
 * in their own sub-tasks; their sub-check tests are intentionally absent
 * here so we don't double-cover the same surface.
 *
 * **Why this test uses inline regex, not the `_helpers/cloudbuild-parser`
 * helper.** The parser is a Green-phase deliverable. Importing it here
 * would make the contract test fail at module-resolution (not at the
 * chosen-lever assertion) — a less informative Red. Using inline regex
 * (same pattern as `phase-8-5-deployment-gate.test.ts`) makes the test
 * fail for the correct reason: `--min-instances=1` is not in the real
 * `cloudbuild.yaml` at HEAD.
 *
 * **Red expectation at HEAD:**
 *   - (a) PASSES — Dockerfile already has `FROM node:22-alpine AS runner`.
 *   - (b) PASSES — final FROM is `FROM node:22-alpine AS runner`, not `deps`.
 *   - (c) FAILS — `cloudbuild.yaml` does not contain `--min-instances=1`.
 *   - (d) PASSES — `next.config.ts` already has `output: "standalone"`.
 * Net: the suite is Red (exit 1) because (c) is unfulfilled.
 */

// ─── Repository paths ────────────────────────────────────────────
//
// Vitest runs from `apps/codecamp-advantage/`, so `process.cwd()` is the
// app root. We resolve paths from `import.meta.url` (independent of cwd)
// to keep the tests resilient to runner configuration.
const HERE = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(HERE, "../..");
const DOCKERFILE = resolve(APP_ROOT, "Dockerfile");
const CLOUDBUILD_YAML = resolve(APP_ROOT, "cloudbuild.yaml");

// ─── Inline cloudbuild deploy-step extractor ─────────────────────
//
// Mirrors the regex pattern in `phase-8-5-deployment-gate.test.ts`
// (lines 208-234): split the YAML on `  - name:` step markers, find the
// `deploy-cloudrun` block, then collect its `- "…"` arg lines.
interface CloudBuildDeployStep {
  id: string;
  rawArgs: string[];
}

function getDeployStepArgs(cloudbuildText: string): CloudBuildDeployStep | null {
  const stepBlocks = cloudbuildText.split(/\n\s+-\s+name:/);
  for (const block of stepBlocks) {
    if (!/id:\s*"deploy-cloudrun"/.test(block)) continue;
    const idMatch = block.match(/id:\s*"([^"]+)"/);
    const id = idMatch?.[1];
    if (!id) return null;
    const argMatches = [...block.matchAll(/^\s*-\s*"([^"]+)"\s*$/gm)];
    return { id, rawArgs: argMatches.map((m) => m[1]!).filter(Boolean) };
  }
  return null;
}

describe("Cold-start optimization artifact contract (Phase 2)", () => {
  it("(a) Dockerfile defines a multi-stage runner stage", () => {
    expect(existsSync(DOCKERFILE), `Dockerfile not found at ${DOCKERFILE}`).toBe(true);
    const text = readFileSync(DOCKERFILE, "utf8");
    // Anchored regex: a line whose only content (after `FROM` and whitespace)
    // is a base image followed by `AS runner`. This rejects `AS runner-test`
    // or trailing junk on the same line.
    expect(
      text,
      "Dockerfile must declare a `FROM <base> AS runner` stage so the multi-stage build can copy a minimal image into the runner",
    ).toMatch(/^FROM\s+\S+\s+AS\s+runner\s*$/m);
  });

  it("(b) Dockerfile does not build the final image FROM the deps stage", () => {
    const text = readFileSync(DOCKERFILE, "utf8");
    const fromLines = text.split(/\r?\n/).filter((l) => /^FROM\s/.test(l));
    const lastFrom = fromLines[fromLines.length - 1] ?? "";
    expect(
      lastFrom,
      `final FROM line is '${lastFrom}'; the runner image must not extend the deps stage (which carries the full node_modules tree) — it must extend a slimmer builder or base stage`,
    ).not.toMatch(/^FROM\s+deps\s*$/);
  });

  it("(c) cloudbuild.yaml deploy step includes --min-instances=1 (chosen lever)", () => {
    expect(
      existsSync(CLOUDBUILD_YAML),
      `cloudbuild.yaml not found at ${CLOUDBUILD_YAML}`,
    ).toBe(true);
    const text = readFileSync(CLOUDBUILD_YAML, "utf8");

    const step = getDeployStepArgs(text);
    expect(
      step,
      "deploy-cloudrun step not found in cloudbuild.yaml — cannot evaluate the chosen-lever contract",
    ).not.toBeNull();
    expect(
      step!.rawArgs,
      `deploy-cloudrun step args do not include --min-instances=1. Got: ${JSON.stringify(step!.rawArgs)}`,
    ).toContain("--min-instances=1");
  });

  it("(d) next.config.ts keeps output: standalone", () => {
    // The `withNextIntl` wrapper delegates property access to the underlying
    // config, so `nextConfig.output` resolves to `"standalone"` (verified
    // empirically by the sibling `next-config-security-headers.test.ts`
    // which reads `nextConfig.headers` through the same wrapper).
    expect(nextConfig.output).toBe("standalone");
  });
});
