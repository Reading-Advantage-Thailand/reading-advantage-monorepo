import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const repoRoot = new URL("../../../../", import.meta.url).pathname;
const trackDir = "measure/tracks/primary_advantage_drizzle_migration_20260526";
const reportPath = `${trackDir}/audit/phase1-schema-port-report.md`;
const planPath = `${trackDir}/plan.md`;
const schemaDir = "packages/db/src/schema";
const drizzleDir = "packages/db/drizzle";
const indexPath = `${schemaDir}/index.ts`;
const primarySchemaPath = `${schemaDir}/primary.ts`;

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

function grepSchemaDir(pattern) {
  try {
    return execSync(`grep -rE "${pattern}" ${schemaDir}/*.ts`, {
      cwd: repoRoot,
      encoding: "utf8",
    });
  } catch (err) {
    if (err.status === 1) return "";
    throw err;
  }
}

// Model names listed in the Phase 0 audit report as "needs porting".
const needsPortingModels = [
  "VerificationToken",
  "UserRole",
  "Role",
  "ArticleActivityLog",
  "SentencsAndWordsForFlashcard",
  "CardReview",
  "ClozeTestGame",
  "SchoolAdmins",
  "Leaderboard",
];

// Enums listed in the Phase 0 audit report as needing new pgEnum types
// (assignmentStatus intentionally excluded because shared uses text).
const needsPortingEnums = [
  "activityType",
  "flashcardType",
  "cardState",
  "subscriptionType",
];

describe("Phase 1 schema port artifact contract", () => {
  it("plan.md records a checkpoint SHA for Phase 1", () => {
    const plan = readText(planPath);
    const phase1Heading = plan.match(/^## Phase 1:.*$/m);
    assert.ok(phase1Heading, "plan.md must contain the Phase 1 heading");
    assert.match(
      phase1Heading[0],
      /\[checkpoint:\s*[a-f0-9]{7,}\]/,
      "Phase 1 heading must include a checkpoint SHA after verification"
    );
  });

  it("Phase 1 schema port closeout report exists with required sections", () => {
    assert.ok(
      fileExists(reportPath),
      `${reportPath} must exist after Phase 1 closeout`
    );
    const report = readText(reportPath);
    for (const section of [
      "Schema Changes",
      "Migration Verification",
      "Barrel Export Updates",
      "Shared-Partial Column Additions",
    ]) {
      const content = getSection(report, section);
      assert.ok(
        content.length > 0,
        `report must contain a "${section}" section`
      );
    }
  });

  it("packages/db/src/schema/ defines new tables for all needs-porting models", () => {
    const hits = grepSchemaDir("export const");
    const missing = [];
    for (const model of needsPortingModels) {
      // Match either the Prisma model name or the likely snake/camel-cased table constant.
      const tablePattern = new RegExp(
        `export const (${model}|${toTableConst(model)})`,
        "i"
      );
      if (!tablePattern.test(hits)) {
        missing.push(model);
      }
    }
    assert.deepEqual(
      missing,
      [],
      `missing new table definitions for models: ${missing.join(", ")}`
    );
  });

  it("packages/db/src/schema/ defines new pgEnum types for needs-porting enums", () => {
    const hits = grepSchemaDir("pgEnum");
    const missing = [];
    for (const enumName of needsPortingEnums) {
      const enumPattern = new RegExp(
        `export const ${enumName}`,
        "i"
      );
      if (!enumPattern.test(hits)) {
        missing.push(enumName);
      }
    }
    assert.deepEqual(
      missing,
      [],
      `missing new pgEnum definitions for enums: ${missing.join(", ")}`
    );
  });

  it("barrel export index.ts re-exports the new schema module", () => {
    const index = readText(indexPath);
    assert.match(
      index,
      /export \* from "\.\/primary\.js"/,
      "packages/db/src/schema/index.ts must re-export ./primary.js"
    );
  });

  it("a new Drizzle migration for primary-advantage tables exists", () => {
    const output = execSync(
      `grep -rlE "(verification_token|user_role|article_activity_log|sentencs_and_words_for_flashcard|card_review|cloze_test_game|school_admins|leaderboard)" ${drizzleDir}/*.sql | wc -l`,
      { cwd: repoRoot, encoding: "utf8" }
    );
    const count = Number(output.trim());
    assert.ok(
      count >= 1,
      `expected >=1 new Drizzle migration referencing new primary-advantage tables, found ${count}`
    );
  });

  it("Phase 1 closeout report documents shared-partial additive columns", () => {
    assert.ok(fileExists(reportPath), `${reportPath} must exist`);
    const report = readText(reportPath);
    const section = getSection(report, "Shared-Partial Column Additions");
    assert.ok(
      section.length > 0,
      "report must document additive columns for shared-partial tables"
    );
    // Spot check that at least two shared-partial tables are named.
    const sharedPartialTables = ["users", "classrooms", "articles", "flashcardCards", "licenses"];
    const named = sharedPartialTables.filter((t) =>
      new RegExp(`\\b${t}\\b`).test(section)
    );
    assert.ok(
      named.length >= 2,
      `report must name at least 2 shared-partial tables with additive columns; found ${named.join(", ")}`
    );
  });

  it("Phase 1 plan tasks are marked complete with SHA evidence", () => {
    const plan = readText(planPath);
    const phase1Section = getSection(plan, "Phase 1: Schema Port \\(FR-1\\)");
    assert.ok(phase1Section.length > 0, "plan must contain Phase 1 section");
    const incomplete = [];
    const taskLines = phase1Section.split("\n").filter((line) =>
      /^- \[[ x~]\]\s+Task:/.test(line)
    );
    assert.ok(
      taskLines.length > 0,
      "Phase 1 section must contain task checklist items"
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
      `Phase 1 tasks must all be [x] with SHA evidence; incomplete: ${incomplete.join(" | ")}`
    );
  });

  it("live proof: packages/db/src/schema/primary.ts exports at least 8 pgTable/pgEnum definitions", () => {
    assert.ok(
      fileExists(primarySchemaPath),
      `${primarySchemaPath} must exist with the new primary-advantage schema`
    );
    const output = execSync(
      `grep -cE "export const .* = (pgTable|pgEnum)" ${primarySchemaPath}`,
      { cwd: repoRoot, encoding: "utf8" }
    );
    const count = Number(output.trim());
    assert.ok(
      count >= 8,
      `expected >=8 pgTable/pgEnum exports in ${primarySchemaPath}, found ${count}`
    );
  });
});

function toTableConst(prismaModel) {
  // Convert Prisma PascalCase model name to likely Drizzle camelCase export constant.
  return prismaModel[0].toLowerCase() + prismaModel.slice(1);
}
