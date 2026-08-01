# Dragon Flight Server-API Acceptance — 2026-08-02

## Status

Accepted as a bounded, feature-flagged Dragon Flight server-API corrective
sub-slice under `apk_existing_core_cutover_20260727`.

This receipt leaves Existing Core Task 5 at `[~]`. It does **not** accept Task
5, Phase 5, client/runtime or same-frame proof, completed host proof,
asset/title adoption, production or deployment, cutover, retirement, cohort
use, or product-owner authority.

## Accepted boundary

The isolated patch was applied to base `8f5cadfb7`
(`fix(apk): harden Dragon Flight runtime foundation`). Its 10 reviewed files
matched the staged content 10/10 by content hash:

- `apps/reading-advantage/app/api/host-proof/games/attempts/route.ts`
- `apps/reading-advantage/app/api/host-proof/games/attempts/actions/route.ts`
- `apps/reading-advantage/app/api/host-proof/games/completions/route.ts`
- `apps/primary-advantage/app/api/host-proof/games/attempts/route.ts`
- `apps/primary-advantage/app/api/host-proof/games/attempts/actions/route.ts`
- `apps/primary-advantage/app/api/host-proof/games/completions/route.ts`
- `apps/reading-advantage/__tests__/api/host-proof-games-attempts.test.ts`
- `apps/reading-advantage/__tests__/api/host-proof-games-completions.test.ts`
- `apps/primary-advantage/lib/__tests__/api/host-proof-games-attempts.test.ts`
- `apps/primary-advantage/lib/__tests__/api/host-proof-games-completions.test.ts`

Both hidden host surfaces now derive actor and tenant from the session, issue
and observe Dragon Flight opaque attempt receipts, and complete only a strict,
server-replayed transcript. Browser-owned `score` and `xpEarned` fields are
rejected before domain delegation. Forged or foreign opaque-receipt failures
are safe 4xx responses. No UI, host selection, asset, catalog, binding,
package-script, or public-output change is part of this acceptance.

## Acceptance evidence

Terra independently accepted the bounded route/test phase. Its review
confirmed strict completion parsing before dependency creation and domain
delegation, safe forged/foreign receipt mapping, current session-derived
actor/tenant behavior, Dragon-only history, file-scoped lint, and a clean
restricted diff check.

An index-isolated checkout verified the exact staged patch:

```sh
pnpm turbo run build --filter=@reading-advantage/domain...
# 13 tasks successful

CI=true pnpm --filter reading-advantage test -- \
  __tests__/api/host-proof-games-attempts.test.ts \
  __tests__/api/host-proof-games-completions.test.ts
# 2 suites, 23 tests passed

CI=true pnpm --filter primary-advantage exec vitest run \
  lib/__tests__/api/host-proof-games-attempts.test.ts \
  lib/__tests__/api/host-proof-games-completions.test.ts \
  --reporter=verbose
# 2 files, 25 tests passed

git diff --cached --check
# clean
```

The test suites cover disabled/authentication/tenant boundaries, malformed
input, server-derived actor and tenant, ordered checkpoint handling, signed
completion, forged opaque receipts, and rejection of browser-owned score/XP.
The normal dependency-aware build resolved the isolated checkout's generated
domain export before Primary's suite ran; generated `dist` and temporary
lockfile setup changes are not included in this commit.

## Remaining gates

The isolated global app baselines remain ungreen and are recorded rather than
attributed to this slice:

- Reading `check-types` exhausted Node's default heap and exited 134.
- Primary `check-types` exited 2 with 427 broad, pre-existing TypeScript
  errors.

The Standard-Pack suitability/ingestion external packet, real cartridge
runtime proof, both-host browser proof, independent production proof,
product-owner authorization, later-cohort authorization, and Task 6 legacy
retirement remain open. The quarantined 24-title candidate and its reports
remain non-consumable historical evidence.

## Role receipts

- Luna implemented the four route-handler corrections to Terra's red tests.
- Terra accepted the focused test, lint, and scoped-diff phase evidence.
- Sol accepted the exact staged 10-file API/test slice and this receipt's
  bounded interpretation.
