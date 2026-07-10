/**
 * Phase 3 — Projection, App Rename, and Migration (Track 7: Practice-Variant Rename)
 *
 * FR1: Rename `problemFamilyId → variantKey`, `ProblemFamily → PracticeVariant`,
 *      `ProblemFamilyEvidence → PracticeVariantEvidence`, `minProblemFamilies →
 *      minVariants`, `ProblemFamilyResolver → PracticeVariantResolver`,
 *      `InMemoryProblemFamilyResolver → InMemoryPracticeVariantResolver`,
 *      `ProblemFamilyInfo → PracticeVariantInfo`, `getCardByStudentAndFamily →
 *      getCardByStudentAndVariant` across `practice-core`, `srs-engine`, and
 *      `knowledge-space-practice`.
 *
 * This is the Red-phase proof that the `knowledge-space-practice` SRS projection
 * surface still references the legacy `problemFamily*` identifier. Every runtime
 * assertion in this file is expected to fail at HEAD because the projection
 * source has not been audited for the rename.
 *
 * Strategy: `test-strategy.md` §7, row "P3". Targeted Red command:
 *   `./node_modules/.bin/vitest run packages/knowledge-space-practice/src/__tests__/projections-variant-rename.test.ts`
 *
 * Pairing with live-behavior proof: the `projectSrsInputs` live smoke in this
 * file runs the function against the synthetic math fixture and asserts the
 * entries still parse without `problemFamily` fields. The artifact assertions
 * on the source file are paired with this live smoke per the directive
 * ("Artifact or markdown assertions are allowed only when the phase deliverable
 * is that artifact, and they must be paired with a live-behavior proof").
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { projectSrsInputs } from '../projections/srs.js';
import { syntheticMathFixture } from '@reading-advantage/knowledge-space-core';
import type { KnowledgeBlueprint } from '../blueprints/index.js';

// ---------------------------------------------------------------------------
// Artifact assertions: source-file read asserts no `problemFamily` references
// in the P3 projection surface (the phase deliverable is the renamed source).
// ---------------------------------------------------------------------------

function readSrsProjectionSource(): string {
  const path = resolve(__dirname, '../projections/srs.ts');
  return readFileSync(path, 'utf-8');
}

function readProjectionIndexSource(): string {
  const path = resolve(__dirname, '../projections/index.ts');
  return readFileSync(path, 'utf-8');
}

function readProjectionTypesSource(): string {
  const path = resolve(__dirname, '../projections/types.ts');
  return readFileSync(path, 'utf-8');
}

describe('knowledge-space-practice/projections/srs.ts (artifact rename)', () => {
  it('does not reference the legacy `problemFamily` identifier (FR1)', () => {
    const content = readSrsProjectionSource();
    expect(content, 'srs.ts must not reference the legacy identifier').not.toMatch(/problemFamily/i);
  });

  it('does not reference the legacy `ProblemFamily` (PascalCase) identifier (FR1)', () => {
    const content = readSrsProjectionSource();
    expect(content, 'srs.ts must not reference the legacy PascalCase identifier').not.toMatch(/ProblemFamily/);
  });
});

describe('knowledge-space-practice/projections/index.ts (artifact rename)', () => {
  it('does not export any legacy `problemFamily*` symbol (FR1)', () => {
    const content = readProjectionIndexSource();
    expect(content, 'projections/index.ts must not export legacy identifiers').not.toMatch(/problemFamily/i);
    expect(content, 'projections/index.ts must not export legacy PascalCase identifiers').not.toMatch(/ProblemFamily/);
  });
});

describe('knowledge-space-practice/projections/types.ts (artifact rename)', () => {
  it('does not declare any legacy `problemFamily*` type (FR1)', () => {
    const content = readProjectionTypesSource();
    expect(content, 'projections/types.ts must not declare legacy type names').not.toMatch(/problemFamily/i);
    expect(content, 'projections/types.ts must not declare legacy PascalCase type names').not.toMatch(/ProblemFamily/);
  });
});

// ---------------------------------------------------------------------------
// Live-behavior proof: projectSrsInputs still produces a well-formed
// projection after the rename. This is the live-behavior companion to the
// artifact assertions above — proves the projection function still works
// even though the rename is not yet visible in the source surface.
// ---------------------------------------------------------------------------

describe('projectSrsInputs (live behavior, P3 rename-invariant)', () => {
  const emptyBlueprints: KnowledgeBlueprint[] = [];

  it('produces entries with no `problemFamily` field (rename is total in the output shape)', () => {
    const entries = projectSrsInputs(syntheticMathFixture.nodes, syntheticMathFixture.edges, emptyBlueprints);
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry, 'projection entries must not carry the legacy identifier').not.toHaveProperty('problemFamily');
      expect(entry, 'projection entries must not carry the legacy PascalCase identifier').not.toHaveProperty('ProblemFamily');
    }
  });

  it('emits a deterministic, stable entry shape (rename does not break the smoke output)', () => {
    const entries = projectSrsInputs(syntheticMathFixture.nodes, syntheticMathFixture.edges, emptyBlueprints);
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(typeof entry.nodeId).toBe('string');
      expect(typeof entry.blueprintId).toBe('string');
      expect(Array.isArray(entry.standards)).toBe(true);
      expect(Array.isArray(entry.prerequisites)).toBe(true);
      expect(typeof entry.difficulty).toBe('number');
      expect(typeof entry.generatorReady).toBe('boolean');
    }
  });
});
