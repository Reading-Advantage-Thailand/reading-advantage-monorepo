# Site-Closure Checklist — Reading M-RA-SEC-9 (Firebase storage removal)

> **Track:** `wave4_app_security_correctness_backlog_20260628` / Phase 3
> **Source evidence:** `measure/audit-reports/reading-advantage-full_20260626/migration-tracks.md` M-RA-SEC-9
> **Resolves:** F-RA-012 (Firebase storage remnant); batches ra-batch-44, ra-batch-49
> **Green SHA:** `1783d9af`
> **Status legend:** 🔴 open · 🟢 fixed · ⚪ NA · 🟡 deferred:<follow-up>

## Affected same-class sites (from source review artifacts)

| # | Site | Current state (baseline) | Required fix | Status |
|---|---|---|---|---|
| 1 | `apps/reading-advantage/server/controllers/generator-controller.ts` | dynamic `require('firebase-admin/storage')` for `cleanupAudioFiles`/`cleanupStorageFiles` | route through `@reading-advantage/storage` adapter | 🟢 fixed (`1783d9af`) — both helpers now use `getStorageClient().exists()` / `.delete()`; `firebase-admin` direct import removed. Green test `__tests__/controllers/firebase-storage-removal-red.test.ts` exits 0 |
| 2 | `firebase-admin` dependency in `apps/reading-advantage/package.json` | present | remove if no other usage | 🟡 deferred:Wave 6 — `package.json` still lists `firebase-admin@^13.0.0`. Grep confirms no source-level import/require remains in reading-advantage source (only `apps/reading-advantage/server/controllers/generator-controller.ts:1536` mentions it in a security-defense comment), so the package is now unused; removal is a Phase 4 cleanup chore to avoid breaking transitive consumers in CI cache |
| 3 | Any other `firebase-admin`/`firebase-admin/storage` import in reading-advantage source (grep-verified) | grep `apps/reading-advantage` for `firebase-admin` import/require | remove / migrate | 🟢 fixed (`1783d9af`) — `git grep -n "firebase-admin" apps/reading-advantage -- '*.ts'` matches only the security-defense comment in `generator-controller.ts` |

## Closeout requirement

Rows 1, 3 🟢 with artifact guard `git grep -n "firebase-admin" apps/reading-advantage -- '*.ts'` returning no import/require (only the explanatory comment). Row 2 🟡:deferred:Wave 6 — `package.json` cleanup. Defense A7: the artifact guard excludes `.next/`, `.env*`, declaration files, and test files by path, not by English words. See `test-strategy.md` Phase 3.