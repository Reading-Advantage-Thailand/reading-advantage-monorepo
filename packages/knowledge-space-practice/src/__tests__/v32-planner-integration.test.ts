import { describe, expect, it } from 'vitest';

import {
  getRecommendedNext,
  planRecommendedNext,
} from '../planner/recommended-next.js';
import {
  computeUtilityLedScore,
  projectReviewLoad,
} from '../planner/review-load.js';
import type { DomainUtilityProvider } from '../planner/domain-utility.js';
import type { PlannerInput } from '../planner/types.js';

function node(id: string, kind = 'skill') {
  return { id, kind, title: id, domain: 'synthetic.v32' };
}

function edge(id: string, type: string, sourceId: string, targetId: string) {
  return { id, type, sourceId, targetId, weight: 1 };
}

function plannerInput(overrides: Partial<PlannerInput> = {}): PlannerInput {
  return {
    nodes: [node('ready'), node('near'), node('blocked'), node('unknown')],
    edges: [],
    readinessByNode: { ready: 0.8, near: 0.5, blocked: 0.49 },
    goalNodeIds: [],
    misconceptionLinks: [],
    ...overrides,
  };
}

describe('kst-srs.v3.2 integrated recommendation policy', () => {
  it('returns only ready and nearly-ready candidates', () => {
    expect(getRecommendedNext(plannerInput())).toEqual(['ready', 'near']);
  });

  it('finds the nearest instructional container through transitive contains ancestry', () => {
    const input = plannerInput({
      nodes: [
        node('unit-a', 'instructional_unit'),
        node('lesson-a', 'lesson'),
        node('lesson-b', 'lesson'),
        node('lesson-c', 'lesson'),
        node('skill-a'),
        node('skill-b'),
        node('skill-c'),
        node('unit-b', 'instructional_unit'),
        node('lesson-d', 'lesson'),
        node('skill-d'),
      ],
      edges: [
        edge('ua-la', 'contains', 'unit-a', 'lesson-a'),
        edge('ua-lb', 'contains', 'unit-a', 'lesson-b'),
        edge('ua-lc', 'contains', 'unit-a', 'lesson-c'),
        edge('la-sa', 'contains', 'lesson-a', 'skill-a'),
        edge('lb-sb', 'contains', 'lesson-b', 'skill-b'),
        edge('lc-sc', 'contains', 'lesson-c', 'skill-c'),
        edge('ub-ld', 'contains', 'unit-b', 'lesson-d'),
        edge('ld-sd', 'contains', 'lesson-d', 'skill-d'),
      ],
      readinessByNode: {
        'skill-a': 1,
        'skill-b': 0.99,
        'skill-c': 0.98,
        'skill-d': 0.97,
      },
    });

    expect(getRecommendedNext(input, undefined, 4)).toEqual([
      'skill-a',
      'skill-b',
      'skill-d',
    ]);
  });

  it('uses validated injected utility in sparse mode and records provenance', () => {
    const input = plannerInput({
      nodes: [node('frequency-low'), node('frequency-high')],
      readinessByNode: { 'frequency-low': 1, 'frequency-high': 1 },
    });
    const provider: DomainUtilityProvider<{ release: string }> = {
      providerKey: 'codecamp.frequency',
      version: 'frequency.v1',
      getUtility(nodeId) {
        const utility = nodeId === 'frequency-high' ? 0.9 : 0.1;
        return {
          utility,
          signals: [
            {
              source: 'curriculum-frequency',
              sourceVersion: 'codecamp.v1',
              value: utility,
              weight: 1,
            },
          ],
        };
      },
    };

    const result = planRecommendedNext({
      input,
      utilityProvider: provider,
      utilityContext: { release: 'codecamp.v1' },
      reviewLoad: { cardsDueWithinSevenDays: 0, maxReviewsPerDay: 20 },
    });

    expect(result.rankingMode).toBe('utility-led');
    expect(result.recommendedNext).toEqual(['frequency-high', 'frequency-low']);
    expect(result.utilityByNode['frequency-high']).toMatchObject({
      utility: 0.9,
      providerKey: 'codecamp.frequency',
      providerVersion: 'frequency.v1',
    });
  });

  it('suppresses new skills only above the exact 80 percent review-load boundary', () => {
    const input = plannerInput({
      nodes: [node('skill-a')],
      readinessByNode: { 'skill-a': 1 },
    });

    const boundary = planRecommendedNext({
      input,
      utilityContext: undefined,
      reviewLoad: { cardsDueWithinSevenDays: 112, maxReviewsPerDay: 20 },
    });
    const above = planRecommendedNext({
      input,
      utilityContext: undefined,
      reviewLoad: { cardsDueWithinSevenDays: 113, maxReviewsPerDay: 20 },
    });

    expect(boundary.reviewLoad).toMatchObject({
      projectedDailyLoad: 16,
      budget: 16,
      allowNewSkills: true,
    });
    expect(boundary.recommendedNext).toEqual(['skill-a']);
    expect(above.reviewLoad.allowNewSkills).toBe(false);
    expect(above.recommendedNext).toEqual([]);
  });
});

describe('kst-srs.v3.2 numeric boundaries', () => {
  it.each([
    { cardsDueWithinSevenDays: Number.NaN, maxReviewsPerDay: 20 },
    { cardsDueWithinSevenDays: Number.POSITIVE_INFINITY, maxReviewsPerDay: 20 },
    { cardsDueWithinSevenDays: -1, maxReviewsPerDay: 20 },
    { cardsDueWithinSevenDays: 1, maxReviewsPerDay: -20 },
    { cardsDueWithinSevenDays: 1, maxReviewsPerDay: 20, loadBudgetFactor: Number.NaN },
  ])('rejects invalid review-load input %#', (input) => {
    expect(() => projectReviewLoad(input)).toThrow();
  });

  it('rejects non-finite, negative, and out-of-range utility-led configuration', () => {
    expect(() =>
      computeUtilityLedScore(
        { readiness: Number.NaN, utility: 1, weaknessFit: 0 },
        0.8,
      ),
    ).toThrow();
    expect(() =>
      computeUtilityLedScore(
        { readiness: 1, utility: -1, weaknessFit: 0 },
        0.8,
      ),
    ).toThrow();
    expect(() =>
      computeUtilityLedScore(
        { readiness: 1, utility: 1, weaknessFit: 0 },
        Number.POSITIVE_INFINITY,
      ),
    ).toThrow();
  });

  it('rejects invalid planner readiness and policy configuration at the public boundary', () => {
    expect(() =>
      getRecommendedNext(
        plannerInput({ readinessByNode: { ready: Number.NaN } }),
      ),
    ).toThrow();
    expect(() =>
      planRecommendedNext({
        input: plannerInput(),
        utilityContext: undefined,
        policy: { nearThreshold: -0.1 },
      }),
    ).toThrow();
  });
});
