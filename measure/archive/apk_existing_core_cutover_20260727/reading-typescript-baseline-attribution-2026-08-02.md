# Reading TypeScript Baseline Attribution — 2026-08-02

## Scope

This is a diagnostic-only attribution record for the accepted Dragon Flight
server-API commit `76a9a25f9`. It does not change any implementation, plan,
metadata, registry, or lifecycle status.

The command ran from a clean detached checkout at
`76a9a25f9d1291bc2345db852fa3de5f98456345`, after the normal dependency-aware
build:

```sh
pnpm turbo run build --filter=@reading-advantage/domain...
# 13 tasks successful

cd apps/reading-advantage
timeout 180s env NODE_OPTIONS=--max-old-space-size=4096 \
  ../../node_modules/.bin/tsc -p tsconfig.json --noEmit
# exit 2 before the 180-second cap
```

## Result

The Reading typecheck remains ungreen with broad existing diagnostics. It did
not report a diagnostic in any of the three API routes accepted by
`76a9a25f9`:

- `app/api/host-proof/games/attempts/route.ts`
- `app/api/host-proof/games/attempts/actions/route.ts`
- `app/api/host-proof/games/completions/route.ts`

The current host-proof diagnostics instead remain in the older client/QC
surface, including `components/host-proof/HostProofGameClient.tsx`'s unresolved
`@reading-advantage/game-cartridges/qc` import and
`__tests__/host-proof-game-client.test.tsx`'s spread-argument diagnostic.
The same run includes numerous non-APK baseline type failures in unrelated
application, controller, test, and workspace-package code.

## Non-claims and next boundary

This evidence attributes no local Reading API type error to the accepted
Dragon Flight server slice. It is **not** a green app typecheck, client/runtime
or same-frame proof, host-proof completion, Task 5 or Phase 5 closure, or
authorization to repair the old client surface.

The client/runtime requirements remain red and pending. The broad TypeScript
baseline needs a separately scoped remediation authorization. The Standard-Pack
real-asset packet, real host proof, independent review, product-owner
authorization, later cohorts, retirement, and cutover remain separately gated.
