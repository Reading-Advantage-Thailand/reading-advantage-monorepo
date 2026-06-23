import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const repoRoot = new URL("../../../../", import.meta.url).pathname;
const trackDir = "measure/tracks/post_24h_audit_remediation_20260612";
const reportPath = `${trackDir}/phase1-closeout-report.md`;
const planPath = `${trackDir}/plan.md`;

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

describe("Phase 1 closeout artifact contract", () => {
  it("plan.md records a checkpoint SHA for Phase 1", () => {
    const plan = readText(planPath);
    const phase1Heading = plan.match(/^## Phase 1:.*$/m);
    assert.ok(phase1Heading, "plan.md must contain the Phase 1 heading");
    assert.match(
      phase1Heading[0],
      /\[checkpoint:\s*[a-f0-9]{7,}\]/,
      "Phase 1 heading must include a checkpoint SHA after manual verification"
    );
  });

  it("Phase 1 closeout report exists", () => {
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
      /journal-integrity\.test\.ts/,
      "automated gate must reference the journal-integrity regression test"
    );
    assert.match(
      section,
      /(env-guards|barrel-hygiene|package-esm-smoke)/,
      "automated gate must reference at least one other Phase 1 regression test"
    );
  });

  it("closeout report documents manual verification steps", () => {
    const report = readText(reportPath);
    const section = getSection(report, "manual verification steps");
    assert.ok(section.length > 0, "closeout report must contain manual verification steps");
    assert.match(
      section,
      /(journal|_journal\.json|drizzle)/i,
      "manual verification must reference the migration journal"
    );
  });

  it("closeout report documents code review findings", () => {
    const report = readText(reportPath);
    const section = getSection(report, "code review findings");
    assert.ok(section.length > 0, "closeout report must contain code review findings");
  });

  it("closeout report records the live-PG gate owner", () => {
    const report = readText(reportPath);
    const section = getSection(report, "live-PG gate");
    assert.ok(section.length > 0, "closeout report must document the live-PG gate");
    assert.match(
      section,
      /(stale-ledger\.test\.ts|ledger-doctor\.test\.ts|PG_TEST_URL)/,
      "live-PG gate must reference the opt-in PG tests"
    );
  });
});
