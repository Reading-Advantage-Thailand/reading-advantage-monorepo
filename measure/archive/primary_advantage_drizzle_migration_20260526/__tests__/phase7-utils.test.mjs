import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { execSync } from "node:child_process";

const repoRoot = new URL("../../../../", import.meta.url).pathname;
const trackDir = "measure/tracks/primary_advantage_drizzle_migration_20260526";
const reportPath = `${trackDir}/audit/phase7-utils-report.md`;
const planPath = `${trackDir}/plan.md`;

const targetDirs = [
  "apps/primary-advantage/server/utils/",
  "apps/primary-advantage/server/utils/genaretors/",
  "apps/primary-advantage/lib/",
  "apps/primary-advantage/types/",
  "apps/primary-advantage/prisma/",
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

function buildTargetFiles() {
  const prismaCalls = runCommand(
    `grep -lrE "\\bdb\\.\\w+\\.(findMany|findUnique|findFirst|create|update|delete|upsert|count|aggregate|groupBy|createMany|updateMany|deleteMany)\\b" ${targetDirs.join(" ")} 2>/dev/null || true`
  );
  const prismaImports = runCommand(
    `grep -lrE "from ['\\\"]@prisma/client['\\\"]" ${targetDirs.join(" ")} 2>/dev/null || true`
  );
  const files = new Set(
    [...prismaCalls.split("\n"), ...prismaImports.split("\n")]
      .map((s) => s.trim())
      .filter(Boolean)
  );
  return [...files].sort();
}

function hasPrismaCalls(filePath) {
  const output = runCommand(
    `grep -E "\\bdb\\.\\w+\\.(findMany|findUnique|findFirst|create|update|delete|upsert|count|aggregate|groupBy|createMany|updateMany|deleteMany)\\b" ${filePath} || true`
  );
  return output.length > 0;
}

function hasPrismaImport(filePath) {
  const output = runCommand(
    `grep -E "from ['\\\"]@prisma/client['\\\"]" ${filePath} || true`
  );
  return output.length > 0;
}

function hasDrizzlePattern(text) {
  const queryBuilder = /\b(?:db\.select|db\.insert|db\.update|db\.delete|db\.query)\b/.test(
    text
  );
  const clauses = /\b(?:from\(|eq\(|and\(|or\(|inArray\(|desc\(|asc\(|sql\()/.test(text);
  const drizzleOrm = /from\s+["']drizzle-orm["']/.test(text);
  const dbImport = /from\s+["']@reading-advantage\/db["']/.test(text);
  const inferredTypes =
    /import\s+type\s+.*\{[^}]*Infer(?:Select|Insert)Model[^}]*\}\s+from\s+["']drizzle-orm["']/.test(
      text
    ) ||
    /type\s+\w+\s*=\s*Infer(?:Select|Insert)Model\s*<\s*typeof\s+\w+\s*>/.test(text);
  return queryBuilder || clauses || drizzleOrm || dbImport || inferredTypes;
}

function reportCoversSubdirectory(report, subdir) {
  const base = basename(subdir.replace(/\/$/, ""));
  if (getSection(report, base).length > 0) return true;
  if (getSection(report, subdir.replace(/\/$/, "")).length > 0) return true;
  return false;
}

describe("Phase 7 utils/types/seed migration artifact contract", () => {
  it("plan.md records a checkpoint SHA for Phase 7", () => {
    const plan = readText(planPath);
    const phase7Heading = plan.match(/^## Phase 7:.*$/m);
    assert.ok(phase7Heading, "plan.md must contain the Phase 7 heading");
    assert.match(
      phase7Heading[0],
      /\[checkpoint:\s*[a-f0-9]{7,}\]/,
      "Phase 7 heading must include a checkpoint SHA after utils/types migration verification"
    );
  });

  it("Phase 7 utils/types/seed migration closeout report exists with required sections", () => {
    assert.ok(
      fileExists(reportPath),
      `${reportPath} must exist after Phase 7 closeout`
    );
    const report = readText(reportPath);

    const summary = getSection(report, "Summary");
    assert.ok(summary.length > 0, "report must contain a Summary section");

    const drizzlePatterns = getSection(report, "Drizzle API Patterns Used");
    assert.ok(
      drizzlePatterns.length > 0,
      "report must contain a Drizzle API Patterns Used section"
    );
    assert.match(
      drizzlePatterns,
      /(db\.select|db\.insert|db\.update|db\.delete|from\(|eq\(|InferSelectModel|InferInsertModel|@reading-advantage\/db|drizzle-orm)/i,
      "Drizzle API Patterns Used must mention Drizzle query-builder or type patterns"
    );

    const deferred = getSection(report, "Deferred Items");
    assert.ok(
      deferred.length > 0,
      "report must contain a Deferred Items section"
    );

    const targetFiles = buildTargetFiles();
    assert.ok(
      targetFiles.length > 0,
      "dynamic target file list must not be empty"
    );

    const uncoveredSubdirs = [];
    for (const subdir of targetDirs) {
      if (!reportCoversSubdirectory(report, subdir)) {
        uncoveredSubdirs.push(subdir);
      }
    }
    assert.deepEqual(
      uncoveredSubdirs,
      [],
      `report must contain a grouped-by-subdirectory section for: ${uncoveredSubdirs.join(", ")}`
    );
  });

  it("no target file contains Prisma-shaped db.<table>.<method> calls", () => {
    const offenders = [];
    for (const filePath of buildTargetFiles()) {
      if (hasPrismaCalls(filePath)) {
        offenders.push(filePath);
      }
    }
    assert.deepEqual(
      offenders,
      [],
      `Prisma-shaped calls remain in: ${offenders.join(", ")}`
    );
  });

  it("no target file imports from @prisma/client", () => {
    const offenders = [];
    for (const filePath of buildTargetFiles()) {
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

  it("each target file uses Drizzle patterns or is a pure utility/types file", () => {
    const missing = [];
    for (const filePath of buildTargetFiles()) {
      assert.ok(fileExists(filePath), `${filePath} must exist`);
      const text = readText(filePath);
      const isTypesFile = filePath === "apps/primary-advantage/types/index.d.ts";
      const isPure =
        !hasPrismaCalls(filePath) &&
        !hasPrismaImport(filePath) &&
        (isTypesFile ? !/\bPrisma\./.test(text) : false);
      if (!hasDrizzlePattern(text) && !isPure) {
        missing.push(filePath);
      }
    }
    assert.deepEqual(
      missing,
      [],
      `files missing Drizzle patterns or pure-types status: ${missing.join(", ")}`
    );
  });

  it("Phase 7 plan tasks are marked complete with SHA evidence", () => {
    const plan = readText(planPath);
    const phase7Section = getSection(
      plan,
      "Phase 7: Utils \\u0026 Types Migration \\(FR-2, FR-4\\)"
    );
    assert.ok(phase7Section.length > 0, "plan must contain Phase 7 section");
    const incomplete = [];
    const taskLines = phase7Section
      .split("\n")
      .filter((line) => /^- \[[ x~]\]\s+Task:/.test(line));
    assert.ok(
      taskLines.length > 0,
      "Phase 7 section must contain task checklist items"
    );
    assert.equal(
      taskLines.length,
      5,
      "Phase 7 section must contain exactly 5 tasks"
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
      `Phase 7 tasks must all be [x] with SHA evidence; incomplete: ${incomplete.join(
        " | "
      )}`
    );
  });

  it("live proof: zero Prisma-shaped calls remain in Phase 7 directories", () => {
    const output = runCommand(
      `grep -rE "\\bdb\\.\\w+\\.(findMany|findUnique|findFirst|create|update|delete|upsert|count|aggregate|groupBy|createMany|updateMany|deleteMany)\\b" ${targetDirs.join(
        " "
      )} | wc -l`
    );
    const count = Number(output);
    assert.equal(
      count,
      0,
      `expected zero Prisma-shaped calls in Phase 7 directories, found ${count}`
    );
  });

  it("live proof: zero @prisma/client imports remain in Phase 7 directories", () => {
    const output = runCommand(
      `grep -rE "from ['\\\"]@prisma/client['\\\"]" ${targetDirs.join(" ")} | wc -l`
    );
    const count = Number(output);
    assert.equal(
      count,
      0,
      `expected zero @prisma/client imports in Phase 7 directories, found ${count}`
    );
  });

  it("all dynamic target files exist and are non-empty", () => {
    for (const filePath of buildTargetFiles()) {
      assert.ok(fileExists(filePath), `${filePath} must exist`);
      const stats = statSync(join(repoRoot, filePath));
      assert.ok(stats.size > 0, `${filePath} must be non-empty`);
    }
  });
});
