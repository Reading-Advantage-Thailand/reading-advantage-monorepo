# CodeCamp Advantage — Test Gaps & False-Assurance Catalogue

- Track: `codecamp_advantage_review_20260626`
- Synthesis of test-quality findings across the 11 batches. Read-only; **no remediation performed or claimed**. Acceptance/closeout **PENDING**.
- Source IDs map to `line-review/cc-batch-NN.md`.

This catalogue separates **false-green** gaps (a green suite hides a real defect) from **coverage holes** (untested surface) and **brittleness** (tests that break on benign edits).

---

## A. False-Green — green suite hides a real defect

| ID | Gap | Source IDs | Hidden defect |
|----|-----|-----------|---------------|
| FG-1 | Codecamp tables resolve `EXEMPT` under Vitest but `REFERENTIAL` in compiled build; tenant-scope guard never fires | B08-002, B08-033, B09-002 | CR-1 `TenantScopeError` (production-fatal) |
| FG-2 | Webhook integration tests mock the entire domain layer | B10-015, B10-018, B10-023 | Webhook pipeline scoping break (B10-001) |
| FG-3 | Router tests mock all domain fns; "FORBIDDEN" comes from a mocked `AuthError`, not the middleware | B07-020, B07-021 | Real `assertCan`/`adminProcedure` enforcement & scoping unverified |
| FG-4 | phase-4 `trpcPost` sends no body → mutations receive `undefined`, rejected before logic | B03-041 | Quiz scoring / progress / intern creation never actually exercised |
| FG-5 | phase-7 `!notFound.status === 404` precedence bug → 404 status check is dead | B03-053 | A non-404 route passes the launch gate |
| FG-6 | Phase-13 "P0 launch gate" passes while `overall:"no-go"` | B03-030, B03-031, B03-032 | Reader mistakes green gate for "cleared to launch"; `Blocker.phaseId` undefined |
| FG-7 | `chat-locale` test re-implements `buildSystemPrompt` (diverged copy) | B02-034 | Real prompt locale logic untested |
| FG-8 | `lesson-language-badge` asserts a prose substring in `route.ts` via `fs.readFileSync` | B03-010 | Tests source text, not behavior |
| FG-9 | Replay/timestamp tests pin synthetic-header behavior that never fires for real GitHub deliveries | B10-016, B04-007 | Replay protection inert in production (B10-003) |
| FG-10 | `report-summary.json` says replay implemented; phase-9 prose says "RED on HEAD" | B04-001, B04-003 | Stale/contradictory QA evidence |
| FG-11 | `fetchPrDiff`/`postPrComment` "no token → mock/no-op" asserted as success | B09-058, B09-059 | Fabricated diff / silent feedback loss in prod (B10-007) |
| FG-12 | `crypto.sign` mocked module-wide | B09-057 | JWT generation never exercised against real signing |
| FG-13 | i18n component tests assert raw translation **keys** (setup mock echoes keys) | B01-022, B01-028, B01-031, B01-033, B01-062, B04-024 | Missing/mistranslated catalog keys invisible |
| FG-14 | prod-smoke concurrent-quiz / rate-limit "isolation" probes test error paths, not the named guarantee | B03-020, B03-021, B06-... | Race condition / per-user isolation unverified |
| FG-15 | Parity matrix `prod:"pass"` often means source-verified, not live-observed; `skip→pass` not a regression | B03-003, B03-016, B03-027, B03-028 | P0 items pass the gate with no live verification |
| FG-16 | Phase-8.5 follow-up-track gate scans only `measure/tracks/`; one required track is archived | B04-002 | Gate is a false-negative |
| FG-17 | `review-history` loose `getAllByText(/…/).length>=1`; `queryByRole("heading",/feedback/)` trivially true | B01-031, B01-032 | Label/message swaps and feedback rendering unverified |

---

## B. Coverage Holes — untested surface

| ID | Untested surface | Source IDs |
|----|------------------|-----------|
| CH-1 | `module-utils.ts` lock/PR-status/`getLockedByModuleTitle` (curriculum progression) | B03-011, B04-021 |
| CH-2 | `integrations/github` REST driver parse/filter/error/token-cache logic | B09-037, B09-038 |
| CH-3 | `pr-url.ts`, `i18n-format.ts`, `i18n-messages.ts` (deepMerge/resolveLocale) | B04-021 |
| CH-4 | `use-chat-stream` `text/event-stream` branch (only JSON mocked) | B04-019, B02-... |
| CH-5 | Domain `assertCan` / `schoolId` scoping correctness | B07-020, CR-2 |
| CH-6 | fork-instruction: HTTPS clone command, submit payload, partial-valid URL | B01-023, B01-024, B01-025 |
| CH-7 | Quiz 69% just-below boundary (only 10/70/100 tested) | B08-038 |
| CH-8 | `completeApprovedPrReviewLesson` side-effect (acknowledged uncovered in runbook) | B02-012 |
| CH-9 | Duplicate-answer-in-options uniqueness; lesson-section duplicate headings | B07-047, B01-030 |
| CH-10 | App-local tests excluded from `tsc` typecheck; tests outside `components/**`,`lib/**` not collected | B07-014, B07-016, B07-002 |

---

## C. Brittleness — breaks on benign edits

| ID | Brittle pattern | Source IDs |
|----|-----------------|-----------|
| BR-1 | Exact-string i18n assertions (~90 lines admin copy) | B02-041, B02-042, B03-005 |
| BR-2 | Tailwind-class substring assertions over page source | B04-026, B03-024, B03-025 |
| BR-3 | Indentation-coupled regex seed parsers (18/85 oracle) | B03-026, B03-042, B05-..., B04-... |
| BR-4 | Hardcoded magic counts (18 modules/85 lessons/16 repos) | B07-046, B08-046 |
| BR-5 | Hardcoded curriculum copy in title assertions | B07-044, B08-046 |
| BR-6 | Version-string literals duplicated in curriculum tests | B08-009, B08-046 |
| BR-7 | Rendered-SQL substring assertions (Drizzle output coupling) | B08-035 |
| BR-8 | Process/bookkeeping tests in package suites (git notes, archived plan.md, comment prose, SHAs) | B10-021, B10-024, B10-025, B10-026, B05-..., B02-024 |
| BR-9 | Timing/wall-clock latency budgets measured from CI runner (cross-region) | B02-029, B03-019, B03-037, B03-050, B06-... |
| BR-10 | CWD-relative cloudbuild read vs `__dirname` elsewhere | B03-035 |
| BR-11 | Duplicate cloudbuild parsers diverging from shared helper | B02-026, B02-036 |
| BR-12 | Mock call-ordering counters (`selectCallCount===1/2/3`) | B08-034 |
| BR-13 | Conditional/guarded assertions silently skip (`if(insertPayload)`, mock precedence bug) | B08-041, B10-019 |

---

## D. Production side effects from test runs

| ID | Effect | Source IDs |
|----|--------|-----------|
| PS-1 | Prod-smoke suites issue real requests to live production by default (auth-failure noise, unauth webhook POSTs, 10 parallel probes) | B03-001, B03-002 |
| PS-2 | `createIntern` probe creates real intern rows in prod DB, no cleanup | B03-044 |
| PS-3 | Rate-limit probe fires up to 31 real `/api/chat` calls → real OpenRouter cost | B03-045, B05-... |
| PS-4 | Webhook keystone E2E can create/update real `codecamp_pr_reviews` rows | B03-046, B04-006 |
| PS-5 | Playwright/E2E default baseURL = production | B07-004, B02-014/015 |

---

## Summary

- **17 false-green gaps** — the most serious are FG-1/FG-2 (mask the Critical tenant-scope defect) and FG-4/FG-5/FG-6 (broken/inverted launch gates).
- **Test-pyramid inversion** in `packages/webhooks`: 3 of 6 files are artifact/process assertions; the 2 genuine handler tests mock away the broken domain layer. The suite is green (78 tests) while the path it claims to cover is non-functional. `B10` cross-cutting.
- Remediation is proposed in `migration-tracks.md` (MT-2, MT-10, MT-X1). **None performed.** Acceptance/closeout **PENDING**.
