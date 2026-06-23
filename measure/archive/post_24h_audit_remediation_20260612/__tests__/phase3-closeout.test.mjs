import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const repoRoot = new URL("../../../../", import.meta.url).pathname;
const trackDir = "measure/tracks/post_24h_audit_remediation_20260612";
const reportPath = `${trackDir}/phase3-closeout-report.md`;
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

function safeExec(command, options = {}) {
  try {
    return {
      ok: true,
      stdout: execSync(command, {
        cwd: repoRoot,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
        ...options,
      }),
    };
  } catch (err) {
    return {
      ok: false,
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? "",
      code: err.status,
    };
  }
}

describe("Phase 3 closeout artifact contract", () => {
  it("plan.md records a checkpoint SHA for Phase 3", () => {
    const plan = readText(planPath);
    const phase3Heading = plan.match(/^## Phase 3:.*$/m);
    assert.ok(phase3Heading, "plan.md must contain the Phase 3 heading");
    assert.match(
      phase3Heading[0],
      /\[checkpoint:\s*[a-f0-9]{7,}\]/,
      "Phase 3 heading must include a checkpoint SHA after manual verification"
    );
  });

  it("Phase 3 closeout report exists", () => {
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
      /phase-6-acceptance\.test\.ts/,
      "automated gate must reference the phase-6-acceptance live-behavior test"
    );
    assert.match(
      section,
      /phase-7-closeout\.test\.ts/,
      "automated gate must reference the phase-7-closeout artifact contract test"
    );
  });

  it("closeout report documents manual verification steps", () => {
    const report = readText(reportPath);
    const section = getSection(report, "manual verification steps");
    assert.ok(section.length > 0, "closeout report must contain manual verification steps");
    assert.match(
      section,
      /(webhooks|phase-6-acceptance|phase-7-closeout|@reading-advantage\/webhooks)/i,
      "manual verification must reference the webhooks closeout tests"
    );
  });

  it("closeout report documents code review findings", () => {
    const report = readText(reportPath);
    const section = getSection(report, "code review findings");
    assert.ok(section.length > 0, "closeout report must contain code review findings");
  });

  it("closeout report records the live-gate owner for phase-6-acceptance", () => {
    const report = readText(reportPath);
    const section = getSection(report, "live-gate owner");
    assert.ok(section.length > 0, "closeout report must document the live-gate owner");
    assert.match(
      section,
      /phase-6-acceptance\.test\.ts/,
      "live-gate owner section must reference phase-6-acceptance"
    );
    assert.match(
      section,
      /(Green role|Green|manual verifier|operator)/i,
      "live-gate owner section must name the role that owns the live run"
    );
  });

  it("live proof: phase-7-closeout.test.ts passes when run in isolation", () => {
    const result = safeExec(
      "cd packages/webhooks && npx vitest run src/__tests__/phase-7-closeout.test.ts",
      { timeout: 60000 }
    );
    assert.ok(
      result.ok,
      `phase-7-closeout.test.ts must pass in isolation.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
    );
    assert.match(
      result.stdout,
      /(Test Files\s+1 passed|Tests\s+16 passed)/,
      "phase-7-closeout must report 1 file passed with 16 tests"
    );
  });
});
