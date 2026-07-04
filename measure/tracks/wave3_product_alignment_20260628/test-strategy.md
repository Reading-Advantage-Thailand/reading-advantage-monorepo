# Test Strategy: Wave 3 — Product-Facing Truth and Reusable Surfaces

> **Track ID:** `wave3_product_alignment_20260628`
> **Baseline SHA:** `8a47d2df999e35d9d47de9eb590ae29523c70bae`
> **Active phases for this cycle:** Phase 3 (Advantage Games Completion and Scoring
> Contract). Phases 0, 1, and 2 are **complete and accepted** — their strategies are
> preserved verbatim below for provenance. Phases 4–5 remain deferred (see §9
> Deferrals).
>
> This document specifies:
> - §0.A — Phase 0 artifact tests (decisions/matrix truthfulness) — complete
> - §0.B — Phase 1 live-behavior tests (claims correction) — complete
> - §0.C — Phase 3 live-behavior tests (games completion/scoring contract) — **active**
> - §2–§10 — Phase 2 strategy, preserved unchanged for provenance

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
  `pnpm --filter vocabulary-games test -- --testPathPatterns=completeRoute` to prove
  the rewritten jest test fails for the intended reason).
- **GREEN_TEST_COMMAND:** `pnpm --filter @reading-advantage/domain test -- games`
  (vitest green). Jr-Green also runs
  `pnpm --filter vocabulary-games test -- --testPathPatterns=completeRoute` (jest green).
- **PROJECT_LINT:** `pnpm --filter @reading-advantage/domain lint && pnpm --filter vocabulary-games lint`
- **PROJECT_CHECKS:** `pnpm --filter @reading-advantage/domain check-types && pnpm --filter vocabulary-games check-types`

### Phase 3 Red → Green → Closeout

Phase 3 is decomposed into five test groups (3A..3E). All groups share the Green gate
`pnpm --filter @reading-advantage/domain test -- games` (vitest, the new `games.test.ts`)
plus `pnpm --filter vocabulary-games test -- --testPathPatterns=completeRoute` (jest,
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
- `pnpm --filter vocabulary-games test -- --testPathPatterns=completeRoute` exits **0**
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
`pnpm --filter vocabulary-games test -- --testPathPatterns=completeRoute`), which must
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
  Phase 4 may add a PGlite live-DB proof for tenant-safe persistence; Phase 3 does not
  require it (the standalone games app has no DB, and the host-app import is Phase 5+).

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
- **Phase 3 — Advantage Games Completion and Scoring Contract:** **ACTIVE this cycle.**
  Strategy in §0.C. Decisions frozen in `phase-3-decisions.md`. Red tests assert the
  shared Zod contract, server-side XP, fire-once guard, and `haunted-library` migration
  against HEAD `8900196e`. Tier 2 items (`activity_type` pgEnum extension,
  `gameCompletions` table, remaining 25 games migration) are deferred to Phase 4 / 5+.
- **Phase 4 — Tenant-Safe Persistence and Leaderboards:** deferred. Owns the
  `gameCompletions` table migration (or `xpLogs` unique constraint), `schoolId`
  reclassification, `leaderboards` hardening, host-mutation Zod (D-06), and the
  server-backed leaderboard. The plan's D-04/D-06 evidence refs and the import policy
  from `phase-0-decisions.md` Decision 3 are carried forward as the gating items.
- **Phase 5 — Embeddable Runtime, i18n, and Shared Package:** deferred. Owns the
  embeddable navigation contract, i18n message source, shared runtime package, and the
  `haunted-library` import-harness proof. Gated on Phases 3 and 4 green per
  `phase-0-decisions.md` Decision 3.
- **Phase 6 — Product Acceptance:** deferred until Phases 3–5 are executed. The four
  `[NEEDS-PO]` Tier 2 questions from `phase-0-decisions.md` are explicitly listed as
  `[b] deferred:po` items the PO must resolve before final acceptance — they are not
  silently dropped.

Within Phase 2, one `[NEEDS-PO]` item remains: the exact **role floor** for marketing
routes (any authenticated staff user vs. an `ADMIN`-equivalent floor) and whether
`GET /api/settings` should mask secrets for authenticated callers. The Red tests assert
the **authentication** boundary (401 without a session), which holds under either PO
decision; the role-floor tests should be added once the floor is confirmed. (Phase 2 is
complete and accepted; this item carries forward to Phase 6 closeout as a `[b] deferred:po`.)

Within Phase 3, no `[NEEDS-PO]` items are introduced. All seven decisions in
`phase-3-decisions.md` are fully evidence-grounded (`[x]`). Tier 2 items are
`[b] deferred:infra` (Phase 4 schema work) or `[b] deferred:po` (none).

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

### Phase 3 (active this cycle)

Phase 3 delivers a new `packages/domain/src/games/` module (schema/xp/mutations/
permissions/errors/index) plus a rewritten `completeRoute.ts` and a migrated
`HauntedLibraryGame.tsx`, proven by a new `packages/domain/src/__tests__/games.test.ts`
(vitest, groups 3A contract / 3B XP formula / 3C fire-once), a rewritten
`completeRoute.test.ts` (jest, group 3E), and an extended `HauntedLibraryGame.test.tsx`
(jest, group 3D). Each group is red at `8900196e` for the specific contract gap
(D-01/D-02/D-05/B25-001/B28-017/B30-002) and green after the fix, each with a positive
control so a reject-everything or no-op fix fails (A4). The phase gate is
`pnpm --filter @reading-advantage/domain test -- games` = 0 plus
`pnpm --filter vocabulary-games test -- --testPathPatterns=completeRoute` = 0 plus lint
and check-types on both filters, with the aggregate monorepo suite explicitly out of
scope. Tier 2 items (`activity_type` pgEnum extension, `gameCompletions` table,
remaining 25 games migration) are deferred to Phase 4 / 5+. The `recordActivity`
generic function is intentionally untouched (D-06 is Phase 4).
