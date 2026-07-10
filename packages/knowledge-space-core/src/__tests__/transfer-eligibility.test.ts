import { describe, it, expect } from 'vitest';
import {
  isTransferEligible,
  flagTransferEligible,
  TRANSFER_ELIGIBILITY_DEFAULT,
  transferEligibilitySchema,
} from '../transfer-eligibility.js';
import type {
  TransferEligibilityConfig,
  TransferEligibleSkill,
} from '../transfer-eligibility.js';
import type { EquivalenceComponent } from '../cross-course-equivalence.js';
import type { KnowledgeStateEntry } from '../mastery-state.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function courseFromId(nodeId: string): string {
  return nodeId.split('.').slice(0, 2).join('.');
}

function makeComponent(
  componentId: string,
  nodeIds: string[],
): EquivalenceComponent {
  const courses = [...new Set(nodeIds.map(courseFromId))].sort();
  return {
    componentId,
    nodeIds: [...nodeIds].sort(),
    courses,
    edges: [],
  };
}

function makeEntry(
  nodeId: string,
  mastery: number,
  retention: number,
  state: KnowledgeStateEntry['state'] = mastery >= 0.9 ? 'mastered' : 'inProgress',
): KnowledgeStateEntry {
  return {
    nodeId,
    mastery,
    retention,
    isProficient: mastery >= 0.9,
    state,
  };
}

function makeState(
  entries: Array<[string, number, number, KnowledgeStateEntry['state']?]> | KnowledgeStateEntry[],
): Map<string, KnowledgeStateEntry> {
  if (entries.length > 0 && Array.isArray(entries[0])) {
    return new Map(
      (entries as Array<[string, number, number, KnowledgeStateEntry['state']?]>).map(
        ([id, mastery, retention, state]) => [id, makeEntry(id, mastery, retention, state)],
      ),
    );
  }
  return new Map(
    (entries as KnowledgeStateEntry[]).map((entry) => [entry.nodeId, entry]),
  );
}

function sortBySkillId<T extends { skillId: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.skillId.localeCompare(b.skillId));
}

// ---------------------------------------------------------------------------
// isTransferEligible boundary
// ---------------------------------------------------------------------------

describe('isTransferEligible', () => {
  it('returns true when componentMastery is exactly the threshold (AD4)', () => {
    expect(isTransferEligible(0.75, 0.75)).toBe(true);
  });

  it('returns false when componentMastery is just below the threshold (AD4)', () => {
    expect(isTransferEligible(0.75 - 1e-9, 0.75)).toBe(false);
  });

  it('returns true when componentMastery is above the threshold', () => {
    expect(isTransferEligible(0.76, 0.75)).toBe(true);
  });

  it('returns false at zero mastery', () => {
    expect(isTransferEligible(0, 0.75)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Default eligibility config
// ---------------------------------------------------------------------------

describe('TRANSFER_ELIGIBILITY_DEFAULT', () => {
  it('is frozen (AD12)', () => {
    expect(Object.isFrozen(TRANSFER_ELIGIBILITY_DEFAULT)).toBe(true);
  });

  it('throws on mutation attempt because it is frozen', () => {
    expect(() => {
      (TRANSFER_ELIGIBILITY_DEFAULT as unknown as Record<string, unknown>).eligibilityThreshold = 0.99;
    }).toThrow();
  });

  it('exposes eligibilityThreshold and requireMinComponentSize', () => {
    expect(TRANSFER_ELIGIBILITY_DEFAULT.eligibilityThreshold).toBeGreaterThan(0);
    expect(TRANSFER_ELIGIBILITY_DEFAULT.eligibilityThreshold).toBeLessThanOrEqual(1);
    expect(TRANSFER_ELIGIBILITY_DEFAULT.requireMinComponentSize).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Eligibility schema
// ---------------------------------------------------------------------------

describe('transferEligibilitySchema', () => {
  it('accepts a valid full config', () => {
    const parsed = transferEligibilitySchema.parse({
      eligibilityThreshold: 0.75,
      requireMinComponentSize: 2,
    });
    expect(parsed.eligibilityThreshold).toBe(0.75);
    expect(parsed.requireMinComponentSize).toBe(2);
  });

  it('rejects extra keys (AD11)', () => {
    expect(() =>
      transferEligibilitySchema.parse({
        eligibilityThreshold: 0.75,
        requireMinComponentSize: 2,
        bogus: 1,
      }),
    ).toThrow();
  });

  it('rejects eligibilityThreshold outside [0,1]', () => {
    expect(() =>
      transferEligibilitySchema.parse({
        eligibilityThreshold: 1.1,
        requireMinComponentSize: 2,
      }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// flagTransferEligible — core behavior
// ---------------------------------------------------------------------------

describe('flagTransferEligible', () => {
  const twoCourseComponent = makeComponent('eq-001', [
    'math.im2.skill.solve-quadratic',
    'math.im3.skill.solve-quadratic',
  ]);

  it('returns an empty array for an empty candidate list', () => {
    const result = flagTransferEligible([], [twoCourseComponent], new Map());
    expect(result).toEqual([]);
  });

  it('returns unknown skill ids as not eligible and does not drop them (AD10)', () => {
    const result = flagTransferEligible(
      ['math.im1.skill.unknown'],
      [twoCourseComponent],
      new Map(),
    );
    expect(result).toHaveLength(1);
    expect(result[0].skillId).toBe('math.im1.skill.unknown');
    expect(result[0].eligible).toBe(false);
  });

  it('returns candidates sorted deterministically by skillId', () => {
    const result = flagTransferEligible(
      [
        'math.im3.skill.z-skill',
        'math.im3.skill.a-skill',
        'math.im1.skill.unknown',
      ],
      [twoCourseComponent],
      new Map(),
    );
    const sortedIds = result.map((r) => r.skillId);
    expect(sortedIds).toEqual([
      'math.im1.skill.unknown',
      'math.im3.skill.a-skill',
      'math.im3.skill.z-skill',
    ]);
  });

  it('flags a skill eligible when component mastery is at the threshold', () => {
    // Two-node component; average mastery = 0.75 exactly.
    const state = makeState([
      ['math.im2.skill.solve-quadratic', 0.75, 0.75],
      ['math.im3.skill.solve-quadratic', 0.75, 0.75],
    ]);
    const result = flagTransferEligible(
      ['math.im3.skill.solve-quadratic'],
      [twoCourseComponent],
      state,
      { eligibilityThreshold: 0.75 },
    );
    expect(result[0].eligible).toBe(true);
  });

  it('flags a skill not eligible when component mastery is below the threshold', () => {
    const state = makeState([
      ['math.im2.skill.solve-quadratic', 0.7, 0.7],
      ['math.im3.skill.solve-quadratic', 0.7, 0.7],
    ]);
    const result = flagTransferEligible(
      ['math.im3.skill.solve-quadratic'],
      [twoCourseComponent],
      state,
      { eligibilityThreshold: 0.75 },
    );
    expect(result[0].eligible).toBe(false);
  });

  it('flags a skill eligible and carries the cross-course source course', () => {
    const state = makeState([
      ['math.im2.skill.solve-quadratic', 0.95, 0.9],
      ['math.im3.skill.solve-quadratic', 0.0, 0.0],
    ]);
    const result = flagTransferEligible(
      ['math.im3.skill.solve-quadratic'],
      [twoCourseComponent],
      state,
    );
    expect(result[0].eligible).toBe(true);
    expect(result[0].sourceCourse).toBe('math.im2');
    expect(result[0].componentId).toBe('eq-001');
    expect(result[0].seededMastery).toBeDefined();
    expect(result[0].seededMastery).toBeGreaterThan(0);
  });

  it('does not flag a single-node component as eligible (AD5)', () => {
    const comp = makeComponent('eq-single', ['math.im3.skill.solve-quadratic']);
    const state = makeState([
      ['math.im3.skill.solve-quadratic', 0.95, 0.95],
    ]);
    const result = flagTransferEligible(
      ['math.im3.skill.solve-quadratic'],
      [comp],
      state,
    );
    expect(result[0].eligible).toBe(false);
  });

  it('honors requireMinComponentSize override', () => {
    const comp = makeComponent('eq-two', [
      'math.im2.skill.solve-quadratic',
      'math.im3.skill.solve-quadratic',
    ]);
    const state = makeState([
      ['math.im2.skill.solve-quadratic', 0.95, 0.95],
      ['math.im3.skill.solve-quadratic', 0.0, 0.0],
    ]);
    const result = flagTransferEligible(
      ['math.im3.skill.solve-quadratic'],
      [comp],
      state,
      { requireMinComponentSize: 3 },
    );
    expect(result[0].eligible).toBe(false);
  });

  it('does not flag an already-mastered target skill as eligible', () => {
    const state = makeState([
      ['math.im2.skill.solve-quadratic', 0.95, 0.95],
      ['math.im3.skill.solve-quadratic', 0.95, 0.95, 'mastered'],
    ]);
    const result = flagTransferEligible(
      ['math.im3.skill.solve-quadratic'],
      [twoCourseComponent],
      state,
    );
    expect(result[0].eligible).toBe(false);
  });

  it('returns not eligible when the component has no contributing evidence', () => {
    const comp = makeComponent('eq-no-evidence', [
      'math.im2.skill.solve-quadratic',
      'math.im3.skill.solve-quadratic',
    ]);
    const result = flagTransferEligible(
      ['math.im3.skill.solve-quadratic'],
      [comp],
      new Map(),
    );
    expect(result[0].eligible).toBe(false);
  });

  it('returns not eligible when components array is empty', () => {
    const state = makeState([
      ['math.im3.skill.solve-quadratic', 0.95, 0.95],
    ]);
    const result = flagTransferEligible(
      ['math.im3.skill.solve-quadratic'],
      [],
      state,
    );
    expect(result[0].eligible).toBe(false);
  });

  it('does not mutate input arguments', () => {
    const state = makeState([
      ['math.im2.skill.solve-quadratic', 0.95, 0.95],
      ['math.im3.skill.solve-quadratic', 0.0, 0.0],
    ]);
    const componentsSnapshot = JSON.stringify([twoCourseComponent]);
    const stateSnapshot = JSON.stringify(Array.from(state.entries()));
    const config: Partial<TransferEligibilityConfig> = { eligibilityThreshold: 0.6 };
    const configSnapshot = JSON.stringify(config);

    flagTransferEligible(
      ['math.im3.skill.solve-quadratic'],
      [twoCourseComponent],
      state,
      config,
    );

    expect(JSON.stringify([twoCourseComponent])).toBe(componentsSnapshot);
    expect(JSON.stringify(Array.from(state.entries()))).toBe(stateSnapshot);
    expect(JSON.stringify(config)).toBe(configSnapshot);
  });

  it('processes a mixed batch of eligible and ineligible skills', () => {
    const compA = makeComponent('eq-a', [
      'math.im2.skill.solve-quadratic',
      'math.im3.skill.solve-quadratic',
    ]);
    const compB = makeComponent('eq-b', [
      'math.im2.skill.factored-form',
      'math.im3.skill.factored-form',
    ]);
    const state = makeState([
      ['math.im2.skill.solve-quadratic', 0.95, 0.95],
      ['math.im3.skill.solve-quadratic', 0.0, 0.0],
      ['math.im2.skill.factored-form', 0.5, 0.5],
      ['math.im3.skill.factored-form', 0.0, 0.0],
    ]);

    const result = sortBySkillId(
      flagTransferEligible(
        [
          'math.im3.skill.solve-quadratic',
          'math.im3.skill.factored-form',
          'math.im1.skill.unknown',
        ],
        [compA, compB],
        state,
      ),
    );

    expect(result).toHaveLength(3);
    const eligible = result.find((r) => r.skillId === 'math.im3.skill.solve-quadratic');
    const ineligible = result.find((r) => r.skillId === 'math.im3.skill.factored-form');
    const unknown = result.find((r) => r.skillId === 'math.im1.skill.unknown');

    expect(eligible?.eligible).toBe(true);
    expect(ineligible?.eligible).toBe(false);
    expect(unknown?.eligible).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Compile-time type assertions
// ---------------------------------------------------------------------------

function _typeChecks() {
  const _config: TransferEligibilityConfig = TRANSFER_ELIGIBILITY_DEFAULT;
  const _eligible: TransferEligibleSkill | undefined = undefined;
  void _config;
  void _eligible;
}
void _typeChecks;
