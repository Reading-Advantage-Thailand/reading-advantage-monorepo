# Site-Closure Checklist — Reading M-RA-SEC-8 (Domain-layer migration)

> **Track:** `wave4_app_security_correctness_backlog_20260628` / Phase 3
> **Source evidence:** `measure/audit-reports/reading-advantage-full_20260626/migration-tracks.md` M-RA-SEC-8
> **Resolves:** F-RA-009 (direct DB access from controllers); batches 01,15,44–47
> **Status legend:** 🔴 open · 🟢 fixed · ⚪ NA · 🟡 deferred:<follow-up>

## Affected same-class sites (from source review artifacts)

> The audit scopes this as 6–8 weeks / 54 controllers. Wave 4 closes the **reviewed** controller
> families (batches 44–47 + system direct-DB batch 15). The full 54-controller migration is larger
> than one wave; representative-then-propagate with explicit deferral for the unreviewed tail.

| # | Controller family | Representative sites (baseline) | Required fix | Status |
|---|---|---|---|---|
| 1 | articles | `server/controllers/article-controller.ts` (batch 44) | business logic → `@reading-advantage/domain` articles module; thin delegator | 🔴 open |
| 2 | classrooms | `server/controllers/classroom-controller.ts` (batch 44) | domain classrooms module + `assertCan` | 🔴 open |
| 3 | users | `server/controllers/user-controller.ts` (batch 46) | domain users module + `assertCan` | 🔴 open |
| 4 | assignments | `server/controllers/assignment-controller.ts` (batch 44) | domain assignments module (ties to PB-4) | 🔴 open |
| 5 | stories / generators | `server/controllers/story-controller.ts`, `generator-controller.ts` (batches 44,48,49) | domain stories module | 🔴 open |
| 6 | flashcards | flashcard routes | domain flashcard module | 🔴 open |
| 7 | AI/content generation | `ai-controller.ts`, `article-generator`, `translation-generator` (batches 37,44,48,49) | domain ai module | 🔴 open |
| 8 | metrics | metrics controllers (batch 13,14) | domain metrics module (ties to SEC-10) | 🔴 open |
| 9 | system direct-DB | system controllers (batch 15) | domain + `createTenantDB` (ties to SEC-6) | 🔴 open |
| 10 | Unreviewed controller tail (remaining of 54) | tbd per grep at implementation | 🟡 deferred: named follow-up track (Wave 6 or new M-RA-SEC-8b) | 🟡 deferred:<follow-up> |

## Closeout requirement
Rows 1–9 🟢/⚪ with thin-controller Red tests (controller delegates, domain `assertCan` enforces).
Row 10 explicitly deferred to a named follow-up track. No controller closes on pattern-only evidence.
