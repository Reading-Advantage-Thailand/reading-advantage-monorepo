import { describe, expect, it } from 'vitest';
import {
  createTimingAccumulator,
  TimingAccumulator,
  type TimingEventType,
} from '../practice/timing.js';
import { practiceTimingSummarySchema } from '../practice/contract.js';

function run(events: Array<[TimingEventType, number]>, threshold?: number): TimingAccumulator {
  const acc = createTimingAccumulator(threshold === undefined ? {} : { idleThresholdMs: threshold });
  acc.start(0);
  for (const [type, timestamp] of events) acc.addEvent({ type, timestamp });
  return acc;
}

describe('TimingAccumulator before start', () => {
  it('ignores events before start', () => {
    const acc = createTimingAccumulator();
    acc.addEvent({ type: 'interaction', timestamp: 5000 });
    const snap = acc.getSnapshot();
    expect(snap.wallClockMs).toBe(0);
    expect(snap.activeMs).toBe(0);
    expect(snap.isActive).toBe(false);
    expect(acc.isActive()).toBe(false);
  });

  it('ignores events after reset until the next start', () => {
    const acc = run([['interaction', 1000]]);
    acc.reset();
    acc.addEvent({ type: 'interaction', timestamp: 2000 });
    expect(acc.getSnapshot().wallClockMs).toBe(0);
    expect(acc.isActive()).toBe(false);
  });
});

describe('TimingAccumulator interaction gaps', () => {
  it('counts a gap equal to the threshold as active time', () => {
    const snap = run([['interaction', 30000]]).getSnapshot();
    expect(snap.activeMs).toBe(30000);
    expect(snap.idleMs).toBe(0);
    expect(snap.confidence).toBe('high');
    expect(snap.confidenceReasons).toEqual([]);
  });

  it('counts the excess of a long gap as idle and drops to medium', () => {
    const snap = run([['interaction', 40000]]).getSnapshot();
    expect(snap.activeMs).toBe(0);
    expect(snap.idleMs).toBe(10000);
    expect(snap.longestIdleMs).toBe(40000);
    expect(snap.confidence).toBe('medium');
    expect(snap.confidenceReasons).toEqual(['long_idle']);
  });

  it('drops to low when the longest idle exceeds twice the threshold', () => {
    const snap = run([['interaction', 70000]]).getSnapshot();
    expect(snap.idleMs).toBe(40000);
    expect(snap.confidence).toBe('low');
  });

  it('keeps medium at exactly twice the threshold', () => {
    const snap = run([['interaction', 60000]]).getSnapshot();
    expect(snap.longestIdleMs).toBe(60000);
    expect(snap.confidence).toBe('medium');
  });

  it('records long_idle once across many long gaps', () => {
    const snap = run([
      ['interaction', 40000],
      ['interaction', 80000],
    ]).getSnapshot();
    expect(snap.idleMs).toBe(20000);
    expect(snap.confidenceReasons).toEqual(['long_idle']);
  });

  it('treats a zero threshold as every gap idle', () => {
    const acc = run([['interaction', 1000]], 0);
    expect(acc.getIdleThresholdMs()).toBe(0);
    const snap = acc.getSnapshot();
    expect(snap.activeMs).toBe(0);
    expect(snap.idleMs).toBe(1000);
    expect(snap.confidence).toBe('low');
  });

  it('counts a same-timestamp event as zero time', () => {
    const snap = run([
      ['interaction', 0],
      ['interaction', 0],
    ]).getSnapshot();
    expect(snap.wallClockMs).toBe(0);
    expect(snap.activeMs).toBe(0);
  });
});

describe('TimingAccumulator idle events', () => {
  it('closes an idle period longer than the threshold on interaction', () => {
    const snap = run([
      ['interaction', 1000],
      ['idle', 2000],
      ['idle', 3000],
      ['interaction', 40000],
    ]).getSnapshot();
    expect(snap.activeMs).toBe(1000);
    expect(snap.idleMs).toBe(8000);
    expect(snap.longestIdleMs).toBe(38000);
    expect(snap.confidenceReasons).toEqual(['long_idle']);
  });

  it('records a short idle period without idle time or reason', () => {
    const snap = run([
      ['interaction', 1000],
      ['idle', 2000],
      ['interaction', 10000],
    ]).getSnapshot();
    expect(snap.idleMs).toBe(0);
    expect(snap.longestIdleMs).toBe(8000);
    expect(snap.confidenceReasons).toEqual([]);
    expect(snap.confidence).toBe('high');
  });

  it('resumes active counting after the idle period closes', () => {
    const snap = run([
      ['idle', 1000],
      ['interaction', 5000],
      ['interaction', 6000],
    ]).getSnapshot();
    expect(snap.activeMs).toBe(1000);
  });
});

describe('TimingAccumulator pause and resume', () => {
  it('counts one pause for repeated pause events and skips paused time', () => {
    const snap = run([
      ['interaction', 1000],
      ['pause', 2000],
      ['pause', 3000],
      ['interaction', 5000],
      ['resume', 8000],
      ['interaction', 9000],
    ]).getSnapshot();
    expect(snap.pauseCount).toBe(1);
    expect(snap.isPaused).toBe(false);
    expect(snap.activeMs).toBe(2000);
    expect(snap.wallClockMs).toBe(9000);
  });

  it('ignores resume when not paused', () => {
    const snap = run([
      ['interaction', 1000],
      ['resume', 5000],
      ['interaction', 6000],
    ]).getSnapshot();
    expect(snap.activeMs).toBe(6000);
  });

  it('counts a second pause after a resume', () => {
    const snap = run([
      ['pause', 1000],
      ['resume', 2000],
      ['pause', 3000],
    ]).getSnapshot();
    expect(snap.pauseCount).toBe(2);
    expect(snap.isPaused).toBe(true);
  });

  it('adds no active time on finalize while paused', () => {
    const acc = run([
      ['interaction', 1000],
      ['pause', 2000],
    ]);
    const summary = acc.finalize(10000);
    expect(summary.wallClockMs).toBe(10000);
    expect(summary.activeMs).toBe(1000);
  });
});

describe('TimingAccumulator blur and focus', () => {
  it('banks active time on blur and flags a long focus loss', () => {
    const snap = run([
      ['interaction', 5000],
      ['blur', 7000],
      ['focus', 20000],
      ['interaction', 21000],
    ]).getSnapshot();
    expect(snap.focusLossCount).toBe(1);
    expect(snap.activeMs).toBe(8000);
    expect(snap.confidence).toBe('medium');
    expect(snap.confidenceReasons).toEqual(['focus_loss']);
  });

  it('drops to medium on a short focus loss without a reason', () => {
    const snap = run([
      ['blur', 1000],
      ['focus', 2000],
    ]).getSnapshot();
    expect(snap.confidence).toBe('medium');
    expect(snap.confidenceReasons).toEqual([]);
  });

  it('keeps no reason for a focus loss of exactly 10 seconds', () => {
    const snap = run([
      ['blur', 1000],
      ['focus', 11000],
    ]).getSnapshot();
    expect(snap.confidenceReasons).toEqual([]);
  });

  it('drops to low after more than three focus losses', () => {
    const events: Array<[TimingEventType, number]> = [];
    for (let i = 0; i < 4; i++) {
      events.push(['blur', i * 1000 + 100], ['focus', i * 1000 + 200]);
    }
    expect(run(events).getSnapshot().confidence).toBe('low');
  });

  it('keeps medium at exactly three focus losses', () => {
    const events: Array<[TimingEventType, number]> = [];
    for (let i = 0; i < 3; i++) {
      events.push(['blur', i * 1000 + 100], ['focus', i * 1000 + 200]);
    }
    expect(run(events).getSnapshot().confidence).toBe('medium');
  });

  it('counts blur idle when the gap exceeds the threshold', () => {
    const snap = run([['blur', 40000]]).getSnapshot();
    expect(snap.idleMs).toBe(10000);
    expect(snap.activeMs).toBe(0);
  });

  it.fails('records the same longestIdleMs for a gap closed by blur as by interaction', () => {
    const viaInteraction = run([['interaction', 40000]]).getSnapshot();
    const viaBlur = run([['blur', 40000]]).getSnapshot();
    expect(viaBlur.longestIdleMs).toBe(viaInteraction.longestIdleMs);
  });

  it('counts focus loss while paused without active time', () => {
    const snap = run([
      ['pause', 1000],
      ['blur', 5000],
      ['focus', 6000],
    ]).getSnapshot();
    expect(snap.focusLossCount).toBe(1);
    expect(snap.activeMs).toBe(0);
  });

  it('ignores focus without a prior blur', () => {
    const snap = run([['focus', 1000]]).getSnapshot();
    expect(snap.focusLossCount).toBe(0);
    expect(snap.confidence).toBe('high');
  });
});

describe('TimingAccumulator visibility', () => {
  it('drops to low when hidden for 60 seconds or more', () => {
    const snap = run([
      ['interaction', 1000],
      ['visibility_hidden', 2000],
      ['visibility_visible', 62000],
    ]).getSnapshot();
    expect(snap.visibilityHiddenCount).toBe(1);
    expect(snap.activeMs).toBe(2000);
    expect(snap.confidence).toBe('low');
    expect(snap.confidenceReasons).toEqual(['visibility_hidden']);
  });

  it('drops to medium when hidden for more than 10 seconds and under 60', () => {
    const snap = run([
      ['visibility_hidden', 1000],
      ['visibility_visible', 60999],
    ]).getSnapshot();
    expect(snap.confidence).toBe('medium');
    expect(snap.confidenceReasons).toEqual(['visibility_hidden']);
  });

  it('keeps no reason when hidden for exactly 10 seconds', () => {
    const snap = run([
      ['visibility_hidden', 1000],
      ['visibility_visible', 11000],
    ]).getSnapshot();
    expect(snap.confidenceReasons).toEqual([]);
    expect(snap.confidence).toBe('medium');
  });

  it('counts hidden idle when the gap exceeds the threshold', () => {
    const snap = run([['visibility_hidden', 45000]]).getSnapshot();
    expect(snap.idleMs).toBe(15000);
    expect(snap.longestIdleMs).toBe(15000);
  });

  it('clears the hidden period on an interaction while hidden', () => {
    const snap = run([
      ['visibility_hidden', 2000],
      ['interaction', 3000],
      ['visibility_visible', 80000],
    ]).getSnapshot();
    expect(snap.activeMs).toBe(2000);
    expect(snap.confidenceReasons).toEqual([]);
  });

  it('counts hidden events while paused without active time', () => {
    const snap = run([
      ['pause', 0],
      ['visibility_hidden', 5000],
      ['visibility_visible', 6000],
    ]).getSnapshot();
    expect(snap.visibilityHiddenCount).toBe(1);
    expect(snap.activeMs).toBe(0);
  });
});

describe('TimingAccumulator pagehide', () => {
  it('marks a short session interrupted with low confidence', () => {
    const acc = run([
      ['interaction', 10000],
      ['pagehide', 20000],
    ]);
    const snap = acc.getSnapshot();
    expect(snap.isInterrupted).toBe(true);
    expect(snap.isActive).toBe(false);
    expect(acc.isActive()).toBe(false);
    expect(snap.activeMs).toBe(20000);
    expect(snap.wallClockMs).toBe(20000);
    expect(snap.confidence).toBe('low');
    expect(snap.confidenceReasons).toEqual(['interrupted']);
  });

  it('drops a long session to medium on pagehide', () => {
    const snap = run([
      ['interaction', 20000],
      ['pagehide', 40000],
    ]).getSnapshot();
    expect(snap.confidence).toBe('medium');
  });

  it('adds no time on finalize after pagehide', () => {
    const acc = run([
      ['interaction', 10000],
      ['pagehide', 20000],
    ]);
    const summary = acc.finalize(50000);
    expect(summary.wallClockMs).toBe(20000);
    expect(summary.activeMs).toBe(20000);
    expect(summary.submittedAt).toBe('1970-01-01T00:00:50.000Z');
    expect(summary.confidenceReasons).toEqual(['interrupted']);
  });
});

describe('TimingAccumulator finalize', () => {
  it('omits confidenceReasons when there are none', () => {
    const summary = run([['interaction', 1000]]).finalize(2000);
    expect(summary.confidenceReasons).toBeUndefined();
    expect(summary.activeMs).toBe(2000);
    expect(summary.longestIdleMs).toBe(0);
  });

  it('marks the accumulator inactive after finalize', () => {
    const acc = run([['interaction', 1000]]);
    acc.finalize(2000);
    expect(acc.isActive()).toBe(false);
  });

  it('does not add time again on a second finalize', () => {
    const acc = run([['interaction', 1000]]);
    const first = acc.finalize(2000);
    const second = acc.finalize(9000);
    expect(second.wallClockMs).toBe(first.wallClockMs);
    expect(second.activeMs).toBe(first.activeMs);
    expect(second.submittedAt).toBe('1970-01-01T00:00:09.000Z');
  });

  it('ignores a submit time before the last event', () => {
    const summary = run([['interaction', 5000]]).finalize(1000);
    expect(summary.wallClockMs).toBe(5000);
    expect(summary.activeMs).toBe(5000);
  });

  it('formats timestamps across a UTC day boundary', () => {
    const acc = createTimingAccumulator();
    const start = Date.UTC(2026, 10, 3, 23, 59, 59, 999);
    acc.start(start);
    const summary = acc.finalize(start + 2);
    expect(summary.startedAt).toBe('2026-11-03T23:59:59.999Z');
    expect(summary.submittedAt).toBe('2026-11-04T00:00:00.001Z');
    expect(summary.wallClockMs).toBe(2);
  });

  it('returns a snapshot copy of confidence reasons', () => {
    const acc = run([['interaction', 40000]]);
    acc.getSnapshot().confidenceReasons.push('tampered');
    expect(acc.getSnapshot().confidenceReasons).toEqual(['long_idle']);
  });

  it('emits a summary that passes the contract schema', () => {
    const summary = run([
      ['interaction', 1000],
      ['blur', 2000],
      ['focus', 15000],
      ['interaction', 16000],
    ]).finalize(20000);
    expect(practiceTimingSummarySchema.safeParse(summary).success).toBe(true);
  });

  it.fails('keeps active plus idle within wall-clock when an idle period is open at finalize', () => {
    const summary = run([
      ['interaction', 1000],
      ['idle', 2000],
    ]).finalize(100000);
    expect(summary.activeMs + summary.idleMs).toBeLessThanOrEqual(summary.wallClockMs);
  });
});
