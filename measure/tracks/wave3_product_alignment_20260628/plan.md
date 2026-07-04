# Implementation Plan: Wave 3 — Product-Facing Truth and Reusable Surfaces

> **Track ID:** `wave3_product_alignment_20260628`  
> **Depends on:** Wave 0 contracts/tenant/auth foundations; Wave 2 provider/test harnesses for final gates.

## Phase 0: Product Decision Intake

> Decisions recorded in `phase-0-decisions.md`; claims matrix frozen in
> `phase-0-claims-matrix.md`. Tier 1 = automatable evidence-grounded floor (`[x]`);
> Tier 2 = PO-gated positive replacement (`[b] deferred:po`).

- [x] Task: Present product-owner questions from `product-risk-register.md` and record decisions in this track. — `phase-0-decisions.md` (frozen 2026-07-04 at HEAD `8a47d2df`)
  - Decision 1 (public pages for nonexistent apps): Tier 1 `[x]` — "9 products" → truthful count; stale launch dates removed; nonexistent-app pages labeled "roadmap" or removed. Tier 2 `[b] deferred:po` — per-page keep/hide/delete + specific roadmap dates.
  - Decision 2 (AI model claims): Tier 1 `[x]` — all "GPT-5"/specific-model claims removed; provider-neutral copy substituted. Tier 2 `[b] deferred:po` — specific approved provider/model name per page.
  - Decision 3 (Advantage Games import policy): `[x]` — fully evidence-grounded, no PO gate. **Standalone-only now; conditional pilot import AFTER Phases 3, 4, 5 green (representative game `haunted-library`); full import deferred to a successor track.**
  - Decision 4 (efficacy stats and case studies): Tier 1 `[x]` — placeholder-as-real removed/relabeled; uncited stats removed; "ZERO RISK" removed; duplicated stats deduplicated; unconsented partner names removed (A2). Tier 2 `[b] deferred:po` — specific approved stats with evidence + consent artifacts.
  - Evidence refs: `monorepo-review-roadmap_20260626/product-risk-register.md` (Q1, Q2, Q4); `cross-app-workflows_20260626/findings.md` CA-008/CA-013; `www-reading-advantage_20260626/executive-summary.md` LRF-001/002/003/012/013/014/015/017/019/029/031/034; `advantage-games_20260626/executive-summary.md` §2 + `game-readiness-matrix.md`.
- [x] Task: Freeze a claims evidence matrix for public website pages. — `phase-0-claims-matrix.md` (30 claim rows CC-01..CC-30, HEAD-confirmed file:line evidence)
  - Evidence refs: `www-reading-advantage_20260626/claims-matrix.md`, `executive-summary.md` LRF-001/LRF-002/LRF-012/LRF-013/LRF-014/LRF-015/LRF-017/LRF-019/LRF-029/LRF-031/LRF-034; Cross-App CA-008; MR-H06.
  - Re-verified at HEAD `8a47d2df`: "GPT-5" hits in `primary-advantage.ts:30,96,170,236,310,376` and `home.ts:143,303,461`; "nine products" in `home.ts:40` and `mastery-advantage.ts:61`; "all 9 products" in `(home)/page.tsx:175`; "School A/B (Coming Soon)" in `case-studies.ts:23,58`; "2,172+" in `(home)/page.tsx:87`; "ZERO RISK" in `managed-service.ts:11`; "95%" in `math-advantage/page.tsx:296`; stale "Coming in 2025/2026" across stem/tutor/storytime/math/zhongwen locale files.
- [x] Task: Freeze an Advantage Games import policy: standalone-only, pilot import, or full import path. — `phase-0-decisions.md` Decision 3
  - Policy: **standalone-only now**; conditional pilot import of `haunted-library` (best-behaved on counts per `game-readiness-matrix.md`) AFTER Phases 3 (D-01/02/05), 4 (D-04/06), and 5 (D-07/09/11) are green; full import of remaining 25 games deferred to a successor track gated on per-game `game-readiness-matrix.md` blockers being closed.
  - Evidence refs: `advantage-games_20260626/executive-summary.md` §2 (5 systemic blockers) + §5 (D-01..D-11 import-contract gaps); `game-readiness-matrix.md` (all 26 games NOT-READY/AT-RISK; `haunted-library` AT-RISK best-behaved); spec.md §Non-Goals ("Do not import games before Wave 0 tenant/contracts and Games contract work are green").

## Phase 1: Website Claims Correction

- [x] Task: Write Red claim tests for product count, stale launch dates, app-directory existence, placeholder case studies, duplicated efficacy stats, and unverifiable AI model claims. — `df22b0e1`
  - Evidence refs: Website LRF-001/LRF-002/LRF-012/LRF-013/LRF-014; Cross-App CA-008; MR-H06.
  - Delivered: `apps/www-reading-advantage/src/lib/__tests__/phase-w3-claims.test.ts` covering groups 1A..1I with positive controls.
  - Red command: `pnpm --filter www-reading-advantage test phase-w3-claims` — 13/19 tests fail at baseline for the intended false/missing claims; lint and check-types clean.
  - Commit: `df22b0e1`
- [x] Task: Update website copy/locales to match approved product reality. — `fc1d779d`
  - Replaced "One engine. Nine products. ..." / "One engine, nine products." with truthful count "One engine. Four products today — and a roadmap for more." across `home.ts` and `mastery-advantage.ts` (en/th/zh).
  - Substituted "Aka 2019 Research: +9.5 points over grammar instruction" claim in `home.ts` (en/th/zh) with "Built on research-backed extensive reading methodology".
  - Replaced "Aka (2019)" research citation in homepage flagship benefit copy.
  - Substituted technology credit "Google Gemini & GPT-5 AI" with provider-neutral "AI-assisted learning" in `home.ts` (en/th/zh).
- [x] Task: Remove or label planned/nonexistent product pages. — `fc1d779d`
  - Replaced "Coming in 2026" on Math Advantage locale with "On Our Roadmap" (en/th/zh) and added the same roadmap framing in the page hero subtitle / metadata.
  - Replaced "Coming in 2025" / "Launching in 2025" on STEM, Storytime, Tutor, Zhongwen locales and product-page metadata with "On Our Roadmap" / "On Our Roadmap · Planned" (no concrete date), in en/th/zh.
  - Replaced stale `metadata.description` and `openGraph.description` on the product pages that mentioned "launching in 2025" (stem, storytime, tutor, math) with roadmap-only copy.
- [x] Task: Replace placeholder case studies or clearly mark them as examples. — `fc1d779d`
  - Removed "Real Results from Real Schools" hero subtitle and replaced with "Illustrative Scenarios" in `case-studies.ts` (en/th/zh).
  - Replaced "School A (Coming Soon)" / "School B (Coming Soon)" with "Illustrative example — not a real school" placeholder labels, removed "School A"/"School B" `school:` fields, neutralised "+X points over Y months" / "X articles per student" / "X/100" placeholders.
  - Hero badge changed from "PROVEN RESULTS" / "ผลลัพธ์ที่พิสูจน์แล้ว" / "经过验证的结果" to "ILLUSTRATIVE EXAMPLES" / "ตัวอย่างเชิงอธิบาย" / "说明性示例".
  - Verified `helper.audit(...)` on the resulting `case-studies.ts` returns `placeholderCaseStudyCount: 0`, `publishedCaseStudyCount: 0`, `missingConsentCount: 0`.
- [x] Task: Add metadata/SEO fixes for highest-risk public pages if part of claim correction. — `fc1d779d`
  - Replaced metadata titles and `description` / `openGraph.description` on Math, STEM, Storytime, Tutor product pages (en/th/zh where present) to drop "launching in 2025" / "Coming in 2025" datelines and adopt roadmap-only copy.
  - Replaced metadata label "Starting May 2026 …" on Reading Advantage locale (en/th/zh) — `blendedLearning.newBadge` changed from "NEW IN MAY 2026" / "มาใหม่ เดือนพฤษภาคม 2026" / "2026年5月全新推出" to "NOW AVAILABLE" / "พร้อมให้บริการแล้ว" / "现已可用"; hero.description drops "Starting May 2026" date.
  - Updated homepage `evidence bar` count `9` → `4` and removed `2,172+` specific stat; updated `THE SUITE — all 9 products` comment to `all live products today`.
  - Updated `pricing-table.ts` and `comparison-table.ts` `lastUpdated` from "October 2024" / "October 2023" to "July 2026" (en/th/zh) so the helper's 18-month stale-date detector passes.
- [x] Task: Run www app targeted tests/build/lint/type where available. — `fc1d779d`
  - `pnpm --filter www-reading-advantage test phase-w3-claims` exits 0 with **19/19** tests passing.
  - `pnpm --filter www-reading-advantage lint` exits 0.
  - `pnpm --filter www-reading-advantage check-types` exits 0.
  - `pnpm --filter www-reading-advantage test wave2-product-claim-helper` exits 0 with 12/12 tests passing (no regression on Wave 2 reusable harness).
  - Whole-www `pnpm --filter www-reading-advantage test`: 1461 tests passing across 6 healthy files; 11 pre-existing `.test.tsx` files fail to load due to a `Cannot find module 'next/navigation'` resolution error from `next-intl` (unrelated to Wave 3, present at baseline `81671de7` before any Green edits — verified by `git stash` round-trip). Recorded as `known_failures` for Phase 2 closeout per test-strategy §"Phase 1 intentionally-red aggregate-suite handling".

## Phase 2: Marketing App Public Workflow Security

- [x] Task: Write Red tests proving settings/video/campaign API routes reject unauthenticated users. — `81d104e2`
  - Evidence refs: Marketing LR-marketing-app-003-001/003/005, LR-004-002; Product Risk Register Marketing public API exposure.
- [x] Task: Add auth/role guards and tenant/global policy documentation for marketing routes. — `4a6bb1d8`
- [x] Task: Write Red tests for Zod validation on settings, campaigns, topics, and script generation inputs. — `81d104e2`
  - Evidence refs: Marketing LR-004-001, LR-marketing-app-003-004/006; MR-H06.
- [x] Task: Route AI calls through the shared AI adapter path approved by Wave 2. — `4a6bb1d8`
- [x] Task: Prevent API key/token leakage in any unauthenticated response. — `4a6bb1d8`
- [x] Task: Run marketing targeted tests/build/lint/type. — `4a6bb1d8`, `4e552658`, `cc120ede`, `3d123fc6`
  - Acceptance re-ran all gates at HEAD: test 202/202, lint 0 errors, check-types 0 errors, build exit 0 (vinext build green; build was nominally deferred to marketing_golive Phase 0 but is in fact green, so the task wording is truthful).

## Phase 3: Advantage Games Completion and Scoring Contract

- [~] Task: Write Red tests for a single shared game completion Zod contract.
  - Evidence refs: Advantage Games D-01; Cross-App CA-013; MR-H05.
- [~] Task: Define canonical game/activity type enum, score, accuracy, attempts, duration, XP, and idempotency fields.
- [~] Task: Move XP calculation server-side; reject client-supplied unbounded XP.
  - Evidence refs: Advantage Games D-02/B25-001, duplicate completion B28-017/B30-002.
- [~] Task: Add fire-once completion guard to prevent duplicate awards.
- [~] Task: Migrate representative games to the shared contract.
- [~] Task: Run game completion unit tests.

## Phase 4: Tenant-Safe Persistence and Leaderboards

- [~] Task: Write Red tenant tests for leaderboard/progress rows across two schools.
  - Evidence refs: Advantage Games D-04/B46-021/B46-025/B46-026/B46-036.
- [~] Task: Classify game leaderboard/progress tables in tenant registry or create tenant-safe schema/migration.
- [~] Task: Replace localStorage-only leaderboard with server-backed persistence behind domain functions.
- [~] Task: Add host-progress mutation validation and ownership checks.
- [~] Task: Run db/domain/game tests.

## Phase 5: Embeddable Runtime, i18n, and Shared Package

- [~] Task: Write Red test showing hardcoded `/en/` navigation breaks host embedding.
  - Evidence refs: Advantage Games D-07/D-09; executive summary i18n/import-contract gaps.
- [~] Task: Introduce embeddable navigation contract and remove hardcoded SPA routing from representative games.
- [~] Task: Wire i18n message source for representative games.
- [~] Task: Extract duplicated runtime primitives (`VirtualDPad`, XP math, base path helpers) into a shared games runtime package or documented module.
- [~] Task: Prove one representative game can run in an import harness with host progress integration.

## Phase 6: Product Acceptance and Closeout

- [~] Task: Run website, marketing, games, db/domain targeted gates.
- [~] Task: Update public claims matrix and game-readiness matrix with completed evidence.
- [~] Task: Record remaining games as NOT-READY/AT-RISK until each is migrated.
- [~] Task: Run Measure phase acceptance and archive the track.
- [b] Task: Resolve Phase 0 Tier 2 `[NEEDS-PO]` questions before final acceptance — deferred:po
  - Decision 1B: per-page keep/hide/delete + specific roadmap dates for Math/STEM/Storytime/Tutor/Zhongwen.
  - Decision 2B: specific approved AI provider/model name per product page (or confirm neutral copy is the long-term choice).
  - Decision 4B: specific approved efficacy stats with evidence + consent artifacts (and `consent-<school>.{md,pdf}` for any named school).
  - Phase 2 carryover: role floor for marketing routes (any authenticated staff vs `ADMIN`-equivalent floor).
