# kst-srs.v3.2 Planner Contract

## Composite priority

`priority(B) = a * readiness(B) + b * unlockValue(B) + c * goalProximity(B) + d * weaknessFit(B) + e * utility(B)`.

`a, b, c, d, e are configurable`. The `priorityWeightsSchema` requires every
weight to be finite and non-negative and is strict about unknown keys.

The `PriorityScore` union has `ranked`, `unranked`, and `mastered` variants.
`PlannerInput` supplies graph and learner signals; `PlannerOutput` supplies
scores and `recommendedNext`.

## Runtime APIs

`getPriority`, `getRecommendedNext`, and `planRecommendedNext` are public.
Bulk APIs are `computePriorities`, `computeUnlockValues`, and
`computeGoalProximities`. The default is `topN = 5`; equal scores use
`nodeId.localeCompare` ascending.

`recommendedNext` is top-N by priority after readiness and diversity policy.
The v2 planner admitted unknown candidates after ready candidates. v3.2 admits
only ready and nearly-ready candidates (readiness at least 0.50).

## v3.2 policy

Unlock reach is cycle-safe and normalized as
`ln(1 + reach) / ln(1 + maxReach)`. Sparse releases use injected utility with
`providerKey`, `providerVersion`, and versioned `signals` provenance. Review
load above 80% suppresses new skills; the exact boundary remains allowed.

The planner is provider-neutral: no app imports and no provider SDK imports.
