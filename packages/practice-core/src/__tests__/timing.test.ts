import { describe, it, expect } from 'vitest';
import {
  createTimingAccumulator,
  DEFAULT_IDLE_THRESHOLD_MS,
  type TimingEvent,
} from '../practice/timing.js';

describe('TimingAccumulator (package)', () => {
  function interaction(offsetMs: number): TimingEvent {
    return { type: 'interaction', timestamp: 1000 + offsetMs };
  }

  describe('initial state', () => {
    it('creates accumulator with zeroed values', () => {
      const acc = createTimingAccumulator();
      const snap = acc.getSnapshot();
      expect(snap.wallClockMs).toBe(0);
      expect(snap.activeMs).toBe(0);
      expect(snap.idleMs).toBe(0);
      expect(snap.confidence).toBe('high');
    });

    it('uses default idle threshold of 30 seconds', () => {
      const acc = createTimingAccumulator();
      expect(acc.getIdleThresholdMs()).toBe(DEFAULT_IDLE_THRESHOLD_MS);
    });

    it('accepts custom idle threshold', () => {
      const acc = createTimingAccumulator({ idleThresholdMs: 60000 });
      expect(acc.getIdleThresholdMs()).toBe(60000);
    });
  });

  describe('start', () => {
    it('sets startedAt on start', () => {
      const acc = createTimingAccumulator();
      acc.start(5000);
      expect(acc.getSnapshot().startedAt).toBe('1970-01-01T00:00:05.000Z');
    });

    it('transitions state to active', () => {
      const acc = createTimingAccumulator();
      acc.start(5000);
      expect(acc.isActive()).toBe(true);
    });
  });

  describe('wall-clock and active time accumulation', () => {
    it('accumulates wall-clock time on each event', () => {
      const acc = createTimingAccumulator();
      acc.start(1000);
      acc.addEvent(interaction(1000));
      acc.addEvent(interaction(2000));
      acc.addEvent(interaction(3000));
      const snap = acc.getSnapshot();
      expect(snap.wallClockMs).toBe(3000);
    });

    it('accumulates active time for interaction events', () => {
      const acc = createTimingAccumulator();
      acc.start(1000);
      acc.addEvent(interaction(1000));
      acc.addEvent(interaction(2000));
      const snap = acc.getSnapshot();
      expect(snap.activeMs).toBe(2000);
    });
  });

  describe('finalize', () => {
    it('finalize returns timing summary', () => {
      const acc = createTimingAccumulator({ idleThresholdMs: 30000 });
      acc.start(1000);
      acc.addEvent(interaction(1000));
      acc.addEvent(interaction(5000));
      const summary = acc.finalize(10000);
      expect(summary.startedAt).toBe('1970-01-01T00:00:01.000Z');
      expect(summary.submittedAt).toBe('1970-01-01T00:00:10.000Z');
      expect(summary.wallClockMs).toBe(9000);
      expect(summary.confidence).toBe('high');
    });

    it('finalize throws if not started', () => {
      const acc = createTimingAccumulator();
      expect(() => acc.finalize(10000)).toThrow('Cannot finalize before start');
    });
  });

  describe('reset', () => {
    it('reset clears all state', () => {
      const acc = createTimingAccumulator();
      acc.start(1000);
      acc.addEvent(interaction(1000));
      acc.reset();
      const snap = acc.getSnapshot();
      expect(snap.wallClockMs).toBe(0);
      expect(snap.activeMs).toBe(0);
      expect(snap.startedAt).toBeNull();
      expect(snap.confidence).toBe('high');
    });
  });
});