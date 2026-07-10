import { describe, it, expect } from 'vitest';
import {
  computeTransferCredit,
  batchComputeTransferCredit,
  TRANSFER_POLICY_DEFAULT,
  transferPolicySchema,
  seedTransferMastery,
  revertTransferMastery,
} from '../transfer-credit.js';
import type {
  TransferPolicy,
  ComponentMasteryResult,
} from '../transfer-credit.js';
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
): KnowledgeStateEntry {
  return {
    nodeId,
    mastery,
    retention,
    isProficient: mastery >= 0.9,
    state: mastery >= 0.9 ? 'mastered' : 'inProgress',
  };
}

function makeState(
  entries: Array<[string, number, number]>,
): Map<string, KnowledgeStateEntry> {
  return new Map(
    entries.map(([id, mastery, retention]) => [
      id,
      makeEntry(id, mastery, retention),
    ]),
  );
}

// ---------------------------------------------------------------------------
// Default policy
// ---------------------------------------------------------------------------

describe('TRANSFER_POLICY_DEFAULT', () => {
  it('is frozen (AD12)', () => {
    expect(Object.isFrozen(TRANSFER_POLICY_DEFAULT)).toBe(true);
  });

  it('throws on mutation attempt because it is frozen (AD12)', () => {
    expect(() => {
      (TRANSFER_POLICY_DEFAULT as unknown as Record<string, unknown>).confidenceDiscount = 0.99;
    }).toThrow();
  });

  it('has expected keys with values in valid ranges', () => {
    expect(TRANSFER_POLICY_DEFAULT.confidenceDiscount).toBeGreaterThan(0);
    expect(TRANSFER_POLICY_DEFAULT.confidenceDiscount).toBeLessThanOrEqual(1);
    expect(TRANSFER_POLICY_DEFAULT.maxSeededMastery).toBeGreaterThan(0);
    expect(TRANSFER_POLICY_DEFAULT.maxSeededMastery).toBeLessThan(1);
    expect(TRANSFER_POLICY_DEFAULT.minNodesForTransfer).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Policy schema
// ---------------------------------------------------------------------------

describe('transferPolicySchema', () => {
  it('accepts a valid full policy', () => {
    const parsed = transferPolicySchema.parse({
      confidenceDiscount: 0.8,
      maxSeededMastery: 0.85,
      minNodesForTransfer: 2,
    });
    expect(parsed.confidenceDiscount).toBe(0.8);
  });

  it('rejects extra keys (AD11)', () => {
    expect(() =>
      transferPolicySchema.parse({
        confidenceDiscount: 0.7,
        maxSeededMastery: 0.8,
        minNodesForTransfer: 2,
        bogus: 1,
      }),
    ).toThrow();
  });

  it('rejects maxSeededMastery at or above 1.0 (AD7)', () => {
    expect(() =>
      transferPolicySchema.parse({
        confidenceDiscount: 0.8,
        maxSeededMastery: 1.0,
        minNodesForTransfer: 2,
      }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Seed helper
// ---------------------------------------------------------------------------

describe('seedTransferMastery', () => {
  it('returns componentMastery scaled by confidenceDiscount', () => {
    const policy: TransferPolicy = {
      ...TRANSFER_POLICY_DEFAULT,
      confidenceDiscount: 0.8,
      maxSeededMastery: 0.9, // cap above the expected product
    };
    expect(seedTransferMastery(0.5, policy)).toBeCloseTo(0.4, 5);
  });

  it('caps seededMastery at maxSeededMastery', () => {
    const policy: TransferPolicy = {
      ...TRANSFER_POLICY_DEFAULT,
      confidenceDiscount: 1.0,
      maxSeededMastery: 0.8,
    };
    expect(seedTransferMastery(1.0, policy)).toBe(0.8);
  });

  it('seededMastery is strictly less than 1.0 for all swept inputs (AD7)', () => {
    const componentMasteries = [0, 0.25, 0.5, 0.75, 0.95, 1.0];
    const discounts = [0.6, 0.7, 0.8, 0.9];
    for (const componentMastery of componentMasteries) {
      for (const confidenceDiscount of discounts) {
        const policy: TransferPolicy = {
          ...TRANSFER_POLICY_DEFAULT,
          confidenceDiscount,
          maxSeededMastery: 0.95,
        };
        const seeded = seedTransferMastery(componentMastery, policy);
        expect(seeded).toBeLessThan(1.0);
        expect(seeded).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('applies a binding cap when componentMastery * discount > maxSeededMastery (AD6)', () => {
    const policy: TransferPolicy = {
      ...TRANSFER_POLICY_DEFAULT,
      confidenceDiscount: 0.9,
      maxSeededMastery: 0.8,
    };
    const seeded = seedTransferMastery(0.95, policy);
    expect(seeded).toBe(policy.maxSeededMastery);
    expect(seeded).toBeLessThan(0.95 * 0.9);
  });
});

// ---------------------------------------------------------------------------
// Revert helper
// ---------------------------------------------------------------------------

describe('revertTransferMastery', () => {
  it('is idempotent: revert(revert(state)) equals revert(state) (AD8)', () => {
    const seeded: KnowledgeStateEntry = {
      nodeId: 'math.im3.skill.solve-quadratic',
      mastery: 0.8,
      retention: 0.85,
      isProficient: true,
      state: 'mastered',
    };
    const once = revertTransferMastery(seeded);
    const twice = revertTransferMastery(once);
    expect(twice).toEqual(once);
  });
});

// ---------------------------------------------------------------------------
// computeTransferCredit
// ---------------------------------------------------------------------------

describe('computeTransferCredit', () => {
  const twoCourseComponent = makeComponent('eq-001', [
    'math.im2.skill.solve-quadratic',
    'math.im3.skill.solve-quadratic',
  ]);

  it('returns no credit for an unknown target skill id', () => {
    const state = makeState([
      ['math.im2.skill.solve-quadratic', 0.95, 0.92],
      ['math.im3.skill.solve-quadratic', 0.85, 0.80],
    ]);
    const result = computeTransferCredit(
      'math.im1.skill.unknown',
      [twoCourseComponent],
      state,
    );
    expect(result.applied).toBe(false);
    expect(result.seededMastery).toBe(0);
  });

  it('returns no credit when components array is empty', () => {
    const state = makeState([['math.im2.skill.solve-quadratic', 0.95, 0.92]]);
    const result = computeTransferCredit(
      'math.im3.skill.solve-quadratic',
      [],
      state,
    );
    expect(result.applied).toBe(false);
    expect(result.seededMastery).toBe(0);
  });

  it('returns no credit for a single-node component (AD5)', () => {
    const comp = makeComponent('eq-single', ['math.im3.skill.solve-quadratic']);
    const state = makeState([['math.im3.skill.solve-quadratic', 0.95, 0.92]]);
    const result = computeTransferCredit(
      'math.im3.skill.solve-quadratic',
      [comp],
      state,
    );
    expect(result.applied).toBe(false);
    expect(result.seededMastery).toBe(0);
  });

  it('seeds mastery with confidence discount when component is large enough', () => {
    const state = makeState([
      ['math.im2.skill.solve-quadratic', 0.9, 0.88],
      ['math.im3.skill.solve-quadratic', 0.8, 0.78],
    ]);
    const result = computeTransferCredit(
      'math.im3.skill.solve-quadratic',
      [twoCourseComponent],
      state,
    );
    expect(result.applied).toBe(true);
    const componentMastery = (0.9 + 0.8) / 2;
    const expected = Math.min(
      componentMastery * TRANSFER_POLICY_DEFAULT.confidenceDiscount,
      TRANSFER_POLICY_DEFAULT.maxSeededMastery,
    );
    expect(result.seededMastery).toBeCloseTo(expected, 5);
  });

  it('caps seededMastery at maxSeededMastery when product is below, at, and above the cap', () => {
    const policy: TransferPolicy = {
      ...TRANSFER_POLICY_DEFAULT,
      confidenceDiscount: 0.8,
      maxSeededMastery: 0.7,
    };
    const comp = makeComponent('eq-cap', [
      'math.im2.skill.solve-quadratic',
      'math.im3.skill.solve-quadratic',
    ]);

    // below cap
    const below = computeTransferCredit(
      'math.im3.skill.solve-quadratic',
      [comp],
      makeState([
        ['math.im2.skill.solve-quadratic', 0.6, 0.6],
        ['math.im3.skill.solve-quadratic', 0.6, 0.6],
      ]),
      policy,
    );
    expect(below.seededMastery).toBeCloseTo(0.6 * 0.8, 5);

    // at cap
    const at = computeTransferCredit(
      'math.im3.skill.solve-quadratic',
      [comp],
      makeState([
        ['math.im2.skill.solve-quadratic', 0.875, 0.875],
        ['math.im3.skill.solve-quadratic', 0.875, 0.875],
      ]),
      policy,
    );
    expect(at.seededMastery).toBeCloseTo(0.7, 5);

    // above cap
    const above = computeTransferCredit(
      'math.im3.skill.solve-quadratic',
      [comp],
      makeState([
        ['math.im2.skill.solve-quadratic', 0.95, 0.95],
        ['math.im3.skill.solve-quadratic', 0.95, 0.95],
      ]),
      policy,
    );
    expect(above.seededMastery).toBe(0.7);
  });

  it('excludes the target course from the reported source course (AD9)', () => {
    const comp = makeComponent('eq-002', [
      'math.im2.skill.solve-quadratic',
      'math.im3.skill.solve-quadratic',
      'math.precalc.skill.solve-quadratic',
    ]);
    const state = makeState([
      ['math.im2.skill.solve-quadratic', 0.9, 0.9],
      ['math.im3.skill.solve-quadratic', 0.8, 0.8],
      ['math.precalc.skill.solve-quadratic', 0.85, 0.85],
    ]);
    const result = computeTransferCredit(
      'math.im3.skill.solve-quadratic',
      [comp],
      state,
    );
    expect(result.applied).toBe(true);
    expect(result.sourceCourse).toBeDefined();
    expect(result.sourceCourse).not.toContain('im3');
    expect(result.sourceCourse).not.toBe(courseFromId('math.im3.skill.solve-quadratic'));
  });

  it('0-evidence nodes do not zero out transferable mastery', () => {
    const comp = makeComponent('eq-003', [
      'math.im2.skill.solve-quadratic',
      'math.im3.skill.solve-quadratic',
      'math.precalc.skill.solve-quadratic',
    ]);
    const state = makeState([
      ['math.im2.skill.solve-quadratic', 0.9, 0.9],
      ['math.im3.skill.solve-quadratic', 0.7, 0.7],
    ]);
    const result = computeTransferCredit(
      'math.im3.skill.solve-quadratic',
      [comp],
      state,
    );
    expect(result.applied).toBe(true);
    const componentMastery = (0.9 + 0.7) / 2;
    const expected = Math.min(
      componentMastery * TRANSFER_POLICY_DEFAULT.confidenceDiscount,
      TRANSFER_POLICY_DEFAULT.maxSeededMastery,
    );
    expect(result.seededMastery).toBeCloseTo(expected, 5);
  });

  it('merges partial config overrides with defaults', () => {
    const state = makeState([
      ['math.im2.skill.solve-quadratic', 0.9, 0.9],
      ['math.im3.skill.solve-quadratic', 0.9, 0.9],
    ]);
    const result = computeTransferCredit(
      'math.im3.skill.solve-quadratic',
      [twoCourseComponent],
      state,
      { maxSeededMastery: 0.6 },
    );
    expect(result.applied).toBe(true);
    expect(result.seededMastery).toBeLessThanOrEqual(0.6);
  });

  it('does not mutate input arguments', () => {
    const state = makeState([
      ['math.im2.skill.solve-quadratic', 0.9, 0.9],
      ['math.im3.skill.solve-quadratic', 0.8, 0.8],
    ]);
    const componentsSnapshot = JSON.stringify([twoCourseComponent]);
    const stateSnapshot = JSON.stringify(Array.from(state.entries()));
    const config: Partial<TransferPolicy> = { confidenceDiscount: 0.7 };
    const configSnapshot = JSON.stringify(config);

    computeTransferCredit(
      'math.im3.skill.solve-quadratic',
      [twoCourseComponent],
      state,
      config,
    );

    expect(JSON.stringify([twoCourseComponent])).toBe(componentsSnapshot);
    expect(JSON.stringify(Array.from(state.entries()))).toBe(stateSnapshot);
    expect(JSON.stringify(config)).toBe(configSnapshot);
  });
});

// ---------------------------------------------------------------------------
// batchComputeTransferCredit
// ---------------------------------------------------------------------------

describe('batchComputeTransferCredit', () => {
  const comp = makeComponent('eq-001', [
    'math.im2.skill.solve-quadratic',
    'math.im3.skill.solve-quadratic',
  ]);

  it('preserves input ordering', () => {
    const state = makeState([
      ['math.im2.skill.solve-quadratic', 0.9, 0.9],
      ['math.im3.skill.solve-quadratic', 0.8, 0.8],
    ]);
    const inputs = [
      'math.im3.skill.solve-quadratic',
      'math.im1.skill.unknown',
      'math.im3.skill.solve-quadratic',
    ];
    const results = batchComputeTransferCredit(inputs, [comp], state);
    expect(results).toHaveLength(3);
    expect(results[0].targetSkillId).toBe(inputs[0]);
    expect(results[1].targetSkillId).toBe(inputs[1]);
    expect(results[2].targetSkillId).toBe(inputs[2]);
    expect(results[1].applied).toBe(false);
    expect(results[0].applied).toBe(true);
  });

  it('returns an empty array for empty input', () => {
    expect(batchComputeTransferCredit([], [comp], new Map())).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Compile-time type assertions
// ---------------------------------------------------------------------------

function _typeChecks() {
  const _policy: TransferPolicy = TRANSFER_POLICY_DEFAULT;
  const _componentMastery: ComponentMasteryResult | undefined = undefined;
  void _policy;
  void _componentMastery;
}
void _typeChecks;
