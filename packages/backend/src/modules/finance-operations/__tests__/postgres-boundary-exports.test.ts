import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import * as postgresAdapter from "../postgres/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../../../..");

describe("Finance Operations PostgreSQL adapter package boundary", () => {
  it("declares a dedicated adapter subpath", () => {
    const packageJson = JSON.parse(
      readFileSync(join(PACKAGE_ROOT, "package.json"), "utf8"),
    ) as {
      exports?: Record<string, { import?: string; types?: string }>;
    };

    expect(packageJson.exports?.["./finance-operations/postgres"]).toEqual({
      types: "./dist/modules/finance-operations/postgres/index.d.ts",
      import: "./dist/modules/finance-operations/postgres/index.js",
    });
  });

  it("exposes only the repository factory from the adapter entrypoint", () => {
    expect(postgresAdapter).toHaveProperty(
      "createPostgresFinanceRecordRepository",
    );
  });
});
