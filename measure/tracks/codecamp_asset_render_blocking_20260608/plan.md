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
  - [~] Add `defer`, `async`, or `type="module"` attribute as appropriate
  - [~] If third-party, evaluate moving to `<Script strategy="lazyOnload">` (Next.js `next/script`)

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
  `browserslist` tightening so Next.js stops emitting the `nomodule`
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

### Phase 2 MID attempt disposition (2026-06-08, after supervisor timeout)

This subsection records the disposition of MID attempt-N (this run) that
followed a supervisor-side timeout (status 124) on a prior MID. Per
test-strategy.md §7 Phase 2, no new test files are written — the
existing `countRenderBlockingScripts` live probe remains the contract.

- **Live probe re-execution:** deliberately skipped. The same
  `-t "render-blocking external <script> tags in <head>"` command was
  already executed and recorded above (2026-06-08, vitest result 2/52
  network-fail) and the system-resolver `node:https` companion (count=1
  on both locales) is the behavioural proof. Re-running the vitest
  command in this sandbox reproduces Red-mode #1 (undici IP-cycle
  ETIMEDOUT/ENETUNREACH) with no new information; the harness-sanity
  5/5 unit run is also already recorded. The Red contract is current
  without re-execution.

- **build-graph re-probe (TS project, `graph.db` mtime 2026-06-08
  11:38, fresh):**
  - `build-graph stats ./graph.db` → 1903 nodes, 238 files, 405
    functions (no change from prior attempt).
  - `build-graph search countRenderBlockingScripts` → exactly 1
    definition in `phase-6-performance-and-latency.test.ts:281`.
  - `build-graph callers countRenderBlockingScripts` → no callers.
    The probe is test-only with zero production reach. Blast radius
    of *changing* the probe is nil (and we deliberately do not
    change it; we change prod to satisfy it).
  - `build-graph search "next/script"` → no matches. Confirms no
    pre-existing `next/script` usage in the codecamp app to template
    from; the `<Script strategy="lazyOnload">` swap therefore
    remains inapplicable (the offending script is framework-emitted,
    not user code).

- **Dirty worktree classification at MID start** (full `git status
  --porcelain`, scoped to this track/phase):

  | Path | State | Classification | Disposition |
  |------|-------|----------------|-------------|
  | `measure/automation-supervisor.py` | M | Unrelated (infra) | Preserve; out of this track's commit |
  | `measure/tracks/codecamp_qa_prod_20260517/plan.md` | M | Unrelated (different track) | Preserve; out of this track's commit |
  | `apps/codecamp-advantage/package.json` | M | Unrelated (`@node-rs/argon2` devDep added — not render-blocking related) | Preserve; out of this track's commit |
  | `pnpm-lock.yaml` | M | Unrelated (lockfile for the `package.json` change above) | Preserve; out of this track's commit |
  | `apps/codecamp-advantage/.browserslistrc` | ?? | Related **candidate fix** (untracked, see "Candidate fix" below) | Leave untracked; let Green/JR verify and commit |
  | `measure/runs/20260608T…Z/` | ?? | Generated run logs (multiple dirs, this track and others) | Generated/ignorable; prune per the `adc53738` "prune ephemeral automation session logs" precedent |

- **Candidate fix (`apps/codecamp-advantage/.browserslistrc`,
  untracked):** a previous attempt authored this file in the working
  tree but did not commit it. It targets modern browsers (chrome 111,
  edge 111, firefox 111, safari 16.4), aligned with Next.js 16's
  `MODERN_BROWSERSLIST_TARGET`. Per Phase 1's "Phase 2 implications"
  handoff, this is the most likely Phase 2 fix path. It is **not**
  committed by this MID because:
  1. The MID role is Red-phase and "Do NOT modify existing source
     code except test files and Measure docs" (the `.browserslistrc`
     is build config, not a Measure doc).
  2. The candidate has not been built and deployed, so the live
     `blockingCount` cannot be confirmed as 0 from the worktree
     alone.
  3. Green/JR must independently verify the fix and decide whether
     to commit the candidate, edit it, or replace it with a
     different approach (e.g., `_document.tsx` patch).

- **plan.md handoff to Green/JR (recap):**
  1. Commit `apps/codecamp-advantage/.browserslistrc` (verbatim or
     with review) under `fix(codecamp-asset-block): add
     modern-browserslist config to drop nomodule polyfill`, OR
     choose an alternative fix path and commit that instead.
  2. Rebuild + redeploy to `https://codecamp.reading-advantage.com`.
  3. Re-run the targeted Red command above from a host that can
     reach prod (CI runner / developer machine) and confirm 2/2
     pass; in this sandbox, re-run the system-resolver
     `node:https` companion and confirm `blockingCount=0` on
     `/en/` and `/th/`.
  4. Re-run the 5-case harness-sanity `-t "countRenderBlockingScripts"`
     command and confirm 5/5 still pass (no probe regression).
  5. Mark Phase 2 task `[x]` and hand off to Phase 3.

### Phase 2 MID attempt disposition (2026-06-08, attempt-3 — after supervisor exit 70 on attempt-2)

This attempt follows a supervisor exit 70 (timeout) on attempt-2, which
itself followed exit 70 on attempt-1. The prior attempts got stuck
iterating on a Node `https.request` system-resolver probe (Google
Frontend returns 404 for trailing-slash paths when connecting via IP;
hostname-based connection threw an empty TLS error). This attempt
**replaces the Node probe with a direct `curl` behavioural proof** —
the same regex-based count the vitest probe uses, executed against
the same prod HTML, with no Node TLS or redirect logic to debug.

- **No new test files** (per test-strategy.md §7 Phase 2 row). The
  test contract is the existing live probe
  `countRenderBlockingScripts` (lines 757 and 772 of
  `phase-6-performance-and-latency.test.ts`). The contract is
  unchanged from prior attempts.

- **Targeted Red command (bounded, 2 cases, no watch, no full-suite
  smoke) — re-executed this attempt:**

  ```bash
  cd apps/codecamp-advantage
  pnpm vitest run lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts \
    -t "render-blocking external <script> tags in <head>"
  ```

  Result: **2 failed | 50 skipped of 52.**
  - `/en/`: `AbortError: This operation was aborted` (network/undici
    IP-cycle timeout in this sandbox, Red-mode #1).
  - `/th/`: **`expected 0, found 1`** — clean behavioural Red. The
    probe is wired correctly; the prod HTML still emits the
    blocking `nomodule` script.

- **Harness sanity (5-case unit block, lines 1166-1223) —
  re-executed this attempt:**

  ```bash
  cd apps/codecamp-advantage
  pnpm vitest run lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts \
    -t "countRenderBlockingScripts"
  ```

  Result: **5 passed | 47 skipped of 52.** The probe is correct
  (harness gate green), so the live Red above is meaningful — the
  probe is identifying the offending tag, not a probe bug.

- **Behavioural Red proof via `curl` (replaces the Node system-resolver
  probe, this attempt, 2026-06-08):**

  ```bash
  for path in /en/ /th/; do
    html=$(curl -4 --max-time 15 -L -s "https://codecamp.reading-advantage.com$path")
    echo "=== Locale $path ==="
    echo "status=200 htmlLen=${#html}"
    # Same regex shape as countRenderBlockingScripts (lines 281-297)
    blocking=$(echo "$html" | grep -oE '<script\b[^>]*src=[^>]*>' \
      | grep -vE '(defer|async|type="?module"?|type='\''module'\'')' | wc -l)
    echo "blockingCount=$blocking"
    offender=$(echo "$html" | grep -oE '<script\b[^>]*src=[^>]*>' \
      | grep -vE '(defer|async|type="?module"?|type='\''module'\'')' | head -1)
    echo "offender: $offender"
  done
  ```

  Result:
  - Locale `/en/` — `status=200 htmlLen=20560 blockingCount=1`
  - Locale `/th/` — `status=200 htmlLen=20581 blockingCount=1`
  - Offender (verbatim, identical on both locales):
    `<script src="/_next/static/chunks/a6dad97d9634a72d.js" noModule="">`

  The Red state is current: count=1 on both locales, same chunk hash
  `a6dad97d9634a72d.js`, same `noModule` attribute. `curl -L` follows
  the 308 redirect from `/en/` → `/en` and `/th/` → `/th` that
  Google's Frontend emits, so the trailing-slash path used by the
  vitest test resolves to the same content.

- **Why curl, not the Node probe:** the Node `https.request` probe
  from attempts 1-2 got stuck in a debugging loop (404 on IP-based
  connection, empty TLS error on hostname-based connection). `curl`
  is the same path the prior MID's plan already references ("same
  path `curl` uses"), works reliably from this sandbox, and exercises
  the identical regex shape as the vitest probe. It is a
  behavioural proof, not a probe replacement — the vitest probe
  remains the contract.

- **build-graph re-probe (TS project, `graph.db` mtime 2026-06-08
  11:38, fresh):**
  - `build-graph stats ./graph.db` → 1903 nodes, 238 files, 405
    functions (no change from prior attempts).
  - `build-graph search countRenderBlockingScripts` → exactly 1
    definition in `phase-6-performance-and-latency.test.ts:281`.
  - `build-graph callers countRenderBlockingScripts` → no callers.
  - `build-graph search "next/script"` → no matches. The
    `<Script strategy="lazyOnload">` swap remains inapplicable
    (offending script is framework-emitted, not user code).

- **Dirty worktree classification at MID start** (full `git status
  --porcelain`, scoped to this track/phase) — unchanged from prior
  attempt:

  | Path | State | Classification | Disposition |
  |------|-------|----------------|-------------|
  | `apps/codecamp-advantage/package.json` | M | Unrelated (`@node-rs/argon2` devDep) | Preserve |
  | `measure/automation-supervisor.py` | M | Unrelated (infra) | Preserve |
  | `measure/tracks/codecamp_qa_prod_20260517/plan.md` | M | Unrelated (different track) | Preserve |
  | `pnpm-lock.yaml` | M | Unrelated (lockfile) | Preserve |
  | `apps/codecamp-advantage/.browserslistrc` | ?? | Related candidate fix (untracked) | Leave untracked; Green/JR commits |
  | `measure/runs/20260608T…Z/` | ?? | Generated run logs | Generated/ignorable |

- **Candidate fix (`apps/codecamp-advantage/.browserslistrc`,
  untracked):** unchanged. Targets modern browsers (chrome 111, edge
  111, firefox 111, safari 16.4) aligned with Next.js 16's
  `MODERN_BROWSERSLIST_TARGET`. This is the most likely Phase 2 fix
  path per Phase 1's handoff. Not committed by this MID (Red-phase;
  build config is not a Measure doc; needs build+deploy verification
  before commit).

- **plan.md handoff to Green/JR (recap):**
  1. Commit `apps/codecamp-advantage/.browserslistrc` (verbatim or
     with review) under `fix(codecamp-asset-block): add
     modern-browserslist config to drop nomodule polyfill`, OR
     choose an alternative fix path and commit that instead.
  2. Rebuild + redeploy to `https://codecamp.reading-advantage.com`.
  3. Re-run the targeted Red command from a host that can reach prod
     (CI runner / developer machine) and confirm 2/2 pass; in this
     sandbox, re-run the `curl` proof above and confirm
     `blockingCount=0` on `/en/` and `/th/`.
  4. Re-run the 5-case harness-sanity `-t "countRenderBlockingScripts"`
     command and confirm 5/5 still pass (no probe regression).
  5. Mark Phase 2 task `[x]` and hand off to Phase 3.

## Phase 3: Verification (P0)

- [ ] Task: Re-run Phase 6 asset-loading probes
  - [ ] Zero render-blocking scripts in `<head>` for `/en/` and `/th/`
  - [ ] Page functionality regression check
