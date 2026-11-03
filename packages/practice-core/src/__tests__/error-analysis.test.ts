import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  aggregateMisconceptionTags,
  buildDeterministicSummary,
  buildStudentProfiles,
  buildTeacherErrorView,
  canTeacherAccessLessonSummary,
  canTeacherAccessSubmission,
  generateAISummary,
  summarizePartOutcomes,
  type AISummaryInput,
} from '../practice/error-analysis/index.js';
import {
  createMockPracticeEnvelope,
  createMockPracticeSubmissionPart,
} from '../practice/fixtures.js';

const part = createMockPracticeSubmissionPart;

function envelope(activityId: string, parts: ReturnType<typeof part>[], attemptNumber = 1) {
  return createMockPracticeEnvelope({
    activityId,
    attemptNumber,
    submittedAt: '2026-11-03T00:00:00.000Z',
    answers: { q1: 1 },
    parts,
  });
}

describe('canTeacherAccessSubmission', () => {
  it('denies a teacher from another org', () => {
    expect(canTeacherAccessSubmission('org-a', 'org-b', 't1')).toBe(false);
  });

  it('denies a different assigned teacher in the same org', () => {
    expect(canTeacherAccessSubmission('org-a', 'org-a', 't1', 't2')).toBe(false);
  });

  it('allows the assigned teacher in the same org', () => {
    expect(canTeacherAccessSubmission('org-a', 'org-a', 't1', 't1')).toBe(true);
  });

  it('allows any same-org teacher when no teacher is assigned', () => {
    expect(canTeacherAccessSubmission('org-a', 'org-a', 't1')).toBe(true);
  });

  it('treats an empty assigned teacher id as unassigned', () => {
    expect(canTeacherAccessSubmission('org-a', 'org-a', 't1', '')).toBe(true);
  });

  it('denies an org mismatch even when the teacher matches', () => {
    expect(canTeacherAccessSubmission('org-a', 'org-b', 't1', 't1')).toBe(false);
  });

  it('compares org ids by exact case', () => {
    expect(canTeacherAccessSubmission('Org-A', 'org-a', 't1')).toBe(false);
  });
});

describe('canTeacherAccessLessonSummary', () => {
  it('denies a teacher from another org', () => {
    expect(canTeacherAccessLessonSummary('org-a', 'org-b', 't1')).toBe(false);
  });

  it('denies a different assigned teacher', () => {
    expect(canTeacherAccessLessonSummary('org-a', 'org-a', 't1', 't2')).toBe(false);
  });

  it('allows the assigned teacher', () => {
    expect(canTeacherAccessLessonSummary('org-a', 'org-a', 't1', 't1')).toBe(true);
  });

  it('allows a same-org teacher when no teacher is assigned', () => {
    expect(canTeacherAccessLessonSummary('org-a', 'org-a', 't1', undefined)).toBe(true);
  });
});

describe('aggregateMisconceptionTags', () => {
  it('returns an empty list for no submissions', () => {
    expect(aggregateMisconceptionTags([])).toEqual([]);
  });

  it('returns an empty list when no part has tags', () => {
    expect(aggregateMisconceptionTags([envelope('a1', [part({ partId: 'p1' })])])).toEqual([]);
  });

  it('counts tags, dedupes parts and students, and sorts by count', () => {
    const subs = [
      envelope('a1', [
        part({ partId: 'p1', misconceptionTags: ['sign', 'order'] }),
        part({ partId: 'p2', misconceptionTags: ['sign'] }),
      ]),
      envelope('a2', [part({ partId: 'p1', misconceptionTags: ['sign'] })]),
    ];
    const map = new Map([
      ['a1', 's1'],
      ['a2', 's2'],
    ]);

    const result = aggregateMisconceptionTags(subs, map);

    expect(result).toEqual([
      { tag: 'sign', count: 3, affectedParts: ['p1', 'p2'], affectedStudents: ['s1', 's2'] },
      { tag: 'order', count: 1, affectedParts: ['p1'], affectedStudents: ['s1'] },
    ]);
  });

  it('falls back to activityId as the student id when no map is given', () => {
    const result = aggregateMisconceptionTags([
      envelope('a1', [part({ partId: 'p1', misconceptionTags: ['x'] })]),
    ]);
    expect(result[0].affectedStudents).toEqual(['a1']);
  });

  it('falls back to activityId when the map lacks the activity', () => {
    const result = aggregateMisconceptionTags(
      [envelope('a9', [part({ partId: 'p1', misconceptionTags: ['x'] })])],
      new Map([['a1', 's1']]),
    );
    expect(result[0].affectedStudents).toEqual(['a9']);
  });

  it('keeps first-seen order for tied counts', () => {
    const result = aggregateMisconceptionTags([
      envelope('a1', [part({ partId: 'p1', misconceptionTags: ['b', 'a', 'c'] })]),
    ]);
    expect(result.map((m) => m.tag)).toEqual(['b', 'a', 'c']);
  });

  it('counts a repeated tag on one part twice', () => {
    const result = aggregateMisconceptionTags([
      envelope('a1', [part({ partId: 'p1', misconceptionTags: ['x', 'x'] })]),
    ]);
    expect(result).toEqual([
      { tag: 'x', count: 2, affectedParts: ['p1'], affectedStudents: ['a1'] },
    ]);
  });
});

describe('summarizePartOutcomes', () => {
  it('returns an empty list for no submissions', () => {
    expect(summarizePartOutcomes([])).toEqual([]);
  });

  it('records a first correct attempt with accuracy 1', () => {
    const [summary] = summarizePartOutcomes([envelope('a1', [part({ partId: 'p1', isCorrect: true })])]);
    expect(summary).toEqual({
      partId: 'p1',
      totalAttempts: 1,
      correctCount: 1,
      incorrectCount: 0,
      accuracyRate: 1,
      commonMisconceptions: [],
    });
  });

  it('counts a part with undefined isCorrect as incorrect', () => {
    const [summary] = summarizePartOutcomes([envelope('a1', [part({ partId: 'p1' })])]);
    expect(summary.incorrectCount).toBe(1);
    expect(summary.accuracyRate).toBe(0);
  });

  it('accumulates attempts, accuracy, and misconceptions per part', () => {
    const map = new Map([
      ['a1', 's1'],
      ['a2', 's2'],
      ['a3', 's1'],
    ]);
    const result = summarizePartOutcomes(
      [
        envelope('a1', [part({ partId: 'p1', isCorrect: false, misconceptionTags: ['sign'] })]),
        envelope('a2', [part({ partId: 'p1', isCorrect: true })]),
        envelope('a3', [part({ partId: 'p1', isCorrect: false, misconceptionTags: ['sign', 'unit'] })]),
      ],
      map,
    );

    expect(result).toHaveLength(1);
    expect(result[0].totalAttempts).toBe(3);
    expect(result[0].correctCount).toBe(1);
    expect(result[0].incorrectCount).toBe(2);
    expect(result[0].accuracyRate).toBeCloseTo(1 / 3, 10);
    expect(result[0].commonMisconceptions).toEqual([
      { tag: 'sign', count: 2, affectedParts: ['p1'], affectedStudents: ['s1'] },
      { tag: 'unit', count: 1, affectedParts: ['p1'], affectedStudents: ['s1'] },
    ]);
  });

  it('keeps parts in first-seen order', () => {
    const result = summarizePartOutcomes([
      envelope('a1', [part({ partId: 'p2' }), part({ partId: 'p1' })]),
      envelope('a2', [part({ partId: 'p3' }), part({ partId: 'p2' })]),
    ]);
    expect(result.map((r) => r.partId)).toEqual(['p2', 'p1', 'p3']);
  });
});

describe('buildStudentProfiles', () => {
  it('returns an empty list for no submissions', () => {
    expect(buildStudentProfiles([])).toEqual([]);
  });

  it('builds one profile per submission with unique misconceptions', () => {
    const [profile] = buildStudentProfiles(
      [
        envelope(
          'a1',
          [
            part({ partId: 'p1', isCorrect: true }),
            part({ partId: 'p2', isCorrect: false, misconceptionTags: ['x', 'y'] }),
            part({ partId: 'p3', misconceptionTags: ['x'] }),
          ],
          2,
        ),
      ],
      new Map([['a1', 's1']]),
    );

    expect(profile).toEqual({
      studentId: 's1',
      submissionId: 'a1-2',
      activityId: 'a1',
      totalParts: 3,
      correctParts: 1,
      incorrectParts: 2,
      misconceptions: ['x', 'y'],
      submittedAt: '2026-11-03T00:00:00.000Z',
    });
  });

  it('reports zero parts for a submission with no parts', () => {
    const [profile] = buildStudentProfiles([envelope('a1', [])]);
    expect(profile.totalParts).toBe(0);
    expect(profile.correctParts).toBe(0);
    expect(profile.incorrectParts).toBe(0);
    expect(profile.misconceptions).toEqual([]);
  });
});

describe('buildDeterministicSummary', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns zero accuracy for no submissions', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-03T12:00:00.000Z'));
    const summary = buildDeterministicSummary('lesson-1', []);
    expect(summary).toEqual({
      type: 'deterministic',
      lessonId: 'lesson-1',
      generatedAt: Date.parse('2026-11-03T12:00:00.000Z'),
      partSummaries: [],
      topMisconceptions: [],
      studentCount: 0,
      averageAccuracy: 0,
    });
  });

  it('returns zero accuracy for submissions with no parts', () => {
    const summary = buildDeterministicSummary('lesson-1', [envelope('a1', [])]);
    expect(summary.averageAccuracy).toBe(0);
    expect(summary.studentCount).toBe(1);
  });

  it('computes accuracy over all part attempts', () => {
    const summary = buildDeterministicSummary('lesson-1', [
      envelope('a1', [part({ partId: 'p1', isCorrect: true }), part({ partId: 'p2', isCorrect: false })]),
      envelope('a2', [part({ partId: 'p1', isCorrect: true }), part({ partId: 'p2', isCorrect: true })]),
    ]);
    expect(summary.averageAccuracy).toBe(0.75);
    expect(summary.partSummaries).toHaveLength(2);
  });

  it('counts each submission as a student even for one activity', () => {
    const summary = buildDeterministicSummary('lesson-1', [
      envelope('a1', [part({ partId: 'p1' })], 1),
      envelope('a1', [part({ partId: 'p1' })], 2),
    ]);
    expect(summary.studentCount).toBe(2);
  });

  it('keeps only the top 10 misconceptions', () => {
    const tags = Array.from({ length: 12 }, (_, i) => `tag-${i}`);
    const summary = buildDeterministicSummary('lesson-1', [
      envelope('a1', [part({ partId: 'p1', misconceptionTags: tags })]),
    ]);
    expect(summary.topMisconceptions).toHaveLength(10);
    expect(summary.topMisconceptions.map((m) => m.tag)).toEqual(tags.slice(0, 10));
  });
});

describe('generateAISummary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function input(): AISummaryInput {
    const submission = envelope(
      'a1',
      [
        part({ partId: 'p1', isCorrect: true, score: 1, maxScore: 1 }),
        part({ partId: 'p2', isCorrect: false, misconceptionTags: ['sign', 'sign'] }),
      ],
      3,
    );
    return {
      submission,
      deterministicSummary: buildDeterministicSummary('lesson-1', [submission]),
      rawEvidence: { answers: { q1: 42 } },
    };
  }

  it('returns null without a provider', async () => {
    await expect(generateAISummary(input())).resolves.toBeNull();
  });

  it('builds a prompt with parts, tags, and accuracy', async () => {
    const provider = vi.fn(async () => 'a\nb\nc');
    await generateAISummary(input(), provider);
    const prompt = provider.mock.calls[0][0] as string;
    expect(prompt).toContain('Submission ID: a1-3');
    expect(prompt).toContain('Mode: independent_practice');
    expect(prompt).toContain('"q1": 42');
    expect(prompt).toContain('- p1: Correct (Score: 1/1)');
    expect(prompt).toContain('- p2: Incorrect (Score: N/A/N/A)');
    expect(prompt).toContain('Misconception Tags:\nsign, sign');
    expect(prompt).toContain('Class Average Accuracy: 50.0%');
  });

  it('writes None when no part has tags', async () => {
    const provider = vi.fn(async () => '');
    const base = input();
    const submission = envelope('a1', [part({ partId: 'p1', isCorrect: true })]);
    await generateAISummary({ ...base, submission }, provider);
    expect(provider.mock.calls[0][0]).toContain('Misconception Tags:\nNone');
  });

  it('maps the first three non-blank lines to the output fields', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-03T12:00:00.000Z'));
    const result = await generateAISummary(input(), async () => '\nMis\n   \nEvidence\nFix\nExtra');
    expect(result).toEqual({
      type: 'ai-assisted',
      likelyMisunderstanding: 'Mis',
      evidenceObserved: 'Evidence',
      suggestedIntervention: 'Fix',
      sourceSubmissionId: 'a1-3',
      sourceEvidence: { partIds: ['p1', 'p2'], misconceptionTags: ['sign'] },
      generatedAt: Date.parse('2026-11-03T12:00:00.000Z'),
    });
  });

  it('uses fallback text for an empty response', async () => {
    const result = await generateAISummary(input(), async () => '');
    expect(result?.likelyMisunderstanding).toBe('Unable to determine misunderstanding');
    expect(result?.evidenceObserved).toBe('No specific evidence identified');
    expect(result?.suggestedIntervention).toBe('Review with student individually');
  });

  it('returns null and logs when the provider rejects', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const result = await generateAISummary(input(), async () => {
      throw new Error('boom');
    });
    expect(result).toBeNull();
    expect(spy).toHaveBeenCalledWith('[error-analysis] generateAISummary failed:', expect.any(Error));
  });
});

describe('buildTeacherErrorView', () => {
  it('combines the submission with summaries and defaults aiSummary to null', () => {
    const submission = createMockPracticeEnvelope({
      activityId: 'a1',
      attemptNumber: 4,
      answers: { q1: 'x' },
      parts: [part({ partId: 'p1' })],
      artifact: { sheet: 1 },
    });
    const summary = buildDeterministicSummary('lesson-1', [submission]);

    const view = buildTeacherErrorView(submission, summary);

    expect(view.submissionId).toBe('a1-4');
    expect(view.studentId).toBe('a1');
    expect(view.activityId).toBe('a1');
    expect(view.deterministicSummary).toBe(summary);
    expect(view.aiSummary).toBeNull();
    expect(view.rawParts).toBe(submission.parts);
    expect(view.rawAnswers).toEqual({ q1: 'x' });
    expect(view.artifact).toEqual({ sheet: 1 });
  });
});
