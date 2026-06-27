# Advantage Games — Test Gaps (`test-gaps.md`)

> **Track:** `advantage_games_review_20260626`
> **Source:** 47 line-review batches (test-relevant: B20–B22, B26–B34, B36–B46). **Status:** Review input. No tests written or run beyond one targeted batch run. Phase acceptance/closeout **PENDING**.

This document consolidates the testing gaps surfaced by the line review. It does **not** assert
that tests pass or fail (most batches did not execute the suites); it records the **shape and
coverage gaps** observed by static reading, with source batch IDs.

---

## 1. Unit / Component Tests

### G1 — Scoring / `onComplete` payload never asserted — HIGH (test integrity)
Page and component tests mock `dynamic`/game components and `fetch`, asserting scaffolding and
i18n **keys** (not strings), and never the `/complete` payload — so the scoring-integrity bugs
(fabricated counts, duplicate `onComplete`) are invisible to the suite.
- **Sources:** B21-014/-015/-034/-042/-046, B22-004/-005/-006/-011/-018/-019/-022/-025,
  B27-024, B28-014/-066, B29-008/-015/-017/-020/-026/-029/-032/-033.

### G2 — End-state (victory/defeat) never exercised — HIGH
Tests named for an end-state never reach it; "doesn't crash" assertions dominate; victory state
is sometimes unreachable/mislabeled.
- **Sources:** B27-024, B28-014, B29-014, B32-018.

### G3 — Heavy/global mocking masks real behavior — MEDIUM
Wholesale `react` module mocks (`React.use`), global component mocks, and synchronous
framer-motion mocks replace core dependencies, masking suspense/async behavior and asserting
fixed particle/Rect counts.
- **Sources:** B21-045, B22-004, B30-037, B31-005, B32-018.

### G4 — Tests drifted from store/source contracts — CRITICAL/HIGH
Potion Rush tests use `definition`/`category` fields and a `spawnCustomer(arg)` signature that no
longer match the store (`translation`, `spawnCustomer()`); two test files disagree on the API —
implies tests are either not type-checked in CI or fail to compile.
- **Sources:** B43-017 (CRITICAL), B43-031 (CRITICAL), B43-032, B36 (tests for absent sources).

### G5 — Brittle coupling to CSS classes / literal counts / magic timers — LOW/MEDIUM
Tests assert exact Konva `Rect` counts, CSS class names, and literal timer values; tautological
assertions (`length >= 0`).
- **Sources:** B30-013/-014/-018/-022/-027/-037/-039, B31-005, B21-046.

### G6 — Components/sources tested out of their batch — coverage attribution risk
Several component test files appear without their implementation source in the same batch
(`GriffinSkyJoustGame`, `dragon-rider/page`, tests-only logic games), so assertions could not be
validated against source during review.
- **Sources:** B27-025, B21-226, B36 limitations.

---

## 2. End-to-End (Playwright) Tests

### G7 — E2E is smoke/screenshot only — MEDIUM/HIGH
No spec asserts scoring, XP, win/lose, or non-zero completion payloads. Screenshot assertions
check self-constructed path **strings**, not rendered pixels; `fullPage` capture on a fixed
viewport canvas can yield blank/misframed artifacts.
- **Sources:** B45-001/-002, B46-001/-004/-005/-012/-013/-016.

### G8 — E2E runs dev server, chromium-only — MEDIUM
Playwright runs the **dev** build (not the exported static build that ships) and only chromium —
no cross-browser or production-artifact fidelity.
- **Sources:** B20-021, B20-022.

### G9 — Shared e2e helpers encode divergent contracts — MEDIUM
Inconsistent route globs (absolute vs `**`-prefixed), two incompatible response keys
(`vocabulary` vs `sentences`), one helper ignores its own `sentences` argument; 24× copy-paste
across both helper files is the substrate for the drift.
- **Sources:** B46-008/-009/-010/-014.

### G10 — Committed failure artifacts — LOW
`test-results/` contains a committed failed screenshot + error-context for devourer-slime.
- **Sources:** B44.

---

## 3. Build / Typecheck Backstop Gaps

### G11 — E2E specs excluded from `tsc` — MEDIUM
Spec files are excluded from typecheck, so e2e contract mismatches (G4, G9) get no compile-time
backstop.
- **Sources:** B46-019.

### G12 — Templates won't compile as shipped — CRITICAL
The canonical `GameNameGame.tsx.template` references an unimported `useInterval`; the README
documents the same broken pattern — every future game scaffolded from it starts broken.
- **Sources:** B43-060, B43-067.

---

## 4. Coverage Accounting Gaps

### G13 — Coverage masked by blending/deletion — LOW/MEDIUM
Page/component coverage reported below 80% but masked by blended metrics or by deleting tests;
single-commit audits leave no incremental TDD trail to verify coverage growth.
- **Sources:** B15-005, B20-004/-005/-006, B15-004/-011.

### G14 — "Completed/TDD" games shipped untested — HIGH
dungeon-liberator shipped with **zero tests** despite a strict-TDD claim; a field-name bug
survived to production.
- **Sources:** B04-022, B04-024.

---

## 5. Verification Actually Performed

- One targeted run recorded: `pnpm --filter @reading-advantage/domain test -- tenant-coverage`
  → **3 failing assertions (red)** (B46-026/-036).
- **No** full Jest/lint/typecheck/Playwright run was executed in this review; all other gaps are
  from static reading per each batch's Limitations.

---

## Disposition

- No tests were added, modified, or made to pass by this review.
- These gaps are **OPEN** review inputs; remediation is proposed under `migration-tracks.md` T9.
- **Phase acceptance and closeout are PENDING.**
