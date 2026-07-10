// Adversarial tests — Transfer Eligibility & Next-Skill Path
// Track: transfer-credit-runtime_20260605
//
// Covers AD cases from test-strategy.md §2 (Phase 2 surface).
//
// Coverage map:
//   AD2  Skill not in any component  .... covered in transfer-eligibility.test.ts
//                                          ('returns unknown skill ids as not eligible ... (AD10)')
//   AD3  0-evidence nodes  ............ covered for MISSING entries;
//                                       THIS file adds the explicit `state === 'untouched'`
//                                       case for `flagTransferEligible`.
//   AD4  >= boundary  ................. covered in transfer-eligibility.test.ts
//   AD5  Single-node false positive  .. covered in transfer-eligibility.test.ts;
//                                       THIS file adds explicit schema-rejection for
//                                       `requireMinComponentSize: 1`.
//   AD10 Unknown skill ids  ........... covered in transfer-eligibility.test.ts
//   AD15 Annotation order  ............ partial in transfer-eligibility-path.test.ts;
//                                       THIS file adds explicit order-preservation
//                                       assertions on `annotateNextSkillPath`.

import { describe, it, expect } from 'vitest';
import {
  flagTransferEligible,
  annotateNextSkillPath,
  TRANSFER_ELIGIBILITY_DEFAULT,
  transferEligibilitySchema,
} from '../transfer-eligibility.js';
import type {
  TransferEligibleSkill,
  NextSkillPathItem,
} from '../transfer-eligibility.js';
import type { EquivalenceComponent } from '../cross-course-equivalence.js';
import type { KnowledgeStateEntry } from '../mastery-state.js';

// ---------------------------------------------------------------------------
// Fixtures
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

function makeUntouchedEntry(nodeId: string): KnowledgeStateEntry {
  return {
    nodeId,
    mastery: 0,
    retention: 0,
    isProficient: false,
    state: 'untouched',
  };
}

function makeEvidencedEntry(
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

// ---------------------------------------------------------------------------
// AD3 — 0-evidence nodes (`state === 'untouched'` explicitly)
// ---------------------------------------------------------------------------

describe('AD3 — state === "untouched" ineligible (no crash, mean not zeroed by untouched nodes)', () => {
  it('flagTransferEligible returns not-eligible when source-course nodes are untouched', () => {
    const comp = makeComponent('eq-ad3', [
      'math.im2.skill.solve-quadratic',
      'math.im3.skill.solve-quadratic',
    ]);
    const state = new Map<string, KnowledgeStateEntry>([
      // Source is explicitly untouched — no mastery evidence to transfer.
      ['math.im2.skill.solve-quadratic', makeUntouchedEntry('math.im2.skill.solve-quadratic')],
    ]);

    const result = flagTransferEligible(
      ['math.im3.skill.solve-quadratic'],
      [comp],
      state,
    );

    expect(result).toHaveLength(1);
    expect(result[0].skillId).toBe('math.im3.skill.solve-quadratic');
    expect(result[0].eligible).toBe(false);
    // The reason must be a defined string — never `undefined`. This guards
    // against the "undefined" copy pathology at the eligibility seam.
    expect(result[0].reason).toBeDefined();
    expect(result[0].reason).not.toContain('undefined');
  });

  it('flagTransferEligible does NOT zero the source mean when only some nodes are untouched', () => {
    const comp = makeComponent('eq-ad3-mixed', [
      'math.im2.skill.solve-quadratic',
      'math.im1.skill.solve-quadratic',
      'math.im3.skill.solve-quadratic',
    ]);
    const state = new Map<string, KnowledgeStateEntry>([
      // Source-node A is untouched (excluded), source-node B has high mastery.
      ['math.im2.skill.solve-quadratic', makeUntouchedEntry('math.im2.skill.solve-quadratic')],
      ['math.im1.skill.solve-quadratic', makeEvidencedEntry('math.im1.skill.solve-quadratic', 0.95, 0.95)],
    ]);

    const result = flagTransferEligible(
      ['math.im3.skill.solve-quadratic'],
      [comp],
      state,
    );

    expect(result[0].eligible).toBe(true);
    // componentMastery is 0.95 (only im1 is evidenced; im2 is untouched → excluded)
    expect(result[0].componentMastery).toBeCloseTo(0.95, 5);
  });
});

// ---------------------------------------------------------------------------
// AD5 — Eligibility schema rejects requireMinComponentSize < 2
// ---------------------------------------------------------------------------

describe('AD5 — eligibility schema rejects requireMinComponentSize < 2', () => {
  it('rejects requireMinComponentSize: 1 at parse time', () => {
    // Schema is the structural guard against the AD5 false positive. A
    // caller passing `requireMinComponentSize: 1` is a code-path
    // configuration error and must fail loudly.
    expect(() =>
      transferEligibilitySchema.parse({
        eligibilityThreshold: 0.75,
        requireMinComponentSize: 1,
      }),
    ).toThrow();
  });

  it('rejects requireMinComponentSize: 0 at parse time', () => {
    expect(() =>
      transferEligibilitySchema.parse({
        eligibilityThreshold: 0.75,
        requireMinComponentSize: 0,
      }),
    ).toThrow();
  });

  it('rejects non-integer requireMinComponentSize', () => {
    expect(() =>
      transferEligibilitySchema.parse({
        eligibilityThreshold: 0.75,
        requireMinComponentSize: 1.5,
      }),
    ).toThrow();
  });

  it('accepts requireMinComponentSize: 2 (the production minimum)', () => {
    const parsed = transferEligibilitySchema.parse({
      eligibilityThreshold: 0.75,
      requireMinComponentSize: 2,
    });
    expect(parsed.requireMinComponentSize).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// AD15 — annotateNextSkillPath preserves the input path ORDER
// ---------------------------------------------------------------------------

describe('AD15 — annotateNextSkillPath preserves input path order (independent of eligibility order)', () => {
  it('output entries appear in the same order as the input path (5 entries)', () => {
    const path: NextSkillPathItem[] = [
      { skillId: 'math.im3.skill.solve-quadratic', lessonId: 'lesson-1' },
      { skillId: 'math.im3.skill.factored-form', lessonId: 'lesson-2' },
      { skillId: 'math.im3.skill.vertex-form', lessonId: 'lesson-3' },
      { skillId: 'math.im3.skill.linear-functions', lessonId: 'lesson-4' },
      { skillId: 'math.im3.skill.quartic-equations', lessonId: 'lesson-5' },
    ];

    // Eligibility records are deliberately in REVERSE order to the path —
    // the annotation must still preserve path order, not eligibility order.
    const eligibility: TransferEligibleSkill[] = [
      { skillId: 'math.im3.skill.quartic-equations', eligible: true, sourceCourse: 'math.im2', seededMastery: 0.7, componentId: 'eq-q', componentMastery: 0.92, reason: 'transfer-credit' },
      { skillId: 'math.im3.skill.linear-functions', eligible: true, sourceCourse: 'math.im2', seededMastery: 0.7, componentId: 'eq-l', componentMastery: 0.91, reason: 'transfer-credit' },
      { skillId: 'math.im3.skill.vertex-form', eligible: true, sourceCourse: 'math.im2', seededMastery: 0.7, componentId: 'eq-v', componentMastery: 0.9, reason: 'transfer-credit' },
      { skillId: 'math.im3.skill.factored-form', eligible: false, reason: 'insufficient-mastery' },
      { skillId: 'math.im3.skill.solve-quadratic', eligible: true, sourceCourse: 'math.im2', seededMastery: 0.7, componentId: 'eq-s', componentMastery: 0.95, reason: 'transfer-credit' },
    ];

    const result = annotateNextSkillPath(path, eligibility);

    expect(result).toHaveLength(path.length);
    for (let i = 0; i < path.length; i += 1) {
      expect(result[i].skillId).toBe(path[i].skillId);
    }
  });

  it('returns an empty array for an empty path even when eligibility records exist', () => {
    const eligibility: TransferEligibleSkill[] = [
      { skillId: 'math.im3.skill.solve-quadratic', eligible: true, sourceCourse: 'math.im2', seededMastery: 0.7, componentId: 'eq-1', componentMastery: 0.92, reason: 'transfer-credit' },
    ];
    expect(annotateNextSkillPath([], eligibility)).toEqual([]);
  });

  it('does not surface eligibility fields for path entries that have no eligibility record', () => {
    const path: NextSkillPathItem[] = [
      { skillId: 'math.im3.skill.unknown' },
    ];
    const result = annotateNextSkillPath(path, []);
    expect(result[0].transferEligible).toBe(false);
    expect(result[0].sourceCourse).toBeUndefined();
    expect(result[0].seededMastery).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// AD15 — flagTransferEligible returns DETERMINISTIC order across calls
// ---------------------------------------------------------------------------

describe('AD15 — flagTransferEligible returns the same order for the same input across calls', () => {
  const comp = makeComponent('eq-deterministic', [
    'math.im2.skill.solve-quadratic',
    'math.im3.skill.solve-quadratic',
  ]);
  const candidates = [
    'math.im3.skill.z-skill',
    'math.im3.skill.a-skill',
    'math.im3.skill.m-skill',
  ];

  it('returns the same skill order on two separate calls (deterministic)', () => {
    const state = new Map<string, KnowledgeStateEntry>();
    const a = flagTransferEligible(candidates, [comp], state);
    const b = flagTransferEligible(candidates, [comp], state);
    expect(a.map((r) => r.skillId)).toEqual(b.map((r) => r.skillId));
  });

  it('returns sorted-by-skillId order regardless of input order (documented behavior)', () => {
    // The contract is "deterministic, sorted by skill id", NOT "input order
    // preserved" (this is a deliberate design choice — see test-strategy
    // §1 P2.T1 group c). The assertion proves the design intent is honored.
    const state = new Map<string, KnowledgeStateEntry>();
    const result = flagTransferEligible(
      ['math.im3.skill.z-skill', 'math.im3.skill.a-skill', 'math.im3.skill.m-skill'],
      [comp],
      state,
    );
    expect(result.map((r) => r.skillId)).toEqual([
      'math.im3.skill.a-skill',
      'math.im3.skill.m-skill',
      'math.im3.skill.z-skill',
    ]);
  });
});

// ---------------------------------------------------------------------------
// AD12 — TRANSFER_ELIGIBILITY_DEFAULT is frozen (defensive)
// ---------------------------------------------------------------------------

describe('AD12 — TRANSFER_ELIGIBILITY_DEFAULT is frozen', () => {
  it('throws on deep mutation because the struct is frozen', () => {
    expect(Object.isFrozen(TRANSFER_ELIGIBILITY_DEFAULT)).toBe(true);
    expect(() => {
      (TRANSFER_ELIGIBILITY_DEFAULT as unknown as Record<string, unknown>).eligibilityThreshold = 0.5;
    }).toThrow();
  });
});
