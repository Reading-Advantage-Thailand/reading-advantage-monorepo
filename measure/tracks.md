# Project Tracks

This file tracks all major tracks for the project.

---

## Current Focus (updated 2026-06-05)

Two parallel programs are in flight; priority order when picking the next track:

1. **science-advantage audit remediation.** The 4 Critical tracks are done (domain
   migration, tenancy, argon2id, audit log). CI alignment track is **complete**
   — `ignoreBuildErrors: true` removed, CI gate wired. Resume #6–#10 (storage,
   zod, domain-decomp, observability, rate-limiter), then #12 housekeeping.
2. **Next audits.** Schedule `reading-advantage` and `primary-advantage` AGENTS.md
   audits (see §Pending Audits below). reading-advantage's domain-bypass (209 route.ts
   files) and primary-advantage's still-active Prisma are larger than anything the
   science pilot covered.
3. **codecamp-advantage productization** (deployment, prod-QA, exercise-repos) proceeds
   independently; lower priority than securing the shared packages above.

---

## Monorepo Feature Review Program (created 2026-06-26)

> Planning program to review every app feature, shared package, integration boundary,
> and cross-app workflow in the monorepo. These tracks are review/planning tracks only;
> remediation must be opened as separate Measure tracks after findings are accepted.

- [ ] **Track: Reading Advantage Full Feature Review** *Link: [./tracks/reading_advantage_full_review_20260626/](./tracks/reading_advantage_full_review_20260626/)*
  Reviews the oldest and largest legacy app, including direct DB/domain-bypass risk,
  Firebase remnants, student/teacher/admin workflows, AI/content/audio/flashcard flows,
  and migration-track proposals. Supersets the existing AGENTS.md audit stub. *Planning output complete for roadmap purposes; remediation ownership is now assigned through Waves 0-6.*
- [ ] **Track: Science Advantage Review** *Link: [./tracks/science_advantage_review_20260626/](./tracks/science_advantage_review_20260626/)*
  Reviews the new architecture-baseline app and verifies prior audit remediation held. *Planning output complete for roadmap purposes; remediation ownership is now assigned through Waves 0-6.*
- [ ] **Track: CodeCamp Advantage Review** *Link: [./tracks/codecamp_advantage_review_20260626/](./tracks/codecamp_advantage_review_20260626/)*
  Reviews intern training, curriculum progression, GitHub workflows, webhooks, AI PR review,
  admin reporting, and production readiness. *Planning output complete for roadmap purposes; remediation ownership is now assigned through Waves 0-6.*
- [ ] **Track: Sales Advantage Review** *Link: [./tracks/sales_advantage_review_20260626/](./tracks/sales_advantage_review_20260626/)*
  Reviews sales coaching, audio roleplay, storage, multimodal AI evaluation/fallbacks,
  progress, admin flows, and sales-domain contracts. *Planning output complete for roadmap purposes; remediation ownership is now assigned through Waves 0-6.*
- [ ] **Track: Advantage Games Review** *Link: [./tracks/advantage_games_review_20260626/](./tracks/advantage_games_review_20260626/)*
  Reviews the reusable game inventory, shared runtime, scoring/XP/leaderboards,
  mobile/accessibility, and import readiness for Reading/Primary. *Planning output complete for roadmap purposes; remediation ownership is now assigned through Waves 0-6.*
### Monorepo Review Remediation Waves (created 2026-06-28)

> Detailed implementation tracks spawned from `monorepo_review_roadmap_20260626`. Each track includes evidence references back to the line-review artifacts and should be executed in wave order unless a dependency note explicitly allows parallel work.

- [ ] **Track: Wave 4 — App Security & Correctness Backlog (Medium+)** *Link: [./tracks/wave4_app_security_correctness_backlog_20260628/](./tracks/wave4_app_security_correctness_backlog_20260628/)*
  Close remaining Medium+ security/tenant/authz/correctness tracks not in Wave 1. Evidence: Science ST-1/ST-2/ST-4; Reading SEC-6..10 / PB-4..8; CodeCamp MT-8..11/13/14; Sales T5/T8/T9; Primary M7/M9; www T9.
- [ ] **Track: Wave 5 — Public Surface Completion** *Link: [./tracks/wave5_public_surface_completion_20260628/](./tracks/wave5_public_surface_completion_20260628/)*
  Finish non-claims public-surface defects: www forms/SEO/assets/i18n/a11y/comparison/nav/contact/test-hygiene, marketing schema/UX/i18n, Science de-Prisma deploy. Evidence: www T1/T2/T3/T6/T8/T11..T17; marketing schema/UX/i18n; Science ST-6.
- [ ] **Track: Wave 6 — Quality, i18n, Accessibility, Adapters & Docs Completion** *Link: [./tracks/wave6_quality_i18n_accessibility_completion_20260628/](./tracks/wave6_quality_i18n_accessibility_completion_20260628/)*
  Close remaining Medium maintainability/adapter/i18n/a11y/test-quality/curriculum/docs tracks. Evidence: M-SF-6; Primary M10/M12/M13; Sales T10/T11; Science ST-5/ST-7/ST-8/SP-2; CodeCamp MT-C1..C4/MT-X1; Games T5-T10; marketing test backfill.

> **Coverage of record:** `audit-reports/monorepo-review-roadmap_20260626/medium-plus-coverage-matrix.md` maps every Medium-and-above migration track to exactly one wave (W0–W6). Low-severity items are listed there as explicitly deferred.

---

## Advantage Play Kit Program (created 2026-07-10)

- [~] **Track: APK Incomplete Sentence Action W1** *Link: [./tracks/apk_incomplete_sentence_action_20260710/](./tracks/apk_incomplete_sentence_action_20260710/)*
  Build the zero-implementation Astral Mage and The Sorcerer's Ziggurat catalog entries as distinctive Phaser 4 sentence cartridges; establish reusable target-action and isometric-step families; prove both editions and consuming hosts; and replace their dead coming-soon links with QC-testbed deep links without widening the stable educational ABI.

---

## App Go-Live / MVP Completion (created 2026-07-01)

> Deploy-and-ship tracks for the two apps that are feature-built but not on Cloud Run.
> These own build/deploy/QA only; they **consume** the security remediation waves as hard
> preconditions and do not duplicate them (see `medium-plus-coverage-matrix.md`).

- [ ] **Track: Sales Advantage Go-Live** *Link: [./tracks/sales_advantage_golive_20260701/](./tracks/sales_advantage_golive_20260701/)*
  Take `apps/sales-advantage` from code-complete to a deployed MVP. Feature surface (domain,
  router, audio-upload route, rep/admin UI, chat, quiz, seed script) already exists on HEAD;
  `sales_advantage_mvp_20260622` Phases 3–7 are implemented (checkboxes stale). This track
  hard-gates on Wave 1 sales security (IDOR/route-gating/tRPC role-enum/XSS/schema drift),
  seeds + human-approves real curriculum, adds Docker/cloudbuild, provisions the cloud
  `sales_advantage` DB, deploys to Cloud Run, and runs end-to-end QA. Successor to
  `sales_advantage_mvp_20260622` Phase 8.

- [ ] **Track: Marketing Go-Live** *Link: [./tracks/marketing_golive_20260701/](./tracks/marketing_golive_20260701/)*
  Take `apps/marketing` (the video-production pipeline; FR-1..FR-6 met, 151 tests green in the
  archived `video_pipeline_20260613`) from feature-complete to a deployed MVP. The deferred
  `vinext`/`vite parseSync` build blocker is **resolved** (`pnpm --filter marketing build`
  green on 2026-07-01) — Phase 0 verifies + pins it. Hard-gates on Wave 3 marketing security
  (the `GET /api/settings` decrypted-API-key leak + unauthenticated `/api/video/*` routes),
  adds a **vinext-runtime** Dockerfile + cloudbuild, provisions the DB, deploys to Cloud Run,
  and runs manual QA. Successor to the deferred build/deploy remainder of `video_pipeline_20260613`.

---

## Archived Tracks

- [x] **Track: Phaser 4 Advantage Play Kit** *Link: [./archive/advantage_play_kit_20260710/](./archive/advantage_play_kit_20260710/)*
  Archived 2026-07-10 after product-owner QC approval. Delivered the frozen educational I/O ABI, Phaser 4 runtime, Primary Chibi and Secondary Epic edition seam, three representative cartridges, the Advantage Games QC testbed, and Reading/Primary package-consumption proofs. Product public IDs, all-game host registries, and exact legacy deletion evidence continue in `apk_catalog_cutover_w0_20260710`.

- [x] **Track: APK Catalog Cutover W0** *Link: [./archive/apk_catalog_cutover_w0_20260710/](./archive/apk_catalog_cutover_w0_20260710/)*
  Archived 2026-07-10 after product-owner approval. Published `dragon-flight`, `dungeon-liberator`, and `magic-defense`; proved all three in the QC host and typed Reading/Primary registries under both audience editions; preserved the sentence/vocabulary/result ABI; and recorded 55 exact legacy dispositions. This is package and host-consumption proof, not a claim that production student routes already mount the cartridges.

- [x] **Track: Shared Foundation Review** *Link: [./archive/shared_foundation_review_20260626/](./archive/shared_foundation_review_20260626/)*
  Archived 2026-06-27 after the superseding line-by-line review completed coverage of 516 shared-package files / 110277 lines with 85 evidence files and 34 LR findings.   This is review-completeness closeout only; the shared foundation is not claimed fixed or product-green, and source remediation remains for separate tracks.

- [x] **Track: Marketing App Review** *Link: [./archive/marketing_app_review_20260626/](./archive/marketing_app_review_20260626/)*
  Archived 2026-06-27 after line-by-line review completed coverage of 45 marketing-app files / 4966 lines with 7 evidence files and 44 LR findings (3 Critical, 6 High, 18 Medium, 17 Low). This is review-completeness closeout only; the marketing app is not claimed fixed or product-green, and all 44 findings plus 7 migration-track proposals await separate remediation tracks. The lint/type/test/build gate and graph-count task were deferred as review-execution (acceptable for a review-only track).

- [x] **Track: Primary Advantage Full Feature Review** *Link: [./archive/primary_advantage_full_review_20260626/](./archive/primary_advantage_full_review_20260626/)*
  Archived 2026-06-27 after line-by-line review completed coverage of 446 Primary-Advantage files / 118709 lines with 103 evidence files, 893 findings (66 Critical / 177 High / 302 Medium / 348 Low), and fork-divergence classification (414 fork regressions, 213 shared root causes, 115 adaptation risks, 80 intentional divergences, 71 migration blockers). This is review-completeness closeout only; the Primary Advantage app is not claimed fixed or product-green, and all 893 findings plus 13 migration-track proposals await separate remediation tracks. The Phase 5 build gate was deferred as review-execution (acceptable for a review-only track).

- [x] **Track: Company Website Review** *Link: [./archive/www_reading_advantage_review_20260626/](./archive/www_reading_advantage_review_20260626/)*
  Archived 2026-06-27 after line-by-line review completed coverage of 130 src files / 20033 ts/tsx lines with 10 batch evidence files and 44 LR findings (7 Critical, 12 High, 15 Medium, 10 Low) across 11 categories. This is review-completeness closeout only; the company website is not claimed fixed or product-green, and all 44 findings plus 18 migration-track proposals await separate remediation tracks. The lint/type/test/build/browser/performance/graph gates were deferred as review-execution (acceptable for a review-only track).

- [x] **Track: Cross-App Workflows Review** *Link: [./archive/cross_app_workflows_review_20260626/](./archive/cross_app_workflows_review_20260626/)*
  Archived 2026-06-29. Synthesizes risks across auth, tenancy, AI, storage, UI reuse, games imports, deployment, observability, and test strategy. Status: COMPLETE as review synthesis — artifacts in `measure/audit-reports/cross-app-workflows_20260626/`; product remediation remains for follow-up tracks. Track dir moved and `metadata.json` status flipped to archived by daily automation on 2026-06-29.

- [x] **Track: Monorepo Review Roadmap** *Link: [./archive/monorepo_review_roadmap_20260626/](./archive/monorepo_review_roadmap_20260626/)*
  Archived 2026-06-29. Final synthesis track that deduplicates accepted findings and produces the prioritized remediation/migration/test/product-risk roadmap. Status: COMPLETE as final review roadmap — artifacts in `measure/audit-reports/monorepo-review-roadmap_20260626/`; no remediation performed. Track dir moved and `metadata.json` status flipped to archived by daily automation on 2026-06-29.

- [x] **Track: Wave 0 — Shared Safety Foundations** *Link: [./archive/wave0_shared_safety_foundations_20260628/](./archive/wave0_shared_safety_foundations_20260628/)*
  Archived 2026-07-01 after final acceptance pass. Tenant registry/fail-closed TenantDB, shared auth/roles/rate limiter, contracts/types tests, API/domain boundary enforcement, and typed error mapping all verified. 33 plan tasks complete; 16 implementation commits including db test sync, audioStorageKey nullable fix, auth env guard, and postgres rate limiter. Evidence: MR-C01, MR-C02, MR-C04, MR-C05; CA-001..CA-004/CA-009; M-SF-1..M-SF-5.

- [x] **Track: Wave 1 — Stop Active High-Risk Product Failures** *Link: [./archive/wave1_high_risk_product_failures_20260628/](./archive/wave1_high_risk_product_failures_20260628/)*
  Archived 2026-07-02. High-risk slices fixed across Primary (completion/session/flashcard/dashboard), Reading (classroom auth/audit/XP idempotency/AI contracts), CodeCamp (TenantDB/webhook idempotency/ACK latency/streaming protocol), and Sales (IDOR/audio validation/consent/nullability contracts). Medium+ remainder explicitly owned by Waves 4 and 6 per medium-plus-coverage-matrix.md; aggregate type-check/tests red only from pre-existing non-Wave-1 failures.

- [x] **Track: Wave 2 — Restore Deployment/Test/Provider Confidence** *Link: [./archive/wave2_confidence_restoration_20260628/](./archive/wave2_confidence_restoration_20260628/)*
  Archived 2026-07-03. Migration/seed governance gates, provider-adapter enforcement (barrel quarantine + guards), false-green test-signal cleanup, and 5 reusable test harnesses delivered; broad console.error sweep + full AIClient adoption deferred to Wave 6, www i18n to Wave 5. Aggregate reds are pre-existing/owner-labeled, not Wave 2.

- [x] **Track: Wave 3 — Product-Facing Truth and Reusable Surfaces** *Link: [./archive/wave3_product_alignment_20260628/](./archive/wave3_product_alignment_20260628/)*
  Archived 2026-07-05 after final acceptance. Tier 1 public-claims floor resolved (phase-w3-claims 20/20), Marketing public routes secured (phase-w3 44/44), shared games completion/leaderboard contract + tenant-safe persistence delivered (domain games 524 + games-live 524 + tenant-coverage exit 0), haunted-library proven pilot-import-ready (import-harness 9/9). Tier 2 [NEEDS-PO] questions remain deferred:po. 24 remaining games + dragon-rider navigation-fix sample NOT-READY/AT-RISK pending successor-track per-game migration. Findings MR-H05/CA-013/D-07/D-09/D-11 remain open.

- [x] **Track: Scaffold monorepo and migrate first app**
  *Link: [./archive/monorepo-scaffold_20260429/](./archive/monorepo-scaffold_20260429/)*

---

### Migration Queue

- [x] **Track: Migrate reading-advantage into monorepo**
  *Link: [./archive/migrate-reading-advantage_20260501/](./archive/migrate-reading-advantage_20260501/)*
- [x] **Track: Migrate primary-advantage into monorepo**
  *Link: [./archive/migrate-primary-advantage_20260501/](./archive/migrate-primary-advantage_20260501/)*
- [x] **Track: Migrate www-reading-advantage into monorepo**
  *Link: [./archive/migrate-www-reading-advantage_20260501/](./archive/migrate-www-reading-advantage_20260501/)*
- [x] **Track: Migrate science-advantage into monorepo**
  *Completed: 2026-05-02 (bulk-added in 3b93a05)*

---

### Infrastructure & Backend

- [x] **Track: Test Coverage Baseline** (29/29 tasks)
  *Link: [./archive/test_coverage_baseline_20260502/](./archive/test_coverage_baseline_20260502/)*
- [x] **Track: Unified CI/CD Pipeline** (18/18 tasks)
  *Link: [./archive/unified_ci_cd_pipeline_20260502/](./archive/unified_ci_cd_pipeline_20260502/)*
- [x] **Track: Shared Backend: Scaffold + Schema Unification** (27/27 tasks)
  *Link: [./archive/shared_backend_scaffold_20260502/](./archive/shared_backend_scaffold_20260502/)*
- [x] **Track: Shared Backend: Auth Migration** (15/15 tasks)
  *Link: [./archive/shared_backend_auth_20260502/](./archive/shared_backend_auth_20260502/)*
- [x] **Track: Shared Backend: API Route Migration** (9/29 core tasks complete)
  *Link: [./archive/shared_backend_api_20260502/](./archive/shared_backend_api_20260502/)*
  *Status: Tiers 1–2 routers implemented (users, classes, assignments, articles, progress, reports, auth). Tiers 3–4 (app-specific, AI) deferred to future tracks. Cookie-based auth update will be handled by unified auth track.*
- [x] **Track: Unified Auth System** (Phases 1–6 complete)
  *Link: [./archive/unified_auth_20260502/](./archive/unified_auth_20260502/)*
  *Status: Schema, auth pkg, auth-client, tRPC/API routes, reading+primary apps all done. next-auth fully removed. firebaseUid/JWT cleanup complete. Phase 5c (science-advantage) tracked separately.*
- [x] **Track: Shared Config Consolidation** (ESLint restructuring + 10 UI components added)
  *Link: [./archive/shared_config_consolidation_20260502/](./archive/shared_config_consolidation_20260502/)*
  *Status: Tailwind v4 unified, ESLint flat config migrated for primary/www, ESLint shared config restructured with composable baseConfig/plugins/ignores exports, advantage-games migrated to shared config, `cn()` deduped, 15 UI components in @reading-advantage/ui. Deferred: visual regression tests, shared i18n types, integration tests.*
- [x] **Track: i18n Migration (reading-advantage)** (19/19 tasks complete)
  *Link: [./archive/i18n_migration_20260502/](./archive/i18n_migration_20260502/)*
  *Status: next-intl config added, client/server exports rewritten, middleware migrated, next-international removed, localeImports dead code removed, flashcard imports fixed, stale locales.ts deleted. `configs/locale-config.ts` kept (still imported by 6 files). Build passes. Archived.*

---

### Pending Tracks

- [x] **Track: AGENTS.md Compliance Audit — science-advantage (pilot)** *Link: [./archive/agents_md_audit_science_advantage_20260603/](./archive/agents_md_audit_science_advantage_20260603/)*
  Pilot run of the audit protocol. Produces baseline checklist, findings classified by severity, and migration track proposals. Refines the protocol for the next-app rollout. *Status: COMPLETE — pilot finished, artifacts in `measure/audit-reports/science-advantage_20260603/`. Archived 2026-06-18.*

#### Pending Tracks — Audit Findings (science-advantage, 2026-06-03)

> Generated by the AGENTS.md compliance pilot audit. Full artifact set in `measure/audit-reports/science-advantage_20260603/` (`executive-summary.md`, `checklist.md`, `findings.md`, `migration-tracks.md`). 12 tracks proposed from 45 finding IDs (~38 unique issues). Critical tracks (#1–#4) should be opened in priority order before any new feature work in `apps/science-advantage/`.

- [x] **Track: Protocol v1.1 + graph.db Rebuild (pre-audit chore)** *Link: [./archive/protocol_v1_1_graphdb_20260603/](./archive/protocol_v1_1_graphdb_20260603/)*
  No implementation work; precondition for the next re-audit. Run `build-graph scan . ./graph.db`; add CI gate that fails if `graph.db` is empty. Update `measure/agents-md-audit-protocol.md` to v1.1 (add §3.6, §4.10, §5.10, §9.7; document multiline-safe scan method in §Severity Scheme). 1 day. Resolves F-1003. **Track 0 of the audit plan.**

- [x] **Track: App → Domain Layer Migration** (umbrella) *Link: [./archive/app_domain_migration_20260603/](./archive/app_domain_migration_20260603/)*
  *Status: COMPLETE — All 27 route.ts files migrated to domain functions (0 db imports in app/). 27 role === checks replaced with assertCan. 2 teacher pages migrated. lib/services/index.ts barrel created. packages/domain/src/teachers/ module created. Route code reduced ~84%. 335 integration tests pass. New domain modules: mastery, ai, interventions, classes (11 files), students (8 files), curriculum, teachers. 7 new permission keys added to packages/auth.*
  Get `apps/science-advantage/app/**` to import from `@reading-advantage/domain` instead of `@reading-advantage/db`. Subsumes F-305 (root) + F-203, F-208, F-306, F-307, F-405, F-701, F-702 (all symptoms). Pilot: `app/api/student/classes/route.ts` (already thin, uses `lib/services/classes/get-student-classes.ts`). Lift 9 `lib/services/*` files into `packages/domain/src/`. Migrate 5 high-traffic routes (`update-mastery`, `quiz`, `recommendations`, `assignments`, `intervention-alerts`), then 17 remaining. Replace 23 hand-rolled `role ===` checks with `assertCan`. ~4 weeks. **Critical; load-bearing.** **Track 1.**

- [x] **Track: TenantDB & schoolId Adoption** *Link: [./archive/tenant_db_school_id_20260603/](./archive/tenant_db_school_id_20260603/)*
  *Status: COMPLETE — Path (a) full migration. 17 science_* tables have school_id NOT NULL. 28 domain functions use createTenantDB. tenant-coverage.test.ts enforces guards. 2-school acceptance test verifies isolation. 260 domain tests pass, check-types/build green. Migration 0017 + backfill script.*

- [x] **Track: Argon2id Migration + Auth Adapter Flatten** *Link: [./archive/argon2id_password_20260603/](./archive/argon2id_password_20260603/)*
  Migrate `packages/auth/src/password.ts` from `bcryptjs` to `@node-rs/argon2`. One-shot migration path for existing bcrypt hashes (verify with bcrypt, re-hash on next successful login). Update 3 science-advantage seed scripts to import `hashPassword` from `@reading-advantage/auth`. Remove `bcryptjs` from `apps/science-advantage/package.json`. Delete `lib/auth/{session,server}.ts` (F-401) and re-point all callers to `@reading-advantage/auth`. Resolves F-401, F-402, F-406. 1 week. **Highest-leverage shared-package change** — unblocks 6 apps. **Critical.** **Track 3.**

- [x] **Track: Audit Log Infrastructure** *Link: [./archive/audit_log_infrastructure_20260603/](./archive/audit_log_infrastructure_20260603/)*
  *Status: COMPLETE — audit_events table with REVOKE UPDATE DELETE (append-only). recordAuditEvent + safeMetadata helper in packages/auth. Wired into createSession (login), deleteSession (logout), hashPassword (password:change). 4 science-advantage domain functions audited (assignment:create/delete, class:remove_student, class:delete). GET /api/admin/audit-events with Zod validation, ADMIN-only. 704 tests pass. Migration 0018.*

- [x] **Track: Audit Log Retention + DSAR Bulk Export** *Link: [./archive/audit_log_retention_dsar_20260605/](./archive/audit_log_retention_dsar_20260605/)*
  7-year FERPA retention policy with periodic (advisory-locked) cleanup job over `audit_events`. GDPR/FERPA DSAR (data subject access request) ADMIN-only, tenant-scoped bulk-export endpoint. **Follow-up to Track 4** (`audit_log_infrastructure_20260603`). *Status: COMPLETE — 7 phases done. Retention purge (privileged-connection, batched DELETE), periodic job (advisory lock), DSAR export (zip/json, ADMIN-only, tenant-scoped), E2E + boundary + quality-gate tests. 13 test files, 276+ tests pass.*

- [x] **Track: Shared `packages/ai` + `lib/ai/` Refactor** *Link: [./archive/ai_adapter_package_20260603/](./archive/ai_adapter_package_20260603/)*
  *Status: COMPLETE — All 10 phases done. `packages/ai` with `AIClient` interface, OpenAI/Google/Mock providers, `createAIClient`/`getAIClient` singleton; `RecommendationService` + `ImageGenerator` classes wired with constructor-injected `AIClient`; direct SDK deps removed from `apps/science-advantage`; docs updated; track archived 2026-06-06.*

- [x] **Track: Shared `packages/storage` S3-Compatible Package** *Link: [./archive/storage_package_20260603/](./archive/storage_package_20260603/)*
  *Status: COMPLETE — `packages/storage` with StorageClient interface, S3 driver, factory, URL helpers. `packages/integrations/github` with GitHubClient, REST driver, factory. `getPracticeIssues` refactored to use GitHubClient (no inline fetch, no `next: { revalidate }` cast in domain). `.env.example` updated. 18 tests pass. Resolves F-102, F-703.*

- [x] **Track: Zod Boundary + Env Hardening** *Link: [./archive/zod_boundary_hardening_20260603/](./archive/zod_boundary_hardening_20260603/)*
  Add Zod schemas to `lib/validations/` for the 21 routes missing validation. Add `parseBody(request, schema)` / `parseQuery(request, schema)` / `parsePath(params, schema)` helpers. Extend `lib/env.ts` to cover the full `.env.example` surface (22+ vars). Replace 17+ raw `process.env.*` reads in `lib/ai/*`, `lib/config/*`, `lib/analytics.ts`, `proxy.ts`. Add `.refine` rules for `AI_RECOMMENDER_HASH_SECRET` (≥32 chars). Resolves F-601, F-602, F-302 (partial), F-603, F-604, F-704. 1.5 weeks. **High.** **Track 7.** *Status: COMPLETE — All phases done. 21+ routes migrated to Zod validation. 0 `body as` casts. `lib/env.ts` covers 100% of `.env.example`. 17+ raw `process.env` reads replaced. 43 unit tests pass. Type-check + lint clean.*

- [x] **Track: Domain Module Decomposition + Per-Module `permissions.ts`** *Link: [./archive/domain_module_decomposition_20260603/](./archive/domain_module_decomposition_20260603/)*
  *Status: COMPLETE — All 9 phases done. 14 domain modules decomposed into 7-file structure (schema/contracts/queries/mutations/permissions/errors/index). codecamp/ split into 8 sub-modules (modules/lessons/exercises/quizzes/chat/progress/pr-reviews/intern-accounts). domainModulePermissions extension point in packages/auth with registerDomainModulePermissions/lookupPermission. 5 relations() blocks added to users/classrooms/science schemas. 3 raw sql` sites resolved. 276 domain tests pass, 0 lint errors, type-check/build green.*

- [ ] **Track: Observability Stack: Sentry + Request Context + Tracing** *Link: [./tracks/observability_stack_20260603/](./tracks/observability_stack_20260603/)*
  Add `@sentry/nextjs`; create `sentry.client.config.ts` and `sentry.server.config.ts`. Add `instrumentation.ts` registering Sentry + `@opentelemetry/sdk-node` + `@opentelemetry/exporter-trace-otlp-http`. Introduce `AsyncLocalStorage<RequestContext>` to auto-attach `requestId`/`userId`/`latencyMs` to every log. Migrate 5 largest `route.ts` files' catch blocks from `console.error` to `logger.error`. Wrap `generateObject` calls in real OTel spans. Resolves F-902, F-903, F-904, F-905, F-906. 1 week. **Medium.** **Track 9.**

- [x] **Track: Postgres-Backed Rate Limiter v2** *Link: [./archive/rate_limiter_v2_20260603/](./archive/rate_limiter_v2_20260603/)*
  Add `login_attempts` table in `packages/db/src/schema/auth.ts` (username, failed_count, window_start, last_attempt_at). Replace in-memory `Map` in `packages/auth/src/rate-limit.ts:9` with `SELECT ... FOR UPDATE` upsert. Add per-IP rate limit (30/15 min) alongside per-username (5/15 min). Add periodic cleanup job. Keep the in-memory `Map` as a dev-only fast-path. Resolves F-403, F-407. 1 week. **Medium.** **Track 10.** *Archived 2026-07-03. 36 of 39 tasks completed (3 deferred:infra for DB-backed integration tests pending INFRA-2). Full spec implemented: Postgres-backed store, per-IP + per-username throttling, cleanup job, captcha trigger hook, dev fast-path with dual gate. Unit + adversarial suites green (207 tests). Captcha follow-up started as separate track placeholder.***

- [x] **Track: CI Alignment + tsc Blocker Resolution (ci_typecheck_alignment_20260603)** *Link: [./archive/ci_typecheck_alignment_20260603/](./archive/ci_typecheck_alignment_20260603/)*
  Resolve the 360 tsc errors masking by `next.config.ts:25` `ignoreBuildErrors: true`: add `@testing-library/jest-dom/vitest` to `vitest.unit.setup.ts` (~354 errors); fix INTERN role widening in `lib/auth/session.ts:40,79` (2); add `lib/auth/{password,rate-limit}.test.ts` siblings (2); type-cast `process.env` reads (3); dedupe next@16 instances (4); misc (4). Add `"check-types": "tsc --noEmit"` to `apps/science-advantage/package.json`; remove `ignoreBuildErrors: true`. Delete the dead/drifted `apps/science-advantage/.github/workflows/ci.yml`; add a `path-filter: apps/science-advantage/**` token to the monorepo root `.github/workflows/ci.yml`. Fix the 4 `react-hooks/immutability` errors in `components/features/teacher/analytics/student-lesson-detail-analytics.tsx:151,155,186`; silence 6 unused-var warnings in `lib/gamification/badges.ts:114,202`. Resolves F-1001, F-1002, F-1003, F-1204, F-1205. 2 weeks. **High.** **Track 11.** Cross-references existing `measure/tech-debt.md` row `auth_strategy_review` (2026-05-03). **⚑ PROMOTED — do this next, ahead of audit tracks #6–#10** (see §Current Focus): it is the CI gate that protects the just-completed Critical security work.

- [x] **Track: Audit Housekeeping Batch** *Link: [./archive/housekeeping_batch_20260603/](./archive/housekeeping_batch_20260603/)*
   Batched Low-priority cleanup: relocate `prisma/` legacy seed-data → `scripts/seed-data/` and delete `prisma/`; verify or delete 4 auth `route.ts` stubs (F-705); update `apps/science-advantage/AGENTS.md` to remove Prisma + `npm` references (F-1102); add `*.log` to `.gitignore`; backfill 5 orphan in-code `TODO`s with GH issues; re-pin 51 `^`-ranged deps; add `git notes` to 24 `refactor(science):` ports; add `docs/adr/` directory with 3 ADRs; add `commitlint` config to enforce subject-line track reference. Resolves F-205, F-503, F-705, F-1102, F-1201, F-1202, F-1207, F-1301, F-1305, F-1306. 1–2 days. **Low.** **Track 12.** *Archived 2026-06-19.*

- [ ] **Track: Captcha Verification Integration** *Link: [./tracks/captcha_verification_20260703/](./tracks/captcha_verification_20260703/)*
  Integrate a real captcha provider (reCAPTCHA, hCaptcha, or Cloudflare Turnstile) with the `captchaRequired` trigger added by `rate_limiter_v2_20260603`. Verifies `captchaToken` on login when `captchaRequired` is set. **Follow-up to Track 10** (`rate_limiter_v2_20260603`).

#### Pending Audits — Next-App Rollout (scheduled 2026-06-10)

> The science-advantage audit was a **pilot**. The two largest known compliance gaps in
> the monorepo live in apps the pilot never touched. Both are open **Critical** rows in
> `measure/tech-debt.md` (`audit_20260526`). Run with protocol v1.1 + a fresh `graph.db`.

- [ ] **Track: AGENTS.md Compliance Audit — reading-advantage** *Link: [./tracks/reading_advantage_agents_md_audit_20260610/](./tracks/reading_advantage_agents_md_audit_20260610/)*
  **STUB — scheduled 2026-06-10.** Largest known gap: **209** `app/**/route.ts` files import `db` directly, **0** route through `@reading-advantage/domain`/`assertCan`/`TenantDB` (~8× the science pilot's F-305 surface). Produces the audit artifact set + proposed migration tracks; reconciles `audit_20260526`.

- [ ] **Track: AGENTS.md Compliance Audit — primary-advantage** *Link: [./tracks/primary_advantage_agents_md_audit_20260610/](./tracks/primary_advantage_agents_md_audit_20260610/)*
  **STUB — scheduled 2026-06-10.** Known blocker: Prisma is **still fully active** (15 files import `@prisma/client`; schema/migrations/`lib/prisma.ts` present; deps intact) — the migration was **incorrectly recorded as complete**. Audit verifies migration state first, then runs the 13-section protocol; coordinates with Prisma→Drizzle Track 4.

- [x] **Track: Tech Debt Resolution** *Link: [./archive/tech_debt_resolution_20260503/](./archive/tech_debt_resolution_20260503/)*
  Resolve 16 open tech-debt items not covered by other tracks. Phases: critical infra (Prisma→Drizzle, auth migration SQL), build config cleanup (ignoreBuildErrors removal), schema integrity, app-specific fixes, shared tooling.
- [x] **Track: Reading-Advantage Build Remediation** *Link: [./archive/reading_advantage_build_remediation_20260503/](./archive/reading_advantage_build_remediation_20260503/)*
  Fix 128 lint warnings, 26 failed test suites, and remove ignoreBuildErrors. *Status: COMPLETE — Core tests fixed (184 tests). ESLint v9 flat config created. Build verification deferred to faster hardware.*
- [x] **Track: Primary-Advantage Stabilization** *Link: [./archive/primary_advantage_stabilization_20260503/](./archive/primary_advantage_stabilization_20260503/)*
  Fix 49 lint errors, add Vitest test suite, remove ignoreBuildErrors. *Status: COMPLETE — All 35 lint errors fixed. Vitest 35/35 tests pass. Build verification deferred to faster hardware.*
- [x] **Track: Shared ESLint v9 Flat Config Migration** *Link: [./archive/shared_eslint_v9_migration_20260503/](./archive/shared_eslint_v9_migration_20260503/)*
  Fix plugin resolution across workspace boundaries, migrate reading-advantage to v9. *Status: COMPLETE — reading-advantage migrated to eslint.config.mjs. All 5 apps on flat config. Plugin resolution verification deferred to faster hardware.*
- [x] **Track: Science-Advantage Auth Migration** (26/26 tasks) *Link: [./archive/science_auth_migration_20260503/](./archive/science_auth_migration_20260503/)*
  Migrate from standalone Prisma auth to shared @reading-advantage/auth, auth-client, and db packages. Build passes, auth files lint clean. Non-auth Prisma (curriculum, lessons) preserved.
- [x] **Track: Monorepo Tech-Debt Cleanup** *Link: [./archive/tech_debt_cleanup_20260505/](./archive/tech_debt_cleanup_20260505/)*
  Resolve 7 remaining open tech-debt items: react/zustand dependency alignment, advantage-games ESLint warnings, science-advantage analytics lint, flaky perf tests, shared i18n types, and visual regression tests.

---

### www-reading-advantage Website Updates (Based on Real Implementation)

- [x] **Track: Update Science Advantage Product Page** *Link: [./archive/www_science_product_update_20260517/](./archive/www_science_product_update_20260517/)*
  Update marketing page from "Coming 2025" to reflect actual implemented features: student dashboards, teacher intervention alerts, AI recommendations, NGSS-aligned curriculum. Add real screenshots and role-based CTAs. *Status: COMPLETE — Page updated with Early Access badge, student features (join classes, interactive lessons, progress tracking, AI recommendations), teacher features (intervention alerts, class analytics, student progress, assignments), and platform features. All 7 tests passing, lint clean. Commit: 1c384a1*

- [x] **Track: Update CodeCamp Advantage Product Page** *Link: [./archive/www_codecamp_product_update_20260517/](./archive/www_codecamp_product_update_20260517/)*
  Update marketing page from "Coming Soon" to reflect deployed platform: 18+ module curriculum, AI chat tutor, GitHub PR review automation, intern management. Add curriculum timeline and feature highlights. *Status: COMPLETE — Page updated with 4-phase curriculum (18 modules), AI tutor, GitHub integration, and progress tracking features. All 7 tests passing, lint clean. Commit: e27afc5*

- [x] **Track: Create Advantage Games Showcase Page** *Link: [./archive/www_games_showcase_20260517/](./archive/www_games_showcase_20260517/)*
  Create dedicated games showcase page highlighting all 27 implemented educational games with XP system, leaderboard, adaptive difficulty, and cross-platform integration info.

- [ ] **Track: Refresh Product Pages with Real Features** *Link: [./tracks/www_product_features_refresh_20260517/](./tracks/www_product_features_refresh_20260517/)*
  Update Reading Advantage and Primary Advantage pages with accurate feature lists (AI content generation, 12-level system, FSRS flashcards, workbook generator, read-along audio, school rankings). Add actual app screenshots and feature comparison matrix.

- [ ] **Track: Create Unified App Directory Page** *Link: [./tracks/www_app_directory_20260517/](./tracks/www_app_directory_20260517/)*
  Create central app directory (/apps) showcasing all 5 products with role-based filtering (Student, Teacher, Admin, Parent, Intern), helping users navigate the ecosystem and choose the right platform.

- [x] **Track: www-reading-advantage i18n/l10n Remediation** (6/6 phases) *Link: [./archive/www_i18n_l10n_remediation_20260527/](./archive/www_i18n_l10n_remediation_20260527/)*
  Remedy 12 missing translation keys (header nav) and 183 hardcoded English strings across 19 page/component files. *Status: COMPLETE — All 6 phases done. Audit gate passes: 0 missing keys, 0 hardcoded strings. Build passes. 1198 tests pass (11 test files have pre-existing next-intl module resolution failures). ESLint clean.*

- [x] **Track: Marketing Video Production Pipeline** *Link: [./archive/video_pipeline_20260613/](./archive/video_pipeline_20260613/)*
  In-flight marketing video pipeline for `apps/marketing`: topic research + deduplication, LLM-generated Thai marketing scripts with 5–7 scenes, scene editor, and project persistence. Formalized 2026-06-23; Phase 1–6 implementation committed and tests green (151/151 marketing tests on 2026-06-30). Phase 7 build deferred to repo-owner (vinext/vite `parseSync` incompatibility) and manual QA deferred to Phikul. Archived 2026-06-30.

---

- [x] **Track: codecamp-advantage — Full-Stack Web Dev Intern Bootcamp**
  *Link: [./archive/codecamp_advantage_20260513/](./archive/codecamp_advantage_20260513/)*
  *Status: COMPLETE — All 8 phases done. 18-module curriculum, GitHub integration (webhook + LLM review), admin dashboard, chat tutor, workflow tracker. Build passes, all tests green (domain: 159, api: 86, webhooks: 31, codecamp: 49). Subagent reviews completed with findings resolved.*

- [x] **Track: codecamp-advantage — Curriculum Implementation**
  *Link: [./archive/codecamp_curriculum_20260514/](./archive/codecamp_curriculum_20260514/)*
  Replace placeholder 5-module seed with the full 18-module, 85-lesson curriculum. Add phase column to schema, rewrite seed with real lesson content from curriculum plans, wire phase-grouped queries to dashboard UI, validate with tests. *Status: COMPLETE (metadata.json `completed`; archived). Checkbox reconciled 2026-06-05.*

- [x] **Track: codecamp-advantage — Exercise Repos & Portfolio Projects**
  *Link: [./archive/codecamp_exercise_repos_20260515/](./archive/codecamp_exercise_repos_20260515/)*
  Create 16 exercise repos and 3 portfolio project repos on GitHub, update seed data with real URLs, configure GitHub App webhooks, and validate the fork→PR→LLM review cycle end-to-end. *Status: COMPLETE — 16 exercise repos + 3 portfolio repos created on Reading-Advantage-Thailand org. GitHub App installed on all 18 repos. Seed data updated with real URLs (MODULE_REPO_MAP explicit-map approach, M1/M16 excluded, M18→capstone). E2E pipeline verified 2026-05-25 via scripts/codecamp-pr-e2e.sh (real PR #3, full webhook→DB→LLM→PR-comment loop, ~25s). Quality gates: lint 0 errors, domain 314 tests pass, webhooks 78 tests pass. 2 UI-smoke verifications deferred (underlying contracts implemented and unit-tested). Out-of-scope regressions from other tracks do not affect this track. Archived 2026-06-23.*

- [x] **Track: codecamp-advantage — Exercise Lessons Backfill**
  *Link: [./archive/codecamp_exercise_lessons_20260602/](./archive/codecamp_exercise_lessons_20260602/)*
  Add missing `exercise` type lessons to 16 modules (only Git & GitHub has one). The seed script skips lessons for existing modules; this track backfills them and updates the seed to support incremental lesson insertion. Unblocks PR review → lesson completion flow. *Status: COMPLETE — 15 exercise lessons backfilled, seed script updated for incremental insertion, 243 tests pass, lint/type-check clean.*

- [x] **Track: codecamp-advantage — Thai Localization**
  *Link: [./archive/codecamp_thai_i18n_20260515/](./archive/codecamp_thai_i18n_20260515/)*
  Add Thai (th) locale as default, create th.json translations, build language switcher, localize admin dashboard, and make the chat tutor respond in Thai by default.
  *Status: COMPLETE — All 4 phases done. Thai locale default, full th.json with 181 keys, language switcher, admin/chat/component localization, locale-aware chat API, Thai font loading, text-width regression prevention, lesson-language badge, 463 passing tests across 21 files.*

- [x] **Track: codecamp-advantage — Deployment**
  *Link: [./archive/codecamp_deployment_20260516/](./archive/codecamp_deployment_20260516/)*
  Docker setup, shared Cloud SQL connectivity, CI/CD, environment configuration, HTTPS, DNS, and production deployment for codecamp-advantage. *Status: Core deployment done — production build deployed via `codecamp_pre_redeploy_remediation_20260518`. Checkbox reconciled 2026-06-05 (metadata.json still reads `in-progress`). Open follow-up: no automatic CI/CD deploy trigger — see `tech-debt.md` 2026-05-18.*

- [x] **Track: codecamp-advantage — Pre-Redeployment Remediation**
  *Link: [./archive/codecamp_pre_redeploy_remediation_20260518/](./archive/codecamp_pre_redeploy_remediation_20260518/)*
  Fix audited curriculum/runtime blockers before redeploying: module progression deadlock, prerequisite enforcement, canonical seed cleanup, GitHub username attribution, manual PR review flow, missing portfolio repos, Module 18 issue workflow, curriculum fidelity tests, rubrics, and redeployment readiness gates. *Status: COMPLETE + REDEPLOYED — 1004 targeted tests passing, Codecamp lint/type/build green, production build `6e53d3fe-4520-45bf-a6a1-292cfde07dfc` plus create-intern hotfix `1cbca5ca-92be-4d8a-a73e-1f8c4d0e506b`, DB changes applied through `0012_codecamp_intern_role.sql`, seed completed, smoke tests passed. Remaining external: GitHub App install on two portfolio repos plus real fork→PR→review Production QA.*

- [x] **Track: codecamp-advantage — Local QA/QC Testing**
  *Link: [./archive/codecamp_qa_local_20260517/](./archive/codecamp_qa_local_20260517/)*
  Comprehensive manual QA testing on local dev server. Covers auth, i18n, dashboard, lessons, quizzes, AI chat, PR workflow, admin panel, edge cases, and performance. *Status: COMPLETE — 41 tests passed, 0 failed, 0 partial. All 5 issues fixed: Chat AI (API key rotated), Quiz progress save (Date→ISO string), PR form (verified working), Locked module UX (tooltip added), Dashboard ARIA (role=progressbar added). Full report at measure/archive/codecamp_qa_local_20260517/qa-report.md*

- [ ] **Track: codecamp-advantage — Cloud Run Cold-Start Fix**
  *Link: [./tracks/codecamp_infra_cold_start_20260608/](./tracks/codecamp_infra_cold_start_20260608/)*
  Fix Cloud Run cold-start time exceeding the 5-second P0 budget.

- [ ] **Track: codecamp-advantage — Warm Dashboard Performance**
  *Link: [./tracks/codecamp_perf_warm_dashboard_20260608/](./tracks/codecamp_perf_warm_dashboard_20260608/)*
  Bring the warm-dashboard page load under the 1000ms P1 budget.

- [x] **Track: codecamp-advantage — AI Review Visibility**
  *Link: [./archive/codecamp_ai_review_visibility_20260518/](./archive/codecamp_ai_review_visibility_20260518/)*
  Clarify when AI PR review is expected, expose latest PR links/status in admin reporting, and show no-review-expected guidance for non-PR modules such as Unit 1. *Status: COMPLETE — cohort dashboard latest PR link/status, intern detail module-level review expectation, and student no-review-expected module copy implemented with tests/typecheck/lint/build green.*

#### codecamp-advantage — PR-Review Pipeline Hardening (spec + plan written 2026-06-05)

> Two sequenced tracks that retire long-standing `tech-debt.md` rows on the LLM PR-review
> pipeline. Do the consolidation first (it gives the reliability track a single seam).

- [x] **Track: Consolidate Duplicate `generateReview` onto `packages/ai`** *Link: [./archive/codecamp_review_ai_consolidation_20260605/](./archive/codecamp_review_ai_consolidation_20260605/)*
  Collapse the two near-identical OpenRouter `generateReview` implementations onto the shared `AIClient` from `packages/ai` (committed `9c52c8a`); `reviewExercise` becomes the single seam. Adds an OpenRouter provider to `packages/ai` if absent. Resolves `tech-debt.md` 2026-05-15 "Duplicate `generateReview`". Depends on `ai_adapter_package_20260603`. **Do before the reliability track.**

- [x] **Track: Webhook → LLM Review Reliability (Postgres Retry + DLQ)** *Link: [./archive/webhook_review_reliability_20260605/](./archive/webhook_review_reliability_20260605/)*
  Replace the fire-and-forget review path with a Postgres-backed `review_jobs` queue (`FOR UPDATE SKIP LOCKED` claim, bounded jittered-backoff retries, dead-letter state + admin replay) and add the missing webhook → LLM → comment → DB integration tests. **No Redis/BullMQ** — Postgres-backed to match `rate_limiter_v2` / `LISTEN-NOTIFY` direction. Resolves `tech-debt.md` 2026-05-16 (retry/DLQ) + 2026-05-15 (no integration tests). Depends on the consolidation track above. *Archived 2026-07-04.*

---

### sales-advantage (new app — planned 2026-06-22)

- [x] **Track: sales-advantage MVP** *Link: [./archive/sales_advantage_mvp_20260622/](./archive/sales_advantage_mvp_20260622/)*
  Internal sales-coaching app for the Reading Advantage sales team + distributor reps. Mirrors codecamp-advantage's learn → practice → LLM-evaluates loop, replacing the git commit + GitHub webhook with **audio roleplay** + a direct upload route. Learner records themselves in a sales scenario (cold call, discovery, demo, objection, close); an **OpenRouter-hosted multimodal model** evaluates the audio directly (single-pass, no separate transcription step) against a rubric grounded in `advantage-pr/09-sales-enablement/` (battle cards, demo scripts, objection guide, ROI calculator, distributor rep onboarding). Primary model `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` (free, audio→text reasoning); fallback `google/gemini-2.5-flash-lite` (both via OpenRouter, single `OPENROUTER_API_KEY`). Linear curriculum (no Mastery Advantage KST/SRS engine in v1 — deferred to a follow-up track gated on the shared-package governance question). LLM-generated then human-reviewed curriculum. New `SALES_REP` + `SALES_ADMIN` roles. Single-tenant/global (EXEMPT in tenant-registry, like codecamp). Phase 0 extends `AIClient` with `generateObjectFromMedia` (OpenRouterProvider primary + GoogleProvider + MockProvider; OpenAIProvider throws). 9 phases (0–8). Depends on nothing in flight; the storage hardening track is independent.

---

- [x] **Track: Import www-reading-advantage Content & Video Pipeline** *[ARCHIVED]*
  *Link: [./archive/www_content_video_import_20260514/](./archive/www_content_video_import_20260514/)*
  Import blog posts (13 EN + 13 TH), cover images, Thai TikTok videos, and extract the video generation pipeline into a new `@reading-advantage/video-pipeline` monorepo package. Framework code (next-intl, React 19, Tailwind v4) preserved; only content/assets/scripts ported. *Superseded by tracks based on actual app implementation.*

---

### Infrastructure & Shared Packages

- [x] **Track: Dependency Upgrade Hardening and Alignment**
  *Link: [./archive/dependency_upgrade_hardening_20260607/](./archive/dependency_upgrade_hardening_20260607/)*
  Replace the vulnerable root `next@16.0.0` override; align Next/React/Vitest versions; apply reviewed patch/minor upgrades in bounded batches; resolve the Vitest and `react-day-picker` peer conflicts; remove deprecated type stubs; replace unsupported `fluent-ffmpeg`; dedupe the lockfile; and route major AI SDK/Zod/TypeScript/Jest/Zustand/Drizzle/pnpm migrations into dedicated follow-up tracks. Explicitly excludes Prisma 7 because primary-advantage is migrating to Drizzle.
  *Status: COMPLETE — Phases 1–4 done. Next 16.2.9 / React 19.2.7 / Vitest 4.1.8 aligned. react-day-picker v9 migration, ffmpeg-process utility, deprecated stub removal, lockfile freeze all delivered. 7 major-migration backlog tracks spawned. Archived 2026-06-23.*

- [x] **Track: Shared Storage Package — S3-Compatible Abstraction Layer** ⛔ **SUPERSEDED — DO NOT IMPLEMENT**
  *Link: [./archive/storage_s3_compat_20260522/](./archive/storage_s3_compat_20260522/)*
  **Superseded 2026-06-05 by `storage_package_20260603` (audit Track 6)**, which covers the same `packages/storage` `StorageClient` work plus the audit findings (F-102, F-703). This older stub is retained for history only; pick up Track 6 instead.
  Create `packages/storage` (`@reading-advantage/storage`) with a `StorageClient` interface backed by `@aws-sdk/client-s3`. Works with GCS (S3 interoperability), Cloudflare R2, and MinIO (local dev). Replaces duplicated `@google-cloud/storage` usage in reading-advantage and primary-advantage. Backend migration is a config/env-var change only.

- [x] **Track: Connection Pooling**
  *Link: [./archive/connection_pooling_20260522/](./archive/connection_pooling_20260522/)*
  Introduce a transaction-mode pooler (PgBouncer for GCP Cloud Run, or Cloudflare Hyperdrive for Cloudflare) between the app instances and the VPS Postgres; tune the `postgres-js` client (`prepare: false`, reduced `max`); split `DATABASE_URL` (pooled) from `DIRECT_DATABASE_URL` (migrations, `LISTEN/NOTIFY`). Independent of other tracks; prerequisite for the reactive query layer. *Status: COMPLETE 2026-05-25. All 4 phases done. Local docker-compose now runs PgBouncer 1.23.1 alongside postgres (port 6432). `buildPostgresOptions` sets `prepare:false` and env-tunable `max` (default 3). `drizzle.config.ts` + codecamp seed prefer DIRECT_DATABASE_URL with warning-on-fallback. Concurrency verified: 12 simulated app instances × max:3 driving 50 concurrent queries peaked at 8 backend connections (vs estimated 36 unpooled). tech-stack.md documents the topology. Production cutover (cloudbuild.yaml + DIRECT_DATABASE_URL secret) deliberately deferred — fallback keeps prod working.*

- [ ] **Track: Reactive Query Layer** — **STUB**
  *Link: [./tracks/reactive_query_layer_20260522/](./tracks/reactive_query_layer_20260522/)*
  Reactive queries on Postgres + Drizzle + tRPC. **Stub only** — captures design decisions settled 2026-05-22 (no codegen; domain layer is the instrumentation point; read/write seam; connection model; pooler caveat). Blocked on the Prisma→Drizzle migration (Track 4) and Connection Pooling; the reactivity approach (LISTEN/NOTIFY vs sync engine vs WAL) must be chosen before it can be planned.

- [x] **Track: JSDoc Comments for Shared Packages** (153 functions documented) [commit: 144b161]
  *Link: [./archive/jsdoc_shared_packages_20260530/](./archive/jsdoc_shared_packages_20260530/)*
  Add JSDoc comments to all 154 exported functions across 8 shared packages (domain, api, auth, db, webhooks, ui, auth-client, utils). Uses build-graph to track progress and verify completion. Exported functions first, bottom-up dependency order. *Status: COMPLETE — All 8 phases done. 153 functions documented. All tests pass (domain: 239, auth: 64, api: 94, db: 232). Verification script at scripts/verify-jsdoc.sh. build-graph scan timed out; use `build-graph scan . ./graph.db` to refresh summaries.*
- [x] **Track: AI SDK Major Migration** *(ai_sdk_major_migration)*
  *Link: [./archive/ai_sdk_major_migration/](./archive/ai_sdk_major_migration/)*
  Major migration of `@ai-sdk` packages to the next major version. Covers `generateText`, `streamText`, `embed`, tool calling, structured output, and provider adapters. Coordinated with the internal AI adapter layer in `packages/domain`. *Status: COMPLETE — metadata, tech-stack.md, and review findings from 2026-06-16 resolved. Archived 2026-06-18.*
- [x] **Track: Drizzle 0.45 Major Migration** *(drizzle045_major_migration)*
  *Link: [./archive/drizzle045_major_migration/](./archive/drizzle045_major_migration/)*
  Upgrade Drizzle ORM to 0.45 across the monorepo, update schema definitions and migration format, integrate `drizzle-zod`, generate the marketing tables migration (0021), and reject Prisma 7 in favor of the existing Prisma→Drizzle path. *Status: COMPLETE — Phases 1–4 done; closure records authored; review findings from 2026-06-16 resolved. Archived 2026-06-18.*
- [x] **Track: Jest 30 Major Migration** *(jest30_major_migration)*
  *Link: [./archive/jest30_major_migration/](./archive/jest30_major_migration/)*
  Major migration to Jest 30. Covers new test runner API, configuration changes, snapshot format updates, and module resolution changes. Affects reading-advantage and advantage-games which use Jest for unit tests. *Status: COMPLETE 2026-06-21 (Phase 5 closeout — full-suite and quarantine evidence: `measure/archive/jest30_major_migration/phase-5-full-run.json` totals.suites_run=272=expected_total across 89 reading-advantage / 183 vocabulary-games / 0 reading-advantage-scripts suites; 3 canary suites DragonFlight/DragonRider/CastleDefense quarantined for pre-existing React 19.2.7 act() infinite render loop, NOT a Jest 30 regression; `packages/reading-advantage-scripts` migrated to jest@^30.2.0 with disposition manifest). Archived 2026-06-22.*
- [x] **Track: pnpm 11 Major Migration** *(pnpm11_major_migration)*
  *Link: [./archive/pnpm11_major_migration/](./archive/pnpm11_major_migration/)*
  Major migration from pnpm 8 to pnpm 11. Covers `packageManager` pin, lockfile format v9, workspace config promotion from `package.json#pnpm` to `pnpm-workspace.yaml`, CI SSOT, and hoisted linker. *Status: COMPLETE — pnpm@11.8.0 pinned, lockfile v9.0 regenerated, workspace config promoted, frozen-lockfile + dedupe --check pass, all 4 track contract suites 24/24 green. Full monorepo aggregate gate deferred (pre-existing cross-track failures, not pnpm11 regressions). Archived 2026-06-23.*

#### Backlog Major Migrations (spawned from dependency_upgrade_hardening_20260607)

- [ ] **Track: TypeScript 6 Major Migration** *(typescript6_major_migration — superseded)*
  *Link: [./tracks/typescript6_major_migration/](./tracks/typescript6_major_migration/)*
  Superseded before implementation by the stable TypeScript 7 native-compiler track below. TypeScript 6 is retained there only as the compatibility API and rollback bridge required by TypeScript 7.0 tooling.

- [ ] **Track: TypeScript 7 Native Compiler Migration** *(typescript7_native_migration_20260710)*
  *Link: [./tracks/typescript7_native_migration_20260710/](./tracks/typescript7_native_migration_20260710/)*
  Adopt stable TypeScript 7 for native type-checking and eligible package builds while retaining `@typescript/typescript6` for tools that embed the legacy compiler API. Includes all-tsconfig compatibility, explicit ambient types, TypeScript 6/7 diagnostic parity, controlled performance benchmarks, bounded Turbo/CI concurrency, full toolchain gates, rollback, and a TypeScript 7.1+ compatibility-removal follow-up.

- [ ] **Track: Zod 4 Major Migration** *(zod4_major_migration)*
  *Link: [./tracks/zod4_major_migration/](./tracks/zod4_major_migration/)*
  Major migration from Zod 3 to Zod 4. Coordinated with `zod_boundary_hardening_20260603` which owns env/schema validation hardening. This track handles the version bump, API changes (`z.string()` refinements, `.parse` vs `.safeParse`, `z.object` `.strict` default), and schema rewrites.

- [ ] **Track: Zustand 5 Major Migration** *(zustand5_major_migration)*
  *Link: [./tracks/zustand5_major_migration/](./tracks/zustand5_major_migration/)*
  Major migration to Zustand 5. Covers new store creation API, middleware changes, and TypeScript type inference updates. Affects reading-advantage (currently v4) and aligns with advantage-games (already v5).

---

### Prisma → Drizzle Migration Program (4 tracks)

- [x] **Track: Prisma → Drizzle Schema Unification**
  *Link: [./archive/prisma_drizzle_schema_unification_20260505/](./archive/prisma_drizzle_schema_unification_20260505/)*
  Track 1 of 4. Audit, port, reshape, and unify all non-auth Prisma models into shared Drizzle schema. Adds domain helpers and parity tests. No controller changes. Unblocks tracks 2–4. *Status: COMPLETE — 6 phases done. 45+ Prisma models classified. Migration 0013. 5 domain modules. 67-test parity suite. 550 total tests green. Completed 2026-05-22.*
- [x] **Track: reading-advantage Controllers — Prisma → Drizzle**
  *Link: [./archive/prisma_drizzle_reading_controllers_20260505/](./archive/prisma_drizzle_reading_controllers_20260505/)*
  Track 2 of 4. Migrate 141 Prisma references across 54 controllers, actions, lib, scripts, pages, and route handlers. Final phase deletes Prisma surface and deps. *Status: COMPLETE 2026-05-23 (reopened + re-closed same day). 9 phases done plus 3 reopened SQL fixes: dashboard-summary-controller unified table/column names (9b7661a), assignment-prediction-service a.created_at (58a356f), query-optimizer parameterized sql binding (0ca2e1b). New jest coverage for all three (PgDialect-rendered SQL assertions). __test__/ suite 11/11 green (194 tests). Build + lint clean. Full app-wide jest still deferred to CI/faster hardware.*
- [x] **Track: science-advantage Non-Auth Prisma → Drizzle** [created: 2026-05-05, completed: 2026-05-26]
  *Link: [./archive/prisma_drizzle_science_controllers_20260505/](./archive/prisma_drizzle_science_controllers_20260505/)*
  Track 3 of 4. Migrate 89 non-auth Prisma references (curriculum, lessons, gamification, classes, attempts, mastery). Deletes generated Zod artifacts and Prisma surface. *Status: COMPLETE — All 65 plan tasks done. Track archived 2026-05-26.*
- [x] **Track: science-advantage Test Infra — Prisma → Drizzle Migration**
  *Link: [./archive/science_test_infra_drizzle_migration_20260523/](./archive/science_test_infra_drizzle_migration_20260523/)*
  Sub-track of Track 3. Replaces `prisma db push --force-reset` in `vitest.setup.ts` with `drizzle-kit migrate` against a dedicated `science_advantage_test` DB; splits unit/integration setup files. Unblocks runtime verification for Track 3 Phases 1+.
- [x] **Track: Prisma → Drizzle Per-Feature Slice Cleanup**
  *Link: [./archive/prisma_drizzle_slice_cleanup_20260505/](./archive/prisma_drizzle_slice_cleanup_20260505/)*
  Track 4 of 4. **Unblocked 2026-05-26** (Tracks 2 & 3 archived). Scope narrowed: cleaned up comment-only Prisma references in reading- and science-advantage `lib/enums.ts`, corrected AGENTS.md doc drift, distilled program lessons, and carved out primary-advantage migration as separate follow-up track. *Status: COMPLETE — FR-1 enums cleaned, FR-2 AGENTS.md corrected, FR-3 tech-debt/lessons-learned updated, FR-4 primary-advantage track created.*

- [x] **Track: primary-advantage Prisma → Drizzle Migration**
  *Link: [./archive/primary_advantage_drizzle_migration_20260526/](./archive/primary_advantage_drizzle_migration_20260526/)*
  Carved out from Track 4. Migrate 56 Prisma-touching files in primary-advantage to Drizzle. Delete `prisma/` directory, `lib/prisma.ts`, and Prisma deps. Port schema to `packages/db/`. Inherits Track 2 shape. Also removes root `package.json` `onlyBuiltDependencies` Prisma entries and lockfile `@prisma/*` on closeout. *Status: COMPLETE — All 10 phases done. 56 Prisma-touching files migrated, prisma/ directory deleted, @prisma/* deps removed, AGENTS.md created, lockfile Prisma-free. Final acceptance PASS. Archived 2026-06-23. **Prisma→Drizzle program complete.***

---

### Review Remediation

- [x] **Track: Proxy Admin/Role Guard Hardening**
  *Link: [./archive/proxy_admin_guard_hardening_20260526/](./archive/proxy_admin_guard_hardening_20260526/)*
  Replace cookie-presence-only auth in `apps/codecamp-advantage/proxy.ts` and `apps/science-advantage/proxy.ts` with role-aware session verification at the edge. Resolves High-severity tech-debt entry (2026-05-15) and extends scope to science-advantage (same vulnerability). *Status: COMPLETE — Phases 0–5 done. Code: 8 codecamp unit + 17 science unit + 6 science integration tests, all green; builds pass for both apps. Phase 4 manual smoke deferred to user.*

- [x] **Track: Last-12-Hour Review Fixes**
  *Link: [./archive/last_12h_review_fix_20260503/](./archive/last_12h_review_fix_20260503/)*
  *Status: COMPLETE — All code/tests/lint complete. Manual verification deferred.*

- [x] **Track: Last-24-Hour Review Remediation** (7/9 main tasks + 9/9 Phase 5 subtasks complete)
  *Link: [./archive/review_remediation_20260502/](./archive/review_remediation_20260502/)*
  *Status: Auth tests, cross-tenant guards, config drift wiring, DB constraints, and Phase 5 review fixes all verified in code. NextAuth vs tRPC decision resolved: moving to simple username/password DB sessions (new track). lessonProgress.lessonId alignment deferred to tech-debt. Manual verification protocols deferred to implementation.*

- [x] **Track: Implement strict data and authorization contracts** (28/28 tasks)
  *Link: [./archive/strict_contracts_20260504/](./archive/strict_contracts_20260504/)*
  *Status: All four phases complete — TenantDB wrapper, branded types, tRPC output contracts, boundary validation. 28 tasks done. Plan archived.*
- [x] **Track: Strict Contracts Review Remediation** (10 tasks)
  *Link: [./archive/strict_contracts_review_20260504/](./archive/strict_contracts_review_20260504/)*
  *Status: Complete. All 10 tasks finished across 4 phases. Tenant scoping fixed, validation/auth gaps closed, 26 new tests added, BOM removed. Pre-existing test/type issues in auth/api noted for separate tracks.*
- [x] **Track: May 5 Review Remediation** (23/24 tasks)
  *Link: [./archive/remediation_20260505/](./archive/remediation_20260505/)*
  *Status: Complete. 23/24 tasks done (API test backfill deferred). Domain: 83/83 tests (+13 new). Auth: 64/64 tests. Security/auth gaps fixed, logic bugs resolved, TenantDB edge cases hardened.*

- [x] **Track: Codecamp Review Remediation**
  *Link: [./archive/codecamp_review_remediation_20260515/](./archive/codecamp_review_remediation_20260515/)*
  *Status: COMPLETE — All 5 High, 10 Medium, 12 Low findings resolved. Security (adminProcedure, prompt injection hardening, role stripping), architecture (domain chat context, bounded rate limiter), data integrity (JSONB guards, duplicate prevention, prerequisite gap handling), UI/UX (ARIA labels, disabled Link, HTTPS clone), and test coverage (github-client tests, SSRF defense).*
- [x] **Track: Migration Review Remediation** *(migration_review_remediation_20260616)*
  *Link: [./archive/migration_review_remediation_20260616/](./archive/migration_review_remediation_20260616/)*
  Chore track that addresses the open items from the 2026-06-16 reviews of `ai_sdk_major_migration` and `drizzle045_major_migration`: metadata status fixes, stale stash cleanup, version-pin normalization, marketing migration generation, check-types fixes, tech-stack.md rows, and Phase 4 closure records. *Status: COMPLETE — all 6 phases done. Archived 2026-06-18.*

---

- [x] **Track: TenantDB Proxy Hardening & Honest Coverage**
  *Link: [./archive/tenant_db_proxy_hardening_20260609/](./archive/tenant_db_proxy_hardening_20260609/)*
  *Status: COMPLETE — All 6 phases done. Table classification registry (20 FLAT, 4 EXEMPT, 45 REFERENTIAL). Fail-closed proxy with TenantScopeError. Join classification (FR-4). Insert .values() enforcement (FR-5). 9 domain files migrated to unscoped(). Honest coverage test (FR-6). AGENTS.md documented. 276 domain tests pass.*

---

- [x] **Track: Auth Security Hardening**
  *Link: [./archive/auth_security_hardening_20260611/](./archive/auth_security_hardening_20260611/)*
  Close 11 security and correctness gaps identified in the June 2026 `packages/auth` review: session token hashing (FR-1), `assertTenantAccess` order bug (FR-2), `rehashOnLogin` provider filter (FR-3), username-enumeration timing oracle (FR-4), DB-error rate-limit poisoning (FR-5), unauthenticated register endpoint (FR-6), missing password reset + session revocation (FR-7), unpopulated session metadata (FR-8), missing login/reset audit events (FR-9), session cap (FR-10), impersonation env-var gate (FR-11). Scoped to username/password flow only.
  **Extended 2026-06-11** with the `packages/auth-client` audit: login response missing required `AuthUser` fields hidden by `as` cast (FR-12), mount-session-check/login race (FR-13), logout swallowing server failure (FR-14), state-derivation + dependency hygiene (FR-15), and aligning `register()`/reading-advantage signup with the FR-6 gate (FR-16).
  *Closed 2026-06-12 by `post_24h_audit_remediation_20260612` Phase 2: session cap hardened (non-expired count), Session type cleaned (token removed), deleteSession uses returning(), audit events logged, handleResetPassword single requireRole + credential check, handleRegister instanceof AuthError, crypto test timeout increased, role casts replaced with typed Role.*

- [ ] **Track: Storage Package Hardening + Adoption**
  *Link: [./tracks/storage_hardening_20260611/](./tracks/storage_hardening_20260611/)*
  Close the June 2026 `packages/storage` audit findings: `getSignedUrl` signs a PutObjectCommand — produces an overwrite-capable upload URL where the contract promises read access (FR-1); default `ACL: public-read` breaks `put()` on modern AWS S3 (ACLs disabled by default since 2023) and Cloudflare R2, and is the wrong security default (FR-2); `exists()` swallows infra errors as "missing" (FR-3); `getUrl()` doesn't URL-encode keys (FR-4); config error diagnostics (FR-5). Then complete the adoption `storage_package_20260603` never did — the package has **zero consumers** while reading-advantage and primary-advantage still run their own `@google-cloud/storage` clients across 10 files (FR-6, migrate + delete `utils/storage.ts` + GCS S3-interop envs).

- [x] **Track: DB Migration Ledger Integrity + Hardening** ⚠️ **Critical**
  *Link: [./archive/db_migration_ledger_20260611/](./archive/db_migration_ledger_20260611/)*
  June 2026 `packages/db` audit. **Critical:** `_journal.json` `when` stamps are non-monotonic (idx 3–8, 13, 14, 17 carry 2025-era epochs; 0010/0011 share one stamp; 0018 unregistered) and drizzle-orm 0.44.7 applies a migration only when its stamp is strictly greater than the last applied ledger row — so existing DBs **silently skip** 0011/0013/0014/0015/0017. Fresh DBs apply everything, hiding the bug from dev/CI. This is the db-side root cause of the June 8 production incident (tech-debt P0). Fix: re-stamp journal (FR-1), journal-integrity test (FR-2), ledger doctor report/repair script (FR-3), codecamp cloudbuild deploy gate (FR-4), snapshot refresh so `drizzle-kit generate` is safe again (FR-5). Plus hardening: ESM `.js` import extensions so dist loads outside bundlers (FR-6), `DATABASE_URL` fail-fast + privileged-fallback warning (FR-7), `sessions(user_id, expires_at)` indexes (FR-8), seed-data subpath export + dead `shutdown.ts` removal (FR-9).
  *Closed 2026-06-12 by `post_24h_audit_remediation_20260612` Phase 1: journal re-stamped (monotonic), 0019/0020 registered, doctor script implemented, ESM .js extensions added, env guards added, sessions indexes migration, barrel hygiene done, 4/6 Phase-2 Red tests pass Green (2 need live PG).*

- [x] **Track: codecamp-advantage — Progress Monotonicity**
  *Link: [./archive/codecamp_progress_monotonicity_20260611/](./archive/codecamp_progress_monotonicity_20260611/)*
  *Status: COMPLETE — Diagnosed `codecamp-exercise-vitest` PR #1, repaired Pkalakorn's production progress, made completed progress monotonic, and deployed production-matched hotfix build `99666d94-a6ce-4a0e-9e55-134d6898e513`.*

- [x] **Track: codecamp-advantage — Production QA/QC Testing**
  *Link: [./archive/codecamp_qa_prod_20260517/](./archive/codecamp_qa_prod_20260517/)*
  *Status: COMPLETE — 13 phases delivered (Phases 1–13 incl. Phase 8.5 deployment gate). 43 plan tasks complete with commit SHAs. Accumulated security/observability/cache fixes deployed via Cloud Build `e3ed0c01`. Final acceptance audit passed (status=pass, findings=[]). Production readiness report at `report.md` records launch decision = **no-go** pending two credential/fixture-gated P0 integration probes (live OpenRouter AI tutor with credentialed account; GitHub PR review keystone E2E). 3 P1 follow-up tracks filed: `codecamp_perf_warm_dashboard_20260608`, `codecamp_asset_render_blocking_20260608`, `codecamp_infra_cold_start_20260608`. Alert policy artifact captured in `measure/alerts.md`.*

- [x] **Track: codecamp-advantage — Asset Render-Blocking Fix**
  *Link: [./archive/codecamp_asset_render_blocking_20260608/](./archive/codecamp_asset_render_blocking_20260608/)*
  *Status: COMPLETE — Post-build manifest patch strips Next.js 16's unconditional nomodule polyfill from build-manifest.json. 9 commits. Live prod probe confirms 0 render-blocking scripts on /en/ and /th/. Archived 2026-06-23.

- [x] **Track: Post-24h Audit Remediation**
  *Link: [./archive/post_24h_audit_remediation_20260612/](./archive/post_24h_audit_remediation_20260612/)*
  High-priority cleanup of issues found in the 24-hour commit audit: rescue the uncommitted db-migration-ledger Phase-3 Green WIP; harden auth session cap, token typing, audit fire-and-forget, and reset-password logic; remove skipped stub tests and source-level regex tests; stabilize the codecamp_review_ai_consolidation Phase-6 acceptance test and de-brittle closeout bookkeeping tests; verify the warm-dashboard optimization in production; resolve long-lived stashes and generated-artifact hygiene.
  *Status: COMPLETE — All 6 phases closed. Phase 1 rescued db-ledger WIP (commits `4d73a926`, `6891639e`, `5215d944`, `c080e2c2`, `b3f6324a`, `ccad56d7`). Phase 2 hardened auth session cap, token type, reset-password (commit `5f23a9cb` + `920ff302`); 161/161 packages/api tests pass. Phase 3 stabilized closeout test brittleness (commit `88053907` + `cc72b786`); 78/78 webhooks tests pass. Phase 4 completed codecamp progress cleanup (commit `b3f6324a`); warm-dashboard deferred to `codecamp_perf_warm_dashboard_20260608` per Task 23 [~]. Phase 5 resolved stashes + gitignore + registry (commit `285927e4`); `stash@{0}` dropped as superseded. Phase 6 final verification — 630/4 db, 385/35 auth (pre-existing PG/DIRECT_DATABASE_URL failures out of scope, owned by `audit_log_retention_dsar_20260605` + `db_migration_ledger_20260611`), 162/0 api, 78/0 webhooks. All 4 packages pass check-types and build. Phase 6 closeout report at `phase6-closeout-report.md`; checkpoint SHA `57071c94`. Final acceptance audit passed 2026-06-23. Archived 2026-06-23.*

- [x] **Track: 72h Review Findings Remediation** ⚠️ **High Priority**
  *Link: [./archive/review_findings_remediation_20260624/](./archive/review_findings_remediation_20260624/)*
  *Status: COMPLETE — All 8 phases (0-7 + final acceptance) closed. Phases 0-2 in the prior partial-closeout commit `1ef15034`; Phases 3-7 completed in this run (commits `d63c1831`, `1fd1e3c8`, `cea2b69b`, `5683836d`, `4a490730`). All 13 ACs verified: chat authz (AC-1), studentModel dedup (AC-2), new-generator await + correctAnswer filter (AC-3), roleplay excerpts + storage integrity (AC-4), error cause propagation (AC-5), permission DRY (AC-6), rate-limit decision banner (AC-7), chat Zod (AC-8), lessons-learned test-gaming (AC-9), route-level tests for sales (AC-10), session cap + race-safety (AC-11), model behavioral coverage (AC-12), marketing brittle-cleanup (AC-13). Test counts: sales-advantage 13 passed, primary-advantage 43 passed, @reading-advantage/auth session 18 passed, @reading-advantage/domain sales 2 new + 313 prior = 315 passed (3 pre-existing tenant-coverage failures unchanged), marketing 128 passed (1 pre-existing phase-3 adversarial failure unchanged). Archived 2026-06-24.*
  Remediation of all defects/quality issues from the code-level review of the last 72h of commits (2026-06-21 → 06-24), across the drizzle migration, sales-advantage MVP, video pipeline, post-24h, and observability tracks. **Security:** `/api/chat` enforces session but not `sales:chat` authz — any authenticated user from any app can consume the AI coach; the route bypasses the existing `assertCan` domain path (FR-1; roleplay-attempts/lesson-complete are already gated via domain `assertCan`). **Correctness:** `studentModel.getStudents` `leftJoin` fan-out yields duplicate students + a `totalCount` that disagrees with the list (FR-2, audit sibling models); `new-generator.ts` `db.transaction(...)` is fire-and-forget and `correctAnswer:0` fallback persists a wrong answer key (FR-3); roleplay evaluation runs with empty `excerpts:[]` and persists a storage key even when upload failed (FR-4). **Quality:** evaluator swallows error causes (FR-5), sales permission mapping duplicated (FR-6), rate limiter is in-memory per-process (FR-7), chat input shape unvalidated/injectable (FR-8), plus a lessons-learned entry on test-gaming (AC-9, ref `920ff302`→`019b9d83`). **Test alignment** (from the 72h test review — every confirmed defect lives in an untested route/integration layer): route-level tests for the sales surface which has zero route/component tests (FR-9), session cap + transaction race-safety tests that don't exist today (FR-10), behavioral smoke tests for the migrated models whose `.mjs` gate is artifact/residue-only (FR-11), and pruning brittle file-existence/source-regex/CSS-literal assertions in the marketing suite (FR-12).*

- [x] **Track: Monorepo Feature Review Masterplan**
  *Link: [./archive/monorepo_feature_review_masterplan_20260626/](./archive/monorepo_feature_review_masterplan_20260626/)*
  *Status: COMPLETE — Planning-only masterplan defining the graph-backed review protocol, taxonomy, child-track set, and closeout criteria. 34 plan tasks done, 11 child review tracks created. Final acceptance pass. Archived 2026-06-26.*

---

- [x] **Track: Review-Findings Follow-up (test-altitude + FR-2 correctness)**
  *Link: [./archive/review_findings_followup_20260626/](./archive/review_findings_followup_20260626/)*
  Closes the gaps from the 2026-06-26 in-depth review of `review_findings_remediation_20260624`: (FR-1) paginate `getStudents` by distinct student not joined row; (FR-2) PGlite in-process Postgres harness + real behavioral tests for migrated primary-advantage models; (FR-3) caller-level await guard for `generateArticleNew`; (FR-4) unit tests for `extractCanonicalSourceExcerpts` / `getRoleplayEvaluationContext`. Prior track marked AC-2/AC-12 ✓ but evidence did not support them; deferred real-test-DB work encoded here per the no-deferring-blockers rule.
