import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const DOMAIN_ROOT = resolve(import.meta.dirname, "../..");
const REPO_ROOT = resolve(DOMAIN_ROOT, "../..");
const DIST_MASTERY_INDEX = join(DOMAIN_ROOT, "dist/mastery/index.js");
const DB_WARNING = /DATABASE_URL|database operations will fail|database unavailable/i;

type CommandResult = ReturnType<typeof spawnSync> & {
  stderr: string;
  stdout: string;
};

function dbFreeEnvironment(): NodeJS.ProcessEnv {
  const environment = { ...process.env };
  delete environment.DATABASE_URL;
  delete environment.DIRECT_DATABASE_URL;
  delete environment.POSTGRES_URL;
  return environment;
}

function runModuleScript(source: string): CommandResult {
  return spawnSync(process.execPath, ["--input-type=module", "--eval", source], {
    cwd: DOMAIN_ROOT,
    encoding: "utf8",
    env: dbFreeEnvironment(),
    timeout: 30_000,
  }) as CommandResult;
}

function compileProbe(source: string): CommandResult {
  const directory = mkdtempSync(join(tmpdir(), "mastery-public-api-"));
  const probePath = join(directory, "probe.ts");
  writeFileSync(probePath, source);
  try {
    return spawnSync(
      "pnpm",
      [
        "exec",
        "tsc",
        "--noEmit",
        "--strict",
        "--skipLibCheck",
        "--target",
        "ES2022",
        "--module",
        "NodeNext",
        "--moduleResolution",
        "NodeNext",
        probePath,
      ],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        env: dbFreeEnvironment(),
        timeout: 30_000,
      },
    ) as CommandResult;
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
}

function diagnostics(result: CommandResult): string {
  return `${result.stdout}\n${result.stderr}`.trim();
}

describe("mastery persistence public API", () => {
  beforeAll(() => {
    execFileSync("pnpm", ["--dir", DOMAIN_ROOT, "build"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: dbFreeEnvironment(),
      timeout: 120_000,
    });
  }, 125_000);

  it("keeps the underlying contracts module cold-importable as a passing control", () => {
    const result = runModuleScript(
      'await import("./dist/mastery/persistence-contracts.js");',
    );

    expect(result.status, diagnostics(result)).toBe(0);
    expect(result.stderr).not.toMatch(DB_WARNING);
  });

  it("exports each approved mastery package boundary", () => {
    const packageJson = JSON.parse(
      readFileSync(join(DOMAIN_ROOT, "package.json"), "utf8"),
    ) as { exports: Record<string, unknown> };
    const required = [
      "./mastery",
      "./mastery/contracts",
      "./mastery/service",
      "./mastery/adapters/memory",
      "./mastery/adapters/drizzle",
      "./mastery/legacy",
    ];

    for (const subpath of required) {
      expect.soft(packageJson.exports).toHaveProperty(subpath);
    }
  });

  it("cold-imports the facade with database variables unset and no database warning", () => {
    const result = runModuleScript(
      'await import("@reading-advantage/domain/mastery");',
    );

    expect(result.status, diagnostics(result)).toBe(0);
    expect(result.stderr).not.toMatch(DB_WARNING);
  });

  it("cold-imports every approved pure or injected subpath with database variables unset", () => {
    const subpaths = [
      "contracts",
      "service",
      "adapters/memory",
      "adapters/drizzle",
    ];

    for (const subpath of subpaths) {
      const result = runModuleScript(
        `await import("@reading-advantage/domain/mastery/${subpath}");`,
      );
      expect.soft(result.status, `${subpath}: ${diagnostics(result)}`).toBe(0);
      expect.soft(result.stderr, subpath).not.toMatch(DB_WARNING);
    }
  });

  it("preserves legacy facade names as a passing compatibility control", () => {
    const result = runModuleScript(`
      const mastery = await import("@reading-advantage/domain/mastery");
      const names = ["recordRun", "recordRunFailure", "resetRateLimitStore", "RateLimitError"];
      if (!names.every((name) => typeof mastery[name] === "function")) process.exit(9);
    `);

    expect(result.status, diagnostics(result)).toBe(0);
  }, 30_000);

  it("provides the legacy compatibility surface lazily and without database initialization", () => {
    const result = runModuleScript(`
      const legacy = await import("@reading-advantage/domain/mastery/legacy");
      const names = ["recordRun", "recordRunFailure", "resetRateLimitStore", "RateLimitError"];
      if (!names.every((name) => typeof legacy[name] === "function")) process.exit(9);
    `);

    expect(result.status, diagnostics(result)).toBe(0);
    expect(result.stderr).not.toMatch(DB_WARNING);
  });

  it("keeps a known-good type import as a compile-probe control", () => {
    const result = compileProbe(`
      import type { MasteryPersistencePort } from ${JSON.stringify(DIST_MASTERY_INDEX)};
      declare const port: MasteryPersistencePort;
      void port.readSnapshot;
    `);

    expect(result.status, diagnostics(result)).toBe(0);
  }, 30_000);

  it("makes the public input type exactly infer from the one public schema", () => {
    const result = compileProbe(`
      import {
        commitMasteryEvidenceInputSchema,
        type CommitMasteryEvidenceInput,
      } from ${JSON.stringify(DIST_MASTERY_INDEX)};
      type Output<T> = T extends { parse(input: unknown): infer R } ? R : never;
      type Equal<A, B> =
        (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
          ? (<T>() => T extends B ? 1 : 2) extends (<T>() => T extends A ? 1 : 2)
            ? true
            : false
          : false;
      const schemaAndTypeAreIdentical: Equal<
        Output<typeof commitMasteryEvidenceInputSchema>,
        CommitMasteryEvidenceInput
      > = true;
      void schemaAndTypeAreIdentical;
    `);

    expect(result.status, diagnostics(result)).toBe(0);
  }, 30_000);

  it("directly composes the Drizzle adapter with the public service port", () => {
    const result = compileProbe(`
      import {
        commitMasteryEvidence,
        createDrizzleMasteryPersistence,
        type MasteryPersistencePort,
      } from ${JSON.stringify(DIST_MASTERY_INDEX)};
      const persistence: MasteryPersistencePort = createDrizzleMasteryPersistence({
        db: {},
        tenant: { schoolId: "11111111-1111-4111-8111-111111111111" },
        actorId: "teacher:opaque-alpha",
      });
      void commitMasteryEvidence({} as never, {
        persistence,
        clock: () => "2026-07-10T05:00:00.000Z",
        idFactory: () => "11111111-1111-4111-8111-111111111111",
      });
    `);

    expect(result.status, diagnostics(result)).toBe(0);
  }, 30_000);
});
