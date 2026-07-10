/**
 * Phase 2 — Engine Rename (Track 7: Practice-Variant Rename)
 *
 * FR1: Rename `problemFamilyId → variantKey`, `ProblemFamily →
 *      PracticeVariant`, `ProblemFamilyEvidence → PracticeVariantEvidence`,
 *      `minProblemFamilies → minVariants`, `ProblemFamilyResolver →
 *      PracticeVariantResolver`, `InMemoryProblemFamilyResolver →
 *      InMemoryPracticeVariantResolver`, `ProblemFamilyInfo →
 *      PracticeVariantInfo`, and `getCardByStudentAndFamily →
 *      getCardByStudentAndVariant` across `srs-engine`.
 * FR2: Single-variant default — when `variantKey` is omitted, it collapses
 *      to `objectiveId` (a domain that does not subdivide uses a single
 *      variant per objective).
 *
 * This is the Red-phase proof that `srs-engine` still uses the legacy
 * `problemFamily*` identifiers. Every runtime assertion in this file is
 * expected to fail at HEAD because the rename has not been applied in
 * srs-engine.
 *
 * Strategy: `test-strategy.md` §7, row "P2". Targeted Red command:
 *   `./node_modules/.bin/vitest run packages/srs-engine/src/__tests__/variant-rename.test.ts`
 *
 * The module-shape tests use dynamic `import()` with explicit string paths
 * so they assert at runtime (not at type level) that the renamed exports
 * exist on the srs-engine module surface.
 *
 * Every test uses `as never` on inputs so the file compiles under HEAD
 * (where `variantKey` / `minVariants` / `getCardByStudentAndVariant` do not
 * yet exist on the srs-engine types). The runtime assertions below still
 * fail because the implementation reads the legacy field names.
 */

import { describe, it, expect } from 'vitest';
import { createCard, reviewCard } from '../srs/scheduler.js';
import { aggregateCardsToEvidence } from '../srs/srs-proficiency.js';
import {
  computeObjectiveProficiency,
  PROFICIENCY_THRESHOLD_DEFAULTS,
} from '../srs/objective-proficiency.js';
import { InMemoryCardStore } from '../srs/adapters.js';
import {
  InMemoryTimingBaselineResolver,
} from '../srs/submission-srs-adapter.js';
import { createMockSrsCard } from '../srs/fixtures.js';

// ============================================
// Contract layer: SrsCardState carries variantKey
// ============================================

describe('SrsCardState (contract rename)', () => {
  it('mock card from createMockSrsCard carries variantKey, not problemFamilyId', () => {
    const card = createMockSrsCard();
    expect(card).toHaveProperty('variantKey');
    expect(card).not.toHaveProperty('problemFamilyId');
  });

  it('mock card override { variantKey } round-trips into the output', () => {
    const card = createMockSrsCard({ variantKey: 'variant:custom' } as never);
    expect(card).toHaveProperty('variantKey', 'variant:custom');
    expect(card).not.toHaveProperty('problemFamilyId');
  });
});

// ============================================
// Scheduler layer: createCard uses variantKey
// ============================================

describe('createCard (scheduler rename + FR2 default)', () => {
  const mockNow = '2026-04-18T00:00:00.000Z';

  it('createCard({ variantKey }) produces a card keyed by variantKey', () => {
    const card = createCard({
      studentId: 'stu_001',
      objectiveId: 'obj_quadratic_roots',
      variantKey: 'variant:subdivision-A',
      now: mockNow,
    } as never);

    expect(card).toHaveProperty('variantKey', 'variant:subdivision-A');
    expect(card).not.toHaveProperty('problemFamilyId');
  });

  it('reviewCard preserves variantKey after a review', () => {
    const card = createCard({
      studentId: 'stu_001',
      objectiveId: 'obj_quadratic_roots',
      variantKey: 'variant:subdivision-A',
      now: mockNow,
    } as never);

    const updated = reviewCard(card, 'Good', mockNow);
    expect(updated).toHaveProperty('variantKey', 'variant:subdivision-A');
    expect(updated).not.toHaveProperty('problemFamilyId');
  });

  it('FR2 single-variant default — variantKey defaults to objectiveId when omitted', () => {
    const card = createCard({
      studentId: 'stu_001',
      objectiveId: 'obj_quadratic',
      now: mockNow,
    } as never);

    expect(card).toHaveProperty('variantKey', 'obj_quadratic');
    expect(card).toHaveProperty('objectiveId', 'obj_quadratic');
    expect(card).not.toHaveProperty('problemFamilyId');
  });

  it('FR2 — explicit variantKey overrides the objectiveId default', () => {
    const card = createCard({
      studentId: 'stu_001',
      objectiveId: 'obj_quadratic',
      variantKey: 'variant:subdivision-B',
      now: mockNow,
    } as never);

    expect(card).toHaveProperty('variantKey', 'variant:subdivision-B');
  });
});

// ============================================
// SRS Proficiency layer: variantKey threading
// ============================================

describe('aggregateCardsToEvidence (srs-proficiency rename)', () => {
  const emptyBaselines = {};

  it('groups cards by variantKey (not problemFamilyId) when threading the new field', () => {
    const cards = [
      { stability: 30, difficulty: 3, reps: 1, lapses: 0, variantKey: 'variant:pf1' },
      { stability: 30, difficulty: 3, reps: 1, lapses: 0, variantKey: 'variant:pf2' },
      { stability: 30, difficulty: 3, reps: 1, lapses: 0, variantKey: 'variant:pf3' },
    ];
    const result = aggregateCardsToEvidence(cards as never, emptyBaselines);
    expect(result).toHaveLength(3);
    expect((result[0] as { variantKey?: string }).variantKey).toBeDefined();
    expect((result[0] as { problemFamilyId?: string }).problemFamilyId).toBeUndefined();
    expect(
      result.map((e: unknown) => (e as { variantKey: string }).variantKey).sort(),
    ).toEqual(['variant:pf1', 'variant:pf2', 'variant:pf3']);
  });

  it('numeric outputs of aggregateCardsToEvidence are byte-for-byte unchanged after rename', () => {
    const cards = [
      { stability: 0, difficulty: 3, reps: 0, lapses: 0, variantKey: 'variant:pf1' },
      {
        stability: 30,
        difficulty: 3,
        reps: 1,
        lapses: 0,
        variantKey: 'variant:pf1',
        reviewDurationMs: 10000,
      },
      {
        stability: 300,
        difficulty: 5,
        reps: 5,
        lapses: 1,
        variantKey: 'variant:pf2',
        reviewDurationMs: 90000,
      },
    ];
    const baselines = {
      'variant:pf1': {
        variantKey: 'variant:pf1',
        sampleCount: 20,
        medianActiveMs: 30000,
        minSamplesMet: true,
        lastComputedAt: '2026-04-18T00:00:00.000Z',
      },
      'variant:pf2': {
        variantKey: 'variant:pf2',
        sampleCount: 20,
        medianActiveMs: 30000,
        minSamplesMet: true,
        lastComputedAt: '2026-04-18T00:00:00.000Z',
      },
    };
    const result = aggregateCardsToEvidence(cards as never, baselines);
    expect(result).toHaveLength(2);
    const pf1 = result.find((e: unknown) => (e as { variantKey: string }).variantKey === 'variant:pf1');
    const pf2 = result.find((e: unknown) => (e as { variantKey: string }).variantKey === 'variant:pf2');
    expect(pf1).toBeDefined();
    expect(pf2).toBeDefined();
    // PF1: retentions = [0, 0.5] → avg 0.25 → rounded 0.25. Coverage = 1/2 = 0.5.
    //      1 fast out of 1 reliable → ratio 1.0 → high.
    expect((pf1 as { retentionStrength: number }).retentionStrength).toBeCloseTo(0.25, 2);
    expect((pf1 as { practiceCoverage: number }).practiceCoverage).toBe(0.5);
    expect((pf1 as { fluencyConfidence: string }).fluencyConfidence).toBe('high');
    // PF2: retention = 0.909 → rounded 0.91. Coverage = 1.0.
    //      1 slow out of 1 reliable → ratio 0 → low.
    expect((pf2 as { retentionStrength: number }).retentionStrength).toBeCloseTo(0.91, 2);
    expect((pf2 as { practiceCoverage: number }).practiceCoverage).toBe(1);
    expect((pf2 as { fluencyConfidence: string }).fluencyConfidence).toBe('low');
  });

  it('returns empty array when given no cards (FR-invariant)', () => {
    expect(aggregateCardsToEvidence([], emptyBaselines)).toEqual([]);
  });
});

// ============================================
// Objective Proficiency layer: minVariants, variantEvidences
// ============================================

describe('computeObjectiveProficiency (rename)', () => {
  it('PROFICIENCY_THRESHOLD_DEFAULTS.essential.minVariants === 3 (no minProblemFamilies)', () => {
    const defaults = PROFICIENCY_THRESHOLD_DEFAULTS.essential as unknown as Record<string, number>;
    expect(defaults.minVariants).toBe(3);
    expect(defaults.minProblemFamilies).toBeUndefined();
  });

  it('PROFICIENCY_THRESHOLD_DEFAULTS.supporting.minVariants === 2', () => {
    const defaults = PROFICIENCY_THRESHOLD_DEFAULTS.supporting as unknown as Record<string, number>;
    expect(defaults.minVariants).toBe(2);
    expect(defaults.minProblemFamilies).toBeUndefined();
  });

  it('PROFICIENCY_THRESHOLD_DEFAULTS.extension.minVariants === 1', () => {
    const defaults = PROFICIENCY_THRESHOLD_DEFAULTS.extension as unknown as Record<string, number>;
    expect(defaults.minVariants).toBe(1);
    expect(defaults.minProblemFamilies).toBeUndefined();
  });

  it('PROFICIENCY_THRESHOLD_DEFAULTS.triaged.minVariants === 0', () => {
    const defaults = PROFICIENCY_THRESHOLD_DEFAULTS.triaged as unknown as Record<string, number>;
    expect(defaults.minVariants).toBe(0);
    expect(defaults.minProblemFamilies).toBeUndefined();
  });

  it('computeObjectiveProficiency accepts variantEvidences + minVariants and is proficient', () => {
    const result = computeObjectiveProficiency({
      objectiveId: 'obj-1',
      priority: 'essential',
      variantEvidences: [
        {
          variantKey: 'variant:a',
          retentionStrength: 1,
          practiceCoverage: 1,
          fluencyConfidence: 'high',
          baselineSampleCount: 10,
          timingReliable: true,
        },
        {
          variantKey: 'variant:b',
          retentionStrength: 1,
          practiceCoverage: 1,
          fluencyConfidence: 'high',
          baselineSampleCount: 10,
          timingReliable: true,
        },
        {
          variantKey: 'variant:c',
          retentionStrength: 1,
          practiceCoverage: 1,
          fluencyConfidence: 'high',
          baselineSampleCount: 10,
          timingReliable: true,
        },
      ],
      minVariants: 3,
    } as never);
    expect(result.isProficient).toBe(true);
    expect(result.evidenceConfidence).toBe('high');
    expect(result.objectiveId).toBe('obj-1');
  });

  it('computeObjectiveProficiency emits variantKey on detail rows (not problemFamilyId)', () => {
    const result = computeObjectiveProficiency({
      objectiveId: 'obj-2',
      priority: 'essential',
      variantEvidences: [
        {
          variantKey: 'variant:alpha',
          retentionStrength: 0.9,
          practiceCoverage: 0.8,
          fluencyConfidence: 'high',
          baselineSampleCount: 10,
          timingReliable: true,
        },
      ],
      minVariants: 1,
    } as never);
    expect(result.problemFamilyDetails).toHaveLength(1);
    const detail = result.problemFamilyDetails[0] as unknown as Record<string, unknown>;
    expect(detail.variantKey).toBe('variant:alpha');
    expect(detail.problemFamilyId).toBeUndefined();
  });
});

// ============================================
// Adapters layer: getCardByStudentAndVariant
// ============================================

describe('InMemoryCardStore (rename)', () => {
  const mockNow = '2026-04-18T00:00:00.000Z';

  it('exposes getCardByStudentAndVariant (not getCardByStudentAndFamily)', () => {
    const store = new InMemoryCardStore();
    expect(typeof (store as unknown as Record<string, unknown>).getCardByStudentAndVariant).toBe(
      'function',
    );
    expect((store as unknown as Record<string, unknown>).getCardByStudentAndFamily).toBeUndefined();
  });

  it('getCardByStudentAndVariant retrieves a card keyed by variantKey', async () => {
    const store = new InMemoryCardStore();
    const card = createMockSrsCard({
      cardId: 'card_test_001',
      studentId: 'stu_001',
      variantKey: 'variant:subdivision-A',
    } as never);
    await store.saveCard(card);

    const found = await (
      store as unknown as {
        getCardByStudentAndVariant(
          studentId: string,
          variantKey: string,
        ): Promise<typeof card | null>;
      }
    ).getCardByStudentAndVariant('stu_001', 'variant:subdivision-A');

    expect(found).not.toBeNull();
    expect(found).toHaveProperty('variantKey', 'variant:subdivision-A');
    expect(found).not.toHaveProperty('problemFamilyId');
  });

  it('getCardByStudentAndVariant returns null when no card matches the variantKey', async () => {
    const store = new InMemoryCardStore();
    const card = createMockSrsCard({
      cardId: 'card_test_002',
      studentId: 'stu_001',
      variantKey: 'variant:subdivision-A',
    } as never);
    await store.saveCard(card);

    const found = await (
      store as unknown as {
        getCardByStudentAndVariant(
          studentId: string,
          variantKey: string,
        ): Promise<unknown>;
      }
    ).getCardByStudentAndVariant('stu_001', 'variant:does-not-exist');

    expect(found).toBeNull();
  });
});

// ============================================
// Submission Adapter layer: PracticeVariantResolver + TimingBaselineResolver
// ============================================

describe('InMemoryPracticeVariantResolver (rename)', () => {
  it('module exports InMemoryPracticeVariantResolver (not InMemoryProblemFamilyResolver)', async () => {
    // Dynamic import so the assertion is runtime, not type-erased.
    const mod = (await import('../srs/submission-srs-adapter.js')) as Record<string, unknown>;
    expect(typeof mod.InMemoryPracticeVariantResolver).toBe('function');
    expect(mod.InMemoryProblemFamilyResolver).toBeUndefined();
  });

  it('module exports the PracticeVariantResolver interface name', async () => {
    // Interfaces are erased at runtime, so this contract is enforced at
    // tsc --noEmit; the runtime check below proves the rename reaches the
    // module surface (a class implementing the interface is exported).
    const mod = (await import('../srs/submission-srs-adapter.js')) as Record<string, unknown>;
    // The renamed class must be constructable.
    const Ctor = mod.InMemoryPracticeVariantResolver as new () => unknown;
    expect(new Ctor()).toBeDefined();
  });

  it('PracticeVariantInfo type re-export carries variantKey, not problemFamilyId', async () => {
    // The renamed type alias is erased at runtime; assert the module surface
    // exposes a constructor that returns an object whose resolve() returns
    // a record with `variantKey` only.
    const mod = (await import('../srs/submission-srs-adapter.js')) as Record<string, unknown>;
    const Ctor = mod.InMemoryPracticeVariantResolver as new () => {
      register(activityId: string, info: Record<string, string>): void;
      resolve(activityId: string): Promise<Record<string, string> | null>;
    };
    const resolver = new Ctor();
    resolver.register('act_1', { variantKey: 'variant:alpha', objectiveId: 'obj_1' });
    const resolved = await resolver.resolve('act_1');
    expect(resolved).toEqual({ variantKey: 'variant:alpha', objectiveId: 'obj_1' });
    expect(resolved).not.toHaveProperty('problemFamilyId');
  });
});

describe('InMemoryTimingBaselineResolver (rename)', () => {
  it('module exports InMemoryTimingBaselineResolver (not removed by the rename)', () => {
    // The resolver itself is not renamed by FR1, but it must continue to
    // exist after the srs-engine rename. Sanity check that its methods
    // are present.
    const resolver = new InMemoryTimingBaselineResolver();
    expect(typeof resolver.setBaseline).toBe('function');
    expect(typeof resolver.getBaseline).toBe('function');
  });
});