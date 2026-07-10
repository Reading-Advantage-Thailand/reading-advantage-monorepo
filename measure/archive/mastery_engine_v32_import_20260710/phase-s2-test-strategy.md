# Phase S2 Test Strategy: Migrate Correctness to v3.2

## Contract

Phase S2 changes learner-facing engine truth from v2 through v3, v3.1, and
v3.2. Red tests must encode the migration contract before production edits,
use `TZ=UTC`, fixed clocks, stable IDs, injected configuration, and no network
or wall-clock randomness. Each fixture records `specVersion`, `configVersion`,
`graphRelease`, and, where reviews are involved, `paramsVersion`.

## Migration matrix

| Item | Version | Production owner and exact target files                                                                                                                                                  | Exact Red test                                                          | Deterministic normative example and adversarial counterexample                                                                                                                                                                                                       |
| ---: | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    1 | v3      | `knowledge-space-core/src/{weighted-readiness.ts,outer-fringe.ts,knowledge-state-engine.ts,types.ts,schemas.ts}`                                                                         | `knowledge-space-core/src/__tests__/v3-readiness-state.test.ts`         | Hard edge mastery `0.40` plus soft edge `0.90` must yield gated readiness `0.36`, never compensating to the v2 weighted mean; a graph with no edge at `hardGateThreshold` remains bit-identical to v2.                                                               |
|    2 | v3      | `srs-engine/src/srs/edge-calibration.ts`                                                                                                                                                 | `srs-engine/src/__tests__/v3-edge-calibration.test.ts`                  | For fixed contingency cells, only `d` increments alpha and `c` increments beta; changing only `a`/`b` must not change necessity posterior or promote an inflated `confirmed` verdict.                                                                                |
|    3 | v3      | `srs-engine/src/srs/{scheduler.ts,objective-proficiency.ts}`, `knowledge-space-core/src/{knowledge-state-engine.ts,srs-bridge.ts}`                                                       | `srs-engine/src/__tests__/v3-retention-aggregation.test.ts`             | `stabilityToRetention(10, 10)` uses elapsed days; reviewed variants at `0.90` and `0.40` produce objective retention `0.40`, not mean `0.65`; unreviewed variants (`reps=0`) do not lower the minimum.                                                               |
|    4 | v3      | `knowledge-space-core/src/{placement.ts,placement-engine.ts,knowledge-state-engine.ts,types.ts,schemas.ts}`                                                                              | `knowledge-space-core/src/__tests__/v3-placement-seeding.test.ts`       | Estimate `0.80`, medium confidence creates a placement card with `S0=12` days and provisional mastery when over `masteryEnter`; closure traverses hard edges only, downgrades confidence each hop, records inferred evidence, and later direct evidence replaces it. |
|    5 | v3      | `srs-engine/src/srs/queue.ts`                                                                                                                                                            | `srs-engine/src/__tests__/v3-daily-queue.test.ts`                       | With 25 due reviews and cap 20, choose the 20 lowest predicted retentions and zero new cards; a more-overdue card with higher retention must not outrank a lower-retention card, and `newCardsPerDay` is a hard cap outside backlog mode.                            |
|    6 | v3      | `knowledge-space-core/src/progress-trend.ts`                                                                                                                                             | `knowledge-space-core/src/__tests__/v3-progress-trend.test.ts`          | At `trendThreshold=3`, a mastered-count decrease of 2 is `stable` and a decrease of 4 is `declining`; the misconception-cap citation change has no runtime assertion.                                                                                                |
|    7 | v3.1    | `srs-engine/src/srs/{objective-proficiency.ts,srs-proficiency.ts,adapters.ts}`                                                                                                           | `srs-engine/src/__tests__/v31-proficiency-evidence.test.ts`             | Fixed event times use half-life 10 recency weights, per-format guess floors, and the one-sided 95% Wilson lower bound; two perfect samples remain `low`, five remain at most `medium`, and multiple-choice evidence cannot equal an uncorrected raw rate.            |
|    8 | v3.1    | `practice-core/src/practice/{srs-rating.ts,timing.ts,timing-baseline.ts,contract.ts}`                                                                                                    | `practice-core/src/__tests__/v31-rating-mapper.test.ts`                 | Hint counts `0`, `1-2`, and `>=3`; any reveal caps at `Hard`, all revealed maps to `Again`; reliable timing at `z<=-1`/`z>=2` applies the normative adjustment while unreliable timing is inert. Boundary fixtures cover every threshold.                            |
|    9 | v3.1    | `knowledge-space-core/src/{placement.ts,placement-engine.ts,types.ts}`                                                                                                                   | `knowledge-space-core/src/__tests__/v31-placement-walk.test.ts`         | A decision point advances only after two guess-corrected probes, uses frontier-set DAG traversal, stops exactly at budget 24, and never emits confidence above medium; one lucky guess plus one failure cannot advance.                                              |
|   10 | v3.1    | `srs-engine/src/srs/{contract.ts,scheduler.ts}`                                                                                                                                          | `srs-engine/src/__tests__/v31-priority-retention.test.ts`               | Omitted config yields priority defaults `0.95/0.90/0.80`; an essential card receives `0.95`, while an explicit override is honored without changing unrelated scheduling state.                                                                                      |
|   11 | v3.1    | `srs-engine/src/srs/{contract.ts,review-processor.ts}`, new `srs-engine/src/srs/{fsrs-calibration.ts,evaluation-harness.ts}`                                                             | `srs-engine/src/__tests__/v31-fsrs-evaluation.test.ts`                  | A fixed, age-banded replay corpus yields identical fitted parameters and metrics on repeat runs; every review is attributed to `paramsVersion`, and missing version/age band is rejected rather than silently pooled.                                                |
|   12 | v3.1    | `srs-engine/src/srs/edge-calibration.ts`                                                                                                                                                 | `srs-engine/src/__tests__/v31-ability-stratification.test.ts`           | Fixed low/mid/high terciles retain separate contingency evidence; an aggregate association that disappears within terciles yields `confounded_by_ability`, not a confirmed edge.                                                                                     |
|   13 | v3.2    | `knowledge-space-practice/src/planner/{priority.ts,unlock-value.ts,recommended-next.ts,types.ts}`                                                                                        | `knowledge-space-practice/src/__tests__/v32-priority-diversity.test.ts` | All normalized terms at 1 score 1 and all at 0 score 0 with defaults `0.35/0.20/0.15/0.10/0.20`; unlock reach uses `ln(1+reach)/ln(1+maxReach)`, and repeated candidates from one category cannot exceed the deterministic diversity cap.                            |
|   14 | v3.2    | new `knowledge-space-practice/src/planner/domain-utility.ts`, plus `planner/{priority.ts,types.ts}` and `adapters.ts`                                                                    | `knowledge-space-practice/src/__tests__/v32-domain-utility.test.ts`     | No provider gives inert utility 0; a provider result carries exact source/version/signal provenance. The engine consumes only the adapter result and rejects an unversioned signal rather than reading domain layers directly.                                       |
|   15 | v3.2    | new `knowledge-space-practice/src/planner/review-load.ts`, plus `planner/{recommended-next.ts,priority.ts,types.ts}` and `knowledge-space-core/src/{knowledge-state-engine.ts,types.ts}` | `knowledge-space-practice/src/__tests__/v32-sparse-review-load.test.ts` | A release below 5% in-edges uses `0.7*utility + 0.3*weaknessFit` (scores `0.7` versus `0.3` for opposing unit signals); projected load 17 with `maxReviewsPerDay=20` emits zero new skills and overload state, while load 16 covers the exact 80% boundary.          |
|   16 | v3.2    | `srs-engine/src/srs/queue.ts`, new `srs-engine/src/srs/session-composition.ts`                                                                                                           | `srs-engine/src/__tests__/v32-session-composition.test.ts`              | Selected cards `A1,A2,B1` present round-robin as `A1,B1,A2`; identical `(cardId,reps)` always produces the same interval within +/-5%, and fixed lightest-day loads choose the same target day. Selection membership must remain unchanged.                          |

## Four implementation slices

1. **State truth (items 1, 3, 6):** land contracts/config schemas, elapsed-time
   retention, variant minimum, gated readiness, and symmetric trend together;
   keep no-hard-edge graphs and unaffected v2 fixtures green.
2. **Evidence and placement truth (items 4, 7, 8, 9):** version evidence,
   implement Wilson/guess-floor math and the rating table, then seed and walk
   placement with direct/inferred provenance.
3. **Queues and calibration (items 2, 5, 10, 11, 12):** correct necessity
   conditioning and ability strata, then queue ordering/backlog and priority
   retention; add replay/evaluation infrastructure only after review logs carry
   versions.
4. **Planner and session quality (items 13-16):** normalize priority and
   diversity, add the adapter-owned utility port, sparse/load gates, and finally
   presentation-only interleaving, fuzz, and load balancing.

Each slice is independently Red -> Green -> refactor and must pass all earlier
slice fixtures before the next slice begins.

## Compatibility and versioning

- Fixtures are immutable and tagged `v3`, `v3.1`, or `v3.2`; corrections never
  overwrite v2 expected output without an explicit migration fixture showing
  before and after.
- `hardGateThreshold`, `trendThreshold`, and
  `requestRetentionByPriority` are additive with normative defaults. Missing
  utility providers are backward compatible and contribute zero.
- The two-argument retention signature and changed learner decisions are
  correctness breaks: expose them through the existing public package exports,
  record a contract-version change, and update every internal call site in the
  same slice. No app compatibility alias may preserve wrong one-argument math.
- Persisted/replayed evidence carries `specVersion`, `configVersion`,
  `graphRelease`, `paramsVersion`, evidence type/source, and utility-signal
  provenance where applicable. Readers reject unknown future major versions.
- Provider, database, UI, and transport imports remain forbidden. Domain utility
  is an injected interface; no synthetic prerequisite edges or domain-layer reads
  are permitted.

## Commands

Run focused Red/Green files sequentially with the repository-supported Vitest
flags (local Vitest rejects `--minWorkers`):

```bash
TZ=UTC pnpm exec vitest run \
  packages/knowledge-space-core/src/__tests__/v3-readiness-state.test.ts \
  packages/knowledge-space-core/src/__tests__/v3-progress-trend.test.ts \
  packages/srs-engine/src/__tests__/v3-retention-aggregation.test.ts \
  --maxWorkers=1 --reporter=verbose
TZ=UTC pnpm exec vitest run \
  packages/knowledge-space-core/src/__tests__/v3-placement-seeding.test.ts \
  packages/knowledge-space-core/src/__tests__/v31-placement-walk.test.ts \
  packages/srs-engine/src/__tests__/v31-proficiency-evidence.test.ts \
  packages/practice-core/src/__tests__/v31-rating-mapper.test.ts \
  --maxWorkers=1 --reporter=verbose
TZ=UTC pnpm exec vitest run \
  packages/srs-engine/src/__tests__/v3-edge-calibration.test.ts \
  packages/srs-engine/src/__tests__/v3-daily-queue.test.ts \
  packages/srs-engine/src/__tests__/v31-priority-retention.test.ts \
  packages/srs-engine/src/__tests__/v31-fsrs-evaluation.test.ts \
  packages/srs-engine/src/__tests__/v31-ability-stratification.test.ts \
  --maxWorkers=1 --reporter=verbose
TZ=UTC pnpm exec vitest run \
  packages/knowledge-space-practice/src/__tests__/v32-priority-diversity.test.ts \
  packages/knowledge-space-practice/src/__tests__/v32-domain-utility.test.ts \
  packages/knowledge-space-practice/src/__tests__/v32-sparse-review-load.test.ts \
  packages/srs-engine/src/__tests__/v32-session-composition.test.ts \
  --maxWorkers=1 --reporter=verbose
```

After focused Green, run the four retained package suites, `check-types`, lint,
build, coverage, the Phase S1 import-boundary contract, and the track's phase
acceptance gates. Do not advance on unexplained inherited failures.

## Red handoff

Red owns only the 16 named test files and narrowly shared versioned fixture
modules under existing `src/__tests__/` directories. Write fixtures slice by
slice, assert each failure is the corresponding v2 behavior or missing v3.x
contract, and capture exact command output. Red must not edit algorithms,
exports, package manifests, production schemas, or adapters. If a planned new
module makes a test fail at import time, test through the intended public API or
use a contract-shape assertion so every Red failure remains behavior-specific.
