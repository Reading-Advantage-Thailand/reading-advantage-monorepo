# Test Strategy — www features and pricing rewrite

Track: `www_features_pricing_20261120`. Scope: `apps/www-reading-advantage` only. The risk is **high**: copy and prices are public claims, six locale routes change, and pushing master deploys www live. The pages have no auth, user input, data writes, API handler, or new dependency.

## Evidence and fixtures

- `features-pricing-expected.ts` pins English to the copy spec and Thai to TH-FP-01–95 in the Thai check page. A scratch source comparison plus Review A must find zero missing or altered strings. The application tests do not read the separate source repository.
- Page tests render the actual route components and locale objects for en, th, and zh. Do not mock page content, locale lookup, links, metadata, or image paths. No network or database mock is needed; this scope has no live service dependency.
- The asset test proves file format, size, dimensions, and referenced paths. It does not prove crop suitability. A person checks the four outputs.
- Artifact tests prove copy, locale structure, metadata, markup, price values, source scope, and static assets. They do not prove rendered browser layout or production deployment. The local Next server and Playwright captures prove live browser behavior only for the built local revision; they do not prove master or production behavior.

## Phase gates and falsification

Commands below use the plan's `heavy-run.sh -c 'cd <worktree>/apps/www-reading-advantage && …'` wrapper, except the fixture source check (`python3 -I`). Run heavy commands one at a time. Use `pnpm exec vitest run --maxWorkers=1 <named files>` for targeted tests. Never replace a failed command with a count or text assertion.

| Plan phase / risk | Targeted Red command | Green gate | Closeout gate |
|---|---|---|---|
| 0 Plan/start, **medium** | No feature Red. Baseline the named existing suites in plan 0.3; a non-zero baseline is recorded, not hidden. | A-71 Green confirmed; `git log -1 --format=%H master` and `git merge-base HEAD master` agree with the recorded start base; frozen install succeeds. | Baseline counts and existing failures are recorded. If A-71 remains open or master moved, stop/rebase before Phase 1. |
| 1 Red, **medium** | Run each new locale, feature-page, pricing-page, and asset test by its exact path, then run the fixture source-check script. | Intended assertions fail for missing keys/content/assets; guard cases pass; no import/config failure. Lint and `pnpm check-types` on Red tests pass. | Run all four Red files together and rerun the baseline set. Red failures must be expected and localized; baseline behavior must match Phase 0. |
| 2 Green, **high** | Re-run the affected content, locale, assets, SEO, i18n, contrast, and stale-reader tests named in plan tasks 2.2–2.5. | On one HEAD: changed-file ESLint; `pnpm check-types`; full www Vitest suite; `pnpm build`; `node scripts/ci/affected-apps.mjs --base <40-char-start-merge-base> --head <40-char-tested-HEAD>` lists www only. | Diff since Phase 1 checkpoint contains only planned files; removed component callers are gone (graph callers when available); all named gates exit 0. |
| 3 Reviews, **medium** | Review A and Review C independently challenge the implementation; each Critical/High finding falsifies the gate. | Review A: source string exactness, callers, locale shape, and old-test meaning. Review C: six routes, metadata/canonicals, navigation, links, keys, and locale routing. | No unresolved Critical/High; fixes rerun Phase 2 gates. Review B is **not applicable**: static copy/pages only, with no auth, input, data, or handler change. Record the exclusion. |
| 4 Browser/captures, **high** | Capture all six routes at 390, 980, and 1280 px. The capture report fails on overflow, broken images, console errors, or h1 count other than one. | Review all 18 captures and the report against design and picture rules. A High finding falsifies the gate and requires a fix plus recapture. | Person-checked verdict per route and width; send all capture paths and the verdict to the PM. Empty picture slots and zh English copy are judged as explicit defaults, not silently treated as implemented imagery or translated copy. |
| 5 Acceptance/release, **critical** | No new feature Red. Acceptance reruns the full AC-1–AC-11 evidence against one immutable HEAD; any failed assertion falsifies acceptance. | Rerun Phase 2 gates on final HEAD; acceptance verifies each AC. Daniel's Thai check, look check, and deploy word are separate owner gates. | No push until all automated/review gates pass and Daniel authorizes it. Push to master is a live www deploy; this strategy authorizes no push or deploy. |

**Intentionally red aggregate handling:** Phase 1's new tests are expected to fail before implementation. Do not run or interpret the full aggregate suite as a Phase 1 gate. Run only named Red files and the Phase 0 baseline. Record file/test counts and failure reasons. Do not suppress failures. After Green, the complete www Vitest suite must exit 0; any known baseline failure remains explicitly listed and blocks claiming the aggregate is green unless the orchestrator accepts a documented exception.

## Architecture and contract guardrails

- Keep the change in the two marketing routes, their specified locale objects, small page-local/reusable presentation components, screenshot assets, and listed tests/docs. No API, handler, auth, database, transport, shared hero, navigation contract, or new dependency changes.
- Preserve six locale routes, existing locale routing/static params, canonical URLs, header/footer links, and the explicit message contract: `metadata.title` and `metadata.description`; zh features/pricing are English copies; zh managed-service and nav labels remain unchanged.
- Changed contracts include removal of `ComparisonTable`, `PricingTable`, `comparisonTable` and `pricingTable`; changes to feature/pricing locale keys; new price-table semantics and CTA targets. Update every caller and affected test in the same Green change. Keep unrelated pages and locale keys unchanged.
- Main risks: source-copy drift, unsupported price/claim, stale key or component reader, wrong image crop, inaccessible table/FAQ, small-screen overflow, locale metadata/link regression, and accidental scope expansion. The exact locale scan and source-level scope diff are required guards.

## Review applicability

| Review | Applies? | Proof |
|---|---|---|
| Security (Review B) | No | No auth, user input, data, or handler changes; record the reason in the review log. |
| UX/API (Review C) | Yes | Check six routes, canonical metadata, locale routing, links, anchors, and removed keys. The price table and links are content; no handler/API contract changes. |
| Adversarial testing | Yes, bounded | Attack banned-string scans with positive controls; inject stale locale values, extra baht amounts, wrong price row/order, missing targets/assets, and changed zh guard values. Each must make its named test fail. No separate API fuzzing applies. |
| Browser review | Yes | Inspect all 18 captures at 390/980/1280; judge look, Thai wrapping, table fit, empty image slots, contrast, zh mix, and broken images. Automated capture alone is not a look verdict. |

## Anti-pattern defenses and falsification

Each listed defense is required. A defense fails if its stated mutation, omission, or evidence mismatch does not make the gate fail. A1–A11 refer to `measure/anti-patterns.md`.

- **Phase 0:** A1/A8 — use structured task markers and status, never free-text `deferred` parsing; malformed markers fail the registry check. A3/A4 — baseline reports labeled Test Files and Tests counts and must include named suites; zero selected suites is failure. A5/A6 — record command output before claiming a baseline or status. A9 — resolve active track paths; a test referring only to an archived path fails. A10 — record graph unavailable/stale rather than claim graph verification. A11 — no completed review is reported before a review artifact exists.
- **Phase 1:** A3/A4 — record labeled per-file test counts; require nonzero assertions and guard cases. A5 — only expected assertion failures count as Red; import/config errors falsify Red. A7 — exact banned strings are checked as locale values; the positive-control string must be detected, and a hidden real match must fail. A8/A11 — keep phase markers and review state truthful. A9 — test fixtures and scripts must resolve the active track, not assume an archive path.
- **Phase 2:** A3/A4 — report labeled counts for the full suite and require selected tests; empty runs fail. A5/A6 — claims of green require the actual successful command result and matching registry wording. A7 — negative scans use exact claim/price tokens and positive controls, never broad English exclusions. A8 — completed tasks require evidence and correct markers. A9 — active paths resolve. A10 — inspect callers before deletion and record graph check as skipped if graph is stale/unavailable; stale generated facts cannot be called fresh. A1 — task completion follows structured markers, not prose.
- **Phase 3:** A4/A5 — both reviews must inspect the changed HEAD and produce findings/verdicts; an empty or missing report is not a pass. A6 — registry/status cannot claim accepted before reports and fixes. A8/A11 — review tasks move to done only with evidence; an executed review must not remain fully blocked. A9 — cited files resolve in the active track. A1 — do not infer review status from a word in prose.
- **Phase 4:** A3/A4 — capture report labels route/locale/width and requires all 18 captures; missing captures are failure, not zero errors. A5 — report automated capture checks separately from person-checked look verdicts. A6 — no “browser passed” claim without both. A7 — image/content checks use exact prohibitions, not broad filters. A8/A11 — review and phase markers match actual evidence. A2 — captures and reviews do not authorize publication; Daniel's explicit deploy gate remains mandatory.
- **Phase 5:** A2 — a push is blocked until Daniel's Thai/look/deploy approval; any missing approval falsifies release readiness. A3/A4 — acceptance lists labeled AC-1–AC-11 results and requires each AC; missing evidence is not pass. A5/A6 — claims match final commands, acceptance report, and registry status. A8/A11 — final task markers reflect completed evidence; no executed review stays fully blocked. A9 — active paths resolve. A1 — release state uses structured gates, not free-text substrings.

## Immutable phase base

After committing this strategy, the orchestrator must capture `phase_base_sha` as the new commit's full `git rev-parse HEAD`, before starting Phase 1 Red. Do not reuse the role base or embed a pre-strategy SHA. This SHA is the immutable baseline for the phase's review and diff checks.

## Not claimed

Local build and browser evidence do not prove deployed production behavior. Production content and pricing can be claimed only after Daniel authorizes the master push and the PM verifies the live pages. zh copy quality is not tested as translated copy because the accepted default is English until checked zh content exists.
