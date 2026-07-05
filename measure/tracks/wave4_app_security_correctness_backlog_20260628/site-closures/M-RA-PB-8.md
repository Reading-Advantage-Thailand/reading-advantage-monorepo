# Site-Closure Checklist — Reading M-RA-PB-8 (Product-level learning-loop test suite)

> **Track:** `wave4_app_security_correctness_backlog_20260628` / Phase 4
> **Source evidence:** `measure/audit-reports/reading-advantage-full_20260626/migration-tracks.md` M-RA-PB-8
> **Resolves:** PB-010; `test-gaps.md` §5; batches 00,01,09,44. Also folds C-RA-CRIT-07 (vacuous `implementation-validation.test.ts`) and C-RA-CRIT-08 (archived-path Jest 30 tests) — anti-patterns A4/A9.
> **Depends on:** PB-1, PB-2, PB-3 fixes (W1) and PB-4 (this wave).
> **Status legend:** 🔴 open · 🟢 fixed · ⚪ NA · 🟡 deferred:<follow-up>

## Affected same-class sites (test coverage to backfill)

| # | Behavior | Test to add | Status |
|---|---|---|---|
| 1 | Article completion after required question types | integration test (mocked DB or test DB behind DATABASE_URL guard) | 🔴 open |
| 2 | XP idempotency + level progression | concurrency test: parallel `postActivityLog` → XP increases exactly once | 🔴 open |
| 3 | FSRS scheduling after ratings | rating → due-date reschedule test | 🔴 open |
| 4 | Assignment lifecycle + overdue detection | lifecycle test (ties to PB-4) | 🔴 open |
| 5 | Level-test assessment contract | valid/invalid assessment payload test (ties to PB-2) | 🔴 open |
| 6 | AI content level validation (mocked provider) | generator output matches requested CEFR/genre/schema (ties to PB-3) | 🔴 open |
| 7 | C-RA-CRIT-07 vacuous `implementation-validation.test.ts` | replace vacuous pass with real assertions (defense A4) | 🔴 open |
| 8 | C-RA-CRIT-08 archived-path Jest 30 tests | update to current paths (defense A9) | 🔴 open |

## Closeout requirement
Rows 1–6 🟢 with behavior-focused tests (AGENTS: "Avoid relying exclusively on Playwright"). Rows
7–8 🟢 (A4/A9 cleanup). Each test states its falsification condition (the removal/mutation that
turns it red). See `test-strategy.md` Phase 4.
