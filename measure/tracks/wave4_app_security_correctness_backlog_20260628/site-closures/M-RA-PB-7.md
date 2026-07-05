# Site-Closure Checklist — Reading M-RA-PB-7 (Typed request context for reports)

> **Track:** `wave4_app_security_correctness_backlog_20260628` / Phase 4
> **Source evidence:** `measure/audit-reports/reading-advantage-full_20260626/migration-tracks.md` M-RA-PB-7
> **Resolves:** PB-009; batches ra-batch-45, ra-batch-46, ra-batch-47
> **Status legend:** 🔴 open · 🟢 fixed · ⚪ NA · 🟡 deferred:<follow-up>

## Affected same-class sites (from source review artifacts)

| # | Site | Current state (baseline) | Required fix | Status |
|---|---|---|---|---|
| 1 | `apps/reading-advantage/server/controllers/report-controller.ts` (and report siblings) | `(req as any).session` / `(req as any).params` casts | pass typed user/context objects explicitly from route handlers | 🔴 open |
| 2 | `requireRole([...])` cast sites | `requireRole([...])` | typed role checks (no `as any`) | 🔴 open |
| 3 | Report route handlers | construct context ad-hoc | build a typed `RequestContext` and pass to controllers | 🔴 open |

## Closeout requirement
Rows 1–2 🟢. Artifact guard: `git grep -n "(req as any)\|(request as any)\|requireRole(.*as any" apps/reading-advantage/server/controllers` returns nothing in report controllers. Live-behavior Red test: report controller receives a typed context and rejects an untyped one at compile time (tsc). Defense A7: the `as any` guard excludes by file path (report controllers), not bare words. See `test-strategy.md` Phase 4.
