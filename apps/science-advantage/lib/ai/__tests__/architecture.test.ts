/**
 * Phase 8 architecture guardrails (test-strategy §4).
 *
 * Codifies the two grep-gate tasks at the bottom of plan.md Phase 8
 * as Vitest assertions so a regression trips the test runner (not a
 * human running `rg` once a quarter). CI failure on regression is
 * the point.
 *
 * Guards under test:
 *   G-1: no `from "ai"` or `from "@ai-sdk/..."` imports in app source
 *        (plan task 4: `rg "from ['\"]@?ai['\"]|from ['\"]@ai-sdk"
 *        apps/science-advantage/` → 0 hits).
 *   G-2: no `process.env.{OPENAI|GOOGLE|GEMINI}_API_KEY` references
 *        in `lib/ai/` source (plan task 5: same rg pattern scoped to
 *        `apps/science-advantage/lib/ai/`).
 *
 * Scope decisions:
 *   - The G-1 regex matches `from 'ai'` (literal `'ai'`) or
 *     `from '@ai-sdk/...'` (any suffix). It does NOT require the
 *     closing quote immediately after `@ai-sdk/` — real package
 *     names have a suffix (e.g. `@ai-sdk/openai`). A trailing
 *     closing-quote anchor would miss them. `@reading-advantage/ai`
 *     is still excluded: the regex requires either the literal
 *     `'ai'` between quotes OR the prefix `@ai-sdk/`, neither of
 *     which is present in `@reading-advantage/ai`.
 *   - Test files (*.test.ts, *.integration.test.ts, *.spec.ts) are
 *     excluded from both scans. The G-1 / G-2 gates guard
 *     *production* code: legacy test files use `vi.mock('ai', ...)`
 *     (which doesn't match the G-1 regex anyway — it uses `vi.mock`,
 *     not `from`) and `process.env.X = '...'` writes as test setup
 *     (not the dangerous reads the gates are about). Green-phase
 *     cleanup of the test fixtures is out of Phase 8 scope.
 *   - The walker skips `node_modules`, dotfiles, build outputs, and
 *     other noise directories that should never be linted.
 *
 * Run (targeted, no DB / no network):
 *   cd apps/science-advantage && \
 *     npx vitest run --config vitest.unit.config.ts \
 *       lib/ai/__tests__/architecture.test.ts
 *
 * Location note (test-strategy §4 vs Red-phase boundary):
 *   test-strategy §4 specifies
 *   `apps/science-advantage/__tests__/architecture.test.ts`, but the
 *   existing `vitest.unit.config.ts` `include` patterns are
 *   `app/`, `components/`, `lib/` (no top-level `__tests__/`). The
 *   Red-phase boundary (test files + Measure docs only) bars editing
 *   the unit config, so the file is placed at
 *   `lib/ai/__tests__/architecture.test.ts` — adjacent to the code
 *   under test, picked up by the existing `lib/...test.{ts,tsx}`
 *   pattern (the `**` segment matches `ai/__tests__/`). The
 *   `__tests__/` subdirectory convention is preserved.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// `lib/ai/__tests__/architecture.test.ts` → up 3 levels → package root.
const ROOT = join(__dirname, '../../..');

const IGNORED_DIRS = new Set<string>([
  'node_modules',
  '.next',
  '.turbo',
  'dist',
  'build',
  'coverage',
  '.git',
  '.vercel',
  '.swc',
  'playwright-report',
  'test-results',
  'out',
  '.cache',
]);

const TEST_FILE_RE = /\.(test|integration\.test|spec)\.tsx?$/;
const SOURCE_EXT_RE = /\.tsx?$/;

const G1_REGEX = /from\s+['"](ai|@ai-sdk\/)/;
const G2_REGEX = /process\.env\.(OPENAI|GOOGLE|GEMINI)_API_KEY/;

function walk(dir: string, includeTestFiles: boolean, acc: string[] = []): string[] {
  let entries: import('node:fs').Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, includeTestFiles, acc);
    } else if (SOURCE_EXT_RE.test(entry.name)) {
      if (!includeTestFiles && TEST_FILE_RE.test(entry.name)) continue;
      acc.push(full);
    }
  }
  return acc;
}

function findHits(files: string[], regex: RegExp): string[] {
  const out: string[] = [];
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (regex.test(lines[i])) {
        out.push(`${relative(ROOT, file)}:${i + 1}: ${lines[i].trim()}`);
      }
    }
  }
  return out;
}

describe('Phase 8 architecture guardrails (test-strategy §4)', () => {
  it('G-1: zero `from "ai"` or `from "@ai-sdk/..."` imports in app source', () => {
    const sources = walk(ROOT, false);
    const hits = findHits(sources, G1_REGEX);
    expect(
      hits,
      `G-1 violation: app source must not import 'ai' or '@ai-sdk/*'.\n` +
        `Use '@reading-advantage/ai' instead. Found ${hits.length} hit(s):\n` +
        (hits.length ? hits.join('\n') + '\n' : '') +
        'Run `rg "from [\\\'\\"](ai|@ai-sdk/)" apps/science-advantage/` to inspect.',
    ).toEqual([]);
  });

  it('G-2: zero `process.env.{OPENAI|GOOGLE|GEMINI}_API_KEY` references in lib/ai/ source', () => {
    const sources = walk(join(ROOT, 'lib', 'ai'), false);
    const hits = findHits(sources, G2_REGEX);
    expect(
      hits,
      `G-2 violation: lib/ai/ source must not reference ` +
        `process.env.OPENAI_API_KEY/GOOGLE_API_KEY/GEMINI_API_KEY.\n` +
        `Env access belongs in @reading-advantage/ai's getAIClient(). ` +
        `Found ${hits.length} hit(s):\n` +
        hits.join('\n'),
    ).toEqual([]);
  });
});
