/**
 * Adversarial closure tests for `housekeeping_batch_20260603` Phase 12
 * (Closeout).
 *
 * Phase 12's deliverables are pure doc / file-system artifacts — no
 * runtime behavior. Per `test-strategy.md` "Live-Proof Plan":
 *
 *   | 12 | Closeout | static | tech-debt + tracks.md updated | contract |
 *
 * the gate is contract-only. Phase 12 closes three book-keeping items:
 *
 *   1. `measure/tech-debt.md` row `audit_20260603_housekeeping_batch`
 *      flips from `Open` to `Resolved`.
 *   2. `measure/lessons-learned.md` gains an entry that captures the
 *      "batched housekeeping is the right pattern for Low/Medium
 *      findings" lesson.
 *   3. The track directory is moved from `measure/tracks/` to
 *      `measure/archive/`, `metadata.json` status flips to
 *      `completed`, and `measure/tracks.md` is updated to point to
 *      the archive path.
 *
 * The SUT is the source text of `measure/tech-debt.md`,
 * `measure/lessons-learned.md`, `measure/tracks.md`, and the
 * presence/absence of the track directory at both the active and
 * archived paths. No DB, no Next.js server. Tests use
 * `fs.readFileSync` / `fs.statSync` / `fs.existsSync` and
 * `execFileSync('git', ...)` for ground truth.
 *
 * Per the user's "Artifact or markdown assertions are allowed only
 * when the phase deliverable is that artifact" policy, the test
 * asserts the artifact state directly. The Implementer / closeout
 * role owns the actual edits; the test pins the post-Green contract.
 *
 * Run via the unit config (no DB):
 *
 *   cd apps/science-advantage && \
 *     /opt/codex-desktop/resources/node-runtime/bin/node \
 *       ./node_modules/vitest/vitest.mjs run \
 *         --config vitest.unit.config.ts \
 *         lib/__tests__/housekeeping-phase12-closeout.test.ts
 *
 * See: measure/tracks/housekeeping_batch_20260603/plan.md (Phase 12)
 *      measure/tracks/housekeeping_batch_20260603/test-strategy.md
 *      measure/tech-debt.md
 *      measure/lessons-learned.md
 *      measure/tracks.md
 *      apps/science-advantage/lib/__tests__/housekeeping-phase11-final-acceptance.test.ts
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { describe, it, expect } from 'vitest';

const MONOREPO_ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf-8',
}).trim();

const TECH_DEBT_FILE = path.join(MONOREPO_ROOT, 'measure/tech-debt.md');
const LESSONS_LEARNED_FILE = path.join(
  MONOREPO_ROOT,
  'measure/lessons-learned.md'
);
const TRACKS_REGISTRY = path.join(MONOREPO_ROOT, 'measure/tracks.md');

const TRACK_ACTIVE_DIR = path.join(
  MONOREPO_ROOT,
  'measure/tracks/housekeeping_batch_20260603'
);
const TRACK_ARCHIVE_DIR = path.join(
  MONOREPO_ROOT,
  'measure/archive/housekeeping_batch_20260603'
);
const TRACK_METADATA_CANDIDATES = [
  path.join(TRACK_ACTIVE_DIR, 'metadata.json'),
  path.join(TRACK_ARCHIVE_DIR, 'metadata.json'),
];
const TRACK_PLAN_CANDIDATES = [
  path.join(TRACK_ACTIVE_DIR, 'plan.md'),
  path.join(TRACK_ARCHIVE_DIR, 'plan.md'),
];

const TECH_DEBT_TRACK_KEY = 'audit_20260603_housekeeping_batch';
const HOUSEKEEPING_TRACK_ID = 'housekeeping_batch_20260603';

/**
 * Resolve the active path for a candidate set (first existing wins).
 * Used to read metadata.json + plan.md regardless of whether the
 * track is in `tracks/` (HEAD) or `archive/` (post-Green).
 */
function resolveExisting(candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Parse the `audit_20260603_housekeeping_batch` row from tech-debt.md.
 * Returns the parsed status field or `null` if the row is absent.
 *
 * tech-debt.md row format (verified):
 *   | Date | Track | Item | Severity | Status | Notes |
 * Status column is the 5th field (index 4) when split on `|`.
 */
function parseTechDebtRow(content: string): {
  row: string | null;
  status: string | null;
} {
  const lines = content.split('\n');
  for (const line of lines) {
    if (!line.includes(TECH_DEBT_TRACK_KEY)) continue;
    const cells = line.split('|').map((cell) => cell.trim());
    // Header `| Date | Track | Item | Severity | Status | Notes |` → 8 cells (8 pipes)
    // with two empty cells around the content. We expect at least 7 cells
    // (Date, Track, Item, Severity, Status, Notes) once outer empties are trimmed.
    if (cells.length < 6) {
      return { row: line, status: null };
    }
    // After split on `|`, the line `| a | b | c |` becomes `['', 'a', 'b', 'c', '']`.
    // Trim outer empties and pick the Status field by position from the Track column.
    const trackIdx = cells.findIndex((cell) => cell === TECH_DEBT_TRACK_KEY);
    if (trackIdx < 0 || trackIdx + 3 >= cells.length) {
      return { row: line, status: null };
    }
    return { row: line, status: cells[trackIdx + 3] };
  }
  return { row: null, status: null };
}

describe('§1 measure/tech-debt.md closeout (F-205/F-503/F-705/F-1102/F-1201/F-1202/F-1207/F-1301/F-1305)', () => {
  const content = fs.readFileSync(TECH_DEBT_FILE, 'utf-8');
  const parsed = parseTechDebtRow(content);

  it('§1.1 — audit_20260603_housekeeping_batch row status is "Resolved" (closeout gate)', () => {
    expect(parsed.row).not.toBeNull();
    expect(parsed.status).toBe('Resolved');
  });

  it('§1.2 — exactly one audit_20260603_housekeeping_batch row exists (no duplicate after closeout)', () => {
    const occurrences = content
      .split('\n')
      .filter((line) => line.includes(TECH_DEBT_TRACK_KEY)).length;
    expect(occurrences).toBe(1);
  });

  it('§1.3 — file length stays at or below the 50-line curated-memory cap', () => {
    // Match the `wc -l` convention: count `\n` characters, dropping the
    // trailing empty line that `split('\n')` adds when the file ends with
    // a newline.
    const lineCount = content.endsWith('\n')
      ? content.slice(0, -1).split('\n').length
      : content.split('\n').length;
    expect(lineCount).toBeLessThanOrEqual(50);
  });
});

describe('§2 measure/lessons-learned.md closeout entry', () => {
  const content = fs.readFileSync(LESSONS_LEARNED_FILE, 'utf-8');

  it('§2.1 — lessons-learned.md contains a batched-housekeeping entry referencing the track ID', () => {
    // The entry must satisfy ALL three constraints:
    //   (a) reference the track id `housekeeping_batch_20260603`
    //   (b) mention the batched-housekeeping pattern (one of three phrases)
    //   (c) be dated on or after the track creation date (2026-06-03)
    const lines = content.split('\n');
    const patternKeywords = [
      'batched housekeeping',
      'batched-housekeeping',
      '10 small fixes',
      'cheaper to review',
      'one PR with 10 small fixes',
    ];

    const candidateLine = lines.find((line) => {
      if (!line.includes(HOUSEKEEPING_TRACK_ID)) return false;
      if (!/2026-06-(\d{2})/.test(line)) return false;
      const dayMatch = line.match(/2026-06-(\d{2})/);
      if (!dayMatch) return false;
      const day = Number.parseInt(dayMatch[1], 10);
      if (day < 3) return false; // track created 2026-06-03
      return patternKeywords.some((keyword) =>
        line.toLowerCase().includes(keyword.toLowerCase())
      );
    });

    expect(candidateLine, 'expected a lessons-learned entry that satisfies all three constraints; check Phase 12 task 2 deliverable').toBeDefined();
  });

  it('§2.2 — file length stays at or below the 50-line curated-memory cap', () => {
    // Match the `wc -l` convention: count `\n` characters, dropping the
    // trailing empty line that `split('\n')` adds when the file ends with
    // a newline.
    const lineCount = content.endsWith('\n')
      ? content.slice(0, -1).split('\n').length
      : content.split('\n').length;
    expect(lineCount).toBeLessThanOrEqual(50);
  });
});

describe('§3 track archive + measure/tracks.md update', () => {
  const tracksContent = fs.readFileSync(TRACKS_REGISTRY, 'utf-8');

  it('§3.1 — measure/archive/housekeeping_batch_20260603/ exists', () => {
    expect(fs.existsSync(TRACK_ARCHIVE_DIR)).toBe(true);
  });

  it('§3.2 — measure/tracks/housekeeping_batch_20260603/ does NOT exist (move complete)', () => {
    expect(fs.existsSync(TRACK_ACTIVE_DIR)).toBe(false);
  });

  it('§3.3 — measure/tracks.md does NOT contain an active ./tracks/housekeeping_batch_20260603/ link', () => {
    const activeLink = tracksContent.match(
      /\.\/tracks\/housekeeping_batch_20260603\//g
    );
    expect(activeLink, 'expected no active ./tracks/ link for the archived track').toBeNull();
  });

  it('§3.4 — measure/tracks.md HAS an [x] archive-section entry pointing to ./archive/housekeeping_batch_20260603/', () => {
    // Accepts any [x]-marked list item that references the archive path.
    const archiveLinkPattern = /\.\/archive\/housekeeping_batch_20260603\//;
    const archiveLinePattern = /^[\s]*-\s*\[x\][^\n]*\.\/archive\/housekeeping_batch_20260603\//m;
    expect(
      archiveLinkPattern.test(tracksContent),
      'expected an ./archive/housekeeping_batch_20260603/ link in tracks.md'
    ).toBe(true);
    expect(
      archiveLinePattern.test(tracksContent),
      'expected an [x] archive-section entry pointing to the archived track'
    ).toBe(true);
  });

  it('§3.5 — metadata.json status is a terminal value (completed | complete)', () => {
    const metadataPath = resolveExisting(TRACK_METADATA_CANDIDATES);
    expect(
      metadataPath,
      'expected metadata.json at either measure/tracks/ or measure/archive/'
    ).not.toBeNull();
    if (!metadataPath) return; // satisfy TypeScript narrowing
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    const terminalStates = ['completed', 'complete'];
    expect(terminalStates).toContain(metadata.status);
  });
});