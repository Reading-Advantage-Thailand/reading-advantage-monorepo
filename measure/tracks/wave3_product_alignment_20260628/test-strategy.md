# Test Strategy: Wave 3 — Product-Facing Truth and Reusable Surfaces

> **Track ID:** `wave3_product_alignment_20260628`
> **Baseline SHA:** `8a47d2df999e35d9d47de9eb590ae29523c70bae`
> **Active phases for this cycle:** Phase 5 (Embeddable Runtime, i18n, and Shared
> Package). Phases 0, 1, 2, 3, and 4 are **complete and accepted** — their
> strategies are preserved verbatim below for provenance.
>
> This document specifies:
> - §0.A — Phase 0 artifact tests (decisions/matrix truthfulness) — complete
> - §0.B — Phase 1 live-behavior tests (claims correction) — complete
> - §0.C — Phase 3 live-behavior tests (games completion/scoring contract) — complete
> - §0.D — Phase 4 live-behavior tests (tenant-safe persistence + leaderboards) — complete
> - §0.E — Phase 5 live-behavior tests (embeddable runtime + i18n + shared package) — **active**
> - §1–§10 — Phase 2 strategy, preserved unchanged for provenance

---

## 0.A. Phase 0 — Product Decision Intake (artifact tests)

Phase 0 is a **decisions** phase, not a live-behavior phase. It produces two frozen
artifacts:

- `phase-0-decisions.md` — four product-owner decisions with Tier 1 (automatable floor)
  vs Tier 2 (`[b] deferred:po`) split.
- `phase-0-claims-matrix.md` — 30 frozen claim rows (CC-01..CC-30) with HEAD-confirmed
  file:line evidence and Phase 1 dispositions.

### What Phase 0 must defend against (anti-patterns)

| Anti-pattern | Where it applies in Phase 0 | Defense |
|---|---|---|
| **A5** False-claim text vs test reality | `phase-0-decisions.md` and `phase-0-claims-matrix.md` cite file:line evidence | Every claim row in the matrix must cite a file:line that exists at the baseline SHA `8a47d2df`. A guard test re-verifies the cited literals exist in the cited files; if a cited literal is absent, the matrix is drifting and the test fails. |
| **A6** Registry-note overstatement | `plan.md` Phase 0 task markers | Do not mark Tier 2 `[b] deferred:po` items as `[x]`. The plan marker must match the decision tier. The marker-vocabulary check (`tests/orchestrator_marker_vocabulary.sh`) and the audit role enforce this. |
| **A2** Consent-blind publish gate | Decision 4 (efficacy stats / case studies) | The Tier 1 floor for case studies is "remove or relabel as illustrative" UNLESS a `consent-<subject>.{md,pdf}` artifact exists. Phase 0 records this as a frozen rule; Phase 1 enforces it via `wave2-product-claim-helper.ts`. |
| **A9** Pre-existing test references archived track paths | Phase 0 artifacts cite `measure/audit-reports/...` paths (not `measure/tracks/...`) | All evidence references point at `measure/audit-reports/` (stable, never archived) rather than `measure/tracks/<id>/` (movable on closeout). The audit role checks this. |
| **A11** Executed review track left fully blocked | Phase 0 is a decisions phase, not a review-execution track | N/A — but the test records this consciously. Phase 0 tasks that are Tier 1 are marked `[x]`; Tier 2 are `[b] deferred:po` with a precise PO question. No `[~]` remains. |

### Phase 0 Red command (artifact truthfulness)

There is no live-behavior Red for Phase 0 — it produces artifacts, not code. The Phase 0
"Red" is a **structural** check that the artifacts exist and are internally consistent
with the baseline source. This is run as a single bash guard before Phase 1 begins:

```bash
# phase-0 artifact truthfulness guard (run from repo root)
test -f measure/tracks/wave3_product_alignment_20260628/phase-0-decisions.md || exit 1
test -f measure/tracks/wave3_product_alignment_20260628/phase-0-claims-matrix.md || exit 1
# Re-verify cited literals still exist at HEAD (A5 defense — matrix is not drifting)
rg -q 'One engine, nine products' apps/www-reading-advantage/src/locales/pages/home.ts
rg -q 'GPT-5' apps/www-reading-advantage/src/locales/pages/products/primary-advantage.ts
rg -q 'School A \(Coming Soon\)' apps/www-reading-advantage/src/locales/pages/case-studies.ts
rg -q 'ZERO RISK' apps/www-reading-advantage/src/locales/pages/managed-service.ts
rg -q '2,172\+' 'apps/www-reading-advantage/src/app/[locale]/(marketing)/(home)/page.tsx'
# Plan marker truthfulness (A6 defense — Tier 2 not overclaimed as [x])
grep -cE '^- \[x\] Task: Present product-owner' measure/tracks/wave3_product_alignment_20260628/plan.md | grep -q '^1$'
grep -cE 'deferred:po' measure/tracks/wave3_product_alignment_20260628/phase-0-decisions.md | grep -qv '^0$'
```

The first five `rg -q` calls **must succeed** (literals present at baseline) — this proves
the matrix describes real violations, not invented ones (A5 defense). After Phase 1 Green,
those same `rg -q` calls **must fail** (literals removed) — that is the Phase 1 live-behavior
Red→Green proof (see §0.B).

### Phase 0 Green gate

Phase 0 is Green when:

- `phase-0-decisions.md` and `phase-0-claims-matrix.md` exist in the track directory.
- The Phase 0 artifact truthfulness guard above exits 0 (all cited literals present at
  baseline; plan markers truthful).
- `plan.md` Phase 0 has three `[x]` tasks (one per plan row) with no `[~]` remaining.
  Tier 2 items are recorded as `[b] deferred:po` *inside* the task body, not as separate
  incomplete tasks.

### Phase 0 closeout gate

- All three Phase 0 plan rows are `[x]`.
- The four `[NEEDS-PO]` Tier 2 questions in `phase-0-decisions.md` are explicitly listed
  in `plan.md` Phase 6 (Product Acceptance and Closeout) as `[b] deferred:po` items the
  PO must resolve before final acceptance — they are not silently dropped.
- The Advantage Games import policy (Decision 3) is referenced from `plan.md` Phases 3,
  4, 5 so the pilot-import gate is visible at each phase boundary.

### Artifact vs live-behavior distinction (Phase 0)

Phase 0 produces **artifact/documentation tests only**. There is no call to a route
handler, no DB mock, no AI client. The "test" is a bash guard that reads files and
re-verifies cited literals. This is legitimate for a decisions phase but must not be the
*only* evidence for any behavioral claim downstream — Phase 1's live-behavior tests are
the load-bearing proof that the claims are actually corrected in source.

---

## 0.B. Phase 1 — Website Claims Correction (live-behavior tests)

Phase 1 is the live-behavior phase that enforces the Tier 1 floor from `phase-0-decisions.md`
against `apps/www-reading-advantage` source. The app's test runner is `vitest run` (see
`apps/www-reading-advantage/package.json` `"test": "vitest run"`). Existing tests live in
`apps/www-reading-advantage/src/**/*.test.ts(x)` and `apps/www-reading-advantage/scripts/__tests__/`.
The Wave 2 reusable harness `apps/www-reading-advantage/src/testing/product-claim-helper.ts`
and its consumer test `src/lib/wave2-product-claim-helper.test.ts` are the foundation —
Phase 1 extends them, does not duplicate them.

### Confirmed claims to defend against (evidence-mapped, frozen in `phase-0-claims-matrix.md`)

| Group | Claim IDs | Evidence | Phase 1 Red asserts |
|-------|-----------|----------|---------------------|
| 1A — Product count | CC-01, CC-02, CC-03 | LRF-001/029/034; CA-008 | No "nine products" / "all 9 products" / "one engine, nine products" literal in `apps/www-reading-advantage/src/` |
| 1B — Stale launch dates | CC-04..CC-12 | LRF-002/003/006 | No "Coming in 2025" / "Launching in 2025" / "Coming in 2026" / "New for SY2025" / "Starting May 2026" past-due dateline on any product page (the 18-month threshold from `product-claim-helper.ts` enforces this deterministically) |
| 1C — Nonexistent-app pages | CC-13..CC-17 | CA-008 | Each of Math/STEM/Storytime/Tutor/Zhongwen product page either carries a "roadmap"/"planned" marker with no launch date, OR is removed from the products index (Phase 1 implements the default: keep with roadmap label) |
| 1D — AI model claims | CC-18, CC-19 | LRF-013 | No "GPT-5" / "GPT-4" / "Google Gemini & GPT-5 AI" literal in `apps/www-reading-advantage/src/locales/` or `src/app/` |
| 1E — Placeholder case studies | CC-20, CC-21 | LRF-012 | No "School A (Coming Soon)" / "School B (Coming Soon)" / "Real Results" heading; relabeled "Illustrative examples" or removed |
| 1F — Duplicated efficacy stats | CC-22 | LRF-014 | Primary Advantage locale no longer contains a verbatim copy of Reading Advantage's efficacy stats block |
| 1G — Unverifiable stats & absolute claims | CC-23..CC-28 | LRF-015/017/019/031 | No "2,172+", "95%" (math), "3x faster", "ZERO RISK", "Aka 2019", "+50% grammar", "2x vocab" literal without a paired citation/consent artifact |
| 1H — Partner/school consent | CC-29 | LRF-012; A2 | `wave2-product-claim-helper.ts` `audit()` returns `missingConsentCount === 0` for any `published-case-study` claim harvested from the case-studies page |
| 1I — Stale timestamps | CC-30 | LRF-017 | No "Last updated Oct 2023" / "Oct 2024" stale timestamp on comparison/pricing tables (or replaced with current date) |

### Gate commands (www app)

- **RED_TEST_COMMAND / GREEN_TEST_COMMAND:** `pnpm --filter www-reading-advantage test`
  (bounded Red runs may filter: `pnpm --filter www-reading-advantage test phase-w3-claims`)
- **PROJECT_LINT:** `pnpm --filter www-reading-advantage lint`
- **PROJECT_CHECKS:** `pnpm --filter www-reading-advantage check-types`

### Phase 1 Red → Green → Closeout

Phase 1 is decomposed into nine test groups (1A..1I), one per claim cluster. Each group
is a bounded Red target. All groups share the Green gate `pnpm --filter www-reading-advantage test`
(whole www suite green, including the pre-existing Wave 2 tests) and the closeout gate below.

**Target file (new):** `apps/www-reading-advantage/src/lib/__tests__/phase-w3-claims.test.ts`
(single file, grouped `describe` blocks — mirrors the established `wave2-product-claim-helper.test.ts`
pattern).

**Red command:** `pnpm --filter www-reading-advantage test phase-w3-claims`

**Red assertions (one block per group, all asserting against HEAD `8a47d2df` source):**

1. **1A product count** — `rg -n 'nine products|all 9 products|one engine, nine' apps/www-reading-advantage/src/`
   returns **0 hits**. Today it returns ≥3 (CC-01/02/03). Red at baseline; Green after
   the count is corrected.
2. **1B stale launch dates** — for each product-page locale file in
   `src/locales/pages/products/`, assert no line matches
   `/(Coming|Launching|New for) .* 2025/` or `/Starting May 2026/` or `/Coming in 2026/`.
   Use the `product-claim-helper.ts` `STALE_DATE_THRESHOLD_MS` (18 months) detector so
   the threshold is deterministic and not a bare-digit match (A3).
3. **1C nonexistent-app pages** — for each of Math/STEM/Storytime/Tutor/Zhongwen page
   files, assert either (a) the page contains a `roadmap`/`planned` marker AND no
   concrete launch date, or (b) the page is removed (file absent). Default Phase 1
   implementation: keep with roadmap label.
4. **1D AI model claims** — `rg -n 'GPT-5|GPT-4|Google Gemini & GPT-5' apps/www-reading-advantage/src/`
   returns **0 hits**. Today it returns 9 (CC-18/19). Red at baseline; Green after
   provider-neutral copy is substituted.
5. **1E placeholder case studies** — `rg -n 'School A \(Coming Soon\)|School B \(Coming Soon\)|Real Results' apps/www-reading-advantage/src/locales/pages/case-studies.ts`
   returns **0 hits**. The `wave2-product-claim-helper.ts` `audit()` on harvested
   case-study claims returns `placeholderCaseStudyCount === 0`.
6. **1F duplicated efficacy stats** — diff the Primary Advantage locale efficacy block
   against the Reading Advantage locale efficacy block; assert they are not identical.
   (If both are removed per Tier 1, the diff is trivially non-identical — both empty.)
7. **1G unverifiable stats** — `rg -n '2,172\+|ZERO RISK|Aka 2019|\+50% grammar|2x vocab' apps/www-reading-advantage/src/`
   returns **0 hits**. For "95%" and "3x faster" on the Math page, assert the Math page
   is either removed or relabeled as roadmap (per 1C) so the stats are not presented as
   live product performance.
8. **1H partner/school consent** — harvest every `published-case-study`-classified claim
   from `src/locales/pages/case-studies.ts` (using the helper's `classify()`), then call
   `audit(claims, consentIndex)` where `consentIndex` is built from any
   `consent-<subject>.{md,pdf}` artifacts in `apps/www-reading-advantage/`. Assert
   `missingConsentCount === 0`. Today, with no consent artifacts and "School A/B (Coming
   Soon)" placeholders, this passes vacuously (the placeholders are
   `placeholder-case-study`, not `published-case-study`); after Phase 1 Green, if any
   real case study is added, it must come with consent. **A4 defense:** the test must
   also assert `claimCount >= 1` so a fully-removed case-studies page does not pass
   vacuously.
9. **1I stale timestamps** — `rg -n 'Last updated.*Oct 202[34]' apps/www-reading-advantage/src/`
   returns **0 hits**, OR every "Last updated" line uses a date within the
   `STALE_DATE_THRESHOLD_MS` window.

**Positive controls (A4 defense — non-vacuity):** each group includes a positive
control asserting a truthful replacement exists. For 1A, assert a truthful count
string ("four products" or equivalent) is present. For 1D, assert provider-neutral
copy ("AI-powered" or equivalent) is present where GPT-5 was removed. For 1E, assert
the case-studies page still exists with relabeled "Illustrative examples" or
methodology disclaimer content (so the test does not pass by deleting the page
entirely). A group that passes only because the source was deleted fails its positive
control.

### Phase 1 Green gate

- `pnpm --filter www-reading-advantage test` exits **0** — the whole www suite,
  including the new `phase-w3-claims.test.ts` AND the pre-existing Wave 2 tests
  (`wave2-product-claim-helper.test.ts`, `blog.test.ts`, `blog-posts-validation.test.ts`,
  etc.). No regression in the baseline www tests.
- `pnpm --filter www-reading-advantage lint` exits 0.
- `pnpm --filter www-reading-advantage check-types` exits 0.

### Phase 1 closeout gate

- All Green-gate commands green.
- Every `[FIX-MUST]` row in `phase-0-claims-matrix.md` (CC-01..CC-30 except the
  `[OUT-OF-SCOPE]` rows) has at least one **red-at-baseline / green-after-fix** test
  with a positive control.
- The Phase 0 artifact truthfulness guard's "literal present" `rg -q` calls now **fail**
  (literals removed) — this is the live-behavior proof that the matrix described real
  violations and they were corrected.
- Tier 2 `[b] deferred:po` items remain deferred in `plan.md` Phase 6 — Phase 1 did not
  invent approved stats, model names, or roadmap dates.
- `wave2-product-claim-helper.test.ts` still passes (no regression in the Wave 2
  reusable harness).

### Phase 1 fixtures, mocks, and live-behavior proof

- **No DB mock, no AI mock, no route-handler call.** Phase 1 tests are **source-text
  audits** — they read `apps/www-reading-advantage/src/locales/` and
  `apps/www-reading-advantage/src/app/` files and assert on their content. This is the
  honest tier for claims correction: a public marketing claim is a *source-text* fact,
  not a runtime behavior.
- **`product-claim-helper.ts` is real, not mocked.** The Wave 2 helper is the
  classification engine; Phase 1 tests call `createProductClaimHelper()` and feed it
  harvested claim lines. The helper itself is unit-tested by `wave2-product-claim-helper.test.ts`;
  Phase 1 tests are consumer/integration tests over the real helper.
- **Harvesting fixtures:** a small fixture in the test file maps each claim cluster to
  the source files it audits (e.g. `{ page: "home", files: ["src/locales/pages/home.ts",
  "src/app/[locale]/(marketing)/(home)/page.tsx"] }`). The test reads each file and
  runs the helper's `classify()` + `audit()` on harvested lines. This keeps the test
  path-independent (A9) — it references `apps/www-reading-advantage/src/`, not a
  measure track path.
- **Consent artifact fixture:** for group 1H, the test looks for
  `apps/www-reading-advantage/consent-*.{md,pdf}` files at runtime. If none exist,
  every `published-case-study` claim must have been removed/relabeled (so
  `publishedCaseStudyCount === 0` and `missingConsentCount === 0`). If the PO later
  adds a consent artifact, the test automatically picks it up — no test rewrite needed.

### Phase 1 anti-pattern coverage (falsifiability per group)

| Anti-pattern | Where it applies in Phase 1 | Defense |
|---|---|---|
| **A4** Vacuous-pass on nothing-done | Every group (1A..1I) | **Positive control** in each group: a truthful replacement must exist (count string, neutral copy, relabeled section). A group that passes only by deleting source fails its positive control. Group 1H also asserts `claimCount >= 1`. |
| **A5** False-claim text vs test reality | `plan.md` Phase 1 task text | Do not write "claims corrected" / "all claims pass" in `plan.md` unless `pnpm --filter www-reading-advantage test` exits 0. The cited command is the source of truth. |
| **A6** Registry-note overstatement | `measure/tracks.md` Wave 3 row | Do **not** claim the website claims mismatch (CA-008) is "resolved" in any registry note until groups 1A..1I are green. The CA-008 finding stays "open" in `product-risk-register.md` until Phase 1 closeout. |
| **A3** Digit-only as labeled count | Group 1A product count; group 1H consent count | Use the `product-claim-helper.ts` labeled-integer report (`appExistenceCount`, `staleLaunchDateCount`, `placeholderCaseStudyCount`, `publishedCaseStudyCount`, `missingConsentCount`). Never `rg -q '[0-9]+'` or a bare-digit match. |
| **A7** Over-broad filter swallowing hits | Groups 1A/1D/1E/1G literal scans | Match the **exact banned literals** ("GPT-5", "nine products", "School A (Coming Soon)", "ZERO RISK", "2,172+"), not bare English words like "school"/"AI"/"risk" (which appear legitimately in disclaimers and component names). |
| **A2** Consent-blind publish gate | Group 1H partner/school consent | `wave2-product-claim-helper.ts` `audit()` returns `missingConsentCount` for any `published-case-study` without paired consent + anonymization. Strict boolean check (`hasConsent === true && anonymized === true`); truthy-string consent does not bypass (already tested in `wave2-product-claim-helper.test.ts`). |
| **A9** Pre-existing test references archived track paths | New `phase-w3-claims.test.ts` | The test references `apps/www-reading-advantage/src/...` only — never a `measure/tracks/<id>/` path. Provenance comments may cite `phase-0-claims-matrix.md` but no runtime dependency on a track path. If the track later archives, tests must not break. |
| **A10** Generated-facts drift | N/A — Phase 1 does not regenerate `measure/generated/`. | Consciously not applicable. |
| **A11** Executed review track left fully blocked | N/A — Phase 1 is an implementation phase. | Consciously not applicable. |

A1, A8, A12, A13 are orchestrator-internal or catalog/closeout classes not exercised by
Phase 1 product tests. They are recorded here as consciously-not-applicable rather than
silently skipped.

### Phase 1 intentionally-red aggregate-suite handling

The monorepo aggregate suite (`pnpm turbo run test`) is **red at baseline** from
pre-existing, owner-labeled failures outside Wave 3 (see `measure/tracks.md:112-115`:
"aggregate reds are pre-existing/owner-labeled"). Phase 1 does **not** attempt to green
the aggregate suite. The Phase 1 gate is **scoped to the www filter**
(`pnpm --filter www-reading-advantage test`), which must be fully green. Any non-www
aggregate red observed during this phase is pre-existing and must be labeled as such in
the phase result `known_failures` — never silently absorbed into a "green" claim (A5/A6).

### Phase 1 artifact vs live-behavior distinction

- **Source-text audit tests** (groups 1A..1I) read `apps/www-reading-advantage/src/`
  files and assert on their content. These are **legitimate live-behavior tests** for a
  public marketing claim, because the claim *is* the source text — there is no runtime
  behavior that could rescue a false claim. They are not "documentation tests" in the
  Phase 2 sense (which read JSDoc/policy text); they read the actual public copy.
- **Helper-classification tests** (group 1H via `product-claim-helper.ts`) are
  behavioral tests over the real helper — they call `classify()` + `audit()` and assert
  on the labeled-integer report. These are the load-bearing tests for the A2
  consent-gate claim.
- **No route-handler or DB test in Phase 1.** The website has no backend workflow that
  produces these claims — they are static copy. Phase 1 does not mock DBs or AI clients.

---

## 0.C. Phase 3 — Advantage Games Completion and Scoring Contract (live-behavior tests)

Phase 3 is the live-behavior phase that delivers the shared game-completion contract
frozen in `phase-3-decisions.md`. It spans **two test runners** because the contract
lives in `packages/domain` (vitest) while the route handler and game component live in
`apps/advantage-games` (jest). The contract is the load-bearing artifact; the route
handler is a thin validator+delegator; the game component is the migration proof.

### What Phase 3 must defend against (anti-patterns)

| Anti-pattern | Where it applies in Phase 3 | Defense |
|---|---|---|
| **A4** Vacuous-pass on nothing-done | Every schema-rejection test (3A); every fire-once test (3C) | **Positive control**: every rejection test pairs an invalid payload (rejected) with a valid payload (accepted). A schema that rejects everything fails the positive control. Every fire-once test pairs a first call (insert, `duplicate: false`) with a second call (dedup, `duplicate: true`, no insert). A function that always returns `duplicate: true` fails the first-call control. |
| **A5** False-claim text vs test reality | `plan.md` Phase 3 task text | Do not write "contract enforced" / "XP server-side" / "fire-once" in `plan.md` unless `pnpm --filter @reading-advantage/domain test -- games` exits 0. The cited command is the source of truth. |
| **A6** Registry-note overstatement | `measure/tracks.md` Wave 3 row; `product-risk-register.md` | Do **not** claim D-01/D-02/D-05 or CA-013 / MR-H05 is "resolved" until Phase 3 acceptance passes. The findings stay "open" in `product-risk-register.md` until Phase 5 pilot import green. |
| **A3** Digit-only as labeled count | XP formula tests (3B) | Use labeled-integer assertions: `expect(result.xpEarned).toBe(7)` with a comment `// XP earned: 7 = min(10, 5 + 2)`; never `expect(result.xpEarned).toBeTruthy()` or `rg -q '[0-9]+'`. |
| **A7** Over-broad filter swallowing hits | Schema-rejection tests (3A) | Match exact invalid keys (`xp`, `dragonCount`, `bossPower`), not bare English words like "score"/"bonus"/"power" (which appear legitimately in `metadata`). |
| **A9** Pre-existing test references archived track paths | New `games.test.ts`, rewritten `completeRoute.test.ts`, extended `HauntedLibraryGame.test.tsx` | Tests reference `packages/domain/src/games/` and `apps/advantage-games/src/` only — never a `measure/tracks/<id>/` path. Provenance comments may cite `phase-3-decisions.md` but no runtime dependency. |
| **A2** Consent-blind publish gate | N/A — no publish flow in Phase 3. | Consciously not applicable. |
| **A1, A8, A10, A11, A12, A13** | Orchestrator-internal or closeout classes. | Consciously not applicable to Phase 3 product tests. |

### Confirmed contract gaps to defend against (evidence-mapped, frozen in `phase-3-decisions.md`)

| Group | Gap IDs | Evidence | Phase 3 Red asserts |
|-------|---------|----------|---------------------|
| 3A — Shared Zod contract | D-01, D-05, B25-002, B21-002, B21-037, B22-026 | `advantage-games_20260626/findings.md` §A1, §D | `GameCompletionInputSchema` exists in `packages/domain/src/games/schema.ts`; `.strict()` rejects `xp`, `dragonCount`, `bossPower`, `accuracy > 1`, invalid `gameType`, missing `idempotencyKey`. Positive control: valid payload parses. |
| 3B — Server-side XP formula | D-02, B25-001, B20-039 | `findings.md` §A1, §A2; `completeRoute.ts:12` (`xpEarned = xp ?? ...`) | `calculateGameXP(input)` returns `Math.min(10, base + bonus)`; returns 0 for `totalAttempts === 0`; ignores any client `xp` (the input type has no `xp` field). The route handler's mock response uses `calculateGameXP`, never echoes client `xp`. |
| 3C — Fire-once completion guard | B28-017, B30-002, B23-008, B24-008 | `findings.md` §A1, §A5 | `recordGameCompletion` first call inserts with `activityId = game:<gameType>:<idempotencyKey>`; second call with same key returns `duplicate: true, xpEarned: 0` with **no** `db.insert`. The `activityId` is stable across retries (not `Date.now()`). |
| 3D — Representative game migration | D-01 (haunted-library), B21-235 | `game-readiness-matrix.md` haunted-library row | `HauntedLibraryGame.tsx#onComplete` sends `{ gameType: "haunted-library", difficulty, score, accuracy, correctAnswers, totalAttempts, duration, victory, idempotencyKey, clientTimestamp }` — no `xp` field. `idempotencyKey` is stable across the game session (generated once, stored in `useRef`). |
| 3E — Route handler delegation | D-01, D-02, A5 (mock-only API) | `completeRoute.ts:6` (`force-static`) | `createCompleteRoute()` validates via `GameCompletionInputSchema`, calls `calculateGameXP`, returns `{ xpEarned, activityId, duplicate: false, status: 200 }`. The route does NOT call a real DB (standalone mock — Decision 3.7). |

### Gate commands (Phase 3)

- **RED_TEST_COMMAND:** `pnpm --filter @reading-advantage/domain test -- games`
  (bounded vitest; Mid-Red may also run
  `pnpm --filter vocabulary-games test --testPathPatterns=completeRoute` to prove
  the rewritten jest test fails for the intended reason).
- **GREEN_TEST_COMMAND:** `pnpm --filter @reading-advantage/domain test -- games`
  (vitest green). Jr-Green also runs
  `pnpm --filter vocabulary-games test --testPathPatterns=completeRoute` (jest green).
- **PROJECT_LINT:** `pnpm --filter @reading-advantage/domain lint && pnpm --filter vocabulary-games lint`
- **PROJECT_CHECKS:** `pnpm --filter @reading-advantage/domain check-types && pnpm --filter vocabulary-games check-types`

### Phase 3 Red → Green → Closeout

Phase 3 is decomposed into five test groups (3A..3E). All groups share the Green gate
`pnpm --filter @reading-advantage/domain test -- games` (vitest, the new `games.test.ts`)
plus `pnpm --filter vocabulary-games test --testPathPatterns=completeRoute` (jest,
rewritten `completeRoute.test.ts`) and the closeout gate below.

**Target files (new / rewritten):**
- `packages/domain/src/games/schema.ts` (new) — `gameCompletionInputSchema`,
  `gameCompletionResultSchema`, `gameTypeEnum`, `gameDifficultyEnum`.
- `packages/domain/src/games/xp.ts` (new) — `calculateGameXP`.
- `packages/domain/src/games/mutations.ts` (new) — `recordGameCompletion`.
- `packages/domain/src/games/permissions.ts` (new) — `games:complete`, `games:read:own`.
- `packages/domain/src/games/errors.ts` (new) — `DuplicateCompletionError`,
  `InvalidGameCompletionError`.
- `packages/domain/src/games/index.ts` (new) — barrel.
- `packages/domain/src/__tests__/games.test.ts` (new) — groups 3A, 3B, 3C.
- `apps/advantage-games/src/lib/games/api/completeRoute.ts` (rewritten) — delegate to
  schema + `calculateGameXP`.
- `apps/advantage-games/src/lib/games/api/types.ts` (rewritten) — replace
  `CompleteRequest`/`CompleteResponse` with re-exports from
  `@reading-advantage/domain/games` (or inline Zod types).
- `apps/advantage-games/src/lib/games/api/completeRoute.test.ts` (rewritten) — group 3E.
- `apps/advantage-games/src/components/games/sentence/haunted-library/HauntedLibraryGame.tsx`
  (modified) — rebuild `onComplete` payload.
- `apps/advantage-games/src/components/games/sentence/haunted-library/HauntedLibraryGame.test.tsx`
  (extended) — group 3D.

**Red command (bounded):** `pnpm --filter @reading-advantage/domain test -- games`

**Red assertions (one block per group, all asserting against HEAD `8900196e` source):**

1. **3A shared Zod contract** — `GameCompletionInputSchema.parse({ ...valid payload })`
   succeeds; `.parse({ ...valid, xp: 100 })` throws (unknown key); `.parse({ ...valid,
   accuracy: 75 })` throws (`accuracy > 1`); `.parse({ ...valid, gameType: "fake-game" })`
   throws (invalid enum); `.parse({ ...valid, idempotencyKey: "not-a-uuid" })` throws;
   `.parse({ ...valid, dragonCount: 5 })` throws (unknown key — D-01 dead field).
   **Positive control:** a fully-valid payload parses to a `GameCompletionInput` with
   no `xp` field. **A4 defense:** the test asserts `!("xp" in parsed)` so a schema that
   accidentally includes `xp` fails.
2. **3B server-side XP formula** — `calculateGameXP({ correctAnswers: 10,
   totalAttempts: 10, accuracy: 1, victory: true, duration: 30_000, ... })` returns
   `Math.min(10, 10 + 2 + 1 + 1) = 10` (capped). `calculateGameXP({ correctAnswers: 5,
   totalAttempts: 10, accuracy: 0.5, victory: false, duration: 90_000, ... })` returns
   `Math.min(10, 5 + 0 + 0 + 0) = 5`. `calculateGameXP({ correctAnswers: 0,
   totalAttempts: 0, ... })` returns `0`. **A3 defense:** each assertion has a labeled
   comment `// XP earned: N = min(10, base + bonus)`. The test also asserts the input
   type has no `xp` field (compile-time `keyof GameCompletionInput` excludes `"xp"`).
3. **3C fire-once guard** — mock `TenantDB` with `select: vi.fn()` returning `[]` on
   first call and `[{ activityId }]` on second call. First `recordGameCompletion` call:
   `db.insert` called once, returns `{ duplicate: false, xpEarned: <calculated>,
   activityId: "game:haunted-library:<uuid>" }`. Second call (same `idempotencyKey`):
   `db.insert` **not** called, returns `{ duplicate: true, xpEarned: 0, activityId:
   "game:haunted-library:<uuid>" }`. **A4 defense:** the test asserts `db.insert`
   call count is exactly 1 across both calls (not 0, not 2). The `activityId` is
   identical across both calls (stable, not `Date.now()`).
4. **3D representative game migration** — render `HauntedLibraryGame` with mock
   sentences, simulate game-over, capture `onComplete` payload. Assert payload has
   `gameType === "haunted-library"`, `idempotencyKey` is a UUID, `duration` is a
   non-negative integer, `victory` is a boolean, and **no `xp` key** is present.
   Assert `idempotencyKey` is stable across re-renders (generated once per session,
   not per `onComplete` call). **A4 defense:** the test asserts `onComplete` was
   called exactly once for a single game-over (not zero, not twice — defends against
   B30-002 boss-tick duplicate at the component level).
5. **3E route handler delegation** — `createCompleteRoute().POST(validRequest)` returns
   200 with `{ xpEarned: <calculated>, activityId, duplicate: false, status: 200 }`.
   `POST({ ...valid, xp: 100 })` returns 400 (schema rejection). `POST({ ...valid,
   accuracy: 75 })` returns 400. The route does **not** call `db.insert` (standalone
   mock — Decision 3.7). **A4 defense:** the test asserts a valid payload returns 200
   (positive control) and `db.insert` is not called (mock honesty).

**Positive controls (A4 defense — non-vacuity):** every group includes a positive
control. 3A: valid payload parses. 3B: known-input → known-XP. 3C: first call inserts.
3D: `onComplete` fires once with valid shape. 3E: valid POST returns 200. A group that
passes only because the schema rejects everything or the function no-ops fails its
positive control.

### Phase 3 Green gate

- `pnpm --filter @reading-advantage/domain test -- games` exits **0** (vitest, the new
  `games.test.ts` passes; no regression in the existing `packages/domain` suite — run
  the whole filter at acceptance: `pnpm --filter @reading-advantage/domain test`).
- `pnpm --filter vocabulary-games test --testPathPatterns=completeRoute` exits **0**
  (jest, rewritten `completeRoute.test.ts` passes).
- `pnpm --filter @reading-advantage/domain lint` exits 0.
- `pnpm --filter vocabulary-games lint` exits 0.
- `pnpm --filter @reading-advantage/domain check-types` exits 0.
- `pnpm --filter vocabulary-games check-types` exits 0.

### Phase 3 closeout gate

- All Green-gate commands green.
- Every gap in the table above (3A..3E) has at least one **red-at-baseline /
  green-after-fix** test with a positive control.
- `phase-3-decisions.md` exists and its Tier 1 decisions are reflected in the
  implemented schema/formula/function. Tier 2 items (`[b] deferred:po` / `[b]
  deferred:infra`) remain deferred in `plan.md` Phase 4 / Phase 5 — Phase 3 did not
  invent the `activity_type` pgEnum extension, the `gameCompletions` table, or the
  remaining 25 games' migration.
- The `recordActivity` function in `packages/domain/src/progress/mutations.ts` is
  **untouched** (D-06 host-mutation hardening is Phase 4 — Phase 3 did not scope-creep).
- `measure/tracks.md` does NOT claim D-01/D-02/D-05 / CA-013 / MR-H05 is "resolved" —
  the findings stay "open" until Phase 5 pilot import green (A6 defense).
- The existing `packages/domain` suite (374 tests at baseline) has no regressions.
- The existing `vocabulary-games` suite has no regressions in tests other than the
  rewritten `completeRoute.test.ts` (which intentionally changes its assertions).

### Phase 3 fixtures, mocks, and live-behavior proof

- **Mock DB (vitest, `games.test.ts`):** follow the established
  `packages/domain/src/__tests__/mock-db.ts` pattern (Wave 0 reusable harness). Mock
  `TenantDB` with `select: vi.fn().mockReturnValue({ from: ... })` and
  `insert: vi.fn().mockReturnValue({ values: ... })`. Mock `db.unscoped()` to return
  the same mock (the function calls `db.unscoped("xpLogs is REFERENTIAL...")`).
  Use these to assert side-effect **absence** on the duplicate path
  (`expect(db.insert).not.toHaveBeenCalled()`).
- **Auth/permission mock:** mock `assertCan` from `@reading-advantage/auth` to
  throw `AuthError` for unauthorized users; the test asserts `recordGameCompletion`
  throws before any DB call. Real `assertCan` is unit-tested elsewhere; Phase 3 tests
  the *contract*, not the auth primitive.
- **`xpLogs` schema mock:** `vi.mock("@reading-advantage/db/schema", () => ({
  xpLogs: { userId: "userId", xpEarned: "xpEarned", activityId: "activityId",
  activityType: "activityType" },
}))` — matches the pattern in `progress.test.ts:6-15`.
- **No live DB, no PGlite, no real Postgres** in Phase 3. The contract is proven at
  the unit level with mock DB. Phase 4 may add a PGlite live-DB proof for the
  tenant-safe persistence (mirroring the marketing `phase-8-projects-live.test.ts`
  pattern); Phase 3 does not require it.
- **HauntedLibraryGame test (jest):** use the existing
  `HauntedLibraryGame.test.tsx` pattern — `render(<HauntedLibraryGame sentences={mockSentences} onComplete={jest.fn()} />)`.
  Extend with a test that simulates game-over (mock `tickLibrary` to return
  `phase: "victory"`) and captures the `onComplete` payload.
- **Route handler test (jest):** use the existing `MockRequest` pattern in
  `completeRoute.test.ts:5-15`. Rewrite the assertions: the test no longer asserts
  `xp: 100` is echoed; it asserts `xp` is rejected and `xpEarned` is server-computed.

### Phase 3 architecture guardrails and changed-contract risks

- **Do not modify `recordActivity` or `updateLessonProgress`** in
  `packages/domain/src/progress/mutations.ts`. Those are D-06 host-mutation hardening,
  owned by Phase 4. Phase 3 creates the *new* `recordGameCompletion` function only.
  A test should assert `recordActivity` source is unchanged (grep for the function
  signature in `mutations.ts` and assert it matches the baseline).
- **Do not add a `gameCompletions` table or migrate `xpLogs`/`gameRankings`** in
  Phase 3. Schema migrations are Phase 4. Phase 3 uses the existing `xpLogs` table
  (REFERENTIAL, no `schoolId`) with `activityId = game:<gameType>:<idempotencyKey>`.
- **Do not add `schoolId` to anything in Phase 3.** Tenant-safe classification is
  Phase 4.
- **Do not extend the `activity_type` pgEnum** in Phase 3. Use the literal string
  `"GAME_COMPLETION"` (the `xpLogs.activityType` column is `text`, not the pgEnum).
  Phase 4 may migrate.
- **Do not migrate any game other than `haunted-library`** in Phase 3. The remaining
  25 games are Phase 5+ work, gated by per-game readiness.
- **Do not remove the client-side `apps/advantage-games/src/lib/xp.ts`** — it remains
  as a preview for unmigrated games. The server-side `calculateGameXP` is the source
  of truth; the client-side `calculateXP` is a display preview only.
- **Changed-contract risk:** the rewritten `completeRoute.test.ts` intentionally
  changes its assertions (from "echoes `xp`" to "rejects `xp`"). This is a true
  Red → Green, not a regression. The acceptance role must verify the rewritten test
  fails at the Red commit (before the route handler is rewritten) and passes at the
  Green commit (after the route handler delegates to the schema).
- **Changed-contract risk:** `HauntedLibraryGame.tsx#onComplete` callback signature
  changes (callers must update). The page that renders `HauntedLibraryGame` must be
  updated to POST the new payload shape. Jr-Green must update
  `apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/haunted-library/page.tsx`
  (or wherever `onComplete` is wired) to match.

### Phase 3 intentionally-red aggregate-suite handling

The monorepo aggregate suite (`pnpm turbo run test`) is **red at baseline** from
pre-existing, owner-labeled failures outside Wave 3 (see `measure/tracks.md:112-115`:
"aggregate reds are pre-existing/owner-labeled"). Phase 3 does **not** attempt to green
the aggregate suite. The Phase 3 gate is **scoped to the two filters**
(`pnpm --filter @reading-advantage/domain test -- games` and
`pnpm --filter vocabulary-games test --testPathPatterns=completeRoute`), which must
be fully green. Any non-domain / non-vocabulary-games aggregate red observed during
this phase is pre-existing and must be labeled as such in the phase result
`known_failures` — never silently absorbed into a "green" claim (A5/A6).

### Phase 3 artifact vs live-behavior distinction

- **Live-behavior tests (load-bearing):** `games.test.ts` (vitest) calls the real
  `GameCompletionInputSchema.parse`, the real `calculateGameXP`, and the real
  `recordGameCompletion` with a mock `TenantDB`. These prove the contract logic.
  `completeRoute.test.ts` (jest) calls the real route handler `POST` function with a
  mock `Request`. `HauntedLibraryGame.test.tsx` (jest) renders the real component.
- **Artifact/documentation tests:** `phase-3-decisions.md` is a frozen artifact, not a
  live-behavior test. Its truthfulness is guarded by the Phase 0 artifact pattern
  (re-verify cited literals exist at HEAD). Phase 3 does not add new artifact tests —
  the decisions doc is the strategy's falsifiability anchor, not a test target.
- **No PGlite / live-DB test in Phase 3.** The contract is proven at the unit level.
  Phase 4 may add a PGlite live-DB proof for tenant-safe persistence; Phase 3 does
  not require it (the standalone games app has no DB, and the host-app import is Phase 5+).

---

## 0.D. Phase 4 — Tenant-Safe Persistence and Leaderboards (live-behavior tests)

Phase 4 is the live-behavior phase that delivers the tenant-safe persistence layer
frozen in `phase-4-decisions.md`. It spans **three test surfaces**: a vitest
mock-DB suite (`packages/domain/src/__tests__/games.test.ts`, extended from Phase 3),
a vitest **PGlite live-DB** suite (`packages/domain/src/__tests__/games-live.test.ts`,
new — mirrors the marketing `phase-8-projects-live.test.ts` pattern), and a jest
suite (`apps/advantage-games/src/lib/games/api/rankingRoute.test.ts`, rewritten).
The PGlite live-DB suite is the load-bearing proof for the tenant-isolation and
race-safety claims — those properties cannot be proven with a mock DB (Phase 3
explicitly deferred them for exactly this reason).

### What Phase 4 must defend against (anti-patterns)

| Anti-pattern | Where it applies in Phase 4 | Defense |
|---|---|---|
| **A4** Vacuous-pass on nothing-done | Every PGlite live-DB test (4A/4B/4C/4E); every mock-DB test (4F) | **Positive + negative control pairing**: every tenant-isolation test pairs a school-A-row-visible-to-school-A assertion (positive) with a school-A-row-invisible-to-school-B assertion (negative). A query that returns empty for everyone fails the positive control. Every race-safety test asserts exactly one insert succeeds (not zero, not two). Every Zod-rejection test pairs an invalid input (rejected) with a valid input (accepted). |
| **A5** False-claim text vs test reality | `plan.md` Phase 4 task text | Do not write "tenant-safe persistence" / "race-safe fire-once" / "leaderboard secured" / "D-04 closed" in `plan.md` unless `pnpm --filter @reading-advantage/domain test -- games-live` exits 0. The cited command is the source of truth. |
| **A6** Registry-note overstatement | `measure/tracks.md` Wave 3 row; `product-risk-register.md` | Do **not** claim D-04/D-06 or CA-013 / MR-H05 is "resolved" until Phase 4 acceptance passes AND Phase 5 pilot import is green. The findings stay "open" in `product-risk-register.md` until Phase 5. |
| **A3** Digit-only as labeled count | Leaderboard rank/count assertions (4A/4E); insert-call-count assertions (4B); XP-total assertions (4A) | Use labeled-integer assertions: `expect(rows.length).toBe(1)` with a comment `// Leaderboard row count: 1 (school-A, game-scoped)`; never `expect(rows).toBeTruthy()` or `rg -q '[0-9]+'`. Emit `"Insert call count: N"` / `"School-A XP total: N"` and parse the integer where a count is asserted via a log. |
| **A7** Over-broad filter swallowing hits | Tenant-leak scans (4A/4E) | Match **exact `schoolId` literals** (`"school-A"`, `"school-B"`), not bare words like "school"/"user"/"student" (which appear legitimately in joins and column names). When scanning a leaderboard response body for a leaked name, match the exact seeded name literal (e.g. `student-school-A`), not bare "student". |
| **A9** Pre-existing test references archived track paths | New `games-live.test.ts`, rewritten `rankingRoute.test.ts`, extended `games.test.ts` | Tests reference `packages/domain/src/games/`, `packages/db/src/schema/analytics.ts`, and `apps/advantage-games/src/` only — never a `measure/tracks/<id>/` path. Provenance comments may cite `phase-4-decisions.md` but no runtime dependency on a track path. If the track later archives, tests must not break. |
| **A2** Consent-blind publish gate | N/A — no publish flow in Phase 4. | Consciously not applicable. |
| **A10** Generated-facts drift | PGlite live-DB tests run the real drizzle schema | Consciously not applicable — Phase 4 does NOT regenerate `measure/generated/`. The PGlite harness imports the real schema from `@reading-advantage/db`, so a schema-definition bug fails the live-DB test, not just the type check. |
| **A11** Executed review track left fully blocked | N/A — Phase 4 is an implementation phase. | Consciously not applicable. |
| **A1, A8, A12, A13** | Orchestrator-internal, plan-marker, catalog, or closeout classes. | Consciously not applicable to Phase 4 product tests. |

### Confirmed gaps to defend against (evidence-mapped, frozen in `phase-4-decisions.md`)

| Group | Gap IDs | Evidence | Phase 4 Red asserts |
|-------|---------|----------|---------------------|
| 4A — Tenant isolation of `gameCompletions` | D-04, B46-021, B46-025 | `findings.md` §A3, §D D-04 | PGlite live-DB: insert a `gameCompletions` row for `school-A` user via `recordGameCompletion`; call `getSchoolLeaderboard` with a `school-B` tenant; assert the school-A row is **not** in the result. **Positive control:** call `getSchoolLeaderboard` with the `school-A` tenant; assert the row **is** in the result. **A4:** a query returning empty for both tenants fails the positive control. |
| 4B — Race-safe fire-once (closes Phase 3 Decision 3.4 Tier 2) | B28-017, B30-002, B23-008, B24-008 | `findings.md` §A1, §A5; `phase-3-decisions.md` Decision 3.4 | PGlite live-DB: two concurrent `recordGameCompletion` calls with the same `idempotencyKey` (Promise.all); assert exactly one returns `duplicate: false` with `xpEarned > 0` and exactly one returns `duplicate: true` with `xpEarned: 0`; assert `COUNT(gameCompletions WHERE activityId = ...)` is exactly 1. **A4:** assert the insert count is exactly 1 (not 0, not 2). **A3:** labeled `// Insert call count: 1`. |
| 4C — `leaderboards.schoolId` notNull (B46-027 closure) | B46-027 | `findings.md` §A3; `primary.ts:229` (nullable) | PGlite live-DB / schema test: after migration, `leaderboards.schoolId` is `notNull`; an INSERT without `schoolId` is rejected by the DB (NOT NULL constraint violation) AND by TenantDB's FLAT insert guard (M-SF-2). **Positive control:** an INSERT with `schoolId` succeeds. **A4:** a schema that allows null fails the rejection assertion. |
| 4D — `gameRankings` deprecation honesty | D-04 (deprecation), A4 (non-vacuity) | `tenant-registry.ts:199`; `analytics.ts:22` | Static/behavioral test: `getSchoolLeaderboard` reads from `gameCompletions`, NOT `gameRankings`. Assert the query's `.from()` target is `gameCompletions` (via a spy on the mock DB or via inspecting the generated SQL in PGlite). **A4 defense:** assert `gameCompletions` is read (positive control) AND `gameRankings` is NOT read (negative control) — a query that reads neither fails the positive control. |
| 4E — `getSchoolLeaderboard` server-backed query | D-04, B22-007, B23-004, B24-021 | `findings.md` §A3; `rankingRoute.ts` (force-static mock) | PGlite live-DB: seed `gameCompletions` rows for 3 users in `school-A` and 2 users in `school-B` (same `gameType`, same `difficulty`); call `getSchoolLeaderboard({ tenant: school-A, gameType, difficulty })`; assert exactly 3 rows returned, all with `schoolId === school-A` (auto-scoped by TenantDB). **A4:** assert `rows.length === 3` (positive control — not empty). **A7:** match exact `schoolId` literal `"school-A"`. **A3:** labeled `// Leaderboard row count: 3 (school-A, game-scoped)`. Also: a rewritten jest `rankingRoute.test.ts` asserts the standalone route validates its mock response via `leaderboardResponseSchema` and uses the canonical `medium` difficulty key (B21-018 closure — `normal` removed). |
| 4F — Host-mutation Zod (D-06 Tier 1) | D-06, B46-031, B46-032, B46-033 | `findings.md` §D D-06; `progress/mutations.ts` (unvalidated) | Mock-DB vitest: `recordActivity({ activityType: "", xpEarned: 999, metadata: "x".repeat(5000) })` throws (Zod: empty `activityType`, `xpEarned > 100`, `metadata` too long); `recordActivity({ activityType: "LESSON_COMPLETE", xpEarned: 5 })` succeeds. `updateLessonProgress({ lessonId: "not-a-uuid", status: "fake", progress: 150 })` throws; `updateLessonProgress({ lessonId: uuid, status: "completed", progress: 100 })` succeeds. `.strict()` rejects unknown keys. **A4:** every rejection pairs with an acceptance. **Tier 2 deferred:** the `lessonId` tenant-ownership check is NOT tested in Phase 4 — it is `[b] deferred:infra` (Decision 4.4). A conscious non-test comment in `games.test.ts` records this deferral so it is not silently skipped. |

### Gate commands (Phase 4)

- **RED_TEST_COMMAND:** `pnpm --filter @reading-advantage/domain test -- games-live`
  (vitest, bounded to the new PGlite live-DB file). Mid-Red may also run the bounded
  jest Red: `pnpm --filter vocabulary-games test --testPathPatterns=rankingRoute` to
  prove the rewritten `rankingRoute.test.ts` fails for the intended reason (shared
  `LeaderboardResponseSchema` rejection of the legacy `normal` key / empty-rankings
  shape).
- **GREEN_TEST_COMMAND:** `pnpm --filter @reading-advantage/domain test -- games`
  AND `pnpm --filter @reading-advantage/domain test -- games-live` (vitest, both the
  Phase 3 contract tests AND the new PGlite live-DB tests pass). Jr-Green also runs
  `pnpm --filter vocabulary-games test --testPathPatterns=rankingRoute` (jest green).
- **PROJECT_LINT:** `pnpm --filter @reading-advantage/domain lint && pnpm --filter vocabulary-games lint`
- **PROJECT_CHECKS:** `pnpm --filter @reading-advantage/domain check-types && pnpm --filter vocabulary-games check-types && pnpm --filter @reading-advantage/db check-types`
  (the new `gameCompletions` table is in `packages/db`).
- **TENANT_COVERAGE_GATE:** `pnpm --filter @reading-advantage/domain test -- tenant-coverage`
  must remain green — the new `gameCompletions` table MUST be registered in
  `tenant-registry.ts` (FR-6 build-failure guard). The `leaderboards.schoolId`
  notNull migration must not break the FLAT classification.

### Phase 4 Red → Green → Closeout

Phase 4 is decomposed into six test groups (4A..4F). All groups share the Green gate
`pnpm --filter @reading-advantage/domain test -- games-live` (vitest, the new
`games-live.test.ts`) plus `pnpm --filter @reading-advantage/domain test -- games`
(Phase 3 contract tests still pass — no regression) plus
`pnpm --filter vocabulary-games test --testPathPatterns=rankingRoute` (jest,
rewritten `rankingRoute.test.ts`) plus the tenant-coverage gate, and the closeout
gate below.

**Target files (new / rewritten / extended):**

- `packages/db/src/schema/analytics.ts` (extended) — new `gameCompletions` table.
- `packages/db/drizzle/0026_game_completions.sql` (new migration) — `game_completions`
  table + `xp_logs_user_activity_unique` constraint +
  `leaderboards.school_id NOT NULL` migration + `game_completions_school_game_difficulty_idx`.
- `packages/domain/src/tenant-registry.ts` (extended) — register `gameCompletions`
  as FLAT; deprecation comment on `gameRankings`.
- `packages/domain/src/games/schema.ts` (extended) — `leaderboardEntrySchema`,
  `leaderboardResponseSchema`.
- `packages/domain/src/games/queries.ts` (extended) — `getSchoolLeaderboard`;
  `getGameCompletions` migrated to read from `gameCompletions` (FLAT) instead of
  `xpLogs` (REFERENTIAL).
- `packages/domain/src/games/mutations.ts` (modified) — `recordGameCompletion`
  dual-writes to `gameCompletions` + `xpLogs` in a transaction; catches
  unique-violation as the duplicate signal.
- `packages/domain/src/progress/schema.ts` (extended) —
  `recordActivityInputSchema`, `updateLessonProgressInputSchema`.
- `packages/domain/src/progress/mutations.ts` (modified) — both functions
  `.parse(input)` at entry.
- `packages/domain/src/__tests__/helpers/testDb.ts` (new) — PGlite live-DB harness
  mirroring `apps/marketing/app/__tests__/helpers/testDb.ts`.
- `packages/domain/src/__tests__/games-live.test.ts` (new) — groups 4A, 4B, 4C, 4E
  (PGlite live-DB).
- `packages/domain/src/__tests__/games.test.ts` (extended) — group 4F (mock-DB Zod
  rejection) + group 4D (static `getSchoolLeaderboard` source-table assertion).
- `apps/advantage-games/src/lib/games/api/rankingRoute.ts` (rewritten) — validates
  mock response via `leaderboardResponseSchema`; canonical `medium` key.
- `apps/advantage-games/src/lib/games/api/rankingRoute.test.ts` (rewritten) —
  group 4E jest assertions.
- `apps/advantage-games/src/components/games/game/RankingDialog.tsx` (modified) —
  difficulty tabs `["easy", "medium", "hard", "extreme"]` (B21-018 closure).

**Red command (bounded):** `pnpm --filter @reading-advantage/domain test -- games-live`

**Red assertions (one block per group, all asserting against HEAD `78f17dc3` source):**

1. **4A tenant isolation** — `games-live.test.ts`: PGlite live-DB. Create two
   schools (`school-A`, `school-B`), two users (`user-A` in `school-A`, `user-B` in
   `school-B`). Call `recordGameCompletion({ tenant: school-A, user: user-A, input:
   { gameType: "haunted-library", ... } })`. Then call `getSchoolLeaderboard({
   tenant: school-B, user: user-B, input: { gameType: "haunted-library" } })`.
   Assert the result has `length === 0` (school-B cannot see school-A's completion).
   **Positive control:** call `getSchoolLeaderboard({ tenant: school-A, ... })`;
   assert `length === 1` and `rows[0].userId === "user-A"`. **A4:** a query
   returning empty for both fails the positive control. **A7:** match exact
   `schoolId` literals.
2. **4B race-safe fire-once** — `games-live.test.ts`: PGlite live-DB. Call
   `Promise.all([ recordGameCompletion({ ... idempotencyKey: K }), recordGameCompletion({ ...
   idempotencyKey: K }) ])` with the same `idempotencyKey` `K`. Assert exactly one
   result has `duplicate === false` and `xpEarned > 0`; exactly one has `duplicate
   === true` and `xpEarned === 0`. Then `SELECT COUNT(*) FROM game_completions WHERE
   activity_id = 'game:haunted-library:' || K` → assert `count === 1`. **A4:**
   assert count is exactly 1 (not 0, not 2). **A3:** labeled `// Insert call count:
   1`. **Note:** PGlite is single-threaded; true concurrency is simulated by issuing
   both calls without awaiting the first. The unique constraint is the race-safety
   guarantee being tested — if the constraint is missing, both inserts succeed and
   the count is 2 (test fails).
3. **4C leaderboards.schoolId notNull** — `games-live.test.ts` (or a schema test):
   after migration, attempt `db.insert(leaderboards).values({ details: {...} })`
   (no `schoolId`); assert the DB rejects with a NOT NULL constraint violation.
   **Positive control:** `db.insert(leaderboards).values({ schoolId: school-A,
   details: {...} })` succeeds. **A4:** a schema that allows null fails the
   rejection assertion. Also assert TenantDB's FLAT insert guard rejects the insert
   before it reaches the DB (M-SF-2 fail-closed) when `tenant.schoolId` is null.
4. **4D gameRankings deprecation** — `games.test.ts` (mock-DB): spy on the mock
   `TenantDB` select; call `getSchoolLeaderboard`; assert the `from()` target is
   `gameCompletions` (not `gameRankings`). **A4 positive control:** assert
   `gameCompletions` is read; **A4 negative control:** assert `gameRankings` is NOT
   read. A query that reads neither fails the positive control.
5. **4E getSchoolLeaderboard** — `games-live.test.ts`: PGlite live-DB. Seed 3
   `gameCompletions` rows for `school-A` users (same `gameType`, same `difficulty`)
   and 2 rows for `school-B` users. Call `getSchoolLeaderboard({ tenant: school-A,
   gameType, difficulty })`. Assert `rows.length === 3` and every row's effective
   `schoolId === "school-A"` (auto-scoped — the query does not include `schoolId` in
   its WHERE; TenantDB injects it). **A4:** `rows.length === 3` (not empty).
   **A3:** labeled `// Leaderboard row count: 3 (school-A, game-scoped)`. **A7:**
   match exact `schoolId` literal. Also: rewritten `rankingRoute.test.ts` (jest)
   asserts the standalone route returns a `leaderboardResponseSchema`-valid response
   with the canonical `medium` difficulty key (no `normal`).
6. **4F host-mutation Zod** — `games.test.ts` (mock-DB): `recordActivity` with
   `{ activityType: "", xpEarned: 999, metadata: "x".repeat(5000) }` throws (Zod);
   `recordActivity` with `{ activityType: "LESSON_COMPLETE", xpEarned: 5 }`
   succeeds (positive control). `updateLessonProgress` with `{ lessonId:
   "not-a-uuid", status: "fake", progress: 150 }` throws; with `{ lessonId: uuid,
   status: "completed", progress: 100 }` succeeds. `.strict()` rejects `{ ...
   valid, extraKey: 1 }`. **A4:** every rejection pairs with an acceptance.
   **Tier 2 conscious non-test:** a comment in `games.test.ts` records that the
   `lessonId` tenant-ownership check is `[b] deferred:infra` (Decision 4.4) and is
   NOT tested here — it is not silently skipped.

**Positive controls (A4 defense — non-vacuity):** every group includes a positive
control. 4A: school-A row visible to school-A. 4B: exactly one insert succeeds. 4C:
insert with `schoolId` succeeds. 4D: `gameCompletions` is read. 4E: leaderboard
returns 3 rows. 4F: valid input accepted. A group that passes only because the
query returns empty for everyone or the schema rejects everything fails its
positive control.

### Phase 4 Green gate

- `pnpm --filter @reading-advantage/domain test -- games-live` exits **0** (vitest,
  the new `games-live.test.ts` passes — the load-bearing tenant-isolation and
  race-safety proofs).
- `pnpm --filter @reading-advantage/domain test -- games` exits **0** (Phase 3
  contract tests still pass — no regression; group 4D and 4F added).
- `pnpm --filter @reading-advantage/domain test -- tenant-coverage` exits **0**
  (the new `gameCompletions` table is registered FLAT; `leaderboards` FLAT
  classification preserved).
- `pnpm --filter vocabulary-games test --testPathPatterns=rankingRoute` exits **0**
  (jest, rewritten `rankingRoute.test.ts` passes).
- `pnpm --filter @reading-advantage/domain lint` exits 0.
- `pnpm --filter vocabulary-games lint` exits 0.
- `pnpm --filter @reading-advantage/domain check-types` exits 0.
- `pnpm --filter vocabulary-games check-types` exits 0.
- `pnpm --filter @reading-advantage/db check-types` exits 0 (the new
  `gameCompletions` table type-checks).

### Phase 4 closeout gate

- All Green-gate commands green.
- Every gap in the table above (4A..4F) has at least one **red-at-baseline /
  green-after-fix** test with a positive control.
- `phase-4-decisions.md` exists and its Tier 1 decisions are reflected in the
  implemented schema/migration/queries. Tier 2 items (`[b] deferred:infra`) remain
  deferred in `plan.md` Phase 6 — Phase 4 did not invent the `lessonId`
  tenant-ownership check, the `gameRankings` drop, the `xpLogs` schoolId column,
  or the host-app import wiring.
- The Phase 3 `recordGameCompletion` fire-once logic is upgraded to be race-safe
  (unique constraint + catch) — the Phase 3 Tier 2 item is closed.
- `getStudentProgress#xpTotal` continues to aggregate game XP correctly (dual-write
  to `xpLogs` preserves the read path) — a regression test asserts `xpTotal`
  includes game XP after a `recordGameCompletion` call.
- `measure/tracks.md` does NOT claim D-04/D-06 / CA-013 / MR-H05 is "resolved" —
  the findings stay "open" until Phase 5 pilot import green (A6 defense).
- The existing `packages/domain` suite (374+ tests at Phase 3 baseline) has no
  regressions. The existing `vocabulary-games` suite has no regressions in tests
  other than the rewritten `rankingRoute.test.ts` (which intentionally changes its
  assertions).

### Phase 4 fixtures, mocks, and live-behavior proof

- **PGlite live-DB harness (the load-bearing proof):** new
  `packages/domain/src/__tests__/helpers/testDb.ts` mirrors the marketing
  `apps/marketing/app/__tests__/helpers/testDb.ts` pattern. It creates an in-process
  PGlite Postgres, runs the real drizzle migrations (including the new
  `0026_game_completions.sql`), and returns `{ db, tenantDb, teardown }`. The
  harness is a devDependency; imported only from test helpers (header comment
  matches the marketing `testDb.ts` convention). This is the **honest tier** for
  tenant-isolation and race-safety claims — a mock DB cannot prove the unique
  constraint or the TenantDB auto-scope proxy behavior.
- **Mock DB (vitest, `games.test.ts` extended):** follow the established
  `packages/domain/src/__tests__/mock-db.ts` pattern (Wave 0 reusable harness) for
  group 4D (source-table assertion via spy) and group 4F (Zod rejection — no DB
  side effect needed). Mock `TenantDB` with `select: vi.fn()` returning a chainable
  builder; assert `from()` was called with `gameCompletions` (4D) and `insert` was
  NOT called when Zod throws (4F).
- **Auth/permission mock:** mock `assertCan` from `@reading-advantage/auth` to
  throw `AuthError` for unauthorized users; the test asserts `getSchoolLeaderboard`
  and `recordGameCompletion` throw before any DB call. Real `assertCan` is
  unit-tested elsewhere; Phase 4 tests the *contract*, not the auth primitive.
- **`gameCompletions` schema mock:** `vi.mock("@reading-advantage/db/schema", ...)`
  extended to include `gameCompletions: { schoolId: "school_id", userId: "user_id",
  gameType: "game_type", ... }` — matches the pattern in `games.test.ts:22-29`.
- **PGlite school/user fixtures:** the live-DB test seeds two `schools` rows
  (`school-A`, `school-B`), two `users` rows (`user-A` with `schoolId: school-A`,
  `user-B` with `schoolId: school-B`). Each test creates a `TenantDB` bound to the
  relevant tenant. The fixtures are deterministic (hardcoded UUIDs) so the
  tenant-leak assertion matches exact literals (A7).
- **No real Postgres, no Docker.** PGlite is in-process and requires no external
  service. The Phase 4 gate runs in CI without a database container (matching the
  marketing `phase-8-projects-live.test.ts` CI profile).
- **`rankingRoute.test.ts` (jest):** use the existing `MockRequest` pattern. The
  rewritten test asserts the route returns a `leaderboardResponseSchema`-valid
  response (mock data, not a real DB call — the standalone app has no DB per Phase 3
  Decision 3.7) and that the difficulty keys are `["easy", "medium", "hard",
  "extreme"]` (no `normal`).

### Phase 4 architecture guardrails and changed-contract risks

- **Do not add `schoolId` to `xpLogs`.** `xpLogs` remains REFERENTIAL (Decision 4.2
  §3). The dual-write to `gameCompletions` (FLAT) + `xpLogs` (REFERENTIAL) delivers
  tenant-safety at the leaderboard layer without disturbing the `xpLogs` read path.
  A test should assert `xpLogs` source is unchanged in classification (grep
  `tenant-registry.ts` for `register(xpLogs, "REFERENTIAL")`).
- **Do not drop `gameRankings`.** Destructive migration, out of scope (Decision 4.7
  §4). `gameRankings` is deprecated (no new writes); a code comment marks it. A
  future cleanup track may drop it. A test should assert `gameRankings` is still
  registered (REFERENTIAL) — the tenant-coverage gate enforces this.
- **Do not migrate `lessons` to add `schoolId`.** `lessons` is global content
  (Decision 4.7 §6). The `lessonId` tenant-ownership check is Tier 2
  `[b] deferred:infra` (Decision 4.4) — Phase 4 does not add it.
- **Do not wire the host-app import.** Phase 5 owns the host route handler that
  calls `getSchoolLeaderboard` and the `RankingDialog` migration to the host route.
  Phase 4 delivers the domain query + shared schema; the standalone route remains
  mock but validates via the real schema (matching Phase 3 Decision 3.7's honest
  standalone/host split).
- **Do not migrate any game other than `haunted-library`** (already migrated in
  Phase 3). The remaining 25 games are Phase 5+ work, gated by per-game readiness.
- **Changed-contract risk:** `getGameCompletions` (Phase 3 per-user read) is
  migrated from `xpLogs` (REFERENTIAL, `unscoped()`) to `gameCompletions` (FLAT,
  auto-scoped). This is a behavior change: a school-B tenant context can no longer
  read a school-A user's game completions (previously possible because the query
  used `unscoped()` and filtered by `userId` only). This is the intended
  tenant-safety fix (D-04). The Phase 3 `games.test.ts` 3C fire-once test must be
  updated to mock `gameCompletions` instead of `xpLogs` for the dedup SELECT — this
  is a true Red → Green contract change, not a regression.
- **Changed-contract risk:** `recordGameCompletion` now dual-writes in a
  transaction. The Phase 3 mock-DB test (3C) asserted `db.insert` was called once
  on `xpLogs`; the Phase 4 test must assert `db.insert` is called once on
  `gameCompletions` AND once on `xpLogs` (two inserts, one transaction). The
  duplicate path must assert NEITHER insert is called (the unique-violation catch
  short-circuits before the second table's insert).
- **Changed-contract risk:** `RankingDialog.tsx` difficulty tabs change from
  `["easy", "normal", "hard", "extreme"]` to `["easy", "medium", "hard",
  "extreme"]` (B21-018 closure — `normal` was never a valid `gameDifficultyEnum`
  value per Phase 3 Decision 3.2). Any game component that hardcoded `normal` must
  be updated; Phase 4 updates only the shared `RankingDialog.tsx`. Per-game
  `RankingDialog`/`RankingDisplay` components (dragon-flight, enchanted-library)
  migrate in Phase 5+.
- **Migration ordering risk:** the `leaderboards.schoolId` notNull migration must
  run AFTER any backfill of null rows (Decision 4.2 §2). The migration SQL must be
  reviewed by the deploy engineer (Tier 2 `[b] deferred:infra` operational choice).
  The Tier 1 *contract* (notNull after migration) is testable in PGlite regardless
  of the operational backfill choice.

### Phase 4 intentionally-red aggregate-suite handling

The monorepo aggregate suite (`pnpm turbo run test`) is **red at baseline** from
pre-existing, owner-labeled failures outside Wave 3 (see `measure/tracks.md:112-115`:
"aggregate reds are pre-existing/owner-labeled"). Phase 4 does **not** attempt to
green the aggregate suite. The Phase 4 gate is **scoped to the four filters**
(`pnpm --filter @reading-advantage/domain test -- games-live`,
`pnpm --filter @reading-advantage/domain test -- games`,
`pnpm --filter @reading-advantage/domain test -- tenant-coverage`, and
`pnpm --filter vocabulary-games test --testPathPatterns=rankingRoute`), which must
be fully green. Any non-domain / non-vocabulary-games aggregate red observed during
this phase is pre-existing and must be labeled as such in the phase result
`known_failures` — never silently absorbed into a "green" claim (A5/A6).

### Phase 4 artifact vs live-behavior distinction

- **Live-behavior tests (load-bearing):** `games-live.test.ts` (vitest + PGlite)
  calls the real `recordGameCompletion`, the real `getSchoolLeaderboard`, and the
  real `TenantDB` proxy against an in-process Postgres. These prove the
  tenant-isolation (4A/4E), race-safety (4B), and notNull (4C) properties that a
  mock DB cannot prove. `games.test.ts` (vitest, mock-DB) calls the real Zod
  schemas and the real `recordActivity`/`updateLessonProgress` for group 4F.
  `rankingRoute.test.ts` (jest) calls the real route handler `GET` function.
- **Artifact/documentation tests:** `phase-4-decisions.md` is a frozen artifact,
  not a live-behavior test. Its truthfulness is guarded by the Phase 0 artifact
  pattern (re-verify cited literals exist at HEAD). Phase 4 does not add new
  artifact tests — the decisions doc is the strategy's falsifiability anchor, not a
  test target. The `phase-4-decisions.md` file is referenced in `games.test.ts`
  provenance comments only, with no runtime dependency (A9).
- **Static/behavioral hybrid (4D):** the `gameRankings` deprecation test asserts
  on the query's source table (via a spy on the mock DB's `from()` call). This is a
  behavioral test over the real `getSchoolLeaderboard` function — it proves the
  query reads from `gameCompletions`, not `gameRankings`. It is not a "documentation
  test" (it does not read JSDoc or policy text); it inspects the actual query
  behavior. Labeled as a behavioral test with a static-table-identity assertion.

---

## 0.E. Phase 5 — Embeddable Runtime, i18n, and Shared Package (live-behavior tests)

Phase 5 is the live-behavior phase that delivers the embeddable runtime contract
frozen in `phase-5-decisions.md`. It spans **two test surfaces**: a jest
import-harness suite (`apps/advantage-games/src/__tests__/import-harness/haunted-library-import.test.tsx`,
new — the load-bearing proof for spec §Acceptance "test harness before any
product import"), and a jest component/page suite (extended
`HauntedLibraryGame.test.tsx` + rewritten `dragon-rider` page test). The
import-harness suite is the load-bearing proof for the embeddable-navigation,
i18n, and host-progress-integration claims — those properties cannot be proven
by the Phase 3 component test (which renders in isolation without a host shell)
or the Phase 4 PGlite test (which proves DB persistence, not host wiring).

### What Phase 5 must defend against (anti-patterns)

| Anti-pattern | Where it applies in Phase 5 | Defense |
|---|---|---|
| **A4** Vacuous-pass on nothing-done | Every import-harness assertion (5A/5B/5C/5E); every component assertion (5D) | **Positive + negative control pairing**: every embeddable-navigation test pairs a "no `window.location` mutation" (negative) with "`onNavigate` called" (positive). A harness that passes only because nothing renders fails the positive control. Every i18n test pairs a `th`-locale render (positive control — the locale flows) with an `en`-locale catalog-reachable assertion (positive control — the catalog is not empty). Every host-progress test pairs a first-call insert (positive) with a second-call `duplicate: true` (fire-once positive control). A function that always returns `duplicate: true` fails the first-call control. |
| **A5** False-claim text vs test reality | `plan.md` Phase 5 task text | Do not write "embeddable navigation" / "i18n wired" / "import-ready" / "harness passes" in `plan.md` unless `pnpm --filter vocabulary-games test --testPathPatterns=import-harness` exits 0. The cited command is the source of truth. |
| **A6** Registry-note overstatement | `measure/tracks.md` Wave 3 row; `product-risk-register.md` | Do **not** claim D-07/D-09/D-11 or CA-013 / MR-H05 is "resolved" until Phase 5 acceptance passes AND the successor-track production pilot import is green. Phase 5 closes the **harness** gate, not the production-import gate. The findings stay "open" in `product-risk-register.md` until the successor track. |
| **A3** Digit-only as labeled count | Shared-runtime canonical-source count (5E); `calculateClientXP` integer assertions (5E); `onNavigate` call-count assertions (5A) | Use labeled-integer assertions: `expect(calculateClientXP(100, 10, 10)).toBe(10)` with a comment `// Client XP preview: 10 = floor(10 * 1.0)`; emit `Canonical VirtualDPad source count: 1` and parse the integer; `expect(onNavigateSpy).toHaveBeenCalledTimes(1)` with a comment `// onNavigate call count: 1 (exit control)`. Never `rg -q '[0-9]+'` or a bare-digit match. |
| **A7** Over-broad filter swallowing hits | `window.location.href` exit scans (5A); duplicate-file scans (5E) | Match exact exit literals (`window.location.href = "/student/games"`, `window.location.href = "/"`), not bare words like "location"/"navigation"/"href" (which appear legitimately in the `onNavigate` contract and `useRouter` imports). When scanning for duplicate `VirtualDPad` sources, match exact file paths (`components/ui/VirtualDPad.tsx`, `components/games/ui/VirtualDPad.tsx`), not bare "VirtualDPad" (which appears in every consumer import). |
| **A9** Pre-existing test references archived track paths | New `import-harness` test, extended `HauntedLibraryGame.test.tsx`, rewritten `dragon-rider` page test | Tests reference `apps/advantage-games/src/` and `@reading-advantage/domain/games` only — never a `measure/tracks/<id>/` path. Provenance comments may cite `phase-5-decisions.md` but no runtime dependency on a track path. If the track later archives, tests must not break. |
| **A2** Consent-blind publish gate | N/A — no publish flow in Phase 5. | Consciously not applicable. |
| **A10** Generated-facts drift | N/A — Phase 5 does not regenerate `measure/generated/` and does not run a live DB. | Consciously not applicable. |
| **A11** Executed review track left fully blocked | Phase 5 deferred items (24 games, workspace extraction, real translations, production pilot) | Every Tier 2 deferral is recorded with a precise `[b] deferred:<owner>` marker in `phase-5-decisions.md` Decision 5.7 and a conscious non-test comment in the import-harness test. The deferred items are not silently skipped. |
| **A1, A8, A12, A13** | Orchestrator-internal, plan-marker, catalog, or closeout classes. | Consciously not applicable to Phase 5 product tests. |

### Confirmed gaps to defend against (evidence-mapped, frozen in `phase-5-decisions.md`)

| Group | Gap IDs | Evidence | Phase 5 Red asserts |
|-------|---------|----------|---------------------|
| 5A — Embeddable navigation (D-09) | D-09, B27-010, B29-004, B31-001, B21-039 | `findings.md` §D D-09; 10 `window.location.href` exits + `PotionRushGame.tsx:350` `router.push("/")` | Import-harness: render `HauntedLibraryGame` inside `HostShell` with `onNavigate` spy; simulate game-over + exit click; assert `window.location.href` setter is NOT called (spy) AND `onNavigate` is called with the expected target. **Positive control:** render without `HostShell` (standalone); assert the `<Link>` fallback is present (standalone path not broken). |
| 5B — i18n message source (D-07) | D-07, B22-001, B36-001, B36-002, B42-242 | `findings.md` §A4, §D D-07; `client.ts:39-41` (hardcoded `'en'`); `layout.tsx:3-5` (single-locale static params) | Import-harness: render with `locale="th"`; assert the page's `fetch` call includes `?locale=th` (mock-fetch spy) AND `useCurrentLocale()` returns `"th"` (context assertion). **Positive control:** render with `locale="en"`; assert `useScopedI18n('pages.student.gamesPage')('loading')` returns the `en.ts` literal (catalog reachable, not empty). |
| 5C — Host progress integration | spec §Acceptance; Phase 3 D-01/D-02; Phase 4 Decision 4.5 | `phase-3-decisions.md` Decision 3.4; `phase-4-decisions.md` Decision 4.5 | Import-harness: simulate game-over; assert the `onComplete` payload (Phase 3 shape, no `xp` field) reaches the mocked `recordGameCompletion` from `@reading-advantage/domain/games`; assert the mock is called exactly once with `gameType: "haunted-library"` + `idempotencyKey` UUID. **Positive control (fire-once):** a second game-over with the same `idempotencyKey` calls `recordGameCompletion` and the mock returns `duplicate: true, xpEarned: 0` (Phase 3/4 fire-once contract preserved in the host path). |
| 5D — Representative-game component + page migration (D-09 + D-07) | D-07, D-09, B36-001/002 | `game-readiness-matrix.md` haunted-library row; `dragon-rider/page.tsx:99,113` | Extended `HauntedLibraryGame.test.tsx`: assert the component still renders with the canonical `VirtualDPad` from `@/lib/games-runtime` (not the duplicate `@/components/games/ui/VirtualDPad`). Rewritten `dragon-rider` page test: assert `<Link href="/en/student/games">` is gone (no `/en/` prefix) and the page calls `onNavigate` (or falls back to `<Link href="/student/games">`) — the page renders without the hardcoded locale. **Positive control:** the page still renders the back-to-menu control (deletion-only fix fails). |
| 5E — Shared games runtime module (D-11) | D-11, B00-014, B00-015, B29-001, B33-011 | `findings.md` §A6, §D D-11; duplicate `VirtualDPad`/`basePath`/`xp` files | Static guard + behavioral: assert `apps/advantage-games/src/lib/games-runtime/index.ts` exports `VirtualDPad`, `withBasePath`, `calculateClientXP`. Labeled-integer count: `Canonical VirtualDPad source count: 1` (parsed from the re-export — A3 defense). Behavioral: `calculateClientXP(100, 10, 10)` returns `10` (labeled `// Client XP preview: 10 = floor(10 * 1.0)`). **A4 positive control:** the canonical `VirtualDPad` renders (memoized identity); **A4 negative control:** the duplicate `components/games/ui/VirtualDPad.tsx` is a re-export, not a divergent implementation (import-identity assertion). |

### Gate commands (Phase 5)

- **RED_TEST_COMMAND:** `pnpm --filter vocabulary-games test --testPathPatterns=import-harness`
  (jest, bounded to the new harness file). Mid-Red may also run
  `pnpm --filter vocabulary-games test --testPathPatterns=HauntedLibraryGame` to
  prove the extended component test fails for the intended reason (`onNavigate`
  assertion + locale-context assertion + canonical-runtime import).
- **GREEN_TEST_COMMAND:**
  `pnpm --filter vocabulary-games test --testPathPatterns=import-harness`
  AND `pnpm --filter vocabulary-games test --testPathPatterns=HauntedLibraryGame`
  (jest green). Jr-Green also runs
  `pnpm --filter vocabulary-games test --testPathPatterns=DragonRider` (the
  navigation-fix representative page test).
- **PROJECT_LINT:** `pnpm --filter vocabulary-games lint`
- **PROJECT_CHECKS:** `pnpm --filter vocabulary-games check-types`
- **REGRESSION_GATES (no Phase 5 Red, run at acceptance):**
  `pnpm --filter @reading-advantage/domain test -- games` AND
  `pnpm --filter @reading-advantage/domain test -- games-live` AND
  `pnpm --filter @reading-advantage/domain test -- tenant-coverage` must remain
  green — Phase 5 does NOT modify `packages/domain` or `packages/db`, so the
  Phase 3/4 gates are regression checks only. A regression indicates Phase 5
  accidentally touched a frozen layer.

### Phase 5 Red → Green → Closeout

Phase 5 is decomposed into five test groups (5A..5E). All groups share the Green
gate `pnpm --filter vocabulary-games test --testPathPatterns=import-harness`
(jest, the new harness file) plus
`pnpm --filter vocabulary-games test --testPathPatterns=HauntedLibraryGame`
(extended component test) plus
`pnpm --filter vocabulary-games test --testPathPatterns=DragonRider` (rewritten
page test) plus the closeout gate below.

**Target files (new / rewritten / extended):**

- `apps/advantage-games/src/lib/games-runtime/index.ts` (new) — barrel exporting
  `VirtualDPad`, `withBasePath`, `calculateClientXP`.
- `apps/advantage-games/src/lib/games-runtime/VirtualDPad.tsx` (new) — canonical
  memoized implementation (moved from `components/ui/VirtualDPad.tsx`).
- `apps/advantage-games/src/lib/games-runtime/basePath.ts` (new) — canonical
  `withBasePath`.
- `apps/advantage-games/src/lib/games-runtime/xp.ts` (new) — canonical
  `calculateClientXP` (renamed from `calculateXP` to distinguish from server-side
  `calculateGameXP`).
- `apps/advantage-games/src/components/ui/VirtualDPad.tsx` (rewritten) — re-export
  of `@/lib/games-runtime/VirtualDPad`.
- `apps/advantage-games/src/components/games/ui/VirtualDPad.tsx` (rewritten) —
  re-export of `@/lib/games-runtime/VirtualDPad`.
- `apps/advantage-games/src/lib/basePath.ts` (rewritten) — re-export.
- `apps/advantage-games/src/lib/games/basePath.ts` (rewritten) — re-export.
- `apps/advantage-games/src/lib/xp.ts` (rewritten) — re-export of
  `calculateClientXP` (preserving the `calculateXP` name for unmigrated
  consumers).
- `apps/advantage-games/src/lib/games/xp.ts` (rewritten) — re-export.
- `apps/advantage-games/src/locales/client.ts` (rewritten) — `useCurrentLocale`
  reads from `GamesLocaleContext`; `useScopedI18n` catalog is locale-aware
  (`en.ts` for `en`; key-fallback for `th`/`zh`).
- `apps/advantage-games/src/locales/GamesLocaleContext.tsx` (new) — React context
  providing `locale: string` (defaults to `'en'`).
- `apps/advantage-games/src/app/[locale]/layout.tsx` (rewritten) —
  `generateStaticParams` returns `[{locale:'en'},{locale:'th'},{locale:'zh'}]`.
- `apps/advantage-games/src/lib/gameCards.ts` (rewritten) — 28
  `/en/student/games/...` hrefs → `/student/games/...` (locale-agnostic).
- `apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/dragon-rider/page.tsx`
  (rewritten) — drop `/en/` prefix; wire `onNavigate` (or `<Link href="/student/games">`
  fallback).
- `apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/haunted-library/page.tsx`
  (extended) — wire `onNavigate` callback for the exit control; wrap in
  `GamesLocaleContext.Provider` (or accept the host-provided context).
- `apps/advantage-games/src/components/games/sentence/haunted-library/HauntedLibraryGame.tsx`
  (extended) — accept optional `onNavigate` prop; the exit control calls
  `onNavigate("exit")` when provided, falls back to the existing `<Link>` when
  absent.
- `apps/advantage-games/src/__tests__/import-harness/haunted-library-import.test.tsx`
  (new) — groups 5A, 5B, 5C, 5E (the load-bearing harness proof).
- `apps/advantage-games/src/components/games/sentence/haunted-library/HauntedLibraryGame.test.tsx`
  (extended) — group 5D (canonical-runtime import assertion).
- `apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/dragon-rider/page.test.tsx`
  (rewritten) — group 5D (no `/en/` href; `onNavigate` wiring).

**Red command (bounded):** `pnpm --filter vocabulary-games test --testPathPatterns=import-harness`

**Red assertions (one block per group, all asserting against HEAD `c915e7fd` source):**

1. **5A embeddable navigation** — `import-harness.test.tsx`: render
   `HauntedLibraryGame` inside `HostShell` with `onNavigate` spy. Simulate
   game-over (mock `tickLibrary` to return `phase: "victory"`, matching the
   Phase 3 test pattern). Assert `window.location.href` setter is NOT called
   (spy on `Object.defineProperty(window, 'location', ...)`) AND `onNavigate`
   is called with `"exit"` when the user clicks the exit control.
   **A4 positive control:** render without `HostShell` (standalone); assert the
   `<Link>` fallback is present in the rendered output (the standalone path is
   not broken). **A7:** match the exact `window.location.href` setter, not bare
   "location". **A3:** `expect(onNavigateSpy).toHaveBeenCalledTimes(1)` with
   labeled comment `// onNavigate call count: 1 (exit control)`.
2. **5B i18n message source** — `import-harness.test.tsx`: render with
   `locale="th"` via `GamesLocaleContext.Provider`. Assert the page's `fetch`
   call (mock `global.fetch`) includes `?locale=th` AND `useCurrentLocale()`
   returns `"th"`. **A4 positive control:** render with `locale="en"`; assert
   `useScopedI18n('pages.student.gamesPage')('loading')` returns the `en.ts`
   literal `"Searching the Restricted Section..."` (or whatever the en.ts tree
   holds) — the catalog is reachable, not empty. **A7:** match the exact
   `?locale=th` query string, not bare "locale".
3. **5C host progress integration** — `import-harness.test.tsx`: mock
   `recordGameCompletion` from `@reading-advantage/domain/games`. Simulate
   game-over. Assert the mock is called exactly once with
   `{ gameType: "haunted-library", idempotencyKey: <UUID>, ... }` (Phase 3
   shape, no `xp` field). Assert the mock returns
   `{ duplicate: false, xpEarned: <calculated>, activityId: "game:haunted-library:<uuid>" }`.
   **A4 positive control (fire-once):** simulate a second game-over with the same
   `idempotencyKey`; assert the mock is called again AND returns
   `{ duplicate: true, xpEarned: 0 }`. **A3:** labeled
   `// recordGameCompletion call count: 1 (first game-over)` and
   `// recordGameCompletion call count: 2 (second game-over, duplicate: true)`.
4. **5D representative-game component + page migration** — extended
   `HauntedLibraryGame.test.tsx`: assert the component imports `VirtualDPad`
   from `@/lib/games-runtime` (mock the canonical module and assert the spy is
   rendered). Rewritten `dragon-rider` page test: assert no `<Link href="/en/...">`
   exists in the rendered output (query for `href` containing `/en/`); assert
   the back-to-menu control is still rendered (positive control — deletion-only
   fix fails). **A7:** match the exact `/en/` prefix in the href, not bare "en".
5. **5E shared games runtime module** — `import-harness.test.tsx` (or a
   dedicated `games-runtime.test.ts`): assert
   `@/lib/games-runtime/index.ts` exports `VirtualDPad`, `withBasePath`,
   `calculateClientXP`. Labeled-integer count: emit
   `Canonical VirtualDPad source count: 1` (parsed from a grep of the
   `games-runtime/index.ts` re-export — the count is `1` because there is one
   canonical source; the duplicate files are re-exports, not sources).
   Behavioral: `calculateClientXP(100, 10, 10)` returns `10` (labeled
   `// Client XP preview: 10 = floor(10 * 1.0)`); `calculateClientXP(0, 0, 0)`
   returns `0` (edge case). **A4 positive control:** the canonical `VirtualDPad`
   renders (memoized identity via `React.memo` displayName check); **A4 negative
   control:** the duplicate `components/games/ui/VirtualDPad.tsx` is a re-export
   (import the duplicate path and assert `===` identity with the canonical
   export).

**Positive controls (A4 defense — non-vacuity):** every group includes a
positive control. 5A: standalone `<Link>` fallback renders. 5B: `en` catalog
reachable. 5C: first-call insert + second-call `duplicate: true`. 5D:
back-to-menu control still renders. 5E: canonical `VirtualDPad` renders +
duplicate is a re-export. A group that passes only because nothing renders or
the schema rejects everything fails its positive control.

### Phase 5 Green gate

- `pnpm --filter vocabulary-games test --testPathPatterns=import-harness` exits
  **0** (jest, the new harness file passes — the load-bearing
  embeddable-navigation + i18n + host-progress + shared-runtime proofs).
- `pnpm --filter vocabulary-games test --testPathPatterns=HauntedLibraryGame`
  exits **0** (extended component test passes — canonical-runtime import).
- `pnpm --filter vocabulary-games test --testPathPatterns=DragonRider` exits
  **0** (rewritten page test passes — no `/en/` href + `onNavigate` wiring).
- `pnpm --filter vocabulary-games lint` exits 0.
- `pnpm --filter vocabulary-games check-types` exits 0.
- **Regression gates (no Phase 5 Red, must stay green):**
  `pnpm --filter @reading-advantage/domain test -- games` exits 0 (Phase 3
  contract intact); `pnpm --filter @reading-advantage/domain test -- games-live`
  exits 0 (Phase 4 persistence intact); `pnpm --filter @reading-advantage/domain
  test -- tenant-coverage` exits 0 (no schema change).

### Phase 5 closeout gate

- All Green-gate commands green.
- Every gap in the table above (5A..5E) has at least one **red-at-baseline /
  green-after-fix** test with a positive control.
- `phase-5-decisions.md` exists and its Tier 1 decisions are reflected in the
  implemented harness/runtime/locale wiring. Tier 2 items
  (`[b] deferred:infra` / `[b] deferred:po`) remain deferred in `plan.md`
  Phase 6 / successor track — Phase 5 did not invent the 24-game migration, the
  `packages/games-runtime` workspace extraction, the duplicate-file drop, the
  next-intl migration, real th/zh translations, or the production pilot import.
- The Phase 3 `recordGameCompletion` contract + Phase 4 race-safe persistence
  are **untouched** (regression gates green) — Phase 5 did not scope-creep into
  the frozen contract/persistence layers.
- `measure/tracks.md` does NOT claim D-07/D-09/D-11 / CA-013 / MR-H05 is
  "resolved" — the findings stay "open" until the successor-track production
  pilot import is green (A6 defense). Phase 5 closes the **harness** gate, not
  the production-import gate.
- The existing `vocabulary-games` suite has no regressions in tests other than
  the rewritten `dragon-rider` page test (which intentionally changes its
  assertions from `/en/`-prefixed to locale-agnostic) and the extended
  `HauntedLibraryGame.test.tsx` (which adds the canonical-runtime assertion).

### Phase 5 fixtures, mocks, and live-behavior proof

- **`HostShell` mock component (the load-bearing fixture):** a minimal React
  component that provides `GamesLocaleContext.Provider` value, an `onNavigate`
  callback prop, and renders `children`. The harness wraps
  `HauntedLibraryGame`'s page (or the component directly, depending on the
  assertion scope) inside `HostShell`. This is the honest tier for an
  import-harness proof: the contract is proven at the wiring level; the live-DB
  proof (Phase 4 `games-live.test.ts`) and the route-level proof (Phase 3
  `completeRoute.test.ts`) already cover the lower tiers.
- **Mock `recordGameCompletion`:** `jest.mock("@reading-advantage/domain/games",
  () => ({ recordGameCompletion: jest.fn(...) }))` — the host's progress
  integration point. The mock returns `{ duplicate: false, xpEarned: <n>,
  activityId: "game:haunted-library:<uuid>" }` on first call and
  `{ duplicate: true, xpEarned: 0, activityId: "game:haunted-library:<uuid>" }`
  on second call with the same `idempotencyKey` (mirroring the Phase 3/4
  fire-once contract).
- **Mock `global.fetch`:** `jest.spyOn(global, "fetch")` returning canned
  sentences (`{ sentences: [{ term: "ghost", translation: "ผี" }] }`) and
  capturing the `?locale=` query string for the 5B assertion.
- **Mock `window.location.href` setter:** spy on the setter via
  `Object.defineProperty(window, "location", { ... })` so the 5A assertion can
  verify the setter is NOT called. **A7 defense:** the spy matches the exact
  `href` setter, not bare "location" reads (which happen legitimately in
  Next.js router internals).
- **Mock `tickLibrary`:** follow the existing Phase 3
  `HauntedLibraryGame.test.tsx:11-17` pattern — a mutable `tickMock.fn` that
  defaults to the real `tickLibrary` and can be overridden to force
  `phase: "victory"` for the game-over simulation.
- **No real Postgres, no real AI, no real network.** The harness mocks
  `recordGameCompletion`, `fetch`, and `window.location`. This matches the
  Phase 3 standalone-route tier and the Phase 3 component-test tier; the
  Phase 4 PGlite tier is not duplicated here (Phase 5 has no schema change).
- **Konva mock:** reuse the existing Phase 3
  `HauntedLibraryGame.test.tsx:24-32` `react-konva` mock (`Stage`/`Layer`/`Rect`/
  `Text`/`Circle`/`Group` as `<div data-testid="konva-*">`).

### Phase 5 architecture guardrails and changed-contract risks

- **Do not modify `packages/domain/src/games/`** (Phase 3 contract). The
  `recordGameCompletion` function, `GameCompletionInputSchema`,
  `calculateGameXP`, and `getSchoolLeaderboard` are frozen. Phase 5 wires the
  host shell to call them; it does not change their signatures. A regression
  test (`pnpm --filter @reading-advantage/domain test -- games`) must remain
  green.
- **Do not modify `packages/db/src/schema/analytics.ts`** (Phase 4 persistence).
  The `gameCompletions` table, `xpLogs` unique constraint, and
  `leaderboards.schoolId` notNull are frozen. Phase 5 has no schema migration.
- **Do not migrate the 8 per-game `calculateXP` functions** in
  `hauntedLibrary.ts`, `realmCarver.ts`, etc. They are correctly game-specific
  state→XP mappers, not runtime primitives. Only the two duplicate 3-arg
  `xp.ts` files are consolidated into `calculateClientXP`. A test should
  assert the per-game functions are unchanged (grep for `export function
  calculateXP(state:` in the 8 game-logic files and assert the signatures
  match baseline).
- **Do not drop the duplicate `VirtualDPad`/`basePath`/`xp` files.** They
  become re-export shims so unmigrated games don't break (24 games still import
  from the old paths). Dropping the shims is the successor-track Tier 2 item.
  A test should assert the re-exports have the same export names as the
  originals (positive control — no consumer breaks).
- **Do not extract `packages/games-runtime` workspace package.** Only 2 of 26
  games migrate to the canonical module in Phase 5. Extracting prematurely
  would leave 24 games importing from a workspace package they haven't
  migrated to. The in-app canonical module is the honest single source of
  truth for the harness proof.
- **Do not migrate to `next-intl`/`next-international`.** The custom `client.ts`
  is kept; only the locale source is made host-injectable via
  `GamesLocaleContext`. Framework migration is `[b] deferred:infra`.
- **Changed-contract risk:** `useCurrentLocale()` no longer returns the literal
  `'en'`; it reads from `GamesLocaleContext`. Existing tests that mock
  `@/locales/client` (e.g. `potion-rush/page.test.tsx:27`,
  `rune-match/page.test.tsx:6`) must be updated to provide the context value
  OR the `client.ts` fallback (`'en'` when no provider) must preserve the
  standalone behavior. Phase 5 prefers the fallback approach so unmigrated
  tests don't break — the context defaults to `'en'` when no provider wraps
  the consumer.
- **Changed-contract risk:** `gameCards.ts` hrefs change from
  `/en/student/games/...` to `/student/games/...`. Any test that asserts on the
  literal `/en/` href (e.g. `babelArchitectCompliance.test.ts:14` asserts
  `'/en/student/games/sentence/babel-architect'`) must be updated. This is a
  true Red → Green contract change, not a regression. The acceptance role
  must verify the rewritten test fails at the Red commit (before the href
  change) and passes at the Green commit (after the href change).
- **Changed-contract risk:** `generateStaticParams` returns three locales
  instead of one. The standalone export produces `/en/`, `/th/`, `/zh/` routes.
  The `/th/` and `/zh/` routes fall back to `en.ts` keys (explicit key-fallback
  in `useScopedI18n`). This is honest: the fallback is explicit, not silent.
  A test should assert the fallback returns the key itself (not a crash, not
  an empty string).
- **Migration ordering risk:** the `gameCards.ts` href change must land in the
  same commit as the `dragon-rider` page href change so the gallery link and
  the page link are consistent. Splitting them across commits creates a
  window where the gallery points to a locale-agnostic path but the page still
  has `/en/` — a temporary inconsistency. Jr-Green must land both in one
  commit.

### Phase 5 intentionally-red aggregate-suite handling

The monorepo aggregate suite (`pnpm turbo run test`) is **red at baseline** from
pre-existing, owner-labeled failures outside Wave 3 (see `measure/tracks.md:112-115`:
"aggregate reds are pre-existing/owner-labeled"). Phase 5 does **not** attempt
to green the aggregate suite. The Phase 5 gate is **scoped to the three jest
filters** (`pnpm --filter vocabulary-games test --testPathPatterns=import-harness`,
`pnpm --filter vocabulary-games test --testPathPatterns=HauntedLibraryGame`,
`pnpm --filter vocabulary-games test --testPathPatterns=DragonRider`), which
must be fully green. The regression gates
(`pnpm --filter @reading-advantage/domain test -- games`,
`pnpm --filter @reading-advantage/domain test -- games-live`,
`pnpm --filter @reading-advantage/domain test -- tenant-coverage`) must also be
green but are NOT Phase 5 Red gates — they are regression checks proving Phase 5
did not touch the frozen Phase 3/4 layers. Any non-vocabulary-games /
non-domain aggregate red observed during this phase is pre-existing and must be
labeled as such in the phase result `known_failures` — never silently absorbed
into a "green" claim (A5/A6).

### Phase 5 artifact vs live-behavior distinction

- **Live-behavior tests (load-bearing):** `import-harness.test.tsx` (jest)
  renders the real `HauntedLibraryGame` component (via dynamic import, matching
  the page wiring) inside a real `HostShell` React component, with mocked
  `recordGameCompletion`/`fetch`/`window.location`. This proves the embeddable
  navigation (5A), i18n (5B), host progress integration (5C), and shared
  runtime (5E) properties that the Phase 3 component test (no host shell)
  and the Phase 4 PGlite test (no React component) cannot prove.
- **Component test (extended):** `HauntedLibraryGame.test.tsx` (jest) renders
  the real component and asserts on the canonical-runtime import (5D). This is
  a behavioral test over the real component's import graph.
- **Page test (rewritten):** `dragon-rider` page test (jest) renders the real
  page and asserts on the locale-agnostic href + `onNavigate` wiring (5D). This
  is a behavioral test over the real page component.
- **Artifact/documentation tests:** `phase-5-decisions.md` is a frozen
  artifact, not a live-behavior test. Its truthfulness is guarded by the Phase
  0 artifact pattern (re-verify cited source literals exist at HEAD). Phase 5
  does not add new artifact tests — the decisions doc is the strategy's
  falsifiability anchor, not a test target. The `phase-5-decisions.md` file is
  referenced in `import-harness.test.tsx` provenance comments only, with no
  runtime dependency (A9).
- **Static/behavioral hybrid (5E):** the canonical-source count assertion
  emits a labeled integer `Canonical VirtualDPad source count: 1` and parses
  it. This is a static guard (the count is derived from a grep of the
  `games-runtime/index.ts` re-export), but the `calculateClientXP` and
  `VirtualDPad`-render assertions are behavioral. Labeled as a hybrid:
  static-count + behavioral-render.

---

## 1. Scope of this cycle (Phase 2 — preserved for provenance)

> The section below is the original Phase 2 strategy, preserved unchanged. Phase 2 is
> **complete and accepted** (see `audit/phase-2-acceptance.json`). It is retained as
> provenance for the Phase 2 anti-pattern coverage and as a reference pattern for the
> Phase 1 strategy above.

We are executing **Phase 2: Marketing App Public Workflow Security** only. The app under
test is `apps/marketing` — a **vinext** app whose test runner is `vitest run`. Tests live
in `apps/marketing/app/__tests__/**` and `apps/marketing/app/**/*.{test,spec}.ts(x)`
(see `apps/marketing/vitest.config.ts`, `include`).

### Confirmed vulnerabilities to defend against (evidence-mapped)

| # | Route / concern | File | Evidence ID |
|---|-----------------|------|-------------|
| V1 | `GET /api/settings` decrypts secret values (`apiKey`/`secret`/`token`) and returns them with **no auth** — decrypted-API-key leak | `app/api/settings/route.ts` | LR-marketing-app-003-005 (also -003, -005 cluster) |
| V2 | All `/api/video/*` routes lack auth | `app/api/video/{save-topics,generate-script,research-topics,projects}/route.ts` | LR-004-002 |
| V3 | Campaigns list/detail/PATCH lack auth + owner/tenant policy | `app/api/campaigns/route.ts`, `app/api/campaigns/[id]/route.ts` | LR-marketing-app-003-001 / -003 |
| V4 | Missing Zod validation on settings POST, campaigns POST/PATCH, topics, `generate-script` inputs (unvalidated `request.json()` fed to prompt) | settings/campaigns/video routes | LR-004-001, LR-marketing-app-003-004 / -006 |
| V5 | AI calls should route through the shared `ai.generateText()` adapter, not per-request provider clients | `generate-script`, `research-topics`, `settings/test-connection` | LR-004-003 |

### Gate commands (marketing app)

- **RED_TEST_COMMAND / GREEN_TEST_COMMAND:** `pnpm --filter marketing test`
  (bounded Red runs may filter: `pnpm --filter marketing test <file-stem>`)
- **PROJECT_LINT:** `pnpm --filter marketing lint`
- **PROJECT_CHECKS:** `pnpm --filter marketing check-types`

---

## 2. The real auth seam (how marketing authenticates)

Mid-Red tests MUST exercise the real auth seam, not an ad-hoc local mock, or the 401
assertions become vacuous (A4). The seam is:

1. **Cookie:** `SESSION_COOKIE_NAME = "session_token"` exported from `@reading-advantage/auth`
   (`packages/auth/src/server.ts:76`). The session route reads it with
   `request.cookies.get(SESSION_COOKIE_NAME)?.value`
   (`packages/api/src/routes/auth/session.ts:15`).
2. **Existing wiring in marketing:** `app/api/auth/session/route.ts` re-exports
   `handleSession` and `app/api/auth/login/route.ts` wraps `handleLogin`, both from
   `@reading-advantage/api/routes/auth`. Login validates username/password via
   `@reading-advantage/auth` (`verifyPassword` + `createSession`) and sets the
   `session_token` httpOnly cookie (`packages/api/src/routes/auth/login.ts:181-204`).
3. **Server guards** (framework-agnostic, in `@reading-advantage/auth`, `./server.js`):
   - `getSession(db, token)` → `Session | null`
   - `requireAuth(db, token)` → throws `AuthError("Authentication required", "UNAUTHORIZED")`
     when no valid session.
   - `requireRole(db, token, role)` → throws `AuthError(..., "FORBIDDEN")` when role too low.
   - Session validation ultimately calls `validateSession(db, token)`
     (`packages/auth/src/session.ts`), which hashes the token and looks it up in the
     `sessions` table.
4. **Roles** (`packages/auth/src/roles.ts`): `INTERN, STUDENT, TEACHER, ADMIN, SYSTEM,
   SALES_REP, SALES_ADMIN`. Marketing is an internal staff tool; the intended gate is
   "any authenticated staff user" with a role floor to be confirmed (§6, `[NEEDS-PO]`).

### How Red tests use the seam without a live DB

The marketing route handlers currently take a plain `Request` (not `NextRequest`) and
call `db` directly. Red tests should exercise the guard behaviorally:

- **Unauthenticated case:** construct a `Request` with **no** `Cookie` header (or a cookie
  without `session_token`). The handler under test — once guarded — must resolve no token,
  call `requireAuth`/`getSession`, and return **401**.
- **Authenticated case (positive control):** construct a `Request` with
  `Cookie: session_token=<known-token>` and mock **only** `validateSession`
  (`@reading-advantage/auth`) so `<known-token>` resolves to a `Session` and every other
  token resolves to `null`. This drives the *real* `requireAuth` → `getSession` →
  `validateSession` chain; only the DB lookup is stubbed.

This positive/negative pairing is the anchor against false-green: a route that returns 401
for *everyone* (including the authed control) is a bug, and the positive-control assertion
catches it. See §7 A4/A5.

> **Design note for Jr-Green (not a test requirement):** guarding a `Request`-typed handler
> means either switching the signature to `NextRequest` (so `.cookies.get(...)` is available,
> matching `handleSession`) or parsing the `Cookie` header. Either is acceptable; the test
> asserts *behavior* (401 without a valid session), not the mechanism.

---

## 3. Tenant / owner scoping reality for marketing

Task Phase 2 mentions "owner/tenant scoping". The honest picture from source:

- All marketing tables are classified **REFERENTIAL** in
  `packages/domain/src/tenant-registry.ts:267-271` (`campaigns`, `videoProjects`,
  `videoAssets`, `pastTopics`, `settings`).
- **None of them has a `schoolId` column** (`packages/db/src/schema/marketing.ts`), and
  `campaigns` has **no `ownerId`/`createdBy`** column either. There is no data column to
  scope by today.

Therefore, for Phase 2 the **directly testable and defensible control is
authentication** (require a logged-in staff user), not multi-school `schoolId` scoping.
The strategy:

- **Primary (testable now):** every settings / video / campaign data+AI route returns
  **401 without a valid session**; the sensitive side effect does not run.
- **Policy documentation:** marketing is an internal, effectively single-tenant staff
  tool. The plan Phase 2 task "tenant/global policy documentation" is satisfied by an
  explicit written policy in the plan/route JSDoc: *these routes are global-internal,
  gated by authentication (+ role floor), not by `schoolId`.* This is a `[NEEDS-PO]`
  confirmation item, not a schema change in this cycle.
- **Conditional (only if PO approves owner columns):** if a `createdBy`/`schoolId`
  column is added to `campaigns` in a follow-up, add ownership-scoping tests then. Do
  **not** write a scoping test that asserts against a column that does not exist — that
  would be a vacuous/false test (A4). Document the deferral rather than fake the coverage.

---

## 4. Phase 2 test groups (Red → Green → Closeout)

Phase 2 is decomposed into five test groups. Each is a bounded Red target. All groups
share the Green gate `pnpm --filter marketing test` (whole marketing suite green,
including the pre-existing 151 tests) and the closeout gate in §5.

### Group 2A — Settings decrypted-secret leak (V1, LR-marketing-app-003-005)

**Target file (new):** `app/__tests__/phase-w3-settings-auth.test.ts`
**Red command:** `pnpm --filter marketing test phase-w3-settings-auth`

Red assertions:
1. `GET /api/settings` with **no session cookie** returns **401** (not 200, not 500).
2. The 401 response body contains **neither** any decrypted plaintext secret **nor** the
   stored ciphertext — i.e. it is a bare `{ message }`, and the exact seeded secret
   literal does not appear anywhere in the serialized body.
3. **Side-effect proof:** with no session, `decrypt` (spied via `@/lib/encryption`) is
   **never called**, and `db.select` is **not** invoked for the settings table. This
   proves the guard short-circuits *before* the decrypt/leak path — a route that returns
   401 but still decrypted first would still be a leak in logs/timing.
4. **Positive control:** `GET /api/settings` *with* a valid session (mocked
   `validateSession`) returns 200. (Whether secrets are masked even for authed callers is
   a hardening recommendation — see below.)
5. `POST /api/settings` with no session returns **401** and performs **no** `db.insert`.

Hardening recommendation (testable, encouraged but `[NEEDS-PO]` on UX): even for
authenticated callers, `GET /api/settings` should return secret keys **masked**
(e.g. `"••••"` or omitted) rather than decrypted plaintext, since the settings UI only
needs to know a key *is set*. If adopted, add: "authed GET returns a masked placeholder
for `llm.apiKey`, never the plaintext". This keeps the encrypt-at-rest guarantee from
`phase-3-settings.test.ts` intact while removing the read-back leak entirely.

### Group 2B — Video routes unauthenticated (V2, LR-004-002)

**Target file (new):** `app/__tests__/phase-w3-video-auth.test.ts`
**Red command:** `pnpm --filter marketing test phase-w3-video-auth`

Red assertions (one per route × verb): with **no session cookie**, each of
- `POST /api/video/save-topics`
- `POST /api/video/generate-script`
- `POST /api/video/research-topics`
- `GET /api/video/projects` and `POST /api/video/projects`

returns **401** and performs **no** database write and **no** AI call. Specifically:
- For `generate-script`/`research-topics`: `createAIClient`/`getAIClient` (mocked) is
  **never called** and `db.select(settings)` is not reached — proving the LLM/apiKey path
  is unreachable while unauthenticated (this is also the V1 secret-exposure surface,
  since these routes read `llm.apiKey`).
- For `save-topics`/`projects`: `db.insert` is **never called**.
- **Positive control:** each route with a valid session proceeds past the guard (200 or
  the route's documented non-auth error such as 400 "LLM not configured" / 400
  "campaignId required"), proving 401 is auth-specific, not a blanket failure.

### Group 2C — Campaigns unauthenticated + policy (V3, LR-marketing-app-003-001/-003)

**Target file (new):** `app/__tests__/phase-w3-campaigns-auth.test.ts`
**Red command:** `pnpm --filter marketing test phase-w3-campaigns-auth`

Red assertions:
1. `GET /api/campaigns` (list) with no session → **401**, no `db.select`.
2. `POST /api/campaigns` with no session → **401**, no `db.insert`.
3. `GET /api/campaigns/[id]` with no session → **401**, no `db.select`.
4. `PATCH /api/campaigns/[id]` with no session → **401**, no `db.update`.
5. **Positive controls** for each verb with a valid session (200 / documented 400 / 404).
6. **Policy assertion (documentation truthfulness):** a test asserts the route module (or
   a co-located `POLICY.md` / JSDoc) documents the global-internal auth policy from §3.
   Assert on the *presence of the policy statement*, not on a `schoolId` column that does
   not exist.

### Group 2D — Zod input validation (V4, LR-004-001, LR-marketing-app-003-004/-006)

**Target file (new):** `app/__tests__/phase-w3-input-validation.test.ts`
**Red command:** `pnpm --filter marketing test phase-w3-input-validation`

For each mutating route, with a **valid session** (so we isolate validation from auth),
send a malformed body and assert **400** with a structured validation error and **no**
persistence/AI side effect:
1. `POST /api/settings` — non-object body, or a value that is not a string → 400.
2. `POST /api/campaigns` — missing/invalid `type`/`app`/`name` (e.g. `app` not in the
   `appEnum`, `type` not in `campaignTypeEnum`) → 400, no insert.
3. `PATCH /api/campaigns/[id]` — `status` absent or not a valid `campaignStatusEnum`
   member → 400 **before** the status-transition machine runs.
4. `POST /api/video/save-topics` — `topics` not an array of strings, or `app` invalid → 400.
5. `POST /api/video/research-topics` — `app` missing/invalid → 400.
6. `POST /api/video/generate-script` — **the critical one**: `app`/`topic` missing or
   non-string must be rejected **before** `buildScriptGenerationPrompt(app, topic)` runs.
   Assert the prompt builder / AI client is **never called** with unvalidated input
   (defends the "unvalidated `request.json()` fed to the prompt" finding). A prompt-
   injection-style payload (e.g. `topic` = a 50KB string or an object) must be rejected
   by the schema, not forwarded to the model.

Each validation schema should be a Zod schema colocated in `app/lib/` (mirroring the
existing `app/lib/script-schema.ts`), reused by the route — assert the schema exists and
rejects the bad input at the unit level *and* that the route returns 400 (route-level).

### Group 2E — AI adapter routing (V5, LR-004-003)

**Target file (new):** `app/__tests__/phase-w3-ai-adapter.test.ts`
**Red command:** `pnpm --filter marketing test phase-w3-ai-adapter`

Assertions:
1. `generate-script` and `research-topics` obtain their AI client through the shared
   adapter (`@reading-advantage/ai` via `@/lib/ai`) — not a per-request raw provider SDK.
   `app/lib/ai.ts` already re-exports `createAIClient`/`getAIClient` from
   `@reading-advantage/ai`; assert the routes call the adapter (mocked) and never import
   `@ai-sdk/*` directly.
2. A static guard: the marketing route sources contain **zero** direct `@ai-sdk/*` or
   provider-SDK imports (mirrors the repo-wide guard
   `packages/ai/src/__tests__/phase-arch-no-direct-sdk.test.ts`). Use a labeled count
   assertion (§7 A3): parse "Direct SDK import count: N" and require `N === 0`.
3. Behavior: with a mocked adapter returning canned text, the route returns the parsed/
   validated result; with the adapter throwing, the route returns its documented error
   **without** echoing the `llm.apiKey` (reuse the redaction expectation already proven
   for `test-connection` in `phase-3-settings-adversarial.test.ts`).

---

## 5. Gates

### Red gate (per group)
`pnpm --filter marketing test <group-stem>` fails on the new assertions at baseline SHA
`1f2d1795`, for the intended reason (missing auth / missing validation / adapter bypass),
**not** an import error or unrelated crash. Mid-Red must confirm each new test fails with
an assertion message tied to the vulnerability, and that the positive-control path is
reachable (so the failure is specifically the guard/validation, not a broken route).

### Green gate (phase)
- `pnpm --filter marketing test` exits **0** — the whole marketing suite, i.e. the new
  Phase 2 files **plus** the pre-existing suites (`phase-1-boot*`, `phase-3-settings*`,
  `phase-4-campaigns`, `phase-5-topics`, `phase-6-script`, `phase-7-video-page`,
  `phase-8-projects*`, `wave2-test-truthfulness`). No regression in the 151 baseline tests.
- `pnpm --filter marketing lint` exits 0.
- `pnpm --filter marketing check-types` exits 0.

### Closeout gate (phase)
- All Green-gate commands green.
- Every V1–V5 vulnerability has at least one **red-at-baseline / green-after-fix** test
  with a positive control (proving non-vacuity).
- No decrypted plaintext **or** ciphertext secret appears in any unauthenticated response
  body (Group 2A/2B assertion holds).
- AI routes proven to go through the shared adapter; zero direct provider-SDK imports in
  marketing sources.
- `wave2-test-truthfulness.test.ts` still passes (no stale "RED at HEAD" docblocks, no
  contradictory credential comments, no tautologies, no DOM-in-node tests in the new files).

---

## 6. Fixtures, mocks, and live-behavior proof

- **DB mock (unit/route tests):** follow the established marketing pattern — hoisted
  `vi.mock("@reading-advantage/db", ...)` spreading `actual` then overriding `db` with
  `{ select, insert, update, execute }` `vi.fn()`s (see `phase-3-settings.test.ts:80-99`,
  `phase-4-campaigns.test.ts:49-69`). Use these to assert side-effect **absence** on the
  401 path (`expect(db.select).not.toHaveBeenCalled()`).
- **Auth seam mock:** mock **only** `validateSession` from `@reading-advantage/auth`
  (keep `requireAuth`/`getSession`/`SESSION_COOKIE_NAME` real). A known token resolves to a
  `Session` (shape per `packages/auth/src/session.ts` return: `{ user: { id, username,
  name, role, schoolId, ... } }`); all other tokens → `null`. This is the seam that makes
  the 401/positive-control pairing meaningful rather than vacuous.
- **AI mock:** mock `@reading-advantage/ai` `createAIClient`/`getAIClient` to return a
  fake client with a `generateText` spy (pattern from `phase-3-settings.test.ts:104-118`).
- **`next/server` shim:** either rely on the vitest.config alias to vinext shims, or the
  local `vi.mock("next/server", ...)` NextResponse stub used in
  `phase-4-campaigns.test.ts:40-45`. Prefer whichever the sibling suites use for the same
  route so behavior is consistent.
- **Encryption:** real `@/lib/encryption` (round-trip already covered). For 2A leak
  checks, spy on `decrypt` to assert it is not reached on the unauth path; use
  `ENCRYPTION_KEY` test fallback exactly as `phase-3-settings.test.ts:65-66`.
- **Live-behavior proof (PGlite):** the video-projects CRUD already has a real-Postgres
  proof (`phase-8-projects-live.test.ts` + `helpers/testDb.ts`). Phase 2 auth work is a
  **guard** concern, provable at the route level with the real `requireAuth` chain — a
  full live-DB session round-trip is **not required** for the 401 proof. If a reviewer
  wants an end-to-end auth proof, extend `testDb.ts` DDL with the `sessions`/`users`
  tables and seed a real session; this is optional and should be labeled as the
  live-behavior tier, distinct from the mocked route tier.

### Artifact/documentation vs live-behavior tests
- **Documentation/wiring tests** (e.g. Group 2C policy assertion, Group 2E static
  no-direct-SDK scan): these read source text and assert structure. They are legitimate
  but must be labeled as such and must never be the *only* evidence for a behavioral
  claim. A 401 claim requires a **behavioral** test (call the handler, assert status +
  side-effect absence), not a grep for `requireAuth` in the source.
- **Live-behavior tests**: call the actual route handler and assert on the `Response`
  status/body and mock-call side effects. These are the load-bearing tests for V1–V5.

---

## 7. Anti-pattern coverage (falsifiability per group)

Every Phase 2 test must have a falsification condition. The dominant risk class here is
the **vacuous / false-green** family (A4/A5/A6), plus scan-hygiene (A3/A7).

| Anti-pattern | Where it applies in Phase 2 | Defense |
|---|---|---|
| **A4** Vacuous-pass on nothing-done | Every 401 test (2A/2B/2C) | **Positive/negative control pairing** (§2): a valid-session request must reach 200/documented-non-auth-error. A route that 401s for everyone fails the positive control. Also assert side-effect **absence** on the 401 path (`decrypt`/`db.*`/AI adapter not called), so a route that 401s *after* leaking still fails. |
| **A5** False-claim text vs test reality | Plan text for Phase 2 | Do not write "routes secured" / "all checks pass" in `plan.md` unless `pnpm --filter marketing test` exits 0. The cited command is the source of truth. |
| **A6** Registry-note overstatement | `measure/tracks.md` marketing row / `marketing_golive` preconditions | Do **not** claim the "decrypted-API-key leak" or "unauthenticated `/api/video/*`" is resolved in any registry note until Groups 2A+2B are green. The Go-Live track hard-gates on exactly this (tracks.md:82-83); a premature "resolved" note is the A6 failure mode. |
| **A3** Digit-only as labeled count | Group 2E direct-SDK count; any "N secrets in body" count | Use a **labeled integer** assertion — e.g. emit `Direct SDK import count: N` / `Leaked secret occurrences: N` and parse the integer; never `rg -q '[0-9]+'` or a bare-digit match. |
| **A7** Over-broad filter swallowing hits | 2A/2B body-leak scans | When scanning a response body for a leaked secret, match the **exact seeded secret literal** (e.g. `sk-w3-test-...`), not bare English words like "secret"/"token" (which appear legitimately in `{ message }` and key names). |
| **A9** Test references archived track paths | New Phase 2 test files | New tests reference `measure/tracks/wave3_product_alignment_20260628/...` in docblocks only for provenance; assert **no** runtime dependency on a track path. If the track later archives, tests must not break — keep them path-independent (they test `apps/marketing` source, not measure docs). |

A1, A2, A8, A10, A11 are orchestrator/plan-marker or publish/consent classes not exercised
by Phase 2 product tests: A2 (consent publish gate) — n/a, no publish flow here; A8
(`[ ]` marker) / A11 (review-execution blocked) — plan-hygiene handled by the plan-update
role; A10 (generated-facts drift) — n/a to marketing product tests; A1 (supervisor
substring) — orchestrator-internal. They are recorded here as consciously-not-applicable
rather than silently skipped.

---

## 8. Intentionally-red aggregate-suite handling

The monorepo aggregate suite (`pnpm turbo run test`) is **red at baseline** from
pre-existing, owner-labeled failures outside Wave 3 (see the Wave 1/2 archive notes in
`measure/tracks.md:112-115`: "aggregate reds are pre-existing/owner-labeled"). Phase 2
does **not** attempt to green the aggregate suite. The Phase 2 gate is **scoped to the
marketing filter** (`pnpm --filter marketing test`), which must be fully green. Any
non-marketing aggregate red observed during this phase is pre-existing and must be
labeled as such in the phase result `known_failures` — never silently absorbed into a
"green" claim (A5/A6).

---

## 9. Deferrals (explicit)

- **Phase 0 — Product Decision Intake:** **DONE.** Decisions recorded in
  `phase-0-decisions.md`; claims matrix frozen in `phase-0-claims-matrix.md`. Tier 1
  floors are `[x]`; Tier 2 PO-gated positive replacements remain `[b] deferred:po` with
  precise questions for the PO (see `phase-0-decisions.md` Decision 1B/2B/4B).
- **Phase 1 — Website Claims Correction:** **DONE.** Red tests asserted the Tier 1
  floor against `apps/www-reading-advantage` source at HEAD `8a47d2df`; Green fixes
  applied; acceptance passed. See `audit/phase-1-acceptance.json`.
- **Phase 2 — Marketing App Public Workflow Security:** **DONE.** See
  `audit/phase-2-acceptance.json`. Strategy preserved in §2–§10 for provenance.
- **Phase 3 — Advantage Games Completion and Scoring Contract:** **DONE.** Strategy
  in §0.C. Decisions frozen in `phase-3-decisions.md`. Red tests asserted the
  shared Zod contract, server-side XP, fire-once guard, and `haunted-library` migration
  against HEAD `8900196e`. Tier 2 items (`activity_type` pgEnum extension,
  `gameCompletions` table, remaining 25 games migration) are deferred to Phase 4 / 5+.
- **Phase 4 — Tenant-Safe Persistence and Leaderboards:** **DONE.** Strategy
  in §0.D. Decisions frozen in `phase-4-decisions.md`. Red tests asserted
  tenant isolation of `gameCompletions`, race-safe fire-once (unique
  constraint), `leaderboards.schoolId` notNull, `gameRankings` deprecation,
  server-backed `getSchoolLeaderboard`, and host-mutation Zod (D-06 Tier 1)
  against HEAD `78f17dc3`. Tier 2 items (`lessonId` tenant-ownership check,
  `gameRankings` drop, `xpLogs` schoolId, remaining 25 games migration,
  host-app wiring) are deferred to Phase 5+ / a follow-up infra track.
- **Phase 5 — Embeddable Runtime, i18n, and Shared Package:** **ACTIVE this
  cycle.** Strategy in §0.E. Decisions frozen in `phase-5-decisions.md`. Red
  tests assert embeddable navigation via `onNavigate` (D-09), i18n message
  source via `GamesLocaleContext` (D-07), shared games runtime module
  (`VirtualDPad`/`withBasePath`/`calculateClientXP` — D-11), and the
  `haunted-library` import-harness proof (host progress integration) against
  HEAD `c915e7fd`. Tier 2 items (remaining 24 games migration,
  `packages/games-runtime` workspace extraction, duplicate-file drop,
  next-intl migration, real th/zh translations, production pilot import) are
  deferred to the successor track.
- **Phase 6 — Product Acceptance:** deferred until Phases 3–5 are executed. The
  four `[NEEDS-PO]` Tier 2 questions from `phase-0-decisions.md` are
  explicitly listed as `[b] deferred:po` items the PO must resolve before
  final acceptance — they are not silently dropped.

Within Phase 2, one `[NEEDS-PO]` item remains: the exact **role floor** for marketing
routes (any authenticated staff user vs. an `ADMIN`-equivalent floor) and whether
`GET /api/settings` should mask secrets for authenticated callers. The Red tests assert
the **authentication** boundary (401 without a session), which holds under either PO
decision; the role-floor tests should be added once the floor is confirmed. (Phase 2 is
complete and accepted; this item carries forward to Phase 6 closeout as a `[b] deferred:po`.)

Within Phase 3, no `[NEEDS-PO]` items are introduced. All seven decisions in
`phase-3-decisions.md` are fully evidence-grounded (`[x]`). Tier 2 items are
`[b] deferred:infra` (Phase 4 schema work) or `[b] deferred:po` (none). Phase 3 is
complete and accepted; its Tier 2 items are closed by Phase 4 (`gameCompletions`
table + `xpLogs` unique constraint) or carried forward (remaining 25 games
migration → Phase 5+).

Within Phase 4, no `[NEEDS-PO]` items are introduced. All seven decisions in
`phase-4-decisions.md` are fully evidence-grounded (`[x]`). Tier 2 items are
`[b] deferred:infra` (the `lessonId` tenant-ownership check, which requires an
assignments-based ownership query — Decision 4.4) or `[b] deferred:po` (none).
The `leaderboards.schoolId` notNull migration's operational backfill choice
(backfill-and-notNull vs delete-null-rows) is `[b] deferred:infra` for the deploy
engineer; the Tier 1 contract (notNull after migration + FLAT insert rejected
without schoolId) is testable in PGlite regardless.

---

## 10. Summary

### Phase 0 (complete)

Phase 0 delivers two frozen artifacts: `phase-0-decisions.md` (four product-owner
decisions with Tier 1 `[x]` floor vs Tier 2 `[b] deferred:po` positive-replacement
split) and `phase-0-claims-matrix.md` (30 claim rows CC-01..CC-30 with HEAD-confirmed
file:line evidence at `8a47d2df` and Phase 1 dispositions). The Advantage Games import
policy is fully evidence-grounded (`[x]`): standalone-only now, conditional pilot import
of `haunted-library` after Phases 3–5 green, full import deferred to a successor track.
Phase 0 has no live-behavior tests — its "Red" is a structural truthfulness guard that
re-verifies the cited literals exist at baseline; after Phase 1 Green those same literals
must be gone.

### Phase 1 (complete)

Phase 1 delivers one new www test file `phase-w3-claims.test.ts` with nine groups
(1A product count, 1B stale launch dates, 1C nonexistent-app pages, 1D AI model claims,
1E placeholder case studies, 1F duplicated efficacy stats, 1G unverifiable stats,
1H partner/school consent, 1I stale timestamps), each red at `8a47d2df` for the specific
banned literal/claim class and green after the Tier 1 floor is enforced, each with a
positive control so a deletion-only fix fails (A4). The phase gate is
`pnpm --filter www-reading-advantage test` = 0 plus lint and check-types, with the
aggregate monorepo suite explicitly out of scope. Tier 2 `[NEEDS-PO]` items remain
deferred — Phase 1 does not invent approved stats, model names, or roadmap dates.

### Phase 2 (complete and accepted — preserved for provenance)

Phase 2 delivers five new marketing test files (2A settings leak, 2B video auth, 2C
campaigns auth+policy, 2D Zod validation, 2E AI adapter), each red at
`1f2d1795` for the specific vulnerability and green after the fix, each with a
positive/negative control pairing that makes the 401/validation assertions non-vacuous.
The phase gate is `pnpm --filter marketing test` = 0 plus lint and check-types, with the
aggregate monorepo suite explicitly out of scope. Tenant/owner "scoping" is handled
honestly as an authentication + documented global-internal policy, because no `schoolId`
or owner column exists on marketing tables today.

### Phase 3 (complete)

Phase 3 delivers a new `packages/domain/src/games/` module (schema/xp/mutations/
permissions/errors/index) plus a rewritten `completeRoute.ts` and a migrated
`HauntedLibraryGame.tsx`, proven by a new `packages/domain/src/__tests__/games.test.ts`
(vitest, groups 3A contract / 3B XP formula / 3C fire-once), a rewritten
`completeRoute.test.ts` (jest, group 3E), and an extended `HauntedLibraryGame.test.tsx`
(jest, group 3D). Each group is red at `8900196e` for the specific contract gap
(D-01/D-02/D-05/B25-001/B28-017/B30-002) and green after the fix, each with a positive
control so a reject-everything or no-op fix fails (A4). The phase gate is
`pnpm --filter @reading-advantage/domain test -- games` = 0 plus
`pnpm --filter vocabulary-games test --testPathPatterns=completeRoute` = 0 plus lint
and check-types on both filters, with the aggregate monorepo suite explicitly out of
scope. Tier 2 items (`activity_type` pgEnum extension, `gameCompletions` table,
remaining 25 games migration) are deferred to Phase 4 / 5+. The `recordActivity`
generic function is intentionally untouched (D-06 is Phase 4).

### Phase 4 (complete)

Phase 4 delivers a new `gameCompletions` FLAT table (schoolId notNull + unique
constraint), an `xpLogs` unique constraint for race-safe fire-once, a
`leaderboards.schoolId` notNull migration, a `getSchoolLeaderboard` domain query, a
shared `LeaderboardResponseSchema`, host-mutation Zod (D-06 Tier 1), and a rewritten
`rankingRoute.ts`, proven by a new `packages/domain/src/__tests__/games-live.test.ts`
(vitest + PGlite, groups 4A tenant isolation / 4B race-safety / 4C notNull / 4E
leaderboard), an extended `games.test.ts` (vitest mock-DB, groups 4D gameRankings
deprecation / 4F host-mutation Zod), and a rewritten `rankingRoute.test.ts` (jest,
group 4E). Each group is red at `78f17dc3` for the specific gap
(D-04/B46-021/B46-025/B46-027/B46-031/B28-017/B30-002) and green after the fix, each
with a positive+negative control pairing so a query-that-returns-empty-for-everyone
or a schema-that-rejects-everything fix fails (A4). The phase gate is
`pnpm --filter @reading-advantage/domain test -- games-live` = 0 plus
`pnpm --filter @reading-advantage/domain test -- games` = 0 plus
`pnpm --filter @reading-advantage/domain test -- tenant-coverage` = 0 plus
`pnpm --filter vocabulary-games test --testPathPatterns=rankingRoute` = 0 plus lint
and check-types on three filters, with the aggregate monorepo suite explicitly out
of scope. Tier 2 items (`lessonId` tenant-ownership check, `gameRankings` drop,
`xpLogs` schoolId, remaining 25 games migration, host-app wiring) are deferred to
Phase 5+ / a follow-up infra track. The Phase 3 fire-once Tier 2 item (race-safe
unique constraint) is closed by Phase 4 Decision 4.5.

### Phase 5 (active this cycle)

Phase 5 delivers an embeddable navigation contract (host-injected `onNavigate`
callback, removing `window.location.href` exits and hardcoded `/en/` hrefs from
representative games), an i18n message source (`GamesLocaleContext` +
`generateStaticParams` returns `['en','th','zh']` + `useScopedI18n` keeps the
`en.ts` tree with explicit key-fallback), a shared games runtime module
(`apps/advantage-games/src/lib/games-runtime/` exporting one canonical memoized
`VirtualDPad`, one `withBasePath`, one `calculateClientXP`, with re-export shims
preserving import paths for unmigrated games), and the `haunted-library`
import-harness proof, proven by a new
`apps/advantage-games/src/__tests__/import-harness/haunted-library-import.test.tsx`
(jest, groups 5A embeddable navigation / 5B i18n / 5C host progress integration /
5E shared runtime), an extended `HauntedLibraryGame.test.tsx` (jest, group 5D
canonical-runtime import), and a rewritten `dragon-rider` page test (jest, group
5D locale-agnostic href + `onNavigate` wiring). Each group is red at `c915e7fd`
for the specific gap (D-07/B22-001/B36-001/B36-002, D-09/B27-010/B29-004/B31-001/
B21-039, D-11/B00-014/-015/B29-001/B33-011) and green after the fix, each with a
positive+negative control pairing so a harness-that-passes-because-nothing-renders
or a deletion-only fix fails (A4). The phase gate is
`pnpm --filter vocabulary-games test --testPathPatterns=import-harness` = 0 plus
`pnpm --filter vocabulary-games test --testPathPatterns=HauntedLibraryGame` = 0
plus `pnpm --filter vocabulary-games test --testPathPatterns=DragonRider` = 0
plus lint and check-types, with the aggregate monorepo suite explicitly out of
scope. Regression gates (`pnpm --filter @reading-advantage/domain test -- games`,
`-- games-live`, `-- tenant-coverage`) prove Phase 5 did not touch the frozen
Phase 3/4 layers. Tier 2 items (remaining 24 games migration,
`packages/games-runtime` workspace extraction, duplicate-file drop, next-intl
migration, real th/zh translations, production pilot import) are deferred to the
successor track. Phase 5 closes the **harness** gate, not the production-import
gate — `measure/tracks.md` does NOT claim D-07/D-09/D-11 / CA-013 / MR-H05 is
"resolved" until the successor-track production pilot is green (A6 defense).
