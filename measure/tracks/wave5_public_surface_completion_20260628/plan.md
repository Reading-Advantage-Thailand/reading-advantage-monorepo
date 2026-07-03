# Implementation Plan: Wave 5 — Public Surface Completion

> **Track ID:** `wave5_public_surface_completion_20260628`
> **Depends on:** Wave 3 claims gate (copy reconciliation); Wave 2 migration-doctor (Science deploy verification).
> **Method:** Contract-first TDD. Red tests before implementation. Public copy changes require PO approval recorded in Phase 0.

## Phase 0: Product Decision Gate and Baseline

- [~] Task: Record PO answers: lead-capture backend/adapter, approved comparison/pricing figures, final legal copy. **Blocking gate:** do not implement T1, T12, or T17 surfaces until this task is complete.
- [~] Task: Reconcile T12 pricing/comparison against the Wave 3 claims matrix; note any conflicts.
- [~] Task: If any PO answer is unavailable, mark the dependent implementation tasks blocked and split unblockable SEO/assets/i18n/a11y/test-hygiene work into a smaller executable subtrack.
- [~] Task: Record baseline www/marketing/science pass/fail for the required verification commands.

## Phase 1: Conversion — Lead Capture and Dead Components

- [~] Task: Write Red tests proving waitlist + contact forms post to the chosen backend/adapter and validate input.
  - Evidence refs: www T1 (LRF-008/009).
- [~] Task: Implement form submission + validation + analytics.
- [~] Task: Remove or implement empty/dead layout components flagged by import-usage audit.
  - Evidence refs: www T2 (LRF-010).
- [~] Task: Run www targeted tests.

## Phase 2: SEO Metadata and Static Assets

- [~] Task: Write Red tests for missing page metadata exports and unresolved OG/static assets.
  - Evidence refs: www T3 (LRF-005/006/007/036), T6 (LRF-011).
- [~] Task: Add metadata (title, OG, hreflang, canonical, locale-aware) and restore assets; fix client-render SEO split.
- [~] Task: Run www targeted tests/build.

## Phase 3: i18n Completeness and Typed Locale Access

- [~] Task: Write Red tests for hardcoded strings, missing zh fallback, and unsafe locale key casts.
  - Evidence refs: www T8 (LRF-021/022/023/024/016), T15 (LRF-027).
- [~] Task: Externalize strings, add zh fallback, fix Thai typos, replace `as never` with typed accessors.
- [~] Task: Run www targeted tests.

## Phase 4: Accessibility, Navigation, and Contact

- [~] Task: Write Red a11y tests for graph ARIA and reviewed UI components.
  - Evidence refs: www T11 (LRF-020/025).
- [~] Task: Remediate a11y issues; add Services to primary nav (T13/LRF-030); centralize contact details/support email (T14/LRF-026).
- [~] Task: Run www targeted tests.

## Phase 5: Comparison/Pricing Data and Legal Copy

- [~] Task: Write Red claim tests for stale comparison/pricing timestamps and "ZERO RISK" copy.
  - Evidence refs: www T12 (LRF-017/018), T17 (LRF-019).
- [~] Task: Update data to the approved figures (reconciled with Wave 3 matrix) and replace legal copy.
- [~] Task: Run www targeted tests.

## Phase 6: www Test Hygiene

- [~] Task: Unskip homepage test, dedupe Primary test, deepen product tests.
  - Evidence refs: www T16 (LRF-043).
- [~] Task: Run www full targeted test pass.

## Phase 7: Marketing Schema, UX, and i18n

- [~] Task: Write Red tests for `UNIQUE(app, topic)`, typed `videoProjects.script`, `updatedAt`/`createdBy` columns, and shared `APPS` tuple.
  - Evidence refs: marketing_schema_integrity (LR-007-001..007, LR-004-005).
- [~] Task: Add migration + schema constraints; enforce/document settings encryption invariant.
- [~] Task: Add `res.ok` checks + inline error states; replace `alert()`/substring error styling.
  - Evidence refs: marketing_ux_error_handling (LR-004-007..010, LR-marketing-app-006-007).
- [~] Task: Add i18n layer / correct `lang`; externalize hardcoded English UI strings.
  - Evidence refs: marketing_i18n (LR-marketing-app-006-004).
- [~] Task: Run marketing targeted tests/build.

## Phase 8: Science Build/Deploy De-Prisma

- [~] Task: Write Red test/guard asserting build command runs Drizzle migrate, not Prisma.
  - Evidence refs: Science ST-6 (HI-08, F-SA-B36-001/003, DOC-01).
- [~] Task: Replace Prisma build command with Drizzle migrate; align tsconfig test inclusion.
- [~] Task: Verify Science deploy path against Wave 2 migration-doctor gate.

## Phase 9: Acceptance and Closeout

- [~] Task: Run all required verification commands from `spec.md`.
- [~] Task: Update `medium-plus-coverage-matrix.md` and the Wave 3 claims matrix with completed evidence.
- [~] Task: Add lessons learned for SEO/i18n/form-adapter patterns.
- [~] Task: Run Measure phase acceptance and archive the track.
</content>
