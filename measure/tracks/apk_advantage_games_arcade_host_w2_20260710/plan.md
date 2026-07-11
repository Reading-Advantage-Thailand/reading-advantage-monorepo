# Implementation Plan: APK Advantage Games Arcade Host W2

> **Track ID:** `apk_advantage_games_arcade_host_w2_20260710`
> **Predecessor:** `apk_incomplete_sentence_action_20260710`

## Planning Evidence

- `apps/advantage-games/next.config.ts` still uses `output: "export"`; current `/complete` routes are forced-static mock validators.
- `@reading-advantage/auth` already owns the database session cookie and `@reading-advantage/api/routes/auth` owns username/password login.
- `recordGameCompletion` already enforces permission, tenant scope, server XP, transactionality, and race-safe idempotency.
- `APKGameHost`, `cartridgeLoaders`, and both edition manifests already provide the generic client runtime; W2 should compose them rather than create per-game pages.
- Graph baseline: 24,140 nodes / 48,138 edges / 2,896 files; `APKGameHost` is package-owned and app catalog surfaces are isolated to app files.

## Phase S1: Activate first-party student sessions
_Story ref: spec.md#story-s1_
_Blast radius: Next config, shared login handler, session cookie adapter, login/arcade route guards, package dependencies._

- [x] Task: Define the dynamic-host and session contracts (8611070b)
  - [x] Freeze login/session/error/redirect schemas and cookie boundaries
  - [x] Specify static-export removal and request-time route expectations
- [x] Task: Add Red auth and dynamic-host tests (8611070b)
  - [x] Cover valid/invalid login, expired/missing session, role safety, cookie flags, and no provider coupling
  - [x] Prove API routes are no longer forced-static mocks
- [x] Task: Implement app-local auth adapters and routes (8611070b, 839cdc23)
  - [x] Delegate login/logout/session lookup to shared packages and create the accessible login screen
  - [x] Remove static export constraints without changing unrelated game routes
- [x] Task: Verify auth package, app tests, type-check, and build (839cdc23)
- [~] Task: Measure - User Manual Verification 'Phase S1: Activate first-party student sessions' — browser evidence complete; awaiting product-owner confirmation

## Phase S2: Mount the production cartridge host
_Story ref: spec.md#story-s2_
_Blast radius: APKGameHost, cartridgeCatalog/loaders, edition resolver, catalog cards, generic student route._

- [x] Task: Define production host and content-selection contracts (8611070b)
  - [x] Freeze exact five-ID routing, input-mode fixture selection, edition selection, and unknown-ID behavior
  - [x] Specify one-canvas lifecycle and app/package import boundaries
- [x] Task: Add Red generic host and route tests (8611070b, 839cdc23)
  - [x] Cover all five IDs, both input modes, both editions, unknown IDs, restart, and navigation cleanup
  - [x] Require no copied cartridge source or per-game APK pages
- [x] Task: Implement the generic authenticated arcade route (8611070b, 839cdc23)
  - [x] Build one server route plus client host adapter around package loaders and stable fixtures
  - [x] Preserve client-only Phaser isolation and responsive controls
- [x] Task: Run component, package-boundary, and browser lifecycle gates (839cdc23)
- [~] Task: Measure - User Manual Verification 'Phase S2: Mount the production cartridge host' — Kimi and Playwright evidence complete; awaiting product-owner confirmation

## Phase S3: Persist completion server-side
_Story ref: spec.md#story-s3_
_Blast radius: gameCompletionInputSchema/gameTypeEnum, recordGameCompletion, DB session/TenantDB creation, generic APK completion route._

- [x] Task: Define the authenticated completion adapter contract (8611070b)
  - [x] Freeze request/response, auth, tenant, origin, error, and idempotency behavior
  - [x] Add the two W1 IDs to authoritative schemas only behind persistence proof
- [x] Task: Add Red route, domain, security, and adversarial tests (8611070b, 839cdc23)
  - [x] Cover success, duplicate, concurrent, invalid payload, client XP/identity/tenant, cross-origin, and missing-school cases
  - [x] Require no raw DB business logic in the route and no mock completion fallback
- [x] Task: Implement server-owned persistence wiring (8611070b)
  - [x] Resolve session and TenantDB then delegate to recordGameCompletion
  - [x] Map structured domain/auth/validation failures without leaking internals
- [x] Task: Run domain, DB-contract, route, type, architecture, and build gates (839cdc23)
- [~] Task: Measure - User Manual Verification 'Phase S3: Persist completion server-side' — live first-write/duplicate/concurrent evidence complete; awaiting product-owner confirmation

## Phase S4: Ship the continuous arcade loop
_Story ref: spec.md#story-s4_
_Blast radius: gameCards, MainMenu catalog, production host completion UI, Playwright APK flows, exact first-five legacy manifest._

- [x] Task: Define catalog, next-game, and safe-cutover contracts (0e1e699d)
  - [x] Freeze production hrefs, deterministic rotation, saved-result UI, and legacy path dispositions
  - [x] Keep QC directly reachable for developer testbed use
- [x] Task: Add Red catalog, completion-loop, accessibility, and deletion guards (0e1e699d, 839cdc23)
  - [x] Cover login to save to next-game on desktop, keyboard-only, and 390x844 touch
  - [x] Prove unrelated/concurrent legacy files are retained
- [x] Task: Implement the production catalog cutover and arcade continuation (0e1e699d)
  - [x] Replace five QC/legacy hrefs with generic production routes and add replay/catalog/next actions
  - [x] Delete only verified caller-free first-five legacy surfaces, if any
- [x] Task: Run final W2 acceptance, graph update, review, and Measure closeout preparation (839cdc23)
- [~] Task: Measure - User Manual Verification 'Phase S4: Ship the continuous arcade loop' — browser evidence complete; awaiting product-owner confirmation

## Verification Evidence (2026-07-11)

- Focused Jest: 11 suites / 69 tests passed.
- Shared APK lifecycle: 3 tests passed, including delayed StrictMode startup with one canvas.
- Domain games contracts: 33 tests passed.
- Focused W2 coverage: 90.27% statements and lines.
- Playwright Chromium: 3/3 flows passed at 390x844 and 1440x900; keyboard edition switching, no horizontal overflow, one-canvas remounts, concurrent idempotency, and next-cartridge mounting passed.
- Kimi WebBridge: student login, one canvas, edition remount, first-write/duplicate persistence, and exact five-link catalog cutover passed.
- Production `next build`: passed; auth, session, generic arcade, and completion routes are dynamic.
- Mandatory review: no Critical/High findings; two Medium findings remediated by 839cdc23 and sent for re-review.
