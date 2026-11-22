import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '../..');

describe('Phase 10: Closeout artifacts', () => {
  // The F-902..F-906 tech-debt rows assertion was removed on 2026-11-22.
  // measure/tech-debt.md is curated to a 50-line cap, so those rows were
  // condensed away by later tracks. The lessons entry assertion below
  // reads current content and stays.

  it('records the observability stack lessons-learned entry', () => {
    const lessonsPath = path.join(repoRoot, 'measure/lessons-learned.md');
    const lessons = fs.readFileSync(lessonsPath, 'utf8');

    expect(lessons).toContain('observability_stack_20260603');
    expect(lessons).toContain(
      'AsyncLocalStorage + Sentry + OTel is the right observability stack',
    );
  });

  // The "reopened track" assertion was removed on 2026-11-22. The track
  // status is a later Measure decision: it now reads "parked" after the
  // 2026-10-26 parking decision, not the 2026-06-23 "reopened" state.
});
