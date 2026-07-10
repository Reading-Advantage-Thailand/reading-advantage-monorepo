/**
 * Frozen kst-srs.v3.2 planner contract parity.
 *
 * The original test reached outside this monorepo into a sibling ra-math
 * checkout for `kst-srs.v2/SPECIFICATION.md`. That made package tests depend
 * on an absent developer-local path. The local fixture preserves the same
 * artifact coverage while explicitly recording the v2-to-v3.2 contract
 * changes: normalized unlock reach, utility, readiness gating, and load policy.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function loadPlannerContract(): string {
  return readFileSync(
    new URL('./fixtures/kst-srs-v3.2-planner-normative.md', import.meta.url),
    'utf-8',
  );
}

describe('kst-srs.v3.2 planner normative artifact', () => {
  it('is a local, versioned v3.2 contract', () => {
    expect(loadPlannerContract()).toMatch(/^# kst-srs\.v3\.2 Planner Contract/m);
  });

  it('documents the five-term composite priority formula', () => {
    expect(loadPlannerContract()).toMatch(
      /priority\(B\).*a.*readiness.*b.*unlockValue.*c.*goalProximity.*d.*weaknessFit.*e.*utility/s,
    );
  });

  it('defines every v3.2 scoring term', () => {
    const contract = loadPlannerContract();
    for (const term of ['readiness(B)', 'unlockValue(B)', 'goalProximity(B)', 'weaknessFit(B)', 'utility(B)']) {
      expect(contract).toContain(term);
    }
  });

  it('documents configurable a/b/c/d/e weights', () => {
    expect(loadPlannerContract()).toMatch(/a, b, c, d, e are configurable/);
  });

  it('documents top-N recommendation output', () => {
    expect(loadPlannerContract()).toMatch(/recommendedNext.*top-N.*priority/s);
  });

  it('documents the strict finite non-negative weight schema', () => {
    expect(loadPlannerContract()).toMatch(/priorityWeightsSchema.*finite.*non-negative.*strict/s);
  });

  it('documents every PriorityScore variant', () => {
    expect(loadPlannerContract()).toMatch(/PriorityScore.*ranked.*unranked.*mastered/s);
  });

  it('documents PlannerInput and PlannerOutput', () => {
    expect(loadPlannerContract()).toMatch(/PlannerInput.*PlannerOutput/s);
  });

  it('documents recommendation and integrated planner APIs', () => {
    expect(loadPlannerContract()).toMatch(/getPriority.*getRecommendedNext.*planRecommendedNext/s);
  });

  it('documents bulk precomputation APIs', () => {
    const contract = loadPlannerContract();
    for (const api of ['computePriorities', 'computeUnlockValues', 'computeGoalProximities']) {
      expect(contract).toContain(api);
    }
  });

  it('documents the default topN of five', () => {
    expect(loadPlannerContract()).toMatch(/topN = 5/);
  });

  it('documents deterministic node-id tie-breaking', () => {
    expect(loadPlannerContract()).toMatch(/nodeId\.localeCompare.*ascending/);
  });

  it('records the v2 unknown-candidate removal rationale', () => {
    expect(loadPlannerContract()).toMatch(/v2.*unknown.*v3\.2.*ready.*nearly-ready/s);
  });

  it('documents the provider-neutral boundary', () => {
    expect(loadPlannerContract()).toMatch(/provider-neutral.*no app.*no provider SDK/s);
  });

  it('documents cycle safety, normalized reach, utility provenance, and review-load gating', () => {
    const contract = loadPlannerContract();
    expect(contract).toMatch(/cycle-safe/);
    expect(contract).toMatch(/ln\(1 \+ reach\) \/ ln\(1 \+ maxReach\)/);
    expect(contract).toMatch(/providerKey.*providerVersion.*signals/s);
    expect(contract).toMatch(/80%.*exact boundary.*allowed/s);
  });
});
