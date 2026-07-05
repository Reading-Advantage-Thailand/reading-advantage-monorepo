# Site-Closure Checklist — CodeCamp MT-9 (PR review scoping)

> **Track:** `wave4_app_security_correctness_backlog_20260628` / Phase 5
> **Source evidence:** `measure/audit-reports/codecamp-advantage_20260626/migration-tracks.md` MT-9
> **Resolves:** M-3 (F-CC-B09-015), M-22 (F-CC-B08-024, F-CC-B09-016/029)
> **Status legend:** 🔴 open · 🟢 fixed · ⚪ NA · 🟡 deferred:<follow-up>

## Affected same-class sites (from source review artifacts)

| # | Site | Current state (baseline) | Required fix | Status |
|---|---|---|---|---|
| 1 | CodeCamp PR-review domain query (per-user vs global PR-URL uniqueness) | unreconciled | reconcile per-user vs global uniqueness; document decision | 🔴 open |
| 2 | PR-URL write path (repo/PR URL normalization) | unnormalized | normalize repo/PR URLs on write | 🔴 open |
| 3 | PR-review query tenant scoping | not tenant-scoped (codecamp tables are REFERENTIAL — must use `tenantDb.unscoped("...")` with explicit reason OR owner-FK join) | tenant-scoped query via owner FK (`users.schoolId` chain) | 🔴 open |
| 4 | `apps/codecamp-advantage/components/review-history.tsx` + `fork-instruction.tsx` (PR-review UI) | consumes unscoped data | consume scoped data only | 🔴 open |

## Closeout requirement
Rows 1–3 🟢. Red test: schoolA user queries PR-reviews → sees only schoolA rows; schoolB row
invisible. Must fail (returns cross-tenant rows) if scoping removed. Defense A7: URL-normalization
test must not exclude real malformed URLs by accident. See `test-strategy.md` Phase 5.
