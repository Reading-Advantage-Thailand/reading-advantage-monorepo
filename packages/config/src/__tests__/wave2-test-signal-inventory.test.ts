import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Wave 2 Phase 3 — Test signal inventory guard.
 *
 * Scans every workspace package.json for test scripts that use
 * `--passWithNoTests`. Scripts that root CI or completion claims treat as
 * quality proof must not be vacuous-pass surfaces.
 *
 * Anti-pattern coverage:
 *   A3: labeled integer counts, never digit-only regex.
 *   A4: fails if zero package test scripts were scanned.
 */

const REPO_ROOT = resolve(__dirname, "../../../..");
const WORKSPACE_DIRS = ["apps", "packages"];

interface PassWithNoTestsHit {
  packageJsonPath: string;
  scriptName: string;
  script: string;
}

function findWorkspacePackageJsonPaths(): string[] {
  const paths: string[] = [];
  for (const dir of WORKSPACE_DIRS) {
    const base = resolve(REPO_ROOT, dir);
    if (!existsSync(base)) continue;
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      // Exclude nested tooling / auto-discovery directories that are not
      // workspace packages (A7: path-based filter only).
      if (entry.name === ".opencode") continue;
      const pkgPath = resolve(base, entry.name, "package.json");
      if (existsSync(pkgPath)) {
        paths.push(pkgPath);
      }
    }
  }
  const rootPkg = resolve(REPO_ROOT, "package.json");
  if (existsSync(rootPkg)) {
    paths.push(rootPkg);
  }
  return paths;
}

function scanTestScripts(
  packageJsonPaths: string[],
): {
  hits: PassWithNoTestsHit[];
  scannedScriptCount: number;
} {
  const hits: PassWithNoTestsHit[] = [];
  let scannedScriptCount = 0;

  for (const pkgPath of packageJsonPaths) {
    const raw = readFileSync(pkgPath, "utf8");
    const pkg = JSON.parse(raw) as {
      scripts?: Record<string, string>;
    };
    for (const [scriptName, scriptValue] of Object.entries(pkg.scripts ?? {})) {
      if (typeof scriptValue !== "string") continue;
      // Quality-claim surfaces are scripts whose name contains "test".
      // This intentionally includes "test", "test:unit", etc., while
      // excluding build/lint/dev scripts.
      if (!scriptName.toLowerCase().includes("test")) continue;
      scannedScriptCount++;
      if (scriptValue.includes("--passWithNoTests")) {
        hits.push({
          packageJsonPath: pkgPath,
          scriptName,
          script: scriptValue,
        });
      }
    }
  }

  return { hits, scannedScriptCount };
}

describe("Wave 2 Phase 3 — Test signal inventory guard", () => {
  it("detects a counterexample fixture with --passWithNoTests", () => {
    const fakePackageJson = JSON.stringify({
      name: "fake-quality-claim-package",
      scripts: {
        test: "vitest run --passWithNoTests",
        "test:unit": "jest --passWithNoTests",
      },
    });
    const fakeHits = [] as { scriptName: string }[];
    const pkg = JSON.parse(fakePackageJson) as { scripts?: Record<string, string> };
    for (const [scriptName, scriptValue] of Object.entries(pkg.scripts ?? {})) {
      if (
        typeof scriptValue === "string" &&
        scriptName.toLowerCase().includes("test") &&
        scriptValue.includes("--passWithNoTests")
      ) {
        fakeHits.push({ scriptName });
      }
    }
    expect(
      fakeHits.length,
      "Counterexample fixture must contain passWithNoTests hits (anti-vacuity guard)",
    ).toBeGreaterThanOrEqual(1);
  });

  it("scans at least one test script (A4 vacuous-pass guard)", () => {
    const packageJsonPaths = findWorkspacePackageJsonPaths();
    const { scannedScriptCount } = scanTestScripts(packageJsonPaths);
    expect(
      scannedScriptCount,
      `Scanned package test script count: ${scannedScriptCount}`,
    ).toBeGreaterThanOrEqual(1);
  });

  it("has zero passWithNoTests quality-claim scripts", () => {
    const packageJsonPaths = findWorkspacePackageJsonPaths();
    const { hits, scannedScriptCount } = scanTestScripts(packageJsonPaths);
    const hitList = hits
      .map(
        (h) =>
          `  - ${h.packageJsonPath.replace(REPO_ROOT + "/", "")} → ${h.scriptName}: "${h.script}"`,
      )
      .join("\n");
    expect(
      hits.length,
      `PassWithNoTests quality-claim count: ${hits.length} ` +
        `(scanned ${scannedScriptCount} test scripts).\n` +
        `Remove or quarantine these scripts so they are not treated as quality proof:\n${hitList}`,
    ).toBe(0);
  });
});
