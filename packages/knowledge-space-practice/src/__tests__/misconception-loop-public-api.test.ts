import { describe, expect, it } from 'vitest';
import * as rootExports from '@reading-advantage/knowledge-space-practice';
import * as subpathExports from '@reading-advantage/knowledge-space-practice/misconception-loop';

const expectedRuntimeExports = [
  'misconceptionSeveritySchema',
  'misconceptionLifecycleStatusSchema',
  'studentMisconceptionStateSchema',
  'getMisconceptionSeverity',
] as const;

describe('Misconception loop — public API contract', () => {
  it('re-exports Phase 1 runtime surface from the package root', () => {
    for (const name of expectedRuntimeExports) {
      expect((rootExports as Record<string, unknown>)[name], name).toBeDefined();
    }
  });

  it('exports Phase 1 runtime surface from the documented misconception-loop subpath', () => {
    for (const name of expectedRuntimeExports) {
      expect((subpathExports as Record<string, unknown>)[name], name).toBeDefined();
    }
  });

  it('resolves severity consistently through root and subpath imports', () => {
    expect(rootExports.getMisconceptionSeverity({ severity: 'severe' })).toBe('severe');
    expect(subpathExports.getMisconceptionSeverity({ severity: 'severe' })).toBe('severe');
    expect(rootExports.getMisconceptionSeverity({ severity: 'SEVERE' })).toBe('minor');
    expect(subpathExports.getMisconceptionSeverity({ severity: 'SEVERE' })).toBe('minor');
  });
});
