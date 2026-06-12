/**
 * Phase 2 — Task 7 (Red, FR-6): Node ESM smoke for `packages/db`.
 *
 * Spec: measure/tracks/db_migration_ledger_20260611/spec.md §FR-6, §AC 7.
 * Strategy: measure/tracks/db_migration_ledger_20260611/test-strategy.md §5, §7.
 *
 * Bounded smoke per test-strategy §7: spawns
 *   `node --input-type=module -e "import('<absolute dist>/index.js')"`
 * with a stub `DATABASE_URL` and asserts exit 0 plus an explicit "imported"
 * stdout marker. No directory globbing, no glob fallthrough.
 *
 * On master (2026-06-12) the package's `dist/schema/index.js` re-exports from
 * `./users`, `./classrooms`, etc. without `.js` extensions. With
 * `"type": "module"`, plain Node ESM cannot resolve those — the import throws
 * ERR_MODULE_NOT_FOUND. The assertion below is Red for the *intended* reason.
 *
 * Targeted Red command:
 *   pnpm vitest run src/__tests__/package-esm-smoke.test.ts
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const DIST_ENTRY = join(PACKAGE_ROOT, "dist", "index.js");

interface SpawnResult {
  status: number | null;
  stdout: string;
  stderr: string;
  signal: NodeJS.Signals | null;
}

function runNodeImport(): Promise<SpawnResult> {
  return new Promise((resolveP, rejectP) => {
    // Mark stdout so the test can assert the import actually executed.
    const code = `import("${DIST_ENTRY}").then(() => process.stdout.write("imported")).catch((e) => { process.stderr.write(String(e && e.message || e)); process.exit(1); })`;
    const child = spawn("node", ["--input-type=module", "-e", code], {
      cwd: PACKAGE_ROOT,
      env: {
        ...process.env,
        DATABASE_URL: "postgresql://stub:stub@127.0.0.1:65535/stub",
        NODE_ENV: "development",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    const killTimer = setTimeout(() => {
      child.kill("SIGKILL");
      rejectP(new Error(`node import timed out after 10s. stdout=${stdout} stderr=${stderr}`));
    }, 10_000);
    child.on("error", (err) => {
      clearTimeout(killTimer);
      rejectP(err);
    });
    child.on("exit", (status, signal) => {
      clearTimeout(killTimer);
      resolveP({ status, stdout, stderr, signal });
    });
  });
}

describe("package-esm-smoke — FR-6 (Node ESM can import the built package)", () => {
  it("dist/index.js exists (build prerequisite for the smoke)", () => {
    // The smoke spawns `node -e "import('dist/index.js')"`. If the dist is
    // missing the test is meaningless, so guard with a precondition. The
    // build command is `pnpm --filter @reading-advantage/db build`; this
    // assertion is informational and not the Red reason.
    expect(
      existsSync(DIST_ENTRY),
      "Run `pnpm --filter @reading-advantage/db build` before this test. " +
        `Expected: ${DIST_ENTRY}`
    ).toBe(true);
  });

  it("dist/schema/index.js has .js extensions on every relative re-export (FR-6 invariant)", () => {
    // The actual Red reason lives in the file content, not the spawn: a plain
    // Node ESM import of the package fails when any `export * from "./x"`
    // line lacks the `.js` extension. Asserting the file content here keeps
    // the Red test fast and dependency-free; the spawn test below exercises
    // the same contract end-to-end once the file is fixed.
    const schemaIndex = join(PACKAGE_ROOT, "dist", "schema", "index.js");
    const text = readFileSync(schemaIndex, "utf8");
    const lines = text.split("\n");
    const bad = lines
      .map((line, i) => ({ line, i }))
      .filter(({ line }) => /export\s*\*\s*from\s*["']\.\/[^"']+["']/.test(line))
      .filter(({ line }) => !/\.js["']/.test(line))
      .map(({ line, i }) => `line ${i + 1}: ${line.trim()}`);
    expect(
      bad,
      `Every \`export * from "./X"\` in dist/schema/index.js must end in \`.js\`. ` +
        `Plain Node ESM (--input-type=module) cannot resolve extensionless relative ` +
        `imports; the package currently only loads through bundlers. ` +
        `Offenders:\n${bad.join("\n")}`
    ).toEqual([]);
  });

  it("node --input-type=module can import the built package (FR-6 acceptance — currently Red)", { timeout: 15_000 }, async () => {
    const result = await runNodeImport();
    expect(
      result.stdout,
      `node ESM import of ${DIST_ENTRY} must write the "imported" stdout marker. ` +
        `Got stdout=${result.stdout} stderr=${result.stderr} status=${result.status}. ` +
        `On master the package's dist/schema/index.js uses extensionless relative ` +
        `re-exports (e.g. \`export * from "./users"\`) which Node ESM cannot resolve. ` +
        `Green adds .js extensions to every relative import in packages/db/src (FR-6).`
    ).toContain("imported");
    expect(
      result.status,
      `node ESM import must exit 0. Got status=${result.status} stderr=${result.stderr}.`
    ).toBe(0);
  });
});
