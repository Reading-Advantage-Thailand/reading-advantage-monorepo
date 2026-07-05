# Site-Closure Checklist — Reading M-RA-SEC-7 (Zod input validation across routes)

> **Track:** `wave4_app_security_correctness_backlog_20260628` / Phase 3
> **Source evidence:** `measure/audit-reports/reading-advantage-full_20260626/migration-tracks.md` M-RA-SEC-7
> **Resolves:** F-RA-008 (inconsistent validation), F-RA-011 (raw process.env); batches 09,10,11,14,44,45,46
> **Status legend:** 🔴 open · 🟢 fixed · ⚪ NA · 🟡 deferred:<follow-up>

## Affected same-class sites (from source review artifacts)

> The audit reports "209 route files" and "6+ raw `process.env` reads." Full per-route enumeration
> happens at implementation via grep; the representative + highest-risk sites are listed here.

| # | Site class | Representative sites (baseline) | Required fix | Status |
|---|---|---|---|---|
| 1 | Route handlers missing Zod input validation | `server/controllers/*` reviewed in batches 44–47 | `parseQuery`/`parseBody`/`parsePath` Zod helpers at every external boundary | 🔴 open |
| 2 | Raw `process.env.X` reads outside a validated env module | 6+ sites across `server/`, `lib/`, `app/` (grep `process.env` at implementation) | `apps/reading-advantage/lib/env.ts` with Zod schema covering all env vars | 🔴 open |
| 3 | Shared validation helpers | none | create `parseQuery`/`parseBody`/`parsePath` | 🔴 open |
| 4 | Remaining 209 route files (long tail) | all `app/api/v1/**/*.ts` route handlers | validate input; track coverage in this checklist | 🔴 open (representative-first, then propagate) |

## Closeout requirement
Representative Red tests (bad-shape body → 4xx) green; propagation log shows every reviewed route
either validated or marked NA with reason. The long tail (209 routes) is closed by a grep-coverage
guard that fails when a route handler lacks a `parse*` call — guard must exist and run in CI
(defense A12). `process.env` artifact guard fails on any raw read outside `lib/env.ts`.
