import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Phase 1 — Documentation reconciliation (Red)
// ---------------------------------------------------------------------------

const MEASURE_DIR = resolve(__dirname, '../../../../measure');
const KNOWLEDGE_SPACE_MD = resolve(MEASURE_DIR, 'knowledge-space.md');
const INDEX_MD = resolve(MEASURE_DIR, 'index.md');

describe('docs reconciliation', () => {
  it('measure/knowledge-space.md points at the canonical v2 SPECIFICATION.md', () => {
    const content = readFileSync(KNOWLEDGE_SPACE_MD, 'utf-8');
    const hasCanonicalPointer =
      /kst-srs\.v2\/SPECIFICATION\.md/.test(content) ||
      /packages\/knowledge-space-core\/SPECIFICATION\.md/.test(content);
    expect(hasCanonicalPointer).toBe(true);
  });

  it('measure/index.md contains a Knowledge Space Contract row', () => {
    const content = readFileSync(INDEX_MD, 'utf-8');
    expect(content).toMatch(/Knowledge Space Contract/);
    expect(content).toMatch(/SPECIFICATION\.md/);
  });

  it('measure/knowledge-space.md no longer claims to be the source of truth for KST theory', () => {
    const content = readFileSync(KNOWLEDGE_SPACE_MD, 'utf-8');
    expect(content.toLowerCase()).not.toMatch(/source of truth/);
  });
});
