# Plan — Legacy games removal

Waits for the owner's go on the plan (sent through the Forge session 2026-10-06).

## Phase 1: M1 host (before the cutover)
- [ ] Challenge run mount on StoryGameHost: content as VocabularyInput, server seed, helper off, challengeRunId on the completion, no learningEvidence for a reading challenge
- [ ] resolveGameCapability reads manifest.challenge from the 3D registry (not CARTRIDGE_CHALLENGE_CAPABILITIES)
- [ ] Reward panels (inventory note), demo launch, briefing phase, quest battle callback, avatar on every page
- [ ] docs/primary-games-integration.md

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
