# Marketing App — Test Gaps

> Track: `marketing_app_review_20260626` · Baseline `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
> Reconciled against `measure/tracks/video_pipeline_20260613/plan.md` and confirmed by line-review of the existing test suite.

## Existing tests (reviewed line-by-line)

| File | Lines | Review verdict |
|---|---:|---|
| `phase-1-boot.test.ts` | 213 | No findings (boot/wiring smoke) |
| `phase-1-boot-adversarial.test.ts` | 209 | Tautological 500-on-null assertion (LR-marketing-app-001-002) |
| `phase-3-settings.test.ts` | 451 | Brittle source-regex (LR-...-002-001), `__fakeAIClient` leak (LR-...-002-002), stale RED docblock (LR-...-002-003) |
| `phase-3-settings-adversarial.test.ts` | 475 | Contradictory key-leak comment (LR-...-001-001, High), title/threshold mismatch (LR-...-001-003) |
| `phase-4-campaigns.test.ts` | 375 | Stale RED docblock, NextResponse stub, partial Drizzle mock, no-auth contract gap, non-asserting ordering test (LR-...-002-004..008) |
| `phase-5-topics.test.ts` | 395 | No material findings (well-structured 4-tier) |
| `phase-6-script.test.ts` | 453 | No material findings (well-structured 5-tier) |

## Confirmed missing tests (gaps at baseline `7ad89ac3`)

1. **Auth/authorization contract tests** — no test asserts that any campaign/video/settings route rejects unauthenticated callers (401/403) or scopes by tenant/owner. The campaign suite explicitly omits this (LR-marketing-app-002-007). **This is the most important gap** given the Critical/High auth findings.
2. **Zod input-validation tests** — no test exercises malformed input bodies against campaigns POST/PATCH, settings POST, or the video routes (corresponds to LR-004-001, LR-marketing-app-003-002/004/006).
3. **Schema-parity / constraint tests** — no test asserts `pastTopics` duplicate rejection (LR-007-001) or `videoProjects.script` shape at the DB layer (LR-007-005). (Carried from `video_pipeline_20260613` Phase 2.)
4. **Replace custom validator with Zod + exhaustive edge-case tests** — still open from `video_pipeline_20260613` Phase 6; `script-schema.ts` remains a custom validator.
5. **Component/DOM tests for client pages** — login, settings, campaigns, and video editor pages have no DOM-level tests; `vitest` is configured `environment: "node"`, which **cannot** run them (LR-marketing-app-006-003). UX error-handling regressions (LR-004-007..010) are therefore untestable as configured.
6. **Project CRUD integration tests** — `app/api/video/projects/route.ts` is POST-only; no integration test covers `campaignId` verification (LR-004-004) or future PATCH/edit paths (which also lack an `updatedAt` column, LR-007-002).
7. **LLM malformed-output handling tests** — no test feeds non-JSON / preamble-wrapped LLM responses to assert graceful handling (LR-004-006).
8. **Green-gate execution** — `pnpm turbo run test --filter=marketing` (and lint/type/build) was **not executed** in this review-only track (deferred:review-execution, Phase 4).

## Test-suite quality debt (not coverage gaps, but reliability gaps)

- Stale "RED at HEAD" docblocks mislead maintainers into thinking encryption/state-machine modules are unbuilt (LR-marketing-app-002-003/004).
- A contradictory comment about credential leakage undermines the most security-relevant test (LR-marketing-app-001-001).
- Source-text regex wiring assertions break on benign refactors (LR-marketing-app-002-001).
- The "ordered by createdAt desc" test asserts no ordering (LR-marketing-app-002-008).

## Recommendation

Fold gaps 1–7 into `marketing_test_truth_backfill_*` and `marketing_zod_boundaries_*`; deduplicate against the still-open `video_pipeline_20260613` tasks. Gap 8 (green gate) should be run before any remediation track is accepted.
