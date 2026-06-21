import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '../..');

describe('Phase 10: Closeout artifacts', () => {
  it('marks F-902 through F-906 as Resolved in measure/tech-debt.md', () => {
    const techDebtPath = path.join(repoRoot, 'measure/tech-debt.md');
    const techDebt = fs.readFileSync(techDebtPath, 'utf8');

    for (const findingId of ['F-902', 'F-903', 'F-904', 'F-905', 'F-906']) {
      const row = techDebt
        .split('\n')
        .find((line) => line.includes(findingId) && /\bResolved\b/.test(line));
      expect(
        row,
        `expected ${findingId} to be marked Resolved in ${techDebtPath}`,
      ).toBeDefined();
    }
  });

  it('records the observability stack lessons-learned entry', () => {
    const lessonsPath = path.join(repoRoot, 'measure/lessons-learned.md');
    const lessons = fs.readFileSync(lessonsPath, 'utf8');

    expect(lessons).toContain('observability_stack_20260603');
    expect(lessons).toContain(
      'AsyncLocalStorage + Sentry + OTel is the right observability stack',
    );
  });

  it('archives the track directory and removes it from active tracks.md', () => {
    const tracksPath = path.join(repoRoot, 'measure/tracks.md');
    const tracks = fs.readFileSync(tracksPath, 'utf8');
    const archivePath = path.join(
      repoRoot,
      'measure/archive/observability_stack_20260603/plan.md',
    );

    expect(
      fs.existsSync(archivePath),
      `expected archived plan to exist at ${archivePath}`,
    ).toBe(true);

    const activeSection = tracks.split('## Archived Tracks')[0] ?? tracks;
    expect(
      activeSection,
      'expected observability_stack_20260603 to no longer appear in the active section of tracks.md',
    ).not.toContain('observability_stack_20260603');
  });
});
