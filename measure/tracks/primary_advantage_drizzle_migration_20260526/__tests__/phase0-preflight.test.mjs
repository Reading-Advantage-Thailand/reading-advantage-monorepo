import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const repoRoot = new URL("../../../../", import.meta.url).pathname;
const trackDir = "measure/tracks/primary_advantage_drizzle_migration_20260526";
const reportPath = `${trackDir}/audit/phase0-preflight-report.md`;
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

describe("Phase 0 pre-flight artifact contract", () => {
  it("plan.md records a checkpoint SHA for Phase 0", () => {
    const plan = readText(planPath);
    const phase0Heading = plan.match(/^## Phase 0:.*$/m);
    assert.ok(phase0Heading, "plan.md must contain the Phase 0 heading");
    assert.match(
      phase0Heading[0],
      /\[checkpoint:\s*[a-f0-9]{7,}\]/,
      "Phase 0 heading must include a checkpoint SHA after manual verification"
    );
  });

  it("Phase 0 pre-flight report exists", () => {
    assert.ok(
      fileExists(reportPath),
      `${reportPath} must exist after pre-flight audit`
    );
  });

  it("pre-flight report documents the Prisma file audit", () => {
    assert.ok(
      fileExists(reportPath),
      `${reportPath} must exist before section checks`
    );
    const report = readText(reportPath);
    const section = getSection(report, "Prisma File Audit");
    assert.ok(section.length > 0, "report must contain a Prisma File Audit section");
    assert.match(
      section,
      /(actions|routes|models|components|lib|types)/i,
      "audit must categorize files by layer"
    );
  });

  it("pre-flight report documents the schema mapping", () => {
    assert.ok(
      fileExists(reportPath),
      `${reportPath} must exist before section checks`
    );
    const report = readText(reportPath);
    const section = getSection(report, "Schema Mapping");
    assert.ok(section.length > 0, "report must contain a Schema Mapping section");
    assert.match(
      section,
      /packages\/db\/src\/schema/i,
      "mapping must reference packages/db/src/schema"
    );
  });

  it("pre-flight report documents the build baseline", () => {
    assert.ok(
      fileExists(reportPath),
      `${reportPath} must exist before section checks`
    );
    const report = readText(reportPath);
    const section = getSection(report, "Build Baseline");
    assert.ok(section.length > 0, "report must contain a Build Baseline section");
    assert.match(
      section,
      /primary-advantage/i,
      "baseline must reference primary-advantage"
    );
  });

  it("pre-flight report documents shared schema coverage", () => {
    assert.ok(
      fileExists(reportPath),
      `${reportPath} must exist before section checks`
    );
    const report = readText(reportPath);
    const section = getSection(report, "Shared Schema Coverage");
    assert.ok(section.length > 0, "report must contain a Shared Schema Coverage section");
    assert.match(
      section,
      /(users|classrooms|schools|articles|assignments)/i,
      "coverage section must mention common shared models"
    );
  });

  it("live proof: many Prisma-touching files exist in primary-advantage", () => {
    const output = execSync(
      "grep -rl '@prisma/client' apps/primary-advantage/ | wc -l",
      { cwd: repoRoot, encoding: "utf8" }
    );
    const count = Number(output.trim());
    assert.equal(
      count,
      44,
      `expected 44 Prisma-touching files (including build artifacts), got ${count}`
    );
  });

  it("live proof: primary-advantage Prisma schema is still active", () => {
    assert.ok(
      fileExists("apps/primary-advantage/prisma/schema.prisma"),
      "Prisma schema.prisma must exist"
    );
  });
});
