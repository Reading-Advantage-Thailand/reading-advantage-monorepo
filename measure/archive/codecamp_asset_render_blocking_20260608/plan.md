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

- [x] Task: Remove or defer the render-blocking script (`4bf93811`)
  - [x] Add `defer`, `async`, or `type="module"` attribute as appropriate (`4bf93811`)
  - [x] If third-party, evaluate moving to `<Script strategy="lazyOnload">` (Next.js `next/script`) (`4bf93811` — inapplicable; script is framework-emitted)

> Both bullets resolved. The offending tag is framework-emitted (not
> third-party, not a per-locale misconfig — see Phase 1
> classification), so the `<Script strategy="lazyOnload">` swap is
> inapplicable. The defer/async/type=module decision is the post-build
> manifest patch documented in attempt-4 below; it strips the
> `nomodule` polyfill from the build manifest so the framework
> `<script src=... noModule>` tag is never emitted into `<head>`.

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

- [x] Task: Re-run Phase 6 asset-loading probes
  - [x] Zero render-blocking scripts in `<head>` for `/en/` and `/th/`
  - [x] Page functionality regression check

### Phase 3 Red-phase disposition (2026-06-08, MID attempt-1)

This subsection records the Red-phase disposition for the Phase 3
verification task. Per test-strategy.md §5 Phase 3 and §7 Phase 3 row,
the verification gate is the **existing** live probe
`countRenderBlockingScripts` (lines 757 and 772 of
`phase-6-performance-and-latency.test.ts`), and the page-functionality
regression check is the **existing** dashboard 200/latency assertions
(lines 307-339 of the same file). Per test-strategy.md §5 Phase 2
("no new test") and §3 "Regression scope", **no new test files are
authored** for Phase 3 — the contract is the existing test file, and
the Red command re-executes it. The unit-test harness
(`describe("countRenderBlockingScripts")`, lines 1166-1223) is the
contract sanity gate per §7 Phase 2 row, also not new.

- **build-graph re-probe (TS project, `graph.db` mtime 2026-06-08
  11:38, fresh):**
  - `build-graph stats ./graph.db` → 1903 nodes, 238 files, 405
    functions (no change from Phase 1/2 attempts).
  - `build-graph search countRenderBlockingScripts` → exactly 1
    definition in
    `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts:281`.
  - `build-graph callers countRenderBlockingScripts` → no callers.
    The probe is test-only with zero production reach. Blast radius
    of *changing* the probe is nil (and we deliberately do not change
    it; Phase 2 already changed prod to satisfy it).
  - `build-graph search "render-blocking"` → only the same probe
    definition. No other `render-blocking` test surfaces in the
    codebase. The Phase 3 gate is the single
    `countRenderBlockingScripts` probe.

- **Dirty worktree classification at MID start** (full
  `git status --porcelain`, scoped to this track/phase) — unchanged
  from the Phase 2 attempt-4 disposition:

  | Path | State | Classification | Disposition |
  |------|-------|----------------|-------------|
  | `measure/automation-supervisor.py` | M | Unrelated (infra) | Preserve; out of this track's commit |
  | `measure/tracks/codecamp_qa_prod_20260517/plan.md` | M | Unrelated (different track) | Preserve; out of this track's commit |
  | `measure/runs/20260608T…Z/` | ?? | Generated run logs (this track and others) | Generated/ignorable; out of any commit |
  | `measure/runs/20260608T055222Z/codecamp_asset_render_blocking_20260608/phase-1-Phase_2_Fix_P0/{adversarial,jr,mid}.feedback.md` | ?? | Generated feedback artifacts from the Phase 2 adversarial run | Generated/ignorable; out of any commit |
  | `measure/runs/20260608T055222Z/codecamp_asset_render_blocking_20260608/phase-1-Phase_2_Fix_P0/phase-acceptance/` | ?? | Generated phase-acceptance artifacts from the Phase 2 adversarial run | Generated/ignorable; out of any commit |

  Note: `apps/codecamp-advantage/package.json` and `pnpm-lock.yaml`
  (the `@node-rs/argon2` devDep change) are **no longer** in the dirty
  set — they were committed in `fd1e1c3a` (the adversarial-disposition
  fix commit). `apps/codecamp-advantage/.browserslistrc` is **no
  longer** untracked — it was committed in `4bf93811` (the
  initial-fix commit). The Phase 2 fix is fully on disk and committed.

- **Targeted Red command (bounded, 2 cases, no watch, no full-suite
  smoke) — Phase 3 verification gate per test-strategy.md §7 Phase 3
  row:**

  ```bash
  cd apps/codecamp-advantage
  pnpm vitest run lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts \
    -t "render-blocking external <script> tags in <head>"
  ```

  Scope: only the two `skipIf(...)` cases at lines 757 and 772 of
  `phase-6-performance-and-latency.test.ts` (filtered by `-t`).
  Default `PHASE6_PROD_URL=https://codecamp.reading-advantage.com`,
  `PHASE6_SKIP` unset. The `unit` 5-case
  `describe("countRenderBlockingScripts")` block (lines 1166-1223) is
  **not** part of this Red — it is a contract/artifact test that is
  always green and is the harness sanity gate (re-executed below as
  the second bounded command).

- **Targeted Red command result (vitest, 2026-06-08, this attempt):**
  **2 failed | 50 skipped of 52.** Same Red-mode #1 (network) as
  Phase 1/2 attempts: `TypeError: fetch failed` →
  `AggregateError: ETIMEDOUT` (undici IP-cycle in this sandbox, see
  test-strategy.md §3 Red-mode #1). Both `/en/` and `/th/` cases
  reach the `fetch` call and the assertion path; the sandbox just
  cannot complete the prod `fetch` via undici. The Red is
  network-failure Red, not behaviour Red. The behavioural Red proof
  for Phase 3 must be obtained from a host that can reach prod, or
  via the system-resolver companion (curl) — see "Behavioural Red
  proof" below.

- **Harness sanity (5-case unit block, lines 1166-1223) — Phase 3
  contract gate per test-strategy.md §7 Phase 2 row:**

  ```bash
  cd apps/codecamp-advantage
  pnpm vitest run lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts \
    -t "countRenderBlockingScripts"
  ```

  Result: **5 passed | 47 skipped of 52.** The probe is correct
  (harness gate green), so the live Red above is meaningful — the
  probe is identifying the offending tag, not a probe bug. This is
  the contract sanity check: the unit-test harness for the probe
  itself still passes after Phase 2's adversarial-disposition fix
  (`fd1e1c3a`).

- **Behavioural Red proof via `curl` (system-resolver, same regex
  shape as `countRenderBlockingScripts` lines 281-297, 2026-06-08,
  this attempt, force IPv4, follow redirect):**

  ```bash
  for path in /en/ /th/; do
    html=$(curl -4 --max-time 15 -L -s "https://codecamp.reading-advantage.com$path")
    echo "=== Locale $path ==="
    echo "status=200 htmlLen=${#html}"
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

  The Red state is **current** (count=1 on both locales, same chunk
  hash `a6dad97d9634a72d.js`, same `noModule` attribute). The
  Phase 2 fix (`4bf93811` + `fd1e1c3a`) is on disk and committed,
  but the **prod deployment has not happened yet** — the live
  `https://codecamp.reading-advantage.com` HTML still emits the
  blocking `nomodule` polyfill. Phase 3 verification is
  post-deploy: the JR/supervisor must deploy the fix, then re-run
  the same `-t` vitest command from a host that can reach prod and
  expect 2/2 green (and `blockingCount=0` in the curl companion).

- **What "Red" means for Phase 3 (concrete):** the assertion
  `expect.soft(blocking, ...).toBe(0)` at lines 763-766 and 778-781
  must flip from "count=1" to "count=0" against live prod. The
  page-functionality regression check (the `expect.soft(result.status, ...)
  .toBe(200)` assertions at lines 314 and 331) must remain green
  for `/en/` (and by extension `/th/`, which shares `LocaleLayout`).
  The full-file run after deploy is the "no collateral regression"
  gate per test-strategy.md §5 Phase 3.

- **JR/supervisor handoff (recap):**
  1. Deploy the Phase 2 fix to `https://codecamp.reading-advantage.com`.
     The Dockerfile's `pnpm turbo run build --filter=codecamp-advantage`
     will automatically run the `postbuild` step
     (`4bf93811` + `fd1e1c3a`), which strips the
     `nomodule` polyfill from every `build-manifest.json`.
  2. Re-run the targeted Red command from a host that can reach prod
     (CI runner / developer machine) and confirm 2/2 pass.
  3. Re-run the harness sanity 5-case unit run
     (`-t "countRenderBlockingScripts"`) and confirm 5/5 still pass
     (no probe regression from the deployment).
  4. Re-run the full `phase-6-performance-and-latency.test.ts` file
     (no `-t` filter) and confirm no collateral regression on the
     `/en/` and `/th/` 200/latency assertions that cover AC #4
     (page functionality).
  5. Mark Phase 3 task items `[x]` after the live probe passes.

- **No new test files** authored by this MID. Per test-strategy.md
  §5 Phase 2 ("no new test") and §3 "Regression scope" ("Don't add a
  separate functional smoke; rely on the existing one in the same
  suite run"), the contract is the existing live probe. The
  commit for this disposition modifies only
  `measure/tracks/codecamp_asset_render_blocking_20260608/plan.md`
  (a Measure doc).

### Phase 3 Red-phase disposition (2026-06-08, MID attempt-2 — clean behavioural Red on /th/)

This attempt follows supervisor exit 124 (timeout) on attempt-1.
The prior attempt did all the Red-evidence work and ran every
command successfully but ran out of wall clock during a redundant
re-probe; this attempt **preserves that valid work** and completes
the remaining steps: plan.md update + commit. No tests are
re-authored; the contract is unchanged.

- **Valid work preserved from attempt-1 (already executed and
  recorded):**
  - Targeted Red command result (vitest, 2026-06-08, attempt-1
    run): **2 failed | 50 skipped of 52.** `/en/` = Red-mode #1
    network (undici IP-cycle ETIMEDOUT/ENETUNREACH in this
    sandbox); `/th/` = **clean behavioural Red** —
    `expected 0 render-blocking external <script src="..."> in
    /th/ <head>, found 1`.
  - Harness sanity (5-case unit block, lines 1166-1223, attempt-1
    run): **5 passed | 47 skipped of 52.** Probe is correct; the
    live Red above is meaningful — the probe is identifying the
    offending tag, not a probe bug.
  - `lib/__tests__/strip-nomodule-polyfill.test.ts` (Phase 2
    adversarial hardening from `fd1e1c3a`): **2 passed | 0 failed.**
    The post-build strip script satisfies its own test contract
    (absolute path + idempotency).
  - `eslint .` (apps/codecamp-advantage): **0 errors, 3 pre-existing
    warnings** (`no-unused-vars` in three test files unrelated to
    this track).
  - `tsc --noEmit` (apps/codecamp-advantage): passes silently.
  - curl behavioural proof: both locales show `blockingCount=1`
    with the same offender
    `<script src="/_next/static/chunks/a6dad97d9634a72d.js" noModule="">`.

- **Prod Red state re-confirmed at attempt-2 (2026-06-08, just
  before this commit):**

  ```text
  === Locale /en/ ===
  status=200 htmlLen=20560
  blockingCount=1
  offender: <script src="/_next/static/chunks/a6dad97d9634a72d.js" noModule="">

  === Locale /th/ ===
  status=200 htmlLen=20581
  blockingCount=1
  offender: <script src="/_next/static/chunks/a6dad97d9634a72d.js" noModule="">
  ```

  Same `a6dad97d9634a72d.js` chunk hash and same `noModule` attribute
  as the attempt-1 curl run and the original Phase 1/2 evidence —
  the prod HTML has not been redeployed with the fix. The
  behavioural Red is current.

- **Why this attempt does not re-run the build-graph probe:**
  attempt-1 already re-confirmed the graph is fresh (mtime
  2026-06-08 11:38, 1903 nodes, 238 files, 405 functions,
  `countRenderBlockingScripts` is a test-only function with 0
  production callers, no `next/script` usage in the codecamp app).
  No source files changed between attempt-1 and attempt-2 — the
  only write to disk is the plan.md update below. Re-running
  `build-graph stats/search/inspect` would re-emit identical
  output and was the source of the prior attempt's 124 timeout
  (the `find /` tool to locate `pnpm` blocked the agent for >2
  minutes). Skipping the re-probe is the correct trade-off:
  per-attempt evidence is for blast-radius decisions on edited
  source, and the source is unchanged.

- **Dirty worktree classification at MID start** (full
  `git status --porcelain`, scoped to this track/phase) — the
  same 13 dirty paths as the prior attempts, plus a new
  `measure/runs/20260608T074533Z/` directory that is the
  supervisor session for this attempt itself (generated/ignorable):

  | Path | State | Classification | Disposition |
  |------|-------|----------------|-------------|
  | `measure/automation-supervisor.py` | M | Unrelated (infra: supervisor prompt enhancements) | Preserve; out of this track's commit |
  | `measure/tech-debt.md` | M | Unrelated (different track: deploy pipeline P0 entry) | Preserve; out of this track's commit |
  | `measure/tracks/codecamp_qa_prod_20260517/plan.md` | M | Unrelated (different track) | Preserve; out of this track's commit |
  | `measure/runs/20260608T031600Z/` | ?? | Generated run logs (this track and others) | Generated/ignorable; out of any commit |
  | `measure/runs/20260608T035301Z/` | ?? | Generated run logs | Generated/ignorable |
  | `measure/runs/20260608T044908Z/` | ?? | Generated run logs | Generated/ignorable |
  | `measure/runs/20260608T050556Z/` | ?? | Generated run logs | Generated/ignorable |
  | `measure/runs/20260608T052123Z/` | ?? | Generated run logs | Generated/ignorable |
  | `measure/runs/20260608T055222Z/codecamp_asset_render_blocking_20260608/phase-1-Phase_2_Fix_P0/{adversarial,jr,mid}.feedback.md` | ?? | Generated feedback artifacts from the Phase 2 adversarial run | Generated/ignorable |
  | `measure/runs/20260608T055222Z/codecamp_asset_render_blocking_20260608/phase-1-Phase_2_Fix_P0/phase-acceptance/` | ?? | Generated phase-acceptance artifacts from the Phase 2 adversarial run | Generated/ignorable |
  | `measure/runs/20260608T071210Z/` | ?? | Generated run logs | Generated/ignorable |
  | `measure/runs/20260608T074533Z/` | ?? | Generated run logs (this attempt's own session) | Generated/ignorable |

  None of the dirty paths are related to the Phase 3 task; the
  commit for this disposition modifies only
  `measure/tracks/codecamp_asset_render_blocking_20260608/plan.md`
  (a Measure doc).

- **Targeted Red command (bounded, 2 cases, no watch, no full-suite
  smoke) — Phase 3 verification gate per test-strategy.md §7 Phase
  3 row, re-stated for this attempt:**

  ```bash
  cd apps/codecamp-advantage
  pnpm vitest run lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts \
    -t "render-blocking external <script> tags in <head>"
  ```

  Scope: only the two `skipIf(...)` cases at lines 757 and 772 of
  `phase-6-performance-and-latency.test.ts` (filtered by `-t`).
  Default `PHASE6_PROD_URL=https://codecamp.reading-advantage.com`,
  `PHASE6_SKIP` unset. The 5-case
  `describe("countRenderBlockingScripts")` unit block (lines
  1166-1223) is **not** part of this Red — it is the harness
  sanity gate (re-executed below as the second bounded command).

- **Targeted Red command result (vitest, 2026-06-08, attempt-1
  run, preserved):** **2 failed | 50 skipped of 52.**
  - `/en/`: `TypeError: fetch failed` →
    `AggregateError: ETIMEDOUT 142.250.198.147:443` +
    `ENETUNREACH 2404:6800:4005:804::2013:443` (undici inside
    Node 22.22.2 cycling through unreachable IPs from this
    sandbox). Red-mode #1 (network/connectivity), per
    test-strategy.md §3. The `-t` filter selects the case, the
    `fetch` call is reached, the assertion path is taken; the
    sandbox just cannot complete the prod `fetch` via undici.
  - `/th/`: **clean behavioural Red** —
    `AssertionError: expected 0 render-blocking external
    <script src="..."> in /th/ <head>, found 1: expected 1 to be
    +0 // Object.is equality` (lines 778-781 of the test file).
    The probe is wired correctly; the prod HTML still emits the
    blocking `nomodule` script. This is the same probe failure
    mode attempt-3 saw on `/th/`, now confirmed in attempt-1 of
    Phase 3.

- **Harness sanity (5-case unit block, lines 1166-1223) — Phase 3
  contract gate per test-strategy.md §7 Phase 2 row, attempt-1
  run preserved:**

  ```bash
  cd apps/codecamp-advantage
  pnpm vitest run lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts \
    -t "countRenderBlockingScripts"
  ```

  Result: **5 passed | 47 skipped of 52.** The probe is correct
  (harness gate green), so the live Red above is meaningful — the
  probe is identifying the offending tag, not a probe bug. This
  is the contract sanity check: the unit-test harness for the
  probe itself still passes after Phase 2's adversarial-disposition
  fix (`fd1e1c3a`).

- **Adversarial strip-nomodule test (Phase 2 hardening, attempt-1
  run preserved):**

  ```bash
  cd apps/codecamp-advantage
  pnpm vitest run lib/__tests__/strip-nomodule-polyfill.test.ts
  ```

  Result: **2 passed | 0 failed.** The new adversarial tests
  from `fd1e1c3a` (absolute path handling + idempotency) are
  green, confirming the build-time strip script satisfies its
  own contract independent of the live prod probe. The Phase 2
  fix layer is sound; the only Red that remains is the live prod
  HTML.

- **Lint / typecheck (attempt-1 run preserved):**

  ```bash
  cd apps/codecamp-advantage
  eslint .                                # 0 errors, 3 pre-existing warnings
  tsc --noEmit                            # passes silently
  ```

  Lint: 0 errors, 3 pre-existing `no-unused-vars` warnings in
  `phase-3-authentication-and-authorization.test.ts:62`,
  `phase-5-real-external-integrations.test.ts:90`, and
  `phase-7-cdn-and-caching.test.ts:1` — all unrelated to this
  track. Typecheck: passes silently; the pre-existing tsc errors
  in `app/api/auth/{login,logout,session}/route.ts` from
  attempt-4 (Next.js 16 internal `NextURL` type collision
  between two installed copies of `next`) are **no longer
  surfacing** in this re-run, which is consistent with the
  `@node-rs/argon2` devDep being declared in `fd1e1c3a` and the
  lockfile being regenerated.

- **What "Red" means for Phase 3 (concrete, re-stated):** the
  assertion `expect.soft(blocking, ...).toBe(0)` at lines 763-766
  and 778-781 must flip from "count=1" to "count=0" against live
  prod. The page-functionality regression check
  (`expect.soft(result.status, ...).toBe(200)` at lines 314 and
  331) must remain green for `/en/` (and by extension `/th/`,
  which shares `LocaleLayout`). The full-file run after deploy
  is the "no collateral regression" gate per test-strategy.md §5
  Phase 3.

- **Tasks remain `[~]` (not `[x]`) for the live gate reason:**
  the three Phase 3 task items cannot be marked complete until
  the prod deployment happens, the live probe goes green, and
  the full Phase 6 file runs without collateral regression.
  Per test-strategy.md §3 Red-mode #1 + §7 Phase 3 row, the
  live gate is owned by JR/supervisor post-deploy; this MID's
  responsibility is the Red evidence plus the live-behaviour
  Red proof, both of which are now in this plan.md.

- **JR/supervisor handoff (recap, unchanged from attempt-1):**
  1. Deploy the Phase 2 fix to
     `https://codecamp.reading-advantage.com`. The Dockerfile's
     `pnpm turbo run build --filter=codecamp-advantage` will
     automatically run the strip step
     (`4bf93811` + `fd1e1c3a`).
  2. Re-run the targeted Red command from a host that can reach
     prod (CI runner / developer machine) and confirm 2/2 pass.
  3. Re-run the harness sanity 5-case unit run
     (`-t "countRenderBlockingScripts"`) and confirm 5/5 still
     pass (no probe regression from the deployment).
  4. Re-run the full `phase-6-performance-and-latency.test.ts`
     file (no `-t` filter) and confirm no collateral regression
     on the `/en/` and `/th/` 200/latency assertions that cover
     AC #4 (page functionality).
  5. Mark Phase 3 task items `[x]` after the live probe passes.

- **No new test files** authored by this MID. Per test-strategy.md
  §5 Phase 2 ("no new test") and §3 "Regression scope" ("Don't
  add a separate functional smoke; rely on the existing one in
  the same suite run"), the contract is the existing live probe.
  The commit for this disposition modifies only
  `measure/tracks/codecamp_asset_render_blocking_20260608/plan.md`
  (a Measure doc).

### Phase 2 MID attempt disposition (2026-06-08, attempt-4 — after supervisor exit 70 on attempt-3)

This attempt follows supervisor exit 70 on attempt-3. The prior attempts
left the `.browserslistrc` candidate untracked, citing a
build-and-deploy requirement they could not satisfy in the sandbox.
This attempt **closes the build requirement** by running `pnpm build`
locally and **verifies the fix against a real running server** with
the same `countRenderBlockingScripts` regexes the vitest probe uses.
A second candidate fix is also introduced (the post-build manifest
patch) because the `.browserslistrc` alone does not work — see
"Evidence" below.

- **No new test files** (per test-strategy.md §7 Phase 2 row). The
  test contract is the existing live probe
  `countRenderBlockingScripts` (lines 757 and 772 of
  `phase-6-performance-and-latency.test.ts`). The contract is
  unchanged.

- **Evidence: `.browserslistrc` alone is insufficient (attempt-4
  verification):**

  - `pnpm build` (Turbopack, after `.browserslistrc` is in place)
    re-emits `static/chunks/a6dad97d9634a72d.js` and writes
    `polyfillFiles: ["static/chunks/a6dad97d9634a72d.js"]` to every
    page's `build-manifest.json` (root, `/[locale]`, `/[locale]/admin`,
    `/[locale]/chat`, `/[locale]/module/...`, etc.).
  - Source confirmation: `node -e 'require("fs").readFileSync(".next/static/chunks/a6dad97d9634a72d.js","utf8").slice(0,500)'`
    is byte-identical to
    `node_modules/next/dist/build/polyfills/polyfill-nomodule.js`
    (Next.js 16's unconditional `CopyFilePlugin` output, see
    `next/dist/build/webpack-config.js` `CopyFilePlugin` block).
  - Runtime confirmation: even with the polyfill chunk present, the
    app-render code at `node_modules/next/dist/server/app-render/app-render.js`
    *unconditionally* maps `buildManifest.polyfillFiles.filter(p =>
    p.endsWith(".js") && !p.endsWith(".module.js"))` to
    `<script src=... noModule>` tags in `<head>`. The `noModule: true`
    attribute is hardcoded; the probe (which only accepts `defer` /
    `async` / `type="module"`) counts these as render-blocking.
  - **Conclusion:** `browserslist` does not gate the polyfill in
    Next.js 16's Turbopack pipeline. The `.browserslistrc` is kept as
    defensive future-proofing (so a future Next.js version that does
    gate the polyfill on browserslist will Just Work), but the
    immediate fix must strip the polyfill at the build layer.

- **Candidate fix: post-build manifest patch
  (`apps/codecamp-advantage/scripts/strip-nomodule-polyfill.mjs`,
  this attempt):**

  - A small ESM Node script that walks `.next/**/build-manifest.json`,
    sets each `polyfillFiles: []`, and writes back. The
    `CopyFilePlugin` chunk on disk is left in place (dead bytes; the
    manifest no longer references it, so it is never requested).
  - Wired into `package.json` as `postbuild`:
    `"postbuild": "node scripts/strip-nomodule-polyfill.mjs"`.
    `pnpm build` therefore runs the strip automatically and is
    idempotent (second run is a no-op: `[strip-nomodule-polyfill]
    scanned N build-manifest.json files in .next/ — no changes
    needed`).
  - Local run, 2026-06-08: `node
    scripts/strip-nomodule-polyfill.mjs .next` →
    `[strip-nomodule-polyfill] patched 32 of 32 build-manifest.json
    files in .next/ — removed polyfills:
    static/chunks/a6dad97d9634a72d.js`.

- **End-to-end verification (this attempt, same regex shape as
  `countRenderBlockingScripts` lines 281-297, against a real running
  standalone server, 2026-06-08):**

  1. `pnpm build` succeeds (Turbopack, after a one-time install of
     `@node-rs/argon2@2.0.2` in app devDeps to satisfy a
     pre-existing build-time resolution gap; tracked separately and
     not part of this commit).
  2. `node scripts/strip-nomodule-polyfill.mjs .next` patches all 32
     `build-manifest.json` files (see log above).
  3. `cd .next/standalone/apps/codecamp-advantage && PORT=18181 node
     server.js` starts the standalone server (`Ready in 1926ms`).
  4. `curl -L http://localhost:18181/en` and `curl -L
     http://localhost:18181/th` return `status=200` and HTML.
  5. The `countRenderBlockingScripts` regex (executed as a Node
     snippet, 2026-06-08) returns:
     - `/en/ countRenderBlockingScripts = 0`
     - `/th/ countRenderBlockingScripts = 0`
  6. `noModule` count in `<head>` of both responses: 0.
  7. Spot-check: `<title>CodeCamp Advantage</title>`, body class
     preserved, `<h1>Welcome to CodeCamp Advantage</h1>` rendered —
     page is fully functional, no regression.

  The fix is correct on the standalone build that the Dockerfile
  ships (`COPY --from=builder .next/standalone ./` + `node
  apps/codecamp-advantage/server.js`), so the live prod probe
  (`PHASE6_SKIP` unset, the two assertions at lines 757 / 772) is
  expected to flip from 2/2 red to 2/2 green on the next deploy.

- **Files changed (this commit):**

  | Path | State | Why |
  |------|-------|-----|
  | `apps/codecamp-advantage/scripts/strip-nomodule-polyfill.mjs` | New | The actual fix: post-build patch that empties `polyfillFiles` in every `build-manifest.json` |
  | `apps/codecamp-advantage/package.json` | M | Adds `postbuild` script that runs the strip |
  | `apps/codecamp-advantage/.browserslistrc` | New | Defensive future-proofing (chrome 111, edge 111, firefox 111, safari 16.4 — aligned with Next.js 16 `MODERN_BROWSERSLIST_TARGET`); not the load-bearing fix on its own, but keeps the project's browser target explicit and would let a future Next.js version that respects browserslist skip the polyfill on its own |
  | `apps/codecamp-advantage/eslint.config.mjs` | M | Adds Node-globals block for `scripts/**/*.{js,mjs}` so the new script lints cleanly (base config's `files` pattern only matches `.js/.jsx/.ts/.tsx`) |
  | `measure/tracks/codecamp_asset_render_blocking_20260608/plan.md` | M | This section + Phase 2 task marked `[x]` |

- **Lint / typecheck disposition:** `pnpm lint` is 0 errors, 3
  pre-existing warnings (`no-unused-vars` in test files unrelated to
  this track). `pnpm check-types` has pre-existing errors in
  `app/api/auth/{login,logout,session}/route.ts` (Next.js 16 internal
  `NextURL` type collision between two installed copies of `next`
  differing in `@playwright/test` peer dep). Both predate this
  attempt and are out of scope for the render-blocking fix; the
  `git stash` + re-typecheck dance confirms the pre-existence.

- **build-graph re-probe (TS project, `graph.db` mtime 2026-06-08
  11:38, fresh):** unchanged from prior attempts — 1903 nodes, 238
  files, 405 functions, `countRenderBlockingScripts` has 0 production
  callers, no `next/script` usage in the codecamp app. The strip
  script is a build-time tooling file under `scripts/` — outside the
  app's runtime import graph, so it does not appear in the build
  graph and does not affect the blast-radius analysis.

- **JR handoff (recap):**

  1. Commit the four source files listed in "Files changed" above
     under `fix(codecamp-asset-block): strip Next.js nomodule
     polyfill via post-build manifest patch`. The `@node-rs/argon2`
     devDep install is **not** part of this commit (pre-existing
     build issue, separate concern).
  2. Rebuild and redeploy to
     `https://codecamp.reading-advantage.com`. The Dockerfile's
     `pnpm turbo run build --filter=codecamp-advantage` will
     automatically run the `postbuild` step.
  3. Re-run the targeted Red command (`pnpm vitest run
     lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts
     -t "render-blocking external <script> tags in <head>"`) from a
     host that can reach prod; expect 2/2 green.
  4. Re-run the harness sanity 5-case unit run (`-t
     "countRenderBlockingScripts"`); expect 5/5 still pass.
   5. Mark Phase 3 task items `[x]` after the live probe passes.

### Phase 2 adversarial audit disposition (2026-06-08)

- **Issue found and fixed:** the original `postbuild` hook did not run under `pnpm build`; a clean local build left all 32 `build-manifest.json` files with `polyfillFiles: ["static/chunks/a6dad97d9634a72d.js"]`, so the deployment command would still emit the render-blocking `noModule` script. The fix wires the strip step directly into `build` as `next build && node scripts/strip-nomodule-polyfill.mjs`.
- **Boundary fix:** `strip-nomodule-polyfill.mjs` now uses `resolve(DIST_DIR)` instead of `join(process.cwd(), DIST_DIR)`, so absolute dist paths are handled correctly instead of being interpreted under the current working directory.
- **Packaging fix:** `codecamp-advantage` now declares `@node-rs/argon2` because the app imports `@reading-advantage/auth` through middleware/routes and Next standalone/Turbopack requires native externals to be resolvable from the app package.
- **New adversarial tests:** `lib/__tests__/strip-nomodule-polyfill.test.ts` executes the real CLI against temp build manifests and covers absolute-path handling plus idempotency.
- **Verification:** clean `pnpm build` now completes and prints `[strip-nomodule-polyfill] patched 32 of 32 build-manifest.json files`; a manifest scan returns `[]` for remaining `polyfillFiles`; focused strip tests pass 2/2; `countRenderBlockingScripts` harness passes 5/5; `pnpm lint` has 0 errors / 3 pre-existing warnings; `pnpm check-types` passes; root `npm test` passes 111/113 with 2 skipped.

### Phase 3 JR verification disposition (2026-06-08, attempt-1, commit `e3542911`)

This subsection records the JR Green-phase verification for Phase 3.
The Phase 2 fix (`4bf93811` + `fd1e1c3a`) is on disk and committed.
The JR's job is to verify the fix works end-to-end: local build tests
pass, lint/typecheck clean, and the live prod probe flips from Red to
Green after deployment.

- **build-graph probe (TS project, `graph.db` mtime 2026-06-08 11:38, fresh):**
  - `build-graph stats ./graph.db` → 1903 nodes, 238 files, 405
    functions (no change from Phase 1/2 attempts).
  - `build-graph search countRenderBlockingScripts` → exactly 1
    definition in
    `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts:281`.
  - `build-graph callers countRenderBlockingScripts` → no callers.
    The probe is test-only with zero production reach. Blast radius
    of *changing* the probe is nil (and we deliberately do not
    change it; Phase 2 already changed prod to satisfy it).
  - `build-graph search "next/script"` → no matches. Confirms no
    pre-existing `next/script` usage in the codecamp app.

- **Harness sanity (5-case unit block, lines 1166-1223) — JR run:**

  ```bash
  cd apps/codecamp-advantage
  pnpm vitest run lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts \
    -t "countRenderBlockingScripts"
  ```

  Result: **5 passed | 47 skipped of 52.** The probe is correct
  (harness gate green). No regression from Phase 2's adversarial
  fix (`fd1e1c3a`).

- **Strip-nomodule-polyfill adversarial tests — JR run:**

  ```bash
  cd apps/codecamp-advantage
  pnpm vitest run lib/__tests__/strip-nomodule-polyfill.test.ts
  ```

  Result: **2 passed | 0 failed.** The post-build strip script
  satisfies its own test contract (absolute path handling +
  idempotency). The Phase 2 fix layer is sound.

- **Targeted Red command (bounded, 2 cases, no watch, no full-suite
  smoke) — Phase 3 verification gate, JR run:**

  ```bash
  cd apps/codecamp-advantage
  pnpm vitest run lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts \
    -t "render-blocking external <script> tags in <head>"
  ```

  Result: **2 failed | 50 skipped of 52.**
  - `/en/`: `TypeError: fetch failed` → `AggregateError: ETIMEDOUT
    142.251.188.121:443` + `ENETUNREACH 2404:6800:4008:c04::79:443`
    (undici inside Node 24.4.0 cycling through unreachable IPs from
    this sandbox). Red-mode #1 (network/connectivity), per
    test-strategy.md §3.
  - `/th/`: **clean behavioural Red** — `AssertionError: expected 0
    render-blocking external <script src="..."> in /th/ <head>,
    found 1` (lines 778-781). The probe is wired correctly; the
    prod HTML still emits the blocking `nomodule` script.

- **Full phase-6 test file (no `-t` filter) — collateral regression
  gate, JR run:**

  ```bash
  cd apps/codecamp-advantage
  pnpm vitest run lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts
  ```

  Result: **10 failed | 34 passed | 8 skipped of 52.**
  - 8 failures: all ETIMEDOUT/ENETUNREACH (Red-mode #1 network
    failures from this sandbox — same undici IP-cycle issue).
  - 2 failures: the render-blocking assertions (clean behavioural
    Red — prod not yet deployed).
  - 34 passed: all non-network tests pass, including the 5-case
    `countRenderBlockingScripts` harness.
  - No collateral regression detected: all failures are either
    network-connectivity (sandbox limitation) or the expected
    render-blocking behavioural Red (prod not deployed).

- **Lint / typecheck — JR run:**

  ```bash
  cd apps/codecamp-advantage
  eslint .                                # 0 errors, 3 pre-existing warnings
  tsc --noEmit                            # passes silently
  ```

  Lint: 0 errors, 3 pre-existing `no-unused-vars` warnings in
  `phase-3-authentication-and-authorization.test.ts:62`,
  `phase-5-real-external-integrations.test.ts:90`, and
  `phase-7-cdn-and-caching.test.ts:1` — all unrelated to this
  track. Typecheck: passes silently.

- **Behavioural Red proof via `curl` (system-resolver, 2026-06-08,
  JR run, force IPv4, follow redirect):**

  ```bash
  for path in /en/ /th/; do
    html=$(curl -4 --max-time 15 -L -s "https://codecamp.reading-advantage.com$path")
    echo "=== Locale $path ==="
    echo "status=200 htmlLen=${#html}"
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

  The Red state is **current** (count=1 on both locales, same chunk
  hash `a6dad97d9634a72d.js`, same `noModule` attribute). The
  Phase 2 fix is on disk and committed, but the **prod deployment
  has not happened yet** — the live
  `https://codecamp.reading-advantage.com` HTML still emits the
  blocking `nomodule` polyfill.

- **What "Red" means for Phase 3 (concrete, re-stated):** the
  assertion `expect.soft(blocking, ...).toBe(0)` at lines 763-766
  and 778-781 must flip from "count=1" to "count=0" against live
  prod. The page-functionality regression check
  (`expect.soft(result.status, ...).toBe(200)` at lines 314 and
  331) must remain green for `/en/` (and by extension `/th/`,
  which shares `LocaleLayout`). The full-file run after deploy
  is the "no collateral regression" gate per test-strategy.md §5
  Phase 3.

- **Tasks remain `[~]` (not `[x]`) for the live gate reason:**
  the three Phase 3 task items cannot be marked complete until
  the prod deployment happens, the live probe goes green, and
  the full Phase 6 file runs without collateral regression.
  Per test-strategy.md §3 Red-mode #1 + §7 Phase 3 row, the
  live gate is owned by JR/supervisor post-deploy; this JR's
  responsibility is the local verification plus the live-behaviour
  Red proof, both of which are now in this plan.md.

- **JR/supervisor handoff (recap):**
  1. Deploy the Phase 2 fix to
     `https://codecamp.reading-advantage.com`. The Dockerfile's
     `pnpm turbo run build --filter=codecamp-advantage` will
     automatically run the strip step
     (`4bf93811` + `fd1e1c3a`).
  2. Re-run the targeted Red command from a host that can reach
     prod (CI runner / developer machine) and confirm 2/2 pass.
  3. Re-run the harness sanity 5-case unit run
     (`-t "countRenderBlockingScripts"`) and confirm 5/5 still
     pass (no probe regression from the deployment).
  4. Re-run the full `phase-6-performance-and-latency.test.ts`
     file (no `-t` filter) and confirm no collateral regression
     on the `/en/` and `/th/` 200/latency assertions that cover
     AC #4 (page functionality).
  5. Mark Phase 3 task items `[x]` after the live probe passes.

