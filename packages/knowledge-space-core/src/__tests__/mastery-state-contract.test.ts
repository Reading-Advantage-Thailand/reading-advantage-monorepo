import { describe, it, expect } from 'vitest';
import {
  MASTERY_THRESHOLDS_DEFAULT,
  masteryThresholdsSchema,
  knowledgeStateEntrySchema,
} from '../index.js';
import type {
  MasteryThresholds,
  MasteryState,
  KnowledgeStateEntry,
  ReadinessState,
} from '../index.js';

// ---------------------------------------------------------------------------
// Phase 1 — Mastery state contract (Red)
// ---------------------------------------------------------------------------

function assertNever(value: never): never {
  throw new Error(`Unexpected mastery state: ${String(value)}`);
}

describe('mastery-state contract', () => {
  it('exports the default thresholds with labeled values', () => {
    expect(MASTERY_THRESHOLDS_DEFAULT).toEqual({
      masteryEnter: 0.9,
      masteryExit: 0.7,
      readyThreshold: 0.8,
      nearThreshold: 0.5,
      hardGateThreshold: 1,
      trendThreshold: 3,
    });
  });

  it('exports a frozen / readonly default threshold object', () => {
    expect(typeof MASTERY_THRESHOLDS_DEFAULT).toBe('object');
    expect(MASTERY_THRESHOLDS_DEFAULT).not.toBeNull();
    expect(Object.isFrozen(MASTERY_THRESHOLDS_DEFAULT)).toBe(true);
  });

  it('MasteryState union is exactly the four spec states', () => {
    // Guard against a missing export; the real assertion is the exhaustiveness check.
    expect(MASTERY_THRESHOLDS_DEFAULT).toBeDefined();

    // Runtime exhaustiveness check; if a fifth state becomes assignable,
    // the switch default arm stops compiling.
    function label(state: MasteryState): string {
      switch (state) {
        case 'mastered':
          return 'mastered';
        case 'decaying':
          return 'decaying';
        case 'inProgress':
          return 'inProgress';
        case 'untouched':
          return 'untouched';
        default:
          return assertNever(state);
      }
    }

    const all: MasteryState[] = ['mastered', 'decaying', 'inProgress', 'untouched'];
    for (const state of all) {
      expect(label(state)).toBe(state);
    }
  });

  it('masteryThresholdsSchema parses the default thresholds', () => {
    expect(masteryThresholdsSchema).toBeDefined();
    const parsed = masteryThresholdsSchema.parse(MASTERY_THRESHOLDS_DEFAULT);
    expect(parsed).toEqual(MASTERY_THRESHOLDS_DEFAULT);
  });

  it('masteryThresholdsSchema rejects out-of-range values', () => {
    expect(masteryThresholdsSchema).toBeDefined();
    expect(() =>
      masteryThresholdsSchema.parse({
        ...MASTERY_THRESHOLDS_DEFAULT,
        masteryEnter: 1.2,
      }),
    ).toThrow();
  });

  it('masteryThresholdsSchema rejects partial threshold objects', () => {
    expect(masteryThresholdsSchema).toBeDefined();
    expect(() =>
      masteryThresholdsSchema.parse({ masteryEnter: 0.9 }),
    ).toThrow();
  });

  it('masteryThresholdsSchema rejects extra keys when strict', () => {
    expect(masteryThresholdsSchema).toBeDefined();
    expect(() =>
      masteryThresholdsSchema.parse({
        ...MASTERY_THRESHOLDS_DEFAULT,
        extraKey: 1,
      }),
    ).toThrow();
  });

  it('knowledgeStateEntrySchema parses a valid entry', () => {
    expect(knowledgeStateEntrySchema).toBeDefined();
    const entry: KnowledgeStateEntry = {
      nodeId: 'math.im3.skill.test',
      mastery: 0.85,
      retention: 0.95,
      isProficient: true,
      state: 'mastered',
    };
    expect(knowledgeStateEntrySchema.parse(entry)).toEqual(entry);
  });

  it('knowledgeStateEntrySchema rejects invalid mastery', () => {
    expect(knowledgeStateEntrySchema).toBeDefined();
    expect(() =>
      knowledgeStateEntrySchema.parse({
        nodeId: 'math.im3.skill.test',
        mastery: 1.5,
        retention: 0.95,
        isProficient: true,
        state: 'mastered',
      }),
    ).toThrow();
  });

  it('knowledgeStateEntrySchema rejects invalid retention', () => {
    expect(knowledgeStateEntrySchema).toBeDefined();
    expect(() =>
      knowledgeStateEntrySchema.parse({
        nodeId: 'math.im3.skill.test',
        mastery: 0.85,
        retention: -0.1,
        isProficient: true,
        state: 'mastered',
      }),
    ).toThrow();
  });

  it('knowledgeStateEntrySchema rejects unknown state strings', () => {
    expect(knowledgeStateEntrySchema).toBeDefined();
    expect(() =>
      knowledgeStateEntrySchema.parse({
        nodeId: 'math.im3.skill.test',
        mastery: 0.85,
        retention: 0.95,
        isProficient: true,
        state: 'unknown',
      }),
    ).toThrow();
  });

  it('knowledgeStateEntrySchema rejects missing nodeId', () => {
    expect(knowledgeStateEntrySchema).toBeDefined();
    expect(() =>
      knowledgeStateEntrySchema.parse({
        mastery: 0.85,
        retention: 0.95,
        isProficient: true,
        state: 'mastered',
      }),
    ).toThrow();
  });

  it('MasteryThresholds is typed for optional configuration', () => {
    expect(MASTERY_THRESHOLDS_DEFAULT).toBeDefined();
    const partial: Partial<MasteryThresholds> = { masteryEnter: 0.95 };
    expect(partial.masteryEnter).toBe(0.95);
  });
});

// ---------------------------------------------------------------------------
// Phase 1 Track 2 — Weighted Readiness contract (Red)
// ---------------------------------------------------------------------------

describe('Weighted Readiness — Phase 1 contract', () => {
  it('ReadinessState is exported as a type union', () => {
    // Compile-time: ReadinessState should be assignable from 'ready'
    const r: ReadinessState = 'ready';
    expect(r).toBe('ready');
    const nr: ReadinessState = 'nearly_ready';
    expect(nr).toBe('nearly_ready');
    const b: ReadinessState = 'blocked';
    expect(b).toBe('blocked');
  });

  it('ReadinessState is distinct from MasteryState (no conflated unions)', () => {
    // ReadinessState is 'ready'|'nearly_ready'|'blocked'
    // MasteryState is 'mastered'|'decaying'|'inProgress'|'untouched'
    // These are purpose-distinct per anti-pattern A6
    const r: ReadinessState = 'ready';
    // Cannot assign MasteryState value to ReadinessState at type level:
    // const m: ReadinessState = 'mastered'; // would be type error
    expect(typeof r).toBe('string');
  });

  it('KnowledgeStateEntry has optional readinessScore and readinessState fields', () => {
    // Create an entry WITH the new fields
    const entryWithReadiness: KnowledgeStateEntry = {
      nodeId: 'skill.a',
      mastery: 0.6,
      retention: 0.7,
      isProficient: false,
      state: 'inProgress',
      readinessScore: 0.55,
      readinessState: 'nearly_ready',
    };
    expect(entryWithReadiness.readinessScore).toBe(0.55);
    expect(entryWithReadiness.readinessState).toBe('nearly_ready');

    // Create an entry WITHOUT the new fields (they are optional)
    const entryWithout: KnowledgeStateEntry = {
      nodeId: 'skill.b',
      mastery: 0.95,
      retention: 0.96,
      isProficient: true,
      state: 'mastered',
    };
    expect(entryWithout.readinessScore).toBeUndefined();
    expect(entryWithout.readinessState).toBeUndefined();
  });

  it('knowledgeStateEntrySchema accepts optional readiness fields', () => {
    const entry = {
      nodeId: 'skill.a',
      mastery: 0.6,
      retention: 0.7,
      isProficient: false,
      state: 'inProgress' as const,
      readinessScore: 0.55,
      readinessState: 'nearly_ready' as const,
    };
    const parsed = knowledgeStateEntrySchema.parse(entry);
    expect(parsed.readinessScore).toBe(0.55);
    expect(parsed.readinessState).toBe('nearly_ready');
  });

  it('knowledgeStateEntrySchema accepts entries without readiness fields (backward compat)', () => {
    const entry = {
      nodeId: 'skill.b',
      mastery: 0.95,
      retention: 0.96,
      isProficient: true,
      state: 'mastered' as const,
    };
    const parsed = knowledgeStateEntrySchema.parse(entry);
    expect(parsed.readinessScore).toBeUndefined();
    expect(parsed.readinessState).toBeUndefined();
  });
});
