import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  MASTERY_THRESHOLDS_DEFAULT,
  getKnowledgeState,
  getOuterFringe,
} from '../index.js';
import type { SrsToKstBridge } from '../index.js';

// ---------------------------------------------------------------------------
// Phase 1 — Boundary: knowledge-space-core must stay dependency-free
// ---------------------------------------------------------------------------

// Force a runtime dependency on the new Phase 1 modules so this test file
// fails at collection time until the Green role creates the exports.
const _modulePins = {
  thresholds: MASTERY_THRESHOLDS_DEFAULT,
  engine: getKnowledgeState,
  fringe: getOuterFringe,
  bridge: null as unknown as SrsToKstBridge,
};

const FORBIDDEN_IMPORT_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
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

function collectTsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry === '__tests__') continue;
      files.push(...collectTsFiles(fullPath));
    } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('boundary — Phase 1 dependency-free surface', () => {
  it('no new file under knowledge-space-core/src imports from apps/, convex/, or knowledge-space-practice/', () => {
    // Verify the Phase 1 modules are wired before asserting their boundary cleanness.
    expect(_modulePins.thresholds).toBeDefined();
    expect(typeof _modulePins.engine).toBe('function');
    expect(typeof _modulePins.fringe).toBe('function');
    expect(_modulePins.bridge).toBeDefined();

    const sourceFiles = collectTsFiles(PACKAGE_SRC);
    const violations: Array<{
      file: string;
      line: number;
      match: string;
      label: string;
    }> = [];

    for (const filePath of sourceFiles) {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const { pattern, label } of FORBIDDEN_IMPORT_PATTERNS) {
          if (pattern.test(line)) {
            violations.push({
              file: filePath.replace(PACKAGE_SRC + '/', ''),
              line: i + 1,
              match: line.trim(),
              label,
            });
          }
        }
      }
    }

    if (violations.length > 0) {
      expect.fail(
        `Boundary violations found:\n${violations
          .map(
            (v) =>
              `  ${v.file}:${v.line} — forbidden import from ${v.label}\n    ${v.match}`,
          )
          .join('\n\n')}`,
      );
    }

    expect(violations).toHaveLength(0);
  });
});
