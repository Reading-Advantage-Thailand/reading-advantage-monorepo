# APK Advantage Games Arcade Host W2 — QA Report

**Date:** 2026-07-11
**Environment:** Local Next.js dynamic host on port 3100 with local PostgreSQL
**Browser:** Chromium through Playwright and Kimi WebBridge

## Outcome

W2 automated and agent-driven browser acceptance passes. Product-owner manual confirmation remains the final Measure gate before archival and successor activation.

| Category | Result | Evidence |
|---|---|---|
| Authentication | Pass | Invalid credentials fail accessibly; STUDENT login sets an HttpOnly SameSite=Lax session; non-student sessions fail closed |
| Generic host | Pass | Five typed cartridge IDs resolve through one route; unknown IDs use not-found; one canvas survives StrictMode, edition switching, desktop reload, and next-game navigation |
| Persistence | Pass | Origin, session, role, school, strict Zod input, TenantDB, server XP, and structured failures verified; concurrent identical requests yield one write and one zero-XP duplicate |
| Arcade loop | Pass | Five catalog links use production routes; saved-result unit flow exposes replay, catalog, and deterministic next game |
| Responsive/accessibility | Pass | 390x844 and 1440x900 have no horizontal overflow; keyboard edition switching works; controls use accessible names and minimum touch height |
| Coverage | Pass | Focused W2 statements/lines 90.27% |
| Build | Pass | Production Next.js build completes with dynamic auth, session, arcade, and completion routes |

## Commands of Record

- `CI=true pnpm --filter vocabulary-games exec jest --runInBand <W2 tests>` — 11 suites / 69 tests passed.
- `CI=true pnpm --filter @reading-advantage/advantage-play-kit exec vitest run src/react/apk-game-host.test.tsx` — 3 tests passed.
- `CI=true pnpm --filter @reading-advantage/domain exec vitest run src/__tests__/games.test.ts` — 33 tests passed.
- `PLAYWRIGHT_PORT=3100 ... playwright test tests/e2e/apk-w2.spec.ts --project=chromium` — 3 tests passed.
- `next build` with the local database URL — passed.

## Browser Evidence

- `browser-evidence/authenticated-mobile.png` — authenticated Dragon Flight at 390x844.
- Kimi WebBridge live checks confirmed one canvas, edition switching, first-write/duplicate persistence, and the exact five production catalog links.

## Cleanup

The temporary `apk_w2_browser` local user, account, sessions, completion rows, XP rows, and QA school were deleted after verification. Existing seeded accounts were unchanged.
