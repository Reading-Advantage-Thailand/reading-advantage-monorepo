import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createVitest } from 'vitest/node';
import { configDefaults } from 'vitest/config';

const APP_ROOT = process.cwd();
const MONOREPO_ROOT = resolve(APP_ROOT, '..', '..');
/**
 * Discovers tests with a real Vitest configuration.
 * @param configFile The configuration path, or false for Vitest defaults.
 * @returns The sorted app-relative test paths.
 */
async function discoverTests(configFile: string | false): Promise<string[]> {
  const vitest = await createVitest('test', {
    root: APP_ROOT,
    config: configFile,
    watch: false,
    run: false,
    ...(configFile === false
      ? {
          exclude: [
            ...configDefaults.exclude,
            'e2e/**',
            '**/*.e2e.spec.{ts,tsx}',
          ],
        }
      : {}),
  });

  try {
    const specifications = await vitest.globTestSpecifications();
    return specifications
      .map(({ moduleId }) => relative(APP_ROOT, moduleId).replaceAll('\\', '/'))
      .sort();
  } finally {
    await vitest.close();
  }
}

/**
 * Reports any difference between a legacy set and its two partitions.
 * @param legacyFiles The files discovered before the partition.
 * @param runtimeFiles The files discovered by the runtime configuration.
 * @param verificationFiles The files discovered by the verification configuration.
 * @returns Missing, repeated, and unexpected paths.
 */
function comparePartition(
  legacyFiles: readonly string[],
  runtimeFiles: readonly string[],
  verificationFiles: readonly string[]
) {
  const legacy = new Set(legacyFiles);
  const runtime = new Set(runtimeFiles);
  const verification = new Set(verificationFiles);
  const union = new Set([...runtime, ...verification]);

  return {
    missing: legacyFiles.filter((path) => !union.has(path)),
    overlap: runtimeFiles.filter((path) => verification.has(path)),
    unexpected: [...union].filter((path) => !legacy.has(path)),
  };
}

describe('Science verification partition', () => {
  it('keeps the previous test set as one disjoint runtime and verification union', async () => {
    const [legacyFiles, runtimeFiles, verificationFiles] = await Promise.all([
      discoverTests(false),
      discoverTests('vitest.config.ts'),
      discoverTests('vitest.verification.config.ts'),
    ]);

    const comparison = comparePartition(
      legacyFiles,
      runtimeFiles,
      verificationFiles
    );
    expect(verificationFiles.length).toBeGreaterThan(0);
    expect(comparison).toEqual({ missing: [], overlap: [], unexpected: [] });
  }, 15_000);

  it('detects a file removed from one partition', () => {
    expect(
      comparePartition(['a.test.ts', 'b.test.ts'], ['a.test.ts'], [])
    ).toEqual({
      missing: ['b.test.ts'],
      overlap: [],
      unexpected: [],
    });
  });

  it('detects a file included in both partitions', () => {
    expect(
      comparePartition(['a.test.ts'], ['a.test.ts'], ['a.test.ts'])
    ).toEqual({
      missing: [],
      overlap: ['a.test.ts'],
      unexpected: [],
    });
  });

  it('wires each test file to exactly one Vitest configuration', () => {
    const runtimeConfig = readFileSync(
      resolve(APP_ROOT, 'vitest.config.ts'),
      'utf8'
    );
    const unitConfig = readFileSync(
      resolve(APP_ROOT, 'vitest.unit.config.ts'),
      'utf8'
    );
    const verificationPath = resolve(APP_ROOT, 'vitest.verification.config.ts');

    expect(runtimeConfig).toContain('lib/ci-gates/**');
    expect(unitConfig).toContain('lib/ci-gates/**');
    expect(existsSync(verificationPath)).toBe(true);
    expect(readFileSync(verificationPath, 'utf8')).toContain(
      'lib/ci-gates/**/*.test.ts'
    );
  });

  it('makes Turbo verification depend on the real Science build', () => {
    const rootPackage = JSON.parse(
      readFileSync(resolve(MONOREPO_ROOT, 'package.json'), 'utf8')
    ) as {
      scripts?: Record<string, string>;
    };
    const appPackage = JSON.parse(
      readFileSync(resolve(APP_ROOT, 'package.json'), 'utf8')
    ) as {
      scripts?: Record<string, string>;
    };
    const turbo = JSON.parse(
      readFileSync(resolve(MONOREPO_ROOT, 'turbo.json'), 'utf8')
    ) as {
      tasks?: Record<string, { cache?: boolean; dependsOn?: string[] }>;
    };
    const workflow = readFileSync(
      resolve(MONOREPO_ROOT, '.github', 'workflows', 'ci.yml'),
      'utf8'
    );

    expect(appPackage.scripts?.verify).toBe(
      'mkdir -p .turbo && pnpm run check-types > .turbo/verify-check-types.log 2>&1 || { cat .turbo/verify-check-types.log; exit 1; }; vitest run --config vitest.verification.config.ts'
    );
    expect(appPackage.scripts?.['check-types']).toBe('tsc --noEmit');
    expect(rootPackage.scripts?.['verify:science']).toBe(
      'turbo run verify --filter=science-advantage'
    );
    expect(rootPackage.scripts?.validate).toContain('verify:science');
    expect(turbo.tasks?.['science-advantage#verify']).toEqual({
      dependsOn: ['build'],
      cache: false,
    });
    expect(workflow).toMatch(
      /- name: Build\s+run: pnpm build\s+- name: Science verification\s+run: pnpm verify:science/u
    );
  });

  it('starts Vitest only after the captured compiler command succeeds', () => {
    const appPackage = JSON.parse(
      readFileSync(resolve(APP_ROOT, 'package.json'), 'utf8')
    ) as { scripts?: Record<string, string> };
    const script = appPackage.scripts?.verify ?? '';
    const fixtureRoot = mkdtempSync(resolve(tmpdir(), 'science-verify-'));
    const bin = resolve(fixtureRoot, 'bin');
    const marker = resolve(fixtureRoot, 'vitest-ran');

    try {
      mkdirSync(bin);
      writeFileSync(
        resolve(bin, 'pnpm'),
        '#!/bin/sh\nprintf "%s\\n" "${STUB_TSC_OUTPUT:-compiler ok}" >&2\nexit "${STUB_TSC_STATUS:-0}"\n'
      );
      writeFileSync(
        resolve(bin, 'vitest'),
        '#!/bin/sh\nprintf "ran\\n" > "$STUB_VITEST_MARKER"\n'
      );
      chmodSync(resolve(bin, 'pnpm'), 0o755);
      chmodSync(resolve(bin, 'vitest'), 0o755);

      const success = spawnSync('/bin/sh', ['-c', script], {
        cwd: fixtureRoot,
        encoding: 'utf8',
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, STUB_VITEST_MARKER: marker },
      });
      expect(success.status).toBe(0);
      expect(existsSync(marker)).toBe(true);
      expect(readFileSync(resolve(fixtureRoot, '.turbo', 'verify-check-types.log'), 'utf8')).toContain(
        'compiler ok'
      );

      rmSync(marker);
      writeFileSync(resolve(fixtureRoot, '.turbo', 'verify-check-types.log'), 'stale diagnostic\n');
      const failure = spawnSync('/bin/sh', ['-c', script], {
        cwd: fixtureRoot,
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH}`,
          STUB_TSC_OUTPUT: 'fresh diagnostic',
          STUB_TSC_STATUS: '19',
          STUB_VITEST_MARKER: marker,
        },
      });
      expect(failure.status).toBe(1);
      expect(failure.stdout).toContain('fresh diagnostic');
      expect(existsSync(marker)).toBe(false);
      expect(readFileSync(resolve(fixtureRoot, '.turbo', 'verify-check-types.log'), 'utf8')).toBe(
        'fresh diagnostic\n'
      );
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});
