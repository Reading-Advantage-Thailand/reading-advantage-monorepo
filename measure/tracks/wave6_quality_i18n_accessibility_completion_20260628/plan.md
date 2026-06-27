# Implementation Plan: Wave 6 — Quality, i18n, Accessibility, Adapters & Docs Completion

> **Track ID:** `wave6_quality_i18n_accessibility_completion_20260628`
> **Depends on:** Wave 2 provider-adapter contracts; Wave 3 games completion/scoring contract + runtime package; Wave 4 security fixes.
> **Method:** Contract-first TDD where behavior changes; for docs/curriculum, evidence-anchored review with a verifiable check (link/version/lint) before edit.

## Phase 0: Baseline and Coverage Lock

- [ ] Task: Confirm Wave 2 adapter contracts and Wave 3 games runtime package are available.
- [ ] Task: Confirm Wave 4 closed all Medium+ security/correctness tracks so this wave is quality-only.
- [ ] Task: Decide whether to split this umbrella into executable subtracks: adapters/cache, games quality, CodeCamp curriculum/docs, and i18n/a11y/test/docs cleanup. If not split, record why combined scope is manageable.
- [ ] Task: Record baseline pass/fail for the required verification commands.

## Phase 1: Adapters — Primary Auth/Compliance and Shared Cache

- [ ] Task: Write Red tests/guards for Primary direct-SDK usage and missing auth-adapter migration.
  - Evidence refs: Primary M12/M13.
- [ ] Task: Migrate Primary auth onto the shared auth adapter; satisfy adapter-compliance guard.
- [ ] Task: Write Red tests for in-memory cache stubs that must be a real shared adapter.
  - Evidence refs: Science SP-2 (HI-04, ME-08).
- [ ] Task: Implement the shared Redis/cache adapter with documented singleton fallback.
- [ ] Task: Run Primary/science/domain targeted tests.

## Phase 2: i18n Consolidation

- [ ] Task: Write Red tests for Primary hardcoded strings and locale wiring.
  - Evidence refs: Primary M10.
- [ ] Task: Consolidate Primary i18n; localize reviewed Sales/Games Medium-rated UI strings.
  - Evidence refs: Sales T11; Games T3 follow-through.
- [ ] Task: Run targeted tests.

## Phase 3: Accessibility and UX Polish

- [ ] Task: Write Red a11y tests for reviewed Sales and Games components.
  - Evidence refs: Sales T11; Games T7.
- [ ] Task: Remediate a11y issues; apply Sales type-safety polish.
- [ ] Task: Write Red performance/mobile regression checks for Games.
  - Evidence refs: Games T8.
- [ ] Task: Apply Games performance/mobile/browser hardening.
- [ ] Task: Run targeted tests.

## Phase 4: Games Correctness and Difficulty Unification

- [ ] Task: Write Red tests for non-functional/scoring-bug games.
  - Evidence refs: Games T5.
- [ ] Task: Fix scoring/functional bugs; unify difficulty system behind one contract (T6).
- [ ] Task: Run games targeted tests.

## Phase 5: Test-Quality Restoration

- [ ] Task: Replace tautological/stale-RED tests in Sales, Games, and Marketing reviewed surfaces with behavior tests.
  - Evidence refs: Sales T10; Games T9/T10; marketing_test_truth_backfill.
- [ ] Task: Decompose Science business-logic-in-component and add JSDoc to exported symbols.
  - Evidence refs: Science ST-5.
- [ ] Task: Run targeted tests.

## Phase 6: Maintainability and Shared Domain Portability

- [ ] Task: Apply shared domain structure/portability cleanup.
  - Evidence refs: M-SF-6.
- [ ] Task: Verify no Prisma artifacts remain anywhere (defense-in-depth after Wave 4/Wave 5).
- [ ] Task: Run domain/db targeted tests.

## Phase 7: CodeCamp Curriculum and Docs Reconciliation

- [ ] Task: Audit CodeCamp curriculum against current AGENTS.md/security standards; rewrite anti-pattern lessons.
  - Evidence refs: CodeCamp MT-C1 (=CA-012), MT-C2/MT-C3.
- [ ] Task: Reconcile CodeCamp docs and QA artifacts with current stack.
  - Evidence refs: CodeCamp MT-C4, MT-X1.
- [ ] Task: Science documentation truth-up and placeholder track-spec hardening.
  - Evidence refs: Science ST-7, ST-8.

## Phase 8: Acceptance and Closeout

- [ ] Task: Run all required verification commands from `spec.md`.
- [ ] Task: Update `medium-plus-coverage-matrix.md`; confirm every Medium+ row is Resolved, linked to a completed Wave 6 subtrack, or explicitly carried as deferred-Low.
- [ ] Task: Add lessons learned for adapter/i18n/test-quality patterns.
- [ ] Task: Run Measure phase acceptance and archive the track.
</content>
