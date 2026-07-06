# Site-Closure Checklist — Reading M-RA-SEC-8 (Domain-layer migration)

> **Track:** `wave4_app_security_correctness_backlog_20260628` / Phase 3
> **Source evidence:** `measure/audit-reports/reading-advantage-full_20260626/migration-tracks.md` M-RA-SEC-8
> **Resolves:** F-RA-009 (direct DB access from controllers); batches 01,15,44–47
> **Green SHA:** `1783d9af`
> **Status legend:** 🔴 open · 🟢 fixed · ⚪ NA · 🟡 deferred:<follow-up>

## Affected same-class sites (from source review artifacts)

> The audit scopes this as 6–8 weeks / 54 controllers. Wave 4 closes the **reviewed** controller
> families (batches 44–47 + system direct-DB batch 15). The full 54-controller migration is larger
> than one wave; representative-then-propagate with explicit deferral for the unreviewed tail.

| # | Controller family | Representative sites (baseline) | Required fix | Status |
|---|---|---|---|---|
| 1 | system dashboard | `server/controllers/system-dashboard-controller.ts` (batch 15) | business logic → `packages/domain/src/reading/get-system-dashboard.ts`; thin delegator | 🟢 fixed (`1783d9af`) — controller delegates to `getSystemDashboardData` which calls `assertCan(user, "system:dashboard:read", tenant)`. Green test `__tests__/controllers/domain-migration-red.test.ts` proves delegation + zero `db.select` from the controller. |
| 2 | admin segments | `server/controllers/admin-controller.ts::getSchoolSegments` (batch 46) | domain helper + license-scope helper | 🟢 fixed (`1783d9af`) — controller now delegates to `getSchoolSegmentsData` after `resolveLicenseScope`. Other `admin-controller.ts` endpoints (`getAdminOverview`, `getAdminAlerts`, `getTeacherEffectiveness`) still have direct DB access — see 🟡 below |
| 3 | license creation | `server/controllers/license-controller.ts::createLicenseKey` (batch 46) | domain licenses module + `assertCan` | 🟡 deferred:wave4_app_security_correctness_backlog_20260628/Phase 4 — `createLicenseKey` now parses the body through the new Zod helper but the actual `db.insert(licenses)` still lives in the controller; the domain `licenses` module already exists (`packages/domain/src/licenses/index.ts`) and Phase 4 should finish the migration. |
| 4 | articles | `server/controllers/article-controller.ts` (batch 44) | business logic → `@reading-advantage/domain` articles module; thin delegator | 🟡 deferred:wave4_app_security_correctness_backlog_20260628/Phase 4 — articles module already exists (`packages/domain/src/articles/index.ts`); representative `translateArticle` helper extraction deferred |
| 5 | classrooms | `server/controllers/classroom-controller.ts` (batch 44) | domain classrooms module + `assertCan` | 🟡 deferred:wave4_app_security_correctness_backlog_20260628/Phase 4 — classrooms module exists (`packages/domain/src/classes/index.ts`); representative delegator deferred |
| 6 | users | `server/controllers/user-controller.ts` (batch 46) | domain users module + `assertCan` | 🟡 deferred:wave4_app_security_correctness_backlog_20260628/Phase 4 — users module exists (`packages/domain/src/users/index.ts`) |
| 7 | assignments | `server/controllers/assignment-controller.ts` (batch 44) | domain assignments module (ties to PB-4) | 🟡 deferred:wave4_app_security_correctness_backlog_20260628/Phase 4 — ties to PB-4 status enum work |
| 8 | stories / generators | `server/controllers/story-controller.ts`, `generator-controller.ts` (batches 44,48,49) | domain stories module | 🟡 deferred:wave4_app_security_correctness_backlog_20260628/Phase 4 |
| 9 | flashcards | flashcard routes | domain flashcard module | ⚪ NA — no domain module for flashcards yet; Phase 4 carve-out |
| 10 | AI/content generation | `ai-controller.ts`, `article-generator`, `translation-generator` (batches 37,44,48,49) | domain ai module | 🟡 deferred:wave4_app_security_correctness_backlog_20260628/Phase 4 — `packages/domain/src/ai/index.ts` exists |
| 11 | metrics | metrics controllers (batch 13,14) | domain metrics module (ties to SEC-10) | 🟡 deferred:wave4_app_security_correctness_backlog_20260628/Phase 4 — endpoints are now auth-gated (SEC-10) but still query the DB directly |
| 12 | system direct-DB | system controllers (batch 15) | domain + `createTenantDB` (ties to SEC-6) | 🟢 fixed (`1783d9af`) for `system-dashboard-controller`; 🟡 deferred:Phase 4 for the rest of the `system-controller.ts` batch |
| 13 | Unreviewed controller tail (remaining of 54) | tbd per grep at implementation | 🟡 deferred: named follow-up track (Wave 6 or new M-RA-SEC-8b) | 🟡 deferred:<follow-up> |

## Closeout requirement

Rows 1, 2, 12 (partial) 🟢 with thin-controller Red tests; Rows 3–11 + 13
explicitly 🟡:deferred:<named follow-up> (Phase 4 of this track, plus a new
SEC-8b follow-up for the unreviewed tail). No controller closes on
pattern-only evidence.