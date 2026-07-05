# Phase 0 — Product Decision Intake (Frozen 2026-07-04)

> **Track:** `wave3_product_alignment_20260628`
> **Baseline SHA:** `8a47d2df999e35d9d47de9eb590ae29523c70bae`
> **Owner:** `measure-strategy` (this cycle) — defaults recorded on behalf of the product
> owner using **only** audit evidence and current source reality at HEAD `8a47d2df`.
> Items that genuinely require a human product owner are marked `[b] deferred:po` with a
> precise question; everything else is an evidence-grounded default that is safe to act on.

## Decision framework

The Wave 3 spec (`spec.md` §"Product Owner Decisions Required") lists four decisions. The
`measure/audit-reports/monorepo-review-roadmap_20260626/product-risk-register.md`
"Product Owner Questions" list five. Three of those five (Sales consent/retention, route/
domain migration priority, captcha provider) are owned by other tracks (Sales Go-Live,
Wave 4, captcha_verification_20260703) and are explicitly out of Wave 3 scope. The four
Wave 3 decisions are reproduced below with the recorded decision.

For each decision we distinguish two tiers:

- **Tier 1 — Evidence-grounded floor (automatable).** What the audit and current source
  state *require* be removed or relabeled regardless of PO preference. These are marked
  `[x]` and Phase 1 may proceed against them immediately.
- **Tier 2 — PO-gated positive case `[b] deferred:po`.** What specific *replacement*
  claim, date, stat, or model name is approved for publication. Phase 1 must not invent
  these; placeholder/neutral copy is substituted until the PO confirms.

This split is what keeps Phase 1 falsifiable: the Red tests assert the *floor* (no stale
dates, no nonexistent-app-as-live, no placeholder-as-real, no uncited stats, no unconsented
case studies) — assertions that hold today are vacuous, so they fail until the floor is
enforced. The PO-gated positive case is added as test fixtures only after confirmation.

---

## Decision 1 — Public product pages for apps with no code directory

**Question (spec.md §Product Owner Decisions #1; product-risk-register.md Q1):** Which
public product pages should remain visible for apps with no code directory?

**Source reality at HEAD `8a47d2df`:**

- `apps/` directories: `advantage-games`, `codecamp-advantage`, `marketing`,
  `primary-advantage`, `reading-advantage`, `sales-advantage`, `science-advantage`,
  `www-reading-advantage`. Of these, three are **not** product apps marketed on the
  public site (`marketing` = internal video pipeline, `sales-advantage` = internal sales
  tool, `www-reading-advantage` = the website itself). The four implemented products are
  Reading Advantage, Primary Advantage, Science Advantage, CodeCamp Advantage.
- Public product pages exist under
  `apps/www-reading-advantage/src/app/[locale]/(marketing)/products/` for **nine** apps:
  reading-advantage, primary-advantage, science-advantage, codecamp-advantage,
  math-advantage, stem-advantage, storytime-advantage, tutor-advantage, zhongwen-advantage.
- Five of those pages describe apps with **no code directory**: Math, STEM, Storytime,
  Tutor, Zhongwen (per `claims-matrix.md` C-MA-01, C-STEM-01, C-ST-01, C-TA-01, C-ZA-01;
  CA-008 "5 product pages describe apps that don't exist").
- Audit verdicts on those five pages are all `[FAIL]` (stale launch dates: "Coming in
  2025", "Coming in 2026", "Launching in 2025"; cross-locale conflicts).

### Decision 1A (Tier 1, `[x]` — automatable floor)

- The "One engine, nine products" superlative (currently in
  `src/locales/pages/home.ts:40` and `src/locales/pages/mastery-advantage.ts:61`) is
  **removed/replaced** with a truthful count: "One engine, four products today — and a
  roadmap for more." (Exact wording is Tier 2; the **count** is Tier 1 and non-negotiable.)
- The "all 9 products" claim in
  `src/app/[locale]/(marketing)/(home)/page.tsx:175` is corrected to the same truthful
  count.
- The five nonexistent-app pages (Math, STEM, Storytime, Tutor, Zhongwen) **must not
  present as live products**. The floor is one of:
  (a) clearly label the page "On our roadmap" / "Planned" with **no launch date**, OR
  (b) remove the page and the product card from the homepage/products index.
- Stale launch dates ("Coming in 2025", "Coming in 2026", "Launching in 2025") on those
  five pages **must be removed**. They may be replaced with a future-undated "Planned"
  marker (Tier 1) or with a PO-approved specific future date (Tier 2).

### Decision 1B (Tier 2, `[b] deferred:po`)

- Whether to **keep, hide, or delete** each of the five nonexistent-app pages is a
  brand/marketing decision. Default keep-with-roadmap-label (Tier 1A) is applied until
  the PO decides otherwise.
- Any specific future launch date for Math/STEM/Storytime/Tutor/Zhongwen requires PO
  confirmation with roadmap evidence.

**PO question to resolve:** "For each of Math, STEM, Storytime, Tutor, Zhongwen
Advantage: keep as a roadmap page (default), hide from nav/index, or delete? If kept,
what is the approved roadmap date or 'TBC' marker?"

---

## Decision 2 — AI provider/model claims for public marketing

**Question (spec.md §Product Owner Decisions #2; product-risk-register.md Q2):** Which AI
provider/model claims are approved for public marketing after current implementation
review?

**Source reality at HEAD `8a47d2df`:**

- `rg -n 'GPT-?5' apps/www-reading-advantage/src/` returns **9 hits**:
  - `src/locales/pages/products/primary-advantage.ts:30,96,170,236,310,376` — "Intelligent
    writing feedback with GPT-5" / "GPT-5 Writing Feedback" across en/th/zh.
  - `src/locales/pages/home.ts:143,303,461` — case-study `technology: "Google Gemini &
    GPT-5 AI"` across three locales.
- The audit (`claims-matrix.md` C-PA-02, LRF-013) marks the GPT-5 claim `[FAIL]`
  (unverifiable). The marketing-app audit (`ai-boundary-map.md`) confirms the
  implementation uses a **provider-neutral adapter** (`@reading-advantage/ai` →
  `createAIClient({ provider, model, apiKey })` with default `google`/`gemini-pro`), so
  the public GPT-5 claim is **not** even what the code uses today.
- AGENTS.md §AI requires provider neutrality and forbids direct provider-SDK coupling in
  application code. The same neutrality principle applies to public marketing copy: the
  website should not name a specific model the adapter does not pin.

### Decision 2A (Tier 1, `[x]` — automatable floor)

- All specific model name/version claims ("GPT-5", "GPT-4", "Gemini & GPT-5 AI") are
  **removed** from public marketing copy and replaced with provider-neutral language,
  e.g. "AI-powered writing feedback via our internal model adapter" or
  "Powered by leading AI models through our adapter layer."
- The homepage case-study `technology: "Google Gemini & GPT-5 AI"` field is replaced
  with a neutral value (e.g. `"AI-assisted learning"` or removed entirely).
- The provider-neutral replacement wording is itself Tier 1 (it must not name a specific
  model) — exact phrasing is Tier 2.

### Decision 2B (Tier 2, `[b] deferred:po`)

- If the PO wants to **name** a specific model/provider publicly (e.g. "Powered by
  Google Gemini"), that requires (a) confirmation the named provider is the one the
  adapter actually uses for that workflow at prod, and (b) PO approval of the public
  attribution. Until then, neutral copy is the floor.

**PO question to resolve:** "Do you want any public AI provider/model attribution on
the website? If yes, which specific provider/model name is approved for which product
page, and is it the model the adapter actually uses for that workflow in production?"

---

## Decision 3 — Advantage Games import policy

**Question (spec.md §Product Owner Decisions #3; product-risk-register.md Q4):** Should
Advantage Games remain standalone until all import contracts are ready, or should a
limited pilot import be scoped?

**Source reality at HEAD `8a47d2df` (from
`measure/audit-reports/advantage-games_20260626/`):**

- All **26 implemented games** are `NOT-READY` or `AT-RISK` for import
  (`game-readiness-matrix.md`). Every implemented game inherits the Class A shared-runtime
  blockers: A1 client-trusted completion contract, A3 tenant-unsafe leaderboard, A4
  hardcoded `/en/`, A5 `force_static` mock API, A8 canvas a11y gaps.
- Eleven import-contract gaps (`findings.md` §D, D-01..D-11) block embedding into
  Reading/Primary. The five highest-leverage systemic issues (`executive-summary.md` §2):
  no enforceable completion/scoring contract, multi-tenant leaderboard unsafe,
  mock-only API layer, i18n largely absent, shared runtime not singular.
- The Wave 3 spec §Non-Goals explicitly states: "Do not import games before Wave 0
  tenant/contracts and Games contract work are green."

### Decision 3 (`[x]` — fully evidence-grounded, no PO gate)

**Policy frozen:** **Standalone-only now; conditional pilot import AFTER this track's
Phases 3, 4, 5 are green; full import deferred to a successor track.**

- **Now (Phase 0 through Phase 5 of this track):** Advantage Games remain standalone.
  No game is imported into Reading or Primary. The Wave 3 track itself does not perform
  any import; it delivers the contracts and one representative-game pilot *harness*
  (Phase 5), not a production import.
- **Pilot import gate (successor track, after Phase 5 green):** exactly one
  representative game — `haunted-library` (per `game-readiness-matrix.md` "best-behaved
  on counts", sends real counts B21-235, AT-RISK not NOT-READY) — may be piloted in
  Reading Advantage after all of the following are green:
  - Phase 3: shared completion/scoring Zod contract (D-01), server-side XP (D-02),
    fire-once `onComplete` (D-02/B28-017/B30-002), activity/game-type enum (D-05).
  - Phase 4: tenant-safe persistence (D-04 — `xpLogs`/`gameRankings`/`leaderboards`
    classified in tenant registry with `schoolId` or owner-FK, tenant-coverage CI green),
    host-mutation Zod (D-06).
  - Phase 5: embeddable navigation (D-09), i18n message source (D-07), shared runtime
    package (D-11), and a passing import-harness test for the representative game.
- **Full import (successor track):** the remaining 25 games migrate to the shared
  contract one batch at a time, gated by their `game-readiness-matrix.md` per-game
  blockers being closed. No NOT-READY game (e.g. labyrinth-goblin-king, abyssal-well,
  castle-defense, dragon-flight/dragon-rider with duplicate completion) may be imported.

This decision needs **no PO input** because the audit precludes any other choice. The
spec's "limited pilot import" option is preserved as the post-Phase-5 gate, not a Phase-0
shortcut.

---

## Decision 4 — Approved efficacy stats and case studies

**Question (spec.md §Product Owner Decisions #4; product-risk-register.md Q4 efficacy):**
Which efficacy stats and case studies are approved and evidence-backed?

**Source reality at HEAD `8a47d2df`:**

- `src/locales/pages/case-studies.ts:23,58` — "School A (Coming Soon)" and "School B
  (Coming Soon)" placeholder case studies under a "Real Results" framing (per audit
  LRF-012, `claims-matrix.md` C-MK-03 `[FAIL]`).
- `src/app/[locale]/(marketing)/(home)/page.tsx:87` — "2,172+" mapped-skills claim
  (LRF-015, C-RA-04 `[NEEDS-PO]`).
- `src/app/[locale]/(marketing)/products/math-advantage/page.tsx:296` — "95%" stat
  (LRF-031, C-MA-02 `[FAIL]` unverifiable).
- `src/locales/pages/products/math-advantage.ts` and primary-advantage.ts — "24/7"
  availability claims (C-MA-02, C-PA-02 — these are availability promises, not efficacy
  stats, but fall under the same "unverifiable absolute claim" class).
- `src/locales/pages/managed-service.ts:11` — "ZERO RISK" absolute claim (LRF-019,
  C-SV-02 `[FAIL]`).
- Primary Advantage efficacy stats duplicated verbatim from Reading Advantage
  (LRF-014, C-PA-02 `[FAIL]`).
- Research citations "Aka 2019, +50% grammar, 2x vocab" (LRF-015, C-MK-02 `[NEEDS-PO]`).

### Decision 4A (Tier 1, `[x]` — automatable floor)

- All case studies currently framed as "Real Results" that use placeholder tokens
  ("School A (Coming Soon)", "School B (Coming Soon)", "+X points over Y months") are
  **either removed or clearly relabeled** as "Illustrative example — not a real school"
  with no concrete school name and no specific outcome figure. The "Real Results"
  heading is replaced with "Examples" or "Illustrative scenarios."
- All specific efficacy stats **without** a citation to published, peer-reviewed
  research or a signed-off internal study are **removed or relabeled as illustrative**:
  - "95%" math-advantage stat — removed.
  - "2,172+ mapped skills" — removed unless a verified source-of-truth count is provided
    (Tier 2).
  - "ZERO RISK" absolute claim — replaced with a non-absolute qualifier ("Low-risk
    onboarding" or removed; absolute claims are inherently non-evidence-backable).
  - Duplicated Primary Advantage stats copied from Reading Advantage (LRF-014) —
    deduplicated; Primary either has its own evidence or omits the stat.
- Research citations ("Aka 2019", "+50% grammar", "2x vocab") — **removed** unless the
  PO provides the full citation (publication, DOI/URL, peer-review status) and confirms
  it applies to this product (Tier 2). The `wave2-product-claim-helper.ts`
  `DISCLAIMER_TOKENS` list ("results may vary", "individual results depend",
  "implementation fidelity", "based on consistent classroom use") is the **allowed**
  policy-disclaimer vocabulary; anything stronger requires evidence.
- Partner logos / school names (C-MK-04 `[FAIL]`) — **removed** unless each named
  partner/school has a signed consent artifact
  (`consent-<subject>.{md,pdf}` with signatory + date) AND anonymization per
  anti-pattern A2. This is enforced structurally by the existing
  `wave2-product-claim-helper.ts` `audit()` `missingConsentCount` check.

### Decision 4B (Tier 2, `[b] deferred:po`)

- Any **specific** approved efficacy stat (e.g. "verified +18% reading-score improvement
  in School Year 2025-26 at [consented school]") requires:
  (a) the underlying study data or measurement methodology,
  (b) PO approval for public attribution,
  (c) if a school is named, a `consent-<school>.md` artifact with signatory + date and
      an anonymization decision (named vs anonymized).
- Any specific research citation requires the full citation and PO confirmation it
  applies to this product.

**PO question to resolve:** "For each efficacy stat you want to keep publicly, provide
(a) the source (study, internal measurement, or 'illustrative'), (b) the exact wording
approved, and (c) for any named school/partner, the signed consent artifact and
anonymization preference. Until provided, all such stats are removed/relabeled as
illustrative per Tier 1A."

---

## Summary table

| # | Decision | Tier 1 (automatable, `[x]`) | Tier 2 (PO-gated, `[b] deferred:po`) |
|---|----------|------------------------------|--------------------------------------|
| 1 | Public product pages for nonexistent apps | "9 products" → truthful count; stale launch dates removed; nonexistent-app pages labeled "roadmap" or removed | Per-page keep/hide/delete; specific roadmap dates |
| 2 | AI provider/model claims | All "GPT-5"/specific-model claims removed; provider-neutral copy substituted | Specific approved provider/model name per page |
| 3 | Advantage Games import policy | Standalone-only now; pilot gated on Phases 3–5 green; full import deferred to successor track | (none — fully evidence-grounded) |
| 4 | Efficacy stats and case studies | Placeholder-as-real removed/relabeled; uncited stats removed; "ZERO RISK" removed; duplicated stats deduplicated; unconsented partner names removed | Specific approved stats with evidence + consent artifacts |

## What this enables for Phase 1

Phase 1 (Website Claims Correction) may proceed against **all Tier 1 decisions
immediately**. Red tests assert the floor:

- No "9 products" / "nine products" / "all 9 products" claim anywhere in
  `apps/www-reading-advantage/src/`.
- No "GPT-5" / "GPT-4" / specific-model claim in public marketing copy.
- No "Coming in 2025" / "Launching in 2025" / "Coming in 2026" stale date on any product
  page (the 18-month threshold from `wave2-product-claim-helper.ts` enforces this
  deterministically).
- No "School A (Coming Soon)" / "School B (Coming Soon)" placeholder under a "Real
  Results" heading.
- No "95%" / "2,172+" / "ZERO RISK" / "+50% grammar" / "2x vocab" stat without a paired
  citation/consent artifact (enforced structurally via `wave2-product-claim-helper.ts`).
- The five nonexistent-app pages (Math/STEM/Storytime/Tutor/Zhongwen) either carry a
  "roadmap"/"planned" marker with no launch date, or are removed from the products
  index.

Tier 2 items remain `[b] deferred:po` in `plan.md` and are **not** invented by Phase 1.
The Phase 1 Red tests are written so they pass with neutral/illustrative copy (Tier 1
floor) and would also pass with PO-approved specific copy (Tier 2) once provided —
they assert the *absence of the violation*, not the presence of a specific approved claim.
