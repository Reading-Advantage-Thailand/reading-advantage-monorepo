/**
 * The login boundary and the no-connection harness (AC-4.12, test strategy P2b.7, task 2b.2).
 *
 * `apps/storytime` holds no database import. All SQL lives in
 * `packages/backend/src/modules/storytime-access/`. The reused helpers are `hashPassword`,
 * `verifyPassword`, and `consumeRateLimit`, through the `packages/auth` subpaths. No shared company
 * table and no `createSession` come into the app. Importing the app modules opens no database
 * connection. The control proves that the harness can see a failure.
 *
 * The import scan is a structural guard, so a base tree would pass it vacuously. The test asserts
 * the three pinned files exist first, so it fails on `Missing` at the base. A positive control
 * proves that the detector sees a planted violation.
 *
 * At the base the first assertion fails on `Missing apps/storytime/lib/auth/index.ts`.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";

const postgresSpy = vi.hoisted(() => {
  const calls: unknown[] = [];
  return {
    calls,
    spy: (...args: unknown[]) => {
      calls.push(args);
      return {};
    },
  };
});

vi.mock("postgres", () => ({ default: postgresSpy.spy }));

const APP = resolve(import.meta.dirname, "..");
const AUTH_ENTRY = resolve(APP, "lib/auth/index.ts");
const MEDIA_SIGN = resolve(APP, "lib/media/sign.ts");
const STORE_ENTRY = resolve(APP, "../../packages/backend/src/modules/storytime-access/index.ts");
const AUTH_MISSING = "Missing apps/storytime/lib/auth/index.ts";

/** The allowed helper names of the two auth subpaths. */
const ALLOWED_AUTH_NAMES = new Set(["hashPassword", "verifyPassword", "consumeRateLimit"]);

/** Exact folder names that the scan skips (A7). */
const SKIP_FOLDERS = new Set([
  "node_modules",
  ".next",
  "__tests__",
  "content",
  "messages",
  ".turbo",
  "dist",
]);

/** Lists every source file under a folder, skipping only the exact folder names. */
function sourceFiles(root: string, out: string[] = []): string[] {
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    if (statSync(path).isDirectory()) {
      if (!SKIP_FOLDERS.has(entry)) sourceFiles(path, out);
    } else if (/\.(ts|tsx|mts|js|jsx|mjs)$/.test(entry)) {
      out.push(path);
    }
  }
  return out;
}

/** Splits a source file into import statements. */
function importStatements(source: string): string[] {
  const pattern =
    /import\s+(?:type\s+)?(?:[^;]*?from\s*)?["'][^"']+["']|import\s*\(\s*["'][^"']+["']\s*\)/g;
  return source.match(pattern) ?? [];
}

/** Reports the boundary violations of one import statement. */
function violationsOf(statement: string): string[] {
  const specifier = statement.match(/["']([^"']+)["']/)?.[1] ?? "";
  const violations: string[] = [];
  if (
    specifier === "drizzle-orm" ||
    specifier.startsWith("drizzle-orm/") ||
    specifier === "postgres" ||
    specifier.startsWith("postgres/") ||
    specifier === "@reading-advantage/db" ||
    specifier.startsWith("@reading-advantage/db/")
  ) {
    violations.push(`banned database import ${specifier}`);
  }
  if (specifier === "@reading-advantage/auth") {
    violations.push("banned auth root import");
  } else if (
    specifier.startsWith("@reading-advantage/auth/") &&
    specifier !== "@reading-advantage/auth/password" &&
    specifier !== "@reading-advantage/auth/rate-limit"
  ) {
    violations.push(`banned auth subpath ${specifier}`);
  }
  if (/createSession|validateSession/.test(statement)) {
    violations.push(`banned session helper in ${specifier}`);
  }
  if (/\b(accounts|sessions|auditEvents|loginAttempts)\b/.test(statement)) {
    violations.push(`shared table in ${specifier}`);
  }
  if (/@reading-advantage\/auth\/(password|rate-limit)/.test(statement)) {
    const names = statement.match(/\{([\s\S]*?)\}/)?.[1] ?? "";
    for (const raw of names.split(",")) {
      const name = raw.trim().replace(/^type\s+/, "");
      if (name && !ALLOWED_AUTH_NAMES.has(name)) violations.push(`banned auth helper ${name}`);
    }
  }
  return violations;
}

/** Reports every boundary violation of one source text. */
function scanSource(source: string): string[] {
  return importStatements(source).flatMap((statement) => violationsOf(statement));
}

describe("login boundary (red)", () => {
  it("scans the app sources for the database boundary and the reused helpers", () => {
    expect(existsSync(AUTH_ENTRY), AUTH_MISSING).toBe(true);
    expect(existsSync(MEDIA_SIGN), "Missing apps/storytime/lib/media/sign.ts").toBe(true);
    expect(
      existsSync(STORE_ENTRY),
      "Missing packages/backend/src/modules/storytime-access/index.ts",
    ).toBe(true);

    const files = sourceFiles(APP);
    expect(files.length, "files_scanned").toBeGreaterThan(0);
    const violations: string[] = [];
    for (const file of files) {
      for (const violation of scanSource(readFileSync(file, "utf8"))) {
        violations.push(`${file.replace(APP, "apps/storytime")}: ${violation}`);
      }
    }
    console.log(`files_scanned=${files.length} violations=${violations.length}`);
    expect(violations, violations.join("\n")).toEqual([]);

    // The positive control proves that the detector sees a planted violation.
    const planted = [
      'import { createSession } from "@reading-advantage/db/schema";',
      'import postgres from "postgres";',
      'import { RateLimitStore } from "@reading-advantage/auth";',
    ].join("\n");
    expect(scanSource(planted).length, "the detector sees the planted violations").toBeGreaterThan(
      2,
    );
    expect(
      scanSource('import { hashPassword } from "@reading-advantage/auth/password";'),
      "a clean statement has no violation",
    ).toEqual([]);
  });

  it("imports the app modules with no database connection", async () => {
    expect(existsSync(AUTH_ENTRY), AUTH_MISSING).toBe(true);
    expect(existsSync(MEDIA_SIGN), "Missing apps/storytime/lib/media/sign.ts").toBe(true);
    expect(
      existsSync(STORE_ENTRY),
      "Missing packages/backend/src/modules/storytime-access/index.ts",
    ).toBe(true);

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "");
    try {
      for (const directory of [resolve(APP, "lib/auth"), resolve(APP, "lib/media")]) {
        for (const name of readdirSync(directory)) {
          if (!/\.(ts|tsx|js|mjs)$/.test(name)) continue;
          const url = pathToFileURL(resolve(directory, name)).href;
          await expect(
            import(/* @vite-ignore */ url),
            `${name} imports without a connection`,
          ).resolves.toBeDefined();
        }
      }
      await expect(
        import("@reading-advantage/backend/storytime-access"),
        "the store module imports without a connection",
      ).resolves.toBeDefined();
      console.log(`postgres_calls_on_import=${postgresSpy.calls.length}`);
      expect(postgresSpy.calls.length, "postgres_calls_on_import").toBe(0);

      // The control proves that this harness can detect a failure to import.
      await expect(
        import("@reading-advantage/auth"),
        "the package root throws without DATABASE_URL",
      ).rejects.toThrow();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
