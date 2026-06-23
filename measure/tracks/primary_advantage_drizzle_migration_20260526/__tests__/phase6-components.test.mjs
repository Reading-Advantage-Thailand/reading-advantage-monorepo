import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { execSync } from "node:child_process";

const repoRoot = new URL("../../../../", import.meta.url).pathname;
const trackDir = "measure/tracks/primary_advantage_drizzle_migration_20260526";
const reportPath = `${trackDir}/audit/phase6-components-report.md`;
const planPath = `${trackDir}/plan.md`;
const componentsDir = "apps/primary-advantage/components";

const migratedFiles = [
  `${componentsDir}/articles/questions/mc-question-card.tsx`,
  `${componentsDir}/student-assignment-table.tsx`,
  `${componentsDir}/system/edit-license-form.tsx`,
  `${componentsDir}/system/license-table.tsx`,
  `${componentsDir}/dashboard/user-reading-chart.tsx`,
];

function readText(filename) {
  return readFileSync(join(repoRoot, filename), "utf8");
}

function fileExists(filename) {
  return existsSync(join(repoRoot, filename));
}

function runCommand(args) {
  try {
    return execSync(args, { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch (err) {
    if (err.status === 1) return "";
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

function hasPrismaImport(filePath) {
  const output = runCommand(
    `grep -E "from ['\\\"]@prisma/client['\\\"]" ${filePath} || true`
  );
  return output.length > 0;
}

function hasLibPrismaImport(filePath) {
  const output = runCommand(
    `grep -E "from ['\\\"]@/lib/prisma['\\\"]" ${filePath} || true`
  );
  return output.length > 0;
}

function hasDrizzleTypePattern(text) {
  const inferFromDrizzle =
    /import\s+type\s+.*\{[^}]*Infer(?:Select|Insert)Model[^}]*\}\s+from\s+["']drizzle-orm["']/.test(
      text
    ) ||
    /type\s+\w+\s*=\s*Infer(?:Select|Insert)Model\s*<\s*typeof\s+\w+\s*>/.test(
      text
    );
  const importFromDb = /from\s+["']@reading-advantage\/db["']/.test(text);
  return inferFromDrizzle || importFromDb;
}

function reportCoversFile(report, filePath) {
  const base = basename(filePath);
  if (getSection(report, base.replace(/\.tsx?$/, "")).length > 0) return true;
  if (getSection(report, filePath.replace(/\.tsx?$/, "")).length > 0) return true;
  return false;
}

describe("Phase 6 component/UI migration artifact contract", () => {
  it("plan.md records a checkpoint SHA for Phase 6", () => {
    const plan = readText(planPath);
    const phase6Heading = plan.match(/^## Phase 6:.*$/m);
    assert.ok(phase6Heading, "plan.md must contain the Phase 6 heading");
    assert.match(
      phase6Heading[0],
      /\[checkpoint:\s*[a-f0-9]{7,}\]/,
      "Phase 6 heading must include a checkpoint SHA after component migration verification"
    );
  });

  it("Phase 6 component migration closeout report exists with required sections", () => {
    assert.ok(
      fileExists(reportPath),
      `${reportPath} must exist after Phase 6 closeout`
    );
    const report = readText(reportPath);

    const summary = getSection(report, "Summary");
    assert.ok(summary.length > 0, "report must contain a Summary section");

    const drizzlePatterns = getSection(report, "Drizzle Type Patterns Used");
    assert.ok(
      drizzlePatterns.length > 0,
      "report must contain a Drizzle Type Patterns Used section"
    );
    assert.match(
      drizzlePatterns,
      /(InferSelectModel|InferInsertModel|drizzle-orm|@reading-advantage\/db)/i,
      "Drizzle Type Patterns Used must mention Drizzle-inferred type patterns"
    );

    const deferred = getSection(report, "Deferred Items");
    assert.ok(
      deferred.length > 0,
      "report must contain a Deferred Items section"
    );

    const uncovered = [];
    for (const filePath of migratedFiles) {
      if (!reportCoversFile(report, filePath)) {
        uncovered.push(filePath);
      }
    }
    assert.deepEqual(
      uncovered,
      [],
      `report must contain a section per component file covering: ${uncovered.join(", ")}`
    );
  });

  it("no target component file imports from @prisma/client", () => {
    const offenders = [];
    for (const filePath of migratedFiles) {
      if (hasPrismaImport(filePath)) {
        offenders.push(filePath);
      }
    }
    assert.deepEqual(
      offenders,
      [],
      `@prisma/client imports remain in: ${offenders.join(", ")}`
    );
  });

  it("no target component file imports from @/lib/prisma", () => {
    const offenders = [];
    for (const filePath of migratedFiles) {
      if (hasLibPrismaImport(filePath)) {
        offenders.push(filePath);
      }
    }
    assert.deepEqual(
      offenders,
      [],
      `@/lib/prisma imports remain in: ${offenders.join(", ")}`
    );
  });

  it("each target component file uses Drizzle-inferred or domain types", () => {
    const missing = [];
    for (const filePath of migratedFiles) {
      assert.ok(fileExists(filePath), `${filePath} must exist`);
      const text = readText(filePath);
      if (!hasDrizzleTypePattern(text)) {
        missing.push(filePath);
      }
    }
    assert.deepEqual(
      missing,
      [],
      `component files missing Drizzle-inferred/domain type patterns: ${missing.join(", ")}`
    );
  });

  it("Phase 6 plan tasks are marked complete with SHA evidence", () => {
    const plan = readText(planPath);
    const phase6Section = getSection(
      plan,
      "Phase 6: Component/UI Migration \\(FR-3\\)"
    );
    assert.ok(phase6Section.length > 0, "plan must contain Phase 6 section");
    const incomplete = [];
    const taskLines = phase6Section
      .split("\n")
      .filter((line) => /^- \[[ x~]\]\s+Task:/.test(line));
    assert.ok(
      taskLines.length > 0,
      "Phase 6 section must contain task checklist items"
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
      `Phase 6 tasks must all be [x] with SHA evidence; incomplete: ${incomplete.join(
        " | "
      )}`
    );
  });

  it("live proof: zero @prisma/client imports remain in apps/primary-advantage/components/", () => {
    const output = runCommand(
      `grep -rE "from ['\\\"]@prisma/client['\\\"]" ${componentsDir}/ | wc -l`
    );
    const count = Number(output);
    assert.equal(
      count,
      0,
      `expected zero @prisma/client imports in ${componentsDir}/, found ${count}`
    );
  });

  it("all migrated component files exist and are non-empty", () => {
    for (const filePath of migratedFiles) {
      assert.ok(fileExists(filePath), `${filePath} must exist`);
      const stats = statSync(join(repoRoot, filePath));
      assert.ok(stats.size > 0, `${filePath} must be non-empty`);
    }
  });
});
