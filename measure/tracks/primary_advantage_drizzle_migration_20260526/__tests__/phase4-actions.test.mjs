import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const repoRoot = new URL("../../../../", import.meta.url).pathname;
const trackDir = "measure/tracks/primary_advantage_drizzle_migration_20260526";
const reportPath = `${trackDir}/audit/phase4-actions-report.md`;
const planPath = `${trackDir}/plan.md`;
const actionsDir = "apps/primary-advantage/actions";

const migratedFiles = [
  { path: `${actionsDir}/article.ts`, name: "article.ts" },
  { path: `${actionsDir}/flashcard.ts`, name: "flashcard.ts" },
  { path: `${actionsDir}/pratice.ts`, name: "pratice.ts" },
  { path: `${actionsDir}/question.ts`, name: "question.ts" },
  { path: `${actionsDir}/test.ts`, name: "test.ts" },
  { path: `${actionsDir}/user.ts`, name: "user.ts" },
];

const prismaMethodPattern =
  "findMany|findUnique|findFirst|create|update|delete|upsert|count|aggregate|groupBy|createMany|updateMany|deleteMany|findUniqueOrThrow|findFirstOrThrow";

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

function runGrep(args) {
  try {
    return execSync(args, { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch (err) {
    if (err.status === 1) return "";
    throw err;
  }
}

function countPrismaCalls(filePath) {
  return Number(
    runGrep(
      `grep -cE "\\bdb\\.\\w+\\.(${prismaMethodPattern})\\b" ${filePath} || true`
    ) || "0"
  );
}

function hasDrizzleImport(filePath) {
  return runGrep(`grep -E "from '@reading-advantage/db'" ${filePath}`).length > 0;
}

function hasDrizzlePattern(text) {
  const builderCalls = /\bdb\.(select|insert|update|delete)\b/.test(text);
  const clauseCalls = /\.(from\(|where\(|set\(|values\()/.test(text);
  return builderCalls && clauseCalls;
}

describe("Phase 4 actions migration artifact contract", () => {
  it("plan.md records a checkpoint SHA for Phase 4", () => {
    const plan = readText(planPath);
    const phase4Heading = plan.match(/^## Phase 4:.*$/m);
    assert.ok(phase4Heading, "plan.md must contain the Phase 4 heading");
    assert.match(
      phase4Heading[0],
      /\[checkpoint:\s*[a-f0-9]{7,}\]/,
      "Phase 4 heading must include a checkpoint SHA after actions migration verification"
    );
  });

  it("Phase 4 actions migration closeout report exists with required sections", () => {
    assert.ok(
      fileExists(reportPath),
      `${reportPath} must exist after Phase 4 closeout`
    );
    const report = readText(reportPath);
    for (const file of migratedFiles) {
      const section = getSection(report, file.name.replace(/\.ts$/, ""));
      assert.ok(
        section.length > 0,
        `report must contain a section for ${file.name}`
      );
    }
    const summary = getSection(report, "Summary|Prisma.*Drizzle.*Translation|API Translation Patterns|Drizzle API Patterns Used|Deferred Items");
    assert.ok(
      summary.length > 0,
      "report must contain a Summary section documenting Prisma→Drizzle API translation patterns"
    );
    assert.match(
      summary,
      /(select|insert|update|delete|from|where|values|set)/i,
      "summary must mention Drizzle query builder patterns"
    );
    const deferred = getSection(report, "Deferred Items|Deferred|Out of Scope|Follow-up");
    assert.ok(
      deferred.length > 0,
      "report must contain a Deferred Items section"
    );
  });

  it("each migrated action file no longer contains Prisma-shaped db.<table>.<method> calls", () => {
    const offenders = [];
    for (const file of migratedFiles) {
      const count = countPrismaCalls(file.path);
      if (count > 0) {
        offenders.push(`${file.name}: ${count}`);
      }
    }
    assert.deepEqual(
      offenders,
      [],
      `Prisma-shaped db.<table>.<method> calls remain in: ${offenders.join(", ")}`
    );
  });

  it("each migrated action file imports from @reading-advantage/db and uses Drizzle query builder patterns", () => {
    const missingImport = [];
    const missingPatterns = [];
    for (const file of migratedFiles) {
      assert.ok(
        fileExists(file.path),
        `${file.path} must exist`
      );
      const text = readText(file.path);
      if (!hasDrizzleImport(file.path)) {
        missingImport.push(file.name);
      }
      if (!hasDrizzlePattern(text)) {
        missingPatterns.push(file.name);
      }
    }
    assert.deepEqual(
      missingImport,
      [],
      `files missing @reading-advantage/db import: ${missingImport.join(", ")}`
    );
    assert.deepEqual(
      missingPatterns,
      [],
      `files missing Drizzle query builder patterns: ${missingPatterns.join(", ")}`
    );
  });

  it("Phase 4 plan tasks are marked complete with SHA evidence", () => {
    const plan = readText(planPath);
    const phase4Section = getSection(plan, "Phase 4: Actions Migration \\(FR-2\\)");
    assert.ok(phase4Section.length > 0, "plan must contain Phase 4 section");
    const incomplete = [];
    const taskLines = phase4Section
      .split("\n")
      .filter((line) => /^- \[[ x~]\]\s+Task:/.test(line));
    assert.ok(
      taskLines.length > 0,
      "Phase 4 section must contain task checklist items"
    );
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
      `Phase 4 tasks must all be [x] with SHA evidence; incomplete: ${incomplete.join(" | ")}`
    );
  });

  it("live proof: zero Prisma-shaped db.<table>.<method> calls remain in actions/", () => {
    const output = runGrep(
      `grep -rE "\\bdb\\.\\w+\\.(findMany|findUnique|findFirst|create|update|delete|upsert)\\b" ${actionsDir}/ | wc -l`
    );
    const count = Number(output);
    assert.equal(
      count,
      0,
      `expected zero Prisma-shaped calls in ${actionsDir}/, found ${count}`
    );
  });

  it("all six migrated action files exist and are non-empty", () => {
    for (const file of migratedFiles) {
      assert.ok(
        fileExists(file.path),
        `${file.path} must exist`
      );
      const stats = statSync(join(repoRoot, file.path));
      assert.ok(
        stats.size > 0,
        `${file.path} must be non-empty`
      );
    }
  });
});
