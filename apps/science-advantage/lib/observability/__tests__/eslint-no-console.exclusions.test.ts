/**
 * Phase 8 regression test: `no-console` ESLint rule exclusions for
 * `scripts/**` and test-infrastructure files.
 *
 * Context: the Phase 8 Green gate (test-strategy §7) requires
 * `pnpm turbo run lint --filter=science-advantage` to exit 0.
 * The `no-console` rule (FR-7) flags `console.log` / `console.info`
 * as errors. CLI scripts under `scripts/**` and the integration-test
 * global-setup file legitimately use `console.log` for user-facing
 * output and are outside the FR-8 production-code scope
 * (`app/` + `lib/` + `components/` + `proxy.ts` per spec line 199).
 *
 * This test verifies the ESLint config excludes those paths so the
 * lint gate stays green.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const APP_ROOT = resolve(__dirname, '../../..');
const ESLINT_BIN = resolve(APP_ROOT, 'node_modules/eslint/bin/eslint.js');

const SCRIPTS_CANARY = resolve(APP_ROOT, 'scripts/__eslint_no_console_canary__.ts');

interface EslintRunResult {
  status: number;
  stdout: string;
  stderr: string;
}

function runEslintOnFile(filePath: string): EslintRunResult {
  try {
    const stdout = execFileSync(
      process.execPath,
      [ESLINT_BIN, filePath],
      { cwd: APP_ROOT, encoding: 'utf8' },
    );
    return { status: 0, stdout, stderr: '' };
  } catch (e) {
    const err = e as {
      status?: number | null;
      stdout?: string | Buffer;
      stderr?: string | Buffer;
    };
    const stdout = typeof err.stdout === 'string'
      ? err.stdout
      : err.stdout?.toString('utf8') ?? '';
    const stderr = typeof err.stderr === 'string'
      ? err.stderr
      : err.stderr?.toString('utf8') ?? '';
    return {
      status: typeof err.status === 'number' ? err.status : 1,
      stdout,
      stderr,
    };
  }
}

afterEach(() => {
  if (existsSync(SCRIPTS_CANARY)) {
    unlinkSync(SCRIPTS_CANARY);
  }
});

describe('FR-7 `no-console` exclusions for scripts/ and test infrastructure', () => {
  it('scripts/** files are excluded from no-console (CLI tools use console.log)', () => {
    writeFileSync(
      SCRIPTS_CANARY,
      'console.log("canary: scripts exclusion");\n',
      'utf8',
    );

    const result = runEslintOnFile(SCRIPTS_CANARY);

    expect(
      result.status,
      [
        `expected eslint to exit 0 on a scripts/ file containing console.log`,
        `(the scripts/** config block must turn off no-console).`,
        `exit code: ${result.status}`,
        `stdout: ${result.stdout}`,
        `stderr: ${result.stderr}`,
      ].join('\n'),
    ).toBe(0);
  });

  it('vitest.integration.global-setup.ts is excluded from no-console (test infrastructure)', () => {
    const globalSetup = resolve(APP_ROOT, 'vitest.integration.global-setup.ts');

    const result = runEslintOnFile(globalSetup);

    expect(
      result.status,
      [
        `expected eslint to exit 0 on vitest.integration.global-setup.ts`,
        `(test infrastructure file uses console.log for migration status).`,
        `exit code: ${result.status}`,
        `stdout: ${result.stdout}`,
        `stderr: ${result.stderr}`,
      ].join('\n'),
    ).toBe(0);
  });
});
