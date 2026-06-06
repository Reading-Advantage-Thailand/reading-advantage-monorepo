/**
 * Phase 9 Red-phase tests for the science-advantage AI docs.
 *
 * Driven by `measure/tracks/ai_adapter_package_20260603/plan.md`
 * Phase 9 tasks 1 + 2 and `spec.md` §FR-7 ("Update Docs"). The two
 * `Update ...` tasks ask the Green-phase implementer to refresh the
 * in-tree AI docs so they reference `@reading-advantage/ai` instead
 * of the legacy `@ai-sdk/*` / raw-model-id conventions.
 *
 * This file pins the expected doc surface as Vitest assertions so a
 * regression trips the test runner instead of relying on a doc
 * review. The tests intentionally read the markdown files at
 * runtime (markdown is a deployable artifact, and the only way to
 * enforce "the docs reference the new package" is to assert on the
 * file contents).
 *
 * What this file pins:
 *   1. `specs/ai-structured-data-generation/spec.md` — the
 *      "Supported Providers" section (lines 79-86 in the file as it
 *      shipped at the start of Phase 9) must describe the providers
 *      via the `@reading-advantage/ai` interface, not the
 *      `@ai-sdk/openai` / `@ai-sdk/google-vertex` direct imports.
 *      Concretely: a "Provider Configuration" section (or equivalent)
 *      must mention `@reading-advantage/ai`, and the legacy
 *      `import { openai } from '@ai-sdk/openai'` /
 *      `import { vertex } from '@ai-sdk/google-vertex'` snippets
 *      must NOT appear in the spec (they are the contract that the
 *      adapter is supposed to absorb).
 *   2. `docs/ai-image-generation.md` — line 9 (the model-config
 *      bullet) must reference the `@reading-advantage/ai` interface
 *      rather than hard-coding `google/gemini-3-pro-image` /
 *      `openai/dall-e-3` as direct model identifiers. The bullet
 *      should also mention either `aiImageConfig` (the in-app
 *      config object) or `getAIClient()` (the shared package entry
 *      point) so a reader knows where the values come from.
 *
 * RED expectations (2026-06-06):
 *   - Task 1: spec.md still contains `import { openai } from
 *     '@ai-sdk/openai'` (line 80) and `import { vertex } from
 *     '@ai-sdk/google-vertex'` (line 86). The `@reading-advantage/ai`
 *     token is not yet present in the file. Fails RED on 3
 *     assertions (negative-import, section-heading, and
 *     @reading-advantage/ai mention).
 *   - Task 2: ai-image-generation.md line 9 still hard-codes
 *     `google/gemini-3-pro-image` and `openai/dall-e-3` without
 *     referencing the package. Fails RED on 2 assertions
 *     (no @reading-advantage/ai mention, no `aiImageConfig` /
 *     `getAIClient` mention).
 *
 * Test command (targeted, no DB / no network):
 *   cd apps/science-advantage && \
 *     npx vitest run --config vitest.unit.config.ts \
 *       lib/ai/__tests__/phase-9-docs.test.ts
 *
 * Location note: the test is placed at `lib/ai/__tests__/` to match
 * the Phase 8 architecture.test.ts convention (picked up by the
 * existing `lib` include pattern in vitest.unit.config.ts; no
 * config changes required).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// `lib/ai/__tests__/phase-9-docs.test.ts` → up 3 levels → package root.
const ROOT = join(__dirname, '../../..');

const SPEC_PATH = join(
  ROOT,
  'docs',
  'specs',
  'ai-structured-data-generation',
  'spec.md',
);
const IMAGE_DOC_PATH = join(ROOT, 'docs', 'ai-image-generation.md');

// ---------------------------------------------------------------------------
// Task 1 — apps/science-advantage/docs/specs/ai-structured-data-generation/spec.md
// ---------------------------------------------------------------------------

describe('Phase 9 — Task 1: ai-structured-data-generation spec references @reading-advantage/ai', () => {
  it('spec.md exists at the expected path under apps/science-advantage/docs/', () => {
    expect(() => readFileSync(SPEC_PATH, 'utf8')).not.toThrow();
  });

  it('spec.md no longer contains the legacy direct-SDK import snippets (FR-7: spec must point at the adapter)', () => {
    const source = readFileSync(SPEC_PATH, 'utf8');

    // These two snippets are the exact strings from the pre-Phase-9
    // spec (lines 80 and 86 respectively). Their presence means the
    // doc is still telling readers to import the SDKs directly,
    // which is precisely what F-101 / F-202 audited as the bug to
    // fix. The Green-phase doc update must replace them with
    // adapter-flavoured examples (e.g. `import { getAIClient } from
    // '@reading-advantage/ai';`).
    expect(
      source,
      'spec.md must not instruct readers to import @ai-sdk/openai directly. ' +
        'Replace with the @reading-advantage/ai adapter example.',
    ).not.toMatch(/import\s*\{\s*openai\s*\}\s*from\s*['"]@ai-sdk\/openai['"]/);

    expect(
      source,
      'spec.md must not instruct readers to import @ai-sdk/google-vertex directly. ' +
        'Replace with the @reading-advantage/ai adapter example.',
    ).not.toMatch(/import\s*\{\s*vertex\s*\}\s*from\s*['"]@ai-sdk\/google-vertex['"]/);
  });

  it('spec.md mentions the @reading-advantage/ai package by name (FR-7)', () => {
    const source = readFileSync(SPEC_PATH, 'utf8');
    expect(
      source,
      'spec.md must reference the @reading-advantage/ai package so readers ' +
        'know which adapter to use instead of the @ai-sdk/* packages.',
    ).toMatch(/@reading-advantage\/ai/);
  });

  it('spec.md describes provider configuration through the adapter (not the raw SDKs)', () => {
    const source = readFileSync(SPEC_PATH, 'utf8');
    // A "Provider Configuration" (or equivalent) section that uses
    // `getAIClient` / `createAIClient` / `AI_PROVIDER` is the
    // signature of the post-refactor surface. The pre-Phase-9 spec
    // has only a "Supported Providers" subsection that lists each
    // SDK package — the Green-phase update must add or rename it to
    // a "Provider Configuration" section that delegates to the
    // adapter.
    expect(
      source,
      'spec.md must document a "Provider Configuration" section (or equivalent) ' +
        'that drives selection through the @reading-advantage/ai adapter.',
    ).toMatch(/^##\s+Provider Configuration\s*$/m);

    // At least one of the entry points or env-var names from the
    // shared package is mentioned — this pins the contract so a
    // future doc drift back to a model-id table is caught.
    const adapterSignals = [
      /getAIClient\s*\(/,
      /createAIClient\s*\(/,
      /AI_PROVIDER/,
    ];
    const hasAdapterSignal = adapterSignals.some((re) => re.test(source));
    expect(
      hasAdapterSignal,
      'spec.md must reference at least one of `getAIClient()`, `createAIClient()`, ' +
        'or the `AI_PROVIDER` env var so a reader can follow the adapter pattern.',
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 2 — apps/science-advantage/docs/ai-image-generation.md line 9
// ---------------------------------------------------------------------------

describe('Phase 9 — Task 2: ai-image-generation.md references the adapter', () => {
  it('ai-image-generation.md exists at the expected path', () => {
    expect(() => readFileSync(IMAGE_DOC_PATH, 'utf8')).not.toThrow();
  });

  it('ai-image-generation.md line 9 (model-config bullet) references the @reading-advantage/ai package', () => {
    const lines = readFileSync(IMAGE_DOC_PATH, 'utf8').split('\n');
    // Plan §FR-7 task 2 names line 9 explicitly. Index 8 (0-based).
    expect(
      lines.length,
      'ai-image-generation.md should have at least 9 lines.',
    ).toBeGreaterThanOrEqual(9);
    const line9 = lines[8];
    expect(
      line9,
      'ai-image-generation.md line 9 must reference the @reading-advantage/ai ' +
        'package so a reader knows where the model / fallback configuration ' +
        'is sourced from.',
    ).toMatch(/@reading-advantage\/ai/);
  });

  it('ai-image-generation.md line 9 mentions the in-app config object or the shared entry point', () => {
    const lines = readFileSync(IMAGE_DOC_PATH, 'utf8').split('\n');
    const line9 = lines[8];
    // Either the in-app `aiImageConfig` (the existing local config
    // the route uses) or the shared `getAIClient` / `createAIClient`
    // must be named so a reader can find where the values live. This
    // pins the doc to the post-Phase-9 architecture rather than a
    // bare model-id table.
    const mentionsEntryPoint =
      /aiImageConfig/.test(line9) ||
      /getAIClient\s*\(/.test(line9) ||
      /createAIClient\s*\(/.test(line9);
    expect(
      mentionsEntryPoint,
      'ai-image-generation.md line 9 must name `aiImageConfig`, `getAIClient()`, ' +
        'or `createAIClient()` so the source of the model / fallback config is clear.',
    ).toBe(true);
  });
});
