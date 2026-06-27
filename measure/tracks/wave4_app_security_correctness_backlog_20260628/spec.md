# Specification: Wave 4 — App Security & Correctness Backlog (Medium+)

## Overview

Close every remaining **Medium-, High-, and Critical-severity** security, tenant-isolation, authorization, contract, and correctness track that Waves 0–3 did not own. Waves 0–1 stopped the highest-risk runtime failures using representative slices; this wave finishes the security/correctness backlog across Science, Reading, CodeCamp, Sales, Primary, and the public website so no Medium+ security or correctness finding is left unowned.

The authoritative coverage map for this wave is `measure/audit-reports/monorepo-review-roadmap_20260626/medium-plus-coverage-matrix.md`.

## Closure Model

Wave 4 may use representative Red -> Green tests to prove a remediation pattern, but representative tests are **not sufficient for closeout**. Each owned migration track must enumerate its affected sites from the source review artifacts and either fix every same-class site in this wave or record a named deviation with the exact follow-up wave/track. A Phase Acceptance reviewer must reject closeout if a task claims closure from a single representative slice while known same-class sites remain untriaged.

## Source Findings

This wave owns these migration tracks (all Medium+):

- **Science (uncovered by Wave 1):** ST-1 Gamification authorization & tenant scoping (High), ST-2 `lib/services/**` auth & tenancy (High), ST-4 Route/contract correctness (Medium), SP-3 TenantDB adoption lint/guard.
- **Reading:** M-RA-SEC-6 Admin/SYSTEM license scope (High), SEC-7 Zod validation (Medium), SEC-8 Domain-layer migration (Medium), SEC-9 Firebase storage removal (Medium), SEC-10 Metrics/health endpoint hardening (Medium); PB-4 Assignment status enum/lifecycle (Medium), PB-5 Reporting metrics correctness (Medium), PB-6 Activity target validation/license fallback (Medium), PB-7 Typed request context for reports (Medium), PB-8 Product-level learning-loop test suite (High).
- **CodeCamp:** MT-8 Typed domain errors (High), MT-9 PR review scoping (High), MT-10 Test harness isolation (High), MT-11 Progression policy (Medium), MT-13 Permissions least privilege (Medium), MT-14 Observability (Medium).
- **Sales:** T5 Curriculum integrity & progression gating (Medium), T8 Reliability/transactions/rate limiting (Medium/High), T9 Observability & audit (Medium).
- **Primary:** M7 Prisma artifact cleanup (High), M9 Remove hardcoded secrets/credentials (Medium/High).
- **Public website:** www T9 Blog security hardening — HTML sanitization + Zod frontmatter (High).

## Evidence References

- `measure/audit-reports/science-advantage-full_20260626/migration-tracks.md` — ST-1, ST-2, ST-4, SP-3.
- `measure/audit-reports/reading-advantage-full_20260626/migration-tracks.md` — M-RA-SEC-6..10, M-RA-PB-4..8.
- `measure/audit-reports/codecamp-advantage_20260626/migration-tracks.md` — MT-8, MT-9, MT-10, MT-11, MT-13, MT-14.
- `measure/audit-reports/sales-advantage_20260626/migration-tracks.md` — T5, T8, T9.
- `measure/audit-reports/primary-advantage-full_20260626/migration-tracks.md` — M7, M9.
- `measure/audit-reports/www-reading-advantage_20260626/migration-tracks.md` — T9.
- `measure/audit-reports/monorepo-review-roadmap_20260626/medium-plus-coverage-matrix.md` — wave ownership of record.

## Dependencies

- Wave 0 tenant/auth/contract primitives and Wave 2 test harnesses (tenant-isolation helper, provider guard) should be available; if absent, each slice must locally prove its tenant/auth assumptions with behavior tests.
- Science ST-1/ST-2 depend on `createTenantDB` + `assertCan()` being importable into Science `lib/` (Wave 0).

## Scope

1. **Science security:** route `awardXp`/`updateStreakForProfile`/badges and `lib/services/**` (`get-class-detail`, `get-student-classes`, `mastery-worker`, `getClassDetailWithCurriculum`) through `createTenantDB` + `assertCan()`; add cross-tenant isolation tests; add a TenantDB-adoption guard (SP-3) covering raw-`db` imports in app code.
2. **Science correctness:** JSON-401 auth helper, `"me"` alias + `limit` clamp contract, `update-mastery` error mapping, lesson∈curriculum verification (ST-4).
3. **Reading authz/validation:** admin/SYSTEM license-scope hardening, Zod input validation across routes, metrics/health endpoint hardening, Firebase storage removal, domain-layer migration of reviewed controllers.
4. **Reading correctness:** assignment status enum/lifecycle, reporting metrics correctness, activity target validation + license fallback, typed request context for reports, product-level learning-loop test suite.
5. **CodeCamp:** typed domain errors, PR-review scoping, isolated test harness, progression policy, least-privilege permissions, observability via shared adapter.
6. **Sales:** curriculum integrity/progression gating, transaction/rate-limit reliability, observability & audit events.
7. **Primary:** remove Prisma artifacts, remove hardcoded secrets/credentials (with production guard) — secrets remediation is security-bearing and was explicitly out of Wave 1.

## Non-Goals

- Do not redo Wave 1 representative-slice fixes; this wave extends coverage to the remaining Medium+ tracks, not the same findings.
- Do not perform pure i18n/a11y/adapter-style polish — Wave 6 owns those.
- Do not change public-website claims (Wave 3) or marketing/public-surface UX (Wave 5).

## Acceptance Criteria

- Science gamification and `lib/services/**` paths run through `createTenantDB` + `assertCan()`, with passing cross-tenant isolation tests that fail when scoping is removed.
- A TenantDB-adoption guard fails when app code imports raw `@reading-advantage/db` where `createTenantDB` is expected.
- Reading admin/SYSTEM license operations enforce scope; reviewed routes validate input with Zod; metrics/health endpoints require auth or are explicitly public-by-design with tests.
- Reading learning-loop test suite (PB-8) exists and exercises XP → level → assignment progression end-to-end.
- CodeCamp domain errors are typed, PR-review queries are tenant-scoped, and the test harness no longer shares state across cases.
- Sales roleplay/reporting writes are transactional and rate-limited; audit events are recorded for sensitive Sales actions.
- Primary contains no Prisma runtime artifacts and no hardcoded secrets/credentials in committed source; seed/test credentials are env-guarded and non-production.
- Public blog renders sanitized HTML and validates frontmatter with Zod.
- Targeted package/app tests, type checks, and lint pass for every touched surface, or pre-existing failures are explicitly linked to follow-up.
- Every owned migration track has a site-closure checklist showing fixed, not-applicable, or explicitly-deferred status for each affected same-class site; no track is accepted based on representative-slice evidence alone.

## Required Verification Commands

```bash
CI=true pnpm turbo run test --filter=science-advantage --filter=reading-advantage --filter=codecamp-advantage --filter=sales-advantage --filter=primary-advantage --filter=@reading-advantage/domain
CI=true pnpm turbo run check-types --filter=science-advantage --filter=reading-advantage --filter=codecamp-advantage --filter=sales-advantage --filter=primary-advantage
CI=true pnpm turbo run lint --filter=science-advantage --filter=reading-advantage --filter=codecamp-advantage --filter=sales-advantage
```
</content>
