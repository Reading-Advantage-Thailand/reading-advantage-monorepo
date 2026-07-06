import { describe, it, expect } from 'vitest';
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
 * Allowlist
 * ---------
 * Some files legitimately need a raw `db` reference:
 *
 *   - `lib/auth/session.ts` — operates on the `sessions` table, which is
 *     registered as EXEMPT in `tenant-registry.ts` (auth infrastructure is
 *     intentionally global — sessions are not school-scoped).
 *
 *   - `app/api/ai/recommendations/route.ts` and
 *     `app/api/student/classes/route.ts` — transport-thin route handlers
 *     that obtain a raw Drizzle client solely to construct a TenantDB via
 *     `createTenantDB(db, tenant)`. The raw client is never used directly
 *     for queries; every read/write in these handlers goes through the
 *     resulting TenantDB, which enforces per-tenant scoping for every FLAT
 *     table. Adding unscoped() here would only add ceremony without
 *     changing the security boundary.
 *
 * New allowlist entries MUST reference an existing file and include a
 * documented reason; the second test case in this file asserts that each
 * allowlist entry points at a real file.
 */

const MONOREPO_ROOT = spawnSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf-8',
}).stdout.trim();

const SP3_ALLOWLIST: ReadonlyArray<{ path: string; reason: string }> = [
  {
    path: 'apps/science-advantage/lib/auth/session.ts',
    reason:
      "Operates on the 'sessions' table (registered as EXEMPT in tenant-registry.ts). " +
      'Auth infrastructure is intentionally global; sessions are not school-scoped.',
  },
  {
    path: 'apps/science-advantage/app/api/ai/recommendations/route.ts',
    reason:
      'Transport-thin route handler: obtains a raw Drizzle client solely to ' +
      'construct a TenantDB via createTenantDB(db, tenant). The raw client is ' +
      'never used directly for queries; every read/write goes through the resulting ' +
      'TenantDB, which enforces per-tenant scoping for every FLAT table.',
  },
  {
    path: 'apps/science-advantage/app/api/student/classes/route.ts',
    reason:
      'Transport-thin route handler: obtains a raw Drizzle client solely to ' +
      'construct a TenantDB via createTenantDB(db, tenant). The raw client is ' +
      'never used directly for queries; every read/write goes through the resulting ' +
      'TenantDB, which enforces per-tenant scoping for every FLAT table.',
  },
];

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
  const allFiles = out.split('\n').filter((line) => line.length > 0);
  const allowlist = new Set(SP3_ALLOWLIST.map((entry) => entry.path));
  return allFiles.filter((file) => !allowlist.has(file));
}

describe('SP-3 TenantDB adoption guard', () => {
  it('has zero raw @reading-advantage/db imports in non-test app/lib .ts files (excluding documented EXEMPT allowlist)', () => {
    const violations = listRawDbImports();

    expect(violations).toEqual([]);
  });

  it('documented allowlist entries reference existing files', () => {
    for (const entry of SP3_ALLOWLIST) {
      const result = spawnSync(
        'test',
        ['-f', `${MONOREPO_ROOT}/${entry.path}`],
        { encoding: 'utf-8' },
      );
      expect(
        result.status,
        `allowlist entry ${entry.path} must reference an existing file: ${entry.reason}`,
      ).toBe(0);
    }
  });
});