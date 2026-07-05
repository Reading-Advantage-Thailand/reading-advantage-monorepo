# Site-Closure Checklist — Reading M-RA-PB-4 (Assignment status enum & lifecycle)

> **Track:** `wave4_app_security_correctness_backlog_20260628` / Phase 4
> **Source evidence:** `measure/audit-reports/reading-advantage-full_20260626/migration-tracks.md` M-RA-PB-4
> **Resolves:** PB-004; batches ra-batch-44, ra-batch-46
> **Status legend:** 🔴 open · 🟢 fixed · ⚪ NA · 🟡 deferred:<follow-up>

## Affected same-class sites (from source review artifacts + baseline)

| # | Site | Current state (baseline) | Required fix | Status |
|---|---|---|---|---|
| 1 | `apps/reading-advantage/server/controllers/assignment-controller.ts` | uses `statusToInt` + ad-hoc string comparisons | replace with shared enum from `@reading-advantage/types` | 🔴 open |
| 2 | `@reading-advantage/types` assignment status enum | absent | add `AssignmentStatus` enum (created/assigned/in-progress/completed/overdue) | 🔴 open |
| 3 | `packages/api/src/routers/progress.ts:54` | **baseline type error** `status: z.string()` vs union output schema (TS2322) — blocks aggregate check-types/test | align input `status` to the enum/union; THIS IS THE PRE-EXISTING AGGREGATE BLOCKER | 🔴 open (must fix — unblocks Phase 9 aggregate) |
| 4 | Frontend assignment status comparisons | ad-hoc strings | use the shared enum | 🔴 open |
| 5 | DB column / migration (if numeric status codes change) | tbd | migration if needed; coordinate `packages/db` | 🔴 open |

## Closeout requirement
Rows 1–4 🟢. Row 3 🟢 is the **closeout-critical** fix: `cd packages/api && pnpm check-types` must
exit 0 (proving the baseline aggregate blocker is resolved). Lifecycle Red test: legal transition
succeeds AND illegal transition (`completed → in-progress`) rejected. Defense A4 (both directions),
A5 (no "PB-4 closed" claim while `progress.ts:54` still red). See `test-strategy.md` Phase 4.
