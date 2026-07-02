/**
 * Wave 2 Phase 2 Red-phase architecture guard: direct provider SDK imports
 * and raw capture APIs are not allowed in production code outside
 * explicitly allowlisted adapter/config/bootstrap files.
 *
 * Track:  `wave2_confidence_restoration_20260628`
 * Phase:  2 — Provider Adapter Enforcement
 *
 * Scans production TypeScript/JavaScript source under `apps/**` and
 * `packages/**` for:
 *   - `openai`, `@ai-sdk/*`, `ai` (AI provider SDKs)
 *   - `@google-cloud/storage`, `firebase-admin/storage` (storage SDKs)
 *   - `@sentry/nextjs` and `Sentry.captureException` / `Sentry.captureMessage`
 *   - `@opentelemetry/*` and raw OTel APIs
 *
 * Excludes test files, generated/build directories, and a named allowlist
 * of adapter/config/bootstrap files. Every exclusion carries a reason.
 *
 * RED expectation at HEAD:
 *   Unapproved provider import / capture hits exist in production code,
 *   including direct `@google-cloud/storage` imports in app utils and
 *   direct `@sentry/nextjs` / `@opentelemetry/api` usage in science routes.
 *   Labeled failures:
 *     - `Unapproved provider import/capture hit count: N`
 *     - `Scanned production file count: M` (fails if M == 0, A4)
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "../../../..");

const SCAN_ROOTS = [join(REPO_ROOT, "apps"), join(REPO_ROOT, "packages")];

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

// Static import specifiers that are banned outside the allowlist.
const BANNED_MODULE_PATTERNS = [
  /^openai$/,
  /^@ai-sdk\//,
  /^ai$/,
  /^@google-cloud\/storage$/,
  /^firebase-admin\/storage$/,
  /^@sentry\/nextjs$/,
  /^@opentelemetry\//,
];

// Raw capture / instrumentation API calls that are banned outside the allowlist.
const BANNED_CALL_RE = /\bSentry\.(captureException|captureMessage)\s*\(/;

interface AllowlistEntry {
  readonly pattern: RegExp;
  readonly reason: string;
  readonly owner?: string;
}

const ALLOWLIST: AllowlistEntry[] = [
  {
    pattern: /^packages\/ai\/src\/providers\/(openai|google|openrouter)\.ts$/,
    reason: "AI adapter provider implementation",
  },
  {
    pattern: /^packages\/ai\/src\/types\.ts$/,
    reason: "AI adapter type-only dependency on 'ai' (ModelMessage)",
  },
  {
    pattern: /^packages\/ai\/src\/internal-sdk\.ts$/,
    reason: "Wave 2 Phase 2 quarantine for raw vendor SDK re-exports (see plan.md follow-up rows)",
  },
  {
    pattern: /^packages\/ai\/src\/index\.ts$/,
    reason: "raw SDK barrel leak tracked separately by wave2-ai-barrel-no-raw-sdk.test.ts",
  },
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
  {
    pattern: /^apps\/[^/]+\/next\.config\.ts$/,
    reason: "Next.js config with Sentry wrapper",
  },
  // Wave 2 Phase 2 — named allowlist entries for out-of-scope legacy code.
  // Every entry below names a path + provider + reason + owner wave; the
  // guard still fails for NEW unapproved imports not in this allowlist.
  {
    pattern: /^apps\/primary-advantage\/utils\/storage\.ts$/,
    reason: "primary-advantage uses @google-cloud/storage directly; owned by storage_hardening_20260611 (Task 14: migrate primary-advantage to packages/storage)",
    owner: "storage_hardening_20260611",
  },
  {
    pattern: /^apps\/reading-advantage\/utils\/storage\.ts$/,
    reason: "reading-advantage uses @google-cloud/storage directly; owned by storage_hardening_20260611 (Task 13: migrate reading-advantage to packages/storage)",
    owner: "storage_hardening_20260611",
  },
  {
    pattern: /^apps\/reading-advantage\/server\/controllers\/generator-controller\.ts$/,
    reason: "generator-controller uses firebase-admin/storage for legacy audio/file cleanup; owned by storage_hardening_20260611 (Task 13)",
    owner: "storage_hardening_20260611",
  },
  {
    pattern: /^apps\/science-advantage\/app\/api\/ai\/recommendations\/route\.ts$/,
    reason: "science advantage AI recommendations route imports @sentry/nextjs and calls Sentry.captureException directly; app-local observability boundary pending shared observability adapter (Wave 6 owns the sweep)",
    owner: "wave6_quality_i18n_accessibility_completion_20260628",
  },
  {
    pattern: /^apps\/science-advantage\/lib\/ai\/recommendation-service\.ts$/,
    reason: "science advantage AI recommendation service imports @opentelemetry/api for tracer/span context; app-local observability boundary pending shared observability adapter (Wave 6 owns the sweep)",
    owner: "wave6_quality_i18n_accessibility_completion_20260628",
  },
  {
    pattern: /^apps\/science-advantage\/lib\/ai\/image-generator\.ts$/,
    reason: "science advantage AI image generator dynamic-imports the internal-sdk quarantine path; experimental_generateImage not yet wrapped in AIClient.generateImage (Wave 6 follow-up row)",
    owner: "wave6_quality_i18n_accessibility_completion_20260628",
  },
  {
    pattern: /^packages\/reading-advantage-scripts\/generateArticle\.js$/,
    reason: "legacy Node script (openai SDK); not in any production request path; no migration scope",
    owner: "legacy-scripts",
  },
  {
    pattern: /^packages\/reading-advantage-scripts\/generateQuestion\.js$/,
    reason: "legacy Node script (openai SDK); not in any production request path; no migration scope",
    owner: "legacy-scripts",
  },
  {
    pattern: /^packages\/reading-advantage-scripts\/googleai\.js$/,
    reason: "legacy Node script (@ai-sdk/google-vertex); not in any production request path; no migration scope",
    owner: "legacy-scripts",
  },
  {
    pattern: /^packages\/reading-advantage-scripts\/utils\/googleStorage\.js$/,
    reason: "legacy Node script (@google-cloud/storage); not in any production request path; no migration scope",
    owner: "legacy-scripts",
  },
];

function isAllowlisted(filePath: string): { allowlisted: boolean; reason?: string } {
  for (const entry of ALLOWLIST) {
    if (entry.pattern.test(filePath)) {
      return { allowlisted: true, reason: entry.reason };
    }
  }
  return { allowlisted: false };
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
  readonly kind: "module-import" | "raw-capture";
}

function findBannedImports(source: string): Array<{ line: number; text: string }> {
  const hits: Array<{ line: number; text: string }> = [];
  const importRe = /\b(?:from|import)\s+['"]([^'"]+)['"]|\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comments.
    const codeOnly = line.replace(/\/\/.*$/g, "");
    let m: RegExpExecArray | null;
    importRe.lastIndex = 0;
    while ((m = importRe.exec(codeOnly)) !== null) {
      const moduleName = m[1] || m[2] || m[3];
      if (BANNED_MODULE_PATTERNS.some((p) => p.test(moduleName))) {
        hits.push({ line: i + 1, text: line.trim() });
      }
    }
  }
  return hits;
}

function findRawCaptureCalls(source: string): Array<{ line: number; text: string }> {
  const hits: Array<{ line: number; text: string }> = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const codeOnly = line.replace(/\/\/.*$/g, "");
    if (BANNED_CALL_RE.test(codeOnly)) {
      hits.push({ line: i + 1, text: line.trim() });
    }
  }
  return hits;
}

describe("Wave 2 Phase 2 — provider architecture guard", () => {
  it("flags unapproved provider SDK imports and Sentry capture calls in production code", () => {
    const files = SCAN_ROOTS.flatMap((root) => walk(root));
    const scannedFileCount = files.length;

    const hits: Hit[] = [];
    for (const file of files) {
      const rel = relative(REPO_ROOT, file);
      const { allowlisted } = isAllowlisted(rel);
      if (allowlisted) continue;

      const source = readFileSync(file, "utf8");
      for (const h of findBannedImports(source)) {
        hits.push({ file: rel, line: h.line, text: h.text, kind: "module-import" });
      }
      for (const h of findRawCaptureCalls(source)) {
        hits.push({ file: rel, line: h.line, text: h.text, kind: "raw-capture" });
      }
    }

    const importHits = hits.filter((h) => h.kind === "module-import");
    const captureHits = hits.filter((h) => h.kind === "raw-capture");
    const hitCount = hits.length;

    const report = [
      `Scanned production file count: ${scannedFileCount}`,
      `Unapproved provider import/capture hit count: ${hitCount}`,
      `  - module imports: ${importHits.length}`,
      `  - raw capture calls: ${captureHits.length}`,
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
        "Direct provider SDK imports and raw Sentry/OTel capture calls must live in " +
        "allowlisted adapter/config/bootstrap files with a named reason.",
    ).toEqual([]);
  });
});
