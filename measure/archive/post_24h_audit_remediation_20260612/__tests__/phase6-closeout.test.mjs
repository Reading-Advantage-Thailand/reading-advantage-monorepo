import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const repoRoot = new URL("../../../../", import.meta.url).pathname;
const trackDir = "measure/tracks/post_24h_audit_remediation_20260612";
const reportPath = `${trackDir}/phase6-closeout-report.md`;
const planPath = `${trackDir}/plan.md`;
const tracksPath = "measure/tracks.md";

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

function getPhaseSection(text, phaseHeading) {
  const lines = text.split("\n");
  let inside = false;
  const result = [];
  for (const rawLine of lines) {
    if (rawLine.match(new RegExp(`^##\\s+${phaseHeading}\\s*$`, "i"))) {
      inside = true;
      continue;
    }
    if (inside) {
      if (rawLine.match(/^##\s/)) break;
      result.push(rawLine);
    }
  }
  return result.join("\n").trim();
}

function getTrackCheckboxState(tracksText, trackId) {
  const lines = tracksText.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(trackId) && i > 0) {
      const checkboxMatch = lines[i - 1].match(/^\s*-\s*\[(.)\]/);
      if (checkboxMatch) return checkboxMatch[1];
    }
  }
  return null;
}

describe("Phase 6 closeout artifact contract", () => {
  it("plan.md records a checkpoint SHA for Phase 6", () => {
    const plan = readText(planPath);
    const phase6Heading = plan.match(/^## Phase 6:.*$/m);
    assert.ok(phase6Heading, "plan.md must contain the Phase 6 heading");
    assert.match(
      phase6Heading[0],
      /\[checkpoint:\s*[a-f0-9]{7,}\]/,
      "Phase 6 heading must include a checkpoint SHA after manual verification"
    );
  });

  it("Phase 6 closeout report exists", () => {
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
      /(phase6-closeout\.test|CI=true|turbo run test|check-types|build)/i,
      "automated gate must reference the Phase 6 full-package verification"
    );
  });

  it("closeout report documents manual verification steps", () => {
    const report = readText(reportPath);
    const section = getSection(report, "manual verification steps");
    assert.ok(section.length > 0, "closeout report must contain manual verification steps");
    assert.match(
      section,
      /(Task 28|Task 29|Task 30|Task 31|full test|type-check|build|lessons-learned|tech-debt)/i,
      "manual verification must reference the Phase 6 final verification tasks"
    );
  });

  it("closeout report documents code review findings", () => {
    const report = readText(reportPath);
    const section = getSection(report, "code review findings");
    assert.ok(section.length > 0, "closeout report must contain code review findings");
  });

  it("closeout report records the live-gate owner", () => {
    const report = readText(reportPath);
    const section = getSection(report, "live-gate owner");
    assert.ok(section.length > 0, "closeout report must document the live-gate owner");
    assert.match(
      section,
      /(Green role|Green|manual verifier|operator|acceptance auditor)/i,
      "live-gate owner section must name the role that owns the live run"
    );
  });

  it("live proof: Phase 6 tasks 28-31 are complete in plan.md", () => {
    const plan = readText(planPath);
    const phase6 = getPhaseSection(plan, "Phase 6:.*");
    assert.ok(phase6.length > 0, "plan.md must contain a Phase 6 section");
    for (const taskNum of [28, 29, 30, 31]) {
      const taskLine = phase6.split("\n").find((line) =>
        line.match(new RegExp(`^\\s*-\\s+\\[.\\]\\s+Task\\s+${taskNum}:`, "i"))
      );
      assert.ok(
        taskLine,
        `Phase 6 must contain Task ${taskNum}`
      );
      assert.match(
        taskLine,
        new RegExp(`^\\s*-\\s+\\[x\\]\\s+Task\\s+${taskNum}:`),
        `Phase 6 Task ${taskNum} must be marked [x]`
      );
    }
  });

  it("live proof: tracks.md marks post_24h_audit_remediation_20260612 complete", () => {
    const tracks = readText(tracksPath);
    const state = getTrackCheckboxState(tracks, "post_24h_audit_remediation_20260612");
    assert.equal(
      state,
      "x",
      "measure/tracks.md must mark post_24h_audit_remediation_20260612 as [x]"
    );
  });
});
