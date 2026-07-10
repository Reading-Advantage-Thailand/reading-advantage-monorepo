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

- [~] Task: Define the dynamic-host and session contracts
  - [b] Freeze login/session/error/redirect schemas and cookie boundaries — deferred:sequence
  - [b] Specify static-export removal and request-time route expectations — deferred:sequence
- [b] Task: Add Red auth and dynamic-host tests — deferred:sequence
  - [b] Cover valid/invalid login, expired/missing session, role safety, cookie flags, and no provider coupling — deferred:sequence
  - [b] Prove API routes are no longer forced-static mocks — deferred:sequence
- [b] Task: Implement app-local auth adapters and routes — deferred:sequence
  - [b] Delegate login/logout/session lookup to shared packages and create the accessible login screen — deferred:sequence
  - [b] Remove static export constraints without changing unrelated game routes — deferred:sequence
- [b] Task: Verify auth package, app tests, type-check, and build — deferred:sequence
- [b] Task: Measure - User Manual Verification 'Phase S1: Activate first-party student sessions' — deferred:product-owner

## Phase S2: Mount the production cartridge host
_Story ref: spec.md#story-s2_
_Blast radius: APKGameHost, cartridgeCatalog/loaders, edition resolver, catalog cards, generic student route._

- [b] Task: Define production host and content-selection contracts — deferred:sequence
  - [b] Freeze exact five-ID routing, input-mode fixture selection, edition selection, and unknown-ID behavior — deferred:sequence
  - [b] Specify one-canvas lifecycle and app/package import boundaries — deferred:sequence
- [b] Task: Add Red generic host and route tests — deferred:sequence
  - [b] Cover all five IDs, both input modes, both editions, unknown IDs, restart, and navigation cleanup — deferred:sequence
  - [b] Require no copied cartridge source or per-game APK pages — deferred:sequence
- [b] Task: Implement the generic authenticated arcade route — deferred:sequence
  - [b] Build one server route plus client host adapter around package loaders and stable fixtures — deferred:sequence
  - [b] Preserve client-only Phaser isolation and responsive controls — deferred:sequence
- [b] Task: Run component, package-boundary, and browser lifecycle gates — deferred:sequence
- [b] Task: Measure - User Manual Verification 'Phase S2: Mount the production cartridge host' — deferred:product-owner

## Phase S3: Persist completion server-side
_Story ref: spec.md#story-s3_
_Blast radius: gameCompletionInputSchema/gameTypeEnum, recordGameCompletion, DB session/TenantDB creation, generic APK completion route._

- [b] Task: Define the authenticated completion adapter contract — deferred:sequence
  - [b] Freeze request/response, auth, tenant, origin, error, and idempotency behavior — deferred:sequence
  - [b] Add the two W1 IDs to authoritative schemas only behind persistence proof — deferred:sequence
- [b] Task: Add Red route, domain, security, and adversarial tests — deferred:sequence
  - [b] Cover success, duplicate, concurrent, invalid payload, client XP/identity/tenant, cross-origin, and missing-school cases — deferred:sequence
  - [b] Require no raw DB business logic in the route and no mock completion fallback — deferred:sequence
- [b] Task: Implement server-owned persistence wiring — deferred:sequence
  - [b] Resolve session and TenantDB then delegate to recordGameCompletion — deferred:sequence
  - [b] Map structured domain/auth/validation failures without leaking internals — deferred:sequence
- [b] Task: Run domain, DB-contract, route, type, architecture, and build gates — deferred:sequence
- [b] Task: Measure - User Manual Verification 'Phase S3: Persist completion server-side' — deferred:product-owner

## Phase S4: Ship the continuous arcade loop
_Story ref: spec.md#story-s4_
_Blast radius: gameCards, MainMenu catalog, production host completion UI, Playwright APK flows, exact first-five legacy manifest._

- [b] Task: Define catalog, next-game, and safe-cutover contracts — deferred:sequence
  - [b] Freeze production hrefs, deterministic rotation, saved-result UI, and legacy path dispositions — deferred:sequence
  - [b] Keep QC directly reachable for developer testbed use — deferred:sequence
- [b] Task: Add Red catalog, completion-loop, accessibility, and deletion guards — deferred:sequence
  - [b] Cover login to save to next-game on desktop, keyboard-only, and 390x844 touch — deferred:sequence
  - [b] Prove unrelated/concurrent legacy files are retained — deferred:sequence
- [b] Task: Implement the production catalog cutover and arcade continuation — deferred:sequence
  - [b] Replace five QC/legacy hrefs with generic production routes and add replay/catalog/next actions — deferred:sequence
  - [b] Delete only verified caller-free first-five legacy surfaces, if any — deferred:sequence
- [b] Task: Run final W2 acceptance, graph update, review, and Measure closeout preparation — deferred:sequence
- [b] Task: Measure - User Manual Verification 'Phase S4: Ship the continuous arcade loop' — deferred:product-owner
