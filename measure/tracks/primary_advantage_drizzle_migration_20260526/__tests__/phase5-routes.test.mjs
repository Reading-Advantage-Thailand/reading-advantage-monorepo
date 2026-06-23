import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { execSync } from "node:child_process";

const repoRoot = new URL("../../../../", import.meta.url).pathname;
const trackDir = "measure/tracks/primary_advantage_drizzle_migration_20260526";
const reportPath = `${trackDir}/audit/phase5-routes-report.md`;
const planPath = `${trackDir}/plan.md`;
const routesDir = "apps/primary-advantage/app/api";

const prismaMethodPattern =
  "findMany|findUnique|findFirst|create|update|delete|upsert|count|aggregate|groupBy|createMany|updateMany|deleteMany|findUniqueOrThrow|findFirstOrThrow";

const knownFeatures = [
  "classrooms",
  "flashcard",
  "licenses",
  "schools",
  "students",
  "upload",
  "users",
  "debug",
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

function discoverTargetRouteFiles() {
  const output = runCommand(
    `grep -lrE "\\bdb\\.\\w+\\.(${prismaMethodPattern})\\b" ${routesDir}/ | sort`
  );
  if (!output) return [];
  return output.split("\n").filter((line) => line.trim().length > 0);
}

function countPrismaCalls(filePath) {
  return Number(
    runCommand(
      `grep -cE "\\bdb\\.\\w+\\.(${prismaMethodPattern})\\b" ${filePath} || true`
    ) || "0"
  );
}

function hasDrizzlePattern(text) {
  const builderCalls = /\bdb\.(select|insert|update|delete)\b/.test(text);
  const clauseCalls = /\.(from\(|where\(|set\(|values\()/.test(text);
  return builderCalls && clauseCalls;
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

function featureForRoute(routePath) {
  for (const feature of knownFeatures) {
    if (routePath.includes(`/${feature}/`)) return feature;
  }
  const base = basename(routePath).replace(/\.ts$/, "");
  if (routePath.includes("/classrooms")) return "classrooms";
  if (routePath.includes("/flashcard")) return "flashcard";
  if (routePath.includes("/licenses")) return "licenses";
  if (routePath.includes("/schools")) return "schools";
  if (routePath.includes("/students")) return "students";
  if (routePath.includes("/upload")) return "upload";
  if (routePath.includes("/users")) return "users";
  if (routePath.includes("/debug")) return "debug";
  return base;
}

function reportCoversRoute(report, routePath) {
  const base = basename(routePath);
  if (getSection(report, base.replace(/\.ts$/, "")).length > 0) return true;
  if (getSection(report, routePath.replace(/\.ts$/, "")).length > 0) return true;
  const feature = featureForRoute(routePath);
  if (feature && getSection(report, feature).length > 0) return true;
  return false;
}

describe("Phase 5 API routes migration artifact contract", () => {
  const targetFiles = discoverTargetRouteFiles();

  it("plan.md records a checkpoint SHA for Phase 5", () => {
    const plan = readText(planPath);
    const phase5Heading = plan.match(/^## Phase 5:.*$/m);
    assert.ok(phase5Heading, "plan.md must contain the Phase 5 heading");
    assert.match(
      phase5Heading[0],
      /\[checkpoint:\s*[a-f0-9]{7,}\]/,
      "Phase 5 heading must include a checkpoint SHA after routes migration verification"
    );
  });

  it("Phase 5 routes migration closeout report exists with required sections", () => {
    assert.ok(
      fileExists(reportPath),
      `${reportPath} must exist after Phase 5 closeout`
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
      /(select|insert|update|delete|from|where|values|set)/i,
      "Drizzle API Patterns Used must mention Drizzle query builder patterns"
    );

    const deferred = getSection(report, "Deferred Items");
    assert.ok(
      deferred.length > 0,
      "report must contain a Deferred Items section"
    );

    const uncovered = [];
    for (const routePath of targetFiles) {
      if (!reportCoversRoute(report, routePath)) {
        uncovered.push(routePath);
      }
    }
    assert.deepEqual(
      uncovered,
      [],
      `report must contain a section per route file or grouped-by-feature section covering: ${uncovered.join(", ")}`
    );
  });

  it("each target route file no longer contains Prisma-shaped db.<table>.<method> calls", () => {
    const offenders = [];
    for (const routePath of targetFiles) {
      const count = countPrismaCalls(routePath);
      if (count > 0) {
        offenders.push(`${routePath}: ${count}`);
      }
    }
    assert.deepEqual(
      offenders,
      [],
      `Prisma-shaped db.<table>.<method> calls remain in: ${offenders.join(", ")}`
    );
  });

  it("each target route file uses Drizzle query builder patterns", () => {
    const missing = [];
    for (const routePath of targetFiles) {
      assert.ok(
        fileExists(routePath),
        `${routePath} must exist`
      );
      const text = readText(routePath);
      if (!hasDrizzlePattern(text)) {
        missing.push(routePath);
      }
    }
    assert.deepEqual(
      missing,
      [],
      `route files missing Drizzle query builder patterns: ${missing.join(", ")}`
    );
  });

  it("Phase 5 plan tasks are marked complete with SHA evidence", () => {
    const plan = readText(planPath);
    const phase5Section = getSection(plan, "Phase 5: API Routes Migration \\(FR-2\\)");
    assert.ok(phase5Section.length > 0, "plan must contain Phase 5 section");
    const incomplete = [];
    const taskLines = phase5Section
      .split("\n")
      .filter((line) => /^- \[[ x~]\]\s+Task:/.test(line));
    assert.ok(
      taskLines.length > 0,
      "Phase 5 section must contain task checklist items"
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
      `Phase 5 tasks must all be [x] with SHA evidence; incomplete: ${incomplete.join(" | ")}`
    );
  });

  it("live proof: zero Prisma-shaped db.<table>.<method> calls remain in app/api/", () => {
    const output = runCommand(
      `grep -rE "\\bdb\\.\\w+\\.(findMany|findUnique|findFirst|create|update|delete|upsert)\\b" ${routesDir}/ | wc -l`
    );
    const count = Number(output);
    assert.equal(
      count,
      0,
      `expected zero Prisma-shaped calls in ${routesDir}/, found ${count}`
    );
  });

  it("all target route files exist and are non-empty", () => {
    assert.ok(
      targetFiles.length > 0,
      `expected at least one target route file needing migration; found ${targetFiles.length}`
    );
    for (const routePath of targetFiles) {
      assert.ok(
        fileExists(routePath),
        `${routePath} must exist`
      );
      const stats = statSync(join(repoRoot, routePath));
      assert.ok(
        stats.size > 0,
        `${routePath} must be non-empty`
      );
    }
  });
});
