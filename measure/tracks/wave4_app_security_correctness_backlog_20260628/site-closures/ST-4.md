# Site-Closure Checklist — Science ST-4 (Route/contract correctness)

> **Track:** `wave4_app_security_correctness_backlog_20260628` / Phase 2
> **Source evidence:** `measure/audit-reports/science-advantage-full_20260626/migration-tracks.md` ST-4
> **Resolves:** CR-03 (F-SA-B04-002), CR-05 (F-SA-B01-001, F-SA-B02-001/026), CR-06 (F-SA-B05-001/002), ME-01..03 (F-SA-B03-001/004/007), ME-04 (F-SA-B04-003)
> **Status legend:** 🔴 open · 🟢 fixed · ⚪ NA · 🟡 deferred:<follow-up>

## Affected same-class sites (from source review artifacts)

| # | Finding | Site | Required fix | Status |
|---|---|---|---|---|
| 1 | CR-03 JSON-401 | science API auth helper (currently throws string / non-JSON 401) | return `{ status: 401, json: {...} }` from a `lib/auth/` helper | 🔴 open |
| 2 | CR-05 `"me"` alias | API routes accepting `userId` query param | resolve `"me"` → authenticated userId | 🔴 open |
| 3 | CR-05 `limit` clamp | API routes accepting `?limit=` | clamp to `[1, MAX]`; reject NaN/non-numeric | 🔴 open |
| 4 | CR-06 delegated page auth | delegated pages missing server auth gate | add server auth gate | 🔴 open |
| 5 | ME-01..03 update-mastery error mapping | `apps/science-advantage/app/api/ai/update-mastery/route.ts` | typed error mapping (not raw string throw) | 🔴 open |
| 6 | ME-04 lesson∈curriculum | lesson endpoint | verify lessonId belongs to curriculum; reject otherwise | 🔴 open |

## Closeout requirement
Every row 🟢/⚪/🟡. Each contract Red test must fail when the fix is reverted. See `test-strategy.md` Phase 2.
