/**
 * Phase 9 Red-phase tests for the `@reading-advantage/ai` README.
 *
 * Driven by `measure/tracks/ai_adapter_package_20260603/plan.md`
 * Phase 9 task 3 and `spec.md` §FR-7 ("Add a `packages/ai/README.md`
 * with provider config examples (OpenAI, Google, Mock)"). The
 * Green-phase implementer must make this test pass; the existing
 * README is the starting point and the assertions below pin the
 * structural elements FR-7 requires.
 *
 * What this file pins:
 *   1. The README file exists at `packages/ai/README.md`.
 *   2. The README documents how to consume the package —
 *      `getAIClient()` is mentioned and the import path
 *      `@reading-advantage/ai` is shown.
 *   3. A "Provider Configuration" section names the three providers
 *      (OpenAI, Google, Mock) and at least the OpenAI / Google env
 *      vars (`OPENAI_API_KEY`, `GEMINI_API_KEY` / `GOOGLE_API_KEY`).
 *   4. The "Quick Start" or "Mock Provider for Tests" section shows
 *      how to obtain a `MockProvider` for unit tests — the test
 *      layer that this whole track exists to enable.
 *
 * Test design:
 *   - Pure file-content assertions via `node:fs`; no module imports
 *     of the package, no DB, no network.
 *   - The existing README (committed at the start of Phase 9) already
 *     satisfies the FR-7 contract on most points; this test serves
 *     as a *regression net* so a future doc drift away from the
 *     adapter pattern trips the runner. Run results will tell us
 *     which (if any) FR-7 surface elements are still missing.
 *
 * Test command (targeted, no DB / no network):
 *   cd packages/ai && \
 *     npx vitest run src/__tests__/phase-9-docs.test.ts
 *
 * Location note: this test lives in `packages/ai/src/__tests__/` to
 * match the existing phase-2 / phase-3 / phase-4 / phase-5 test
 * naming. The `packages/ai/vitest.config.ts` picks up the default
 * vitest test-file glob (any `*.test.ts` / `*.spec.ts` file under
 * the package), so no config changes are required.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// `packages/ai/src/__tests__/phase-9-docs.test.ts` → up 2 levels → package root.
const PACKAGE_ROOT = join(__dirname, '../..');

const README_PATH = join(PACKAGE_ROOT, 'README.md');

describe('Phase 9 — Task 3: packages/ai/README.md has provider config examples (FR-7)', () => {
  it('README.md exists at the expected path under packages/ai/', () => {
    expect(() => readFileSync(README_PATH, 'utf8')).not.toThrow();
  });

  it('README.md names the @reading-advantage/ai package and shows the getAIClient() entry point', () => {
    const source = readFileSync(README_PATH, 'utf8');
    expect(
      source,
      'README.md must reference the @reading-advantage/ai package identifier ' +
        'in the title or first paragraph so consumers can find it on npm / in the monorepo.',
    ).toMatch(/@reading-advantage\/ai/);

    // The "Quick Start" section uses `getAIClient()` as the canonical
    // entry point. Pin both the import line and the call so a future
    // rewrite that drops the lazy-singleton in favour of `new` is caught.
    expect(
      source,
      'README.md must show `import { getAIClient } from "@reading-advantage/ai"` ' +
        'or equivalent, so consumers know the canonical import path.',
    ).toMatch(/import\s*\{[^}]*getAIClient[^}]*\}\s*from\s*['"]@reading-advantage\/ai['"]/);

    expect(
      source,
      'README.md must demonstrate calling `getAIClient()` (the lazy-singleton ' +
        'entry point is the documented public API of the package).',
    ).toMatch(/getAIClient\s*\(\s*\)/);
  });

  it('README.md has a "Provider Configuration" section listing OpenAI, Google, and Mock', () => {
    const source = readFileSync(README_PATH, 'utf8');
    // A `## Provider Configuration` heading is the structural
    // signature of the FR-7 deliverable. The body must name all
    // three providers so a reader can pick a backend in one pass.
    expect(
      source,
      'README.md must have a "## Provider Configuration" section (or close ' +
        'equivalent — e.g. "Providers", "Supported Providers") per FR-7.',
    ).toMatch(/^##\s+Provider(?:s| Configuration)?\s*$/m);

    const providerNames = [
      { name: 'openai', re: /\bopenai\b/i },
      { name: 'google', re: /\bgoogle\b/i },
      { name: 'mock', re: /\bmock\b/i },
    ];
    for (const { name, re } of providerNames) {
      expect(
        re.test(source),
        `README.md must mention the "${name}" provider in the Provider Configuration section.`,
      ).toBe(true);
    }
  });

  it('README.md documents the AI_PROVIDER env var and the OpenAI / Google API key env vars', () => {
    const source = readFileSync(README_PATH, 'utf8');
    // The Provider Configuration table (or its prose equivalent) must
    // expose the env vars the runtime reads. `OPENAI_API_KEY` and
    // `GEMINI_API_KEY` (or the `GOOGLE_API_KEY` alias) are the two
    // contract env vars; `AI_PROVIDER` is the selector.
    const requiredEnvVars = ['AI_PROVIDER', 'OPENAI_API_KEY'];
    for (const envVar of requiredEnvVars) {
      expect(
        source.includes(envVar),
        `README.md must document the \`${envVar}\` env var so consumers can ` +
          'configure the runtime without reading the source.',
      ).toBe(true);
    }
    // Google accepts both `GEMINI_API_KEY` and the legacy
    // `GOOGLE_API_KEY` alias; at least one of them must be named.
    const hasGoogleKey = source.includes('GEMINI_API_KEY') ||
      source.includes('GOOGLE_API_KEY');
    expect(
      hasGoogleKey,
      'README.md must document the Google provider API key env var ' +
        '(`GEMINI_API_KEY` or `GOOGLE_API_KEY`).',
    ).toBe(true);
  });

  it('README.md documents how to obtain a MockProvider for tests', () => {
    const source = readFileSync(README_PATH, 'utf8');
    // The whole track exists to make the AI surface unit-testable.
    // The README must show the `MockProvider` import so a reader can
    // wire it up. We assert on the import line and on at least one
    // call site.
    expect(
      source,
      'README.md must show importing `MockProvider` from @reading-advantage/ai ' +
        'so unit-test consumers can wire it up without re-reading the source.',
    ).toMatch(/import\s*\{[^}]*MockProvider[^}]*\}\s*from\s*['"]@reading-advantage\/ai['"]/);

    expect(
      source,
      'README.md must show constructing a `MockProvider` (e.g. `new MockProvider({ ... })`) ' +
        'in a test fixture or quick-start snippet.',
    ).toMatch(/new\s+MockProvider\s*\(/);
  });
});
