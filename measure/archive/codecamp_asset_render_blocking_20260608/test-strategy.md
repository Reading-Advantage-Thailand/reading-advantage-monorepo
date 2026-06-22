# Test Strategy: Render-Blocking Script Removal

Track: `codecamp_asset_render_blocking_20260608`
Role: Tech Lead

## 1. Testing pyramid per phase

| Phase | Unit | Integration / Contract | Live (prod smoke) |
|-------|------|------------------------|-------------------|
| 1 Identification | — | — | Targeted prod fetch + `countRenderBlockingScripts` on `/en/` HTML (manual or scripted) |
| 2 Fix | (none expected — fix is config / `<Script>` swap, no new pure logic) | If a wrapper component is introduced, snapshot it renders `<script defer>` / `<Script strategy="lazyOnload">` (component-level vitest) | — |
| 3 Verification | Re-run unit cases in `describe("countRenderBlockingScripts")` (lines 1166-1223) — sanity that the probe still works | — | The two prod assertions at lines 757 and 772 of `phase-6-performance-and-latency.test.ts` must be **green against live prod** (`/en/` and `/th/`) |

Pyramid stays bottom-heavy: the harness (`countRenderBlockingScripts`) is already covered by 5 unit tests. We add **no** new unit tests for the fix itself unless a real component is introduced.

## 2. Shared fixtures / mocks

- **Probe under test**: `countRenderBlockingScripts(html: string): number` (`phase-6-performance-and-latency.test.ts:281`). Pure function over an HTML string — no HTTP, no DOM.
- **Live fixtures**: `fetchWithTimeout(`${PROD_URL}/en/`)` and `/th/` — no mocking, real prod HTML.
- **Env gating**: `PHASE6_PROD_URL` (default `https://codecamp.reading-advantage.com`) and `PHASE6_SKIP=1`. The verification phase must run with `PHASE6_SKIP` **unset** and a `https://` URL.
- **No new mocks should be introduced.** The probe's whole point is that it's contract-tested against real prod HTML.

## 3. Cross-phase edge cases and dependencies

- **Locale parity**: `/en/` and `/th/` must both pass — they share the same `LocaleLayout` (`apps/codecamp-advantage/app/[locale]/layout.tsx`), so a regression in one almost certainly hits the other, but both gates are non-negotiable.
- **Inline vs external**: the probe ignores inline `<script>` (no `src=`). Fix must not regress by inlining a previously-external script that then injects its own blocking external — re-run the probe, don't reason about it.
- **Body vs head**: probe is `<head>`-only. Moving the script to `<body>` is an acceptable fix per the probe (and per the spec, which says "in `<head>`").
- **Script attributes**: `defer`, `async`, or `type="module"` all neutralise the probe. Pick the one that preserves execution-order semantics for whatever the script actually does (likely Next.js framework code — `defer` is the safe default).
- **Regression scope**: AC #4 ("no regression in page functionality") — Phase 3 must also confirm `GET /en/` and `GET /th/` still return **200** (already asserted by the dashboard tests at lines 307-339). Don't add a separate functional smoke; rely on the existing one in the same suite run.
- **Dependency**: `depends_on: codecamp_qa_prod_20260517` — the Phase 6 suite was authored there; do **not** modify its assertion shape, only fix the prod HTML it observes.

## 4. Architecture guardrails

- **No production code in tests, no test code in production.** The fix lands in `apps/codecamp-advantage/app/**` (likely `layout.tsx`, a component, or `next.config.*`). The test file is read-only for this track.
- **Provider neutrality**: if a third-party script is the culprit, route it through `next/script` with a documented `strategy`. Do not inline vendor SDK loaders in `<head>`.
- **No new tRPC, no new domain functions** — this is a presentation-layer asset fix. Stay out of `packages/domain` and `packages/api`.
- **JSDoc**: any new exported helper component must carry JSDoc per AGENTS.md "Documentation Standards".

## 5. Per-phase test approach

- **Phase 1 — Identification (artifact probe)**: Run `countRenderBlockingScripts` against live prod HTML to extract the offending tag (`src`, location, attrs). Record the tag verbatim in the task commit message. Classify: Next-internal vs third-party vs misconfig.
- **Phase 2 — Fix (production change)**: Apply minimal change (add `defer`/`async`, switch to `next/script`, or remove). No new test files. If a wrapper component is created, add one rendering snapshot only.
- **Phase 3 — Verification (live behavior gate)**: Run the **two specific** prod assertions only (filtered by name), confirm both green against live prod, then run the full `phase-6-performance-and-latency.test.ts` once to confirm no collateral regression.

## 6. build-graph findings

- `build-graph stats` — 1903 nodes, 238 files, 405 functions. Project is TypeScript, graph is fresh today.
- `build-graph search countRenderBlockingScripts` → exactly **one** definition in `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts:281`.
- `build-graph inspect countRenderBlockingScripts` → no outgoing edges, only `contains` from its file and a `param_flow`. **Zero production callers** — confirms it is a test-only probe. Blast radius of *changing* the probe is nil, but we deliberately do not change it; we change prod to satisfy it.
- `build-graph search renderBlocking | next/script` returned no other matches — no existing `next/script` usage in the codecamp app to template from. The fix is genuinely net-new for this app's layout layer.
- `LocaleLayout` (`app/[locale]/layout.tsx`) currently emits zero `<script>` tags itself — the blocking script is being injected by Next.js framework output or a third-party loader, narrowing Phase 1's search space.

## 7. Live-proof plan (Red command / Green gate per phase)

> Convention: all commands run from `apps/codecamp-advantage`. `PHASE6_PROD_URL` defaults to `https://codecamp.reading-advantage.com`; do **not** set `PHASE6_SKIP=1` for live gates.

| Phase | Targeted Red command (proves we can fail) | Green/closeout gate (proves we ship) | Live vs artifact |
|-------|-------------------------------------------|--------------------------------------|------------------|
| 1 Identification | `pnpm vitest run lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts -t "render-blocking external <script> tags in <head>"` — currently **red** on prod, output names the offending count and surrounding diagnostic | Same command run with `--reporter=verbose` while logging the actual `<head>` HTML (one-off `node -e "fetch('https://codecamp.reading-advantage.com/en/').then(r=>r.text()).then(h=>console.log(h.match(/<head[\\s\\S]*?<\\/head>/i)[0]))"`); identification complete when tag is recorded in commit message | **Live** — must hit prod |
| 2 Fix | (no new test) — sanity that the probe's own unit tests stay green: `pnpm vitest run lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts -t "countRenderBlockingScripts"` (5 cases; artifact/contract — proves harness still works, does **not** prove prod is fixed) | After deploy: `pnpm vitest run lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts -t "render-blocking external <script> tags in <head>"` flips green for both `/en/` and `/th/` | Probe tests = artifact; deploy gate = **live** |
| 3 Verification | Re-run the same `-t "render-blocking external <script> tags in <head>"` command — expect green, treat unexpected red as Phase 2 regression | `pnpm vitest run lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts` (full file, no `-t`) green end-to-end against live prod, including the existing `/en/` and `/th/` 200/latency assertions that cover AC #4 | **Live** — full prod smoke |

**Artifact vs live distinction (explicit):**
- *Artifact / contract tests*: the 5 `describe("countRenderBlockingScripts")` unit cases (lines 1166-1223) — they prove the probe's pure logic against synthetic HTML strings. They will pass even if prod is broken, so they **must not** be used as the Phase 3 closeout gate.
- *Live behavior gates*: the two assertions at lines 757 ("GET /en/ has zero render-blocking…") and 772 ("GET /th/ has zero render-blocking…"). These are the only valid Phase 3 closeout proofs.

**Fake-harness boundary:** there are no fake/mock HTTP harnesses in this track. The probe is pure; the gates are real `fetch()` to prod. If anyone later introduces a recorded-fixture mode, it must remain test-only and must **never** substitute for the live `-t "render-blocking external"` command above as the closeout gate.

**Intentionally-red files / aggregate-suite hazards:**
- The Phase 6 file itself is currently red on the two target assertions; running `pnpm turbo run test` repo-wide will surface this red until Phase 2 lands. Mitigation: during Phases 1-2, scope to `--filter=codecamp-advantage` and the `-t` flag above; do **not** unskip via `PHASE6_SKIP=1` (that would mask the very signal we are tracking). Ownership of the red stays with this track's still-`[~]` Phase 2 task.
- No new `.skip` / `.todo` / `xit` files are introduced; nothing else needs exclusion.

MEASURE_AGENT_RESULT
role: strategy
status: complete
track: codecamp_asset_render_blocking_20260608
phase: track setup
commits: none
tests_run: build-graph stats/search/inspect (read-only, no test commands executed)
files_changed: measure/tracks/codecamp_asset_render_blocking_20260608/test-strategy.md (new)
plan_updates: none (plan.md unchanged)
known_failures: phase-6-performance-and-latency.test.ts assertions at lines 757 & 772 (/en/ and /th/ render-blocking) currently red on prod — this is the expected Phase 1 signal, will be closed by Phase 2 fix + Phase 3 verification.
handoff: Implementer should start Phase 1 with the live -t command in section 7; record the offending <script> tag (src + attrs) in the task commit. Do NOT modify phase-6-performance-and-latency.test.ts. Use -t filtering and --filter=codecamp-advantage until Phase 3 to keep red scoped.
END_MEASURE_AGENT_RESULT
