/**
 * Wave 2 Phase 2 Red-phase observability provider guard.
 *
 * Track:  `wave2_confidence_restoration_20260628`
 * Phase:  2 — Provider Adapter Enforcement
 *
 * Scans backend/domain production source for:
 *   - `console.error` calls on production error / request-handling paths
 *   - Direct `Sentry.captureException` / `Sentry.captureMessage` calls outside
 *     an observability adapter
 *
 * Scan scope is limited to request-handling and domain layers:
 *   apps/{app}/app/api, apps/{app}/server, apps/{app}/actions, apps/{app}/lib,
 *   apps/{app}/utils, packages/domain, packages/api, packages/webhooks.
 *
 * Excludes test files, generated/build directories, scripts, seed data, and
 * a named allowlist of app bootstrap/config files. Every exclusion carries a
 * reason.
 *
 * RED expectation at HEAD:
 *   Production backend/domain code still calls `console.error` in catch blocks
 *   and calls `Sentry.captureException` directly from a route handler.
 *
 * Labeled counts:
 *   - `Unapproved console.error hit count: N`
 *   - `Unapproved Sentry capture hit count: M`
 *   - `Scanned production file count: P` (fails if P == 0, A4)
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "../../../..");

const SCAN_PATHS = [
  "apps/*/app/api",
  "apps/*/server",
  "apps/*/actions",
  "apps/*/lib",
  "apps/*/utils",
  "packages/domain",
  "packages/api",
  "packages/webhooks",
];

const IGNORED_DIRS = new Set([
  "node_modules",
  ".next",
  ".turbo",
  "dist",
  "build",
  "coverage",
  ".git",
  ".vercel",
  ".swc",
  "playwright-report",
  "test-results",
  "out",
  ".cache",
  "__tests__",
  "__mocks__",
]);

const TEST_FILE_RE = /\.(test|integration\.test|spec)\.(tsx?|jsx?|mjs|cjs)$/;
const SOURCE_FILE_RE = /\.(tsx?|jsx?|mjs|cjs)$/;

const CONSOLE_CALL_RE = /\bconsole\.error\s*\(/;
const SENTRY_CAPTURE_RE = /\bSentry\.(captureException|captureMessage)\s*\(/;

interface AllowlistEntry {
  readonly pattern: RegExp;
  readonly reason: string;
}

const ALLOWLIST: AllowlistEntry[] = [
  {
    pattern: /^packages\/config\//,
    reason: "shared config package (tsconfig/eslint/tailwind) — no production runtime",
  },
  {
    pattern: /^packages\/(db|scripts)\/scripts\//,
    reason: "CLI/maintenance script output",
  },
  {
    pattern: /^packages\/db\/src\/seed\//,
    reason: "seed script console output",
  },
  {
    pattern: /^packages\/webhooks\/src\/index\.ts$/,
    reason: "webhooks server startup bootstrap",
  },
  {
    pattern: /^packages\/ai\/src\/providers\//,
    reason: "AI adapter provider implementation",
  },
  {
    pattern: /^apps\/[^/]+\/scripts\//,
    reason: "app CLI/maintenance script output",
  },
  {
    pattern: /^apps\/[^/]+\/[^/]*\.config\.ts$/,
    reason: "app bootstrap/config file",
  },
  {
    pattern: /^apps\/[^/]+\/sentry\.client\.config\.ts$/,
    reason: "Sentry client bootstrap config",
  },
  {
    pattern: /^apps\/[^/]+\/sentry\.server\.config\.ts$/,
    reason: "Sentry server bootstrap config",
  },
  {
    pattern: /^apps\/[^/]+\/instrumentation\.ts$/,
    reason: "Next.js instrumentation bootstrap",
  },
  {
    pattern: /^apps\/[^/]+\/lib\/instrumentation\.node\.ts$/,
    reason: "Node OTel instrumentation bootstrap",
  },
  {
    pattern: /^apps\/science-advantage\/lib\/observability\//,
    reason: "app-local observability adapter implementation",
  },
];

function isAllowlisted(filePath: string): boolean {
  return ALLOWLIST.some((entry) => entry.pattern.test(filePath));
}

function expandScanPaths(): string[] {
  const dirs: string[] = [];
  for (const pattern of SCAN_PATHS) {
    const parts = pattern.split("/");
    collectPaths(REPO_ROOT, parts, dirs);
  }
  return dirs;
}

function collectPaths(base: string, remaining: string[], out: string[]): void {
  if (remaining.length === 0) {
    out.push(base);
    return;
  }
  const head = remaining[0];
  const tail = remaining.slice(1);
  if (head === "*") {
    let entries: import("node:fs").Dirent[];
    try {
      entries = readdirSync(base, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        collectPaths(join(base, entry.name), tail, out);
      }
    }
  } else {
    collectPaths(join(base, head), tail, out);
  }
}

function walk(dir: string, acc: string[] = []): string[] {
  let entries: import("node:fs").Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, acc);
    } else if (SOURCE_FILE_RE.test(entry.name) && !TEST_FILE_RE.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

interface Hit {
  readonly file: string;
  readonly line: number;
  readonly text: string;
  readonly kind: "console" | "sentry";
}

function findHits(source: string, regex: RegExp): Array<{ line: number; text: string }> {
  const hits: Array<{ line: number; text: string }> = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Strip trailing single-line comment so commented-out calls are ignored.
    const codeOnly = line.replace(/\/\/.*$/g, "");
    if (regex.test(codeOnly)) {
      hits.push({ line: i + 1, text: line.trim() });
    }
  }
  return hits;
}

describe("Wave 2 Phase 2 — observability provider guard", () => {
  it("flags unapproved console.error calls and direct Sentry capture in production code", () => {
    const scanDirs = expandScanPaths();
    const files = scanDirs.flatMap((dir) => walk(dir));
    const scannedFileCount = files.length;

    const hits: Hit[] = [];
    for (const file of files) {
      const rel = relative(REPO_ROOT, file);
      if (isAllowlisted(rel)) continue;

      const source = readFileSync(file, "utf8");
      for (const h of findHits(source, CONSOLE_CALL_RE)) {
        hits.push({ file: rel, line: h.line, text: h.text, kind: "console" });
      }
      for (const h of findHits(source, SENTRY_CAPTURE_RE)) {
        hits.push({ file: rel, line: h.line, text: h.text, kind: "sentry" });
      }
    }

    const consoleHits = hits.filter((h) => h.kind === "console");
    const sentryHits = hits.filter((h) => h.kind === "sentry");

    const report = [
      `Scanned production file count: ${scannedFileCount}`,
      `Unapproved console.error hit count: ${consoleHits.length}`,
      `Unapproved Sentry capture hit count: ${sentryHits.length}`,
      ...(hits.length
        ? ["Hits:", ...hits.map((h) => `${h.file}:${h.line}: ${h.text}`)]
        : []),
    ].join("\n");

    expect(
      scannedFileCount,
      "Scanned production file count must be > 0 (A4 vacuous-pass guard).",
    ).toBeGreaterThan(0);

    expect(
      hits,
      `${report}\n\n` +
        "Production error paths must use the observability adapter, not raw console.error " +
        "or direct Sentry capture. Bootstrap/config files require a named allowlist reason.",
    ).toEqual([]);
  });
});
