import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  inventoryRepository,
  proposeDirectViolations,
  serializeDirectViolationReview,
  serializeInventory,
} from "../inventory.js";
import { loadOwnershipMap } from "../ownership-map.js";

let repoRoot: string;

/** Writes one source fixture below the temporary repository root. */
async function writeFixture(path: string, source: string): Promise<void> {
  const absolutePath = join(repoRoot, path);
  await mkdir(join(absolutePath, ".."), { recursive: true });
  await writeFile(absolutePath, source, "utf8");
}

beforeEach(async () => {
  repoRoot = await mkdtemp(join(tmpdir(), "architecture-inventory-"));
});

afterEach(async () => {
  await rm(repoRoot, { recursive: true, force: true });
});

describe("deterministic architecture inventory", () => {
  it("extracts structured import, re-export, dynamic, require, environment, and query facts", async () => {
    await writeFixture(
      "apps/marketing/source.ts",
      [
        'import database, { users as people } from "@reading-advantage/db";',
        'export { companyAccounts } from "@reading-advantage/db/company-identity";',
        'const lazy = import("@ai-sdk/openai");',
        'const legacy = require("pg");',
        'import * as storageSdk from "@aws-sdk/client-s3";',
        "const secret = process.env.OPENAI_API_KEY;",
        'const storageSecret = process.env["AWS_SECRET_ACCESS_KEY"];',
        "database.select().from(reviewJobs);",
        "database.insert(companyAccounts);",
        "void [people, lazy, legacy, storageSdk, secret, storageSecret];",
      ].join("\n"),
    );

    const result = await inventoryRepository({
      repoRoot,
      trackedFiles: ["apps/marketing/source.ts"],
    });

    expect(result.filesScanned).toBe(1);
    expect(result.parseErrors).toEqual([]);
    expect(
      result.facts.map((fact) => ({
        kind: fact.kind,
        sourcePath: fact.sourcePath,
        importSpecifier: fact.importSpecifier,
        resource: fact.resource,
      })),
    ).toEqual(
      expect.arrayContaining([
        {
          kind: "static-import",
          sourcePath: "apps/marketing/source.ts",
          importSpecifier: "@reading-advantage/db",
          resource: undefined,
        },
        {
          kind: "re-export",
          sourcePath: "apps/marketing/source.ts",
          importSpecifier: "@reading-advantage/db/company-identity",
          resource: undefined,
        },
        {
          kind: "dynamic-import",
          sourcePath: "apps/marketing/source.ts",
          importSpecifier: "@ai-sdk/openai",
          resource: undefined,
        },
        {
          kind: "commonjs-require",
          sourcePath: "apps/marketing/source.ts",
          importSpecifier: "pg",
          resource: undefined,
        },
        {
          kind: "namespace-import",
          sourcePath: "apps/marketing/source.ts",
          importSpecifier: "@aws-sdk/client-s3",
          resource: undefined,
        },
        {
          kind: "environment-read",
          sourcePath: "apps/marketing/source.ts",
          importSpecifier: undefined,
          resource: "environment:OPENAI_API_KEY",
        },
        {
          kind: "environment-read",
          sourcePath: "apps/marketing/source.ts",
          importSpecifier: undefined,
          resource: "environment:AWS_SECRET_ACCESS_KEY",
        },
        {
          kind: "query-call",
          sourcePath: "apps/marketing/source.ts",
          importSpecifier: undefined,
          resource: "database-table:review_jobs",
        },
        {
          kind: "query-call",
          sourcePath: "apps/marketing/source.ts",
          importSpecifier: undefined,
          resource: "database-table:company_accounts",
        },
      ]),
    );
  });

  it("serializes byte-identically regardless of tracked-file order", async () => {
    await writeFixture(
      "packages/zeta/src/index.ts",
      'export * from "@reading-advantage/storage";',
    );
    await writeFixture(
      "apps/alpha/src/index.ts",
      'import { createAIClient } from "@reading-advantage/ai";',
    );

    const first = await inventoryRepository({
      repoRoot,
      trackedFiles: ["packages/zeta/src/index.ts", "apps/alpha/src/index.ts"],
    });
    const second = await inventoryRepository({
      repoRoot,
      trackedFiles: ["apps/alpha/src/index.ts", "packages/zeta/src/index.ts"],
    });

    expect(serializeInventory(first)).toBe(serializeInventory(second));
    expect(serializeInventory(first)).not.toContain(repoRoot);
    expect(serializeInventory(first)).toMatch(/\n$/);
  });

  it("ignores exact generated roots but scans tracked production nested below build-like names", async () => {
    await writeFixture(
      "apps/sales/source.ts",
      'const provider = "@ai-sdk/openai"; void import(provider);',
    );
    await writeFixture(
      "apps/sales/dist/generated.ts",
      'import OpenAI from "openai";',
    );
    await writeFixture(
      "packages/example/node_modules/vendor.ts",
      'import postgres from "postgres";',
    );
    await writeFixture(
      "apps/sales/src/build/direct-db.ts",
      'import { users } from "@reading-advantage/db"; void users;',
    );

    const result = await inventoryRepository({
      repoRoot,
      trackedFiles: [
        "packages/example/node_modules/vendor.ts",
        "apps/sales/dist/generated.ts",
        "apps/sales/source.ts",
        "apps/sales/src/build/direct-db.ts",
      ],
    });

    expect(result.filesScanned).toBe(2);
    expect(result.facts).toEqual([
      expect.objectContaining({
        sourcePath: "apps/sales/src/build/direct-db.ts",
        kind: "static-import",
        importSpecifier: "@reading-advantage/db",
      }),
    ]);
  });

  it("reports malformed sources without source bodies or absolute paths", async () => {
    await writeFixture(
      "services/worker/src/broken.ts",
      "const privateToken = 'do-not-report'; const value = ;",
    );

    const result = await inventoryRepository({
      repoRoot,
      trackedFiles: ["services/worker/src/broken.ts"],
    });
    const serialized = serializeInventory(result);

    expect(result.parseErrors).toHaveLength(1);
    expect(result.parseErrors[0]).toMatchObject({
      sourcePath: "services/worker/src/broken.ts",
      code: "TYPESCRIPT_PARSE_ERROR",
    });
    expect(serialized).not.toContain("do-not-report");
    expect(serialized).not.toContain(repoRoot);
  });

  it("fails closed when an exact tracked source cannot be read", async () => {
    const result = await inventoryRepository({
      repoRoot,
      trackedFiles: ["services/worker/src/missing.ts"],
    });

    expect(result.parseErrors).toEqual([
      {
        schemaVersion: 1,
        sourcePath: "services/worker/src/missing.ts",
        line: 1,
        column: 1,
        code: "FILE_READ_ERROR",
      },
    ]);
  });

  it("projects direct policy matches into reviewed, owner-specific candidates", async () => {
    await writeFixture(
      "apps/marketing/direct-db.ts",
      'import { users } from "@reading-advantage/db";',
    );
    await writeFixture(
      "packages/domain/src/allowed.ts",
      'import { users } from "@reading-advantage/db";',
    );
    await writeFixture(
      "apps/sales/provider-test.test.ts",
      'import { createOpenAI } from "@ai-sdk/openai";',
    );

    const inventory = await inventoryRepository({
      repoRoot,
      trackedFiles: [
        "apps/sales/provider-test.test.ts",
        "packages/domain/src/allowed.ts",
        "apps/marketing/direct-db.ts",
      ],
    });
    const candidates = proposeDirectViolations(inventory, loadOwnershipMap());

    expect(candidates).toEqual([
      expect.objectContaining({
        ruleId: "AI_PROVIDER_BOUNDARY",
        sourcePath: "apps/sales/provider-test.test.ts",
        owner: "sales-platform",
        proposedDisposition: "exact-exception-review",
      }),
      expect.objectContaining({
        ruleId: "DATABASE_BOUNDARY",
        sourcePath: "apps/marketing/direct-db.ts",
        owner: "marketing-platform",
        proposedDisposition: "baseline-review",
      }),
    ]);
    expect(candidates[0]?.rationale.length).toBeGreaterThan(12);
    expect(serializeDirectViolationReview(candidates)).toBe(
      serializeDirectViolationReview([...candidates].reverse()),
    );
    expect(serializeDirectViolationReview(candidates)).not.toContain(repoRoot);
    expect(candidates).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourcePath: "packages/domain/src/allowed.ts",
        }),
      ]),
    );
  });

  it("derives accountable owners across package, integration, service, and fallback roots", async () => {
    const fixtures = [
      [
        "packages/auth/direct-db.js",
        'const db = require("@reading-advantage/db"); void db;',
      ],
      [
        "packages/integrations/slack/direct-provider.ts",
        'import { WebClient } from "@slack/web-api";',
      ],
      [
        "services/worker/direct-db.tsx",
        'import { sql } from "drizzle-orm"; void sql;',
      ],
      [
        "integrations/legacy/direct-provider.mjs",
        'import Stripe from "stripe"; void Stripe;',
      ],
    ] as const;
    for (const [path, source] of fixtures) await writeFixture(path, source);

    const inventory = await inventoryRepository({
      repoRoot,
      trackedFiles: fixtures.map(([path]) => path),
    });
    const candidates = proposeDirectViolations(inventory, loadOwnershipMap());

    expect(
      candidates.map(({ sourcePath, owner }) => ({ sourcePath, owner })),
    ).toEqual([
      {
        sourcePath: "packages/auth/direct-db.js",
        owner: "auth-platform",
      },
      {
        sourcePath: "services/worker/direct-db.tsx",
        owner: "worker-service",
      },
      {
        sourcePath: "integrations/legacy/direct-provider.mjs",
        owner: "architecture-platform",
      },
      {
        sourcePath: "packages/integrations/slack/direct-provider.ts",
        owner: "slack-integrations",
      },
    ]);
  });
});
