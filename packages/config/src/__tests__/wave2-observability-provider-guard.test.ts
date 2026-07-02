/**
 * Wave 2 Phase 2 observability provider guard.
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
 * GREEN behavior (post Part A adapter fix + Part B ratchet):
 *   - Direct `Sentry.captureException` / `Sentry.captureMessage` calls
 *     outside an allowlisted observability adapter are STRICTLY FORBIDDEN
 *     (count must equal 0). The science recommendations route now
 *     routes through `apps/science-advantage/lib/observability/sentry.ts`,
 *     which is allowlisted as the in-app observability adapter boundary.
 *   - `console.error` hits on production error / request-handling paths
 *     are RATCHETED at `CONSOLE_ERROR_BASELINE`. Wave 6 owns the
 *     `console.error` → structured-logger migration (see
 *     `measure/audit-reports/monorepo-review-roadmap_20260626/medium-plus-coverage-matrix.md`);
 *     this guard enforces no-regression now and Wave 6 will drive the
 *     count down to 0 and lower this baseline. The test FAILS if anyone
 *     adds NEW `console.error` calls in the scanned paths.
 *
 * Labeled counts:
 *   - `Unapproved console.error hit count: N (baseline B)`
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

/**
 * Baseline count for `console.error` hits on production error /
 * request-handling paths.
 *
 * Wave 6 owns the `console.error` → structured-logger migration
 * (medium-plus-coverage-matrix.md). This guard RATCHETS: the count must
 * never INCREASE; Wave 6 will drive it to 0 and lower this baseline.
 *
 * Recorded from the actual current state (the `Part A` science
 * `Sentry.captureException` → `captureError` adapter wiring did not
 * add or remove any `console.error` call site, so the baseline equals
 * the pre-Part-A count). If you add new scanned paths or migrate a
 * file out of `console.error`, update this number and add a note to
 * `measure/tracks/wave2_confidence_restoration_20260628/plan.md`.
 */
const CONSOLE_ERROR_BASELINE = 621;

describe("Wave 2 Phase 2 — observability provider guard", () => {
  it("regression-protects against new console.error in production paths and forbids direct Sentry capture outside the observability adapter", () => {
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

    // A4 vacuous-pass guard: the scan must actually cover files.
    expect(
      scannedFileCount,
      "Scanned production file count must be > 0 (A4 vacuous-pass guard).",
    ).toBeGreaterThan(0);

    // Direct Sentry capture outside an allowlisted observability adapter
    // is STRICTLY forbidden. Production code must call the in-app
    // observability adapter (e.g. `apps/science-advantage/lib/observability/sentry.ts`).
    expect(
      sentryHits,
      [
        `Unapproved Sentry capture hit count: ${sentryHits.length}`,
        ...(sentryHits.length
          ? [
              "Hits:",
              ...sentryHits.map((h) => `${h.file}:${h.line}: ${h.text}`),
            ]
          : []),
        "",
        "Direct `Sentry.captureException` / `Sentry.captureMessage` calls " +
          "are forbidden outside an allowlisted observability adapter. Route " +
          "handlers and domain code MUST call the in-app adapter " +
          "(`apps/science-advantage/lib/observability/sentry.ts` for science; " +
          "create an analogous adapter in other apps). Bootstrap/config files " +
          "require a named allowlist reason.",
      ].join("\n"),
    ).toEqual([]);

    // `console.error` is RATCHETED at the Wave 2 baseline. Wave 6 owns the
    // migration; this guard enforces no-regression now (a regression — new
    // `console.error` calls in scanned paths — fails the build) while the
    // full sweep is deferred to Wave 6 (see follow-up rows in plan.md).
    expect(
      consoleHits.length,
      [
        `Unapproved console.error hit count: ${consoleHits.length} (baseline ${CONSOLE_ERROR_BASELINE})`,
        `Scanned production file count: ${scannedFileCount}`,
        ...(consoleHits.length > CONSOLE_ERROR_BASELINE
          ? [
              "First new hits:",
              ...consoleHits
                .slice(0, 25)
                .map((h) => `${h.file}:${h.line}: ${h.text}`),
              ...(consoleHits.length > 25 ? [`... (+${consoleHits.length - 25} more)`] : []),
            ]
          : []),
        "",
        `The count must not exceed the Wave 2 baseline (${CONSOLE_ERROR_BASELINE}). ` +
          "Wave 6 owns the full `console.error` → structured-logger migration " +
          "(medium-plus-coverage-matrix.md) and will lower this baseline as it " +
          "migrates call sites. To LOWER the baseline, migrate call sites to the " +
          "structured logger and update CONSOLE_ERROR_BASELINE + the plan.md " +
          "follow-up row. Bootstrap/config files require a named allowlist reason.",
      ].join("\n"),
    ).toBeLessThanOrEqual(CONSOLE_ERROR_BASELINE);
  });
});
