/**
 * Phase 0 setup contracts for the AGENTS.md Compliance Audit of
 * `apps/science-advantage/` (pilot).
 *
 * The audit protocol's §14 Pre-audit Preconditions require:
 *   14.1 `build-graph stats ./graph.db` reports `Total files > 0`.
 *   14.2 `graph.db` mtime is within the last 24 hours.
 *   14.3 `scripts/ci/check-graph-db.sh` exists and is executable.
 *
 * The Phase 0 plan adds two more preconditions that are not in §14
 * but are checked here so the audit is reproducible:
 *   - The audit-report directory exists and is non-empty.
 *   - The audited app's working tree matches the branch tip
 *     (no uncommitted or untracked drift that would invalidate the
 *     build-graph results).
 *
 * These tests are unit-level: they do not require a database, build
 * the science-advantage app, or spawn a Next.js server. They shell out
 * to `build-graph` and `git` for verification.
 *
 * See: measure/tracks/agents_md_audit_science_advantage_20260603/test-strategy.md
 */
import fs from 'fs/promises';
import path from 'path';
import { execFileSync } from 'child_process';
import { describe, it, expect } from 'vitest';

/**
 * Resolve the monorepo root via git so this test is robust to moves of
 * the file within the tree. Falls back to a relative walk-up if git is
 * not on PATH (CI without git → fail loudly).
 */
const MONOREPO_ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf-8',
}).trim();
const GRAPH_DB = path.join(MONOREPO_ROOT, 'graph.db');
const AUDIT_REPORT_DIR = path.join(
  MONOREPO_ROOT,
  'measure/audit-reports/science-advantage_20260603',
);
const SCIENCE_ADVANTAGE_DIR = path.join(MONOREPO_ROOT, 'apps/science-advantage');
const CHECK_GRAPH_DB_SCRIPT = path.join(
  MONOREPO_ROOT,
  'scripts/ci/check-graph-db.sh',
);
const MAX_GRAPH_DB_AGE_MS = 24 * 60 * 60 * 1000;

function runCaptured(command: string, args: string[]): string {
  return execFileSync(command, args, { cwd: MONOREPO_ROOT, encoding: 'utf-8' }).trim();
}

describe('AGENTS.md Compliance Audit — science-advantage (Phase 0: Setup)', () => {
  describe('Protocol §14.1 — graph.db is populated', () => {
    it('graph.db exists at the monorepo root', async () => {
      const stat = await fs.stat(GRAPH_DB);
      expect(stat.isFile()).toBe(true);
    });

    it('build-graph stats reports Total files > 0', () => {
      const output = runCaptured('build-graph', ['stats', GRAPH_DB]);
      const match = output.match(/Total files:\s*(\d+)/);
      expect(match).not.toBeNull();
      const total = Number(match![1]);
      expect(total).toBeGreaterThan(0);
    });
  });

  describe('Protocol §14.2 — graph.db is fresh (<24h)', () => {
    it('graph.db mtime is within the last 24 hours', async () => {
      const stat = await fs.stat(GRAPH_DB);
      const ageMs = Date.now() - stat.mtime.getTime();
      expect(ageMs).toBeGreaterThanOrEqual(0);
      expect(ageMs).toBeLessThanOrEqual(MAX_GRAPH_DB_AGE_MS);
    });
  });

  describe('Protocol §14.3 — graph.db CI gate exists', () => {
    it('scripts/ci/check-graph-db.sh exists', async () => {
      const stat = await fs.stat(CHECK_GRAPH_DB_SCRIPT);
      expect(stat.isFile()).toBe(true);
    });

    it('scripts/ci/check-graph-db.sh is executable', async () => {
      const stat = await fs.stat(CHECK_GRAPH_DB_SCRIPT);
      // Owner-execute bit (0o100) is sufficient — CI runs as the same uid.
      expect(stat.mode & 0o100).toBeGreaterThan(0);
    });
  });

  describe('Phase 0 Task 1 — audit report directory exists', () => {
    it('measure/audit-reports/science-advantage_20260603/ is a directory', async () => {
      const stat = await fs.stat(AUDIT_REPORT_DIR);
      expect(stat.isDirectory()).toBe(true);
    });

    it('the audit report directory contains at least one artifact', async () => {
      const entries = await fs.readdir(AUDIT_REPORT_DIR);
      expect(entries.length).toBeGreaterThan(0);
    });
  });

  describe('Phase 0 Task 3 — apps/science-advantage/ matches main', () => {
    it('working tree has no uncommitted changes under apps/science-advantage/', () => {
      const porcelain = runCaptured('git', [
        'status',
        '--porcelain',
        'apps/science-advantage/',
      ]);
      expect(porcelain).toBe('');
    });

    it('apps/science-advantage/ exists at the expected path', async () => {
      const stat = await fs.stat(SCIENCE_ADVANTAGE_DIR);
      expect(stat.isDirectory()).toBe(true);
    });
  });
});
