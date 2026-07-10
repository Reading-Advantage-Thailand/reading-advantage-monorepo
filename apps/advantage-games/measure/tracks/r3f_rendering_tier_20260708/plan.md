# Implementation Plan: R3F 3D Rendering Tier

Track: r3f_rendering_tier_20260708

## Phase S1: Adopt the R3F stack [checkpoint: ddf1a46]
_Story ref: spec.md#story-s1_

- [x] Task: Define rendering-tier contract in tech-stack.md (5308f37)
    - [x] Add "Rendering Tiers" section: Konva = 2D default, R3F = 3D/2.5D option
    - [x] Document pure-logic + thin-render-layer rule for R3F games
    - [x] Document per-game `next/dynamic` loading requirement (no three.js on 2D routes)
    - [x] Document mobile perf budget (low-poly, DPR cap ≤2, instancing, portrait 390×844)
    - [x] Document `@react-three/rapier` as approved-but-deferred physics choice
- [x] Task: Install R3F dependencies (83eb17b)
    - [x] Add `three`, `@react-three/fiber`, `@react-three/drei`,
          `@react-three/postprocessing` to dependencies (catalog: where available)
    - [x] Add `@react-three/test-renderer`, `@types/three` to devDependencies
    - [x] Verify `pnpm install` and `pnpm build` pass
- [x] Task: Write failing smoke test for R3F test harness (Red) (4961592)
    - [x] Test: minimal scene renders under `@react-three/test-renderer` in Jest,
          scene-graph assertions (mesh present, position/props correct)
    - [x] Add any required Jest config/mocks (WebGL/canvas) to jest.config.ts / jest.setup.ts
          (only IS_REACT_ACT_ENVIRONMENT needed; no transform changes)
- [x] Task: Implement R3F smoke component to pass tests (Green) (fd2a4b2)
    - [x] Create `src/components/games/r3f/SmokeScene.tsx` (or equivalent) minimal component
    - [x] Confirm tests pass without a GPU; document harness pattern in a code comment
- [x] Task: Verify quality gates for Phase S1 (1dd7800)
    - [x] `pnpm lint`, `pnpm check-types`, `CI=true pnpm test` all pass
          (fixed StartScreen React.ElementType/JSX-augmentation clash; scoped
          react/no-unknown-property off for *Scene.tsx R3F files)
- [x] Task: Measure - User Manual Verification 'Phase S1: Adopt the R3F stack' (Protocol in workflow.md) (ddf1a46)

## Phase S2: Rewrite The Abyssal Well in R3F
_Story ref: spec.md#story-s2_

- [x] Task: Retype Abyssal Well logic contract to SentenceItem (7d335dd)
    - [x] Write/adjust failing tests asserting `SentenceItem[]` input typing (Red)
    - [x] Change `abyssalWell.ts` / `abyssalWellConfig.ts` from `VocabularyItem` to
          `SentenceItem`; all existing logic tests pass (Green)
    - [x] Mark the Abyssal Well line of the VocabularyItem/SentenceItem tech-debt item resolved
- [x] Task: Write failing render-layer tests for R3F Abyssal Well (Red) (638bfe8)
    - [x] Scene-graph tests via @react-three/test-renderer: tube geometry, lane positions,
          enemy meshes track logic-state depth, projectile meshes, camera setup
    - [x] Component tests: start screen, HUD (lives/sentence/target word), game end screen,
          fullscreen + accessibility hooks wired, i18n/session mocks
- [x] Task: Implement R3F render layer (Green) (e7f124f)
    - [x] Create `AbyssalWellScene` (R3F Canvas: perspective camera into the well, lane
          geometry, enemy/projectile meshes, drei Text for words, postprocessing bloom)
    - [x] Rewrite `AbyssalWellGame.tsx` to compose scene + existing start/end screens,
          HUD, input handling (lane move + fire), rAF-driven tick of the pure logic module
    - [x] Load the game via `next/dynamic` (ssr: false) at the existing route
          (already in place at page level — verified)
    - [x] Delete the Konva render code from the game component
- [x] Task: Compliance and coverage pass (a2411be)
    - [x] Run the 25-spec compliance checklist; fix any failures (25/25, 1 documented
          deviation: R3F canvas per Rendering Tiers contract; report in track dir)
    - [x] Coverage >80% across the game's files (94.57% stmts, 73 tests)
- [x] Task: Mobile performance verification (b41b3cc)
    - [x] DPR cap + low-poly/instanced geometry in place (dpr [1,2], meshBasic only, low-poly)
    - [x] Manual check at 390×844 portrait; stable frame rate on mid-range device/emulation
          (rendering verified in browser against prod export; live FPS blocked by tab
          occlusion suspending rAF — folded into phase manual verification)
- [x] Task: Verify quality gates for Phase S2 (e759292)
    - [x] `pnpm lint`, `pnpm check-types`, `CI=true pnpm test` all pass (189 suites / 1824 tests)
    - [x] Confirm 2D game routes show no three.js in their client bundles (build output check:
          three in one async chunk, referenced only by abyssal-well pages en/zh/th)
- [b] Task: Measure - User Manual Verification 'Phase S2: Rewrite The Abyssal Well in R3F' (Protocol in workflow.md) (deferred:cancelled-by-user)

## Phase S5: Pedagogically sound cycling gameplay with smooth motion
_Story ref: spec.md#story-s5_
_Added 2026-07-08 from Phase S2 user-verification feedback; executed before S2's manual
verification task so the user verifies the corrected game once._

- [x] Task: Redesign logic contract — cycling words, mistake lives, continuous angle (Red)
    - [x] Rewrite abyssalWell logic tests: all words spawn at start (random angle/staggered
          depth), breach wraps with per-lap speedup, wrong hit costs life + word survives,
          correct hit collects in order, shots-fired accuracy, hold-to-rotate continuous
          angle via setRotation + dt integration, angular-proximity collision
- [x] Task: Implement redesigned logic module (Green)
    - [x] Rework abyssalWell.ts state/advance/fire/rotation; update abyssalWellConfig
          (rotationSpeed, angularHitTolerance, lapSpeedup; drop spawnInterval mechanics)
- [x] Task: Update render layer for new rules (Red then Green)
    - [x] wellProjection: angle-based positioning API; update tests
    - [x] Scene: single enemy color (no target highlight), angle positions; update tests
    - [x] Game: keydown/keyup + touch hold-to-rotate, built-sentence HUD (no Target
          display), rewritten start-screen instructions; update tests
- [b] Task: Verify quality gates for Phase S5 (deferred:cancelled-by-user)
    - [x] `pnpm lint`, `pnpm check-types`, `CI=true pnpm test` all pass; coverage >80%
          (lint/typecheck pass; full Jest 190 suites / 1824 tests; scoped coverage 94.71%)
    - [b] Browser smoke test of the new gameplay (deferred:cancelled-by-user)
          (HTTP route smoke returned 200; headless Chrome CDP attempts were cleaned up but
          failed before stable hydrated gameplay verification)
- [b] Task: Measure - User Manual Verification 'Phase S5: Cycling gameplay' (Protocol in workflow.md) (deferred:cancelled-by-user)

## Phase S6: KayKit dungeon-fantasy asset pass (deferred:cancelled-by-user)
_Story ref: spec.md#story-s6_
_Added 2026-07-08. Rethemes The Abyssal Well from primitive geometry to the KayKit 3D house
style, proving the GLB-asset pipeline for the R3F tier. Blocked on KayKit pack files landing
in `public/assets/3d/kaykit/` (see `kaykit-asset-shopping-list.md` in this track dir). No
custom models required — creature types swap to KayKit Skeleton variants so the game stays
100% KayKit. **All tasks below deferred:cancelled-by-user.**_

- [b] Task: Swap CreatureType to skeleton variants (Red) (deferred:cancelled-by-user)
    - [b] Update abyssalWellConfig tests + abyssalWell tests for `skeleton-scout` /
          `skeleton-warrior` / `skeleton-mage` (slow / medium / fast); logic behavior
          unchanged, only creature-type keys + labels move (deferred:cancelled-by-user)
    - [b] Change `CreatureType` union and `creatureSpeeds` keys in `abyssalWellConfig.ts` (deferred:cancelled-by-user)
    - [b] Update `AbyssalWellGame.tsx` start-screen option labels + instruction copy (deferred:cancelled-by-user)
- [b] Task: Write failing scene tests for the KayKit retheme (Red) (deferred:cancelled-by-user)
    - [b] Scene-graph tests via `@react-three/test-renderer`: stone-well mesh uses loaded
          GLB geometry/material, torch light nodes present, skeleton enemy meshes (3
          variants) track logic-state depth, adventurer player mesh replaces the cone,
          projectile meshes use RPG-Tools visuals (deferred:cancelled-by-user)
    - [b] Assert the shared loader resolves from `public/assets/3d/kaykit/` paths (mock
          `useGLTF` in the test harness; no network/GPU) (deferred:cancelled-by-user)
- [b] Task: Implement the KayKit render layer (Green) (deferred:cancelled-by-user)
    - [b] Add a shared loader (drei `useGLTF` + `SkeletonUtils.clone` for animated models;
          preload + `<Suspense>` fallback) — colocated with the scene or under
          `src/components/games/r3f/` for reuse by future R3F games (deferred:cancelled-by-user)
    - [b] Rework `AbyssalWellScene.tsx`: KayKit Dungeon Remastered stone well walls (on the
          existing cylinder geometry or modular ring), rim torches as `pointLight`s, KayKit
          Skeleton enemies with drei `<Text>` word labels, KayKit Adventurer player on the
          rim, RPG-Tools projectiles; warm-bloom palette replacing neon cyan (deferred:cancelled-by-user)
    - [b] Update `AbyssalWellGame.tsx` camera/background/palette as needed; keep DOM HUD,
          input handling, rAF tick, and shared start/end screens unchanged (deferred:cancelled-by-user)
- [b] Task: Compliance and coverage pass (deferred:cancelled-by-user)
    - [b] Re-run the 25-spec checklist; update `compliance-report.md` (the R3F-canvas
          deviation from S2 remains; asset-dir spec now points at the shared KayKit family
          location `public/assets/3d/kaykit/`) (deferred:cancelled-by-user)
    - [b] Coverage >80% across the game's files (deferred:cancelled-by-user)
- [b] Task: Mobile performance verification (deferred:cancelled-by-user)
    - [b] DPR cap + instanced/low-poly GLBs in place; manual check at 390×844 portrait;
          stable frame rate on mid-range device/emulation (deferred:cancelled-by-user)
- [b] Task: Verify quality gates for Phase S6 (deferred:cancelled-by-user)
    - [b] `pnpm lint`, `pnpm check-types`, `CI=true pnpm test` all pass (deferred:cancelled-by-user)
    - [b] Confirm 2D game routes still show no three.js in their client bundles (the KayKit
          GLBs load only on the abyssal-well route via `next/dynamic`) (deferred:cancelled-by-user)
- [b] Task: Measure - User Manual Verification 'Phase S6: KayKit asset pass' (Protocol in workflow.md) (deferred:cancelled-by-user)

## Phase S3: Stack-selection gate in the game creation workflow
_Story ref: spec.md#story-s3_

- [x] Task: Define stack-decision criteria (acceptance draft)
    - [x] Draft decision criteria: camera/depth/lighting/3D motion → R3F; flat/board/lane
          2D → Konva; faking 3D in Konva explicitly disallowed (Abyssal Well v1 lesson)
- [x] Task: Update vocab-game-builder skill
    - [x] Add "Rendering Stack" decision step to Discovery Phase in
          `.claude/skills/vocab-game-builder/SKILL.md`
    - [x] Add R3F scaffolding guidance mirroring Konva sections (Canvas setup, pure-logic
          rule, drei helpers, test-renderer patterns, next/dynamic loading)
    - [x] Cross-reference tech-stack.md Rendering Tiers section
- [x] Task: Record lessons learned
    - [x] Add "don't fake 3D in a 2D canvas" + R3F harness lessons to
          `measure/lessons-learned.md` (respect 50-line bound; condense old entries if needed)
- [x] Task: Verify quality gates for Phase S3
    - [x] Docs-only phase: verify skill file loads (front-matter valid), links resolve
- [b] Task: Measure - User Manual Verification 'Phase S3: Stack-selection gate' (Protocol in workflow.md) (deferred:cancelled-by-user)

## Phase S4: R3F game candidates brainstorm and seeded tracks
_Story ref: spec.md#story-s4_

- [x] Task: Audit existing games for R3F rebuild candidates
    - [x] Review UNPUBLISHED-GAMES-REPORT.md and weak/unimplemented games for 3D fit
- [x] Task: Write r3f-game-candidates.md
    - [x] New 3D/2.5D concepts: each with stack-fit rationale, vocab/sentence mechanic,
          rough size (S/M/L)
    - [x] Rebuild candidates from existing catalog with same rationale format
- [x] Task: Seed follow-up tracks
    - [x] Add top 2–3 candidates as unstarted stub entries in measure/tracks.md linking
          to the candidates doc
- [x] Task: Verify quality gates for Phase S4
    - [x] Docs-only phase: links resolve, tracks.md format consistent
- [b] Task: Measure - User Manual Verification 'Phase S4: Candidates brainstorm' (Protocol in workflow.md) (deferred:cancelled-by-user)
