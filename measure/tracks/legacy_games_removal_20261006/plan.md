# Plan — Legacy games removal

Owner approved the plan as proposed on 2026-10-06 (through the Forge session). M1 runs on lane-g (`primary/lane-g-new-game-host`).

## Phase 1: M1 host (before the cutover)
- [x] Kit host: `input: PracticeInput | GameInput`, `seed`, `replay`, `onPhase`; briefing previews an APK input
- [x] `GameHost` (components/games): challenge run on the server content and seed, helper off, `challengeRunId` on the completion, no learningEvidence for a reading challenge
- [x] resolveGameCapability reads manifest.challenge from the 3D registry (not CARTRIDGE_CHALLENGE_CAPABILITIES)
- [x] Reward panels (inventory note), demo launch (`save={false}`), briefing phase, quest battle callback, avatar on every page
- [x] StoryGamesClient, quest battle, and apk/[cartridgeId] render `GameHost`; legacy ids redirect through `LEGACY_GAME_IDS`
- [x] docs/primary-games-integration.md
- [x] Browser check of the three pages (2026-10-07, production build): the word adventures page opens all 28 games (scratch copy, QA student with saved cards); `apk/hero-vs-zombie` shows the briefing with the saved words and the "Read Thai" / "Listen to English" choice, and `apk/wizard-vs-zombie` redirects to it; the English answer audio run starts (Thai prompt, four audio choices, the word file loads on a touch); the quest battle (shared local database, a QA class with Origins 2, quest moved open → rally → play by the QA teacher through the API) shows the game host in the arch on a phone. Gap seen: the "You" box on the battle page is empty for a student with no hero

## Phase 1b: English answer audio in GameHost (owner priority, 2026-10-07)
Owner, 2026-10-07: "merge, but prioritize this feature". Lane-g merged into integration (6af080159) on the unit checks. Until this phase ends, the new host has no English answer audio mode (Thai question, English answer clips), which only `StudentCartridgeHost` started.
- [x] Controller: a play that ends cancelled or failed uses no replay (`packages/advantage-play-kit/src/audio/answer-choice-controller.ts`, test); send Forge the commit (F2 Q2) — 677ade328, Forge copy 300760b3
- [x] Content route: prepared answer audio for the 3D ids `hero-vs-zombie`, `dragon-flight`, `dragon-rider` (the legacy `wizard-vs-zombie` stays until M4)
- [x] Kit host (`host/story-game.ts`): an `answerAudio` factory makes one controller per run for `mount()`; `onComplete` passes the answer evidence — a4ba7be4f
- [x] `GameHost`: the reading or English answer audio choice for the three games outside a class challenge; the prepared content and the controller; the answer evidence posted as `metadata.learningEvidence`, the story evidence kept for the results screen — 97656f1d1. The choice shows only when the manifest lists `read-to-select-audio` (Forge gate, 2026-10-07), so a game without its audio mode never starts an audio run
- [x] F2 part A sync on `apk3d-games-port`: Forge `factory/mount.ts` with `answerAudio`, `MONOREPO_OWNED` re-exports for `contracts/listening.ts` and `audio/answer-choice.ts`, fixture compares for the two listening schemas — 500b28563, a683e9d1d (Forge 58f06d5a), in integration
- [x] F2 part B sync, Hero vs. Zombie (Forge 24c0a24e, monorepo 6dd0ec837, in integration): the audio mode and the manifest modality; the host calls `cartridge.briefing(i18n, input, { answerAudio: true })` in an audio run
- [ ] F2 part B sync, Dragon Flight and Dragon Rider (each one when its manifest lists the modality)
- [x] Browser check: one English answer audio run on Hero vs. Zombie saves a completion with the answer evidence (2026-10-07, production build in the runner layout, QA student on the scratch copy, 2D view `?renderer=phaser` driven by the QC hook `auto()`): 34 rounds to `complete`; the word clips load as segments (206); `/api/v1/apk/complete` 200; `game_completions` has the victory with `learningEvidence` (`read-to-select-audio`, th-TH prompt, en-US answer, 34 questions)

## Phase 1c: saved words reach the games; answer audio from the article word audio (owner option A, 2026-10-07)
Defect found 2026-10-07: the Primary reader saves words and sentences in `flashcard_decks` / `flashcard_cards` (source_id = article id), but the games read `user_word_records` / `user_sentence_records`, which Primary never writes. Production has no single-word clips: the answer audio manifest (`APK_WIZARD_SPEECH_MANIFEST`) is set nowhere. Every article has `audios/words/<articleId>.mp3` with each word's start time in `sentencs_and_words_for_flashcard.words`.
- [x] Clip contract: optional `startSeconds` and `endSeconds` on the prepared clip and the clip reference; the browser port plays only that segment and shares one element per URL; send Forge the diff first — 585bb9431, Forge copy eb7a69e6
- [x] Domain: the Primary saved items from the flashcard store, with each word's translation and audio segment from its article (`listPrimaryPracticeInput`, `listPrimaryAnswerAudioContent`)
- [x] Primary routes: `/api/v1/apk/practice` and the answer audio content read the Primary store; answer audio needs no manifest
- [x] Browser check with a student who saves words in the app (owner rule: never seeded data): after the lessons all 28 word adventures are open and use the saved words and sentences (2026-10-07)
- [ ] "Listen to English" plays clean word segments on Android Chrome and iOS Safari (needs the devices)
- [x] The legacy flashcards move in the ETL (track `primary_legacy_data_migration_20261004`): integration 92d87807c, 3,678 cards
- [x] Defect found 2026-10-07: the answer clip factory dropped `startSeconds` and `endSeconds`, so every choice played the full word file (2bf0c9ae0)
- [x] Defect found 2026-10-07: the reader's flashcard activities (deck review, lesson flashcards, lesson matching) read `word`, `definition`, `sentence`, `translation`, and `audioUrl` from the raw card rows, which keep only `front` and `source_id`, so every card showed an empty face and the matching game could crash. `listPrimaryDeckCards` and `listPrimaryArticleCards` read the content from the article; a saved sentence takes its translation from the same line of `translated_passage` (the games had used the short snapshot list)
- [x] Browser check of the deck review and the lesson flashcards with a student who saves words and sentences (2026-10-07, production build, QA student on the scratch copy; the cards were saved by three lessons, because the reader's sentence menu has only "Translate"): Vocabulary offers 35 cards to review and opens a card with its audio; Sentences offers 10
- [x] Defect found 2026-10-07 in the browser check: a student saves cards only through the lesson (task 7) or by finishing an article's questions (`saveArticleToFlashcard`; the reader's sentence menu has only "Translate" since the move into the monorepo). That function read `cardSentence` and `cardTranslation` from the snapshot, but all 622 snapshots store `sentence` and `translation`, so every sentence insert failed on a null `front` and no student could save a sentence (18 of the 28 games need 3). `snapshotSentenceEntries` (`lib/flashcard-snapshot.ts`) reads the snapshot keys; test
- [x] Defect found 2026-10-07 in the browser check: the Vocabulary and Sentences pages counted a card with no `flashcard_progress` row as new but not due, and they open a review only for due cards, so a saved card never opened a review ("All caught up", "25 mastered" for 25 unreviewed words). `getDashboardData` counts a card with no review as new and due (an FSRS new card is due at once); test
- [x] Browser check of the lesson flashcards (task 9 words, task 11 sentences): the cards show the saved word with audio, and the saved sentence with its Thai translation

## Phase 2: M2 ids (before the cutover)
- [x] Quest templates, reward rules, challenge capabilities on the new ids and version 2026-10-06.1 (`hero-vs-zombie`; `WARD_GAME_TYPES` keeps the stored legacy name)
- [x] Alias map for old completions (`LEGACY_GAME_IDS`); apk/[cartridgeId] redirects by it (M1)
- [x] grantCompletionCosmetics on new-game completions (`hero-vs-zombie`, `hero-vs-zombie-story`); Echo Staff waits for F2
- [x] Echo Staff for the dragon games (owner decision 2026-10-07): a perfect English answer audio run of `dragon-flight` or `dragon-rider` earns it; the ward quests stay on Hero vs. Zombie (`ECHO_GAME_TYPES`)
- [x] Domain `gameTypeEnum` accepts the 3D ids and the `<id>-story` runs — defect found: the completion route rejected every story run before this (no word adventure was ever saved)
- [x] Games catalog page and teacher challenge page list the 3D registry; seed-demo resolves the capability from the manifests

## Phase 3: M3 and M4 (after the cutover)
- [ ] Reading Advantage and Advantage Games: practice input, new game pages, teacher challenge pages
- [ ] Remove game-cartridges, the legacy-only host code, host-proof and QC pages, the ElvGames assets

## Gates
- [x] Tests, tsc, ESLint green (2026-10-07 on integration: Primary 224 files / 1335 tests, domain 151 files /
  1733 tests after two test fixes, tsc for Primary and domain, ESLint on Primary with no errors)
- [x] Browser check: a class challenge on Hero vs. Zombie from the teacher page to the quest battle result
  (2026-10-07, production build, scratch copy with the four class books copied from the local database,
  QA teacher and QA student): the teacher assigns The Goblin King's Raid on `/teacher/quest`, opens the
  live dashboard from the class card, and moves rally → battle → result → done with its buttons; on a
  phone the student sees the waiting, rally, and battle states, plays one Hero vs. Zombie run in the
  arch (2D view, QC hook `auto()`, completion 200), and sees "The boss fell!" (20 of 14 damage); the
  dashboard shows the hit; rows: quest `done`, 75 GP `battle` in the ledger, heartbeat 10 of 10
