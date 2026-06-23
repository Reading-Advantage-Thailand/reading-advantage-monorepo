import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const repoRoot = new URL("../../../../", import.meta.url).pathname;

function readText(filename) {
  return readFileSync(join(repoRoot, filename), "utf8");
}

function fileExists(filename) {
  return existsSync(join(repoRoot, filename));
}

function getSection(text, heading) {
  const lines = text.split("\n");
  let inside = false;
  const result = [];
  for (const rawLine of lines) {
    if (rawLine.match(new RegExp(`^##+\\s+${heading}\\s*$`, "i"))) {
      inside = true;
      continue;
    }
    if (inside) {
      if (rawLine.match(/^##+\s/)) break;
      result.push(rawLine);
    }
  }
  return result.join("\n").trim();
}

describe("Phase 4 pnpm 11 validate & closeout contract", () => {
  it("measure/tech-stack.md documents the selected pnpm 11 version", () => {
    const techStack = readText("measure/tech-stack.md");
    assert.match(
      techStack,
      /pnpm[@\s]11\.8\.0/,
      "measure/tech-stack.md must document pnpm@11.8.0 as the selected package manager version"
    );
  });

  it("closeout report exists and documents the aggregate gate", () => {
    const reportPath = "measure/tracks/pnpm11_major_migration/closeout-report.md";
    assert.ok(fileExists(reportPath), "closeout-report.md must exist");
    const report = readText(reportPath);
    const gateSection = getSection(report, "aggregate gate");
    assert.ok(gateSection.length > 0, "closeout report must contain an aggregate gate section");
    assert.match(
      gateSection,
      /pnpm turbo run lint test check-types build/,
      "aggregate gate section must document the canonical command"
    );
    assert.match(
      gateSection,
      /(exit 0|pass|passed|successful)/i,
      "aggregate gate section must document a passing result"
    );
  });

  it("closeout report documents pnpm outdated results", () => {
    const reportPath = "measure/tracks/pnpm11_major_migration/closeout-report.md";
    assert.ok(fileExists(reportPath), "closeout-report.md must exist");
    const report = readText(reportPath);
    const section = getSection(report, "pnpm outdated");
    assert.ok(section.length > 0, "closeout report must contain a pnpm outdated section");
  });

  it("closeout report documents pnpm audit results", () => {
    const reportPath = "measure/tracks/pnpm11_major_migration/closeout-report.md";
    assert.ok(fileExists(reportPath), "closeout-report.md must exist");
    const report = readText(reportPath);
    const section = getSection(report, "pnpm audit");
    assert.ok(section.length > 0, "closeout report must contain a pnpm audit section");
  });

  it("Phase 1 baseline test is updated or archived for the post-migration state", () => {
    const baselinePath = "measure/tracks/pnpm11_major_migration/__tests__/pnpm-lock-baseline.test.mjs";
    if (!fileExists(baselinePath)) {
      return;
    }
    const baseline = readText(baselinePath);
    assert.doesNotMatch(
      baseline,
      /pnpm@8\.15\.8/,
      "Phase 1 baseline test must not assert the stale pnpm@8.15.8 version"
    );
    assert.doesNotMatch(
      baseline,
      /lockfileVersion\s*===\s*['"]6\.0['"]/,
      "Phase 1 baseline test must not assert the stale lockfileVersion 6.0"
    );
  });
});
