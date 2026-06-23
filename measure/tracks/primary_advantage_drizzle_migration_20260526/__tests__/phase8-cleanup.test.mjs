import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const repoRoot = new URL("../../../../", import.meta.url).pathname;
const trackDir = "measure/tracks/primary_advantage_drizzle_migration_20260526";
const reportPath = `${trackDir}/audit/phase8-cleanup-report.md`;
const planPath = `${trackDir}/plan.md`;

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

function hasHeading(text, pattern) {
  return text.split("\n").some((line) => /^##+\s/.test(line) && pattern.test(line));
}

describe("Phase 8 cleanup and dependency removal", () => {
  it("plan.md records a checkpoint SHA for Phase 8", () => {
    const plan = readText(planPath);
    const phase8Heading = plan.match(/^## Phase 8:.*$/m);
    assert.ok(phase8Heading, "plan.md must contain the Phase 8 heading");
    assert.match(
      phase8Heading[0],
      /\[checkpoint:\s*[a-f0-9]{7,}\]/,
      "Phase 8 heading must include a checkpoint SHA after cleanup verification"
    );
  });

  it("Phase 8 cleanup closeout report exists with required sections", () => {
    assert.ok(
      fileExists(reportPath),
      `${reportPath} must exist after Phase 8 closeout`
    );
    const report = readText(reportPath);

    const summary = getSection(report, "Summary");
    assert.ok(summary.length > 0, "report must contain a Summary section");

    const requiredHeadings = [
      { name: "Delete Prisma directory", pattern: /Delete\b.*\bprisma\b/i },
      { name: "Remove Prisma dependencies", pattern: /Remove\b.*\b@prisma\b/i },
      { name: "Remove root onlyBuiltDependencies", pattern: /onlyBuiltDependencies/i },
      { name: "Run pnpm install", pattern: /pnpm\s+install/i },
      { name: "Update AGENTS.md", pattern: /AGENTS\.md/i },
      { name: "Verification", pattern: /^##+\s+Verification\s*$/i },
      { name: "AGENTS.md Update", pattern: /^##+\s+AGENTS\.md\s+Update\s*$/i },
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

  it("apps/primary-advantage/prisma/ directory is deleted", () => {
    assert.ok(
      !fileExists("apps/primary-advantage/prisma"),
      "apps/primary-advantage/prisma/ directory must be deleted"
    );
    assert.ok(
      !fileExists("apps/primary-advantage/prisma/schema.prisma"),
      "apps/primary-advantage/prisma/schema.prisma must not exist"
    );
    assert.ok(
      !fileExists("apps/primary-advantage/prisma/seed.ts"),
      "apps/primary-advantage/prisma/seed.ts must not exist"
    );
  });

  it("apps/primary-advantage/package.json has no Prisma dependencies or scripts", () => {
    const pkgPath = "apps/primary-advantage/package.json";
    assert.ok(fileExists(pkgPath), `${pkgPath} must exist`);
    const pkg = readText(pkgPath);

    const prismaDeps = runCommand(
      `grep -E "(@prisma/client|\\\"prisma\\\"|@prisma/adapter-pg)" ${pkgPath} || true`
    );
    assert.equal(
      prismaDeps.length,
      0,
      `package.json must not reference @prisma/client, prisma, or @prisma/adapter-pg`
    );

    assert.doesNotMatch(
      pkg,
      /"prisma":\s*\{[^}]*seed/i,
      "package.json must not contain a prisma.seed config block"
    );
  });

  it("apps/primary-advantage/AGENTS.md exists and references Drizzle", () => {
    const agentsPath = "apps/primary-advantage/AGENTS.md";
    assert.ok(
      fileExists(agentsPath),
      `${agentsPath} must exist and reflect the Drizzle migration`
    );
    const agents = readText(agentsPath);
    assert.match(
      agents,
      /Drizzle/i,
      "AGENTS.md must reference Drizzle as the active ORM"
    );
  });

  it("live proof: zero files remain under apps/primary-advantage/prisma/", () => {
    const output = runCommand(
      "find apps/primary-advantage/prisma -type f 2>/dev/null | wc -l"
    );
    const count = Number(output);
    assert.equal(
      count,
      0,
      `expected zero files under apps/primary-advantage/prisma/, found ${count}`
    );
  });

  it("live proof: zero Prisma dependency lines in apps/primary-advantage/package.json", () => {
    const output = runCommand(
      'grep -E "(\"@prisma/client\"|\"prisma\"|\"@prisma/adapter-pg\")" apps/primary-advantage/package.json | wc -l'
    );
    const count = Number(output);
    assert.equal(
      count,
      0,
      `expected zero Prisma dependency/config lines in package.json, found ${count}`
    );
  });

  it("Phase 8 plan tasks are marked complete with SHA evidence", () => {
    const plan = readText(planPath);
    const phase8Section = getSection(
      plan,
      "Phase 8: Cleanup \\u0026 Dependency Removal \\(FR-4\\)"
    );
    assert.ok(phase8Section.length > 0, "plan must contain Phase 8 section");
    const incomplete = [];
    const taskLines = phase8Section
      .split("\n")
      .filter((line) => /^- \[[ x~]\]\s+Task:/.test(line));
    assert.ok(
      taskLines.length > 0,
      "Phase 8 section must contain task checklist items"
    );
    assert.equal(
      taskLines.length,
      5,
      "Phase 8 section must contain exactly 5 tasks"
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
      `Phase 8 tasks must all be [x] with SHA evidence; incomplete: ${incomplete.join(
        " | "
      )}`
    );
  });

  it("root workspace built-dependencies no longer allow Prisma packages", () => {
    const rootPkgPath = "package.json";
    const workspacePath = "pnpm-workspace.yaml";

    if (fileExists(rootPkgPath)) {
      const rootPkg = readText(rootPkgPath);
      assert.doesNotMatch(
        rootPkg,
        /"onlyBuiltDependencies":\s*\[[^\]]*\b(prisma|@prisma)\b/s,
        "root package.json onlyBuiltDependencies must not list prisma packages"
      );
    }

    if (fileExists(workspacePath)) {
      const workspace = readText(workspacePath);
      assert.doesNotMatch(
        workspace,
        /allowBuilds:\s*\{[^}]*\b(prisma|@prisma)\b/s,
        "pnpm-workspace.yaml allowBuilds must not list prisma packages"
      );
    }
  });
});
