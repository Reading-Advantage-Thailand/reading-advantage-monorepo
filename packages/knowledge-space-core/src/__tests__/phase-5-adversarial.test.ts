/**
 * Phase 5 — Adversarial tests: Docs, Audit & Doctor
 *
 * Covers final-regression probes:
 *   1. Boundary-violation test — core stays dependency-free
 *   2. Export-completeness — every symbol re-exported from index.ts resolves
 *   3. Doc-correctness — projection-audit.md contains no placeholder language
 *
 * These are Phase 5 final regression gates per test-strategy.md §5.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execSync } from 'node:child_process';

// ---------------------------------------------------------------------------
// Boundary-violation test (future-proofing)
// ---------------------------------------------------------------------------

const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /from\s+['"]\s*apps\//, label: 'apps/' },
  { pattern: /from\s+['"]\s*convex\/(_generated)?/, label: 'convex/' },
  {
    pattern: /from\s+['"]\s*@math-platform\/knowledge-space-practice/,
    label: '@reading-advantage/knowledge-space-practice',
  },
  {
    pattern: /from\s+['"]\s*packages\/knowledge-space-practice\//,
    label: 'packages/knowledge-space-practice/',
  },
  {
    pattern: /from\s+['"]\s*\.\.\/knowledge-space-practice/,
    label: 'relative import into knowledge-space-practice',
  },
];

const PACKAGE_SRC = resolve(__dirname, '..');

function collectSourceTsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry === '__tests__') continue;
      files.push(...collectSourceTsFiles(fullPath));
    } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('Phase 5 — adversarial: boundary future-proofing', () => {
  it('no source file under knowledge-space-core/src imports from apps/, convex/, or knowledge-space-practice/', () => {
    const sourceFiles = collectSourceTsFiles(PACKAGE_SRC);
    const violations: string[] = [];

    for (const filePath of sourceFiles) {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        for (const { pattern, label } of FORBIDDEN_PATTERNS) {
          if (pattern.test(lines[i])) {
            violations.push(
              `${filePath.replace(PACKAGE_SRC + '/', '')}:${i + 1} — forbidden import from ${label}: ${lines[i].trim()}`,
            );
          }
        }
      }
    }

    expect(
      violations,
      `Boundary violations found:\n${violations.join('\n')}`,
    ).toHaveLength(0);
  });

  it('boundary linter script exits 0 against current codebase', () => {
    // Run the monorepo boundary linter. Exit 0 means clean; any non-zero
    // status would indicate a boundary violation from a future edit.
    const scriptPath = resolve(__dirname, '../../../../scripts/check-monorepo-boundaries.mjs');
    const result = execSync(`node ${scriptPath}`, {
      encoding: 'utf-8',
      cwd: resolve(__dirname, '../../..'),
    });
    expect(result).toContain('[OK] No monorepo boundary violations found.');
  });

  it('boundary linter excludes test files (__tests__) from its scan', () => {
    // verify the linter's exclusion is working — grep for test-dir patterns
    // that should NOT trigger the linter
    const scriptContent = readFileSync(
      resolve(__dirname, '../../../../scripts/check-monorepo-boundaries.mjs'),
      'utf-8',
    );
    expect(scriptContent).toContain('--exclude-dir');
    expect(scriptContent).toContain('__tests__');
  });
});

// ---------------------------------------------------------------------------
// Export-completeness — every symbol from index.ts resolves
// ---------------------------------------------------------------------------

describe('Phase 5 — adversarial: export-completeness', () => {
  it('all value exports from knowledge-space-core index.ts resolve at runtime', async () => {
    // Import all value-level exports (functions, classes, objects, schemas).
    // If any export is missing from its source module, the import will fail
    // at resolve-time, causing this test to fail.
    const mod = (await import('../index')) as Record<string, unknown>;

    // Phase 1-3 value exports (non-type)
    const valueExports = [
      // mastery-state
      'MASTERY_THRESHOLDS_DEFAULT',
      'masteryThresholdsSchema',
      'knowledgeStateEntrySchema',
      // knowledge-state-engine
      'getKnowledgeState',
      'stabilityToRetention',
      'determineState',
      // outer-fringe
      'getOuterFringe',
      // srs-bridge
      'DefaultSrsToKstBridge',
      'buildKstState',
      // pre-existing (not from this track)
      'knowledgeSpaceSchema',
      'CORE_ID_PATTERN',
      'knowledgeStateSchema',
      'displayLevelItemSchema',
      'displayLevelSchema',
      'projectDisplayLevel',
      'computeNodeState',
      'masterySnapshotSchema',
      'progressTrendHistorySchema',
      'validateKnowledgeSpace',
      'getDanglingEdges',
      'getDuplicateNodeIds',
      'getDuplicateEdges',
      'getNodesMissingRequiredAlignments',
      'getIndependentPracticeNodesMissingGenerators',
      'getInvalidEdgePairings',
      'validateNodeMetadataWithAdapter',
      'getPrerequisiteCycles',
      'syntheticMathFixture',
      'syntheticEnglishGseFixture',
      'suggestEdges',
      'placementResultSchema',
      'placementResultsSchema',
      'isPlacementResult',
      'PROBE_RESULTS',
      'probeResultSchema',
      'runPlacementTraversal',
      'findCrossCourseEquivalences',
      'validateCrossCourseEdges',
      'computeEquivalenceComponents',
    ];

    const missing: string[] = [];
    for (const name of valueExports) {
      if (!(name in mod)) {
        missing.push(name);
      }
    }

    expect(missing, `Missing value exports from index.ts: ${missing.join(', ')}`).toHaveLength(0);
  });

  it('DefaultSrsToKstBridge is constructable', async () => {
    // Verify the class export is not just a type — it can be instantiated.
    const mod = await import('../srs-bridge');
    const bridge = new mod.DefaultSrsToKstBridge();
    expect(bridge).toBeDefined();
    expect(typeof bridge.convert).toBe('function');
  });

  it('getKnowledgeState is callable and returns a Map', async () => {
    const mod = await import('../index');
    const result = mod.getKnowledgeState(
      { id: 'test' },
      [],
      { nodes: [], edges: [] },
      Date.now(),
    );
    expect(result).toBeInstanceOf(Map);
  });

  it('getOuterFringe is callable and returns an array', async () => {
    const mod = await import('../index');
    const result = mod.getOuterFringe(
      new Map(),
      { nodes: [], edges: [] },
    );
    expect(Array.isArray(result)).toBe(true);
  });

  it('buildKstState is callable and returns state + fringe', async () => {
    const mod = await import('../index');
    const result = mod.buildKstState(
      [],
      [],
      { nodes: [], edges: [] },
      Date.now(),
    );
    expect(result).toHaveProperty('state');
    expect(result).toHaveProperty('fringe');
    expect(result.state).toBeInstanceOf(Map);
    expect(Array.isArray(result.fringe)).toBe(true);
  });

  it('every type-only export has a corresponding source declaration (no broken re-exports)', () => {
    // Verify the index.ts file itself parses cleanly — all `export type` and
    // `export { ... } from './module'` lines reference modules that exist.
    const indexPath = resolve(__dirname, '../index.ts');
    const content = readFileSync(indexPath, 'utf-8');

    // Extract all "from '...'" module specifiers
    const fromPattern = /from\s+['"](\.[^'"]+)['"]/g;
    let match: RegExpExecArray | null;
    const modules = new Set<string>();
    while ((match = fromPattern.exec(content)) !== null) {
      modules.add(match[1]);
    }

    const missing: string[] = [];
    for (const modPath of modules) {
      const absolute = resolve(__dirname, '..', modPath + '.ts');
      try {
        statSync(absolute);
      } catch {
        missing.push(`${modPath} (expected at ${absolute})`);
      }
    }

    expect(missing, `Broken module references in index.ts: ${missing.join(', ')}`).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Doc-correctness — projection-audit.md is no longer a placeholder
// ---------------------------------------------------------------------------

describe('Phase 5 — adversarial: doc-correctness', () => {
  it('knowledge-space-practice-projection-audit.md does not contain "placeholder" language', () => {
    const auditPath = resolve(
      __dirname,
      '../../../../measure/knowledge-space-practice-projection-audit.md',
    );
    const content = readFileSync(auditPath, 'utf-8');

    // The doc must not describe itself as a placeholder
    expect(content).not.toMatch(/placeholder/i);
  });

  it('knowledge-space-practice-projection-audit.md does not contain "not wired" language', () => {
    const auditPath = resolve(
      __dirname,
      '../../../../measure/knowledge-space-practice-projection-audit.md',
    );
    const content = readFileSync(auditPath, 'utf-8');

    // The doc must not claim the pipeline is "not wired"
    expect(content).not.toMatch(/not wired/i);
  });

  it('knowledge-space-practice-projection-audit.md mentions Wired Math (IM3) status', () => {
    const auditPath = resolve(
      __dirname,
      '../../../../measure/knowledge-space-practice-projection-audit.md',
    );
    const content = readFileSync(auditPath, 'utf-8');

    // Must have a Math (IM3) row showing Wired status
    expect(content).toMatch(/Math \(IM3\).*Wired/);
  });

  it('knowledge-space-practice-projection-audit.md references the production route', () => {
    const auditPath = resolve(
      __dirname,
      '../../../../measure/knowledge-space-practice-projection-audit.md',
    );
    const content = readFileSync(auditPath, 'utf-8');

    // Must mention the wired production route
    expect(content).toMatch(/student\/knowledge-state/);
  });

  it('knowledge-space-practice-projection-audit.md lists outstanding future-track items', () => {
    const auditPath = resolve(
      __dirname,
      '../../../../measure/knowledge-space-practice-projection-audit.md',
    );
    const content = readFileSync(auditPath, 'utf-8');

    // Must acknowledge future work (not overclaim completion)
    expect(content).toMatch(/Track 2/);
    expect(content).toMatch(/weighted readiness/i);
  });
});
