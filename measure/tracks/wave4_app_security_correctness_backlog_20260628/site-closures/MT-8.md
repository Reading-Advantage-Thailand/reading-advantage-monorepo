# Site-Closure Checklist — CodeCamp MT-8 (Typed domain errors)

> **Track:** `wave4_app_security_correctness_backlog_20260628` / Phase 5
> **Source evidence:** `measure/audit-reports/codecamp-advantage_20260626/migration-tracks.md` MT-8
> **Resolves:** H-9 (F-CC-B07-023, F-CC-B08-020/049), M-12 (F-CC-B07-026, F-CC-B09-051)
> **Status legend:** 🔴 open · 🟢 fixed · ⚪ NA · 🟡 deferred:<follow-up>

## Affected same-class sites (from source review artifacts + baseline grep)

| # | Site | Current state (baseline) | Required fix | Status |
|---|---|---|---|---|
| 1 | `packages/domain/src/codecamp/errors.ts` | error mapping by message substring | structured `CodecampError` with `code`; `mapDomainError` switches on `instanceof`/`code` | 🔴 open |
| 2 | `packages/domain/src/codecamp/index.ts` (error exports) | partial | export typed error classes | 🔴 open |
| 3 | `packages/api/src/routers/codecamp.ts` (error handling) | string-based mapping | `instanceof`/`code` mapping; add missing `.output()` schemas | 🔴 open |
| 4 | CodeCamp domain functions throwing raw strings (grep `throw "..."` / `throw new Error(string)`) | tbd per grep | throw `CodecampError` subclasses | 🔴 open |

## Closeout requirement
Rows 1–3 🟢. Red test (defense A1): two errors with IDENTICAL messages but DIFFERENT `code` map to
different responses — must fail if `mapDomainError` uses `message.includes(...)`. Missing `.output()`
schemas added. See `test-strategy.md` Phase 5.
