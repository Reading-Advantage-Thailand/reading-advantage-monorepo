# Medium-and-Above Coverage Matrix

> **Track:** `monorepo_review_roadmap_20260626`
> **Purpose:** Prove that every Medium-, High-, and Critical-severity remediation track surfaced by the review program is owned by exactly one implementation wave. Low-severity items are listed at the bottom as explicitly deferred.
> **Created:** 2026-06-28

Waves 0–3 stop the bleeding (shared foundations, highest-risk runtime/security failures, deploy/test confidence, product-truth + games import). Waves 4–6 complete the Medium-and-above backlog so no Medium+ finding is silently dropped.

## Wave ownership legend

- **W0** Shared Safety Foundations · **W1** High-Risk Product Failures · **W2** Deploy/Test/Provider Confidence · **W3** Product-Facing Truth & Games Import
- **W4** App Security & Correctness Backlog · **W5** Public Surface Completion · **W6** Quality, i18n, Accessibility, Adapters & Docs

## Shared Foundation (`shared-foundation_20260626/migration-tracks.md`)

| Track | Severity | Wave |
|---|---|---|
| M-SF-1 Tenant registry/schema/Drizzle alignment | Critical | W0 |
| M-SF-2 Fail-closed TenantDB + referential-scope tests | Critical | W0 |
| M-SF-3 Business logic out of API transport | High | W0 |
| M-SF-4 Centralize permissions + typed error/contract mapping | High | W0 |
| M-SF-5 Auth monitor hardening batch | High | W0 |
| M-SF-6 Domain structure & portability cleanup | Medium | **W6** |
| M-SF-7 Package gate integrity + compiled webhook boundary | High | W2 |
| M-SF-8 Shared contract/UI utility test coverage | Medium | W2 |
| M-SF-9 GitHub integration + webhook review pipeline seam | High | W1 |
| M-SF-10 Legacy provider-adapter adoption for scripts/exceptions | Medium | W2 |

## Cross-App (`cross-app-workflows_20260626/migration-tracks.md`)

All CAX-1..9 owned: CAX-1/2/3/4/8 → W0; CAX-5/6 → W2; CAX-7/9 → W3. CA-012 (CodeCamp curriculum security anti-patterns, Medium) → **W6** (CodeCamp MT-C1).

## Primary Advantage (`primary-advantage-full_20260626/migration-tracks.md`)

| Track | Severity | Wave |
|---|---|---|
| M1 Undefined var/session crashes | Critical | W1 |
| M2 Restore admin CRUD | Critical | W1 |
| M3 Re-enable commented-out admin UI | Critical | W1 |
| M4 Auth on unprotected routes/actions | Critical/High | W1 |
| M5 Tenant/schoolId scoping | High | W1 |
| M6 Drizzle/flashcard schema resolution | Critical | W1 |
| M7 Prisma artifact cleanup | High | **W4** |
| M8 Dashboard hardcoded data | High | W1 |
| M9 Remove hardcoded secrets/credentials | Medium/High | **W4** |
| M10 i18n consolidation | Medium | **W6** |
| M11 Test coverage expansion | High | W1 |
| M12 Auth adapter migration | Medium | **W6** |
| M13 Adapter compliance | Medium | **W6** |

## Reading Advantage (`reading-advantage-full_20260626/migration-tracks.md`)

| Track | Severity | Wave |
|---|---|---|
| M-RA-SEC-1 Tenant/school scoping | Critical | W1 |
| M-RA-SEC-2 Secure unauthenticated system endpoints | Critical | W1 |
| M-RA-SEC-3 Audit log infrastructure | High | W1 |
| M-RA-SEC-4 AI data privacy (PII/consent) | High | W1 |
| M-RA-SEC-5 Rate-limiting hardening | High | W1 (via W0 limiter) |
| M-RA-SEC-6 Admin/SYSTEM license scope hardening | High | **W4** |
| M-RA-SEC-7 Zod input validation across routes | Medium | **W4** |
| M-RA-SEC-8 Domain-layer migration | Medium | **W4** |
| M-RA-SEC-9 Firebase storage removal | Medium | **W4** |
| M-RA-SEC-10 Metrics/health endpoint hardening | Medium | **W4** |
| M-RA-SEC-11 AI adapter consistency | Low | Deferred |
| M-RA-PB-1 XP/level idempotency | Critical | W1 |
| M-RA-PB-2 Level-test assessment contract | High | W1 |
| M-RA-PB-3 AI content quality gate | High | W1 |
| M-RA-PB-4 Assignment status enum & lifecycle | Medium | **W4** |
| M-RA-PB-5 Reporting metrics correctness | Medium | **W4** |
| M-RA-PB-6 Activity target validation & license fallback | Medium | **W4** |
| M-RA-PB-7 Typed request context for reports | Medium | **W4** |
| M-RA-PB-8 Product-level learning-loop test suite | High | **W4** |

## CodeCamp Advantage (`codecamp-advantage_20260626/migration-tracks.md`)

| Track | Severity | Wave |
|---|---|---|
| MT-1 TenantDB unscoped fix | P0/Critical | W1 |
| MT-2 Tenant-scope tests | P0/Critical | W1 |
| MT-3 Webhook async/idempotent | P0/Critical | W1 |
| MT-4 Webhook auth/completion | P0/Critical | W1 |
| MT-5 GitHub client consolidation | P1/High | W1 |
| MT-6 Chat streaming fix | P1/High | W1 |
| MT-7 Migration integrity | P1/High | W2 |
| MT-8 Typed domain errors | P1/High | **W4** |
| MT-9 PR review scoping | P1/High | **W4** |
| MT-10 Test harness isolation | P1/High | **W4** |
| MT-11 Progression policy | P2/Medium | **W4** |
| MT-12 Seed idempotency | P2/Medium | W2 |
| MT-13 Permissions least privilege | P2/Medium | **W4** |
| MT-14 Observability | P2/Medium | **W4** |
| MT-C1 Curriculum security patterns (=CA-012) | Medium | **W6** |
| MT-C2 Curriculum version sync | Medium | **W6** |
| MT-C3 Curriculum correctness | Medium | **W6** |
| MT-C4 Docs reconciliation | Medium/Low | **W6** |
| MT-X1 QA artifact consistency | Process | **W6** |

## Sales Advantage (`sales-advantage_20260626/migration-tracks.md`)

| Track | Severity | Wave |
|---|---|---|
| T1 Authorization & tenant isolation | Critical/High | W1 |
| T2 Audio input hardening | High | W1 |
| T3 AI/audio privacy & retention | High | W1 |
| T4 AI adapter boundary integrity | High | W2 |
| T5 Curriculum integrity & progression gating | Medium | **W4** |
| T6 Seed safety & content governance | Medium | W2 |
| T7 Schema/contract consistency | High | W1 |
| T8 Reliability, transactions & rate limiting | Medium/High | **W4** |
| T9 Observability & audit | Medium | **W4** |
| T10 Test coverage & test-quality cleanup | Medium | **W6** |
| T11 UX / i18n / a11y / type-safety polish | Medium/Low | **W6** |

## Science Advantage (`science-advantage-full_20260626/migration-tracks.md`)

| Track | Severity | Wave |
|---|---|---|
| ST-1 Gamification authorization & tenant scoping | High | **W4** |
| ST-2 `lib/services/**` auth & tenancy | High | **W4** |
| ST-3 Seed-data contract & safety | High | W2 |
| ST-4 Route/contract correctness | Medium | **W4** |
| ST-5 Component decomposition & JSDoc | Medium | **W6** |
| ST-6 Build/deploy de-Prisma | High (deploy) | **W5** |
| ST-7 Documentation truth-up | Medium | **W6** |
| ST-8 Track-spec hardening | Medium | **W6** |
| SP-1 Observability adapter enforcement | P0 | W2 |
| SP-2 Real Redis/cache adapter | P1 | **W6** |
| SP-3 TenantDB adoption lint/guard | P2 | **W4** |
| SP-4 Test-fixture tenancy guard | P0 | W2 |

## Marketing App (`marketing-app_20260626/migration-tracks.md`)

| Track | Severity | Wave |
|---|---|---|
| marketing_api_authz | Critical | W3 |
| marketing_zod_boundaries | High | W3 |
| marketing_ai_adapter | High | W3 (via W2 adapter) |
| marketing_schema_integrity | Medium | **W5** |
| marketing_ux_error_handling | Medium | **W5** |
| marketing_i18n | Medium | **W5** |
| marketing_test_truth_backfill | Medium | **W6** |

## Public Website www (`www-reading-advantage_20260626/migration-tracks.md`)

| Track | Severity | Wave |
|---|---|---|
| T1 Broken lead-capture forms | Critical | **W5** |
| T2 Empty layout components | Critical | **W5** |
| T3 SEO metadata / client-render SEO | Critical | **W5** |
| T4 Reconcile launch datelines | Critical/High | W3 |
| T5 "Nine products" narrative | High | W3 |
| T6 Restore missing static assets | High | **W5** |
| T7 Placeholder case-study content | High | W3 |
| T8 i18n completeness pass | High | **W5** |
| T9 Blog security hardening (HTML sanitize + Zod) | High | **W4** |
| T10 AI-model & efficacy-stat claims | High/Medium | W3 |
| T11 Accessibility remediation | High/Medium | **W5** |
| T12 Stale comparison/pricing data | High/Medium | **W5** |
| T13 Add Services to primary navigation | Medium | **W5** |
| T14 Centralize contact details | Medium | **W5** |
| T15 Typed locale accessors | Medium | **W5** |
| T16 Test hygiene | Medium | **W5** |
| T17 Legal copy review ("ZERO RISK") | Medium | **W5** |
| T18 Minor cleanup | Low | Deferred |

## Advantage Games (`advantage-games_20260626/migration-tracks.md`)

| Track | Severity | Wave |
|---|---|---|
| T1 Unify completion/scoring contract | Tier 1 (Critical for import) | W3 |
| T2 Tenant-safe persistence + leaderboard | Tier 1 (Critical for import) | W3 |
| T3 i18n + embeddable navigation | Tier 1 (High) | W3 |
| T4 Shared games package / single runtime | Tier 1 (High) | W3 |
| T5 Fix non-functional / scoring-bug games | Tier 2 (High/Medium) | **W6** |
| T6 Difficulty system unification | Tier 2 (Medium) | **W6** |
| T7 Accessibility & age-appropriate UX baseline | Tier 2 (High/Medium) | **W6** |
| T8 Performance & mobile/browser hardening | Tier 2 (Medium) | **W6** |
| T9 Test integrity uplift | Tier 3 (Medium) | **W6** |
| T10 CI & repo hygiene | Tier 3 (Medium) | **W6** |
| T11 Agent-skill & Measure-artifact cleanup | Tier 3 (Low) | Deferred |

## Explicitly deferred (Low severity / non-blocking)

These are intentionally **not** scheduled into Waves 0–6 and should be picked up opportunistically or in a future cleanup track. They are listed here so the deferral is recorded, not silent:

- Reading M-RA-SEC-11 (AI adapter consistency, Low).
- www T18 minor cleanup (dead code, hover states, FAQ animation, asset naming, Low).
- Advantage Games T11 (agent-skill & Measure-artifact cleanup, Low).
- Roadmap Medium/Low band documentation drift not otherwise captured by Science ST-7 / CodeCamp MT-C4.

> Sequencing note: W5's three **Critical** www items (T1 forms, T2 components, T3 SEO) are public-conversion/SEO defects that fell outside W3's claims-only scope. They have no dependency on W0–W2 foundations and may be pulled forward independently if public-site conversion is a priority.
</content>
</invoke>
