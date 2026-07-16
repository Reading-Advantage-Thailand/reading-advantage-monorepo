import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { loadArchitectureSources } from "../analyzer.js";

const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const temporaryRoots: string[] = [];

/**
 * Creates one isolated analyzer root that does not depend on Git workspace state.
 * @returns Absolute temporary repository root.
 */
async function createTemporaryRoot(): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "architecture-analyzer-"));
  temporaryRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("architecture source loading and module resolution", () => {
  it("resolves exact workspace package exports to repository source files", async () => {
    const sourcePath =
      "test-fixtures/architecture-enforcement/database/direct/apps/marketing/src/direct.ts";
    const result = await loadArchitectureSources({
      repoRoot: repositoryRoot,
      sourcePaths: [sourcePath],
    });

    expect(result.parseErrors).toEqual([]);
    expect(result.evidence).toContainEqual(
      expect.objectContaining({
        sourcePath,
        evidenceKind: "static-import",
        importSpecifier: "@reading-advantage/db",
        resolvedTarget: "packages/db/src/index.ts",
      }),
    );
  });

  it("resolves tsconfig aliases and the aliased source re-export", async () => {
    const repoRoot = resolve(
      repositoryRoot,
      "test-fixtures/architecture-enforcement/database/alias",
    );
    const result = await loadArchitectureSources({
      repoRoot,
      resolverConfigPath: "tsconfig.json",
      sourcePaths: [
        "apps/sales/src/alias-import.ts",
        "packages/db-alias/src/index.ts",
      ],
      workspaceTargets: new Map(),
    });

    expect(result.parseErrors).toEqual([]);
    expect(result.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourcePath: "apps/sales/src/alias-import.ts",
          evidenceKind: "static-import",
          importSpecifier: "@fixture/db-alias",
          resolvedTarget: "packages/db-alias/src/index.ts",
        }),
        expect.objectContaining({
          sourcePath: "packages/db-alias/src/index.ts",
          evidenceKind: "re-export",
          importSpecifier: "@reading-advantage/db/schema",
          resolvedTarget: "external:@reading-advantage/db/schema",
        }),
      ]),
    );
  });

  it("resolves local barrels and static-string dynamic imports", async () => {
    const barrelRoot = resolve(
      repositoryRoot,
      "test-fixtures/architecture-enforcement/database/barrel",
    );
    const barrel = await loadArchitectureSources({
      repoRoot: barrelRoot,
      sourcePaths: [
        "apps/marketing/src/report.ts",
        "apps/marketing/src/db-barrel.ts",
      ],
      workspaceTargets: new Map(),
    });
    const dynamicRoot = resolve(
      repositoryRoot,
      "test-fixtures/architecture-enforcement/database/dynamic",
    );
    const dynamic = await loadArchitectureSources({
      repoRoot: dynamicRoot,
      sourcePaths: ["apps/sales/src/load-database.ts"],
      workspaceTargets: new Map(),
    });

    expect(barrel.parseErrors).toEqual([]);
    expect(barrel.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourcePath: "apps/marketing/src/report.ts",
          evidenceKind: "static-import",
          resolvedTarget: "apps/marketing/src/db-barrel.ts",
        }),
        expect.objectContaining({
          sourcePath: "apps/marketing/src/db-barrel.ts",
          evidenceKind: "re-export",
          resolvedTarget: "external:@reading-advantage/db/schema",
        }),
      ]),
    );
    expect(dynamic.parseErrors).toEqual([]);
    expect(dynamic.evidence).toContainEqual(
      expect.objectContaining({
        evidenceKind: "dynamic-import",
        resolvedTarget: "external:@reading-advantage/db",
      }),
    );
  });

  it("records namespace imports and CommonJS requires without source bodies", async () => {
    const repoRoot = await createTemporaryRoot();
    await writeFile(
      resolve(repoRoot, "source.ts"),
      [
        'import * as database from "database-sdk";',
        'const provider = require("provider-sdk");',
        "export { database, provider };",
      ].join("\n"),
    );

    const result = await loadArchitectureSources({
      repoRoot,
      sourcePaths: ["source.ts"],
      workspaceTargets: new Map(),
    });

    expect(result.parseErrors).toEqual([]);
    expect(result.evidence.map((item) => item.evidenceKind)).toEqual([
      "namespace-import",
      "commonjs-require",
    ]);
    expect(JSON.stringify(result)).not.toContain("const provider");
  });

  it("fails closed for malformed source, resolver config, and internal modules", async () => {
    const repoRoot = await createTemporaryRoot();
    await writeFile(
      resolve(repoRoot, "malformed.ts"),
      "export const broken = ;",
    );
    await writeFile(
      resolve(repoRoot, "missing.ts"),
      'export * from "./absent";',
    );
    await writeFile(resolve(repoRoot, "tsconfig.json"), "{");

    const result = await loadArchitectureSources({
      repoRoot,
      resolverConfigPath: "tsconfig.json",
      sourcePaths: ["malformed.ts", "missing.ts", "unreadable.ts"],
      workspaceTargets: new Map(),
    });

    expect(result.parseErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourcePath: "malformed.ts",
          code: "TYPESCRIPT_PARSE_ERROR",
        }),
        expect.objectContaining({
          sourcePath: "missing.ts",
          code: "MODULE_RESOLUTION_ERROR",
        }),
        expect.objectContaining({
          sourcePath: "tsconfig.json",
          code: "RESOLVER_CONFIG_ERROR",
        }),
        expect.objectContaining({
          sourcePath: "unreadable.ts",
          code: "FILE_READ_ERROR",
        }),
      ]),
    );
  });

  it("emits byte-identical results for reversed input order", async () => {
    const repoRoot = resolve(
      repositoryRoot,
      "test-fixtures/architecture-enforcement/database/barrel",
    );
    const forwardPaths = [
      "apps/marketing/src/report.ts",
      "apps/marketing/src/db-barrel.ts",
    ];
    const forward = await loadArchitectureSources({
      repoRoot,
      sourcePaths: forwardPaths,
      workspaceTargets: new Map(),
    });
    const reverse = await loadArchitectureSources({
      repoRoot,
      sourcePaths: [...forwardPaths].reverse(),
      workspaceTargets: new Map(),
    });

    expect(JSON.stringify(reverse)).toBe(JSON.stringify(forward));
  });
});
