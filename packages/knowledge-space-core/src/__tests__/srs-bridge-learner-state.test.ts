import { describe, expect, it } from 'vitest';
import {
  DefaultSrsToKstBridge,
  stabilityToRetention,
  type ObjectiveProficiencyResult,
  type SrsCardState,
} from '../srs-bridge.js';

const DAY_MS = 86_400_000;
const NOW = Date.UTC(2026, 10, 3);

function prof(overrides: Partial<ObjectiveProficiencyResult> = {}): ObjectiveProficiencyResult {
  return {
    objectiveId: 'o1',
    retentionStrength: 0.7,
    practiceCoverage: 1,
    isProficient: true,
    ...overrides,
  };
}

function build(cards: SrsCardState[], proficiencyResults: ObjectiveProficiencyResult[] = []) {
  return new DefaultSrsToKstBridge().buildLearnerState({ cards, proficiencyResults }, NOW);
}

describe('DefaultSrsToKstBridge.buildLearnerState', () => {
  it('returns no evidence for empty input and stamps generatedAt', () => {
    expect(build([])).toEqual({ evidence: [], generatedAt: NOW });
  });

  it('skips an objective whose only card has no reviews', () => {
    expect(build([{ cardId: 'c1', objectiveId: 'o1', reps: 0, state: 'new' }]).evidence).toEqual([]);
  });

  it('treats a card without reps but with lastReviewedAt as reviewed', () => {
    const [entry] = build([
      { cardId: 'c1', objectiveId: 'o1', stability: 5, lastReviewedAt: NOW - 5 * DAY_MS, state: 'review' },
    ]).evidence;
    expect(entry).toEqual({
      sourceId: 'o1',
      hasReviewHistory: true,
      stability: 5,
      lastReviewedAt: NOW - 5 * DAY_MS,
      retention: stabilityToRetention(5, 5),
      isProficient: true,
    });
  });

  it('derives isProficient from card state when there is no proficiency', () => {
    const [entry] = build([
      { cardId: 'c1', objectiveId: 'o1', reps: 2, stability: 3, lastReviewedAt: NOW, state: 'relearning' },
    ]).evidence;
    expect(entry.isProficient).toBe(false);
  });

  it('uses the minimum retention and the most recent card across variants', () => {
    const [entry] = build([
      { cardId: 'strong', objectiveId: 'o1', reps: 3, stability: 30, lastReviewedAt: NOW - DAY_MS },
      { cardId: 'weak', objectiveId: 'o1', reps: 1, stability: 2, lastReviewedAt: NOW - 10 * DAY_MS },
    ]).evidence;
    expect(entry.stability).toBe(30);
    expect(entry.lastReviewedAt).toBe(NOW - DAY_MS);
    expect(entry.retention).toBe(stabilityToRetention(2, 10));
  });

  it('keeps the first card when reviewed times tie', () => {
    const [entry] = build([
      { cardId: 'a', objectiveId: 'o1', reps: 1, stability: 4, lastReviewedAt: NOW },
      { cardId: 'b', objectiveId: 'o1', reps: 1, stability: 9, lastReviewedAt: NOW },
    ]).evidence;
    expect(entry.stability).toBe(4);
  });

  it('clamps a future review time to zero elapsed days', () => {
    const [entry] = build([
      { cardId: 'c1', objectiveId: 'o1', reps: 1, stability: 4, lastReviewedAt: NOW + DAY_MS },
    ]).evidence;
    expect(entry.retention).toBe(stabilityToRetention(4, 0));
  });

  it('uses proficiency retention and verdict when only proficiency exists', () => {
    const [entry] = build([], [prof({ retentionStrength: 0.42, isProficient: false })]).evidence;
    expect(entry).toEqual({
      sourceId: 'o1',
      hasReviewHistory: false,
      retention: 0.42,
      isProficient: false,
    });
  });

  it('uses the last proficiency result for an objective', () => {
    const [entry] = build([], [prof({ retentionStrength: 0.1 }), prof({ retentionStrength: 0.9 })]).evidence;
    expect(entry.retention).toBe(0.9);
  });

  it('prefers card retention and proficiency verdict when both exist', () => {
    const [entry] = build(
      [{ cardId: 'c1', objectiveId: 'o1', reps: 1, stability: 6, lastReviewedAt: NOW - 2 * DAY_MS, state: 'learning' }],
      [prof({ retentionStrength: 0.05, isProficient: true })],
    ).evidence;
    expect(entry.retention).toBe(stabilityToRetention(6, 2));
    expect(entry.isProficient).toBe(true);
  });

  it('falls back to proficiency retention when the reviewed card has no stability', () => {
    const [entry] = build(
      [{ cardId: 'c1', objectiveId: 'o1', reps: 1, lastReviewedAt: NOW }],
      [prof({ retentionStrength: 0.33 })],
    ).evidence;
    expect(entry.retention).toBe(0.33);
    expect(entry.stability).toBeUndefined();
  });

  it('emits one entry per objective in first-seen order', () => {
    const evidence = build(
      [
        { cardId: 'c2', objectiveId: 'o2', reps: 1, stability: 1, lastReviewedAt: NOW },
        { cardId: 'c1', objectiveId: 'o1', reps: 1, stability: 1, lastReviewedAt: NOW },
      ],
      [prof({ objectiveId: 'o3' })],
    ).evidence;
    expect(evidence.map((e) => e.sourceId)).toEqual(['o2', 'o1', 'o3']);
  });
});
