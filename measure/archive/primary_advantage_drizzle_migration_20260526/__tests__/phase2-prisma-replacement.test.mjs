import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const repoRoot = new URL("../../../../", import.meta.url).pathname;
const trackDir = "measure/tracks/primary_advantage_drizzle_migration_20260526";
const reportPath = `${trackDir}/audit/phase2-prisma-replacement-report.md`;
const planPath = `${trackDir}/plan.md`;
const primaryLibDir = "apps/primary-advantage/lib";
const prismaPath = `${primaryLibDir}/prisma.ts`;
const appLocalDbPath = `${primaryLibDir}/db.ts`;

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

function sourceFilesGrep(pattern) {
  return runGrep(
    `grep -rln "${pattern}" apps/primary-advantage/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v .next | wc -l`
  );
}

describe("Phase 2 lib/prisma.ts replacement artifact contract", () => {
  it("plan.md records a checkpoint SHA for Phase 2", () => {
    const plan = readText(planPath);
    const phase2Heading = plan.match(/^## Phase 2:.*$/m);
    assert.ok(phase2Heading, "plan.md must contain the Phase 2 heading");
    assert.match(
      phase2Heading[0],
      /\[checkpoint:\s*[a-f0-9]{7,}\]/,
      "Phase 2 heading must include a checkpoint SHA after replacement verification"
    );
  });

  it("Phase 2 prisma replacement closeout report exists with required sections", () => {
    assert.ok(
      fileExists(reportPath),
      `${reportPath} must exist after Phase 2 closeout`
    );
    const report = readText(reportPath);
    for (const section of [
      "Files Migrated",
      "lib/prisma.ts Deletion",
      "Import Pattern Verification",
      "Build Status",
    ]) {
      const content = getSection(report, section);
      assert.ok(
        content.length > 0,
        `report must contain a "${section}" section`
      );
    }
  });

  it("apps/primary-advantage/lib/prisma.ts is deleted", () => {
    assert.ok(
      !fileExists(prismaPath),
      `${prismaPath} must be deleted as part of Phase 2`
    );
  });

  it("zero @/lib/prisma imports remain in primary-advantage source files", () => {
    const output = sourceFilesGrep("@/lib/prisma");
    const count = Number(output);
    assert.equal(
      count,
      0,
      `expected zero remaining @/lib/prisma imports in apps/primary-advantage source, found ${count}`
    );
  });

  it("db client replacement is wired (app-local db.ts or direct @reading-advantage/db imports)", () => {
    const appLocalDbExists = fileExists(appLocalDbPath);
    const directDbImports = Number(
      runGrep(
        `grep -rln "from '@reading-advantage/db'" apps/primary-advantage/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v .next | wc -l`
      )
    );
    assert.ok(
      appLocalDbExists || directDbImports > 0,
      `Phase 2 must leave a db client replacement: either ${appLocalDbPath} exists or source files import from '@reading-advantage/db' (appLocalDbExists=${appLocalDbExists}, directDbImports=${directDbImports})`
    );
  });

  it("Phase 2 plan tasks are marked complete with SHA evidence", () => {
    const plan = readText(planPath);
    const phase2Section = getSection(plan, "Phase 2: lib/prisma\\.ts Replacement \\(FR-4\\)");
    assert.ok(phase2Section.length > 0, "plan must contain Phase 2 section");
    const incomplete = [];
    const taskLines = phase2Section
      .split("\n")
      .filter((line) => /^- \[[ x~]\]\s+Task:/.test(line));
    assert.ok(
      taskLines.length > 0,
      "Phase 2 section must contain task checklist items"
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
      `Phase 2 tasks must all be [x] with SHA evidence; incomplete: ${incomplete.join(" | ")}`
    );
  });

  it("live proof: @/lib/prisma has zero source matches", () => {
    const matches = runGrep(
      `grep -c "@/lib/prisma" $(find apps/primary-advantage -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v .next) 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}'`
    );
    const count = Number(matches);
    assert.equal(
      count,
      0,
      `expected zero live @/lib/prisma matches in source files, found ${count}`
    );
  });
});
