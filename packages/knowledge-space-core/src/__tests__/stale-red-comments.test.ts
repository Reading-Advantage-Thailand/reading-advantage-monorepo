import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Task 6.7 — Detect stale Red-phase documentation in test file headers
// ---------------------------------------------------------------------------
//
// Several kst-lesser-holes test files were authored as Phase 1/2 Red tests and
// carry headers claiming the tests "currently fail", are "expected to FAIL",
// or mark the file as "Status: RED". The underlying functionality has since
// been implemented, so those headers are stale and misleading. This scan fails
// while any such phrase remains in a package test file.

const TESTS_DIR = resolve(__dirname);

const STALE_PHRASES: RegExp[] = [
  /Status:\s*RED/i,
  /expected\s+to\s+FAIL/i,
  /At\s+HEAD\s+.*\bmissing\b/i,
  /currently\s+fails?\s+because\s+the\s+implementation\s+does\s+not\s+yet/i,
  /currently\s+fails?\s+with\s+the\s+expected\s+contract-gap/i,
  /These\s+tests\s+are\s+Red:\s+each\s+currently\s+fails/i,
  /Phase\s+\d+\s+—\s+.*Red\s+tests?/i,
];

/**
 * Recursively collect all test files under the given directory.
 * Skips this detector file so its own meta-commentary is not self-flagged.
 * @param {string} dir - Directory to scan
 * @returns {string[]} Absolute paths to .test.ts files
 */
function collectTestFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...collectTestFiles(fullPath));
    } else if (entry.endsWith('.test.ts') && entry !== 'stale-red-comments.test.ts') {
      files.push(fullPath);
    }
  }
  return files;
}

describe('stale Red-phase comment scan', () => {
  it('has no stale Red-phase phrases in passing test files', () => {
    const testFiles = collectTestFiles(TESTS_DIR);
    const hits: Array<{ file: string; line: number; phrase: string; text: string }> = [];

    for (const filePath of testFiles) {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const phrase of STALE_PHRASES) {
          if (phrase.test(line)) {
            hits.push({
              file: filePath.replace(TESTS_DIR + '/', ''),
              line: i + 1,
              phrase: phrase.source,
              text: line.trim(),
            });
          }
        }
      }
    }

    expect(
      hits.length,
      `Stale Red-phase comments found in passing test files (remove or rewrite in Task 6.7):\n${
        hits.map((h) => `  ${h.file}:${h.line} — ${h.text}`).join('\n') || '  (none)'
      }`,
    ).toBe(0);
  });
});
