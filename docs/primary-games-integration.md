# Primary Advantage games integration

How the Primary Advantage app runs the 3D games (2D on older phones) from `@reading-advantage/game-cartridges-3d`
through the story game host of `@reading-advantage/advantage-play-kit-3d`. Track `legacy_games_removal_20261006`.

## One host

`apps/primary-advantage/components/games/game-host.tsx` (`GameHost`) is the only game surface in the app.
Three pages use it:

| Page | Input | Identity |
|---|---|---|
| `/student/games/story` (word adventures list) | the saved items the list already fetched | student |
| `/student/games/apk/[cartridgeId]` (catalog link, challenge link) | fetched saved items, or the class challenge | student or guest |
| `/student/quest/battle` (Class Quest) | the quest's class challenge | student |

The host passes the input and the avatar to the game. A game never fetches. The game internals, the
briefing, and the results belong to the kit (`StoryGameHost`); the app places its panels around them.

## Inputs

- **Practice run.** `GameHost` takes `input` (a `PracticeInput`) from the page, or fetches
  `/api/v1/apk/practice?locale=<th|cn|tw|vi>` (Thai on an English page). `missingItems` from the registry
  locks a game that needs more saved items, with a link to the reading page.
- **Class challenge run.** With `challengeId`, `useStudentChallengeRun` posts `/api/v1/apk/challenges/runs`
  and gets the launch: the content items (the APK `VocabularyInput`) and the server seed. The kit host
  receives the array as `input` and the seed as `seed`; the briefing previews the terms. `replay` is off:
  one launch is one run.
- **English answer audio run.** Hero vs. Zombie, Dragon Flight, and Dragon Rider (`ANSWER_AUDIO_GAME_IDS`
  in `lib/games/answer-audio.ts`) show "Read Thai" and "Listen to English" on the briefing outside a class
  challenge. "Listen to English" fetches `/api/v1/apk/content?mode=vocabulary&locale=th&learningMode=answer-audio&cartridgeId=<id>`:
  the saved words (the APK `VocabularyInput`, at most 50) with one English clip each. The kit host gets the
  words as `input` and `answerAudio`, a factory that makes a new controller for each run; the kit mount
  pauses, mutes, and destroys the controller with the game and checks its evidence against the result.
- `canRunChallenge` (`lib/games/completion.ts`) refuses a launch when the challenge names another game,
  another version, another content mode, another modality than reading, or a difficulty other than medium.

## Game ids

`lib/games/catalog.ts` resolves ids. `gameFor(id)` accepts a 3D id or a legacy 2D catalog id through
`LEGACY_GAME_IDS` (`wizard-vs-zombie` → `hero-vs-zombie`, `labyrinth-goblin-king` → `labyrinth`). The apk
route redirects a legacy id to the 3D id and keeps the query. Quest templates and the reward rules use
the 3D ids; the reward rule (`WARD_GAME_TYPES`) also accepts the stored legacy name. The domain
`gameTypeEnum` lists the 2D ids, the 3D ids, and the `<id>-story` practice runs: before 2026-10-06 the
completion route rejected every `-story` type, so no word adventure run was saved.

The games catalog page and the teacher challenge page list the 3D registry (`playableGames`,
`challengeGames`); `isSentenceGame` groups a game by its `needs`.

## Class challenge capability

The 3D manifests declare `challenge: { version, inputMode, modalities }`. `challengeCapabilityOf(gameId)`
reads it, and `lib/apk/challenge-dependencies.ts` gives it to the challenge routes as
`resolveGameCapability`. A challenge stores the version at creation; a run on an installed game of another
version is refused by the host. Current version: `2026-10-06.1` (hero-vs-zombie, dragon-flight, dragon-rider).

## Completion

`hostCompletionInput` (`lib/games/completion.ts`) maps the kit result to `/api/v1/apk/complete`:

- Practice run: `gameType` is `<gameId>-story`, difficulty medium, the story evidence under
  `metadata.learningEvidence` (the mastery evidence job reads it).
- Challenge run: `gameType` is the challenge's own game id (the contribution rule compares it), the
  challenge difficulty and modality, `challengeRunId`, `metadata.contentSource = "class-challenge"`, and
  the story evidence under `metadata.storyEvidence`. A reading challenge carries no `learningEvidence`.
- English answer audio run: `gameType` is the game id (`hero-vs-zombie`, as the 2D game saved it),
  `metadata.contentSource = "student-flashcards"`, the controller's evidence under
  `metadata.learningEvidence`, and the story evidence under `metadata.storyEvidence`. The completion
  schema requires `totalAttempts` and `correctAnswers` to equal the submitted and the completing choices;
  the Echo Staff rule reads this evidence.

`save={false}` (`?mode=demo` on the apk route) posts nothing. The games need no demo flag: the app host
decides what it saves.

## RPG rewards

With an `ownerKey`, `useStudentRpg` loads the reward state. The kit reports its screen through `onPhase`:
the host shows `RpgRewardDisclosure` beside the briefing, calls `beginSession` when the game starts,
refreshes after a saved completion, and shows `RpgUnlockNotice` on the results when a cosmetic unlocked.
A reward goes to the inventory (`rewardInInventory`); the student wears it from the avatar page.

## Class Quest

The battle page resolves the quest template's game with `gameFor` and renders `GameHost` with the quest's
`challengeId`. `onCompleted` gives the battle client the saved numbers for its heartbeat.

## Legacy host

`components/apk/StudentCartridgeHost.tsx` and `@reading-advantage/game-cartridges` stay in the tree until
M4 (after the cutover). No Primary page renders them.
