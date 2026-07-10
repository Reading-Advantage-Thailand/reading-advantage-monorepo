import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Task 6.4 — EDGE_ENDPOINT_RULES must have one canonical source
// ---------------------------------------------------------------------------
//
// The endpoint-pairing rules currently exist as two independent literals:
// one in schemas.ts and one in validation.ts. This test fails while more than
// one source file in the package defines `const EDGE_ENDPOINT_RULES`, and
// passes once the rules live in a single canonical module imported by both
// consumers.

const SRC_DIR = resolve(__dirname, '..');

/**
 * Recursively collect all non-test TypeScript source files.
 * @param {string} dir - Directory to scan
 * @returns {string[]} Absolute paths to source .ts files
 */
function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry === '__tests__') continue;
      files.push(...collectSourceFiles(fullPath));
    } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Check whether a source file contains a `const EDGE_ENDPOINT_RULES` definition.
 * @param {string} filePath - Absolute path to a source file
 * @returns {boolean} True if the file defines the constant
 */
function definesEndpointRules(filePath: string): boolean {
  const content = readFileSync(filePath, 'utf-8');
  return /^\s*const\s+EDGE_ENDPOINT_RULES\s*[:=]/m.test(content);
}

/**
 * Check whether a source file references EDGE_ENDPOINT_RULES in any way.
 * @param {string} filePath - Absolute path to a source file
 * @returns {boolean} True if the file contains the token
 */
function referencesEndpointRules(filePath: string): boolean {
  const content = readFileSync(filePath, 'utf-8');
  return /EDGE_ENDPOINT_RULES/.test(content);
}

describe('EDGE_ENDPOINT_RULES — single canonical source', () => {
  it('defines EDGE_ENDPOINT_RULES in at most one source file', () => {
    const sourceFiles = collectSourceFiles(SRC_DIR);
    const definers = sourceFiles.filter(definesEndpointRules);
    expect(
      definers.length,
      `EDGE_ENDPOINT_RULES must have a single canonical source; found definitions in:\n${
        definers.map((f) => `  ${f.replace(SRC_DIR + '/', '')}`).join('\n') || '  (none)'
      }`,
    ).toBeLessThanOrEqual(1);
  });

  it('schemas.ts and validation.ts both consume EDGE_ENDPOINT_RULES', () => {
    const schemasPath = resolve(SRC_DIR, 'schemas.ts');
    const validationPath = resolve(SRC_DIR, 'validation.ts');
    expect(referencesEndpointRules(schemasPath), 'schemas.ts must reference EDGE_ENDPOINT_RULES').toBe(true);
    expect(referencesEndpointRules(validationPath), 'validation.ts must reference EDGE_ENDPOINT_RULES').toBe(true);
  });
});
