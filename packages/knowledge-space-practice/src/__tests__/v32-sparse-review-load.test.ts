import { describe, expect, it } from 'vitest';

import {
  computePrerequisiteDensity,
  computeUtilityLedScore,
  projectReviewLoad,
} from '../planner/review-load.js';

const skillIds = Array.from({ length: 100 }, (_, index) => `skill-${index + 1}`);
const skillNodes = skillIds.map((id) => ({ id, kind: 'skill' }));

function prerequisiteEdges(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `edge-${index + 1}`,
    type: 'prerequisite_for',
    sourceId: skillIds[index]!,
    targetId: skillIds[index + 50]!,
  }));
}

describe('kst-srs.v3.2 §10.4 prerequisite-sparse utility-led mode', () => {
  it('uses the strict less-than-five-percent release threshold', () => {
    expect(computePrerequisiteDensity(skillNodes, prerequisiteEdges(4))).toEqual({
      density: 0.04,
      prerequisiteSparse: true,
    });
    expect(computePrerequisiteDensity(skillNodes, prerequisiteEdges(5))).toEqual({
      density: 0.05,
      prerequisiteSparse: false,
    });
  });

  it('gates on readiness and ranks only by 0.7 utility plus 0.3 weakness', () => {
    expect(computeUtilityLedScore({ readiness: 1, utility: 1, weaknessFit: 0 }, 0.8)).toBeCloseTo(0.7, 10);
    expect(computeUtilityLedScore({ readiness: 1, utility: 0, weaknessFit: 1 }, 0.8)).toBeCloseTo(0.3, 10);
    expect(computeUtilityLedScore({ readiness: 0.79, utility: 1, weaknessFit: 1 }, 0.8)).toBeNull();
  });
});

describe('kst-srs.v3.2 §10.5 review-load budget', () => {
  it('suppresses new skills only above the exact 80 percent budget', () => {
    expect(
      projectReviewLoad({
        cardsDueWithinSevenDays: 119,
        maxReviewsPerDay: 20,
        loadBudgetFactor: 0.8,
      }),
    ).toEqual({
      projectedDailyLoad: 17,
      budget: 16,
      reviewLoadState: 'saturated',
      allowNewSkills: false,
    });

    expect(
      projectReviewLoad({
        cardsDueWithinSevenDays: 112,
        maxReviewsPerDay: 20,
        loadBudgetFactor: 0.8,
      }),
    ).toEqual({
      projectedDailyLoad: 16,
      budget: 16,
      reviewLoadState: 'elevated',
      allowNewSkills: true,
    });
  });

  it('reproduces the normative saturated worked example', () => {
    const result = projectReviewLoad({
      cardsDueWithinSevenDays: 180,
      maxReviewsPerDay: 20,
      loadBudgetFactor: 0.8,
    });
    expect(result.projectedDailyLoad).toBeCloseTo(180 / 7, 10);
    expect(result.budget).toBe(16);
    expect(result.reviewLoadState).toBe('saturated');
    expect(result.allowNewSkills).toBe(false);
  });
});
