import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  analyzeArchitectureSources,
  loadArchitectureSources,
} from "../analyzer.js";
import { loadOwnershipMap } from "../ownership-map.js";

const temporaryRoots: string[] = [];

/** Creates one isolated workspace with a nearest-package tsconfig. */
async function createWorkspaceRoot(): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "architecture-scale-"));
  temporaryRoots.push(root);
  await mkdir(resolve(root, "apps/example/src"), { recursive: true });
  await writeFile(
    resolve(root, "apps/example/tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        baseUrl: ".",
        paths: { "@/*": ["src/*"] },
      },
    }),
  );
  return root;
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("architecture source loading at repository scale", () => {
  it("uses the nearest tsconfig, maps emitted .js to TypeScript, and ignores asset misses", async () => {
    const repoRoot = await createWorkspaceRoot();
    await mkdir(resolve(repoRoot, "apps/example/src/types"), {
      recursive: true,
    });
    await writeFile(
      resolve(repoRoot, "apps/example/src/value.ts"),
      "export const value = 1;\n",
    );
    await writeFile(
      resolve(repoRoot, "apps/example/src/types/index.d.ts"),
      "export interface ExampleType { value: number }\n",
    );
    await writeFile(
      resolve(repoRoot, "apps/example/src/page.ts"),
      [
        'import { value } from "@/value.js";',
        'import type { ExampleType } from "@/types/index";',
        'import "./theme.css";',
        'const pending = import("./value?isolated-test");',
        "export const page = value;",
        "export type PageType = ExampleType;",
        "void pending;",
      ].join("\n"),
    );

    const result = await loadArchitectureSources({
      repoRoot,
      sourcePaths: ["apps/example/src/page.ts"],
      workspaceTargets: new Map(),
    });

    expect(result.parseErrors).toEqual([]);
    expect(result.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          importSpecifier: "@/value.js",
          resolvedTarget: "apps/example/src/value.ts",
        }),
        expect.objectContaining({
          importSpecifier: "./theme.css",
          resolvedTarget: "external:./theme.css",
        }),
        expect.objectContaining({
          importSpecifier: "@/types/index",
          resolvedTarget: "apps/example/src/types/index.d.ts",
        }),
        expect.objectContaining({
          importSpecifier: "./value?isolated-test",
          resolvedTarget: "apps/example/src/value.ts",
        }),
      ]),
    );
  });

  it("resolves path aliases inherited from an extended tsconfig", async () => {
    const repoRoot = await createWorkspaceRoot();
    await mkdir(resolve(repoRoot, "shared"), { recursive: true });
    await writeFile(
      resolve(repoRoot, "tsconfig.base.json"),
      JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: { "@shared/*": ["shared/*"] },
        },
      }),
    );
    await writeFile(
      resolve(repoRoot, "apps/example/tsconfig.json"),
      JSON.stringify({ extends: "../../tsconfig.base.json" }),
    );
    await writeFile(
      resolve(repoRoot, "shared/value.ts"),
      "export const value = 1;\n",
    );
    await writeFile(
      resolve(repoRoot, "apps/example/src/page.ts"),
      'import { value } from "@shared/value.js";\nexport { value };\n',
    );

    const result = await loadArchitectureSources({
      repoRoot,
      sourcePaths: ["apps/example/src/page.ts"],
      workspaceTargets: new Map(),
    });

    expect(result.parseErrors).toEqual([]);
    expect(result.evidence).toContainEqual(
      expect.objectContaining({
        importSpecifier: "@shared/value.js",
        resolvedTarget: "shared/value.ts",
      }),
    );
  });

  it("remains fail-closed for missing extensionless and emitted-code imports", async () => {
    const repoRoot = await createWorkspaceRoot();
    await writeFile(
      resolve(repoRoot, "apps/example/src/page.ts"),
      [
        'import "./missing";',
        'import "@/also-missing.js";',
      ].join("\n"),
    );

    const result = await loadArchitectureSources({
      repoRoot,
      sourcePaths: ["apps/example/src/page.ts"],
      workspaceTargets: new Map(),
    });

    expect(result.parseErrors).toEqual([
      expect.objectContaining({ code: "MODULE_RESOLUTION_ERROR", line: 1 }),
      expect.objectContaining({ code: "MODULE_RESOLUTION_ERROR", line: 2 }),
    ]);
  });

  it("processes a shared-config source batch deterministically within a bounded interval", async () => {
    const repoRoot = await createWorkspaceRoot();
    const sourcePaths = Array.from(
      { length: 256 },
      (_, index) => `apps/example/src/source-${index}.ts`,
    );
    await writeFile(
      resolve(repoRoot, "apps/example/src/shared.ts"),
      "export const shared = 1;\n",
    );
    await Promise.all(
      sourcePaths.map((sourcePath, index) =>
        writeFile(
          resolve(repoRoot, sourcePath),
          [
            'import { shared } from "@/shared.js";',
            'import "./theme.css";',
            `export const value${index} = shared;`,
          ].join("\n"),
        ),
      ),
    );

    const startedAt = performance.now();
    const forward = await loadArchitectureSources({
      repoRoot,
      sourcePaths,
      workspaceTargets: new Map(),
    });
    const elapsedMilliseconds = performance.now() - startedAt;
    const reverse = await loadArchitectureSources({
      repoRoot,
      sourcePaths: [...sourcePaths].reverse(),
      workspaceTargets: new Map(),
    });

    expect(forward.parseErrors).toEqual([]);
    expect(forward.evidence).toHaveLength(sourcePaths.length * 2);
    expect(JSON.stringify(reverse)).toBe(JSON.stringify(forward));
    expect(elapsedMilliseconds).toBeLessThan(10_000);
  }, 20_000);

  it("propagates policy origins through cyclic barrels independent of source order", async () => {
    const repoRoot = await createWorkspaceRoot();
    const sources = new Map([
      [
        "apps/example/src/direct.ts",
        'export { db } from "@reading-advantage/db";\n',
      ],
      [
        "apps/example/src/barrel-a.ts",
        'export { db } from "./barrel-b";\n',
      ],
      [
        "apps/example/src/barrel-b.ts",
        [
          'export { db } from "./direct";',
          'export * from "./barrel-a";',
        ].join("\n"),
      ],
      [
        "apps/example/src/consumer.ts",
        [
          'import { db } from "./barrel-a";',
          "export const consumer = db;",
        ].join("\n"),
      ],
    ]);
    await Promise.all(
      [...sources].map(([sourcePath, source]) =>
        writeFile(resolve(repoRoot, sourcePath), source),
      ),
    );
    const sourcePaths = [...sources.keys()];
    const config = loadOwnershipMap();

    const forward = await analyzeArchitectureSources({
      repoRoot,
      sourcePaths,
      workspaceTargets: new Map(),
      config,
    });
    const reverse = await analyzeArchitectureSources({
      repoRoot,
      sourcePaths: [...sourcePaths].reverse(),
      workspaceTargets: new Map(),
      config,
    });

    expect(forward.parseErrors).toEqual([]);
    expect(JSON.stringify(reverse)).toBe(JSON.stringify(forward));
    expect(forward.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourcePath: "apps/example/src/consumer.ts",
          ruleId: "DATABASE_BOUNDARY",
        }),
      ]),
    );
  });

  it("keeps same-name client bindings isolated across lexical scopes", async () => {
    const repoRoot = await createWorkspaceRoot();
    const sourcePath = "apps/example/src/scoped-client.ts";
    await writeFile(
      resolve(repoRoot, sourcePath),
      [
        'import postgres from "postgres";',
        "export function tainted() {",
        "  const client = postgres();",
        '  return client.unsafe("select 1");',
        "}",
        "export function safe(client: { unsafe(value: string): string }) {",
        '  return client.unsafe("local-only");',
        "}",
      ].join("\n"),
    );

    const result = await analyzeArchitectureSources({
      repoRoot,
      sourcePaths: [sourcePath],
      workspaceTargets: new Map(),
      config: loadOwnershipMap(),
    });

    expect(result.parseErrors).toEqual([]);
    expect(
      result.findings.filter(
        (finding) => finding.evidenceKind === "query-call",
      ),
    ).toEqual([
      expect.objectContaining({ sourcePath, line: 4, column: 10 }),
    ]);
  });
});
