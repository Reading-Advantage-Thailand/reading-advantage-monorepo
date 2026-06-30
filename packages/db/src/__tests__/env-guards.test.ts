/**
 * Phase 2 — Task 7 (Red, FR-7): fail-fast env guards for `client.ts` and
 * warn-once for `privileged.ts`.
 *
 * Spec: measure/tracks/db_migration_ledger_20260611/spec.md §FR-7.
 * Strategy: measure/tracks/db_migration_ledger_20260611/test-strategy.md §1, §3, §5, §7.
 *
 * Behavior-based subprocess tests: each case spawns Node, imports the real
 * built module under controlled env vars, and asserts on exit code plus
 * stderr/stdout messages. No source-text regex.
 *
 * | Runtime shape                                          | Expected        |
 * |--------------------------------------------------------|-----------------|
 * | NODE_ENV=production, NEXT_PHASE unset, no URL          | throw at import |
 * | NODE_ENV=production, NEXT_PHASE=phase-production-build | no throw        |
 * | NODE_ENV=development, no URL                           | warn, no throw  |
 * | DIRECT_DATABASE_URL unset, DATABASE_URL set (priv)     | warn once       |
 *
 * Targeted Red command:
 *   pnpm vitest run src/__tests__/env-guards.test.ts
 */

import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const DIST_CLIENT = join(PACKAGE_ROOT, "dist", "client.js");
const DIST_PRIVILEGED = join(PACKAGE_ROOT, "dist", "privileged.js");
const STUB_URL = "postgresql://app:app@127.0.0.1:65535/app";

const distClientExists = existsSync(DIST_CLIENT);
const distPrivilegedExists = existsSync(DIST_PRIVILEGED);

interface SpawnResult {
  status: number | null;
  stdout: string;
  stderr: string;
  signal: NodeJS.Signals | null;
}

function runNode(
  code: string,
  env: Record<string, string | undefined>
): Promise<SpawnResult> {
  return new Promise((resolveP, rejectP) => {
    const child = spawn("node", ["--input-type=module", "-e", code], {
      cwd: PACKAGE_ROOT,
      env: {
        PATH: process.env.PATH ?? "",
        HOME: process.env.HOME ?? "",
        NODE_ENV: env.NODE_ENV,
        NEXT_PHASE: env.NEXT_PHASE,
        DATABASE_URL: env.DATABASE_URL,
        DIRECT_DATABASE_URL: env.DIRECT_DATABASE_URL,
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
      rejectP(
        new Error(
          `harness timed out after 10s. stdout=${stdout} stderr=${stderr}`
        )
      );
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

describe("env-guards — FR-7 (client.ts production-runtime fail-fast)", () => {
  const suite = distClientExists ? describe : describe.skip;
  suite("client.ts production-runtime fail-fast", () => {
    it("throws on missing DATABASE_URL when NODE_ENV=production and NEXT_PHASE is unset", async () => {
    const result = await runNode(
      `import("${DIST_CLIENT}").then(() => process.stdout.write("imported"));`,
      {
        NODE_ENV: "production",
        DATABASE_URL: undefined,
        DIRECT_DATABASE_URL: undefined,
        NEXT_PHASE: undefined,
      }
    );

    expect(
      result.status,
      `expected exit code 1 (uncaught throw); got status=${result.status} stdout=${result.stdout} stderr=${result.stderr}`
    ).toBe(1);
    expect(
      result.stderr,
      `expected production-runtime DATABASE_URL error in stderr; got stdout=${result.stdout} stderr=${result.stderr}`
    ).toContain("DATABASE_URL is required in production runtime");
  });

  it("does NOT throw on missing DATABASE_URL when NEXT_PHASE=phase-production-build", async () => {
    const result = await runNode(
      `import("${DIST_CLIENT}").then(() => process.stdout.write("imported"));`,
      {
        NODE_ENV: "production",
        DATABASE_URL: undefined,
        DIRECT_DATABASE_URL: undefined,
        NEXT_PHASE: "phase-production-build",
      }
    );

    expect(
      result.status,
      `expected exit code 0 during build phase; got status=${result.status} stdout=${result.stdout} stderr=${result.stderr}`
    ).toBe(0);
    expect(
      result.stderr,
      `must not emit the production-runtime DATABASE_URL error during build phase; got stderr=${result.stderr}`
    ).not.toContain("DATABASE_URL is required in production runtime");
  });

    it("warns on missing DATABASE_URL in development runtime", async () => {
      const result = await runNode(
        `import("${DIST_CLIENT}").then(() => process.stdout.write("imported"));`,
        {
          NODE_ENV: "development",
          DATABASE_URL: undefined,
          DIRECT_DATABASE_URL: undefined,
          NEXT_PHASE: undefined,
        }
      );

      expect(
        result.status,
        `expected exit code 0 in development; got status=${result.status} stdout=${result.stdout} stderr=${result.stderr}`
      ).toBe(0);
      expect(
        result.stderr,
        `expected dev warning about missing DATABASE_URL; got stdout=${result.stdout} stderr=${result.stderr}`
      ).toContain("DATABASE_URL is not set");
    });
  });
});

const privSuite = distPrivilegedExists ? describe : describe.skip;
privSuite("env-guards — FR-7 (privileged.ts warn-once on DATABASE_URL fallback)", () => {
  it("warns when DIRECT_DATABASE_URL is unset and DATABASE_URL is used", async () => {
    const result = await runNode(
      `const { createPrivilegedDb } = await import("${DIST_PRIVILEGED}"); ` +
        `const { client } = createPrivilegedDb(); ` +
        `await client.end(); ` +
        `process.stdout.write("created");`,
      {
        NODE_ENV: "development",
        DATABASE_URL: STUB_URL,
        DIRECT_DATABASE_URL: undefined,
      }
    );

    expect(
      result.status,
      `expected exit code 0; got status=${result.status} stdout=${result.stdout} stderr=${result.stderr}`
    ).toBe(0);
    expect(
      result.stderr,
      `expected fallback warning in stderr; got stdout=${result.stdout} stderr=${result.stderr}`
    ).toContain(
      "DIRECT_DATABASE_URL is not set — falling back to DATABASE_URL for privileged DB."
    );
  });
});
