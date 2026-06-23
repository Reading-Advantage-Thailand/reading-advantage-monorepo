import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const repoRoot = new URL("../../../../", import.meta.url).pathname;
const trackDir = "measure/tracks/post_24h_audit_remediation_20260612";
const reportPath = `${trackDir}/phase4-closeout-report.md`;
const planPath = `${trackDir}/plan.md`;
const progressPath = "packages/domain/src/codecamp/progress.ts";

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

describe("Phase 4 closeout artifact contract", () => {
  it("plan.md records a checkpoint SHA for Phase 4", () => {
    const plan = readText(planPath);
    const phase4Heading = plan.match(/^## Phase 4:.*$/m);
    assert.ok(phase4Heading, "plan.md must contain the Phase 4 heading");
    assert.match(
      phase4Heading[0],
      /\[checkpoint:\s*[a-f0-9]{7,}\]/,
      "Phase 4 heading must include a checkpoint SHA after manual verification"
    );
  });

  it("Phase 4 closeout report exists", () => {
    assert.ok(
      fileExists(reportPath),
      `${reportPath} must exist after manual verification`
    );
  });

  it("closeout report documents the automated test gate", () => {
    const report = readText(reportPath);
    const section = getSection(report, "automated test gate");
    assert.ok(section.length > 0, "closeout report must contain an automated test gate section");
    assert.match(
      section,
      /(progress\.test|packages\/domain|@reading-advantage\/domain|codecamp)/i,
      "automated gate must reference the domain/codecamp progress tests"
    );
  });

  it("closeout report documents manual verification steps", () => {
    const report = readText(reportPath);
    const section = getSection(report, "manual verification steps");
    assert.ok(section.length > 0, "closeout report must contain manual verification steps");
    assert.match(
      section,
      /(warm.dashboard|warm dashboard|prod|production|Task 23)/i,
      "manual verification must reference the deferred warm-dashboard production check"
    );
  });

  it("closeout report documents code review findings", () => {
    const report = readText(reportPath);
    const section = getSection(report, "code review findings");
    assert.ok(section.length > 0, "closeout report must contain code review findings");
  });

  it("closeout report records the live-gate owner for deferred production verification", () => {
    const report = readText(reportPath);
    const section = getSection(report, "live-gate owner");
    assert.ok(section.length > 0, "closeout report must document the live-gate owner");
    assert.match(
      section,
      /(warm.dashboard|warm dashboard|production|prod|Task 23)/i,
      "live-gate owner section must reference the warm-dashboard production verification"
    );
    assert.match(
      section,
      /(Green role|Green|manual verifier|operator|deployer)/i,
      "live-gate owner section must name the role that owns the live run"
    );
  });

  it("live proof: progress.ts imports PORTFOLIO_PROJECTS from the seed subpath", () => {
    const source = readText(progressPath);
    const importLine = source.split("\n").find((line) =>
      line.includes("PORTFOLIO_PROJECTS")
    );
    assert.ok(
      importLine,
      `${progressPath} must import PORTFOLIO_PROJECTS`
    );
    assert.match(
      importLine,
      /@reading-advantage\/db\/seed/,
      "PORTFOLIO_PROJECTS must be imported from @reading-advantage/db/seed"
    );
    assert.doesNotMatch(
      importLine,
      /from\s+["']@reading-advantage\/db["']/,
      "PORTFOLIO_PROJECTS must not be imported from the root @reading-advantage/db barrel"
    );
  });
});
