# Plan — The Expedition Loop and the World Map (wave 2)

Runs after the APK 3D port merge, Lane F, and the avatar shop. One commit per task; a separate
agent reviews each phase.

## Phase 0: Discovery
- [ ] Read the Forge core (`Quest` API, `quest.ts`, `sim.ts`), the demo host, the 3D port host in Primary, and the lesson track's unlock rules
- [ ] Map the article tables to `story-input`; count articles that give four encounters with no fallback
- [ ] Owner review of the region list: 14 Forge locations in four lands, with Thai names

## Phase 1: The cartridge
- [ ] Port the rules core and its tests into `game-cartridges-3d`
- [ ] 3D view and 2D Phaser view behind the dual-renderer contract; device check and the forced-2D setting
- [ ] Content adapter from the article tables; the importer runs in the monorepo

## Phase 2: The loop in the app
- [ ] "Start the expedition" on the article page after the questions; read-before-play guard; tests
- [ ] Evidence, XP, and stars through the completion path; tests
- [ ] Lesson-flow step in teacher-led mode with the workbook-step unlock; independent mode after the article

## Phase 3: The map
- [ ] Map component with four lands and fourteen regions; avatar position from the level; level-up walk; reduced motion
- [ ] Map on the student home and the Me tab; cleared expeditions mark the region

## Phase 4: Class spell and certificate
- [ ] Projector tallies as one blow on the enemy of the day (reuse Class Quest components)
- [ ] Campaign certificate print page

## Phase 5: Verify
- [ ] Seeded end-to-end run in 3D and 2D; vision QA at 375 and 1280; review; retrospective
