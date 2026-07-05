# Site-Closure Checklist — Reading M-RA-SEC-9 (Firebase storage removal)

> **Track:** `wave4_app_security_correctness_backlog_20260628` / Phase 3
> **Source evidence:** `measure/audit-reports/reading-advantage-full_20260626/migration-tracks.md` M-RA-SEC-9
> **Resolves:** F-RA-012 (Firebase storage remnant); batches ra-batch-44, ra-batch-49
> **Status legend:** 🔴 open · 🟢 fixed · ⚪ NA · 🟡 deferred:<follow-up>

## Affected same-class sites (from source review artifacts)

| # | Site | Current state (baseline) | Required fix | Status |
|---|---|---|---|---|
| 1 | `apps/reading-advantage/server/controllers/generator-controller.ts` | dynamic `require('firebase-admin/storage')` for `cleanupAudioFiles`/`cleanupStorageFiles` | route through `@reading-advantage/storage` adapter OR remove cleanup if lifecycle managed elsewhere | 🔴 open |
| 2 | `firebase-admin` dependency in `apps/reading-advantage/package.json` | present | remove if no other usage | 🔴 open |
| 3 | Any other `firebase-admin`/`firebase-admin/storage` import in reading-advantage source (grep-verified) | tbd | remove / migrate | 🔴 open |

## Closeout requirement
Row 1 🟢 with a Red test asserting `generator-controller` no longer requires `firebase-admin/storage`
(artifact guard: `git grep -n "firebase-admin" apps/reading-advantage -- '*.ts'` returns nothing in
source, excluding `.next/` cache and `.env*`). Defense A7: exclude `.next/` and `.env*` by path,
not by the word "firebase". See `test-strategy.md` Phase 3.
