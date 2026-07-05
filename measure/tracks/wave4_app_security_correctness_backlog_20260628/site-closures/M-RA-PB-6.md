# Site-Closure Checklist — Reading M-RA-PB-6 (Activity target validation & license fallback)

> **Track:** `wave4_app_security_correctness_backlog_20260628` / Phase 4
> **Source evidence:** `measure/audit-reports/reading-advantage-full_20260626/migration-tracks.md` M-RA-PB-6
> **Resolves:** PB-007, PB-008; batches ra-batch-46 (`user-controller.ts:169-198`, `:37-66`), ra-batch-47 (`question-controller.ts:25-63`)
> **Status legend:** 🔴 open · 🟢 fixed · ⚪ NA · 🟡 deferred:<follow-up>

## Affected same-class sites (from source review artifacts)

| # | Site | Current state (baseline) | Required fix | Status |
|---|---|---|---|---|
| 1 | `apps/reading-advantage/server/controllers/user-controller.ts:169-198` (`postActivityLog` target handling) | implicit/fallback `targetId` chain | require validated `targetId`; remove fallback chains | 🔴 open |
| 2 | `apps/reading-advantage/server/controllers/user-controller.ts:37-66` (license fallback) | missing/invalid license data → undefined behavior | treat missing/invalid license as `LicenseType.BASIC` | 🔴 open |
| 3 | `apps/reading-advantage/server/controllers/question-controller.ts:25-63` (activity target validation) | no validation | validate targetId exists + belongs to tenant | 🔴 open |
| 4 | Game-score routes (same race/target pattern) | tbd per grep | same targetId validation | 🔴 open |

## Closeout requirement
Rows 1–3 🟢. Red tests: `postActivityLog` without `targetId` → 4xx; missing license → `BASIC` tier
behavior. Must fail (accepts request / undefined tier) if validation removed. See `test-strategy.md` Phase 4.
