# Implementation Plan: Shared Foundation Review

> **Track ID:** `shared_foundation_review_20260626`  
> **Parent:** `monorepo_feature_review_masterplan_20260626`  
> **Methodology:** Inventory first, evidence-backed review second, remediation proposals last.

---

## Phase 0: Setup and Inventory

- [x] Task: Confirm `graph.db` is fresh and non-empty with `build-graph stats ./graph.db`. — evidence: acceptance run reported 22,185 nodes, 46,017 edges, 2,715 files in `00-inventory.md`. (sha: b05b5cd2)
- [x] Task: Create `measure/audit-reports/shared-foundation_20260626/`. — evidence: six final artifacts plus four phase result JSONs and acceptance result JSON are present in that directory. (sha: b05b5cd2)
- [x] Task: Record package inventory counts from `build-graph stats`, `build-graph files`, and package manifests. — evidence: `00-inventory.md` graph/package inventory and package manifest tables. (sha: b05b5cd2)
- [x] Task: List all package scripts and quality gates from package manifests without running full review yet. — evidence: `00-inventory.md` package entries and gate summary. (sha: b05b5cd2)

## Phase 1: Database and Tenancy

- [x] Task: Inventory `packages/db` schemas, migrations, seeds, migration ledger, and exports. — evidence: `00-inventory.md`; `phase1-db-tenancy-result.json`. (sha: b05b5cd2)
- [x] Task: Review tenant registry coverage and referential scoping rules in `packages/domain`. — evidence: `findings.md` F-SF-001/F-SF-004/F-SF-005; `test-gaps.md` TG-SF-001/TG-SF-002. (sha: b05b5cd2)
- [x] Task: Check schema/migration drift risks, destructive migrations, and seed coupling. — evidence: `findings.md` F-SF-006/F-SF-014/F-SF-025 and Phase 1 result findings F-DB-003/F-DB-004/F-DB-008. (sha: b05b5cd2)
- [x] Task: Record findings in `findings.md` and test gaps in `test-gaps.md`. — evidence: final `findings.md` and `test-gaps.md` synthesize Phase 1 issues. (sha: b05b5cd2)

## Phase 2: Auth, Sessions, Permissions, Audit

- [x] Task: Inventory `packages/auth` and `packages/auth-client` exports and callers. — evidence: `00-inventory.md`; `phase2-auth-security-result.json`. (sha: b05b5cd2)
- [x] Task: Review password hashing, sessions, rate limiting, audit logging, role/permission registration, and tenant resolution. — evidence: `checklist.md` Auth section; `findings.md` F-SF-010/F-SF-011/F-SF-024. (sha: b05b5cd2)
- [x] Task: Identify legacy JWT/Firebase compatibility risks that app reviews must verify. — evidence: Phase 2 result records no shared auth JWT/Firebase remnants; downstream caveats retained for app reviews. (sha: b05b5cd2)
- [x] Task: Record findings and proposed remediation tracks. — evidence: `findings.md` F-SF-010/F-SF-011/F-SF-023/F-SF-024; `migration-tracks.md` M-SF-5. (sha: b05b5cd2)

## Phase 3: Domain and API Boundaries

- [x] Task: Inventory `packages/domain` modules and exported business functions. — evidence: `00-inventory.md` domain package entry and subpath export list. (sha: b05b5cd2)
- [x] Task: Review module structure: contracts, queries, mutations, permissions, errors, tests. — evidence: `findings.md` F-SF-007/F-SF-008/F-SF-012/F-SF-013; `checklist.md` Domain/API sections. (sha: b05b5cd2)
- [x] Task: Inventory `packages/api` tRPC routers and route adapters. — evidence: `00-inventory.md` API package entry and Phase 3 result JSON. (sha: b05b5cd2)
- [x] Task: Verify transport layers are thin and domain behavior is reusable outside tRPC/Next routes. — evidence: `findings.md` F-SF-003/F-SF-013; `migration-tracks.md` M-SF-3. (sha: b05b5cd2)

## Phase 4: Provider Adapters

- [x] Task: Inventory `packages/ai`, `packages/storage`, `packages/webhooks`, and `packages/integrations/github`. — evidence: `00-inventory.md` provider package entries; `phase4-5-adapters-ui-result.json`. (sha: b05b5cd2)
- [x] Task: Review provider-neutral adapter seams, direct SDK coupling, env validation, retry/error behavior, and webhook authentication. — evidence: `checklist.md` provider adapter section; `findings.md` F-SF-009/F-SF-015/F-SF-016/F-SF-019/F-SF-022. (sha: b05b5cd2)
- [x] Task: Identify app-specific direct provider use that child app tracks must verify. — evidence: `findings.md` F-SF-020/F-SF-021 and `migration-tracks.md` M-SF-10 downstream blocker table. (sha: b05b5cd2)

## Phase 5: Shared UI, Utils, Types, Config

- [x] Task: Inventory shared UI components, utility hooks, type contracts, and config package exports. — evidence: `00-inventory.md` entries for `types`, `ui`, `utils`, `config`, and legacy scripts. (sha: b05b5cd2)
- [x] Task: Review accessibility, type safety, package boundary hygiene, and duplicated utility risks. — evidence: `checklist.md` Shared UI/Utils/Types/Config section; `findings.md` F-SF-017/F-SF-018/F-SF-020. (sha: b05b5cd2)
- [x] Task: Identify package APIs that should be stabilized before app refactors. — evidence: `migration-tracks.md` M-SF-8/M-SF-10 and downstream review blocker table. (sha: b05b5cd2)

## Phase 6: Reporting

- [x] Task: Complete `00-inventory.md`. — evidence: final track-level inventory covers all in-scope packages and boundary coverage index. (sha: b05b5cd2)
- [x] Task: Complete `checklist.md` with scored categories. — evidence: final checklist scores database, tenancy, auth, validation/contracts, domain, API, AI, storage, webhooks, GitHub, UI, utils/types/config, and legacy scripts. (sha: b05b5cd2)
- [x] Task: Complete `findings.md` with severity-ordered findings. — evidence: final findings list 26 deduplicated track-level findings. (sha: b05b5cd2)
- [x] Task: Complete `migration-tracks.md` with proposed remediation tracks. — evidence: final migration plan proposes M-SF-1 through M-SF-10 and downstream blockers. (sha: b05b5cd2)
- [x] Task: Complete `test-gaps.md`. — evidence: final test-gap list TG-SF-001 through TG-SF-015 and anti-pattern checks. (sha: b05b5cd2)
- [x] Task: Complete `executive-summary.md`. — evidence: final executive summary records scope coverage, counts, gates, remediation tracks, downstream impact, and acceptance decision. (sha: b05b5cd2)

## Phase 7: Acceptance

- [x] Task: Run relevant package-level lint/type/test gates only after findings are drafted, recording pass/fail without using gate failure as a substitute for review. — evidence: phase result JSONs and final `executive-summary.md`/`00-inventory.md` gate tables record passing, failing, timed-out, and not-applicable gates. (sha: b05b5cd2)
- [x] Task: Run Measure phase acceptance for this review track. — evidence: `measure/audit-reports/shared-foundation_20260626/phase7-acceptance-result.json`. (sha: b05b5cd2)
- [x] Task: Update parent masterplan with any blocked downstream app reviews. — evidence: parent masterplan is archived planning-only; downstream blockers are recorded in `migration-tracks.md` and `executive-summary.md` for child review consumption rather than editing archived parent scope. (sha: b05b5cd2)
