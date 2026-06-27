# Specification: Wave 6 — Quality, i18n, Accessibility, Adapters & Docs Completion

## Overview

Close the remaining **Medium-severity** maintainability, adapter, i18n, accessibility, test-quality, curriculum, and documentation tracks across every app and shared package. This is the final wave required to bring the monorepo to "no Medium-or-above finding unowned." It deliberately excludes Low-severity cosmetic cleanup (recorded as deferred in the coverage matrix).

Ownership of record: `measure/audit-reports/monorepo-review-roadmap_20260626/medium-plus-coverage-matrix.md`.

## Execution Split Guidance

Wave 6 is intentionally a final coverage umbrella, not a recommendation to land every item in one implementation PR. Before Green-phase implementation, split this umbrella into smaller executable subtracks unless a supervisor explicitly proves the combined scope is manageable. Preferred split boundaries:

- **Adapters/cache:** Primary M12/M13 and Science SP-2.
- **Games quality:** Advantage Games T5-T10.
- **CodeCamp curriculum/docs:** MT-C1..C4 and MT-X1.
- **i18n/a11y/test/docs cleanup:** Primary M10, Sales T10/T11, Marketing test truth, Science ST-5/ST-7/ST-8, shared M-SF-6.

Each subtrack must keep the same evidence references and update the coverage matrix so the Wave 6 umbrella remains the ownership record.

## Source Findings

- **Shared:** M-SF-6 Domain structure & portability cleanup (Medium).
- **Primary:** M10 i18n consolidation (Medium), M12 Auth adapter migration (Medium), M13 Adapter compliance (Medium).
- **Sales:** T10 Test coverage & test-quality cleanup (Medium), T11 UX/i18n/a11y/type-safety polish (Medium).
- **Science:** ST-5 Component decomposition & JSDoc (Medium), ST-7 Documentation truth-up (Medium), ST-8 Track-spec hardening (Medium), SP-2 Real Redis/cache adapter (Medium).
- **CodeCamp:** MT-C1 Curriculum security patterns (Medium, = CA-012), MT-C2 Curriculum version sync (Medium), MT-C3 Curriculum correctness (Medium), MT-C4 Docs reconciliation (Medium), MT-X1 QA artifact consistency (process).
- **Marketing:** marketing_test_truth_backfill (Medium).
- **Advantage Games:** T5 Fix non-functional/scoring-bug games (High/Medium), T6 Difficulty system unification (Medium), T7 Accessibility & age-appropriate UX baseline (Medium), T8 Performance & mobile/browser hardening (Medium), T9 Test integrity uplift (Medium), T10 CI & repo hygiene (Medium).

## Evidence References

- `measure/audit-reports/shared-foundation_20260626/migration-tracks.md` — M-SF-6.
- `measure/audit-reports/primary-advantage-full_20260626/migration-tracks.md` — M10, M12, M13.
- `measure/audit-reports/sales-advantage_20260626/migration-tracks.md` — T10, T11.
- `measure/audit-reports/science-advantage-full_20260626/migration-tracks.md` — ST-5, ST-7, ST-8, SP-2.
- `measure/audit-reports/codecamp-advantage_20260626/migration-tracks.md` — MT-C1, MT-C2, MT-C3, MT-C4, MT-X1.
- `measure/audit-reports/marketing-app_20260626/migration-tracks.md` — marketing_test_truth_backfill.
- `measure/audit-reports/advantage-games_20260626/migration-tracks.md` — T5, T6, T7, T8, T9, T10.
- `measure/audit-reports/monorepo-review-roadmap_20260626/medium-plus-coverage-matrix.md`.

## Dependencies

- Wave 2 provider-adapter enforcement should be complete so Primary M12/M13 and Science SP-2 migrate onto the approved adapter contracts rather than inventing new ones.
- Advantage Games T5–T10 build on the Wave 3 shared completion/scoring contract and runtime package.

## Scope

1. **Adapters:** migrate Primary auth onto the shared auth adapter (M12), bring Primary into adapter compliance (M13), implement a real shared Redis/cache adapter replacing in-memory stubs (SP-2).
2. **i18n:** consolidate Primary i18n (M10); finish Sales and Games UI localization where Medium-rated.
3. **Accessibility & UX:** Sales UX/a11y/type-safety polish (T11); Games accessibility + age-appropriate UX baseline (T7) and performance/mobile/browser hardening (T8).
4. **Correctness/quality:** fix non-functional/scoring-bug standalone games (T5) and unify difficulty system (T6).
5. **Test quality:** Sales test-quality cleanup (T10), Games test-integrity uplift + CI/repo hygiene (T9/T10), marketing test-truth backfill, Science component decomposition + JSDoc (ST-5).
6. **Maintainability:** shared domain portability cleanup (M-SF-6); remove Prisma artifacts only if still present post-Wave 4.
7. **Curriculum & docs:** align CodeCamp curriculum with current AGENTS.md/security standards (MT-C1=CA-012), version-sync and correctness (MT-C2/C3), docs reconciliation (MT-C4), QA artifact consistency (MT-X1); Science documentation truth-up (ST-7) and track-spec hardening (ST-8).

## Non-Goals

- Do not reopen security/correctness fixes owned by Waves 0–4.
- Do not pick up Low-severity cosmetic cleanup (Reading SEC-11, www T18, Games T11) — recorded as deferred.
- Do not import Advantage Games into product apps; games work here is standalone quality only.

## Acceptance Criteria

- Primary auth uses the shared auth adapter and passes adapter-compliance guards; no direct provider SDKs remain in reviewed Primary paths.
- A real shared cache adapter replaces in-memory stubs with a documented singleton fallback and tests.
- Primary i18n strings are consolidated; reviewed Sales and Games Medium-rated UI strings are localizable.
- Remediated Sales and Games components pass accessibility checks; Games performance/mobile hardening has regression coverage.
- Non-functional/scoring-bug games have passing correctness tests; difficulty system is unified behind one contract.
- Sales/Games/marketing test suites no longer contain tautological or stale-RED tests for the reviewed surfaces; Science exported components carry JSDoc and decomposed business logic.
- CodeCamp curriculum no longer teaches AGENTS.md-violating patterns; curriculum/docs match current stack; QA artifacts are consistent.
- Science docs reflect Drizzle/pnpm/auth reality; placeholder track specs are rewritten with concrete surfaces.
- Targeted tests, type checks, and lint pass for every touched surface.
- If Wave 6 is split into subtracks, each subtrack records its inherited evidence refs and the coverage matrix links the completed subtrack back to the owned Medium+ rows.

## Required Verification Commands

```bash
CI=true pnpm turbo run test --filter=primary-advantage --filter=sales-advantage --filter=science-advantage --filter=advantage-games --filter=marketing-app --filter=@reading-advantage/domain
CI=true pnpm turbo run check-types --filter=primary-advantage --filter=sales-advantage --filter=science-advantage --filter=advantage-games
CI=true pnpm turbo run lint --filter=primary-advantage --filter=sales-advantage --filter=advantage-games
```
</content>
