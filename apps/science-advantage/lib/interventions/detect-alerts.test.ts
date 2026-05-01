import { describe, it, expect } from 'vitest';

import { detectAlerts } from './detect-alerts';
import { interventionConfig } from './config';
import type { MasteryRecord } from './detect-alerts';

describe('detectAlerts', () => {
  const classMeta = {
    id: 'class-1',
    name: 'Science 301',
  };

  const now = new Date('2025-02-01T00:00:00.000Z');

  function makeRecord({
    studentId,
    code,
    masteryLevel,
    daysAgo,
  }: {
    studentId: string;
    code: string;
    masteryLevel: number;
    daysAgo: number;
  }): MasteryRecord {
    return {
      studentId,
      masteryLevel: masteryLevel as unknown as MasteryRecord['masteryLevel'],
      lastAssessedAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
      standard: {
        code,
        description: `${code} description`,
      },
    };
  }

  it('scores and sorts alerts by severity and score', () => {
    const students = [
      { id: 'stu-1', name: 'Ada Lovelace', gradeLevel: 5 },
      { id: 'stu-2', name: 'Grace Hopper', gradeLevel: 6 },
      { id: 'stu-3', name: 'Alan Turing', gradeLevel: 5 },
    ];

    const masteryRecords = [
      makeRecord({ studentId: 'stu-1', code: 'Sc1.1', masteryLevel: 0.35, daysAgo: 3 }),
      makeRecord({ studentId: 'stu-1', code: 'Sc1.2', masteryLevel: 0.32, daysAgo: 10 }),
      makeRecord({ studentId: 'stu-1', code: 'Sc1.3', masteryLevel: 0.45, daysAgo: 12 }),
      makeRecord({ studentId: 'stu-2', code: 'Sc2.1', masteryLevel: 0.55, daysAgo: 5 }),
      makeRecord({ studentId: 'stu-2', code: 'Sc2.2', masteryLevel: 0.42, daysAgo: 5 }),
      makeRecord({ studentId: 'stu-3', code: 'Sc3.1', masteryLevel: 0.75, daysAgo: 18 }),
    ];

    const { alerts } = detectAlerts({
      classMeta,
      students,
      masteryRecords,
      now,
      maxAlerts: 10,
    });

    expect(alerts).toHaveLength(2);
    expect(alerts[0].studentId).toBe('stu-1'); // critical
    expect(alerts[1].studentId).toBe('stu-2'); // warning
    expect(alerts[0].alertSeverity).toBe('critical');
    expect(alerts[1].alertSeverity).toBe('warning');
    expect(alerts[0].weakStandardCount).toBe(3);
    expect(alerts[0].avgWeakMastery).toBeCloseTo(0.37, 2);
  });

  it('flags stale mastery as critical when assessments are old', () => {
    const students = [{ id: 'stu-4', name: 'Katherine Johnson', gradeLevel: 6 }];
    const masteryRecords = [
      makeRecord({ studentId: 'stu-4', code: 'Sc4.1', masteryLevel: 0.48, daysAgo: 20 }),
    ];

    const { alerts } = detectAlerts({
      classMeta,
      students,
      masteryRecords,
      now,
      maxAlerts: 10,
    });

    expect(alerts).toHaveLength(1);
    expect(alerts[0].alertSeverity).toBe('critical');
    expect(alerts[0].lastAssessmentAgeDays).toBeGreaterThanOrEqual(
      interventionConfig.thresholds.critical.stalenessDays ?? 0
    );
  });

  it('respects max alerts limit', () => {
    const students = Array.from({ length: 30 }).map((_, idx) => ({
      id: `stu-${idx}`,
      name: `Student ${idx}`,
      gradeLevel: 5,
    }));

    const masteryRecords = students.flatMap((student, idx) => [
      makeRecord({
        studentId: student.id,
        code: `Sc${idx}.1`,
        masteryLevel: 0.45,
        daysAgo: 1,
      }),
      makeRecord({
        studentId: student.id,
        code: `Sc${idx}.2`,
        masteryLevel: 0.4,
        daysAgo: 2,
      }),
    ]);

    const { alerts } = detectAlerts({
      classMeta,
      students,
      masteryRecords,
      now,
      maxAlerts: 5,
    });

    expect(alerts).toHaveLength(5);
  });

  it('returns empty list when there are no weak mastery rows', () => {
    const students = [{ id: 'stu-100', name: 'On Track', gradeLevel: 5 }];
    const masteryRecords = [
      makeRecord({ studentId: 'stu-100', code: 'ScX.1', masteryLevel: 0.8, daysAgo: 1 }),
    ];

    const { alerts } = detectAlerts({
      classMeta,
      students,
      masteryRecords,
      now,
    });

    expect(alerts).toEqual([]);
  });
});
