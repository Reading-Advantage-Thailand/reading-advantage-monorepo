import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const repoRoot = new URL("../../../../", import.meta.url).pathname;
const trackDir = "measure/tracks/primary_advantage_drizzle_migration_20260526";
const reportPath = `${trackDir}/audit/phase9-verification-report.md`;
const planPath = `${trackDir}/plan.md`;
const tracksPath = "measure/tracks.md";

function readText(filename) {
  return readFileSync(join(repoRoot, filename), "utf8");
}

function fileExists(filename) {
  return existsSync(join(repoRoot, filename));
}

function runCommand(args, opts = {}) {
  try {
    return execSync(args, { cwd: repoRoot, encoding: "utf8", ...opts }).trim();
  } catch (err) {
    if (opts.allowNonZero || err.status === 1) return err.stdout?.toString().trim() ?? "";
    throw err;
  }
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

function hasHeading(text, pattern) {
  return text.split("\n").some((line) => /^##+\s/.test(line) && pattern.test(line));
}

describe("Phase 9 verification and sign-off", () => {
  it("plan.md records a checkpoint SHA for Phase 9", () => {
    const plan = readText(planPath);
    const phase9Heading = plan.match(/^## Phase 9:.*$/m);
    assert.ok(phase9Heading, "plan.md must contain the Phase 9 heading");
    assert.match(
      phase9Heading[0],
      /\[checkpoint:\s*[a-f0-9]{7,}\]/,
      "Phase 9 heading must include a checkpoint SHA after verification"
    );
  });

  it("Phase 9 verification report exists with required sections", () => {
    assert.ok(
      fileExists(reportPath),
      `${reportPath} must exist after Phase 9 verification`
    );
    const report = readText(reportPath);

    const summary = getSection(report, "Summary");
    assert.ok(summary.length > 0, "report must contain a Summary section");

    const requiredHeadings = [
      { name: "FR-2 Audit Result", pattern: /FR-2\b.*Audit\b.*Result/i },
      { name: "Build Baseline", pattern: /Build\b.*Baseline/i },
      { name: "Test Baseline", pattern: /Test\b.*Baseline/i },
      { name: "Archive Confirmation", pattern: /Archive\b.*Confirmation/i },
      { name: "Final Status", pattern: /Final\b.*Status/i },
    ];

    const missing = [];
    for (const { name, pattern } of requiredHeadings) {
      if (!hasHeading(report, pattern)) {
        missing.push(name);
      }
    }
    assert.deepEqual(
      missing,
      [],
      `report missing required sections: ${missing.join(", ")}`
    );
  });

  it("FR-2 audit shows zero Prisma matches (or only comment/string matches) in apps/primary-advantage/", () => {
    const command =
      'grep -rE "(@prisma/client|@/lib/prisma|@prisma/adapter-pg|\\"prisma\\")" apps/primary-advantage/ ' +
      '--include="*.ts" --include="*.tsx" --include="*.json" | ' +
      'grep -v node_modules | grep -v .next | grep -v package-lock.json | grep -v pnpm-lock.yaml | wc -l';
    const output = runCommand(command);
    const count = Number(output);
    assert.ok(
      !Number.isNaN(count),
      `FR-2 audit command must return a numeric count; got: ${output}`
    );

    assert.ok(fileExists(reportPath), "Phase 9 report must exist");
    const report = readText(reportPath);
    const fr2Section = getSection(report, "FR-2 Audit Result");
    assert.ok(
      fr2Section.length > 0,
      "report must document FR-2 audit result"
    );
    assert.match(
      fr2Section,
      /\b\d+\b/,
      "FR-2 audit section must document a numeric match count"
    );

    const onlyCommentsOrStrings = /only\s+comments?|only\s+strings?|comment-only|string-only|benign/i.test(
      fr2Section
    );
    assert.ok(
      count === 0 || onlyCommentsOrStrings,
      `FR-2 audit found ${count} Prisma match(es); expected 0 or comment/string-only matches only`
    );
  });

  it("audit report documents build status without requiring a pass", () => {
    assert.ok(fileExists(reportPath), "Phase 9 report must exist");
    const report = readText(reportPath);
    const buildSection = getSection(report, "Build Baseline");
    assert.ok(
      buildSection.length > 0,
      "report must contain a Build Baseline section"
    );
    assert.match(
      buildSection,
      /pnpm --filter primary-advantage build|turbopack|module resolution|error|pass|fail/i,
      "Build Baseline section must document the build command or its outcome"
    );
  });

  it("audit report documents test status without requiring a pass", () => {
    assert.ok(fileExists(reportPath), "Phase 9 report must exist");
    const report = readText(reportPath);
    const testSection = getSection(report, "Test Baseline");
    assert.ok(
      testSection.length > 0,
      "report must contain a Test Baseline section"
    );
    assert.match(
      testSection,
      /pnpm --filter primary-advantage test|jest|vitest|pass|fail|baseline/i,
      "Test Baseline section must document the test command or its outcome"
    );
  });

  it("archive confirmation asserts all previous phases are complete", () => {
    assert.ok(fileExists(reportPath), "Phase 9 report must exist");
    const report = readText(reportPath);
    const archiveSection = getSection(report, "Archive Confirmation");
    assert.ok(
      archiveSection.length > 0,
      "report must contain an Archive Confirmation section"
    );

    const phases = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    const missingPhases = phases.filter(
      (p) => !new RegExp(`phase\\s*${p}\\b`, "i").test(archiveSection)
    );
    assert.deepEqual(
      missingPhases,
      [],
      `Archive Confirmation must reference every prior phase; missing: ${missingPhases.join(", ")}`
    );

    assert.match(
      archiveSection,
      /complete|pass|green|done/i,
      "Archive Confirmation must state that prior phases are complete"
    );
  });

  it("measure/tracks.md still lists the track", () => {
    const tracks = readText(tracksPath);
    const trackEntry = tracks.match(
      /^- \[[ x~]\]\s+\*\*Track: primary-advantage Prisma → Drizzle Migration\*\*.*$/m
    );
    assert.ok(
      trackEntry,
      "measure/tracks.md must contain the primary-advantage Prisma→Drizzle track entry"
    );
    assert.match(
      trackEntry[0],
      /\[ \]|\[~\]/,
      "track entry must reflect in-progress status (not yet archived)"
    );
  });

  it("Phase 9 plan tasks are marked complete with SHA evidence", () => {
    const plan = readText(planPath);
    const phase9Section = getSection(
      plan,
      "Phase 9: Verification \\u0026 Sign-Off"
    );
    assert.ok(phase9Section.length > 0, "plan must contain Phase 9 section");
    const taskLines = phase9Section
      .split("\n")
      .filter((line) => /^- \[[ x~]\]\s+Task:/.test(line));
    assert.equal(
      taskLines.length,
      5,
      "Phase 9 section must contain exactly 5 tasks"
    );

    const incomplete = [];
    for (const line of taskLines) {
      if (!/^- \[x\]\s+Task:/.test(line)) {
        incomplete.push(line.trim());
      }
      assert.match(
        line,
        /SHA `?[a-f0-9]{7,}`?/,
        `completed task must carry SHA evidence: ${line.trim()}`
      );
    }
    assert.deepEqual(
      incomplete,
      [],
      `Phase 9 tasks must all be [x] with SHA evidence; incomplete: ${incomplete.join(
        " | "
      )}`
    );
  });

  it("commit log contains checkpoints for Phases 0 through 8", () => {
    const log = runCommand("git log --oneline");
    const phases = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    const missingPhases = phases.filter(
      (p) => !new RegExp(`phase\\s*${p}\\b`, "i").test(log)
    );
    assert.deepEqual(
      missingPhases,
      [],
      `commit log must contain references to all prior phases; missing: ${missingPhases.join(", ")}`
    );
  });
});
