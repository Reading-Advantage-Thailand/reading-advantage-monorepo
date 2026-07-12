# Specification: APK Cartridge Rebuild, Integration, and Cutover

## Overview

This track governs bounded rebuilding of the Advantage Games corpus through the
accepted APK developer kit and semantic asset system, followed by verified
Reading/Primary host cutover and exact retirement of replaced legacy copies.

Raw games preserve mechanic, learning-loop, and product-identity evidence. Their
Konva/React/R3F implementation, copied infrastructure, file layout, and physical
asset assumptions are not compatibility requirements.

## Required predecessor artifacts

- Exact accepted `apk_independent_acceptance_handoff_20260712` manifest and product-owner acceptance record.
- Accepted corpus and mechanic blueprints.
- Accepted developer-capability and responsive composition matrices.
- Versioned shared APK developer kit and public authoring/testing APIs.
- Accepted semantic-to-physical contracts.
- Validated dual-theme batches covering the selected cohort.
- Stable Zod vocabulary, sentence, cartridge manifest, and `GameResults` contracts.

## Architecture and monorepo boundaries

- Cartridges and APK browser packages must not import Next.js, tRPC, database,
  auth, tenant, application store, or product route code.
- Core game behavior remains transport-independent and deterministic where practical.
- Reading/Primary app layers mount shared cartridges through thin host components.
- Host completion maps `GameResults` plus authenticated server context to shared
  domain functions; app-local business logic is prohibited.
- tRPC is the preferred internal transport adapter where the host already uses
  tRPC. Thin Route Handlers are allowed only for a documented app-local boundary
  and must delegate to the same domain function.
- External input is Zod-validated at the transport boundary.
- User identity and `schoolId` come from authenticated context, never cartridge input.
- Completion writes use tenant-safe shared domain/database access, server-owned XP,
  idempotency, structured errors, and audit/diagnostic metadata where appropriate.
- Package dependency and architecture guards must prevent reverse dependencies and
  copied cartridge/asset trees in host apps.

## Functional requirements

### FR1: Freeze readiness and bounded cohorts

- `cartridge-readiness-matrix.md` maps every in-scope game to mechanic blueprint,
  educational ABI, required APK capabilities, responsive profiles, semantic
  asset states, both-theme availability, host readiness, and blockers.
- A game is Ready only when every Must-have capability and asset for the cohort is
  versioned and accepted.
- Cohorts contain at most five games and share meaningful capabilities without
  erasing product identity.
- Every cohort receives a dedicated child Measure track with exact evidence,
  blast radius, Red tests, responsive matrix, host targets, and legacy disposition.

### FR2: Use the shared developer kit

- Cartridge code uses accepted public APK session, input, gameplay, responsive,
  presentation, semantic asset, diagnostic, and testing capabilities.
- Each repeated requirement is implemented through the shared kit or accompanied
  by an accepted bespoke decision.
- Child tracks may extend APK only after the capability matrix is updated with
  multi-game or infrastructure evidence.
- Title-specific flags and private copies of shared systems are prohibited.
- Bespoke game rules remain in the cartridge and may compose Phaser directly.

### FR3: Consume semantic assets and both themes

- Cartridges request semantic roles/states rather than theme paths or filenames.
- Edition manifests map identical semantic requirements to validated theme files.
- Runtime loading deduplicates physical sources and registers every required state.
- No hard-coded theme paths, copied pack files, procedural production art,
  frame-zero-only substitutes, or unreviewed near matches are allowed.
- Theme changes preserve logic, educational behavior, responsive geometry, and
  result semantics; bounded audience tuning may change game feel only within
  accepted ranges.

### FR4: Preserve game and learning identity

- Rebuilds retain accepted learning input, correct/incorrect action, progression,
  controls, feedback, scoring intent, terminal loop, and five-field result contract.
- Distinct games remain distinct; shared systems do not turn cohorts into reskins.
- Accepted strength/behavior variants and environment kits remain meaningful.
- Renderer-specific bugs and accidental behavior are not preserved.
- Deterministic logic tests prove mechanic and educational invariants before
  browser implementation is accepted.

### FR5: Implement compact and wide compositions

- Every cartridge implements the accepted compact/wide strategy from
  `/measure/apk-responsive-game-composition-spec.md`.
- Layout and input mode resolve independently.
- HUD, prompts, text, controls, feedback, and camera use shared regions/helpers
  unless a documented bespoke composition is accepted.
- Short and worst-case Thai/English content, enlarged accessibility text, resize,
  orientation, and fullscreen transitions pass automated and real-browser gates.
- A uniformly shrunk desktop scene or centered/enlarged phone scene is a failure.

### FR6: Route missing requirements through change control

- A missing shared capability or asset pauses the affected cartridge.
- The requirement returns to the accepted capability/asset matrices with source evidence.
- Reusable versus bespoke classification receives review.
- Shared implementation or both-theme production completes before cartridge work resumes.
- Child tracks cannot add private capability IDs, semantic IDs, or substitutes.

### FR7: Integrate Reading and Primary hosts

- Hosts dynamically import the same cartridge package and select their accepted edition.
- Hosts supply only validated educational content and host callbacks to APK.
- Reading and Primary use shared host-adapter contracts instead of copied game wrappers.
- Completion uses the shared domain function through tRPC where appropriate, with
  tests for authentication, authorization, tenancy, idempotency, authoritative XP,
  malformed results, duplicate submission, and structured errors.
- Host pages provide usable game containers on compact and wide surfaces and do
  not impose a phone-shaped desktop viewport.
- Cartridge bundles, Phaser, and unused games do not inflate unrelated routes.

### FR8: Restore exposure and retire legacy code incrementally

- Catalog and production-route restoration occurs per accepted game.
- Each game has an exact manifest of replacement cartridge, theme pack version,
  host routes, domain/tRPC adapter, imported copies, legacy components, logic,
  routes, assets, and tests.
- Replaced legacy code is deleted only after both host proofs pass.
- Shared legacy files remain until all callers are migrated or receive an explicit
  retained owner.
- Blocked games remain non-playable and are not silently redirected to substitutes.
- Architecture guards prevent reintroduction of deleted copies and renderers.

### FR9: Prove the complete development and production flow

For each accepted cartridge:

- Scaffold/authoring and focused test commands work.
- Advantage Games QC supports fixtures, both themes, compact/wide profiles, real
  input, safe-region diagnostics, completion, restart, and theme changes.
- Reading and Primary host flows load, play, complete, persist, replay, and navigate.
- Domain/tRPC/route tests and browser tests agree on completion behavior.
- Performance, memory, assets, lifecycle, and bundle budgets pass.

## Required verification matrix

- Both themes.
- Compact touch at `360x800` and `390x844`.
- Tablet portrait and landscape.
- Wide pointer-keyboard at `1440x900` and `1920x1080`.
- Hybrid input where supported.
- Short and worst-case Thai/English content.
- Default and enlarged accessibility settings.
- Resize compact-to-wide and back during play.
- Fullscreen/orientation transitions.
- Correct, incorrect, completion, restart, navigation, and theme swap.
- Reading and Primary host completion/persistence.

## Acceptance criteria

- Every restored game uses accepted shared capabilities and justified bespoke logic.
- Every restored game preserves its accepted mechanic and educational identity.
- Both themes and responsive profiles pass automated and real-input verification.
- Reading and Primary consume identical cartridge packages without source/assets copying.
- Completion is Zod-validated, domain-owned, tenant-safe, idempotent, and server-authoritative.
- Exact replaced legacy code is retired with no remaining callers.
- Required coverage, lint, type, test, build, graph, package-boundary, doctor,
  performance, and browser gates pass.
- Independent review leaves no Critical, High, or Medium finding open.
- Product owner explicitly accepts each cohort and final program closeout.

## Out of scope

- Changing vocabulary, sentence, or `GameResults` ABI fields.
- Client-authoritative identity, tenancy, XP, or persistence.
- Generating assets inside cartridge tracks.
- Preserving legacy renderer/file compatibility.
- Bulk restoration without per-game proof.
- Adding public APIs or dedicated API services without a real external boundary.
