# Project Tracks

This file tracks all major tracks for the project.

---

- [ ] **Track: Primary Browser QA Fixes** *Link: [./tracks/primary_browser_qa_fixes_20260915/](./tracks/primary_browser_qa_fixes_20260915/)*
  Fix the eight defects found by the 2026-09-15 parallel browser QA sweep (sign-in crash, article crash, dead sidebar links, i18n key, admin 403, Realm Carver cap, locale toggle, Import Data routing).

- [~] **Track: APK Arcade Portfolio Refactor** *Link: [./tracks/apk_arcade_portfolio_refactor_20260908/](./tracks/apk_arcade_portfolio_refactor_20260908/)*
  Plan the complete game rebuild, shared arcade experience, listening, progression, and social play. Sol medium handoff is complete; implementation remains planned.

- [x] **Track: Architectural Priorities** *Link: [./tracks/architecture_priorities_20260908/](./tracks/architecture_priorities_20260908/)*
  Reduce repeated verification, narrow Domain imports, and consolidate shared authentication behavior.

## Active Tracks (created 2026-09-19)

- [x] **Track: Sales Advantage Broken UX Fixes** *Link: [./tracks/sales_broken_ux_fixes_20260919/](./tracks/sales_broken_ux_fixes_20260919/)*
  Repair the broken user-experience items from the Sales Advantage UX audit. **Implemented 2026-09-20 (9/9 tasks, 267 tests green); owner manual verification PASSED 2026-09-22.**
- [x] **Track: Sales Advantage Session Contract Correctness** *Link: [./tracks/sales_session_contract_correctness_20260919/](./tracks/sales_session_contract_correctness_20260919/)*
  Separate anonymous sessions from forbidden Sales identities in the session contract. **Implemented 2026-09-20 (4/4 tasks, 272 tests green on branch, merged to master); owner manual verification PASSED 2026-09-22.**
- [x] **Track: Sales Advantage Recording and Loading Correctness** *Link: [./tracks/sales_recording_loading_correctness_20260919/](./tracks/sales_recording_loading_correctness_20260919/)*
  Repair recording cleanup, upload errors, loading states, and request cancellation. **Implemented 2026-09-20 (10/10 tasks, 42 scoped tests green, tsc and eslint clean); owner manual verification PASSED 2026-09-22.**
- [x] **Track: Sales Advantage Duplication Removal** *Link: [./tracks/sales_duplication_removal_20260919/](./tracks/sales_duplication_removal_20260919/)*
  Remove duplicated helpers, tests, dependencies, messages, and unused theme code. **Implemented 2026-09-20 (6/6 tasks, 49 scoped tests green, tsc and eslint clean); `pnpm-lock.yaml` regeneration pending (pnpm segfaults on this machine); owner manual verification PASSED 2026-09-22.**
- [x] **Track: Sales Advantage Structural Alignment** *Link: [./tracks/sales_structural_alignment_20260919/](./tracks/sales_structural_alignment_20260919/)*
  Align shared authentication helpers, locale handling, keyboard access, announcements, and administrator navigation. **Implemented 2026-09-20 (5/6 tasks, 35 scoped tests green, tsc and eslint clean). Task 1 (shared `packages/auth` helper move) deferred — needs a dedicated cross-app track, registered in tech-debt; Task 6 recorded as tech-debt (App Router layout constraint); owner manual verification PASSED 2026-09-22.**

- [x] **Track: Accounts Broken UX Fixes** *Link: [./tracks/accounts_broken_ux_fixes_20260919/](./tracks/accounts_broken_ux_fixes_20260919/)*
  Repair unsafe redirects, dead sign-out behavior, stale errors, focus, and logout failures. **Implemented 2026-09-20 (8/8 tasks, 93 tests green); owner manual verification PASSED 2026-09-22.**
- [x] **Track: Accounts Console Write Correctness** *Link: [./tracks/accounts_console_write_correctness_20260919/](./tracks/accounts_console_write_correctness_20260919/)*
  Make console writes idempotent, pending-aware, refresh-safe, and resistant to lost role updates. **Implemented 2026-09-20 (5/5 tasks); owner manual verification PASSED 2026-09-22.**
- [x] **Track: Accounts Loading State Correctness** *Link: [./tracks/accounts_loading_state_correctness_20260919/](./tracks/accounts_loading_state_correctness_20260919/)*
  Distinguish directory loading, empty, failed, malformed-input, and readiness states. **Implemented 2026-09-20 (5/5 tasks, 34 scoped tests green, tsc and eslint clean); owner manual verification PASSED 2026-09-22.**
- [x] **Track: Accounts Duplication Removal** *Link: [./tracks/accounts_duplication_removal_20260919/](./tracks/accounts_duplication_removal_20260919/)*
  Share safe-path, JSON-body, and route-handler boundary helpers without hiding capabilities. **Implemented 2026-09-20 (4/4 tasks, 65 scoped tests green, tsc clean in both apps); cross-app helper imports from `apps/accounts` into `apps/accounting` were introduced per plan; owner manual verification PASSED 2026-09-22.**
- [x] **Track: Accounts Structural Alignment** *Link: [./tracks/accounts_structural_alignment_20260919/](./tracks/accounts_structural_alignment_20260919/)*
  Align package exports, server-owned catalogues, confirmation controls, visual contrast, and authorization coverage. **Implemented 2026-09-20 (6/6 tasks, 56 scoped tests green, admin routes at 100% coverage, tsc and eslint clean); owner manual verification PASSED 2026-09-22.**

- [x] **Track: Accounting Broken UX Fixes** *Link: [./tracks/accounting_broken_ux_fixes_20260919/](./tracks/accounting_broken_ux_fixes_20260919/)*
  Repair local sign-in, derived-rate, refresh, idempotency, redirect, and login-rendering defects. **Implemented 2026-09-20 (9/9 tasks, 245 tests green, one pre-existing auth-import timeout); owner manual verification PASSED 2026-09-22.**
- [x] **Track: Accounting Money Correctness** *Link: [./tracks/accounting_money_correctness_20260919/](./tracks/accounting_money_correctness_20260919/)*
  Correct currency exponents, date zones, minor-unit display, and major-unit previews. **Implemented 2026-09-20 (6/6 tasks); owner manual verification PASSED 2026-09-22.**
- [x] **Track: Accounting Loading State Correctness** *Link: [./tracks/accounting_loading_state_correctness_20260919/](./tracks/accounting_loading_state_correctness_20260919/)*
  Add error recovery, server-side pending filtering, and export date controls. **Implemented 2026-09-20 (3/3 tasks, 18 scoped tests green); owner manual verification PASSED 2026-09-22.**
- [x] **Track: Accounting Duplication Removal** *Link: [./tracks/accounting_duplication_removal_20260919/](./tracks/accounting_duplication_removal_20260919/)*
  Consolidate repeated route helpers and library test locations. **Implemented 2026-09-20 (2/2 tasks, 78 scoped tests green, tsc and eslint clean); owner manual verification PASSED 2026-09-22.**
- [x] **Track: Accounting Structural Alignment** *Link: [./tracks/accounting_structural_alignment_20260919/](./tracks/accounting_structural_alignment_20260919/)*
  Align origin checks, security headers, history views, and settled-currency validation. **Implemented 2026-09-20 (4/4 tasks, 92 app + 52 backend scoped tests green, tsc clean); `currencySchema` narrowed to THB/USD/JPY in `packages/backend` — confirm the allowlist; owner manual verification PASSED 2026-09-22.**

- [x] **Track: Marketing Broken UX Fixes** *Link: [./tracks/marketing_broken_ux_fixes_20260919/](./tracks/marketing_broken_ux_fixes_20260919/)*
  Repair scene limits, masked settings, pending controls, labels, stale artifacts, and dead login code. **Implemented 2026-09-20 (10/10 tasks, 520 tests green); owner manual verification PASSED 2026-09-22.**
- [x] **Track: Marketing Runtime Header Correctness** *Link: [./tracks/marketing_runtime_header_correctness_20260919/](./tracks/marketing_runtime_header_correctness_20260919/)*
  Align runtime parameters, security headers, cache headers, aliases, role checks, and route gating. **Implemented 2026-09-20 (5/5 tasks, 535 tests green, tsc and eslint clean); owner manual verification PASSED 2026-09-22.**
- [x] **Track: Marketing Loading State Correctness** *Link: [./tracks/marketing_loading_state_correctness_20260919/](./tracks/marketing_loading_state_correctness_20260919/)*
  Repair loading, error, cancellation, stable-key, editing, logging, and unsaved-state behavior. **Implemented 2026-09-20 (10/10 tasks, 34 scoped tests green, tsc clean); owner manual verification PASSED 2026-09-22.**
- [x] **Track: Marketing Duplication Removal** *Link: [./tracks/marketing_duplication_removal_20260919/](./tracks/marketing_duplication_removal_20260919/)*
  Remove duplicated authentication, application, campaign, AI, health, status, and navigation code. **Implemented 2026-09-20 (10/10 tasks, 151 scoped tests green, tsc and eslint clean); owner manual verification PASSED 2026-09-22.**
- [x] **Track: Marketing Structural Alignment** *Link: [./tracks/marketing_structural_alignment_20260919/](./tracks/marketing_structural_alignment_20260919/)*
  Align shared helpers, page boundaries, forms, metadata, application maps, and settings contracts. **Implemented 2026-09-20 (6/6 tasks, 80 scoped tests green, tsc and eslint clean); settings POST contract narrowed to four writable keys (legacy keys now 400); CI must build `packages/auth` before marketing tests; owner manual verification PASSED 2026-09-22.**

## Current Focus (owner-confirmed 2026-08-10)

Multiple programs are in flight. Use this portfolio order when selecting work:

1. **Business and finance operations.** Stabilize Company Admin and the bounded
   customer/licensing control plane, then build the distinct `apps/accounting`
   product on the Finance Operations foundation. Per the owner decision of
   2026-08-20, the app grows beyond the operational subledger into real
   double-entry books with Thai statutory support as accounting moves in-house.
2. **Advantage Play Kit intern golden path.** Make creating, validating,
   previewing, and publishing mini-games easy and repeatable for current interns.
   Evidence or cartridge work that does not improve that path does not jump the
   queue merely because an older APK track exists.
3. **Codecamp curriculum and shared mastery.** Build top-quality Codecamp
   curriculum and use it as the first test-bed for the shared Mastery Advantage
   KST/SRS system. Sales Advantage is a course teaching people to sell the
   company's products and must consume that same shared KST/SRS system; it is
   not a CRM.
4. **Enabling backend work** proceeds only where the priorities above require
   it; do not create parallel frameworks or provider coupling.
5. **Legacy cutovers are held behind product need and explicit approval.** Do
   not accelerate Reading or Science cutover merely because they are imported.
   Primary has live users and must not cut over before 2026-10-11; that date is
   the earliest eligible date, not automatic authorization. Tutor's Reading and
   Primary asset dependencies must remain intact.

- [x] **Track: OpenCode Agent Roster Refresh** *Link: [./archive/opencode_agent_roster_20260712/](./archive/opencode_agent_roster_20260712/)*
  Refresh global coding and Measure agents for the GPT-5.6 Luna/Terra/Sol family, remove unavailable Moonshot routing, and prioritize active subscription-backed providers. **Completed 2026-07-20** — implementation 3/3 with validation evidence; product-owner manual verification (OpenCode restart model enumeration) remains as owner follow-up.

- [x] **Track: Primary Dashboard Cumulative XP Correction** *Link: [./archive/primary_dashboard_cumulative_xp_20260728/](./archive/primary_dashboard_cumulative_xp_20260728/)*
  Extract and prove the dashboard’s cumulative XP calculation so selected ranges retain prior XP totals. **Completed 2026-07-30** — `formatCumulativeXpForDays` extracted with unit tests; local vitest and `tsc --noEmit` passed.
- [~] **Track: Primary Proxy Role Normalization** *Link: [./tracks/primary_proxy_role_normalization_20260728/](./tracks/primary_proxy_role_normalization_20260728/)*
  Normalize authenticated Primary role keys before access checks and keep the proxy on the Node runtime.
- [~] **Track: Reading Remote Font Removal** *Link: [./tracks/reading_remote_font_removal_20260728/](./tracks/reading_remote_font_removal_20260728/)*
  Remove external book-font imports from Reading’s global stylesheet for locally deterministic rendering.
- [~] **Track: Codecamp Duplicate Exercise/Quiz Lesson Hotfix** *Link: [./tracks/codecamp_duplicate_lesson_hotfix_20260810/](./tracks/codecamp_duplicate_lesson_hotfix_20260810/)*
  Repair the production seed corruption that made required standalone exercises
  and quizzes appear as duplicate lessons in 14 modules. Preserve every learner
  progress identity, restore distinct exercise/quiz semantics, prevent recurrence,
  and verify the deployed production data without granting unearned completion.

---

## Small-Company Operations Program (created 2026-07-22)

> Bounded program for the [small-company owner, CRM, licensing, demo/trial,
> provisioning, and future commercial-attribution model](./small-company-operations-program.md).
> One Company Admin UI serves the team, but employee identity and commercial
> operations retain separate backend/database boundaries. This program rejects
> enterprise IAM, a general CRM, statutory accounting, and commission execution
> in the MVP. Finance Operations is a separate P0 operational subledger and
> evidence product.

- [~] **Track: Company Finance Operations Foundation** *Link: [./tracks/company_finance_operations_20260810/](./tracks/company_finance_operations_20260810/)*
  Define the distinct `apps/accounting` product through policy-neutral contracts,
  ports, schema, and Red tests for money, idempotency, immutable history,
  authorization, audit, provenance, and source-system isolation. THB valuation
  policy decided by the owner 2026-08-20 (settlement-derived rate, 2dp half-up);
  close/accountant policy list and pilot data remain pending.

- [x] **Track: APK Common Look and Enforcement — COMPLETED** *Link: [./tracks/apk_common_look_enforcement_20260822/](./tracks/apk_common_look_enforcement_20260822/)*
  Bind standard-pack art to gameplay actors across all 18 wallpaper titles, make
  `mountCartridge` enforce the cartridge manifest, repair the tutorial runtime so
  demonstrations advance and show motion, and remove the unenforced version
  numbers. Recorded retroactively at owner direction. Completed 2026-08-22.
- [ ] **Track: Accounting App Foundation** *Link: [./tracks/accounting_app_foundation_20260820/](./tracks/accounting_app_foundation_20260820/)*
  Build `apps/accounting` on the Finance Operations foundation: Accounts SSO
  sign-in, staff expense/bill submission with evidence, owner approval with
  immutable audit, full double-entry ledger on a standard Thai SME chart of
  accounts, Thai statutory support (VAT, WHT, tax invoices), and accountant
  export. Story-shaped spec, 8 phases (S1–S8).

- [x] **Track: Accounting Product Simplification** *Link: [./tracks/accounting_product_simplification_20260822/](./tracks/accounting_product_simplification_20260822/)*
  Fix the two live finance-operations defects, cut the module to its
  consumed symbols, collapse the accounting database, and add audit-backed
  approval. Ledger/VAT/WHT cut pending the accountant tool decision. **Completed 2026-08-22**

- [x] **Track: Accounting Minimum Product** *Link: [./tracks/accounting_minimum_product_20260822/](./tracks/accounting_minimum_product_20260822/)*
  Owner review & approve/reject UI, derived-rate display, and CSV export
  of approved submissions for the external accountant. **Completed 2026-08-22**

- [~] **Track: Small-Company Admin Privilege Simplification** *Link: [./tracks/small_company_admin_privileges_20260722/](./tracks/small_company_admin_privileges_20260722/)*
  Make `COMPANY_ADMIN` the intentional owner/operator role with exact inherited
  administrator access to Marketing, Sales, Codecamp, and future internal apps,
  while ordinary employees retain explicit app roles.
- [b] **Track: Business Operations Graph Baseline Remediation** *Link: [./tracks/business_operations_graph_baseline_remediation_20260730/](./tracks/business_operations_graph_baseline_remediation_20260730/)*
  Historical/incomplete remediation of the failed full-repository graph gate.
  Deferred for resource safety on 2026-08-10; it is not a successor delivery
  prerequisite and does not unblock Admin S1 or CRM. See the dated resource-
  safety disposition in the track.
- [b] **Track: Customer, Licensing, and Minimal CRM Control Plane** *Link: [./tracks/customer_licensing_crm_20260722/](./tracks/customer_licensing_crm_20260722/)*
  Add leads, customers, contacts, school sites, sales ownership, shared demos,
  school trials, subscriptions, provisioning ports, and future revenue/commission
  attribution seams behind Company Admin; its bounded Accounts/backend safety
  gate is not yet accepted.
- [ ] **Track: www CRM Lead Intake** *Link: [./tracks/www_crm_lead_intake_20260722/](./tracks/www_crm_lead_intake_20260722/)*
  Replace Contact Us `mailto:` and no-op commercial CTAs with validated,
  attributable, spam-resistant CRM intake and operator notification. Depends on
  the accepted lead contract from the customer/licensing track and owns Wave 5 T1.
- [ ] **Track: Reading License Control-Plane Migration** *Link: [./tracks/reading_license_control_plane_migration_20260722/](./tracks/reading_license_control_plane_migration_20260722/)*
  Prove production truth, import expired history without reactivation, and make
  Company Admin the sole writer for new/renewed Reading demos, school trials,
  and subscriptions while Reading retains local runtime enforcement.

---

## Backend Platform Program (created 2026-07-13)

> Bounded program for the [portable backend-as-code architecture](./backend-platform-spec.md).
> Enforcement is Gate 1. Kernel Task 1 must then publish the accepted
> `packages/backend` package scaffold. After that structural gate, the remaining
> kernel work and durable queue phases may proceed in parallel. Capability-bound
> job handlers remain blocked on full kernel acceptance. Migration is staged:
> small/new apps first, Reading Advantage next, and Primary Advantage last. This
> program does not authorize a big-bang rewrite or Cloudflare Workers as a
> backend runtime.

- [x] **Track: Backend Architecture Enforcement** *Link: [./archive/backend_architecture_enforcement_20260713/](./archive/backend_architecture_enforcement_20260713/)*
  Add AST database/provider boundary rules, counterexample fixtures, reviewed
  ratcheting baselines, and shared CI/doctor enforcement. **Program Gate 1.**
- [~] **Track: Backend Capability Kernel** *Link: [./tracks/backend_capability_kernel_20260713/](./tracks/backend_capability_kernel_20260713/)*
  Build capability descriptors, the policy executor, deterministic catalog and
  generated route bindings, then prove one bounded small/new-app slice. **Depends
  on Backend Architecture Enforcement.**
- [~] **Track: Durable Job Worker Platform** *Link: [./tracks/durable_job_worker_platform_20260713/](./tracks/durable_job_worker_platform_20260713/)*
  Generalize the proven Postgres `review_jobs` behavior into a durable job port
  and `services/worker`. Contract/test work under `packages/backend/src/jobs`
  depends on enforcement plus the accepted Kernel Task 1 package scaffold; it
  may then run alongside the remaining kernel work. Capability-bound handlers
  depend on full kernel acceptance.
- [~] **Track: Company Employee Identity and SSO** *Link: [./tracks/company_identity_sso_20260715/](./tracks/company_identity_sso_20260715/)*
  Create a separate employee identity database and first-party Accounts app,
  provide shared SSO and app-scoped roles for Marketing, Sales Advantage, and
  Codecamp Advantage, and safely migrate existing Codecamp accounts. Coordinates
  with the architecture-enforcement and capability-kernel tracks. The successor
  `small_company_admin_privileges_20260722` deliberately supersedes the
  identity-only `COMPANY_ADMIN` product-access policy for this small company.
  *Status: ARCHIVE-PENDING — remaining graph, documentation, legacy-auth retirement, final-review, and Kimi WebBridge acceptance tasks are tracked in the plan.*

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
- [b] **Track: Sales Advantage Review** *Link: [./tracks/sales_advantage_review_20260626/](./tracks/sales_advantage_review_20260626/)*
  Published review artifacts cover 110 files through six batches and define 139
  finding IDs. Graph freshness, targeted quality gates, and phase acceptance remain
  blocked. Successor waves own product remediation. This row makes no Sales app
  readiness claim.
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

> **Program correction (2026-07-12):** Requirements for the developer kit,
> responsive compositions, and semantic assets must be derived from the complete
> `apps/advantage-games` corpus before shared systems or physical art are frozen.
> See the [APK Evidence Reconstruction Program](./apk-evidence-reconstruction-program.md), [APK Delivery Program](./apk-asset-system-program.md), and
> [Responsive Game Composition Specification](./apk-responsive-game-composition-spec.md).
> No successor implementation may begin until the independent acceptance track
> publishes post-review, post-approval hashes. Required subagent roles, evidence
> receipts, stop-loss gates, and a three-game pilot are mandatory.

- [x] **Track: APK Cross-Game Requirements and Capability Ontology — FAILED/SUPERSEDED, DO NOT CONSUME** *Link: [./archive/apk_cross_game_asset_ontology_20260712/](./archive/apk_cross_game_asset_ontology_20260712/)*
  Failed after structural tests and generated assumptions were incorrectly treated as source-grounded completion. All hashes are revoked; artifacts remain only as negative/failure evidence.

- [x] **Track: APK Independent Source Denominator Inventory** *Link: [./archive/apk_source_denominator_inventory_20260712/](./archive/apk_source_denominator_inventory_20260712/)*
  Independently discover and fully reconcile the game, file, scene/state, copy, history, and asset denominator without interpreting product requirements. *Status: COMPLETE — accepted-denominator-manifest and accepted-partition-manifest published at HEAD `ba95e6fb`; 86/86 admission (Phase 0:13, Phase 1:18, Phase 2:31, Phase 3:24), 26/26 live wiring, 38/38 T2 gate suites, 43/46 Phase-4 focused contract (3 pre-existing non-blocking).*

- [x] **Track: APK Three-Game Source-Truth Pilot** *Link: [./archive/apk_three_game_truth_pilot_20260712/](./archive/apk_three_game_truth_pilot_20260712/)*
  Prove the method on Dragon Flight, RPG Battle, and Abyssal Well before authorizing corpus-scale work. *Status: COMPLETE (conditional acceptance). Five role-isolated role receipts; 491 atomic claims across Dragon Flight (225), RPG Battle (215), Abyssal Well (51); 8 negative fixtures; 41/41 truth tests pass; 15/15 claim re-derivations exact. Conditional open items: Phase 3 browser audit deferred (environment-gated); Phase 4 asset audit partial. Successor hashes: pilot manifest `cd1a2fe1…`, acceptance `3a59c50e…`, accepted `cbf04753…`.*

- [x] **Track: APK Action and Defense Evidence Cohort** *Link: [./archive/apk_corpus_audit_action_defense_20260712/](./archive/apk_corpus_audit_action_defense_20260712/)*
   Recover exact independently reviewed evidence packages for eight action, defense, escort, projectile, and arena games. **Accepted with disclosure (v4 lineage, 2026-07-22):** reconciliation v4 `d009b9a3`, zero-Critical/High/Medium full-cohort review v4 `81bfe78e`, candidate v2 `d70959ce`, product-owner acceptance v2 `1d56853d`, accepted manifest v2 `8b3a83d3`, and owner admission disposition `43928b9a` bind the current conditional admission. The v1 lifecycle and raw admission-gate results v1-v4 remain historical/non-authority. Binding disclosures retain Batch A limitations; Batch B synthetic-input, HTTP-400, and 404 limits; Batch C Kimi helper-attempt/404 limits; and asset-companion limits. No gameplay, responsive, asset-loading, suitability, licensing, production, implementation, shipping, completion, persistence, XP, idempotency, or API success is claimed. T8 remains unauthorized by this admission; see `_orchestrator/LAST-BATCH-STATUS.md`.*

- [x] **Track: APK Traversal and Exploration Evidence Cohort** *Link: [./archive/apk_corpus_audit_traversal_exploration_20260712/](./archive/apk_corpus_audit_traversal_exploration_20260712/)*
  Recover exact world, camera, movement, collision, transition, responsive, and asset evidence for seven traversal/exploration games. **Accepted with disclosure (2026-07-22):** Additive candidate `8a28856e` corrects the immutable legacy cohort approval publication binding without rewriting history; its separate current delegated product-owner acceptance and successor accepted-cohort manifest at `2e939507` establish conditional consumption. The committed closeout gates pass 12/12. The four stale lifecycle assertions remain immutable historical red-stage/pre-publication evidence, and every batch-level historical and browser-unknown disclosure remains binding. No browser/gameplay, completion, persistence, XP, idempotency, API, production, or asset-loading success claim is made; native-provider provenance remains unavailable.

- [x] **Track: APK Puzzle and Crafting Evidence Cohort** *Link: [./archive/apk_corpus_audit_puzzle_crafting_20260712/](./archive/apk_corpus_audit_puzzle_crafting_20260712/)*
  Recover exact board, station, matching, crafting, sequencing, content, responsive, and asset evidence for six games. **Accepted with disclosure (2026-07-22):** Fresh full-cohort review `752fecfd`, successor candidate `b3c95ab3`, ordered owner acceptance `ed1f3df3`, and accepted successor manifest `43b72620` establish conditional evidence consumption with zero unresolved Critical, High, or Medium findings. The active acceptance/consumption gate passes; V1 remains historical, non-authoritative, and non-consumable. Five product-owner manual-verification tasks remain explicitly deferred. No browser, gameplay, responsive, trusted-input, completion, persistence, XP, API, production, asset-loading, implementation, shipping, or ontology success is claimed.

  - [x] **Track: APK Special and Historical Evidence Cohort** *Link: [./archive/apk_corpus_audit_special_historical_20260712/](./archive/apk_corpus_audit_special_historical_20260712/)*
   Recover exact current and historical evidence for five distinctive, changed, cancelled, or missing games. **Accepted with disclosure (2026-07-22):** Batch A's unauthenticated nominal approval chronology was additively superseded by a current explicitly labeled retroactive ratification; Batch B candidate `497b2568` was additively superseded to correct its stale truth digest. The five-game reconciliation has 67 source-enveloped factual claims, 11 explicit unknowns, 30 negative fixtures, five bounded no-success browser dispositions, and 61/61 source/lifecycle gates green. Accepted manifest SHA-256: `4186dfd2…87b2b0`. No original message ID, gameplay success, responsive success, ontology, implementation, or shipping decision is claimed.

- [x] **Track: APK Per-Candidate Asset Forensics** *Link: [./archive/apk_existing_asset_candidate_audit_20260712/](./archive/apk_existing_asset_candidate_audit_20260712/)*
  Publish one forensic record per independently discovered legacy asset path;
  contact-sheet summaries cannot satisfy completion. The frozen denominator does
  not expand to the 43,068-file ElvGames standard pack. Remaining work records
  current function, semantic replacement requirements, and retirement evidence. **Accepted for T9-only consumption (2026-07-24):** 428 paths, 227 groups, 533 callers, 85 usage links, 308 responsive cells, and 4,279 recursive evidence locators reconcile; all 14 Priority-1 paths are reject-plus-retire; fresh AF-01–06 and AF-07–12 reviews are zero-Critical/High/Medium/Low. The active delegated-root successor binds owner event 4892bd5b…e1825e, root acceptance 4e6fc468…73c86, accepted manifest 20930a1c…68665f, and green report 8b33353f…010a5; the current acceptance gate passes production with zero errors and rejects 10/10 adversarial fixtures. Failed cycles v1/v2 remain quarantined and non-authoritative. The acceptance preserves six browser/usability defects plus 329 unknown dispositions and makes no implementation or shipping claim. The completed track remains at its active path through T11 to preserve hash-bound locator resolvability.

- [x] **Track: APK Evidence-Backed Ontology Synthesis** *Link: [./archive/apk_evidence_backed_ontology_synthesis_20260712/](./archive/apk_evidence_backed_ontology_synthesis_20260712/)*
  Bound the accepted T2–T8 evidence and standard-pack release; published evidence-only responsive contracts, 45 normalized usages, the exact 428-row path-free canonical-adoption matrix with 85 blocked mappings and zero adopted keys, ranked gaps/delivery, deterministic truth gates, exhaustive local reviews, and a non-consumable T9 candidate package. **Completed 2026-07-26:** final state `T9_CANDIDATE_READY_FOR_T10_NON_CONSUMABLE`; all unknown Must-have decisions remain blocked; T10 may start independent acceptance and alone may publish consumable successor hashes.

- [x] **Track: APK Independent Acceptance and Handoff** *Link: [./archive/apk_independent_acceptance_handoff_20260712/](./archive/apk_independent_acceptance_handoff_20260712/)*
  MAY START against the non-consumable T9 candidate package. Revalidate the full corpus and adopted asset mappings; bind the
  canonical root policy, catalog, receipts, and pack release; then exclusively
  publish post-approval successor hashes.

- [x] **Track: APK Shared Developer Kit and Authoring Workflow** *Link: [./archive/apk_shared_developer_kit_20260712/](./archive/apk_shared_developer_kit_20260712/)*
  Implement shared capabilities, the canonical resolver/materializer, authoring
  scaffold, enforcement, and QC. **Historical bounded T11 acceptance, 2026-07-26:**
  hash-bound owner acceptance was recorded after independent final
  review/remediation. T10 accepted
  (manifest `e9fc2c9c…39ba49`, successor hashes `c026c0bf…c74005`, owner
  acceptance `165e21c9…727253`, standard-pack release `2026.07.23`). Phases 0,
  1, 2, 5 (resolver contract), 6, 7 (scaffold/docs), and the simplification
  report (8) are accepted for the seven capabilities with 201 tests
  passing, lint/type/build/coverage green. Phases 3 (responsive) and 4
  (presentation) are implemented as fail-closed guards because T10 blocks all
  354 responsive contracts / 5664 cells and all 85 asset mappings. Browser,
  mobile, and performance success were not claimed. Runtime contracts,
  responsive contracts, all 85 historical asset mappings, Advantage Games QC,
  and cartridge cutover were dependency-gated at that checkpoint.
  **Owner-authorized extension completed 2026-07-26:** forward responsive,
  presentation, semantic binding, gameplay/runtime, QC, browser-helper,
  scaffold/exemplar, and Advantage Games `/qc` behavior is accepted with
  disclosures in `t11-owner-extension-acceptance-v1.json`
  (`c4753808…a3c3a0`). This additive acceptance preserves all historical T10/T11
  evidence classifications and does not authorize cartridge cutover. Package
  validation passed 234 tests at 89.69% statement coverage; targeted app and
  Chromium verification passed. Unrelated flaky aggregate Jest behavior,
  absent Reading/Primary consumers, representative-device FPS proof, and manual
  owner browser inspection remain explicitly open.

- [x] **Track: APK Product Simplification** *Link: [./tracks/apk_product_simplification_20260820/](./tracks/apk_product_simplification_20260820/)*
  Collapse remaining APK process tracks into catalog completion, live standard-pack art, and real Reading/Primary student game routes.

- [x] **Track: APK Catalog UX Remediation** *Link: [./tracks/apk_catalog_ux_remediation_20260820/](./tracks/apk_catalog_ux_remediation_20260820/)*
  Catalog UX waves W1–W4, music, leftover Konva page deletion, and old-URL redirects to `/student/games/apk/{id}` are complete.

- [~] **Track: APK Standard Game Experience** *Link: [./tracks/apk_standard_game_experience_20260810/](./tracks/apk_standard_game_experience_20260810/)*
  Briefing, guided tutorial, and class demonstration are in the live host. S4 debrief and S5 intern workflow stay dropped. S2 owner browser verification remains for later.

- [x] **Track: APK Legacy Catalog Completion** *Link: [./archive/apk_legacy_catalog_completion_20260818/](./archive/apk_legacy_catalog_completion_20260818/)*
  Refactored the exact 20 remaining legacy catalog games into standard APK
  cartridges. The 28-entry catalog, compact and wide browser lifecycle, both
  authenticated input modes, static assets, builds, and graph refresh passed.
  Final independent review found no unresolved Critical or High issues. This is
  the implementation for Action, Defense, and Puzzle titles.

- [x] **Track: APK Legacy Catalog Manual Browser Evidence — SUPERSEDED** *Link: [./archive/apk_legacy_catalog_manual_browser_evidence_20260819/](./archive/apk_legacy_catalog_manual_browser_evidence_20260819/)*
  Standing Fail report retired. Recapture belongs to `apk_product_simplification_20260820` after art loads on the authenticated catalog route.

- [x] **Track: APK Standard Asset Library Contract and Production** *Link: [./archive/apk_dual_theme_asset_production_20260712/](./archive/apk_dual_theme_asset_production_20260712/)*
  Accepted release `2026.07.23`: 43,075 receipt-bound assets, catalog digest
  `ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087`,
  exact parity, selected-union materialization, compact/wide QC, package guards,
  credit enforcement, and fail-closed accepted-release resolution. Cartridge
  adoption remains separately gated by T9/T10 and shared-kit acceptance.

- [x] **Track: APK Asset Contract v2** *Link: [./archive/apk_asset_contract_v2_20260728/](./archive/apk_asset_contract_v2_20260728/)*
  Additive successor that separates semantic role/state, physical descriptor,
  and cartridge presentation behavior. It makes animation and selected-union
  metadata descriptor-driven without reopening T10/T11 or authorizing migration.

- [x] **Track: APK Standard-Pack Suitability and Canonical Ingestion** *Link: [./tracks/apk_standard_pack_suitability_ingestion_20260728/](./tracks/apk_standard_pack_suitability_ingestion_20260728/)*
  Evidence-only contract and Existing Core dossiers are complete. Live catalog
  player and enemy roles reuse pack `2026.07.23` through `createCatalogStandardEdition`.
  Real legacy-asset ingestion remains unauthorized.

- [x] **Track: APK Durable Successor Registry and Release Admission** *Link: [./archive/apk_durable_successor_registry_20260730/](./archive/apk_durable_successor_registry_20260730/)*
  Replaces process-local APK successor reservations with a transaction-safe,
  backend-owned registry for immutable release-candidate admission. This
  infrastructure does not accept a real asset or authorize ingestion, title
  adoption, migration, cutover, retirement, deployment, or Git publication.

- [x] **Track: APK Cartridge Migration Umbrella (planning only)** *Link: [./archive/apk_cartridge_semantic_rewrite_20260712/](./archive/apk_cartridge_semantic_rewrite_20260712/)*
  Pins accepted T10/T11/standard-pack inputs and disclosures, resolves the accepted T2
  27-source-identity/29-partition-assignment discrepancy before any completeness claim,
  and delegates vertical implementation. **Planning completed 2026-07-27:** accepted receipt
  `d371fc5d…f1720` resolves 29 assignments as 27 source identities plus two historical labels
  and authorizes only the six listed cohorts to begin scoped work. No cohort is thereby ready;
  cutover, deletion, historical rebuild, and completeness claims remain cohort-gated.
  - [x] **Track: APK Denominator, Readiness, and T11 Release Integrity** *Link: [./archive/apk_denominator_readiness_t11_integrity_20260727/](./archive/apk_denominator_readiness_t11_integrity_20260727/)*
    Accepted exact owner message `approved`; receipt `d371fc5d…f1720` preserves all reviewed hashes, restrictions, disclosures, and child authorization boundaries.
- [x] **Track: APK Existing Core Cartridge Revalidation and Cutover** *Link: [./tracks/apk_existing_core_cutover_20260727/](./tracks/apk_existing_core_cutover_20260727/)*
    Five core titles play as APK cartridges on Advantage Games, Reading, and Primary. Leftover Konva pages redirect to `/student/games/apk/{id}`. Task 6 keeps the 32 inventory PNG paths. Hidden host-proof pages stay frozen.
  - [x] **Track: APK Existing Action Cartridge Revalidation and Cutover — SUPERSEDED** *Link: [./archive/apk_existing_action_cutover_20260727/](./archive/apk_existing_action_cutover_20260727/)*
    Superseded by catalog completion. Do not rebuild Archer's Revenge, Paladin's Twin-Soul, Griffin Sky-Joust, Gryphon Patrol, or Realm Carver as a new cutover program.
  - [x] **Track: APK Legacy Defense Rebuild and Cutover — SUPERSEDED** *Link: [./archive/apk_legacy_defense_cutover_20260727/](./archive/apk_legacy_defense_cutover_20260727/)*
    Superseded by catalog completion. Do not rebuild Castle Defense, Wizard vs Zombie, Village Guardian, or Storm the Castle Tower as a new cutover program.
  - [x] **Track: APK Legacy Traversal Rebuild and Cutover** *Link: [./tracks/apk_legacy_traversal_cutover_20260727/](./tracks/apk_legacy_traversal_cutover_20260727/)*
    Five traversal titles play as APK cartridges on Advantage Games, Reading, and Primary. Leftover Konva pages redirect to `/student/games/apk/{id}`. Hidden host-proof pages stay frozen.
  - [x] **Track: APK Legacy Puzzle Rebuild and Cutover — SUPERSEDED** *Link: [./archive/apk_legacy_puzzle_cutover_20260727/](./archive/apk_legacy_puzzle_cutover_20260727/)*
    Superseded by catalog completion. Do not rebuild Enchanted Library, Rune Match, Alchemist's Synthesis, Potion Rush, or Rune Forge Chamber as a new cutover program.
  - [x] **Track: APK Historical/Cancelled Identity Disposition** *Link: [./archive/apk_historical_identity_disposition_20260727/](./archive/apk_historical_identity_disposition_20260727/)*
    **Accepted with disclosure (2026-07-31; accepted-gated-disposition-only):** `product-owner-acceptance-v1.json` binds defer for RPG Battle, Devourer Slime, and The Haunted Library, and retain-history for The Abyssal Well and Babel Architect, against the independently reviewed evidence. Catalog completion later shipped playable APK ports for the deferred titles.
  - [x] **Track: APK Planned/New-Game Intake** *Link: [./archive/apk_new_game_intake_20260727/](./archive/apk_new_game_intake_20260727/)*
    Intake template published. No future game is accepted. Closed as registry hygiene.
  - [x] **Track: APK Residual Cross-Host Retirement and Closeout** *Link: [./archive/apk_cross_host_closeout_20260727/](./archive/apk_cross_host_closeout_20260727/)*
    Closed as registry hygiene. Residual leftover pages are not a separate program.

- [x] **Track: APK Dual-Theme Production Asset Packs — SUPERSEDED, DO NOT IMPLEMENT** *Link: [./archive/apk_dual_theme_asset_packs_20260711/](./archive/apk_dual_theme_asset_packs_20260711/)*
  Superseded 2026-07-12 because it froze a speculative physical inventory before completing cross-game requirements analysis. Retained as failure evidence; no completion claim is made.

- [x] **Track: APK Arena & Target Action Wave W4** *Link: [./archive/apk_arena_target_action_wave_w4_20260711/](./archive/apk_arena_target_action_wave_w4_20260711/)*
  Rebuild Archer's Revenge, Paladin's Twin-Soul, Griffin Sky-Joust, Gryphon Patrol, and Realm Carver as shared Phaser 4 APK cartridges, establishing reusable arena, projectile, aerial-target, minimap, and territory systems with exact cutover evidence. Archived 2026-07-12.

- [x] **Track: APK Runner Traversal Wave W3** *Link: [./archive/apk_runner_traversal_wave_w3_20260711/](./archive/apk_runner_traversal_wave_w3_20260711/)*
  Archived 2026-07-11 after dual-edition desktop/mobile completion, shared authenticated persistence, 120 cartridge tests at 92.91% statement coverage, exact 44-file legacy retirement, and mandatory review with zero Critical/High/Medium findings.

---

## Codecamp Mastery Learning Platform Program (created 2026-07-10)

> Codecamp is the first production proof of the shared Mastery Advantage KST+SRS
> engine. Program decisions and dependency gates are recorded in
> [codecamp-mastery-learning-platform-program.md](./codecamp-mastery-learning-platform-program.md).
> Execute the engine import first; graph and activity-runtime work may then proceed in
> parallel, followed by intervention tutoring and PR mastery evaluation.

- [x] **Track: Codecamp Knowledge Graph and APK Game-Creation Unit** *Link: [./archive/codecamp_knowledge_graph_apk_unit_20260710/](./archive/codecamp_knowledge_graph_apk_unit_20260710/)*
  Author the Codecamp prerequisite graph, bind the current curriculum and PR exercises to objective/variant evidence, and add a tutorial-first Phaser 4 game-creation unit built on the Advantage Play Kit and React host components. Archived 2026-07-12.
- [x] **Track: Shared Interactive Video and Tutorial Runtime** *Link: [./archive/shared_video_tutorial_runtime_20260710/](./archive/shared_video_tutorial_runtime_20260710/)*
  Build the React/Next/Vinext-compatible I Do and We Do runtime for YouTube/hosted video, diagrams, timestamped questions, tutorial repositories, deterministic step checks, and `practice.v1` evidence. Archived 2026-07-12.
- [~] **Track: Codecamp Targeted Intervention Tutor** *Link: [./tracks/codecamp_intervention_tutor_20260710/](./tracks/codecamp_intervention_tutor_20260710/)*
  Replace general chat with a MiMo-V2.5 intervention coach grounded in the current objective, activity step, test failure, misconceptions, hint history, and curated lesson/video/repository resources.
- [~] **Track: Codecamp PR Review as Mastery Evidence** *Link: [./tracks/codecamp_pr_mastery_evaluation_20260710/](./tracks/codecamp_pr_mastery_evaluation_20260710/)*
  Route PR review explicitly to OpenRouter `~x-ai/grok-latest`, expand the structured Zod result into graph-linked rubric evidence, preserve advisory review semantics, and feed validated results into KST+SRS without equating one approval with permanent mastery.

- [~] **Track: Sales Advantage Shared Mastery Consumer** *Link: [./tracks/sales_mastery_consumer_20260810/](./tracks/sales_mastery_consumer_20260810/)*
  Bind the approved Sales course to stable objectives and variants, map each
  verified company organization to an isolated Mastery tenant, and project
  eligible quiz and roleplay evidence into the shared KST/SRS runtime. Sales
  remains a course and never owns CRM, licensing, invoice, or commission data.

---

## Versioned Workbook Content Program (created 2026-07-11)

> Workbook editions reuse Reading Advantage and Primary Advantage source content while
> preserving an immutable, reproducible release snapshot. This program establishes the
> versioning foundation before the standalone workbook dashboard is imported.

- [ ] **Track: Versioned Workbook Content and Editions** *Link: [./tracks/workbook_content_versioning_20260711/](./tracks/workbook_content_versioning_20260711/)*
  Define the shared article-and-asset catalog contract, publish immutable workbook editions,
  and retain the provenance needed to reproduce every rendered workbook artifact.

---

## App Go-Live / MVP Completion (created 2026-07-01)

> Deploy-and-ship tracks for the two apps that are feature-built but not on Cloud Run.
> These own build/deploy/QA only; they **consume** the security remediation waves as hard
> preconditions and do not duplicate them (see `medium-plus-coverage-matrix.md`).

- [~] **Track: Sales Advantage Go-Live** *Link: [./tracks/sales_advantage_golive_20260701/](./tracks/sales_advantage_golive_20260701/)*
  Take `apps/sales-advantage` from code-complete to a deployed MVP. Feature surface (domain,
  router, audio-upload route, rep/admin UI, chat, quiz, seed script) already exists on HEAD;
  `sales_advantage_mvp_20260622` Phases 3–7 are implemented (checkboxes stale). This track
  hard-gates on Wave 1 sales security (IDOR/route-gating/tRPC role-enum/XSS/schema drift),
  seeds + human-approves real curriculum, adds Docker/cloudbuild, provisions the cloud
  `sales_advantage` DB, deploys to Cloud Run, and runs end-to-end QA. Successor to
  `sales_advantage_mvp_20260622` Phase 8.

- [x] **Track: Marketing Go-Live** *Link: [./archive/marketing_golive_20260701/](./archive/marketing_golive_20260701/)*
  Take `apps/marketing` (the video-production pipeline; FR-1..FR-6 met, 151 tests green in the
  archived `video_pipeline_20260613`) from feature-complete to a deployed MVP. The deferred
  `vinext`/`vite parseSync` build blocker is **resolved** (`pnpm --filter marketing build`
  green on 2026-07-01) — Phase 0 verifies + pins it. Hard-gates on Wave 3 marketing security
  (the `GET /api/settings` decrypted-API-key leak + unauthenticated `/api/video/*` routes),
  adds a **vinext-runtime** Dockerfile + cloudbuild, provisions the DB, deploys to Cloud Run,
    and runs manual QA. Successor to the deferred build/deploy remainder of `video_pipeline_20260613`.

- [x] **Track: CodeCamp Measure-Driven AI Development Curriculum Unit** *Link: [./archive/codecamp_measure_curriculum_unit_20260709/](./archive/codecamp_measure_curriculum_unit_20260709/)*
  Add a standalone Measure methodology unit after AI Integration, then shift Monorepo, Cloud/Docker, and Real-World Practice to later unit numbers without disrupting interns currently in Unit 10 or Unit 11.
  Archived 2026-07-15 after production seed, Cloud Run deployment, authenticated curriculum/diagram acceptance, and the TenantDB production regression hotfix.

- [~] **Track: CodeCamp Interactive Media and Diagrams Integration** *Link: [./tracks/codecamp_interactive_media_diagrams_20260709/](./tracks/codecamp_interactive_media_diagrams_20260709/)*
  Introduce curated YouTube tutorial embeds and 16 unit-level visual diagrams/illustrations across the CodeCamp curriculum, adapting database seed data and frontend rendering components.

- [~] **Track: Codecamp PR Review Recovery** *Link: [./tracks/codecamp_pr_review_recovery_20260820/](./tracks/codecamp_pr_review_recovery_20260820/)*
  Stop Codecamp PR reviews from dying permanently on the first contract failure. Strip generated artifacts instead of killing the review, make model-shape violations retryable with a repair prompt, widen the retry budget, and show the learner the true review state instead of a permanent "pending". Code complete and verified 2026-08-20 (baseline recorded, phases 1-4 checkpointed); production deploy and live verification pending owner timing.

- [~] **Track: Codecamp SSO Redirect Repair** *Link: [./tracks/codecamp_sso_redirect_repair_20260820/](./tracks/codecamp_sso_redirect_repair_20260820/)*
  Repair the company SSO redirect chain: carry the destination through sign-in, stop overwriting the learner's language cookie, honor the Cloud Run forwarding hop in every auth route, and surface sign-in errors.

- [~] **Track: SSO Dev Cookie Prefix Hotfix** *Link: [./tracks/sso_dev_cookie_prefix_hotfix_20260922/](./tracks/sso_dev_cookie_prefix_hotfix_20260922/)*
  Real browsers reject the `__Host-` OIDC cookies without `Secure`, so local plain-HTTP SSO sign-in cannot complete for accounting, sales, marketing, or codecamp. Found by owner manual verification S2.1 on 2026-09-22; blocks local sessions S2–S4.

- [x] **Track: Reading Article List UUID Cast Hotfix** *Link: [./tracks/reading_article_list_uuid_cast_hotfix_20260923/](./tracks/reading_article_list_uuid_cast_hotfix_20260923/)*
  The read-page article list joined `userActivity.targetId` (text) to `articles.id` (uuid) without a cast, so the list was empty for signed-in students. Found by owner manual verification S5.1 on 2026-09-23; fixed with an `::text` cast and live-verified.

- [x] **Track: Matching Word Payload Shape Hotfix** *Link: [./tracks/matching_word_shape_hotfix_20260923/](./tracks/matching_word_shape_hotfix_20260923/)*
  The vocabulary Matching tab rendered empty cards for legacy `{ word, translation }` word payloads; the fetcher read only the canonical shape. Same bug class as reading_qa_vocab_flashcards_20260918. Found by owner manual verification S5.3 on 2026-09-23; fixed with shape normalization and live-verified.

- [x] **Track: Chatbot Question Store Hotfix** *Link: [./tracks/chatbot_question_store_hotfix_20260923/](./tracks/chatbot_question_store_hotfix_20260923/)*
  The floating chatbot could not send on article read pages: a poisoned question store made `mcQuestion.results.map` throw, then `blacklistedQuestions` serialized undefined entries as null and failed the API schema. Found by owner manual verification S5.5 on 2026-09-23; fixed with defensive chaining and payload filtering, live-verified.

- [x] **Track: Goals and Signin i18n Hotfix** *Link: [./tracks/goals_signin_i18n_hotfix_20260923/](./tracks/goals_signin_i18n_hotfix_20260923/)*
  The student goals page and signin labels kept hardcoded English after the structural track's FR-6. Added the `pages.student.goalsPage` scope and signin label keys in all five locales. Found by owner manual verification S5.19 on 2026-09-23; live-verified in Thai.

- [x] **Track: System Metrics Classroom Join Hotfix** *Link: [./tracks/system_metrics_classroom_join_hotfix_20260923/](./tracks/system_metrics_classroom_join_hotfix_20260923/)*
  The system dashboard showed 'No data available': the system metrics query selected `classroomStudents.id` without joining the table. Found by owner manual verification S5.14 on 2026-09-23; fixed and live-verified.

- [~] **Track: Marketing Shortfall Count Hotfix** *Link: [./tracks/marketing_shortfall_count_hotfix_20260922/](./tracks/marketing_shortfall_count_hotfix_20260922/)*
  The 422 topic-shortfall response carries the count but the client only reads 400 bodies. Found by owner manual verification S3.10 on 2026-09-22.

- [ ] **Track: Sales and Marketing SSO Parity and Demo Accounts** *Link: [./tracks/sales_marketing_sso_parity_20260829/](./tracks/sales_marketing_sso_parity_20260829/)*
  Port the Codecamp SSO redirect repair to Sales and Marketing: carry the destination through sign-in, stop overwriting the language cookie, port the forwarding-origin approval with the Codecamp callback-origin handoff, fail cleanly on unsafe return paths, surface sign-in errors, deny   no-role sessions, and provision demo-only acceptance accounts with generated credentials. Part of the five-app launch program; this is the SSO hard gate. Plan reviewed and approved 2026-08-29 (reviews/plan-review-a-2026-08-29-r5.json: pass).

- [ ] **Track: Accounting Dedicated Database Launch** *Link: [./tracks/accounting_dedicated_db_launch_20260830/](./tracks/accounting_dedicated_db_launch_20260830/)*
  Take `apps/accounting`, the only one of the five company apps with no Cloud Run deployment, to production on its own dedicated database: a separate `accounting` database on the shared Cloud SQL instance following the company-identity layout (own drizzle journal, runtime client, migration/runtime roles, secrets), SSO origin-approval and redirect parity with the Sales repair, a candidate no-traffic Cloud Build pipeline with a manual acceptance-gated promotion script, and DNS for accounting.reading-advantage.com. Status: Draft 2026-08-30.

- [ ] **Track: Codecamp Tutor Consolidation** *Link: [./tracks/codecamp_tutor_consolidation_20260820/](./tracks/codecamp_tutor_consolidation_20260820/)*
  Retire the stateless /api/chat route and extend the intervention tutor with an ask mode, so all 88 lessons gain conversation memory, lesson-content grounding, curated resources, and support telemetry.

- [ ] **Track: Codecamp Mastery Evidence Projection** *Link: [./tracks/codecamp_mastery_evidence_projection_20260820/](./tracks/codecamp_mastery_evidence_projection_20260820/)*
  Make Codecamp learner evidence trustworthy (stored exercise submissions, recorded quiz attempts, earned theory completion), then open the knowledge-space projection for every module instead of only Unit 20.

---

## Reading Advantage UX Refactor Program (created 2026-09-11)

> Five implementation tracks derived from the 2026-09-11 UX audit of all 60
> user-facing pages of `apps/reading-advantage`. Source plan:
> `docs/reading-advantage-ux-refactor-plan.md`. Execute in listed order;
> tracks 2 and 3 may run in parallel after track 1; tracks 4 and 5 are
> sequential after 1-3 to avoid conflicts on shared components.

- [~] **Track: Reading Broken UX Fixes** *Link: [./tracks/broken_ux_fixes_20260911/](./tracks/broken_ux_fixes_20260911/)*
  Fix 404 links, broken client directives, crash-risk imports, audio leaks, and visual typos from the UX audit. One-line and small fixes only. **FR-1..9 implemented 2026-09-11 (9 commits, 13/13 static tests); FR-10 games auth policy resolved; owner manual verification PASSED 2026-09-23 (session S5.1-S5.6; three live defects hotfixed). Phase 4 docs/doctor tasks remain open.**
- [~] **Track: Reading Audio and Highlighting Correctness** *Link: [./tracks/audio_highlight_correctness_20260911/](./tracks/audio_highlight_correctness_20260911/)*
  Consolidate four audio/highlight implementations into one shared hook; fix speed-switch restarts, double-advance race, timer leaks, and highlight color semantics. **Implemented 2026-09-11 (11 commits, 12/12 new tests); owner manual verification PASSED 2026-09-23 (session S5.7-S5.11). Phase 4 docs/doctor tasks remain open.**
- [~] **Track: Reading Loading and State Correctness** *Link: [./tracks/loading_state_correctness_20260911/](./tracks/loading_state_correctness_20260911/)*
  Fix double pagination, infinite-scroll race, stuck skeletons, translate request storm, render-phase side effects, and wrong KPI labels. **Implemented 2026-09-11 (11 commits, 14/14 new tests); owner manual verification PASSED 2026-09-23 (session S5.12-S5.15; translate creds gap noted). Phase 4 docs/doctor tasks remain open.**
- [~] **Track: Reading Component Deduplication** *Link: [./tracks/component_deduplication_20260911/](./tracks/component_deduplication_20260911/)*
  Merge ten forked component pairs (~2,200 duplicated quiz-card lines included), extract shared helpers, delete dead code. **Implemented 2026-09-11 in two parallel parts (18+ commits; ~1,990 forked quiz lines deleted; `system-articles.tsx` retained — two real importers); owner manual verification PASSED 2026-09-23 (session S5). Phase 4 docs/doctor tasks remain open.**
- [~] **Track: Reading Structural UX Alignment** *Link: [./tracks/structural_ux_alignment_20260911/](./tracks/structural_ux_alignment_20260911/)*
  Server-side dashboard/goals data, remove internal self-HTTP fetches, student-progress role check, server-owned level-test XP, i18n and a11y passes, shell cleanup. **Implemented 2026-09-11 (12 commits, 984 tests green); games-catalog card a11y deferred behind APK track's uncommitted files; owner manual verification PASSED 2026-09-23 (session S5.16-S5.20; i18n gap hotfixed as 3f85a13a4; sidebar/timeline client fetches filed as findings). Phase 4 docs/doctor tasks remain open.**

---

## Reading Advantage QA P0 Program (created 2026-09-18)

> Three P0 bug tracks from the 2026-09-16/17 sequential browser QA of
> `apps/reading-advantage` (evidence: `/tmp/opencode/qa-reports/SUMMARY.md`).
> Execute sequentially; two tracks touch the flashcard controller family.
> The two list-endpoint text=uuid join fixes from the same QA session sit
> uncommitted in the working tree and stay outside these tracks.

- [x] **Track: Reading QA — Article Detail 400** *Link: [./tracks/reading_qa_article_detail_20260918/](./tracks/reading_qa_article_detail_20260918/)*
  Fix the HTTP 400 on `GET /api/v1/articles/{uuid}`: the detail guard rejects
  schema-nullable `type` and `imageDescription`, so no article can be opened.
  *Implemented 2026-09-18 (commit `10c74f1`, live 200 verified); independent review compliant, no findings; owner manual verification PASSED 2026-09-23 (session S5.21).*

- [x] **Track: Reading QA — Vocabulary Flashcard Content** *Link: [./tracks/reading_qa_vocab_flashcards_20260918/](./tracks/reading_qa_vocab_flashcards_20260918/)*
  Fix empty vocabulary flashcards: the study-card payload uses a legacy key shape
  the reader does not recognize, so cards render "No word" / "No translation".
  *Implemented 2026-09-18 (commit `3ec4216`, live card content verified); review compliant with two Low findings recorded in metadata; owner manual verification PASSED 2026-09-23 (session S5.22).*

- [x] **Track: Reading QA — SRS Review Persistence** *Link: [./tracks/reading_qa_srs_persistence_20260918/](./tracks/reading_qa_srs_persistence_20260918/)*
  Fix review persistence: rated sessions do not advance FSRS fields, due
  counters, the activity log, or XP.
  *Implemented 2026-09-18 (commit `191b546`, live persistence verified); review found one High — `targetId` acceptance widens tech-debt F-D5 fake-target XP farming (registry row amended, follow-up owed); owner manual verification PASSED 2026-09-23 (session S5.23).*

---

## Reading QA Follow-Up Program (created 2026-09-18)

> Owner manual verification on 2026-09-18 rejected the lesson page: no image,
> audio, translation, or questions; about 20 browser issues. Server evidence:
> questions endpoints 500, translate 404, activitylog 400, 240 missing-i18n
> log hits, and 0 rows in every question table. L2 fixes code; L1 fixes data.
> Execute L2 first.

- [ ] **Track: Reading QA — Lesson Page Code Defects** *Link: [./tracks/reading_qa_lesson_page_20260918/](./tracks/reading_qa_lesson_page_20260918/)*
  Fix the questions-endpoint 500s, the translate 404, the lesson activitylog
  400, the missing `selectType.types.*` keys, and graceful states for absent
  image/audio/translation.

- [ ] **Track: Reading QA — Lesson Seed Completeness** *Link: [./tracks/reading_qa_lesson_seed_20260918/](./tracks/reading_qa_lesson_seed_20260918/)*
  Make the demo seed complete and idempotent: fix the `xp_logs` crash and seed
  readable passages, image descriptions, MCQ/SA/LA questions, and Thai
  translations.

---

## Student-Route Memory Optimization Program (created 2026-09-18)

> Source: the 2026-09-18 "Read + Primary Advantage Student Routes" memory
> audit — 47 findings (25 server, 22 client), static analysis, every item
> cites file:line. Wave 1 takes audit items 8 and 3 (small, low-risk, large
> effect). The audit's deploy-path caveat gates the container work:
> `apps/reading-advantage/cloudbuild.yaml:63` builds a `./web` context that
> does not exist in this repo, so confirm the real deploy pipeline before
> audit item 1 or the standalone-output rewrite.

- [ ] **Track: Memory — Client Quick Wins** *Link: [./tracks/reading_mem_client_quick_20260918/](./tracks/reading_mem_client_quick_20260918/)*
  Release article audio buffers, stop the audio cache-buster, close the
  AudioContext, release per-sound Audio objects, reset the game store
  (audit item 8; C13, C14, C21).

- [ ] **Track: Memory — Bound the Metrics Cache** *Link: [./tracks/reading_mem_metrics_cache_20260918/](./tracks/reading_mem_metrics_cache_20260918/)*
  Bound the three unbounded Maps in `lib/cache/metrics.ts` with FIFO eviction
  and make `clear()` complete (audit item 3; S2, S3).

### Queued (planned — spec on pickup)

- [ ] **Track: Memory — Lazy Lesson Bundles** *(reading_mem_lazy_bundles_20260918 — planned)*
  next/dynamic per lesson phase and the four phase-10 games; lazy recharts on
  the dashboard; swap MUI Rating and lodash imports on student paths; add a
  bundle analyzer baseline (audit item 5; C1, C5, C6, C17-C22).
- [ ] **Track: Memory — i18n Namespace Split** *(reading_mem_i18n_namespaces_20260918 — planned)*
  Send each layout only the translation namespaces it uses instead of the full
  294 KB Thai catalogue, both apps; walk every student route afterwards
  (audit item 2; C3, C4, S14).
- [ ] **Track: Memory — Sprite Sheet Resize** *(reading_mem_sprites_20260918 — planned)*
  Resize the seven 1024×1024 game PNGs to drawn size, convert to WebP, and
  scale the fixed crop offsets (audit item 4; C2).
- [ ] **Track: Memory — Student Query Bounds** *(reading_mem_query_bounds_20260918 — planned)*
  Add limits, column lists, and SQL-side filters to the student endpoints that
  read whole tables (audit item 6; S4-S10).
- [ ] **Track: Memory — Runtime and Container Limits** *(reading_mem_runtime_limits_20260918 — planned, blocked)*
  Heap limit, Cloud Run memory/concurrency/instance settings, standalone
  output. Precondition: confirm the real deploy path (audit items 1, 7; S24).
- [ ] **Track: Memory — Shared Package Barrels** *(reading_mem_shared_barrels_20260918 — planned)*
  Per-app router composition, domain `db-contract` subpath imports, play-kit
  `./audio` subpath plus `sideEffects: false`; remove the eight unused
  packages from configs (audit shared-packages A and B).

---

## Primary Advantage UX and Security Refactor Program (created 2026-09-12)

> Six implementation tracks derived from the 2026-09-12 five-theme audit of
> `apps/primary-advantage`. Source plan:
> `docs/primary-advantage-ux-refactor-plan.md`. The issue mix is not the same
> as reading-advantage: authorization is the dominant problem and has no
> counterpart in the reading tracks. Execute in listed order. Track 1 blocks
> everything else. Tracks 2 and 3 may run in parallel after track 1. Track 4
> may run in parallel with 2 and 3. Track 5 is sequential after 1-4. Track 6
> is optional long tail after 5.
>
> Corrections baked into the specs: `/api/students` and `/api/teachers` look
> unguarded at the route but their controllers enforce roles; `class-roster.tsx`
> and `reports.tsx` have zero importers — delete them rather than fix them.
> Do not redo `primary_proxy_role_normalization_20260728` casing work.

- [ ] **Track: Primary Authorization Hardening** *Link: [./tracks/primary_authorization_hardening_20260912/](./tracks/primary_authorization_hardening_20260912/)*
  Close the write-path holes: privilege escalation on `PATCH /api/users/[id]`, five unauthenticated API routes (including unbounded AI spend and path-join `unlink`), ten unguarded server actions including `deleteAllArticles`, client-authoritative XP, and cross-tenant student reads. Blocks tracks 2-6.
- [ ] **Track: Primary Broken UX Fixes** *Link: [./tracks/primary_broken_ux_fixes_20260912/](./tracks/primary_broken_ux_fixes_20260912/)*
  Fix Chinese message scopes, the blank `/admin` landing page, dead admin and footer links, `captoliza` typos in live files, the stray `act` import, and two `console` module imports. One-line and small fixes only.
- [ ] **Track: Primary Audio and Highlighting Correctness** *Link: [./tracks/primary_audio_highlight_correctness_20260912/](./tracks/primary_audio_highlight_correctness_20260912/)*
  No shared audio hook exists here. Extract one `useAudioSegment` hook, cancel the highlight `setTimeout` chain, fix `AudioButton` `load()` and zero end time, align lesson audio field names, and stop leaked clips.
- [ ] **Track: Primary Loading and State Correctness** *Link: [./tracks/primary_loading_state_correctness_20260912/](./tracks/primary_loading_state_correctness_20260912/)*
  Fix stuck skeletons, the games-page hydration mismatch, unbounded article scroll, the admin search storm, components declared inside a render body, and hardcoded Thai lookups.
- [ ] **Track: Primary Component Deduplication** *Link: [./tracks/primary_component_deduplication_20260912/](./tracks/primary_component_deduplication_20260912/)*
  Delete nine dead files first (including `class-roster.tsx` and `reports.tsx`), then merge nine fork pairs (6,082 identical lines). About 13,900 lines are removable.
- [ ] **Track: Primary Structural Alignment (optional)** *Link: [./tracks/primary_structural_alignment_20260912/](./tracks/primary_structural_alignment_20260912/)*
  Long tail: migrate 33 API routes onto `createTenantDB` and `assertCan`, add `error.tsx` per route group, and close remaining i18n and a11y gaps. Optional. Run after track 5.
- [x] **Track: Primary Test Hygiene and Upload Fixes** *Link: [./tracks/primary_test_hygiene_upload_fixes_20260914/](./tracks/primary_test_hygiene_upload_fixes_20260914/)*
  Close the three deferred items from the repair-wave "Known limitations": convert the 97 static source-grep tests to behavioral tests in per-domain batches (old assertions stay green alongside until replacements pass), make upload writes session-authoritative for school scoping, and make `upload/csv` deduplicate emails with conflict-safe inserts instead of a 500. **Implemented 2026-09-14 (orchestrated, 17/17 tasks): true count was 149 cases, all resolved; upload routes session-authoritative with validated dedupe summary; suite 571/571 exit 0, tsc 17 pre-existing, ESLint 0 errors; owner manual verification PASSED 2026-09-23 (session S6.1-S6.3; cross-school classroom probe clean).**

---

- [ ] **Track: Standard Play Maps** *Link: [./tracks/apk_standard_play_maps_20260910/](./tracks/apk_standard_play_maps_20260910/)*
  Generalize the existing Wizard graveyard map into one shared typed layout contract, then author nine top-down play maps (PNG plus typed layout) for the Advantage games. Rebuild Wizard vs. Zombie from scratch as the reference map. Keep collision rules stable and leave composed art outside the pinned standard pack.
  *Status: Implementation complete 2026-09-10 — shared `StandardPlayMap` contract, nine typed layouts, nine composed PNGs, and focused tests (48 map tests + 64 Wizard engine tests green). Documented deviation: only Wizard renders its authored map in-engine; the other eight cartridges keep procedural layouts pending a wiring follow-up. 53 pre-existing check-types errors remain in untouched files.*

---

## Archived Tracks

- [x] **Track: Measure APK Evidence Integrity Gates — COMPLETED** *Link: [./archive/measure_apk_evidence_integrity_gates_20260712/](./archive/measure_apk_evidence_integrity_gates_20260712/)*
  Build exact-source, independent-denominator, mandatory-subagent, stop-loss, counterexample, and completion gates before another APK audit begins. All 46 tasks complete; v8 accepted manifest at measure/evidence-integrity-accepted-gate.json; successor APK evidence tracks unblocked. Archived 2026-07-13.

- [x] **Track: Mastery Engine v3.2 Import and Shared Runtime** *Link: [./archive/mastery_engine_v32_import_20260710/](./archive/mastery_engine_v32_import_20260710/)*
  Completed 2026-07-10. Imported and migrated the four domain-neutral engine packages to `kst-srs.v3.2`, added tenant-safe portable persistence, and established strict runtime/release governance with a synthetic Codecamp consumer proof.

- [x] **Track: APK Incomplete Sentence Action W1** *Link: [./archive/apk_incomplete_sentence_action_20260710/](./archive/apk_incomplete_sentence_action_20260710/)*
  Archived 2026-07-10 after product-owner approval. Delivered Astral Mage target action and The Sorcerer's Ziggurat isometric traversal as Phaser 4 cartridges, dual-edition and Reading/Primary host proofs, real keyboard and mobile-touch QC, and playable Advantage Games QC deep links while preserving the stable sentence/result ABI. Authenticated production hosting remains successor-owned.

- [x] **Track: APK Advantage Games Arcade Host W2** *Link: [./archive/apk_advantage_games_arcade_host_w2_20260710/](./archive/apk_advantage_games_arcade_host_w2_20260710/)*
  Archived 2026-07-11 after product-owner authorization and browser acceptance. Delivered the dynamic first-party student session host, one generic route for all five APK cartridges, strict server-owned completion persistence with concurrent idempotency, responsive one-canvas lifecycle, and the continuous production arcade loop.

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

- [~] **Track: Storage Hardening and Floci Verification**
  *Link: [./tracks/storage_hardening_20260611/](./tracks/storage_hardening_20260611/)*
  Finish `exists()` error classification, URL encoding, and safe configuration
  diagnostics. Add pinned Floci 1.7.0 for local development and explicit storage
  integration gates in CI. Signed GET and private-by-default uploads are complete.
  Sales, Accounting, and Reading now consume the adapter. Legacy Reading and
  Primary GCS cutovers remain deferred under the portfolio hold policy.

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

- [x] **Track: Monorepo Package Review**
  *Link: [./tracks/monorepo_package_review_20260907/](./tracks/monorepo_package_review_20260907/)*
  Evaluate all workspace units and repair confirmed defects under the Ponytail Rules.

- [x] **Track: APK Named Asset Cuts** *Link: [./tracks/apk_named_asset_cuts_20260907/](./tracks/apk_named_asset_cuts_20260907/)*
  Prepare several sheets per review batch and process approved cuts.
