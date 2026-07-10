import { describe, expect, expectTypeOf, it } from 'vitest';

import * as root from '@reading-advantage/knowledge-space-practice';
import * as priority from '@reading-advantage/knowledge-space-practice/planner/priority';
import * as recommendedNext from '@reading-advantage/knowledge-space-practice/planner/recommended-next';
import * as utility from '@reading-advantage/knowledge-space-practice/planner/domain-utility';
import * as reviewLoad from '@reading-advantage/knowledge-space-practice/planner/review-load';
import type {
  DomainUtilityProvider,
  EvaluatedDomainUtility,
  UtilitySignal,
} from '@reading-advantage/knowledge-space-practice/planner/domain-utility';

describe('kst-srs.v3.2 package-public planner API', () => {
  it('exports priority, recommendation, utility, and review-load APIs from root and subpaths', () => {
    expect(root.getPriority).toBe(priority.getPriority);
    expect(root.getRecommendedNext).toBe(recommendedNext.getRecommendedNext);
    expect(root.planRecommendedNext).toBe(recommendedNext.planRecommendedNext);
    expect(root.evaluateDomainUtility).toBe(utility.evaluateDomainUtility);
    expect(root.projectReviewLoad).toBe(reviewLoad.projectReviewLoad);
  });

  it('publishes domain utility provenance types', () => {
    expectTypeOf<UtilitySignal>().toMatchTypeOf<{
      source: string;
      sourceVersion: string;
      value: number;
      weight: number;
    }>();
    expectTypeOf<EvaluatedDomainUtility>().toHaveProperty('providerVersion');
    expectTypeOf<DomainUtilityProvider>().toHaveProperty('getUtility');
  });
});
