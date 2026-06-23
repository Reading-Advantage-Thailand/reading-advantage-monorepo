import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const repoRoot = new URL("../../../../", import.meta.url).pathname;
const trackDir = "measure/tracks/post_24h_audit_remediation_20260612";
const reportPath = `${trackDir}/phase5-closeout-report.md`;
const planPath = `${trackDir}/plan.md`;
const tracksPath = "measure/tracks.md";
const gitignorePath = ".gitignore";
const techDebtPath = "measure/tech-debt.md";

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

describe("Phase 5 closeout artifact contract", () => {
  it("plan.md records a checkpoint SHA for Phase 5", () => {
    const plan = readText(planPath);
    const phase5Heading = plan.match(/^## Phase 5:.*$/m);
    assert.ok(phase5Heading, "plan.md must contain the Phase 5 heading");
    assert.match(
      phase5Heading[0],
      /\[checkpoint:\s*[a-f0-9]{7,}\]/,
      "Phase 5 heading must include a checkpoint SHA after manual verification"
    );
  });

  it("Phase 5 closeout report exists", () => {
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
      /(phase5-closeout\.test|cross-cutting|hygiene|stash|gitignore|tracks\.md)/i,
      "automated gate must reference the Phase 5 hygiene verification"
    );
  });

  it("closeout report documents manual verification steps", () => {
    const report = readText(reportPath);
    const section = getSection(report, "manual verification steps");
    assert.ok(section.length > 0, "closeout report must contain manual verification steps");
    assert.match(
      section,
      /(stash|gitignore|generated|tracks\.md|registry)/i,
      "manual verification must reference the hygiene tasks"
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
      /(Green role|Green|manual verifier|operator)/i,
      "live-gate owner section must name the role that owns the live run"
    );
  });

  it("live proof: no undocumented stashes remain", () => {
    const stashResult = safeExec("git stash list");
    assert.ok(stashResult.ok, `git stash list must succeed: ${stashResult.stderr}`);
    const stashes = stashResult.stdout.trim();
    if (stashes.length === 0) return;

    const techDebt = readText(techDebtPath);
    const stashLines = stashes.split("\n").filter((line) => line.trim().length > 0);
    for (const stashLine of stashLines) {
      const stashMessage = stashLine.replace(/^stash@\{\d+\}:\s*/, "").trim();
      const stashTrackId = stashMessage.match(/([a-z0-9_]+_\d{8})/)?.[1] ?? stashMessage;
      const contextPattern = new RegExp(
        `(${stashTrackId}|${stashMessage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}).{0,120}(stash|deferred|preserved|follow-up)`,
        "i"
      );
      const documented = contextPattern.test(techDebt);
      assert.ok(
        documented,
        `Stash "${stashLine}" is not documented in ${techDebtPath} as deferred work. Resolve or document it.`
      );
    }
  });

  it("live proof: .gitignore ignores generated db artifacts", () => {
    const gitignore = readText(gitignorePath);
    const hasScriptJs = /packages\/db\/scripts\/\*\.js/.test(gitignore);
    const hasScriptDts = /packages\/db\/scripts\/\*\.d\.ts/.test(gitignore);
    const hasTsconfigBuild = /tsconfig\.build\.json/.test(gitignore);
    assert.ok(
      hasScriptJs || hasScriptDts || hasTsconfigBuild,
      ".gitignore must ignore generated db artifacts (packages/db/scripts/*.js, *.d.ts*, or tsconfig.build.json)"
    );
  });

  it("live proof: tracks.md marks auth_security_hardening_20260611 complete", () => {
    const tracks = readText(tracksPath);
    const state = getTrackCheckboxState(tracks, "auth_security_hardening_20260611");
    assert.equal(
      state,
      "x",
      "measure/tracks.md must mark auth_security_hardening_20260611 as [x]"
    );
  });

  it("live proof: tracks.md marks db_migration_ledger_20260611 complete", () => {
    const tracks = readText(tracksPath);
    const state = getTrackCheckboxState(tracks, "db_migration_ledger_20260611");
    assert.equal(
      state,
      "x",
      "measure/tracks.md must mark db_migration_ledger_20260611 as [x]"
    );
  });
});
