# Implementation Plan: Wave 5 — Public Surface Completion

> **Track ID:** `wave5_public_surface_completion_20260628`
> **Depends on:** Wave 3 claims gate (copy reconciliation); Wave 2 migration-doctor (Science deploy verification).
> **Method:** Contract-first TDD. Red tests before implementation. Public copy changes require PO approval recorded in Phase 0.

## Phase 0: Product Decision Gate and Baseline

> **2026-07-22 decision:** Lead capture is the company-operations lead
> capability. `www_crm_lead_intake_20260722` owns Contact Us and commercial CTA
> implementation. Pricing/comparison and legal-copy decisions remain blocking
> for their respective Wave 5 surfaces.

- [~] Task: Record remaining PO answers: approved comparison/pricing figures and final legal copy. Lead-capture backend/adapter is resolved by the successor tracks. **Blocking gate:** do not implement T12 or T17 surfaces until this task is complete.
- [~] Task: Reconcile T12 pricing/comparison against the Wave 3 claims matrix; note any conflicts.
- [~] Task: If any PO answer is unavailable, mark the dependent implementation tasks blocked and split unblockable SEO/assets/i18n/a11y/test-hygiene work into a smaller executable subtrack.
- [~] Task: Record baseline www/marketing/science pass/fail for the required verification commands.

## Phase 1: Conversion — Lead Capture and Dead Components

- [b] Task: Write Red tests proving waitlist + contact forms post to the chosen backend/adapter and validate input. — superseded:www_crm_lead_intake_20260722 (deferred:www_crm_lead_intake_20260722-acceptance)
  - Evidence refs: www T1 (LRF-008/009).
- [b] Task: Implement form submission + validation + analytics. — superseded:www_crm_lead_intake_20260722 (deferred:www_crm_lead_intake_20260722-acceptance)
- [x] Task: Remove or implement empty/dead layout components flagged by import-usage audit.
  - Evidence refs: www T2 (LRF-010).
  - Red failed with all three empty files detected: `fade-in.tsx`, `page-transition.tsx`, and `scroll-fade.tsx`.
  - Green removed the three unimported zero-byte files. The focused suite passes 1/1.
  - The exact combined command `CI=true ../../node_modules/.bin/vitest run src/components/layout/layout-components.test.ts src/__tests__/phase-2-seo-assets.red.test.ts --maxWorkers=1` passes 5/5.
- [~] Task: Run www targeted tests.
  - The focused T2 suite passes. The direct full Vitest command stopped with exit 130 after more than four minutes without output.

## Phase 2: SEO Metadata and Static Assets

- [x] Task: Write Red tests for missing page metadata exports and unresolved OG/static assets.
  - Evidence refs: www T3 (LRF-005/006/007/036), T6 (LRF-011).
  - Red failed 3/3: eight routes lacked metadata exports, `grid-pattern.svg` and the referenced OG asset were absent, and Reading Advantage began with `use client`.
- [x] Task: Add metadata (title, OG, hreflang, canonical, locale-aware) and restore assets; fix client-render SEO split.
  - Static metadata Green `64e7a3f39` covers the nine remaining static routes.
  - Dynamic blog metadata Green `426631dec6b6007a684a5684ceb7063ee217f4ab` completes all 23 marketing routes.
  - The six-path dynamic blog manifest is `6442531e9439bca1871487b34508c08ba43a0b2a8b4f8f3f32524304d054a8fe`.
  - Blog metadata tests pass 10/10. The combined Phase 2 baseline passes 5/5.
  - Typecheck, targeted lint, format, diff, and graph checks pass for the completed work.
  - The preserved blog Red hash is `716c5a38b644a938374e367f4ff4d0fb9a12b7cc9f36cffb7251466de7e4afee`.
  - The Phase 3 i18n Red remains a separate candidate. This task includes no Thai wording change.
- [~] Task: Run www targeted tests/build.
  - `CI=true ../../node_modules/.bin/vitest run src/__tests__/phase-2-seo-assets.red.test.ts --maxWorkers=1` passes 4/4 after the metadata, asset, and route-export repair. The combined T2/T3 command above passes 5/5.
  - `CI=true ../../node_modules/.bin/next build` from `apps/www-reading-advantage` exits 1 because Turbopack cannot bind a port in this environment (`Operation not permitted`). This is an environment-owned diagnostic, not a build Green.
  - Build and browser verification remain unclaimed.

## Phase 3: i18n Completeness and Typed Locale Access

- [x] Task: Write Red tests for hardcoded strings, missing zh fallback, and unsafe locale key casts. Source SHA evidence: `86f0611cf418632d5767a588d8fe15a4272973b1`, `a2c378992`.
  - Evidence refs: www T8 (LRF-021/022/023/024/016), T15 (LRF-027).
  - The historical Red test failed 3/3 for reviewed CTA/accessibility copy, locale casts, and Thai typo forms.
  - Mid Red remediation adds non-vacuous CTA interpolation, Sheet screen-reader, locale-parity, and Science caller type contracts.
- [x] Task: Externalize strings, add zh fallback, fix Thai typos, replace `as never` with typed accessors. Source SHA evidence: `ee2d7c238db07f2b77646a79a9ce0bc3b5c35916`, `1ac4e1b3ed80db90f7797bf68aefce04ad6b2768`, `758c42c42`, `c24ec2104`.
  - Group B typed locale access is accepted in source commit `ee2d7c238db07f2b77646a79a9ce0bc3b5c35916`.
  - The content-bound five-path aggregate is `e4bf355b8b416a8ad014d37cda790e7c193b7a45866fdb3108c0f9786a0c461f`.
  - Final Review A and Security Review B both returned ACCEPT for Group B.
  - Group B proves exact en/th/zh contracts, AST assertion rejection, and exact translator key sequences.
   - The historical source commits add typed CTA and Sheet messages and correct the reviewed Thai typo forms.
    - The Science locale contract is corrected in `758c42c42`. All existing Science callers now resolve against en, th, and zh dictionaries.
    - The correction adds only missing caller messages. It preserves existing translations and keeps `ExactMessages` unchanged.
- [x] Task: Run www targeted tests. Source SHA evidence: `758c42c42`, `c24ec2104`, `04bae4e3a`.
  - Historical Group B and Phase 2 evidence remains separate from this remediation.
   - Historical Red scope: `86f0611cf418632d5767a588d8fe15a4272973b1` and committed Red `a2c378992`; it had one Science failure with 22 diagnostics.
   - Historical Green scope: `1ac4e1b3ed80db90f7797bf68aefce04ad6b2768`, `758c42c42`, and `c24ec2104`; `04bae4e3a` is formatting-only.
   - Current Phase 3 suite passes 10/10 with the immutable Red test and Group B service contract.
   - Current standard and fresh non-incremental typechecks pass.
   - Current production `next build` passes.
   - Current targeted lint, full Phase 3 Prettier, and scoped diff checks pass.
   - Review A must rerun against `04bae4e3a` for RA-P3-003 before overall phase acceptance.

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

> **Strategy:** [`test-strategy.md`](./test-strategy.md)
> **Scope:** `apps/marketing` + `packages/db/src/schema/marketing.ts` only.
> Independent of Phase 0 pricing/legal blockers; does not touch www or Science;
> no root lock changes. Preserves Wave 3 security/Vinext/provider-adapter floor.
> **Applicability:** security review (encryption invariant, Wave 3 refutation),
> UX/API review (res.ok, inline errors, row-shape change, lang), adversarial
> testing (UNIQUE/script-shape/no-alert/no-plaintext refutation), browser review
> (deferred to owner follow-up; vinext build is the closest gate).
> **Canonical ordering:** Phase 7.1 through 7.5 are complete. The Phase 7
> canonical ordering is complete; the overall track remains active for its
> other phases and the deferred browser owner follow-up.

- [x] Task: Write Red tests for `UNIQUE(app, topic)`, typed `videoProjects.script`, `updatedAt`/`createdBy` columns, and shared `APPS` tuple. Corrected Red `305ec411b`; independently reviewed schema Green `0bdaec0e1` passes the Phase 7, Phase 2, migration, tenant, auth/masking, ESM, type, lint, and Vinext-build gates.
  - Evidence refs: marketing_schema_integrity (LR-007-001..007, LR-004-005).
  - Sub-phase 7.1. First executable Phase 7 Red. Targeted command in test-strategy.md.
- [x] Task: Add migration + schema constraints; enforce/document settings encryption invariant.
  - Independent ACCEPT: schema Green `0bdaec0e1` and settings encryption proof `eb7911b05`.
  - Focused evidence: the schema, migration, tenant, auth/masking, ESM, type, lint, and Vinext gates passed; the live PGlite property proof inspected raw persistence, verified ciphertext shape, and round-tripped through the production decrypt helper.
  - Sub-phase 7.2 complete. No production encryption source change was required.
- [x] Task: Add `res.ok` checks + inline error states; replace `alert()`/substring error styling.
  - Evidence refs: marketing_ux_error_handling (LR-004-007..010, LR-marketing-app-006-007).
  - Independent ACCEPT/review: Green `a7972835e` accepted against Red `470787d54`.
  - Focused evidence: Phase 7.3 UX contract 9/9, relevant Wave 3 settings/auth/masking regressions 16/16, Marketing typecheck/lint, Vinext build, and runtime verification passed.
  - Sub-phase 7.3 complete; no schema, encryption, or i18n scope was included.
- [x] Task: Add i18n layer / correct `lang`; externalize hardcoded English UI strings.
  - Evidence refs: marketing_i18n (LR-marketing-app-006-004).
  - Red chronology preserved: `phase-7-i18n-lang.red.test.tsx` remained the
    canonical Red filename; the accepted Green source commit is
    `7cbbafe3cd09f182b6ee73b162261367c1ed48e6`.
  - Final focused evidence: 158/158 passed under the default timeout in three
    consecutive runs; exact 15-path aggregate
    `2f06fb4f08b432071888a7db2ac6a0a066534418f4c2494cec6f0d6ba7e0b365`.
  - The UI is English, the dictionary is English, and `lang="en"` is aligned
    with that UI. This is not a claim of Thai localization.
  - Typecheck, targeted lint, Prettier, Vinext build, and runtime verification
    passed. Dual final reviews ACCEPTed the Green.
  - Browser verification remains deferred to the owner follow-up.
  - Sub-phase 7.4 complete.
- [x] Task: Run marketing targeted tests/build.
  - Sub-phase 7.5 closeout evidence: the focused Phase 7 suite and the
    typecheck, lint, Prettier, Vinext build, and runtime gates passed.
  - Phase 3/5/6 diagnostic: 182 passed, with one unchanged Phase 3 timeout;
    this remains an explicitly red diagnostic and is not a P7.4 acceptance
    failure.
  - Broad diagnostic: 35 files / 407 cases produced 403 passes and four live
    DB HTTP 500s because `DATABASE_URL` was unset: two in
    `phase-8-projects-live`, one in `project-update-live`, and one in
    `topic-save-concurrency-live`. These are owner-labeled environment
    diagnostics outside P7.4.
  - No global aggregate, `measure/doctor.sh`, or architecture Green is
    claimed by this closeout.
  - Sub-phase 7.5 complete. No spec, metadata, registry, generated, or source
    changes were made by the closeout.

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
