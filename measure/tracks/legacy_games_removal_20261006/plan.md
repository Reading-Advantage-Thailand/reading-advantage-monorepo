# Plan — Legacy games removal

Owner approved the plan as proposed on 2026-10-06 (through the Forge session). M1 runs on lane-g (`primary/lane-g-new-game-host`).

## Phase 1: M1 host (before the cutover)
- [x] Kit host: `input: PracticeInput | GameInput`, `seed`, `replay`, `onPhase`; briefing previews an APK input
- [x] `GameHost` (components/games): challenge run on the server content and seed, helper off, `challengeRunId` on the completion, no learningEvidence for a reading challenge
- [x] resolveGameCapability reads manifest.challenge from the 3D registry (not CARTRIDGE_CHALLENGE_CAPABILITIES)
- [x] Reward panels (inventory note), demo launch (`save={false}`), briefing phase, quest battle callback, avatar on every page
- [x] StoryGamesClient, quest battle, and apk/[cartridgeId] render `GameHost`; legacy ids redirect through `LEGACY_GAME_IDS`
- [x] docs/primary-games-integration.md
- [ ] Browser check of the three pages (needs a free heavy slot for the Primary build)

## Phase 2: M2 ids (before the cutover)
- [ ] Quest templates, reward rules, challenge capabilities on the new ids and version 2026-10-06.1
- [ ] Alias map for old completions; apk/[cartridgeId] redirects by it
- [ ] grantCompletionCosmetics on new-game completions; Echo Staff waits for F2

## Phase 3: M3 and M4 (after the cutover)
- [ ] Reading Advantage and Advantage Games: practice input, new game pages, teacher challenge pages
- [ ] Remove game-cartridges, the legacy-only host code, host-proof and QC pages, the ElvGames assets

## Gates
- [ ] Tests, tsc, ESLint green
- [ ] Browser check: a class challenge on Hero vs. Zombie from the teacher page to the quest battle result
