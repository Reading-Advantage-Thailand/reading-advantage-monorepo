import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative, resolve, sep } from "node:path";

import { describe, expect, it } from "vitest";

const workerSourceRoot = fileURLToPath(new URL("../", import.meta.url));
const repositoryRoot = resolve(fileURLToPath(new URL("../../../../", import.meta.url)));
const workerCompositionSource = fileURLToPath(
  new URL("../worker-composition.ts", import.meta.url),
);
const exactPostgresAdapterRoot = resolve(
  repositoryRoot,
  "packages/backend/src/jobs/adapters/postgres",
);
const backendJobsRoot = resolve(repositoryRoot, "packages/backend/src/jobs");

const collectSourceFiles = async (
  root: string,
  extensions: ReadonlySet<string> = new Set([".ts"]),
): Promise<string[]> => {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(path, extensions)));
    } else if (entry.isFile() && extensions.has(path.slice(path.lastIndexOf(".")))) {
      files.push(path);
    }
  }

  return files.sort();
};

const readProductionSources = async (): Promise<
  Array<{ path: string; source: string }>
> => {
  const files = (await collectSourceFiles(workerSourceRoot)).filter(
    (path) => !path.includes(`${sep}__tests__${sep}`),
  );
  return Promise.all(
    files.map(async (path) => ({ path, source: await readFile(path, "utf8") })),
  );
};

const importSpecifierPattern =
  /(?:\bfrom\s+|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)["'`]([^"'`]+)["'`]/g;

const extractImportSpecifiers = (source: string): string[] =>
  Array.from(source.matchAll(importSpecifierPattern), (match) => match[1]).filter(
    (specifier): specifier is string => typeof specifier === "string",
  );

describe("durable worker architecture Red contract", () => {
  it("provides the named worker composition root before lifecycle behavior is wired", () => {
    expect(
      existsSync(workerCompositionSource),
      "Missing worker composition module: services/worker/src/worker-composition.ts",
    ).toBe(true);
  });

  it("keeps direct database clients and schema imports out of worker production source", async () => {
    const sources = await readProductionSources();
    const forbiddenImports: string[] = [];

    for (const { path, source } of sources) {
      for (const specifier of extractImportSpecifiers(source)) {
        if (
          specifier === "pg" ||
          specifier === "postgres" ||
          specifier === "drizzle-orm" ||
          specifier.startsWith("@reading-advantage/db") ||
          specifier.includes("/schema") ||
          specifier.includes("/packages/db")
        ) {
          forbiddenImports.push(`${relative(repositoryRoot, path)} -> ${specifier}`);
        }
      }
    }

    expect(forbiddenImports).toEqual([]);
  });

  it("keeps SQL and durable job-table references out of worker production source", async () => {
    const sources = await readProductionSources();
    const forbiddenReferences: string[] = [];
    const sqlPattern =
      /\b(?:SELECT|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|CREATE\s+(?:TABLE|INDEX|SCHEMA)|ALTER\s+TABLE|DROP\s+(?:TABLE|SCHEMA)|TRUNCATE|FOR\s+UPDATE|SKIP\s+LOCKED)\b|\b(?:review_jobs|durable_jobs|job_table|jobTable)\b/i;

    for (const { path, source } of sources) {
      if (sqlPattern.test(source)) {
        forbiddenReferences.push(relative(repositoryRoot, path));
      }
    }

    expect(forbiddenReferences).toEqual([]);
  });

  it("allows worker imports from only the provider-neutral backend jobs port", async () => {
    const sources = await readProductionSources();
    const disallowedBackendImports: string[] = [];

    for (const { path, source } of sources) {
      for (const specifier of extractImportSpecifiers(source)) {
        if (
          specifier.startsWith("@reading-advantage/backend") &&
          specifier !== "@reading-advantage/backend/jobs"
        ) {
          disallowedBackendImports.push(`${relative(repositoryRoot, path)} -> ${specifier}`);
        }
        if (specifier.includes("/packages/backend/")) {
          disallowedBackendImports.push(`${relative(repositoryRoot, path)} -> ${specifier}`);
        }
      }
    }

    expect(disallowedBackendImports).toEqual([]);
  });

  it("confines queue persistence signals to the exact backend PostgreSQL adapter root", async () => {
    const files = (await collectSourceFiles(
      backendJobsRoot,
      new Set([".ts", ".sql"]),
    )).filter(
      (path) => !path.includes(`${sep}__tests__${sep}`),
    );
    const persistenceSignalsOutsideRoot: string[] = [];
    const persistencePattern =
      /(?:from\s+["'`](?:pg|postgres|drizzle-orm|@reading-advantage\/db)|\b(?:SELECT|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|CREATE\s+(?:TABLE|INDEX|SCHEMA)|ALTER\s+TABLE|DROP\s+(?:TABLE|SCHEMA)|TRUNCATE|FOR\s+UPDATE|SKIP\s+LOCKED)\b|\b(?:review_jobs|durable_jobs)\b)/i;

    for (const path of files) {
      const source = await readFile(path, "utf8");
      if (persistencePattern.test(source) && !path.startsWith(`${exactPostgresAdapterRoot}${sep}`)) {
        persistenceSignalsOutsideRoot.push(relative(repositoryRoot, path));
      }
    }

    expect(persistenceSignalsOutsideRoot).toEqual([]);
  });
});
