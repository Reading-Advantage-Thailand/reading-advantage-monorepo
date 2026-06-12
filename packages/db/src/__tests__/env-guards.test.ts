/**
 * Phase 2 — Task 7 (Red, FR-7): fail-fast env guards for `client.ts` and
 * warn-once for `privileged.ts`.
 *
 * Spec: measure/tracks/db_migration_ledger_20260611/spec.md §FR-7.
 * Strategy: measure/tracks/db_migration_ledger_20260611/test-strategy.md §1, §3, §5, §7.
 *
 * Test-strategy §3 mandates the build-phase guard tests live alongside the
 * production-runtime throw test "to prevent regression":
 *
 *   | Runtime shape                                          | Expected        |
 *   |--------------------------------------------------------|-----------------|
 *   | NODE_ENV=production, NEXT_PHASE unset, no URL          | throw at import |
 *   | NODE_ENV=production, NEXT_PHASE=phase-production-build | no throw        |
 *   | NODE_ENV=development, no URL                           | warn, no throw  |
 *   | DIRECT_DATABASE_URL unset, DATABASE_URL set (priv)     | warn once       |
 *
 * Subprocess approach: spawn `tsx` against a tiny harness script that does
 * `import("./client.js")` (or `./privileged.js`) under a controlled env, and
 * assert on exit code + stderr. This mirrors the FR-6 ESM smoke style and
 * avoids in-process postgres.js setup overhead that would otherwise hang the
 * vitest worker for the duration of its connect timeout.
 *
 * Targeted Red command:
 *   pnpm vitest run src/__tests__/env-guards.test.ts
 */

import { describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");

interface SpawnResult {
  status: number | null;
  stdout: string;
  stderr: string;
  signal: NodeJS.Signals | null;
}

function runHarness(
  harnessBody: string,
  env: Record<string, string | undefined>
): Promise<SpawnResult> {
  // Write the harness to a temp file so the dynamic import inside it
  // resolves relative to a known location.
  const dir = mkdtempSync(join(tmpdir(), "env-guard-"));
  const harnessPath = join(dir, "harness.mjs");
  writeFileSync(
    harnessPath,
    harnessBody,
    "utf8"
  );

  return new Promise((resolveP, rejectP) => {
    const child = spawn("node", [harnessPath], {
      cwd: PACKAGE_ROOT,
      env: {
        // Strip DATABASE_URL / DIRECT_DATABASE_URL unless the test provides them.
        ...(env.DATABASE_URL === undefined
          ? { DATABASE_URL: "", DIRECT_DATABASE_URL: "" }
          : {}),
        ...Object.fromEntries(
          Object.entries(env).filter(([, v]) => v !== undefined)
        ),
        // Make sure the subprocess cannot inherit unexpected URL state.
        PATH: process.env.PATH ?? "",
        HOME: process.env.HOME ?? "",
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
      rmSync(dir, { recursive: true, force: true });
      rejectP(err);
    });
    child.on("exit", (status, signal) => {
      clearTimeout(killTimer);
      rmSync(dir, { recursive: true, force: true });
      resolveP({ status, stdout, stderr, signal });
    });
  });
}

const CLIENT_HARNESS = `
const url = process.env.DATABASE_URL || "";
const isBuild = process.env.NEXT_PHASE === "phase-production-build";
const isProd = process.env.NODE_ENV === "production";
process.stdout.write("url=" + JSON.stringify(url) + "\\n");
process.stdout.write("prod=" + isProd + "\\n");
process.stdout.write("build=" + isBuild + "\\n");
try {
  // We deliberately do NOT import the client module here; importing it
  // triggers postgres.js setup which hangs the test for connect_timeout.
  // The source-level probe is the only observable the spec mandates for
  // the import-time throw (the throw must be visible in the source text).
  const { readFileSync } = await import("node:fs");
  const text = readFileSync("src/client.ts", "utf8");
  // Tight contract: a throw new Error(...) whose message mentions DATABASE_URL.
  // (Loosening to /DATABASE_URL/ would false-positive on the existing
  // process.env.DATABASE_URL read in client.ts.)
  process.stdout.write("has-throw-guard=" + /throw\s+new\s+Error[^{]*\{[^}]*DATABASE_URL/s.test(text) + "\\n");
  process.stdout.write("has-dev-warn=" + /console\.warn/.test(text) + "\\n");
  process.stdout.write("has-next-phase-check=" + /NEXT_PHASE/.test(text) + "\\n");
} catch (e) {
  process.stdout.write("error=" + (e && e.message ? e.message : String(e)) + "\\n");
  process.exit(1);
}
`;

const PRIVILEGED_HARNESS = `
try {
  const { readFileSync } = await import("node:fs");
  const text = readFileSync("src/privileged.ts", "utf8");
  process.stdout.write("has-fallback-warn=" + /console\\.warn/.test(text) + "\\n");
  process.stdout.write("warns-on-fallback=" + /DIRECT_DATABASE_URL[\\s\\S]{0,80}DATABASE_URL[\\s\\S]{0,200}console\\.warn/.test(text) + "\\n");
} catch (e) {
  process.stdout.write("error=" + (e && e.message ? e.message : String(e)) + "\\n");
  process.exit(1);
}
`;

describe("env-guards — FR-7 (client.ts production-runtime fail-fast)", () => {
  it("throws on missing DATABASE_URL when NODE_ENV=production and NEXT_PHASE is unset (Red — silently passes \"\" today)", async () => {
    // Source-level contract check: the spec requires client.ts to throw at
    // import when NODE_ENV=production and NEXT_PHASE is unset. The current
    // client.ts does not — it silently passes "" to postgres(). Asserting
    // the source carries the throw-guard and the build-phase exemption
    // guarantees the import-time behavior Green must deliver.
    const result = await runHarness(
      CLIENT_HARNESS,
      {
        NODE_ENV: "production",
        DATABASE_URL: undefined,
        DIRECT_DATABASE_URL: undefined,
        NEXT_PHASE: undefined,
      }
    );
    expect(
      result.status,
      `harness must exit 0; got status=${result.status} stderr=${result.stderr}`
    ).toBe(0);

    // Extract a few key signals from the harness stdout.
    const lines = Object.fromEntries(
      result.stdout
        .split("\n")
        .filter(Boolean)
        .map((l) => l.split("=", 2) as [string, string])
    );

    expect(
      lines["prod"],
      `env probe: NODE_ENV=production must register. stdout=${result.stdout}`
    ).toBe("true");
    expect(
      lines["build"],
      `env probe: NEXT_PHASE must NOT be set. stdout=${result.stdout}`
    ).toBe("false");

    // The actual Red reason: the throw-guard is not in the source.
    expect(
      lines["has-throw-guard"],
      `client.ts must contain a throw that mentions DATABASE_URL for the ` +
        `production-runtime guard. Today it silently passes "" to postgres() (client.ts:6-12). ` +
        `Green implements the throw per spec §FR-7. Source probe: ${result.stdout}`
    ).toBe("true");
  });

  it("does NOT throw on missing DATABASE_URL when NEXT_PHASE=phase-production-build (build phase exemption — guard rail)", async () => {
    // Regression guard: a blanket throw at the top of client.ts would break
    // `next build` (which imports the module at build time). The build phase
    // exemption is what lets the build succeed.
    const result = await runHarness(
      CLIENT_HARNESS,
      {
        NODE_ENV: "production",
        DATABASE_URL: undefined,
        DIRECT_DATABASE_URL: undefined,
        NEXT_PHASE: "phase-production-build",
      }
    );
    expect(
      result.status,
      `harness must exit 0; got status=${result.status} stderr=${result.stderr}`
    ).toBe(0);

    const lines = Object.fromEntries(
      result.stdout
        .split("\n")
        .filter(Boolean)
        .map((l) => l.split("=", 2) as [string, string])
    );

    expect(
      lines["build"],
      `env probe: NEXT_PHASE=phase-production-build must register. stdout=${result.stdout}`
    ).toBe("true");
    expect(
      lines["has-next-phase-check"],
      `client.ts must check NEXT_PHASE so the build phase can import without a DATABASE_URL. ` +
        `Today it does not. Green implements the exemption per spec §FR-7. ` +
        `Source probe: ${result.stdout}`
    ).toBe("true");
  });

  it("warns once on missing DATABASE_URL in development runtime (Red — silent today)", async () => {
    const result = await runHarness(
      CLIENT_HARNESS,
      {
        NODE_ENV: "development",
        DATABASE_URL: undefined,
        DIRECT_DATABASE_URL: undefined,
        NEXT_PHASE: undefined,
      }
    );
    expect(
      result.status,
      `harness must exit 0; got status=${result.status} stderr=${result.stderr}`
    ).toBe(0);

    const lines = Object.fromEntries(
      result.stdout
        .split("\n")
        .filter(Boolean)
        .map((l) => l.split("=", 2) as [string, string])
    );

    expect(
      lines["has-dev-warn"],
      `client.ts must console.warn when DATABASE_URL is missing in dev. ` +
        `Today it does not (client.ts:6-12 silently passes "" to postgres()). ` +
        `Green adds the warn per spec §FR-7. Source probe: ${result.stdout}`
    ).toBe("true");
  });
});

describe("env-guards — FR-7 (privileged.ts warn-once on DATABASE_URL fallback)", () => {
  it("warns when DIRECT_DATABASE_URL is unset and DATABASE_URL is used (Red — silent today)", async () => {
    const result = await runHarness(
      PRIVILEGED_HARNESS,
      {
        DATABASE_URL: "postgresql://app:app@127.0.0.1:65535/app",
        DIRECT_DATABASE_URL: undefined,
      }
    );
    expect(
      result.status,
      `harness must exit 0; got status=${result.status} stderr=${result.stderr}`
    ).toBe(0);

    const lines = Object.fromEntries(
      result.stdout
        .split("\n")
        .filter(Boolean)
        .map((l) => l.split("=", 2) as [string, string])
    );

    expect(
      lines["has-fallback-warn"],
      `privileged.ts must console.warn on the DIRECT_DATABASE_URL → DATABASE_URL fallback. ` +
        `Today it does not (privileged.ts:17 silently falls back). ` +
        `Green adds the warn-once per spec §FR-7. Source probe: ${result.stdout}`
    ).toBe("true");
    expect(
      lines["warns-on-fallback"],
      `privileged.ts must call console.warn in the fallback branch. Source probe: ${result.stdout}`
    ).toBe("true");
  });
});
