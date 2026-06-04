/**
 * Tenant Predicate Coverage Test (Track 2: TenantDB Adoption)
 *
 * Asserts that every exported function in packages/domain/src/<module>/
 * either (a) uses createTenantDB / TenantDB, or (b) is a pure helper
 * with no DB access. Fails the build if a new module is added without
 * a tenant guard.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const DOMAIN_SRC = join(__dirname, "..");

/** Directories to scan for domain modules (skip __tests__ and root files). */
const MODULE_DIRS = readdirSync(DOMAIN_SRC, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("_") && d.name !== "__tests__")
  .map((d) => join(DOMAIN_SRC, d.name));

/** Recursively collect all .ts files in a directory. */
function collectTsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith("_")) {
      files.push(...collectTsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts") && !entry.name.endsWith(".d.ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

/** Check if a file contains a tenant guard (createTenantDB or TenantDB usage). */
function hasTenantGuard(content: string): boolean {
  return (
    content.includes("createTenantDB") ||
    content.includes("TenantDB") ||
    content.includes("tenantDb") ||
    content.includes("tenant_db")
  );
}

/** Check if a file has DB access (imports from @reading-advantage/db or uses db.select/insert/update/delete). */
function hasDbAccess(content: string): boolean {
  return (
    content.includes('from "@reading-advantage/db"') ||
    content.includes("from '@reading-advantage/db'") ||
    content.includes("db.select") ||
    content.includes("db.insert") ||
    content.includes("db.update") ||
    content.includes("db.delete") ||
    content.includes("db.execute") ||
    content.includes("db.transaction")
  );
}

/** Extract exported function names from a file. */
function getExportedFunctions(content: string, filePath: string): string[] {
  const fns: string[] = [];
  const exportFnRegex = /export\s+(?:async\s+)?function\s+(\w+)/g;
  let match;
  while ((match = exportFnRegex.exec(content)) !== null) {
    fns.push(match[1]);
  }
  // Also catch `export { functionName }` re-exports
  const exportBraceRegex = /export\s*\{([^}]+)\}/g;
  while ((match = exportBraceRegex.exec(content)) !== null) {
    const names = match[1].split(",").map((n) => n.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
    fns.push(...names);
  }
  return fns;
}

describe("tenant predicate coverage", () => {
  const violations: string[] = [];

  for (const moduleDir of MODULE_DIRS) {
    const moduleName = relative(DOMAIN_SRC, moduleDir);
    const files = collectTsFiles(moduleDir);

    for (const filePath of files) {
      const content = readFileSync(filePath, "utf-8");
      const relPath = relative(DOMAIN_SRC, filePath);

      // Skip index.ts barrel files that just re-export
      if (filePath.endsWith("/index.ts") && !hasDbAccess(content)) {
        continue;
      }

      // Skip files with no DB access (pure helpers, types, constants)
      if (!hasDbAccess(content)) {
        continue;
      }

      // Files with DB access MUST have a tenant guard
      if (!hasTenantGuard(content)) {
        const exportedFns = getExportedFunctions(content, filePath);
        const fnList = exportedFns.length > 0 ? ` (${exportedFns.join(", ")})` : "";
        violations.push(`${relPath}${fnList}: has DB access but no tenant guard (createTenantDB/TenantDB)`);
      }
    }
  }

  it("every domain function with DB access uses createTenantDB or TenantDB", () => {
    if (violations.length > 0) {
      const message = [
        "The following domain files have DB access but no tenant guard:",
        "",
        ...violations.map((v) => `  - ${v}`),
        "",
        "Add `createTenantDB(db, tenant)` or accept a `TenantDB` parameter.",
      ].join("\n");
      expect(violations, message).toEqual([]);
    }
  });
});
