import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Wave 2 Phase 3 — CodeCamp live-production smoke opt-in guard.
 *
 * Prod-smoke tests must not default to the live production URL in local/CI
 * runs. They must be gated by RUN_LIVE_SMOKE=true (or equivalent) and an
 * explicit live URL/credential contract.
 *
 * Anti-pattern coverage:
 *   A3: labeled integer counts, never digit-only regex.
 *   A4: fails if zero prod-smoke files were scanned.
 */

const PROD_SMOKE_DIR = __dirname;
const PROD_DOMAIN = "codecamp.reading-advantage.com";
const SELF_FILE = "wave2-live-smoke-opt-in.test.ts";
const FIXTURE_DIR = "wave2-fixtures";

interface LiveDefaultHit {
  file: string;
  evidence: string;
}

function listProdSmokeFiles(): string[] {
  return readdirSync(PROD_SMOKE_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name !== SELF_FILE);
}

function stripComments(content: string): string {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\n)\s*\/\/[^\n]*/g, "$1");
}

function hasLiveProductionDefault(content: string): boolean {
  const code = stripComments(content);
  const prodLiteral = String.raw`["']https:\/\/codecamp\.reading-advantage\.com(?:\/[^"']*)?["']`;
  const fallbackToProd = new RegExp(String.raw`(?:\?\?|\|\|)\s*${prodLiteral}`);
  const directProdAssignment = new RegExp(
    String.raw`(?:const|let|var)\s+[A-Z0-9_]*URL[A-Z0-9_]*\s*=\s*${prodLiteral}`,
  );
  const envUrlWithProdFallback = new RegExp(
    String.raw`process\.env\.[A-Z0-9_]*PROD_URL[\s\S]{0,120}${prodLiteral}`,
  );
  return (
    fallbackToProd.test(code) ||
    directProdAssignment.test(code) ||
    envUrlWithProdFallback.test(code)
  );
}

function isOptInGated(content: string): boolean {
  // A7: the mere presence of the token is not enough. A file with
  // RUN_LIVE_SMOKE plus `?? "https://codecamp.reading-advantage.com"`
  // is still a live-default probe and must fail this guard.
  return /RUN_LIVE_SMOKE/.test(content) && !hasLiveProductionDefault(content);
}

function findLiveDefaults(fileNames: string[]): LiveDefaultHit[] {
  const hits: LiveDefaultHit[] = [];
  for (const name of fileNames) {
    // Static historical report data is not executable test code and cannot
    // hit production. The guard below inspects executable prod-smoke suites.
    if (name === "report-summary.json") continue;
    const content = readFileSync(resolve(PROD_SMOKE_DIR, name), "utf8");
    if (!hasLiveProductionDefault(content)) continue;
    // Extract a short evidence snippet around the first live URL occurrence.
    const idx = content.indexOf(PROD_DOMAIN);
    const start = Math.max(0, idx - 60);
    const end = Math.min(content.length, idx + 80);
    hits.push({ file: name, evidence: content.slice(start, end).replace(/\s+/g, " ") });
  }
  return hits;
}

describe("Wave 2 Phase 3 — CodeCamp live-smoke opt-in guard", () => {
  it("counterexample fixtures prove detection works", () => {
    const bad = readFileSync(
      resolve(PROD_SMOKE_DIR, FIXTURE_DIR, "live-default.fixture.ts"),
      "utf8",
    );
    const good = readFileSync(
      resolve(PROD_SMOKE_DIR, FIXTURE_DIR, "opt-in-gated.fixture.ts"),
      "utf8",
    );

    expect(
      bad.includes(PROD_DOMAIN) && !isOptInGated(bad),
      "Bad fixture must be detected as a live-default prod-smoke file",
    ).toBe(true);
    expect(
      isOptInGated(good),
      "Good fixture must be allowed because it uses RUN_LIVE_SMOKE opt-in without a production URL default",
    ).toBe(true);
  });

  it("scans at least one prod-smoke file (A4 vacuous-pass guard)", () => {
    const files = listProdSmokeFiles();
    expect(
      files.length,
      `Scanned prod-smoke file count: ${files.length}`,
    ).toBeGreaterThanOrEqual(1);
  });

  it("has zero live-default prod-smoke files", () => {
    const files = listProdSmokeFiles();
    const hits = findLiveDefaults(files);
    const hitList = hits
      .map((h) => `  - ${h.file}: ...${h.evidence}...`)
      .join("\n");
    expect(
      hits.length,
      `Live-default prod-smoke file count: ${hits.length} ` +
        `(scanned ${files.length} files).\n` +
        `Gate prod-smoke behind RUN_LIVE_SMOKE=true + a URL/credential contract:\n${hitList}`,
    ).toBe(0);
  });
});
