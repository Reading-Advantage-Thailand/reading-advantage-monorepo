import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Forbidden import patterns for knowledge-space-core
// Core packages must not import from apps, Convex generated, or domain content
// ---------------------------------------------------------------------------

const FORBIDDEN_IMPORT_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /from\s+['"]\s*apps\//, label: 'apps/' },
  { pattern: /from\s+['"]\s*convex\/_generated/, label: 'convex/_generated/' },
  { pattern: /from\s+['"]\s*@math-platform\/math-content/, label: '@math-platform/math-content' },
  { pattern: /from\s+['"]\s*packages\/math-content/, label: 'packages/math-content/' },
  { pattern: /from\s+['"]\s*\.\.\/math-content/, label: 'relative to math-content package' },
];

/**
 * Check source code for forbidden import patterns.
 * @param {string} source - The source code string to scan
 * @returns {Array<{ line: string; label: string }>} - Array of violations with the offending line and rule label
 */
function checkImports(source: string): Array<{ line: string; label: string }> {
  const violations: Array<{ line: string; label: string }> = [];
  const lines = source.split('\n');
  for (const line of lines) {
    for (const { pattern, label } of FORBIDDEN_IMPORT_PATTERNS) {
      if (pattern.test(line)) {
        violations.push({ line: line.trim(), label });
      }
    }
  }
  return violations;
}

const PACKAGE_SRC = resolve(__dirname, '..');

/**
 * Recursively collect all non-test TypeScript files from a directory.
 * @param {string} dir - The directory to scan
 * @returns {string[]} - Array of absolute file paths to .ts files (excluding test files)
 */
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

describe('boundary — no forbidden imports', () => {
  it('knowledge-space-core must not import from apps/, convex/_generated/, or domain content packages', () => {
    const sourceFiles = collectTsFiles(PACKAGE_SRC);
    const violations: Array<{ file: string; line: number; match: string; label: string }> = [];

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
          .map((v) => `  ${v.file}:${v.line} — forbidden import from ${v.label}\n    ${v.match}`)
          .join('\n\n')}`,
      );
    }

    expect(violations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Task 4.2 — Boundary lint fixture test
// ---------------------------------------------------------------------------

describe('boundary lint — detects violations', () => {
  it('catches imports from apps/', () => {
    const badCode = `import { foo } from 'apps/something';`;
    expect(checkImports(badCode)).toHaveLength(1);
  });

  it('catches imports from convex/_generated/', () => {
    const badCode = `import type { Doc } from "convex/_generated/dataModel";`;
    expect(checkImports(badCode)).toHaveLength(1);
  });

  it('catches imports from @math-platform/math-content', () => {
    const badCode = `import { glossary } from '@math-platform/math-content';`;
    expect(checkImports(badCode)).toHaveLength(1);
  });

  it('catches relative imports to packages/math-content', () => {
    const badCode = `import { foo } from 'packages/math-content/src/glossary';`;
    expect(checkImports(badCode)).toHaveLength(1);
  });

  it('does not flag allowed imports', () => {
    const goodCode = `import { z } from 'zod';
import type { NodeKind } from './types';
import { knowledgeSpaceSchema } from '../schemas.js';`;
    expect(checkImports(goodCode)).toHaveLength(0);
  });

  it('does not flag comments mentioning forbidden paths', () => {
    const comment = `// This package must not import from apps/ or convex/_generated/`;
    expect(checkImports(comment)).toHaveLength(0);
  });
});

