import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only');

import { spawnSync } from 'child_process';

/**
 * SP-3 TenantDB-adoption guard (Phase 1 Red test).
 *
 * Scans non-test .ts files under apps/science-advantage/{lib,app} and fails
 * if any imports the raw `db` client directly from `@reading-advantage/db`
 * instead of routing through `createTenantDB`.
 *
 * Anti-pattern defenses:
 *   A7: excludes test files and lib/test/ by path, not by bare English words.
 *   A12: this guard file exists and runs in CI.
 *
 * Expected Red at baseline: app/api/admin/dsar/export/route.ts imports `db`
 * from `@reading-advantage/db`.
 */

const MONOREPO_ROOT = spawnSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf-8',
}).stdout.trim();

function runRg(args: string[]): string {
  const result = spawnSync('rg', args, {
    cwd: MONOREPO_ROOT,
    encoding: 'utf-8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(
      `rg failed (${result.status}): ${args.join(' ')}\n${result.stderr}`,
    );
  }
  return (result.stdout ?? '').trim();
}

function listRawDbImports(): string[] {
  const out = runRg([
    '-l',
    '^\\s*import\\s+.*\\{\\s*[^}]*\\bdb\\b[^}]*\\}\\s+from\\s+[\'"]@reading-advantage/db[\'"]',
    'apps/science-advantage/lib/',
    'apps/science-advantage/app/',
    '-g',
    '*.ts',
    '-g',
    '!*.test.*',
    '-g',
    '!*.integration.test.*',
    '-g',
    '!lib/test/**',
  ]);
  if (out === '') return [];
  return out.split('\n').filter((line) => line.length > 0);
}

describe('SP-3 TenantDB adoption guard', () => {
  it('has zero raw @reading-advantage/db imports in non-test app/lib .ts files', () => {
    const violations = listRawDbImports();

    expect(violations).toEqual([]);
  });

});
