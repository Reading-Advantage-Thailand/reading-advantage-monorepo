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

  it("resolves tracked package tsconfig aliases without node_modules bytes", async () => {
    const repoRoot = await createWorkspaceRoot();
    await mkdir(resolve(repoRoot, "packages/config/tsconfig"), {
      recursive: true,
    });
    await writeFile(
      resolve(repoRoot, "packages/config/package.json"),
      JSON.stringify({
        name: "@reading-advantage/config",
        exports: { "./tsconfig": "./tsconfig/base.json" },
      }),
    );
    await writeFile(
      resolve(repoRoot, "packages/config/tsconfig/base.json"),
      JSON.stringify({ compilerOptions: { strict: true } }),
    );
    await writeFile(
      resolve(repoRoot, "apps/example/tsconfig.json"),
      JSON.stringify({
        extends: "@reading-advantage/config/tsconfig",
        compilerOptions: { paths: { "@/*": ["./src/*"] } },
      }),
    );
    await writeFile(
      resolve(repoRoot, "apps/example/src/value.ts"),
      "export const value = 1;\n",
    );
    await writeFile(
      resolve(repoRoot, "apps/example/src/page.ts"),
      'import { value } from "@/value.js";\nexport { value };\n',
    );

    const result = await loadArchitectureSources({
      repoRoot,
      sourcePaths: ["apps/example/src/page.ts"],
      workspaceTargets: new Map(),
      trackedSourceOnly: true,
    });

    expect(result.parseErrors).toEqual([]);
    expect(result.evidence).toContainEqual(
      expect.objectContaining({
        importSpecifier: "@/value.js",
        resolvedTarget: "apps/example/src/value.ts",
      }),
    );
  });

  it("remains fail-closed for missing extensionless and emitted-code imports", async () => {
    const repoRoot = await createWorkspaceRoot();
    await writeFile(
      resolve(repoRoot, "apps/example/src/page.ts"),
      ['import "./missing";', 'import "@/also-missing.js";'].join("\n"),
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

  it("preserves logical package build targets in normal and tracked modes", async () => {
    const repoRoot = await createWorkspaceRoot();
    await mkdir(resolve(repoRoot, "apps/example"), { recursive: true });
    await mkdir(resolve(repoRoot, "packages/example/scripts"), {
      recursive: true,
    });
    await mkdir(resolve(repoRoot, "packages/example/src"), { recursive: true });
    await mkdir(resolve(repoRoot, "packages/example/dist"), {
      recursive: true,
    });
    await writeFile(
      resolve(repoRoot, "apps/example/next-env.d.ts"),
      'import "./.next/dev/types/routes.d.ts";\n',
    );
    await writeFile(
      resolve(repoRoot, "packages/example/scripts/check.mjs"),
      'import { value } from "../dist/index.js";\nvoid value;\n',
    );
    await writeFile(
      resolve(repoRoot, "packages/example/src/index.ts"),
      "export const value = 1;\n",
    );
    await writeFile(
      resolve(repoRoot, "packages/example/dist/index.js"),
      "export const value = 1;\n",
    );

    const result = await loadArchitectureSources({
      repoRoot,
      sourcePaths: [
        "packages/example/scripts/check.mjs",
        "apps/example/next-env.d.ts",
      ],
      workspaceTargets: new Map(),
    });
    const tracked = await loadArchitectureSources({
      repoRoot,
      sourcePaths: ["packages/example/scripts/check.mjs"],
      workspaceTargets: new Map(),
      trackedSourceOnly: true,
    });

    expect(result.parseErrors).toEqual([]);
    expect(result.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourcePath: "apps/example/next-env.d.ts",
          resolvedTarget: "apps/example/.next/dev/types/routes.d.ts",
        }),
        expect.objectContaining({
          sourcePath: "packages/example/scripts/check.mjs",
          resolvedTarget: "packages/example/dist/index.js",
        }),
      ]),
    );
    expect(tracked.parseErrors).toEqual([]);
    expect(tracked.evidence).toEqual(
      result.evidence.filter(
        (evidence) =>
          evidence.sourcePath === "packages/example/scripts/check.mjs",
      ),
    );
  });

  it("treats tracked node_modules path mappings as external dependencies", async () => {
    const repoRoot = await createWorkspaceRoot();
    await writeFile(
      resolve(repoRoot, "apps/example/tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: { "@external/*": ["./node_modules/external/*"] },
        },
      }),
    );
    await writeFile(
      resolve(repoRoot, "apps/example/src/page.ts"),
      'import value from "@external/value.js";\nvoid value;\n',
    );

    const result = await loadArchitectureSources({
      repoRoot,
      sourcePaths: ["apps/example/src/page.ts"],
      workspaceTargets: new Map(),
      trackedSourceOnly: true,
    });

    expect(result.parseErrors).toEqual([]);
    expect(result.evidence).toContainEqual(
      expect.objectContaining({
        importSpecifier: "@external/value.js",
        resolvedTarget: "external:@external/value.js",
      }),
    );
  });

  it("fails closed for unsafe and cyclic tracked tsconfig extends", async () => {
    const unsafeRoot = await createWorkspaceRoot();
    await writeFile(
      resolve(unsafeRoot, "apps/example/tsconfig.json"),
      JSON.stringify({ extends: "../../../outside.json" }),
    );
    await writeFile(
      resolve(unsafeRoot, "apps/example/src/page.ts"),
      "export const page = true;\n",
    );
    const unsafe = await loadArchitectureSources({
      repoRoot: unsafeRoot,
      sourcePaths: ["apps/example/src/page.ts"],
      workspaceTargets: new Map(),
      trackedSourceOnly: true,
    });

    const cyclicRoot = await createWorkspaceRoot();
    await writeFile(
      resolve(cyclicRoot, "apps/example/tsconfig.json"),
      JSON.stringify({ extends: "../../tsconfig.cycle.json" }),
    );
    await writeFile(
      resolve(cyclicRoot, "tsconfig.cycle.json"),
      JSON.stringify({ extends: "apps/example/tsconfig.json" }),
    );
    await writeFile(
      resolve(cyclicRoot, "apps/example/src/page.ts"),
      "export const page = true;\n",
    );
    const cyclic = await loadArchitectureSources({
      repoRoot: cyclicRoot,
      sourcePaths: ["apps/example/src/page.ts"],
      workspaceTargets: new Map(),
      trackedSourceOnly: true,
    });

    expect(unsafe.parseErrors).toEqual([
      expect.objectContaining({
        sourcePath: "apps/example/tsconfig.json",
        code: "RESOLVER_CONFIG_ERROR",
      }),
    ]);
    expect(cyclic.parseErrors).toEqual([
      expect.objectContaining({
        sourcePath: "apps/example/tsconfig.json",
        code: "RESOLVER_CONFIG_ERROR",
      }),
    ]);
  });

  it("reports missing tracked internal aliases as module resolution errors", async () => {
    const repoRoot = await createWorkspaceRoot();
    await writeFile(
      resolve(repoRoot, "apps/example/src/page.ts"),
      'import missing from "@/missing.js";\nvoid missing;\n',
    );

    const result = await loadArchitectureSources({
      repoRoot,
      sourcePaths: ["apps/example/src/page.ts"],
      workspaceTargets: new Map(),
      trackedSourceOnly: true,
    });

    expect(result.parseErrors).toEqual([
      expect.objectContaining({
        sourcePath: "apps/example/src/page.ts",
        code: "MODULE_RESOLUTION_ERROR",
        line: 1,
      }),
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
      ["apps/example/src/barrel-a.ts", 'export { db } from "./barrel-b";\n'],
      [
        "apps/example/src/barrel-b.ts",
        ['export { db } from "./direct";', 'export * from "./barrel-a";'].join(
          "\n",
        ),
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
    ).toEqual([expect.objectContaining({ sourcePath, line: 4, column: 10 })]);
  });

  it("keeps ordinary matching-name symbols clean", async () => {
    const repoRoot = await createWorkspaceRoot();
    await writeFile(
      resolve(repoRoot, "apps/example/src/ordinary.ts"),
      "export interface CompanyIdentityVerificationPort { verify(): Promise<void> }\n",
    );
    await writeFile(
      resolve(repoRoot, "apps/example/src/consumer.ts"),
      [
        'import type { CompanyIdentityVerificationPort } from "./ordinary.js";',
        "export const port: CompanyIdentityVerificationPort | undefined = undefined;",
      ].join("\n"),
    );

    const result = await analyzeArchitectureSources({
      repoRoot,
      sourcePaths: [
        "apps/example/src/consumer.ts",
        "apps/example/src/ordinary.ts",
      ],
      workspaceTargets: new Map(),
      config: loadOwnershipMap(),
      policyVersion: "v2",
    });

    expect(result.parseErrors).toEqual([]);
    expect(result.findings).toEqual([]);
  });

  it("keeps direct database table bindings detected", async () => {
    const repoRoot = await createWorkspaceRoot();
    await writeFile(
      resolve(repoRoot, "apps/example/src/company-table.ts"),
      [
        'import { pgTable, text } from "drizzle-orm/pg-core";',
        'export const companyIdentityVerificationPort = pgTable("company_identity_verification_port", {',
        '  id: text("id").notNull(),',
        "});",
      ].join("\n"),
    );
    await writeFile(
      resolve(repoRoot, "apps/example/src/direct.ts"),
      [
        'import { companyIdentityVerificationPort } from "./company-table.js";',
        "void companyIdentityVerificationPort;",
      ].join("\n"),
    );

    const result = await analyzeArchitectureSources({
      repoRoot,
      sourcePaths: [
        "apps/example/src/company-table.ts",
        "apps/example/src/direct.ts",
      ],
      workspaceTargets: new Map(),
      config: loadOwnershipMap(),
      policyVersion: "v2",
    });

    expect(result.parseErrors).toEqual([]);
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourcePath: "apps/example/src/direct.ts",
          resource: "database-table:company_identity_verification_port",
        }),
      ]),
    );
  });

  it("keeps true database re-exports detected", async () => {
    const repoRoot = await createWorkspaceRoot();
    await writeFile(
      resolve(repoRoot, "apps/example/src/company-table.ts"),
      [
        'import { pgTable, text } from "drizzle-orm/pg-core";',
        'export const companyIdentityVerificationPort = pgTable("company_identity_verification_port", {',
        '  id: text("id").notNull(),',
        "});",
      ].join("\n"),
    );
    await writeFile(
      resolve(repoRoot, "apps/example/src/barrel.ts"),
      'export { companyIdentityVerificationPort } from "./company-table.js";\n',
    );
    await writeFile(
      resolve(repoRoot, "apps/example/src/consumer.ts"),
      [
        'import { companyIdentityVerificationPort } from "./barrel.js";',
        "void companyIdentityVerificationPort;",
      ].join("\n"),
    );

    const result = await analyzeArchitectureSources({
      repoRoot,
      sourcePaths: [
        "apps/example/src/company-table.ts",
        "apps/example/src/barrel.ts",
        "apps/example/src/consumer.ts",
      ],
      workspaceTargets: new Map(),
      config: loadOwnershipMap(),
      policyVersion: "v2",
    });

    expect(result.parseErrors).toEqual([]);
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourcePath: "apps/example/src/barrel.ts",
          resource: "database-table:company_identity_verification_port",
        }),
        expect.objectContaining({
          sourcePath: "apps/example/src/consumer.ts",
          resource: "database-table:company_identity_verification_port",
        }),
      ]),
    );
  });

  it("does not infer table resources from runtime contracts with matching names", async () => {
    const repoRoot = await createWorkspaceRoot();
    await writeFile(
      resolve(repoRoot, "apps/example/src/company-contract.ts"),
      [
        'import { z } from "zod";',
        "export const companyIdentityVerificationPort = z.object({});",
      ].join("\n"),
    );
    await writeFile(
      resolve(repoRoot, "apps/example/src/consumer.ts"),
      [
        'import { companyIdentityVerificationPort } from "@reading-advantage/db/company-identity";',
        "void companyIdentityVerificationPort;",
      ].join("\n"),
    );

    const result = await analyzeArchitectureSources({
      repoRoot,
      sourcePaths: [
        "apps/example/src/company-contract.ts",
        "apps/example/src/consumer.ts",
      ],
      workspaceTargets: new Map([
        [
          "@reading-advantage/db/company-identity",
          "apps/example/src/company-contract.ts",
        ],
      ]),
      config: loadOwnershipMap(),
      policyVersion: "v2",
    });

    expect(result.parseErrors).toEqual([]);
    expect(
      result.findings.filter((finding) => finding.resource !== undefined),
    ).toEqual([]);
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourcePath: "apps/example/src/consumer.ts",
          resolvedTarget: "apps/example/src/company-contract.ts",
        }),
      ]),
    );
  });
});
