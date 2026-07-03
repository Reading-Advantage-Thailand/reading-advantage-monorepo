# Implementation Plan: Wave 3 — Product-Facing Truth and Reusable Surfaces

> **Track ID:** `wave3_product_alignment_20260628`  
> **Depends on:** Wave 0 contracts/tenant/auth foundations; Wave 2 provider/test harnesses for final gates.

## Phase 0: Product Decision Intake

- [ ] Task: Present product-owner questions from `product-risk-register.md` and record decisions in this track.
- [ ] Task: Freeze a claims evidence matrix for public website pages.
  - Evidence refs: `www-reading-advantage_20260626/claims-matrix.md`, `executive-summary.md` LRF-001/LRF-002/LRF-012/LRF-014.
- [ ] Task: Freeze an Advantage Games import policy: standalone-only, pilot import, or full import path.
  - Evidence refs: `advantage-games_20260626/executive-summary.md` §5 Import-Contract Gaps; `game-readiness-matrix.md`.

## Phase 1: Website Claims Correction

- [ ] Task: Write Red claim tests for product count, stale launch dates, app-directory existence, placeholder case studies, duplicated efficacy stats, and unverifiable AI model claims.
  - Evidence refs: Website LRF-001/LRF-002/LRF-012/LRF-013/LRF-014; Cross-App CA-008; MR-H06.
- [ ] Task: Update website copy/locales to match approved product reality.
- [ ] Task: Remove or label planned/nonexistent product pages.
- [ ] Task: Replace placeholder case studies or clearly mark them as examples.
- [ ] Task: Add metadata/SEO fixes for highest-risk public pages if part of claim correction.
- [ ] Task: Run www app targeted tests/build/lint/type where available.

## Phase 2: Marketing App Public Workflow Security

- [~] Task: Write Red tests proving settings/video/campaign API routes reject unauthenticated users.
  - Evidence refs: Marketing LR-marketing-app-003-001/003/005, LR-004-002; Product Risk Register Marketing public API exposure.
- [ ] Task: Add auth/role guards and tenant/global policy documentation for marketing routes.
- [~] Task: Write Red tests for Zod validation on settings, campaigns, topics, and script generation inputs.
  - Evidence refs: Marketing LR-004-001, LR-marketing-app-003-004/006; MR-H06.
- [~] Task: Route AI calls through the shared AI adapter path approved by Wave 2.
- [~] Task: Prevent API key/token leakage in any unauthenticated response.
- [~] Task: Run marketing targeted tests/build/lint/type.

## Phase 3: Advantage Games Completion and Scoring Contract

- [ ] Task: Write Red tests for a single shared game completion Zod contract.
  - Evidence refs: Advantage Games D-01; Cross-App CA-013; MR-H05.
- [ ] Task: Define canonical game/activity type enum, score, accuracy, attempts, duration, XP, and idempotency fields.
- [ ] Task: Move XP calculation server-side; reject client-supplied unbounded XP.
  - Evidence refs: Advantage Games D-02/B25-001, duplicate completion B28-017/B30-002.
- [ ] Task: Add fire-once completion guard to prevent duplicate awards.
- [ ] Task: Migrate representative games to the shared contract.
- [ ] Task: Run game completion unit tests.

## Phase 4: Tenant-Safe Persistence and Leaderboards

- [ ] Task: Write Red tenant tests for leaderboard/progress rows across two schools.
  - Evidence refs: Advantage Games D-04/B46-021/B46-025/B46-026/B46-036.
- [ ] Task: Classify game leaderboard/progress tables in tenant registry or create tenant-safe schema/migration.
- [ ] Task: Replace localStorage-only leaderboard with server-backed persistence behind domain functions.
- [ ] Task: Add host-progress mutation validation and ownership checks.
- [ ] Task: Run db/domain/game tests.

## Phase 5: Embeddable Runtime, i18n, and Shared Package

- [ ] Task: Write Red test showing hardcoded `/en/` navigation breaks host embedding.
  - Evidence refs: Advantage Games D-07/D-09; executive summary i18n/import-contract gaps.
- [ ] Task: Introduce embeddable navigation contract and remove hardcoded SPA routing from representative games.
- [ ] Task: Wire i18n message source for representative games.
- [ ] Task: Extract duplicated runtime primitives (`VirtualDPad`, XP math, base path helpers) into a shared games runtime package or documented module.
- [ ] Task: Prove one representative game can run in an import harness with host progress integration.

## Phase 6: Product Acceptance and Closeout

- [ ] Task: Run website, marketing, games, db/domain targeted gates.
- [ ] Task: Update public claims matrix and game-readiness matrix with completed evidence.
- [ ] Task: Record remaining games as NOT-READY/AT-RISK until each is migrated.
- [ ] Task: Run Measure phase acceptance and archive the track.
