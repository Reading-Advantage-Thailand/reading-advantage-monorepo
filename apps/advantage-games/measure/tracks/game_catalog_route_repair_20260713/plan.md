# Implementation Plan: Game Catalog Route Repair

## Phase 1: Diagnose and Repair
- [x] Task: Trace catalog status transformation and locale-aware launch route behavior. The currently exposed routes return HTTP 200; a stale withdrawal transform hides three retained page routes.
- [x] Task: Write a failing regression test for each playable card's launch URL and status. Confirmed red: the stale withdrawal transform removed each retained route.
- [x] Task: Correct the catalog route/status data with the smallest supported change. Restored the three retained routes and limited the unavailable transform to titles without page routes.
- [x] Task: Run targeted tests and type checking; record verification evidence. `CI=true pnpm --filter vocabulary-games test -- src/lib/gameCards.test.ts src/app/page.test.tsx --runInBand` passed (7 tests); `pnpm --filter vocabulary-games check-types` passed; all 16 exposed `/en/student/games/...` routes returned HTTP 200 from the local dev server.
