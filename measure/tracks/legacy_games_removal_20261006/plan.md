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

## Phase 1b: English answer audio in GameHost (owner priority, 2026-10-07)
Owner, 2026-10-07: "merge, but prioritize this feature". Lane-g merged into integration (6af080159) on the unit checks. Until this phase ends, the new host has no English answer audio mode (Thai question, English answer clips), which only `StudentCartridgeHost` started.
- [x] Controller: a play that ends cancelled or failed uses no replay (`packages/advantage-play-kit/src/audio/answer-choice-controller.ts`, test); send Forge the commit (F2 Q2) — 677ade328, Forge copy 300760b3
- [x] Content route: prepared answer audio for the 3D ids `hero-vs-zombie`, `dragon-flight`, `dragon-rider` (the legacy `wizard-vs-zombie` stays until M4)
- [x] Kit host (`host/story-game.ts`): an `answerAudio` factory makes one controller per run for `mount()`; `onComplete` passes the answer evidence — a4ba7be4f
- [x] `GameHost`: the reading or English answer audio choice for the three games outside a class challenge; the prepared content and the controller; the answer evidence posted as `metadata.learningEvidence`, the story evidence kept for the results screen — 97656f1d1. The choice shows only when the manifest lists `read-to-select-audio` (Forge gate, 2026-10-07), so a game without its audio mode never starts an audio run
- [x] F2 part A sync on `apk3d-games-port`: Forge `factory/mount.ts` with `answerAudio`, `MONOREPO_OWNED` re-exports for `contracts/listening.ts` and `audio/answer-choice.ts`, fixture compares for the two listening schemas — 500b28563, a683e9d1d (Forge 58f06d5a), in integration
- [x] F2 part B sync, Hero vs. Zombie (Forge 24c0a24e, monorepo 6dd0ec837, in integration): the audio mode and the manifest modality; the host calls `cartridge.briefing(i18n, input, { answerAudio: true })` in an audio run
- [ ] F2 part B sync, Dragon Flight and Dragon Rider (each one when its manifest lists the modality)
- [ ] Browser check: one English answer audio run on Hero vs. Zombie saves a completion with the answer evidence

## Phase 1c: saved words reach the games; answer audio from the article word audio (owner option A, 2026-10-07)
Defect found 2026-10-07: the Primary reader saves words and sentences in `flashcard_decks` / `flashcard_cards` (source_id = article id), but the games read `user_word_records` / `user_sentence_records`, which Primary never writes. Production has no single-word clips: the answer audio manifest (`APK_WIZARD_SPEECH_MANIFEST`) is set nowhere. Every article has `audios/words/<articleId>.mp3` with each word's start time in `sentencs_and_words_for_flashcard.words`.
- [x] Clip contract: optional `startSeconds` and `endSeconds` on the prepared clip and the clip reference; the browser port plays only that segment and shares one element per URL; send Forge the diff first — 585bb9431, Forge copy eb7a69e6
- [x] Domain: the Primary saved items from the flashcard store, with each word's translation and audio segment from its article (`listPrimaryPracticeInput`, `listPrimaryAnswerAudioContent`)
- [x] Primary routes: `/api/v1/apk/practice` and the answer audio content read the Primary store; answer audio needs no manifest
- [ ] Browser check with a student who saves words in the reader (owner rule: never seeded data): a word adventure unlocks, and "Listen to English" plays clean word segments on Android Chrome and iOS Safari
- [x] The legacy flashcards move in the ETL (track `primary_legacy_data_migration_20261004`): integration 92d87807c, 3,678 cards
- [x] Defect found 2026-10-07: the answer clip factory dropped `startSeconds` and `endSeconds`, so every choice played the full word file (2bf0c9ae0)
- [x] Defect found 2026-10-07: the reader's flashcard activities (deck review, lesson flashcards, lesson matching) read `word`, `definition`, `sentence`, `translation`, and `audioUrl` from the raw card rows, which keep only `front` and `source_id`, so every card showed an empty face and the matching game could crash. `listPrimaryDeckCards` and `listPrimaryArticleCards` read the content from the article; a saved sentence takes its translation from the same line of `translated_passage` (the games had used the short snapshot list)
- [ ] Browser check of the deck review and the lesson flashcards with a student who saves words and sentences in the reader

## Phase 2: M2 ids (before the cutover)
- [x] Quest templates, reward rules, challenge capabilities on the new ids and version 2026-10-06.1 (`hero-vs-zombie`; `WARD_GAME_TYPES` keeps the stored legacy name)
- [x] Alias map for old completions (`LEGACY_GAME_IDS`); apk/[cartridgeId] redirects by it (M1)
- [x] grantCompletionCosmetics on new-game completions (`hero-vs-zombie`, `hero-vs-zombie-story`); Echo Staff waits for F2
- [x] Domain `gameTypeEnum` accepts the 3D ids and the `<id>-story` runs — defect found: the completion route rejected every story run before this (no word adventure was ever saved)
- [x] Games catalog page and teacher challenge page list the 3D registry; seed-demo resolves the capability from the manifests

## Phase 3: M3 and M4 (after the cutover)
- [ ] Reading Advantage and Advantage Games: practice input, new game pages, teacher challenge pages
- [ ] Remove game-cartridges, the legacy-only host code, host-proof and QC pages, the ElvGames assets

## Gates
- [ ] Tests, tsc, ESLint green
- [ ] Browser check: a class challenge on Hero vs. Zombie from the teacher page to the quest battle result
