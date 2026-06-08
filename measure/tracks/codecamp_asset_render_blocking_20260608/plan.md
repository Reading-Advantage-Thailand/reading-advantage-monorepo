# Implementation Plan: Render-Blocking Script Removal

## Phase 1: Identification (P0)

- [x] Task: Identify the render-blocking script
  - [x] Run `countRenderBlockingScripts` on the prod HTML to locate the exact `<script>` tag
  - [x] Determine if it is a Next.js internal script, a third-party script, or a misconfiguration

### Phase 1 Red command + identification evidence

- **Targeted Red command (bounded, no watch, no full-suite smoke):**

  ```bash
  cd apps/codecamp-advantage
  pnpm vitest run lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts \
    -t "render-blocking external <script> tags in <head>"
  ```

  Scope: only the two `skipIf(...)` cases at lines 757 and 772 of
  `phase-6-performance-and-latency.test.ts` (filtered by `-t`). Default
  `PHASE6_PROD_URL=https://codecamp.reading-advantage.com`, `PHASE6_SKIP`
  unset. Probe is pure; gate is a real `fetch()` to prod (no fake harness).
  `unit` 5-case `describe("countRenderBlockingScripts")` block (lines
  1166-1223) is **not** part of this Red — it is a contract/artifact test
  that is always green and is reserved for the Phase 2 sanity step
  (per test-strategy.md §7, Phase 2).

- **Phase-end failure count (vitest run, 2026-06-08):** 2 failed / 50
  skipped of 52. Failure mode: `TypeError: fetch failed` →
  `AggregateError: ETIMEDOUT` on `173.194.202.121:443` + `ENETUNREACH`
  on `2404:6800:4008:c07::79:443` (Google-hosted pool). Same connection
  attempted with `curl -4` to the same URL succeeds in ~1.4s. The vitest
  failure is **test-strategy §3 Red-mode #1** (network/connectivity
  failure from the test runner, not a behaviour failure): the jsdom
  `fetch` resolver (undici 7.11.0 inside Node 24.4.0) cycles through
  unreachable IPs while the system resolver (`getaddrinfo` / `curl`)
  reaches a working one. The probe is still wired correctly and the
  assertion is reached; the sandbox just cannot complete the prod `fetch`
  on either locale via undici. Phase 3 verification should re-run the
  same `-t` command from a network where undici's resolver can reach
  prod (CI runner / developer machine with working IPv6 to Google).

- **Phase 1 behavioural Red proof (live, same probe, system-resolver
  fetch):** ran the exact `countRenderBlockingScripts` regexes from
  `phase-6-performance-and-latency.test.ts:281-297` against live prod
  HTML fetched via `node:https` (system resolver, same path `curl`
  uses). Both locales return **status 200**, **1** render-blocking
  external `<script>` in `<head>`, and the same offending tag.

  - Locale: `/en/` — `status=200 elapsedMs=2168 htmlLen=20560 count=1`
  - Locale: `/th/` — `status=200 elapsedMs=1244 htmlLen=20581 count=1`

- **Offending tag (verbatim, identical on both locales):**

  ```html
  <script src="/_next/static/chunks/a6dad97d9634a72d.js" noModule="">
  ```

- **Classification:** **Next.js framework-internal** — the `/_next/static/chunks/`
  path is owned by Next.js, not a third-party CDN; the `noModule` attribute
  is the React/JSX-camelCase form of HTML5 `nomodule`, which Next.js
  injects into `<head>` to ship the legacy-browsers polyfill alongside
  the modern bundle. It lacks `defer`/`async`/`type="module"` because
  Next.js emits it synchronously by default. The same script
  (`a6dad97d9634a72d.js`) is shared by `/en/` and `/th/` (both routes
  share `LocaleLayout` per test-strategy §3 / §6), which is consistent
  with framework-injected output rather than a per-locale misconfig.
  **Not a third-party loader, not a misconfig** — it is the framework's
  own `nomodule` polyfill being shipped without `defer`.

- **Phase 2 implications (handoff to implementer):** the test-strategy
  §5 Phase 2 fix is "add `defer`/`async`/`type=\"module\"`, or switch to
  `<Script strategy=\"lazyOnload\">` (next/script) for third-party".
  Because the culprit is framework-emitted, not user code, the user-side
  `<Script>` swap does **not** apply. Plausible fixes (Phase 2 owns the
  choice):
  1. Tighten `browserslist` so the polyfill is unnecessary
     (`package.json` `browserslist` field, or `.browserslistrc`); rebuild
     — Next.js will then drop the `nomodule` chunk.
  2. Add `experimental.disableOptimizedLoading: false` (default) and
     rely on a custom `_document.tsx` that defers framework scripts
     (heavier change; not first-choice).
  3. Use a post-build script / patch to inject `defer` into the
     emitted `<script src="/_next/static/chunks/...noModule">` tag.
  The implementer should re-run the same `-t` vitest command (and the
  same node:https probe if the network situation repeats) to confirm
  the count drops to 0.

## Phase 2: Fix (P0)

- [~] Task: Remove or defer the render-blocking script
  - [ ] Add `defer`, `async`, or `type="module"` attribute as appropriate
  - [ ] If third-party, evaluate moving to `<Script strategy="lazyOnload">` (Next.js `next/script`)

### Phase 2 Red command + behavioural evidence

- **No new test files** (per test-strategy.md §7 Phase 2 row: "no new
  test" — the fix is config / `<Script>` swap, no new pure logic). The
  test contract that gates this phase is the **existing** live probe
  `countRenderBlockingScripts` (lines 757 and 772 of
  `phase-6-performance-and-latency.test.ts`), filtered by `-t
  "render-blocking external <script> tags in <head>"` (the same
  bounded command Phase 1 used). The probe is the test; no second
  harness is introduced.

- **Targeted Red command (bounded, 2 cases, no watch, no full-suite
  smoke):**

  ```bash
  cd apps/codecamp-advantage
  pnpm vitest run lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts \
    -t "render-blocking external <script> tags in <head>"
  ```

  Scope: only the two `skipIf(...)` cases at lines 757 and 772. Default
  `PHASE6_PROD_URL=https://codecamp.reading-advantage.com`, `PHASE6_SKIP`
  unset. The 5-case `describe("countRenderBlockingScripts")` unit block
  (lines 1166-1223) is **not** part of the Red — it is a contract
  sanity run, recorded below as the harness gate.

- **Red command result (vitest, 2026-06-08):** **2 failed / 50 skipped
  of 52.** Failure mode is the same as Phase 1: `TypeError: fetch
  failed` → `AggregateError: ETIMEDOUT 173.194.202.121:443` +
  `ENETUNREACH 2404:6800:4005:804::2013:443` (undici inside Node 22
  cycling through unreachable IPs from this sandbox). Per test-strategy
  §3 Red-mode #1, this is a network-failure Red, not a behaviour Red.
  The probe is still wired correctly (the `-t` filter selects both
  cases, the `fetch` call is reached, the assertion path is taken);
  the sandbox just cannot complete the prod `fetch` via undici. This is
  the expected state for this sandbox and the reason Phase 1
  introduced the system-resolver `node:https` companion probe as the
  behavioural proof.

- **Behavioural Red proof (system-resolver `node:https`, 2026-06-08,
  Phase 2 re-run, force IPv4, manual redirect follow):**

  - Locale: `/en/` — `status=200 elapsedMs=988 htmlLen=20560 blockingCount=1`
  - Locale: `/th/` — `status=200 elapsedMs=658 htmlLen=20581 blockingCount=1`

  Same offending tag (verbatim, identical to Phase 1):

  ```html
  <script src="/_next/static/chunks/a6dad97d9634a72d.js" noModule="">
  ```

  The Red state is current (count=1 on both locales, same chunk hash
  `a6dad97d9634a72d.js`) — the prod HTML has not been fixed yet, the
  framework's `nomodule` polyfill chunk is still being emitted
  without `defer`. Phase 2 implementation is required to flip this to
  `blockingCount=0`.

- **Harness sanity (5-case unit block, lines 1166-1223):**

  ```bash
  cd apps/codecamp-advantage
  pnpm vitest run lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts \
    -t "countRenderBlockingScripts"
  ```

  Result: **5 passed | 47 skipped of 52.** The probe is correct
  (harness gate green), so the live Red above is meaningful — the
  probe is identifying the offending tag, not a probe bug.

- **What "Red" means for Phase 2 (concrete):** the assertion
  `expect.soft(blocking, ...).toBe(0)` at lines 763-766 and 778-781
  must flip from "count=1" to "count=0" against live prod. The
  implementation choice is the JR role's (per test-strategy §5 Phase
  2 + plan §Phase 1 "Phase 2 implications" handoff): likely
  `browserslist` tightening in `apps/codecamp-advantage/package.json`
  (no `browserslist` field or `.browserslistrc` currently exists —
  grep'd, empty result) so Next.js stops emitting the `nomodule`
  polyfill, or a custom `_document.tsx`/`next.config` patch that adds
  `defer` to the framework's emitted script. The `<Script
  strategy="lazyOnload">` swap does not apply (the script is
  framework-internal, not user code).

- **JR handoff:** do not modify the test file. Re-run the same two
  commands above to prove the fix landed. The unit-test harness must
  remain 5/5 green (no probe regression). The live `-t` filter must
  flip to 2/2 green (or, in this sandbox, 2/2 still fails-for-network
  but the system-resolver `node:https` companion shows `blockingCount=0`
  on both locales with the same chunk `a6dad97d9634a72d.js` carrying
  the new `defer` attribute).

## Phase 3: Verification (P0)

- [ ] Task: Re-run Phase 6 asset-loading probes
  - [ ] Zero render-blocking scripts in `<head>` for `/en/` and `/th/`
  - [ ] Page functionality regression check
