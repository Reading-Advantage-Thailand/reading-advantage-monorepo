# Phase 0 Bounded Command-Gate Attempt — 2026-08-10

## Scope and resource controls

This is a compact result record for the four commands named in the Phase 0
plan. It does not copy raw logs and does not accept the gate.

- Dependencies were installed for only the five-project Accounts closure with
  the package store, `TMPDIR`, and Node compile cache under ignored workspace
  `.cache/` paths. The store is 597 MB; no tracked package or lockfile changed.
- System `/tmp` remained at approximately 139 MB. A 2.2 MB repository-local
  Node compile cache was identified and removed; subsequent commands explicitly
  set `NODE_COMPILE_CACHE` under `.cache/`.
- The monorepo lockfile is already stale for unrelated
  `apps/reading-advantage` dependencies, so a frozen filtered install was not
  possible. The successful filtered install neither read nor wrote the
  lockfile.

## Accepted bounded remediation

Commit `5c5c559a2` validates POST `/api/oidc/logout` with strict Zod parsing for
exactly `Bearer ` plus a 43-character base64url access token. The direct focused
suite passes 10/10. Independent security and test-design reviews found no
runtime blocker; invalid requests are rejected before identity composition or
logout service access.

## Aggregate command results

1. `CI=true pnpm --filter accounts test` — **exit 1**. Eight files passed and
   one skipped; 35 tests passed and one skipped. One suite could not load the
   Codecamp cross-app fixture in the intentionally filtered install, and one
   existing production-readiness assertion disagrees with the current
   fully-qualified Codecamp secret reference.
2. `CI=true pnpm --filter accounts check-types` — **exit 2**. The Accounts
   application check reaches cross-app Company OIDC fixtures in Codecamp,
   Marketing, and Sales; their workspace package links are absent from the
   deliberately bounded install. Do not classify those resolution errors as
   logout regressions.
3. `CI=true pnpm --filter @reading-advantage/backend test` — **exit 1**. Thirty-
   four files passed and three skipped; 309 tests passed and 14 skipped. One APK
   lifecycle suite could not load the Advantage Play Kit tsconfig through the
   bounded install.
4. `CI=true pnpm --filter @reading-advantage/backend check-types` — **exit 2**.
   The current backend test config imports Advantage Play Kit source outside
   backend `rootDir`, producing existing `TS6059` errors, and also reports two
   existing planned-game-intake test type errors.

## Disposition

The bounded Accounts/backend safety gate remains **open and unaccepted**. The
logout High finding is remediated, but route inventory/review and the aggregate
cross-package configuration/type failures remain. Resolving those failures
must stay bounded to their owning tests/packages; it does not authorize a full
workspace install, repository graph scan, duplicate materialization, or giant
evidence payload.
