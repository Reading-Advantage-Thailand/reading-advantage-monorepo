# Advantage Games — independent gameplay and leftover-route audit

Copied from `measure/audit-reports/advantage-games-ux-wiring_20260819-independent/README.md`.
This is Part 1 and Part 2 of that independent walk. Asset tables stay in [assets.md](./assets.md).
The merge note is in [comparison.md](./comparison.md).

**Scope.** All 28 cartridges in the public catalog (`packages/game-cartridges/src/catalog.ts`) and
the surfaces that launch them in `apps/advantage-games`. The method was a graph walk of the
repository, then one deep audit for each game against the real source.

**Result.** 273 findings. Part 1 holds 13 defects that hit every game. Part 2 holds the per-game
findings. Every finding names a file and a line.

**Note on the count.** The catalog holds 28 cartridges, not 27. An older product list held 27 titles
and included Babel's Architect. The catalog dropped that title and added Astral Mage and The
Sorcerer's Ziggurat, so the live count is 28.


**Related.** [comparison.md](./comparison.md) sets this report against the earlier audit in
`advantage-games-ux-wiring_20260819/`, and lists what each one covers that the other does not.

---

## Part 1 — Defects that hit every game

These 13 defects come from the shared host, the shared standard experience, and the shared catalog.
One fix for each defect corrects all 28 games.

### C1. No game loads any art (blocker)
Every cartridge reads `context.edition` only to copy `edition.id` into a diagnostic message. No
cartridge reads `edition.pack.files` or `edition.bindings`. Verified across all 24 cartridge source
files in `packages/game-cartridges/src/`. Each scene draws with `this.add.graphics` and
`this.add.text` only.
Impact: all 28 games show colored rectangles and text. `requiredAssetBindings` is decorative.

### C2. Both hosts bind every asset key to one placeholder image (blocker)
`AuthenticatedCartridgeHost.tsx:83-92` and `PublicCartridgeHost.tsx:77-86` loop over
`requiredAssetBindings` and point every key at one 192x384 QC preview file,
`asset-6aeab3f50c0f6be4.png`.
Impact: even if C1 were fixed, every semantic binding would resolve to the same placeholder.

### C3. The shipped art and sound are unreachable (major)
`apps/advantage-games/public/games/` holds 233 MB of per-game art and `public/sounds/` holds 31 MB
of audio. The APK host has no audio path, and no cartridge references a sound file.
Impact: finished art and sound for about 20 games ship to the browser and never appear.

### C4. The end-screen exit gives a 404 (blocker)
`AuthenticatedCartridgeHost.tsx:286` sends the student to `/<locale>/student/games`. No
`student/games/page.tsx` exists. `src/app/[locale]/` also has no `page.tsx`, so `/en` is a 404 too.
The only catalog is at `/`.
Impact: "exit to catalog" from the end screen of every game gives a 404 page.

### C5. The Exit button is dead on the public arcade route (major)
`apk-game-host.tsx:634` calls `onNavigate?.(...)`. `PublicCartridgeHost.tsx:179-189` passes no
`onNavigate`.
Impact: on `/[locale]/student/arcade/<id>` the Exit button does nothing for all 28 games.

### C6. The catalog hardcodes the English locale (major)
`src/app/page.tsx:13-15` — `resolveGameHref` returns `/en${href}`.
`apk/[cartridgeId]/page.tsx:15-21` then maps the route locale to the content locale.
Impact: a Thai or Chinese student who starts a game from the catalog always gets English content.

### C7. A signed-out student sees a raw error and has no login link (blocker)
`content-route.ts:121` returns 401 "Authentication required". `AuthenticatedCartridgeHost.tsx:260`
prints that message as red text inside the black play surface. `src/app/page.tsx` has no login link,
although `src/app/login/page.tsx` exists.
Impact: a signed-out student clicks any of the 28 cards and reaches a dead error screen.

### C8. The pointer and touch hints repeat the keyboard sentence (major)
`standard-experience.ts:59-61` sets the Click and Tap hint text to `mechanicInstruction`, which is
written for keys, for example "Move left or right to choose a translation gate".
Impact: on a tablet the start screen of every game gives a control hint that does not fit the device.

### C9. Every end screen credits art that never loads (minor)
`standard-experience.ts:123` sets `requiredCredit: "Pixel art assets by ElvGames"`, and
`game-presentation.tsx:325` prints it.
Impact: every debrief credits pixel art, while the game shows rectangles.

### C10. The runtime asset root ignores basePath (minor)
`AuthenticatedCartridgeHost.tsx:102` and `PublicCartridgeHost.tsx:98` hardcode
`root: "/assets/apk/standard-pack-qc/"`. `next.config.ts:18` supports a basePath, and
`gameCards.ts` uses `withBasePath` for covers.
Impact: under a basePath deployment the runtime assets 404 while the covers load.

### C11. The leaderboard is empty and unreachable (major)
`useLeaderboard` has two consumers: the leaderboard page and the legacy `GameEndScreen.tsx`. No APK
path writes a score. The single link, `GameEndScreen.tsx:180`, points to `/student/leaderboard` with
no locale segment.
Impact: the leaderboard shows nothing for all 28 APK games, and no live screen links to it.

### C12. 26 stale legacy game pages stay publicly reachable (blocker)
26 pages remain under `student/games/sentence/<id>` and `student/games/vocabulary/<id>`.
21 link to `/student/games` with no locale segment, 12 link to `/student/articles`, and 14 hold
hardcoded Thai literals. Neither target route exists, and there is no `middleware.ts`.
Impact: a second, older, broken version of most games is reachable by URL, in the wrong language,
with dead exits.

### C13. The public arcade route is an orphan (minor)
Nothing in `src/` links to `/[locale]/student/arcade/<cartridgeId>`.
Impact: the only route that runs the games without a login is undiscoverable.

### Note on the replay path
`standard-experience.ts:125` sets `replayEntry: "briefing"` and line 65 sets `startPhase: "tutorial"`.
`apk-game-host.tsx:481` follows that setting. Every replay of every game therefore repeats the
briefing and the guided tutorial. A Skip control exists during the tutorial.

---

## Part 2 — Per-game findings

### castle-defense

#### The game deadlocks after the sixth sentence wave
- **blocker** | content
- Evidence: packages/game-cartridges/src/castle-defense.ts:369-376 defines only 6 tower slots. Line 836-840 buildTower returns noOp() when no free slot is near the player. Line 877-889 startNextWave never frees a slot or removes a tower. Line 735 creates the tower list once. The wave count equals the sentence count (line 714 waveCount = sentences.length). apps/advantage-games/src/components/apk/AuthenticatedCartridgeHost.tsx:170 requests content with no limit, and packages/domain/src/games/learning-content.ts:22 sets the default limit to 50. A full scene playthrough with 8 sentences stops at wave 7: phase stays "collecting", towers = 6, and the confirm key returns event "ignored".
- Impact: A student who saved 7 or more sentences can never finish the game. The seventh sentence collects fully, but the build key does nothing. The session never ends, so the student gets no result, no XP, and no end screen.

#### The castle can never fall, so the promised defeat never happens
- **major** | end-screen
- Evidence: packages/game-cartridges/src/catalog.ts:142 declares "capability:castle-health-hazards". packages/game-cartridges/src/castle-defense.ts:1344 states the objective "Place every sentence word in order before the castle falls." Line 928 is the only gameplay defeat, and it needs base health to reach zero. Line 963-967 applyHazard is never called by the scene (the only references are lines 271, 963, and 1091). Tower range is 520 (line 361) and covers the full 960x540 map, with 60 damage every 300 ms (lines 362-363), while an enemy needs 5000 ms to cross a route (line 364). Simulated sessions with seeds 0, 1, 7, 13, 99, and 12345 and with 1, 3, and 6 sentences always end in victory with base health 100 of 100.
- Impact: The student always sees "Base 100/100" in the status bar. The loss end screen and the message "The castle has fallen." are unreachable. The start-screen objective and the catalog hazard promise are false.

#### The first tutorial step can do nothing or show the correct action
- **major** | tutorial
- Evidence: packages/game-cartridges/src/castle-defense.ts:1356 selects the wrong word with `state.nextWordIndex + 1 < state.targetCount`. targetCount counts every word in the whole session (line 715), but collectWord only accepts a word index inside the current sentence (lines 774-779). Test 1: content [{term:"hello"},{term:"bye"}] gives targetCount 2 and 1 word in the sentence; after "action:select-incorrect" the attempts stay 0 and lastOutcome stays undefined. Test 2: content [{term:"hello"}] gives targetCount 1, so wrongIndex becomes 0 and the step collects the CORRECT word: lastOutcome becomes "correct" and correctAnswers becomes 1. Test 3: after the "Replay tutorial" button restarts the steps on a two-word sentence, the incorrect step is a no-op again (attempts stay 2, lastOutcome stays "correct").
- Impact: The student reads the step "See how feedback helps" and the text "The demonstration selects one incorrect option", but the screen shows no change. With one-word content the same step shows a successful collection, which teaches the opposite lesson.

#### Student keys control the real game during the guided tutorial
- **major** | tutorial
- Evidence: packages/game-cartridges/src/castle-defense.ts:1307 runs processInput when `context.sessionMode !== "demo"`. The host mounts the cartridge with sessionMode "tutorial" before it starts the tutorial (packages/advantage-play-kit/src/react/apk-game-host.tsx:321). Other cartridges gate input on "playing" only, for example packages/game-cartridges/src/abyssal-well.ts:1200 and packages/game-cartridges/src/dungeon-liberator.ts:1426. A test press of ArrowLeft in tutorial mode moved the player from x=480 to x=416.
- Impact: The student can move, collect words, and build a tower while the tutorial plays. The scripted demonstration then shows a different state than the narration. If the student builds a tower, the phase leaves "collecting" and both tutorial steps stop working (line 1350).

#### The screen tells the student to build while building is blocked
- **major** | content
- Evidence: packages/game-cartridges/src/castle-defense.ts:1221-1222 shows "The chain is complete. Move near a slot and confirm to build." whenever sentenceComplete is true. The feedback list has no branch for the "defending" phase. Line 837 makes buildTower return noOp() when the phase is not "collecting". A scene playthrough showed this same text during every defending phase and also in the wave-7 deadlock.
- Impact: For the whole enemy wave, and forever in the deadlock, the game asks the student to press the build key. The key does nothing and the screen gives no other message.

#### The start screen omits the Enter key that builds towers
- **minor** | start-screen
- Evidence: packages/game-cartridges/src/castle-defense.ts:1346 lists keyboardKeys ["A", "D", "W", "S", "Arrow keys", "Space"]. Line 39 binds Enter to the "confirm" action, and the in-game instruction line 1224 shows "Space or Enter to build".
- Impact: The briefing and the in-game help disagree. A student who reads only the start screen does not learn that Enter builds a tower.

#### The catalog description says the student places words, but the student places towers
- **minor** | description-mismatch
- Evidence: packages/game-cartridges/src/catalog.ts:134 and the cartridge manifest packages/game-cartridges/src/castle-defense.ts:1365 both read "Build a castle defense by placing sentence words in order." The card text apps/advantage-games/src/lib/gameCards.ts:16 reads "Collect words to build towers and defend your castle!" The mechanic collects words (line 780-810) and then builds one tower per sentence (line 836-861).
- Impact: The catalog text and the briefing subtitle promise word placement. The student instead walks onto words and then builds a tower, so the card and the briefing describe the game differently.

#### Legacy page links lead to pages that do not exist
- **major** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/castle-defense/page.tsx:125, :227, and :244 link to "/student/games". Line 219 links to "/student/articles". The app has no such routes; the only page files are listed under apps/advantage-games/src/app, and there is no games or articles page. The links also have no locale segment, and there is no middleware.ts in apps/advantage-games.
- Impact: Every "Back to Games" control and the "go read articles" button on the legacy Castle Defense page give a 404 page. The student has no way back to the catalog.

#### The legacy page shows Thai text to every student
- **major** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/castle-defense/page.tsx:110 shows the loading text "กำลังโหลด". Lines 143-144, 150, 155-166, 188-191, 201-211, and 223 hold Thai headings, counts, steps, and button text. These strings are literals, not translation keys.
- Impact: An English or Chinese student sees Thai text for the loading state, the empty-content warning, the save instructions, and one button label.

#### A stale second Castle Defense is reachable and uses fixed sample content
- **major** | legacy-page
- Evidence: The route apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/castle-defense/page.tsx exists, and apps/advantage-games/src/app/[locale]/layout.tsx has no authentication check. The page reads /api/v1/games/castle-defense/sentences (page.tsx:48-50). That route is force-static (apps/advantage-games/src/app/api/v1/games/castle-defense/sentences/route.ts:2) and returns the fixed list in apps/advantage-games/src/lib/games/sampleSentences.ts:3-14, which holds 10 sentences with Thai translations only. apps/advantage-games/src/lib/games/api/sentencesRoute.ts:4-35 ignores the locale query.
- Impact: A student who opens /en/student/games/sentence/castle-defense plays a different, older Castle Defense. It uses 10 demo sentences instead of the student's own flashcards, and it always shows Thai translations.

#### The legacy leaderboard button always shows an empty list
- **minor** | legacy-page
- Evidence: apps/advantage-games/src/components/games/sentence/castle-defense/CastleDefenseGame.tsx:431-438 opens the ranking dialog, and line 444 passes apiEndpoint="/api/v1/games/castle-defense/ranking". apps/advantage-games/src/app/api/v1/games/castle-defense/ contains only complete and sentences. apps/advantage-games/src/components/games/vocabulary/dragon-flight/RankingDialog.tsx:55-58 keeps data null when the response is not ok, and lines 106-118 then show the empty state.
- Impact: The trophy button on the legacy start screen always shows "no champions". The student cannot see any ranking.

#### Mouse users cannot press the Skip tutorial button
- **minor** | tutorial
- Evidence: packages/advantage-play-kit/src/presentation/game-tutorial-screen.tsx:161 attaches the skip command with onTouchEnd only. Line 160 uses onPointerUp for replay, which a mouse does fire. This shared screen renders the Castle Defense tutorial through packages/advantage-play-kit/src/react/apk-game-host.tsx:575-582.
- Impact: A student on a desktop computer clicks "Skip tutorial" and nothing happens. Only a touch screen can skip. This defect is in shared presentation code and affects Castle Defense.

*Checked and correct:* The cover image is correct. apps/advantage-games/src/lib/gameCards.ts:17 points to /games/cover/castle-defense-cover.png, and the file exists in apps/advantage-games/public/games/cover/. The catalog entry and the cartridge manifest agree on every field: id, title, description, version 0.1.0, runtimeApiVersion 1.0.0, inputMode sentence, one required asset binding, and the three capability strings (packages/game-cartridges/src/catalog.ts:131-144 against packages/game-cartridges/src/castle-defense.ts:1362-1375). The loader at catalog.ts:553-554 resolves the correct module. Every key on the start screen works: A, D, W, S, and the four arrow keys move the player, and Space builds a tower (packages/game-cartridges/src/castle-defense.ts:28-40). Word positions are always reachable, because the player step is 64 pixels and the collection radius is 52 pixels; a simulated student collected every word in every tested seed. The second tutorial step, action:select-correct, works correctly for normal multi-word sentences. Victory works: sessions with 1 to 6 sentences all delivered a victory result with the correct accuracy, score, and XP. The public arcade route uses a two-sentence fixture (apps/advantage-games/src/lib/apk/public-sentence-fixture.ts:4-7), so the six-slot deadlock does not affect the public preview. The legacy art files that the old page loads all exist in apps/advantage-games/public/games/sentence/castle-defense/.


### dragon-rider

#### The correct gate shows the answer, so the student needs no vocabulary knowledge
- **blocker** | content
- Evidence: packages/game-cartridges/src/legacy-traversal-cartridges.ts:291 — `const label = action === state.correctAction ? state.answer : `${ACTION_LABELS[action]} route`;`. The correct gate prints the translation. The other gate prints the fixed text "Left route" or "Right route". There is no distractor translation. packages/game-cartridges/src/legacy-traversal-cartridges.ts:168 — `correctAction: options.actions[displayIndex % options.actions.length]!` makes the correct side alternate left, right, left, right for every session.
- Impact: The student sees the answer written on the correct gate and can also win by pressing Left and Right in turn. The game measures no vocabulary knowledge, and the score, accuracy, and XP the student receives are not earned.

#### The catalog and start screen promise growth and a final guardian that the game does not contain
- **major** | description-mismatch
- Evidence: packages/game-cartridges/src/catalog.ts:81 and packages/game-cartridges/src/legacy-traversal-cartridges.ts:439 both say "Choose translation gates, grow your flight, and face the final guardian." The scene draws only a background, one panel, one circle, and two rounded rectangles (legacy-traversal-cartridges.ts:279-293). The controller holds only targetIndex, score, and attempt counts (legacy-traversal-cartridges.ts:145-219). There is no growth value, no boss, and no timer. The old logic did contain them: apps/advantage-games/src/lib/games/dragonRider.ts:119 (timer), :128 (calculateBossPower), :137-138 (dragonCount against bossPower).
- Impact: The student reads about a dragon that grows and a final guardian on the catalog page and again on the start screen. The student then plays a two-button quiz with no dragon, no growth, and no guardian.

#### The catalog card text and the start-screen text describe two different games
- **major** | catalog-drift
- Evidence: apps/advantage-games/src/lib/gameCards.ts:24 says "Ride your dragon to protect your village". packages/game-cartridges/src/catalog.ts:81 says "Choose translation gates, grow your flight, and face the final guardian." The route page passes the catalog text to the host, and the host shows it under the title and as the briefing subtitle (apps/advantage-games/src/app/[locale]/(student)/student/games/apk/[cartridgeId]/page.tsx:38, apps/advantage-games/src/components/apk/AuthenticatedCartridgeHost.tsx:249).
- Impact: The student clicks a card that promises village defense and then reads a different promise about gates and a guardian. Neither text describes the real mechanic.

#### The game has no defeat path, so the end screen always shows Victory
- **major** | end-screen
- Evidence: packages/game-cartridges/src/legacy-traversal-cartridges.ts:411 is the only completion call: `(result) => context.complete(result, "victory")`. An incorrect choice only records an attempt and returns (legacy-traversal-cartridges.ts:182-185). There are no lives, no timer, and no hazard. packages/advantage-play-kit/src/react/apk-game-host.tsx:617 passes that outcome to the result panel, and packages/advantage-play-kit/src/presentation/game-presentation.tsx:317 prints "Victory" for it. The old game did compute defeat: apps/advantage-games/src/lib/games/dragonRider.ts:138.
- Impact: The student always reaches a Victory end screen, even after many wrong choices. The description promises a final guardian, so the student expects a possible loss. The end screen cannot report one.

#### The legacy Dragon Rider page has two dead navigation links
- **major** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/dragon-rider/page.tsx:99 (`href="/en/student/games"`, the "Back to Games" button) and :113 (`href="/en/student/games"`, the "Back to Menu" button). The directory apps/advantage-games/src/app/[locale]/(student)/student/games/ holds only apk, sentence, and vocabulary. It has no page.tsx, so the target route does not exist. The path also hardcodes /en.
- Impact: The student presses "Back to Menu" or "Back to Games" and reaches a 404 page. A Thai or Chinese student also loses the chosen locale.

#### The legacy Dragon Rider page never saves a result
- **major** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/dragon-rider/page.tsx:65-69 posts the raw results object to /api/v1/games/dragon-rider/complete. apps/advantage-games/src/lib/games/api/completeRoute.ts:40-50 validates the body with gameCompletionInputSchema and returns 400 when the body carries `xp` or lacks gameType and idempotencyKey. apps/advantage-games/src/lib/games/dragonRider.ts:141-149 returns an object that contains xp, bossPower, victory, and dragonCount, and it contains no gameType or idempotencyKey. fetch resolves for a 400 response, so the catch block at page.tsx:70-72 never runs.
- Impact: The student finishes the legacy game and receives no XP and no progress record. The page shows no error, so the student believes the result was saved.

#### The legacy Dragon Rider page serves fixed sample words instead of the student flashcards
- **major** | legacy-page
- Evidence: apps/advantage-games/src/app/api/v1/games/dragon-rider/vocabulary/route.ts:4-6 marks the route force-static and returns SAMPLE_VOCABULARY. apps/advantage-games/src/lib/games/sampleVocabulary.ts:3-27 holds 25 fixed Thai terms with English translations. apps/advantage-games/src/lib/games/api/vocabularyRoute.ts:8-35 ignores every query parameter, so the `?locale=` value sent at page.tsx:32 has no effect.
- Impact: The student practices 25 fixed Thai words instead of the saved flashcards. A Thai student receives the prompt in the native language and must supply the English word, which reverses the intended direction.

#### A stale second version of Dragon Rider stays publicly reachable
- **major** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/dragon-rider/page.tsx exists and renders apps/advantage-games/src/components/games/vocabulary/dragon-rider/DragonRiderGame.tsx. The app has no middleware file and the (student) group has no layout.tsx guard. apps/advantage-games/src/hooks/useSession.ts returns a fixed mock user with status "authenticated", so the page never blocks a visitor.
- Impact: The student can open /en/student/games/vocabulary/dragon-rider and play an older Dragon Rider with a boss, a timer, and dragon growth. That version records no progress. The student then meets a different Dragon Rider through the catalog card and cannot tell which one counts.

#### The legacy page shows English-only text to every student
- **minor** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/dragon-rider/page.tsx:48 ("Failed to load vocabulary"), :52 ("Failed to load game data. Please try again."), :81 ("Loading Dragon Rider..."), :92 ("Adventure Paused"), :95-96 (the tip text), :102 ("Back to Games"), :115 ("Back to Menu"). The game component itself uses useScopedI18n (DragonRiderGame.tsx:389), so only the page frame stays untranslated.
- Impact: A Thai or Chinese student reads English loading text, English error text, and English buttons around a translated game.

#### A correct choice gives no success message
- **minor** | content
- Evidence: packages/game-cartridges/src/legacy-traversal-cartridges.ts:302 sets the feedback line to "Route complete!" at the end, to "That route is blocked. Try again." after an incorrect choice, and otherwise back to the mechanic instruction. The controller does set lastOutcome to "correct" (legacy-traversal-cartridges.ts:184), but the view never reads that value.
- Impact: The student receives a clear message for a wrong choice and no message for a right choice. Tutorial step 2, titled "Advance the learning target", therefore demonstrates a correct choice with no visible success signal.

#### The play screen shows no total target count
- **minor** | content
- Evidence: packages/game-cartridges/src/legacy-traversal-cartridges.ts:299 prints `Target ${Math.min(state.targetIndex + 1, ...)}` and never prints the length of the target list. The controller holds targets.length (legacy-traversal-cartridges.ts:146) but does not expose it in the snapshot (legacy-traversal-cartridges.ts:157-174).
- Impact: The student sees "Target 4" with no total and cannot tell how many words remain before the game ends.

*Checked and correct:* The cover file apps/advantage-games/public/games/cover/cover-dragon-rider.png exists, so the card image loads (gameCards.ts:25). The catalog entry and the cartridge manifest agree on every field: id, title, description, version 0.1.0, runtimeApiVersion 1.0.0, inputMode vocabulary, requiredAssetBindings ["dragon-rider/player-flight"], and capabilities (catalog.ts:79-87 against legacy-traversal-cartridges.ts:397-405 and 437-447). The four start-screen keyboard keys all work: A and Left Arrow give move-left, D and Right Arrow give move-right (legacy-traversal-cartridges.ts:443-445). No listed key is dead, and no working key is absent from the list. Both tutorial steps make a real demonstration. The cartridge has two actions, so options.actions.find always returns an incorrect action for step 1 (legacy-traversal-cartridges.ts:388-390). The host mounts a separate tutorial-mode controller and remounts a new controller for play, so the tutorial does not change the graded session (apk-game-host.tsx:281-317, 253-279). Pointer input divides the canvas at x = 480, and the two gates occupy x 248-468 and x 492-712, so a tap never selects the opposite gate (legacy-traversal-cartridges.ts:241-251, 275-288).


### magic-defense

#### The fixed 60-second timer does not scale with the deck size, so a full flashcard deck is unwinnable
- **blocker** | content
- Evidence: packages/game-cartridges/src/magic-defense.ts:36 sets MAGIC_DEFENSE_DEFAULT_TIMER_SECONDS = 60. packages/game-cartridges/src/magic-defense.ts:1076-1080 always passes that constant, and ignores the number of vocabulary items. packages/game-cartridges/src/magic-defense.ts:605 calls enterDefeat("timer") when the timer reaches zero. The authenticated host requests the content without a limit parameter (apps/advantage-games/src/components/apk/AuthenticatedCartridgeHost.tsx:170), and packages/domain/src/games/learning-content.ts:22 defaults the limit to 50 items. I ran the built controller (packages/game-cartridges/dist/magic-defense.js) with 50 items and one correct answer every 2 seconds: the session ends at 60 s with phase=defeat, reason=timer, 29/50 words solved, accuracy 1.00. With 30 items and one correct answer every 2 seconds the result is the same defeat at 29/30.
- Impact: A student who answers every word correctly still gets the defeat end screen. To win a 50-word deck the student must type one correct translation every 1.2 seconds, which is not possible.

#### Typed answers accept only ASCII keys, so Thai, Chinese and Vietnamese translations can never be typed
- **blocker** | content
- Evidence: packages/game-cartridges/src/magic-defense.ts:337-350 (inputCharacter) converts only Key[A-Z], Digit[0-9], Numpad[0-9], Space and six punctuation codes into characters. packages/advantage-play-kit/src/runtime/input.ts:68-69 supplies KeyboardEvent.code, which is the physical key and is layout independent, so a Thai key press arrives as "KeyA" and produces the Latin letter "a". packages/game-cartridges/src/magic-defense.ts:552 compares the typed buffer with the item translation. packages/domain/src/games/learning-content.ts:21 defaults the content locale to "th", and apps/advantage-games/src/lib/apk/public-vocabulary-fixture.ts:5-8 supplies Thai translations to the public arcade route. The briefing declares typing as the mechanic (packages/game-cartridges/src/magic-defense.ts:1047-1048).
- Impact: For every non-English translation the typing mechanic is dead. The student can only tap one of three lanes, and the start screen still tells the student to type each translation with the letter keys.

#### Missiles that carry other words fall and damage the castles, and the student cannot destroy them
- **major** | content
- Evidence: packages/game-cartridges/src/magic-defense.ts:801-804 spawns one extra missile every 5000 ms, and packages/game-cartridges/src/magic-defense.ts:758 gives that missile a seeded item index that is often not the current target. packages/game-cartridges/src/magic-defense.ts:563-564 removes only the missile whose targetIndex equals the current target after a correct answer. packages/game-cartridges/src/magic-defense.ts:578-597 (miss) removes the landed missile, takes one castle health point and records an incorrect attempt. A traced run with 10 items shows at t=42 s the prompt is "term6" while missiles labelled "term0" and "term2" fall; the run ends with 9 correct answers, zero wrong answers, 17 attempts and accuracy 0.53.
- Impact: The student sees several word labels falling but can answer only one of them. The other missiles always hit a castle, and each hit lowers the reported accuracy and the XP for words the student never answered wrong.

#### The in-game instruction line states that Space uses the storm, but Space usually types a space character
- **major** | content
- Evidence: packages/game-cartridges/src/magic-defense.ts:921 draws the text "Type + Enter  •  Backspace erases  •  Tap a choice  •  Space uses storm". packages/game-cartridges/src/magic-defense.ts:953-957 runs the storm only when mana is 100 and the typing buffer is empty; in every other state it calls typeCharacter(" "). Mana increases by 10 for each correct answer (packages/game-cartridges/src/magic-defense.ts:561), so the storm needs 10 correct answers.
- Impact: The student presses Space to fire the storm and instead adds a space to the spell buffer, which then makes the submitted translation wrong and damages a castle.

#### The start screen omits the timer, the castle damage and the storm, and lists Space without an explanation
- **major** | start-screen
- Evidence: packages/game-cartridges/src/magic-defense.ts:1046-1048 sets the objective "Defend all castles by selecting the translation for every word.", the mechanic instruction "Type each translation before its missile reaches the targeted castle." and keyboardKeys ["Letters", "Enter", "Backspace", "Space"]. packages/game-cartridges/src/standard-experience.ts:36-62 renders only these strings, so no briefing text names the 60-second limit (packages/game-cartridges/src/magic-defense.ts:36) or the storm action bound to Space (packages/game-cartridges/src/magic-defense.ts:953-956).
- Impact: The student starts without knowing that a 60-second timer ends the game in defeat, and without knowing what the listed Space key does.

#### Three different descriptions of the same game appear on three student surfaces
- **major** | description-mismatch
- Evidence: apps/advantage-games/src/lib/gameCards.ts:32 shows "Defend your castles from falling words by typing their translations." on the catalog card. packages/game-cartridges/src/catalog.ts:148 and packages/game-cartridges/src/magic-defense.ts:1044 supply "Choose translation lanes to protect the castle from incoming magic.", which packages/game-cartridges/src/standard-experience.ts:39 renders as the briefing subtitle. apps/advantage-games/src/locales/en.ts:635 shows "Defend your tower using magic spells and vocabulary knowledge." on the legacy page header.
- Impact: The student reads one promise on the catalog card, a different promise on the start screen, and a third one on the legacy page. The catalog text also names one castle while the game protects three castles.

#### The briefing tells click and tap users to type the translation
- **minor** | start-screen
- Evidence: packages/game-cartridges/src/standard-experience.ts:57-59 reuses options.mechanicInstruction for the keyboard, pointer and touch controls. For this cartridge that instruction is "Type each translation before its missile reaches the targeted castle." (packages/game-cartridges/src/magic-defense.ts:1047), but the pointer path submits a tapped lane (packages/game-cartridges/src/magic-defense.ts:940-944).
- Impact: A touch student, and every student with a non-Latin translation, must tap a lane, but the Click and Tap control rows tell the student to type.

#### The guided tutorial demonstrates only lane selection and never shows the typing mechanic
- **minor** | tutorial
- Evidence: packages/game-cartridges/src/magic-defense.ts:1049-1054 (executeTutorialAction) calls controller.chooseAnswer for both steps, which submits a lane answer (packages/game-cartridges/src/magic-defense.ts:741-743). The scene skips input polling and controller.tick outside the playing session mode (packages/game-cartridges/src/magic-defense.ts:1000-1007), so the tutorial never moves a missile and never runs the timer.
- Impact: The student practices tapping a lane, then enters a game that asks for typed translations under a 60-second timer with falling missiles. Both tutorial steps do show a visible consequence, so no step is silent.

#### The legacy Magic Defense page keeps a stale second version of the game with a broken back link
- **major** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/magic-defense/page.tsx:102 links to "/student/games", which has no locale segment, and apps/advantage-games/src/app/[locale]/(student)/student/games/ holds only the apk, sentence and vocabulary directories with no page.tsx. The page mounts a separate engine (apps/advantage-games/src/components/games/game/GameContainer.tsx:5-7 and apps/advantage-games/src/components/games/game/GameEngine.tsx:12-16), calls its own API (page.tsx:32 and page.tsx:70), and uses a different XP formula (page.tsx:66) than the cartridge (packages/game-cartridges/src/magic-defense.ts:469). The page also refuses to start below 10 words (page.tsx:39) while the APK route accepts one item (apps/advantage-games/src/components/apk/AuthenticatedCartridgeHost.tsx:185).
- Impact: A student who opens the legacy URL plays an older Magic Defense with different rules and different XP, and the Back to Games button gives a 404 page.

#### The legacy page shows hardcoded English error text to every student
- **minor** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/magic-defense/page.tsx:36 throws "Failed to fetch vocabulary" and page.tsx:47 sets "Failed to load vocabulary". page.tsx:129-138 shows that text inside the error Alert, while the surrounding labels use the translated keys from useScopedI18n (page.tsx:16).
- Impact: A Thai or Chinese student sees an English error sentence inside an otherwise translated error box.

#### English fallback distractors appear beside target-language answers in small decks
- **minor** | content
- Evidence: packages/game-cartridges/src/magic-defense.ts:293 defines DISTRACTOR_FALLBACKS as ["arcane ward", "moon shield", "storm light"], and packages/game-cartridges/src/magic-defense.ts:329-332 adds them whenever the deck supplies fewer than three distinct translations. The content locale defaults to Thai (packages/domain/src/games/learning-content.ts:21).
- Impact: A student with one or two saved flashcards sees one Thai answer beside two English phrases, so the correct lane is obvious and the practice value is lost.

*Checked and correct:* The cover file exists: apps/advantage-games/public/games/cover/magic-defense-cover.png resolves the path in apps/advantage-games/src/lib/gameCards.ts:33. The catalog entry (packages/game-cartridges/src/catalog.ts:146-158) and the cartridge manifest (packages/game-cartridges/src/magic-defense.ts:1058-1070) agree on id, title, description, version, runtimeApiVersion, inputMode, requiredAssetBindings and capabilities, so there is no catalog drift. The lazy loader at packages/game-cartridges/src/catalog.ts:555-556 resolves the cartridge, and the card href /student/games/apk/magic-defense matches the authenticated route. Both terminal outcomes exist: enterVictory (packages/game-cartridges/src/magic-defense.ts:481) and enterDefeat with the reasons "castles" and "timer" (packages/game-cartridges/src/magic-defense.ts:472), so the debrief can show a loss. Both tutorial steps always run a visible action: the incorrect step always finds a distinct wrong lane because choicesFor removes duplicates (packages/game-cartridges/src/magic-defense.ts:319-335), and the correct step always advances the target. The pointer tap path resolves to the confirm action (packages/advantage-play-kit/src/systems/input-actions.ts:116-117), so the three lane buttons are live controls. The declared keys Enter, Backspace and Space all map to real bindings (packages/game-cartridges/src/magic-defense.ts:224-228), and the answer lanes rotate position each target, so the correct lane is not fixed.


### rpg-battle

#### The duel is impossible to win with more than 10 vocabulary items
- **blocker** | content
- Evidence: packages/game-cartridges/src/rpg-battle.ts:30 sets RPG_BATTLE_PLAYER_MAX_HEALTH = 100. Line 48 sets RPG_BATTLE_ENEMY_DAMAGE = 10. The enemy counterattacks after every accepted answer: line 691 (incorrect answer) and line 738 (correct answer that is not the last one). packages/game-cartridges/src/rpg-battle.ts:560-563 reduces player health by 10 and calls finish("defeat") at 0 health. Victory is possible only at line 722, when targetIndex equals items.length. Therefore the player survives 9 counterattacks and dies on the 10th, so victory needs 10 items or less. apps/advantage-games/src/components/apk/AuthenticatedCartridgeHost.tsx:170 requests /api/v1/apk/content with no limit parameter, and packages/domain/src/games/learning-content.ts:22 gives limit a default of 50.
- Impact: A student who has more than 10 flashcards always loses, even with perfect answers. The session stops at target 11 of up to 50, and the student sees the defeat end screen after every attempt. The enemy health bar also shows a total (packages/game-cartridges/src/rpg-battle.ts:458-461) that the student can never empty.

#### The second tutorial step performs no demonstration when the student advances quickly
- **major** | tutorial
- Evidence: packages/game-cartridges/src/rpg-battle.ts:1093-1098 runs both tutorial steps through controller.chooseAnswer. The first step selects an incorrect choice, and packages/game-cartridges/src/rpg-battle.ts:695-696 then locks input for RPG_BATTLE_FEEDBACK_LOCK_MS (900 ms, line 51). packages/game-cartridges/src/rpg-battle.ts:756 makes chooseAnswer return a rejected result while inputLocked is true, and the function returns no feedback to the tutorial. packages/advantage-play-kit/src/presentation/game-tutorial-runtime.ts:213-219 schedules the next step only after nextStep.timing.leadInMs, which packages/game-cartridges/src/standard-experience.ts:103 sets to 500 ms. packages/advantage-play-kit/src/react/apk-game-host.tsx:608 keeps the advance button enabled, so the student can start step 2 about 500 ms after step 1.
- Impact: The student presses "Next tutorial step" immediately, and the step named "Advance the learning target" does nothing. No attack occurs and the learning target does not move. The student never sees how a correct answer works.

#### Answer choices show the placeholder text "Decoy translation 1"
- **major** | content
- Evidence: packages/game-cartridges/src/rpg-battle.ts:346-350 fills the choice list with the literal string `Decoy translation ${decoyIndex}` when the content has fewer than three unique translations. apps/advantage-games/src/components/apk/AuthenticatedCartridgeHost.tsx:187-189 rejects only empty content, so a session with one or two flashcards starts.
- Impact: A student with one or two saved flashcards sees English placeholder options such as "Decoy translation 1" and "Decoy translation 2" on the answer cards. The placeholder text is always English, so Thai and Chinese students see untranslated debug text.

#### The start screen omits keyboard keys that the game accepts
- **minor** | start-screen
- Evidence: packages/game-cartridges/src/rpg-battle.ts:1092 declares keyboardKeys: ["A-Z", "Backspace", "Enter"]. packages/game-cartridges/src/rpg-battle.ts:421-434 also accepts Digit0 to Digit9, Space, Comma, Period, Minus, Slash and Quote, and packages/game-cartridges/src/rpg-battle.ts:1042-1043 sends those characters to the typed answer buffer.
- Impact: The student does not learn that the space bar works. A translation of two or more words needs the space bar, so the student can believe that the answer is impossible to type.

#### Numbered answer cards suggest number keys, but number keys type digits
- **minor** | other
- Evidence: packages/game-cartridges/src/rpg-battle.ts:953 labels each answer card as `${index + 1}. ...`, for example "1. river". packages/game-cartridges/src/rpg-battle.ts:424-425 maps Digit1 to the character "1" and packages/game-cartridges/src/rpg-battle.ts:1042-1043 appends it to the typed answer. No keyboard binding selects a card by number (packages/game-cartridges/src/rpg-battle.ts:54-57).
- Impact: A student who presses 1 to pick the first card adds the character "1" to the answer box. The next Enter press submits a wrong answer, the enemy counterattacks, and the student loses 10 health for a control that looked correct.

#### The legacy page shows a wrong correct answer after an incorrect answer
- **major** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/rpg-battle/page.tsx:369-370 picks a fallback action that is unrelated to the student input. Lines 414-421 pass that fallback translation to submitAnswer and to the battle log message `Incorrect! The spell was ${fallback.translation}.`. apps/advantage-games/src/store/useRPGBattleStore.ts:155 stores that value as revealedTranslation, and page.tsx:608-610 shows it as the correct answer.
- Impact: The student answers one word and the game reveals the translation of a different word as the correct answer. The student learns a wrong word pair. The performance record at page.tsx:417 also marks the wrong word as failed.

#### The legacy page shows a loading spinner forever for a signed-out student
- **major** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/rpg-battle/page.tsx:95 starts isLoading at true. Lines 178-180 call fetchVocabulary only when isAuthenticated is true, so setIsLoading(false) at line 174 never runs for a signed-out visitor. Lines 453-481 then render the spinner branch. The route group has no layout that blocks access: only apps/advantage-games/src/app/[locale]/layout.tsx exists, and the repository has no middleware.ts.
- Impact: A signed-out student reaches the page and sees a spinning loader and the text "loading vocabulary" forever. The page shows no sign-in prompt and no error.

#### The legacy page back button points to a route that does not exist
- **major** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/rpg-battle/page.tsx:457, :487 and :513 use <Link href="/student/games">. The path has no locale segment, and apps/advantage-games/src/app/[locale]/(student)/student/games/ holds only the apk, sentence and vocabulary directories with no page.tsx.
- Impact: The student presses "back to games" in the loading state, the error state, or the battle screen, and reaches a 404 page. The student cannot return to the catalog from this game.

#### The legacy page and its action menu show hardcoded English text
- **minor** | legacy-page
- Evidence: apps/advantage-games/src/components/games/vocabulary/rpg-battle/ActionMenu.tsx:52 ("Actions"), :53 ("Type the translation"), :70 ("Power" and "Basic"), :79 ("Type translation...") and :92 ("Cast"). apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/rpg-battle/page.tsx:357 ("Enemy strikes back!"), :394 ("You cast ...!"), :419 ("Incorrect! The spell was ..."), :559 and :567 (HealthBar labels "Hero" and "Enemy").
- Impact: A Thai or Chinese student sees English control labels and English battle messages, although the rest of the page uses the translated strings from useScopedI18n at page.tsx:55.

#### A stale second version of RPG Battle stays publicly reachable
- **minor** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/rpg-battle/page.tsx exists next to the cartridge route at apps/advantage-games/src/app/[locale]/(student)/student/games/apk/[cartridgeId]/page.tsx. The legacy page uses its own store (apps/advantage-games/src/store/useRPGBattleStore.ts), its own API routes (apps/advantage-games/src/app/api/v1/games/rpg-battle/vocabulary/route.ts and .../complete/route.ts) and its own hero, location and enemy selection (page.tsx:632-642). The repository has no middleware.ts and no (student) layout, so nothing blocks the URL.
- Impact: The student can open two different RPG Battle games with different rules, different XP math and different result screens. The two versions report results to different endpoints, so progress depends on which URL the student used.

#### The catalog card text promises several monsters and a typing-only mechanic
- **minor** | description-mismatch
- Evidence: apps/advantage-games/src/lib/gameCards.ts:40 reads "Duel monsters by typing the correct translations." The cartridge fights one enemy for the whole session (packages/game-cartridges/src/rpg-battle.ts:472-473 sets one enemyHealth value), and it also accepts tapped answer choices (packages/game-cartridges/src/rpg-battle.ts:1049-1063). packages/game-cartridges/src/catalog.ts:162 and packages/game-cartridges/src/rpg-battle.ts:1104 both use the different text "Defeat a fantasy enemy by translating vocabulary in a turn-based duel."
- Impact: The student reads about several monsters on the catalog card, then meets one enemy. The card also hides the tap control, which is the only control on a touch device.

*Checked and correct:* The cover asset is correct: apps/advantage-games/src/lib/gameCards.ts:41 points to /games/cover/rpg-battle-cover.png, and the file exists in apps/advantage-games/public/games/cover/. The catalog entry and the cartridge manifest agree on every field: id, title, description, version 0.1.0, runtimeApiVersion 1.0.0, inputMode vocabulary, the single requiredAssetBindings value "legacy-catalog/rpg-battle/arena", and all nine capability strings (packages/game-cartridges/src/catalog.ts:159-178 against packages/game-cartridges/src/rpg-battle.ts:1102-1123). The href at gameCards.ts:42 matches the authenticated cartridge route. The game has a real defeat path: packages/game-cartridges/src/rpg-battle.ts:537-547 sets terminalOutcome to "defeat" and delivers the result, and packages/game-cartridges/src/rpg-battle.ts:1136 passes that outcome to context.complete, so the loss end screen can appear. The snapshot never exposes the answer to the view: packages/game-cartridges/src/rpg-battle.ts:934-963 renders only the prompt, health, progress, typed buffer and feedback. Both keyboard bindings work: Enter submits and Backspace deletes (packages/game-cartridges/src/rpg-battle.ts:54-57 and 1039-1041). Pointer taps use the same card geometry as the renderer, so tap targets match the drawn cards (packages/game-cartridges/src/rpg-battle.ts:391-407 and 911-923).


### dragon-flight

#### The correct gate alternates left and right by target index, so a student wins without reading
- **major** | content
- Evidence: packages/game-cartridges/src/dragon-flight.ts:183 `const correctChoice: DragonFlightGate = index % 2 === 0 ? "left" : "right";`. The value depends only on the target index, and dragon-flight.ts:179-188 uses no seed and no randomness. dragon-flight.ts:242 advances targetIndex by exactly one on each correct choice, so the sequence is always left, right, left, right.
- Impact: The student presses Left, Right, Left, Right and finishes with 100 percent accuracy and full XP without reading one vocabulary word. The game measures no learning.

#### An incorrect gate choice produces no visible change on the canvas
- **major** | content
- Evidence: packages/game-cartridges/src/dragon-flight.ts:232-240 returns after `accountant.recordAttempt({ correct })` without changing phase, targetIndex, or any drawn value. The renderer at dragon-flight.ts:350-362 draws only the title, the prompt, the gate number, the two gate labels, a fixed feedback string, and the control hint. dragon-flight.ts:357-359 keeps the feedback text at "Choose a translation gate" for every state except "complete". Score, correctAnswers, and totalAttempts exist in the snapshot (dragon-flight.ts:197-200) but the scene never draws them.
- Impact: After a wrong choice the student sees an identical screen. The student cannot tell if the key registered, if the answer was wrong, or how many attempts the game counted against the final accuracy.

#### Tutorial step one demonstrates the incorrect choice with zero visible effect
- **major** | tutorial
- Evidence: packages/game-cartridges/src/dragon-flight.ts:450-459 `executeTutorialAction` calls `controller.choose(...)` with the opposite gate for "action:select-incorrect". That call reaches the no-visible-change branch at dragon-flight.ts:232-240, and the renderer at dragon-flight.ts:350-362 draws no counter and no feedback change. The step promises a demonstration: packages/game-cartridges/src/standard-experience.ts:89 "The demonstration selects one incorrect option without changing the scored session." The tutorial screen shows only text (packages/advantage-play-kit/src/presentation/game-tutorial-screen.tsx:138-153), and the canvas stays visible behind it (packages/advantage-play-kit/src/react/apk-game-host.tsx:591-596).
- Impact: The student reads "See how feedback helps", watches the game for about 1.4 seconds, and sees nothing move. Step two, the correct choice, does change the prompt and the gate labels, so the student learns only half of the mechanic.

#### A tap or click anywhere on the game surface counts as a gate answer
- **major** | content
- Evidence: packages/game-cartridges/src/dragon-flight.ts:291-293 `chooseGateFromPointer` compares only the x coordinate and ignores y. dragon-flight.ts:410-416 sends every pointer release to that function. The gates occupy only the band from y = height * 0.62 to about y = height * 0.85 (dragon-flight.ts:324, 329). The on-screen hint at dragon-flight.ts:361 says "Touch or click a gate".
- Impact: A student who taps the dragon, the title, or an empty part of the sky submits an answer. On a touch screen an accidental tap records a wrong attempt and lowers the saved accuracy and XP, and the screen gives no sign of this.

#### An English placeholder label "Storm cloud" appears as the wrong gate for non-English students
- **major** | content
- Evidence: packages/game-cartridges/src/dragon-flight.ts:182 `const wrongLabel = next.translation === current.translation ? "Storm cloud" : next.translation;` with `next = items[(index + 1) % items.length]` at dragon-flight.ts:181. When the deck holds one item, `(0 + 1) % 1 === 0`, so next equals current and the label is always "Storm cloud". The authenticated host accepts a deck of one item; apps/advantage-games/src/components/apk/AuthenticatedCartridgeHost.tsx:187-189 rejects only length 0.
- Impact: A Thai or Chinese student with one saved flashcard, or with two neighbouring flashcards that share a translation, sees one gate in the target language and one gate reading the English words "Storm cloud". The student picks the correct gate without knowing the word.

#### The wrong gate always shows the next vocabulary item's translation
- **minor** | content
- Evidence: packages/game-cartridges/src/dragon-flight.ts:181-186 builds the distractor from `items[(index + 1) % items.length].translation` only. No other item can become the distractor.
- Impact: The student reads the answer to the following question one round early, and the same two words repeat as a pair. The practice value drops for every deck.

#### The cartridge has no defeat path, so the loss end screen is unreachable
- **minor** | end-screen
- Evidence: packages/game-cartridges/src/dragon-flight.ts:482 `createDragonFlightController(input, (result) => context.complete(result, "victory"))` is the only completion call. dragon-flight.ts:232-240 shows that an incorrect choice never ends the session, and dragon-flight.ts:246-262 completes only when the progression finishes.
- Impact: The student always reaches a victory debrief, whatever the accuracy. A student who answers many gates wrong still ends with "victory", so the end screen carries no information about performance.

#### The catalog card promises a growth mechanic that the cartridge does not have
- **minor** | description-mismatch
- Evidence: apps/advantage-games/src/lib/gameCards.ts:48 says 'Choose the correct gate to grow your dragon flight.' The catalog entry and the manifest both say "Choose the correct translation gate to guide a dragon through the clouds." (packages/game-cartridges/src/catalog.ts:27 and packages/game-cartridges/src/dragon-flight.ts:465). The scene draws exactly one dragon and never adds another (dragon-flight.ts:338-343). The word "grow" matches the legacy game, which tracks `dragonCount` (apps/advantage-games/src/lib/games/dragonFlight.ts:19 and 30).
- Impact: The student reads a promise of a growing flight of dragons on the catalog card, then opens a page whose header shows a different description and a single static dragon with two text gates.

#### A stale second Dragon Flight game stays publicly reachable with different rules
- **major** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/dragon-flight/page.tsx:1-165 renders apps/advantage-games/src/components/games/vocabulary/dragon-flight/DragonFlightGame.tsx, which holds 2209 lines. That version uses a random gate side (apps/advantage-games/src/lib/games/dragonFlight.ts:52-53), a 30 second timer (dragonFlight.ts:47), a boss phase and a defeat outcome (dragonFlight.ts:14 and 26, DragonFlightGame.tsx:1230). No layout guards the route: only src/app/layout.tsx and src/app/[locale]/layout.tsx exist, and next.config.ts declares no redirect.
- Impact: The student can open /en/student/games/vocabulary/dragon-flight and play a different Dragon Flight with a timer, a boss, and a loss state. The two versions disagree about the rules and send results to different APIs.

#### The legacy page back button points to a route that does not exist
- **major** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/dragon-flight/page.tsx:109 `<Link href="/student/games">`. No page file exists at src/app/[locale]/(student)/student/games/page.tsx; the only page files under that folder are the apk route and the per-game routes. The real catalog page is src/app/page.tsx at "/". The link also omits the [locale] segment that the route needs.
- Impact: The student presses "Back to Games" and reaches a 404 page. The student must use the browser back button or type the address to return to the catalog.

#### The legacy page shows English text to Thai and Chinese students
- **minor** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/dragon-flight/page.tsx:13 and 16 use `useScopedI18n`. apps/advantage-games/src/locales/client.ts:24 builds the map from `./en` only, and src/locales/ holds one translation file, en.ts. `useScopedI18n` (client.ts:42-55) never reads the locale, so it returns English for every locale segment.
- Impact: A student on /th/... or /zh/... reads English labels such as "Back to Games" and an English game title and description on the legacy Dragon Flight page.

*Checked and correct:* The cover file exists: apps/advantage-games/public/games/cover/dragon-flight-cover.png resolves for gameCards.ts:49. The catalog entry (packages/game-cartridges/src/catalog.ts:24-38) and the cartridge manifest (packages/game-cartridges/src/dragon-flight.ts:462-478) agree on id, title, description, version 0.1.0, runtimeApiVersion 1.0.0, inputMode vocabulary, empty requiredAssetBindings, and the same six capabilities. The briefing keyboard keys (dragon-flight.ts:449) match the real bindings (dragon-flight.ts:30-35) and the scene reader (dragon-flight.ts:405-409): A, Left Arrow, D, and Right Arrow all work, and no working key is missing from the start screen. Both routes resolve through getCartridgeCatalogEntry. The completion latch stops a second result after the scene is destroyed (dragon-flight.ts:275-281).


### wizard-vs-zombie

#### Two orbs show the same translation, and one of them counts as a wrong answer
- **blocker** | content
- Evidence: packages/game-cartridges/src/wizard-vs-zombie.ts:440-442 builds each decoy orb from items[(targetIndex + slot + 1) % items.length]. This index equals targetIndex when slot === items.length - 1, so a decoy repeats the current target for every session with 4 or fewer items. packages/game-cartridges/src/wizard-vs-zombie.ts:1034 prints only orb.translation on the orb, so the two orbs look the same. The public arcade fixture has exactly 4 items (apps/advantage-games/src/lib/apk/public-vocabulary-fixture.ts:4-9). A replay of the buildOrbs formula with that fixture and the default seed (packages/game-cartridges/src/wizard-vs-zombie.ts:368) gives a duplicate in 3 of the 4 rounds: target 0 shows สะพาน at slot 2 and slot 3, target 2 shows โคมไฟ at slot 0 and slot 3, target 3 shows แม่น้ำ at slot 1 and slot 3. The legacy version does not have this defect, because it removes the target from the decoy pool (apps/advantage-games/src/lib/games/wizardZombie.ts:412-417).
- Impact: The student sees two identical orbs. If the student touches the wrong copy, the game records an incorrect attempt (packages/game-cartridges/src/wizard-vs-zombie.ts:562-567), takes 5 points away, and lowers the final accuracy and XP. The student cannot see any difference between the two orbs.

#### Wizard movement repeats every frame and ignores the frame time
- **major** | content
- Evidence: packages/game-cartridges/src/wizard-vs-zombie.ts:1127-1131 builds movementCodes from input.keys, which holds the keys that are down now (packages/advantage-play-kit/src/runtime/input.ts:52,67-73,124), and calls controller.move once for each held key in each frame. packages/game-cartridges/src/wizard-vs-zombie.ts:637-644 moves a fixed WIZARD_MOVE_STEP of 48 base pixels (packages/game-cartridges/src/wizard-vs-zombie.ts:325) and never scales the step by delta. The zombies do scale by delta (packages/game-cartridges/src/wizard-vs-zombie.ts:712-718, 96 pixels per second). Enchanted Library collects held keys into one movement vector instead (packages/game-cartridges/src/enchanted-library.ts:1277-1283).
- Impact: At 60 frames per second one held key moves the wizard 2880 pixels per second in a 960 pixel arena. The wizard hits the arena border in about one third of a second. Each 48 pixel step also resolves collisions (packages/game-cartridges/src/wizard-vs-zombie.ts:645), so the wizard sweeps through orbs and records incorrect attempts the student did not intend. Precise movement to one orb is very difficult.

#### The start screen omits the Enter key, which casts the shockwave
- **minor** | start-screen
- Evidence: packages/game-cartridges/src/wizard-vs-zombie.ts:63-64 binds Space and Enter to the confirm action, and packages/game-cartridges/src/wizard-vs-zombie.ts:780 maps confirm to castShockwave. The briefing lists only ["W", "A", "S", "D", "Arrow keys", "Space"] (packages/game-cartridges/src/wizard-vs-zombie.ts:1199), which the briefing screen shows as the keyboard control (packages/game-cartridges/src/standard-experience.ts:53-59). The legacy start screen does list "Space / Enter" (apps/advantage-games/src/components/games/vocabulary/wizard-vs-zombie/WizardZombieGame.tsx:444).
- Impact: The student never learns that Enter also casts the shockwave. A student who reads only the start screen uses fewer controls than the game accepts.

#### The guided tutorial never moves the wizard, so it does not demonstrate the real control
- **minor** | tutorial
- Evidence: packages/game-cartridges/src/wizard-vs-zombie.ts:1200-1207 runs both tutorial steps through controller.collectOrb, which changes the learning state without any wizard movement. The briefing tells the student to "Move through the arena, collide with the translation orb" (packages/game-cartridges/src/wizard-vs-zombie.ts:1198). Step 1 only increases layoutRevision and rebuilds the orbs at new positions (packages/game-cartridges/src/wizard-vs-zombie.ts:564-567) and changes one feedback line (packages/game-cartridges/src/wizard-vs-zombie.ts:1057-1058). Both steps do always find an orb, because the arena always holds 4 orbs with exactly 1 correct orb (packages/game-cartridges/src/wizard-vs-zombie.ts:438-453).
- Impact: The student watches orbs change position and text, but never sees the wizard move into an orb. The tutorial does not teach the movement skill that the game requires.

#### A hidden corner region casts the shockwave, and the on-screen instruction does not mention it
- **minor** | content
- Evidence: packages/game-cartridges/src/wizard-vs-zombie.ts:1152-1153 casts the shockwave when a tap lands at x >= 86 percent of the width and y <= 16 percent of the height. No draw call marks this region (packages/game-cartridges/src/wizard-vs-zombie.ts:1019-1064). The instruction line says only "Keyboard: WASD / arrows move • Space or Enter casts • Swipe or tap the arena to move" (packages/game-cartridges/src/wizard-vs-zombie.ts:1061-1063).
- Impact: A student who plays on a touch screen cannot find the cast control. The same student can also cast the shockwave by accident when a tap lands in the top right corner.

#### The legacy page back button points to a route that does not exist
- **major** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/wizard-vs-zombie/page.tsx:81 links to "/student/games". The app has no /student/games page: the games directory holds only the apk, sentence, and vocabulary subdirectories and no page.tsx, and the app has no middleware file that adds a locale prefix.
- Impact: The student presses "Back to Games" and gets a 404 page. The student must use the browser back control to leave the game.

#### A stale second version of the game stays publicly reachable and uses different rules
- **major** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/wizard-vs-zombie/page.tsx renders the Konva version at /<locale>/student/games/vocabulary/wizard-vs-zombie. The [locale] layout does not check a session (apps/advantage-games/src/app/[locale]/layout.tsx), and no (student) layout file exists. The legacy version adds a difficulty selector (apps/advantage-games/src/components/games/vocabulary/wizard-vs-zombie/WizardZombieGame.tsx:453-465), never ends in victory, and always shows status="defeat" with the title "Survival Failed" (apps/advantage-games/src/components/games/vocabulary/wizard-vs-zombie/WizardZombieGame.tsx:482-504). The cartridge version does have a victory path (packages/game-cartridges/src/wizard-vs-zombie.ts:583-584).
- Impact: A student who opens the direct URL plays a different game with the same name: a different start screen, a difficulty control, an endless horde, and a loss-only end screen. Results from the two versions go to different endpoints, so progress is inconsistent.

#### The legacy end screen leaderboard link points to a route that does not exist
- **minor** | legacy-page
- Evidence: apps/advantage-games/src/components/games/vocabulary/wizard-vs-zombie/WizardZombieGame.tsx:501-503 sets showLeaderboardLink for this game. apps/advantage-games/src/components/games/game/GameEndScreen.tsx:177-183 links to "/student/leaderboard". The leaderboard page exists only under the locale segment (apps/advantage-games/src/app/[locale]/(student)/student/leaderboard), and the app has no middleware that adds the locale prefix.
- Impact: The student presses "View Leaderboard" on the end screen and gets a 404 page.

#### The legacy page falls back to Spanish vocabulary, and its start button does nothing while the list is empty
- **minor** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/wizard-vs-zombie/page.tsx:32-49 sets a Spanish word list (Run/Correr, Jump/Saltar) when the fetch fails or returns no words, but the API returns Thai words (apps/advantage-games/src/lib/games/sampleVocabulary.ts:4-8 through apps/advantage-games/src/app/api/v1/games/wizard-vs-zombie/vocabulary/route.ts:5). The vocabulary state starts empty (page.tsx:20). startGame returns without action when vocabulary.length is 0 (apps/advantage-games/src/components/games/vocabulary/wizard-vs-zombie/WizardZombieGame.tsx:194-205), and the start button has no disabled state (apps/advantage-games/src/components/games/game/GameStartScreen.tsx:171-179).
- Impact: After a network failure the student studies Spanish words in a Thai-English product. Before the words load, the student presses Start and nothing happens, and the screen gives no reason.

#### Legacy floating score and damage numbers appear far from the wizard
- **minor** | legacy-page
- Evidence: apps/advantage-games/src/components/games/vocabulary/wizard-vs-zombie/WizardZombieGame.tsx:730-731 computes the screen position as dimensions.width / 2 + (ft.x - camera.x) * camera.scale. camera.x is already a screen offset (apps/advantage-games/src/components/games/vocabulary/wizard-vs-zombie/WizardZombieGame.tsx:372-373: camX = dimensions.width / 2 - player.x * scale). The correct form is ft.x * scale + camera.x. With a 1000 pixel wide view, scale 1, and the wizard at the arena center x = 400, the code puts the number at 800 pixels instead of 500 pixels.
- Impact: The student sees the +100 score number and the -10 damage number at the wrong place, or outside the visible area. The feedback does not connect to the wizard.

*Checked and correct:* The cover image exists and is valid: apps/advantage-games/public/games/cover/wizard-vs-zombie-cover.png is a 1024x1024 PNG, and apps/advantage-games/src/lib/gameCards.ts:57 points to it. The catalog entry and the cartridge manifest agree on every field: id, title, description, version 0.1.0, runtimeApiVersion 1.0.0, inputMode vocabulary, the single asset binding legacy-catalog/wizard-vs-zombie/zombie-orbs, and the three capabilities (packages/game-cartridges/src/catalog.ts:180-191 against packages/game-cartridges/src/wizard-vs-zombie.ts:1211-1224). The loader entry resolves to the correct factory (packages/game-cartridges/src/catalog.ts:559-560). The card promise of zombies, orbs, and a shockwave matches the scene: zombies spawn and chase (packages/game-cartridges/src/wizard-vs-zombie.ts:680-727), and the shockwave pushes them back (packages/game-cartridges/src/wizard-vs-zombie.ts:741-769). The game has both terminal outcomes: defeat when health reaches 0 (packages/game-cartridges/src/wizard-vs-zombie.ts:535-536) and victory when the student clears every target (packages/game-cartridges/src/wizard-vs-zombie.ts:583-584), and both outcomes reach the host through complete(result, outcome) (packages/game-cartridges/src/wizard-vs-zombie.ts:416, 1231). Every key that the start screen lists (W, A, S, D, arrow keys, Space) does work in the scene (packages/game-cartridges/src/wizard-vs-zombie.ts:54-65). Both tutorial steps always find an orb and always change visible state, because the arena always holds 4 orbs with exactly 1 correct orb. The tutorial uses its own controller instance and the host remounts the game before play (packages/advantage-play-kit/src/react/apk-game-host.tsx:326,286), so tutorial attempts do not enter the scored session.


### enchanted-library

#### Duplicate flashcard terms stop the game before it starts
- **blocker** | content
- Evidence: /home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/enchanted-library.ts:517-519 throws "Enchanted Library vocabulary terms must be unique" when two items share a term. The content source does not remove duplicate words: /home/daniebo/Desktop/reading-advantage-monorepo/packages/domain/src/games/learning-content.ts:92-111 selects every user_word_records row and maps record.data.vocabulary directly, with no Set or distinct step. The table has no unique index on the word: /home/daniebo/Desktop/reading-advantage-monorepo/packages/db/src/schema/progress.ts:49-52 states "no additional unique here". The throw happens inside createGameConfig (/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/enchanted-library.ts:1396), which /home/daniebo/Desktop/reading-advantage-monorepo/packages/advantage-play-kit/src/runtime/phaser-factory.ts:42 calls without a try block, so /home/daniebo/Desktop/reading-advantage-monorepo/packages/advantage-play-kit/src/react/apk-game-host.tsx:253-256 sets the error status.
- Impact: A student who saved the same word from two articles cannot play. The screen shows the raw error text "Enchanted Library vocabulary terms must be unique" and the game never starts.

#### The head-up display prints the answer, and the correct book has a different color
- **major** | content
- Evidence: /home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/enchanted-library.ts:1207 draws `Target book: ${state.answer}`, and state.answer is the target translation (line 244 and line 553). /home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/enchanted-library.ts:1183-1185 fills the correct book with 0x8f6cff and strokes it with 0xffd166, while every wrong book uses 0x5a3e82 and 0xd7c4ff. Line 1187 prints the translation on each book.
- Impact: The student never needs to know the word. The answer is written in the head-up display, and the correct book is the only bright purple book with a gold border. The vocabulary test has no learning value.

#### The drawn book is much wider than the area that collects it
- **major** | content
- Evidence: Collection needs the player center within player.radius + book.radius = 20 + 25 = 45 logical units (/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/enchanted-library.ts:636, with the radii at lines 36 and 39). The drawn book is up to 172 screen pixels wide (/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/enchanted-library.ts:1173 and 1184). At the declared canvas of 960x540 (line 27) the horizontal scale is 960/800 = 1.2 (line 1170), so the drawn half width of 86 screen pixels equals 71.7 logical units, which is larger than the 45-unit collection distance.
- Impact: The student walks onto the visible left or right part of a book and nothing happens. The student must reach the middle of the book. The game feels unresponsive.

#### The first tutorial step does nothing when the student has one flashcard
- **major** | tutorial
- Evidence: /home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/enchanted-library.ts:411-423 builds the book layout. With one item the decoy pool is empty, so choices holds only the target and every book is correct. /home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/enchanted-library.ts:372-373 then finds no book with isCorrect === false and returns immediately, so `action:select-incorrect` (line 1374) performs no movement. The host permits one item: /home/daniebo/Desktop/reading-advantage-monorepo/apps/advantage-games/src/components/apk/AuthenticatedCartridgeHost.tsx:187 rejects only a length of zero.
- Impact: A student with one saved flashcard watches the step "See how feedback helps" for 1.4 seconds and sees no movement and no feedback. The student learns nothing from the first tutorial step.

#### The legacy page never saves a result, because the request body fails validation
- **major** | legacy-page
- Evidence: /home/daniebo/Desktop/reading-advantage-monorepo/apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/enchanted-library/page.tsx:107-121 posts score, correctAnswers, totalAttempts, accuracy, difficulty, and gameTime. /home/daniebo/Desktop/reading-advantage-monorepo/packages/game-contracts/src/completion.ts:27-40 is a strict schema that also requires gameType, duration, victory, idempotencyKey, and clientTimestamp, and it forbids the extra key gameTime. /home/daniebo/Desktop/reading-advantage-monorepo/apps/advantage-games/src/lib/games/api/completeRoute.ts:40-50 answers 400 for that body, and page.tsx:126-128 only reads data.xpEarned.
- Impact: The student finishes the legacy game and receives no XP and no leaderboard entry. The page shows no error, so the student believes the result was saved.

#### The legacy page "Back to Games" link opens a page that does not exist
- **major** | legacy-page
- Evidence: /home/daniebo/Desktop/reading-advantage-monorepo/apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/enchanted-library/page.tsx:164 and :186 both use href="/student/games". The route needs a locale segment, because every student route lives under app/[locale], and the directory /home/daniebo/Desktop/reading-advantage-monorepo/apps/advantage-games/src/app/[locale]/(student)/student/games/ holds only the subdirectories apk, sentence, and vocabulary, with no page.tsx.
- Impact: The student clicks "Back to Games" and reaches a 404 page. The student must use the browser back button to return to the catalog.

#### The legacy Rankings tab calls an API route that does not exist
- **major** | legacy-page
- Evidence: /home/daniebo/Desktop/reading-advantage-monorepo/apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/enchanted-library/page.tsx:89 and :131-133 fetch "/api/v1/games/enchanted-library/ranking". The directory /home/daniebo/Desktop/reading-advantage-monorepo/apps/advantage-games/src/app/api/v1/games/enchanted-library/ contains only complete and vocabulary.
- Impact: The Rankings tab always shows four empty boards with the text "No records yet", for every difficulty. The student cannot see any leaderboard.

#### The legacy Start button gives a blank game when the vocabulary list is empty
- **major** | legacy-page
- Evidence: /home/daniebo/Desktop/reading-advantage-monorepo/apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/enchanted-library/page.tsx:60-71 sets an error only for the warnings NO_VOCABULARY and INSUFFICIENT_VOCABULARY. Any other failure, for example a 401 answer, leaves error null and vocabulary empty, so the page renders the game. /home/daniebo/Desktop/reading-advantage-monorepo/apps/advantage-games/src/components/games/vocabulary/enchanted-library/EnchantedLibraryGame.tsx:229-243 makes resetGame do nothing when vocabulary.length is 0, and line 610-616 still sets the phase to "playing". Line 609 renders the playing view only when gameState exists.
- Impact: The student presses Start and sees an empty black rectangle with no message, no game, and no way to continue.

#### The Enter key activates the shield but the start screen does not list it
- **minor** | start-screen
- Evidence: /home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/enchanted-library.ts:90-91 binds Space and Enter to "confirm". The briefing lists only ["W", "A", "S", "D", "Arrow keys", "Space"] at /home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/enchanted-library.ts:1369. The input controller reports every key code, so Enter reaches the scene: /home/daniebo/Desktop/reading-advantage-monorepo/packages/advantage-play-kit/src/runtime/input.ts:68-69.
- Impact: The student does not learn that Enter also raises the shield. The start screen control list is incomplete.

#### The catalog text promises spirit protection that the game does not give
- **minor** | description-mismatch
- Evidence: The catalog says "Collect translated books, restore mana, and protect the stacks from spirits" (/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/catalog.ts:196), and the card says "Collect magic books and dodge spirits" (/home/daniebo/Desktop/reading-advantage-monorepo/apps/advantage-games/src/lib/gameCards.ts:64). The scene has no book damage and no shelf damage. A spirit only drains 10 player mana one time, then sets hasHitPlayer and stops (/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/enchanted-library.ts:748-752). Only one spirit can exist, because the spawn needs an empty spirit list (/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/enchanted-library.ts:1000). Each correct book adds 10 mana (line 649), which is the same amount one spirit removes.
- Impact: The student expects a hazard game and finds one slow spirit that is easy to walk around. The defeat by mana loss is nearly impossible after the first correct book.

#### The timer always produces a defeat end screen, even at one book from victory
- **minor** | end-screen
- Evidence: The session lasts 180000 ms (/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/enchanted-library.ts:61), and time expiry calls enterDefeat (/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/enchanted-library.ts:956-958). Victory needs one correct book for every item (line 653). The content route returns up to 50 items by default (/home/daniebo/Desktop/reading-advantage-monorepo/packages/domain/src/games/learning-content.ts:22).
- Impact: A student with 50 flashcards must collect 50 books in 180 seconds. The student who collects 49 books sees the same defeat end screen as a student who collects zero books.

#### Two books can show the same translation text
- **minor** | content
- Evidence: /home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/enchanted-library.ts:517-519 checks only that the terms are unique. /home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/enchanted-library.ts:418 selects decoys by a term comparison only. /home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/enchanted-library.ts:1187 prints only book.translation on each book.
- Impact: Two different words with one shared translation give two books with identical text. The student reads two equal books and only one of them counts as correct.

#### The head-up display line covers the book at the top center anchor
- **minor** | content
- Evidence: The anchor { x: 400, y: 120 } is book slot 4 (/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/enchanted-library.ts:315), and the seed is fixed at 29 (/home/daniebo/Desktop/reading-advantage-monorepo/apps/advantage-games/src/components/apk/AuthenticatedCartridgeHost.tsx:272), so (index + layoutIndex * 4 + 29) % 8 selects it at layout 1, index 3 (line 428). At 960x540 the scale is 1.2 by 0.9, so the book center is (480, 108) and the book box of 172 by 68 (lines 1173-1174) covers y 74 to 142. The progress line is drawn at y 125 and starts at x 28 (/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/enchanted-library.ts:1208-1211), and the book box starts at x 394.
- Impact: The mana, collection count, and timer text runs across the top book. The student reads both texts on top of each other.

#### The finished art of this game exists but the cartridge draws colored rectangles
- **minor** | cover-asset
- Evidence: The legacy version loads real sprite sheets from /home/daniebo/Desktop/reading-advantage-monorepo/apps/advantage-games/public/games/vocabulary/enchanted-library/ (player_3x3_pose_sheet.png, spirit_3x3_pose_sheet.png, book_3x1_sheet.png, library_background.png), referenced at /home/daniebo/Desktop/reading-advantage-monorepo/apps/advantage-games/src/components/games/vocabulary/enchanted-library/EnchantedLibraryGame.tsx:205-217. The cartridge declares requiredAssetBindings ["enchanted-library/arcane-shelves"] (/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/enchanted-library.ts:1387) and then draws only rectangles and circles (lines 1178-1196).
- Impact: The student who opens the new route sees purple rectangles and dots. The student who opens the old route sees finished sprites. The new route looks unfinished by comparison.

#### The legacy page shows a Thai loading message to every student
- **minor** | legacy-page
- Evidence: /home/daniebo/Desktop/reading-advantage-monorepo/apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/enchanted-library/page.tsx:152 renders the fixed string {"กำลังโหลดคำศัพท์"} in the loading card, with no translation function and no locale test.
- Impact: An English or Chinese student sees Thai text while the word list loads.

#### The legacy page sends wrong answer counts to the server
- **minor** | legacy-page
- Evidence: /home/daniebo/Desktop/reading-advantage-monorepo/apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/enchanted-library/page.tsx:115-118 computes correctAnswers as Math.floor(results.xp / results.accuracy) and totalAttempts as Math.floor(results.xp / results.accuracy / results.accuracy). The result object holds only xp, accuracy, and gameTime (/home/daniebo/Desktop/reading-advantage-monorepo/apps/advantage-games/src/components/games/vocabulary/enchanted-library/EnchantedLibraryGame.tsx:48-52), and accuracy is 0 when there are no attempts (line 392).
- Impact: The counts sent to the server have no relation to the real play. With an accuracy of 0 the values become Infinity or NaN, which JSON sends as null.

*Checked and correct:* The cover image is correct. gameCards.ts:65 points to /games/cover/enchanted-library-cover.png, and the file exists at /home/daniebo/Desktop/reading-advantage-monorepo/apps/advantage-games/public/games/cover/enchanted-library-cover.png as a 1024x1024 PNG. The catalog entry and the cartridge manifest agree on every field. catalog.ts:194-213 and enchanted-library.ts:1378-1392 hold the same id, title, description, version 0.1.0, runtimeApiVersion 1.0.0, inputMode vocabulary, the single required asset binding, and the same 11 capabilities in the same order. The game has a real defeat path. enterDefeat runs on time expiry (line 956), on mana loss after a wrong book (line 662), and during the frame loop (line 997), and createGameConfig passes the outcome \"victory\" or \"defeat\" to complete (line 1398). The declared movement keys work. W, A, S, D, and the four arrow keys map to the four move actions (lines 80-89), and the scene reads held keys and new key presses each frame (lines 1310-1318). The second tutorial step works for two or more items. With the fixed seed 29 the first pass toward the correct book collides with a wrong book, and the second pass, which moves vertically first, reaches the correct book at (660, 160) and returns a correct result.


### rune-match

#### The monster health bar has no terminal effect, but the catalog and the card promise a monster defeat
- **major** | description-mismatch
- Evidence: packages/game-cartridges/src/catalog.ts:218 says "Match adjacent vocabulary runes to defeat a monster." apps/advantage-games/src/lib/gameCards.ts:72 says "Match vocabulary runes to defeat monsters in this RPG puzzle battle." packages/game-cartridges/src/rune-match.ts:1348-1353 subtracts damage from monster health. No line in the file tests monster health for zero: the only terminal tests are rune-match.ts:1356 (player health is zero, defeat) and rune-match.ts:1360 (targetIndex equals vocabulary.length, victory). Monster start health is Math.max(3, vocabulary.length * 3) at rune-match.ts:959, and one three-rune match deals 10 damage at rune-match.ts:839-844. For a five-word session the monster health is 15 and two correct matches bring it to zero.
- Impact: The student reduces the monster health bar (drawn at rune-match.ts:1537-1539) to empty and the game continues. The empty monster keeps its counterattack every 5 seconds (rune-match.ts:1055-1069). The student must still match every remaining word. The promised monster battle has no reward and no end.

#### The guided tutorial incorrect step performs no visible demonstration
- **major** | tutorial
- Evidence: packages/game-cartridges/src/rune-match.ts:1692-1705. For actionId "action:select-incorrect" the driver calls selectCell(first) and then selectCell({ row: first.row, col: first.col + 2 }). Two cells that are two columns apart are not adjacent, so selectCell takes the branch at rune-match.ts:1271-1279, which only moves the selection highlight to the second cell and returns the outcome "selected". The branch performs no swap, removes no runes, applies no invalid-swap damage (compare rune-match.ts:1294-1310), and records no attempt.
- Impact: The tutorial step "See how feedback helps" (packages/game-cartridges/src/standard-experience.ts:84-91) tells the student that the demonstration selects one incorrect option. The student sees only a highlight move between two runes. The student never learns that a wrong swap costs health and keeps the current target active.

#### The guided tutorial incorrect step can play the correct move or clear the board selection at the board edge
- **major** | tutorial
- Evidence: packages/game-cartridges/src/rune-match.ts:1703 clamps the second cell with Math.min(first.col + 2, columns - 1). The default board has 6 columns (rune-match.ts:33). When findValidMove (rune-match.ts:1429-1432) returns a first cell in column 4, the clamp gives column 5, the two cells are adjacent, and selectCell runs a real swap at rune-match.ts:1281-1367. If the valid move is the horizontal pair (row,4)-(row,5), the incorrect step plays the correct match. When the first cell is in column 5, the clamp gives column 5 again, so the second call matches the first cell and selectCell deselects it at rune-match.ts:1258-1267.
- Impact: The student watches the incorrect step and sees either a successful match with monster damage, which teaches the opposite lesson, or an empty board with no highlight at all. The step explanation still says the demonstration selects one incorrect option.

#### The legacy start screen shows the raw translation keys runeMatch.tip2 and runeMatch.tip3
- **major** | legacy-page
- Evidence: apps/advantage-games/src/components/games/vocabulary/rune-match/RuneMatchGame.tsx:496-499 requests t("runeMatch.tip1") to t("runeMatch.tip4") in the scope "pages.student.gamesPage" (line 80). apps/advantage-games/src/locales/en.ts:865-872 defines tip1, tip2Prefix, tip2Heal, tip2Suffix, tip3Prefix, tip3Shield, tip3Suffix and tip4. The keys tip2 and tip3 do not exist. apps/advantage-games/src/locales/client.ts:45 returns the requested key when the lookup fails. GameStartScreen renders instruction.text directly at apps/advantage-games/src/components/games/game/GameStartScreen.tsx:93.
- Impact: The student opens /en/student/games/vocabulary/rune-match and reads the instruction list as: 1. Match runes to deal damage. 2. runeMatch.tip2 3. runeMatch.tip3 4. Large combos deal massive damage! Two of the four instructions are unreadable.

#### The legacy page back link points to a route that does not exist
- **major** | routing
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/rune-match/page.tsx:84 uses <Link href="/student/games">. The app has no page for that path: apps/advantage-games/src/app/[locale]/(student)/student/games/ holds only the directories apk, sentence and vocabulary, and no page.tsx. The href also omits the [locale] segment, and the app has no middleware file (no apps/advantage-games/src/middleware.ts and no apps/advantage-games/middleware.ts) to add one.
- Impact: The student clicks "Back to Games" and receives a 404 page. The student has no link back to the catalog from the legacy Rune Match page.

#### A stale second Rune Match game is publicly reachable and reports different rules
- **major** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/rune-match/page.tsx renders apps/advantage-games/src/components/games/vocabulary/rune-match/RuneMatchGame.tsx (1245 lines). The only layout in the route tree is apps/advantage-games/src/app/[locale]/layout.tsx, which adds a locale provider and no authentication guard. The legacy game asks the student to select one of four monsters (MonsterSelection.tsx:14-22: goblin, skeleton, orc, dragon) and posts results to /api/v1/games/rune-match/complete (page.tsx:59-73). The cartridge version supports only one goblin (packages/game-cartridges/src/rune-match.ts:176). apps/advantage-games/src/lib/gameCards.ts:74 links the catalog card to the cartridge version at /student/games/apk/rune-match.
- Impact: Two different games use the name Rune Match. A student who reaches the legacy URL plays a monster-selection battle with different rules, different XP accounting and a different result endpoint from the game the catalog card opens.

#### The briefing lists Tap and Click as keyboard keys
- **minor** | start-screen
- Evidence: packages/game-cartridges/src/rune-match.ts:1691 sets keyboardKeys to ["WASD", "Arrow keys", "Enter", "Space", "Tap", "Click"]. packages/game-cartridges/src/standard-experience.ts:53-59 copies every entry into the control row with mode "keyboard" and label "Keyboard". packages/advantage-play-kit/src/presentation/game-briefing-screen.tsx:283-297 renders each entry inside a <kbd> element. The real keyboard map at rune-match.ts:39-50 binds only ArrowLeft, KeyA, ArrowRight, KeyD, ArrowUp, KeyW, ArrowDown, KeyS, Enter and Space. No other cartridge except paladins-twin-soul.ts:1277 mixes pointer words into keyboardKeys.
- Impact: The student reads the Keyboard control row and sees two keys, Tap and Click, that no keyboard provides. The briefing also shows separate Click and Tap rows, so the same two words appear twice with different meanings.

#### The game shows no attack timer and no answer feedback, so player health drops without explanation
- **minor** | content
- Evidence: packages/game-cartridges/src/rune-match.ts:1400 runs a 5000 ms attack timer (rune-match.ts:36) through advanceTime, and the counterattack at rune-match.ts:1055-1069 removes health. The snapshot carries attackTimerMs (rune-match.ts:1024) and lastOutcome (rune-match.ts:1038), but the scene draw code never reads either value: updateView writes only the title, the prompt, the progress line (rune-match.ts:1559), the health status line (rune-match.ts:1562-1568) and the fixed instruction line (rune-match.ts:1569-1571).
- Impact: The player health number decreases every 5 seconds with no countdown, no damage message and no correct or incorrect message. A swap that creates a match for the wrong word also removes health (rune-match.ts:1339-1345) with no on-screen reason. The student cannot tell why the health falls.

#### The legacy end screen Exit button does not leave the game
- **minor** | legacy-page
- Evidence: apps/advantage-games/src/components/games/vocabulary/rune-match/RuneMatchGame.tsx:447-451 defines handleExit, which only clears gameStarted and gameState and leaves fullscreen. The same handler is passed to the victory screen (line 619) and the defeat screen (line 646). handleRestart at lines 440-444 performs the identical work.
- Impact: The student finishes the game, presses Exit, and returns to the same Rune Match start screen instead of the game catalog. Exit and Restart do the same thing.

#### The legacy game shows hardcoded English text to every user
- **minor** | legacy-page
- Evidence: apps/advantage-games/src/components/games/vocabulary/rune-match/MonsterSelection.tsx:27 "Choose Your Opponent", :28 "Select a monster to begin the rune match battle.", :59 "Battle", and the monster labels and descriptions at :14-19. apps/advantage-games/src/components/games/vocabulary/rune-match/RuneMatchGame.tsx:530 "Retry Loading", :536 "Loading assets...", and the end-screen stat labels "Monster" and "Difficulty" at :622, :626, :649 and :653. These strings do not pass through useScopedI18n.
- Impact: A student on the /th or /zh route sees this text in English. The surrounding text on the same screen comes from the translation layer, so the screen mixes two sources.

*Checked and correct:* The cover image is correct: apps/advantage-games/src/lib/gameCards.ts:73 points to /games/cover/rune-match-cover.png, and apps/advantage-games/public/games/cover/rune-match-cover.png is a real 1.8 MB file, not a broken symlink. The catalog entry and the cartridge manifest agree on every field: id, title "Rune Match", description "Match adjacent vocabulary runes to defeat a monster.", version 0.1.0, runtimeApiVersion 1.0.0, inputMode "vocabulary", requiredAssetBindings ["rune-match/monster-rune-board"], and all seven capability strings (catalog.ts:216-232 against rune-match.ts:1708-1725). The keyboard map is complete in both directions: every key the briefing names works, and no working key is missing. WASD and the four arrow keys move the cursor, and Enter and Space confirm (rune-match.ts:39-50, :1417-1423). Pointer taps map to the same confirm action (rune-match.ts:1478-1481, :1651-1668). A defeat path exists: player health reaches zero through a wrong swap (rune-match.ts:1303-1306) or through a monster counterattack (rune-match.ts:1068), and the cartridge then calls complete(result, "defeat") at rune-match.ts:1733. The board never deadlocks, because ensureTargetMove guarantees one valid move for the current target after every turn (rune-match.ts:1007-1010, :1364). Empty content is rejected before play through validateNonEmptyContent (rune-match.ts:944).


### alchemists-synthesis

#### The 60 second limit covers the whole session, so a full flashcard set makes victory impossible
- **major** | content
- Evidence: packages/game-cartridges/src/alchemists-synthesis.ts:29 sets ALCHEMISTS_SYNTHESIS_TIME_LIMIT_MS = 60_000 for the whole session. Line 290 builds one round for every content item, with no cap. Lines 547-555 add every frame delta to one cumulative gameTime and call finish("defeat") at the limit; the timer never resets between rounds. apps/advantage-games/src/components/apk/AuthenticatedCartridgeHost.tsx:170 requests /api/v1/apk/content without a limit parameter, and packages/domain/src/games/learning-content.ts:22 applies a default limit of 50. Line 26 of the cartridge keeps ALCHEMISTS_SYNTHESIS_ROUND_LIMIT = 7 as a "legacy compatibility value", which shows the intended round count.
- Impact: A student who saved many flashcards gets up to 50 rounds and only 60 seconds in total. The header shows "Round 1/50" and a clock that runs out after about one second per round. The student always loses on the timer and can never reach the victory end screen.

#### The legacy page sends an invalid completion body, so the server rejects every result without any message
- **major** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/alchemists-synthesis/page.tsx:55-67 posts only score, correctAnswers, totalAttempts, accuracy (multiplied by 100) and difficulty. packages/domain/src/games/schema.ts:68-82 is a strict schema that also requires gameType, duration, victory, idempotencyKey and clientTimestamp, and it limits accuracy to 0..1. apps/advantage-games/src/lib/games/api/completeRoute.ts:40-50 returns HTTP 400 for a body that fails that schema. page.tsx:68-70 catches only a thrown fetch error, so a 400 response produces no console entry and no user message.
- Impact: The student finishes the legacy game and sees an end screen with a score. The server discards the result, the student earns no XP, and the page shows no error.

#### The legacy page serves fixed Thai sample words, and a Spanish list when the fetch fails
- **major** | legacy-page
- Evidence: page.tsx:25 fetches /api/v1/games/alchemists-synthesis/vocabulary. apps/advantage-games/src/app/api/v1/games/alchemists-synthesis/vocabulary/route.ts:3-5 passes SAMPLE_VOCABULARY into the route factory, and apps/advantage-games/src/lib/games/sampleVocabulary.ts:4-28 holds 25 fixed Thai terms. page.tsx:30-46 falls back to a hard-coded Spanish list (Correr, Saltar, Comer, Dormir, Jugar) for an empty or failed response.
- Impact: The student practices Thai or Spanish words that the student never studied. The student's own flashcards never appear on this page.

#### The legacy back link has no locale segment and points to a route that does not exist
- **major** | legacy-page
- Evidence: page.tsx:78 renders <Link href="/student/games">. Every student route in this app lives under app/[locale]/, and apps/advantage-games/src/app/[locale]/(student)/student/games/page.tsx is absent; the games directory holds only apk, sentence and vocabulary subdirectories.
- Impact: The student clicks "Back to Games" and reaches a 404 page. The student loses the way back to the catalog.

#### The legacy answer buttons are 50 pixel squares, so the term text overflows the button
- **major** | legacy-page
- Evidence: apps/advantage-games/src/components/games/vocabulary/alchemists-synthesis/AlchemistsSynthesisGame.tsx:143 sets touchTargetSize = getEffectiveTouchTarget(50), which is 50 at the default multiplier (apps/advantage-games/src/hooks/useAccessibilitySettings.ts:56-61). Lines 253-260 draw the button Rect with width and height equal to touchTargetSize. Lines 261-268 draw the term Text with width equal to touchTargetSize at font size 18 (line 142). Line 242 spaces the two columns 175 pixels apart, so the drawn box fills less than a third of that space.
- Impact: Terms longer than about five characters wrap into two lines that spill outside the 50 pixel box. The Thai sample terms and English words such as "Mountain" become unreadable, so the student cannot tell the answer choices apart.

#### The legacy start screen states two rules that the legacy game does not have, and it never shows a clock
- **major** | start-screen
- Evidence: AlchemistsSynthesisGame.tsx:145-154 builds the start-screen instructions from apps/advantage-games/src/locales/en.ts:4187, which reads "Answer quickly - each round is timed and wrong picks cost points." apps/advantage-games/src/lib/games/alchemistsSynthesis.ts:61-82 has one 60 second whole-session timer and no per-round timer. Line 96 sets newScore = isCorrect ? state.score + 10 : state.score, so a wrong pick costs no points. AlchemistsSynthesisGame.tsx:206-274 draws the translation, the round counter and the score, but never draws the remaining time.
- Impact: The student expects a round clock and a score penalty. Neither rule exists. The student also sees no remaining time and the session ends without warning at 60 seconds.

#### The catalog card promises merging and spell crafting, but the game is a four-choice quiz
- **major** | description-mismatch
- Evidence: apps/advantage-games/src/lib/gameCards.ts:80 reads "Master the art of alchemy by matching and merging vocabulary to synthesize powerful spells!" packages/game-cartridges/src/catalog.ts:236 and packages/game-cartridges/src/alchemists-synthesis.ts:902 both read "Select the term that matches each translation before the cauldron cools." The action set at alchemists-synthesis.ts:45-51 holds only move-left, move-right, move-up, move-down and confirm. The scene at lines 773-799 draws up to four term buttons, a prompt and a timer. No merge step, no spell and no crafting exists.
- Impact: The student opens the card expecting a crafting game with merging. The student gets a timed multiple-choice quiz with different text on the start screen.

#### The first tutorial step performs no demonstration when the content holds one unique term
- **major** | tutorial
- Evidence: packages/game-cartridges/src/alchemists-synthesis.ts:891-894 resolves the incorrect option with state.options.find((option) => option.id !== state.correctOptionId) and calls selectOption only when that lookup returns a value. Lines 292-295 build the option list from the correct term plus up to three other unique terms, so a content set with one unique term produces one option. apps/advantage-games/src/components/apk/AuthenticatedCartridgeHost.tsx:187-189 accepts content with one item. packages/game-cartridges/src/standard-experience.ts:92 still tells the student "The demonstration selects one incorrect option".
- Impact: A student who saved one flashcard watches the first tutorial step do nothing while the panel says a demonstration runs. The same student then plays a quiz with one visible choice, which teaches nothing.

#### The W and S keys move the cursor, but no screen lists them
- **minor** | start-screen
- Evidence: packages/game-cartridges/src/alchemists-synthesis.ts:37 binds KeyW to move-up and line 40 binds KeyS to move-down. Line 886 declares keyboardKeys as ["A / D", "Arrow keys", "Enter", "Space"]. The in-game hint at line 797 reads "Keyboard: A/D or arrows to move, Enter/Space to confirm". Neither list names W or S.
- Impact: The student never learns two working keys. Every key that the start screen lists does work, so no listed key is dead.

#### The guided tutorial shows a raw internal action identifier to the student
- **minor** | tutorial
- Evidence: packages/advantage-play-kit/src/react/apk-game-host.tsx:587 passes tutorialSnapshot.currentAction?.id as actionLabel. packages/advantage-play-kit/src/presentation/game-tutorial-screen.tsx:152 renders that value inside a region labelled "Demonstrated tutorial action". packages/game-cartridges/src/standard-experience.ts:85-86 defines the identifiers as "action:select-incorrect" and "action:select-correct".
- Impact: The tutorial panel displays the text "action:select-incorrect" as the name of the demonstrated action. The student reads developer text instead of a plain instruction. This shared screen affects every cartridge, and this cartridge inherits it.

#### The legacy game repeats words at random and never covers the saved set
- **minor** | legacy-page
- Evidence: apps/advantage-games/src/lib/games/alchemistsSynthesis.ts:110-112 reshuffles the whole vocabulary after every answer and takes shuffled[0] as the next word, with no record of answered words. Lines 99-102 end the session after maxRounds, which is 7 for the normal difficulty (line 28-29).
- Impact: The same word can appear in two rounds in a row, and many saved words never appear. The student practices a random subset instead of the saved set.

*Checked and correct:* The cover image exists. apps/advantage-games/src/lib/gameCards.ts:81 points to /games/cover/cover-alchemists-synthesis.png, and apps/advantage-games/public/games/cover/cover-alchemists-synthesis.png is present.

The catalog entry and the cartridge manifest agree on every field. packages/game-cartridges/src/catalog.ts:234-248 and packages/game-cartridges/src/alchemists-synthesis.ts:900-914 hold the same id, title, description, version 0.1.0, runtimeApiVersion 1.0.0, inputMode vocabulary, the single requiredAssetBindings entry "alchemists-synthesis/alchemy-vessel", and the same six capabilities in the same order.

The game has a real defeat path. alchemists-synthesis.ts:554 calls finish("defeat") when the timer expires, and line 923 maps a non-victory phase to complete(result, "defeat"). Both terminal end screens can appear.

Every key that the start screen lists does work. alchemists-synthesis.ts:32-43 binds ArrowLeft, ArrowRight, ArrowUp, ArrowDown, A, D, Enter and Space, and lines 516-540 handle each of those actions.

Pointer input maps to the correct button. optionRects (lines 334-354) supplies both the drawn rectangles (line 773) and the hit test (lines 371-385), and pointerInScene (lines 356-369) converts client coordinates with the canvas rectangle, which matches the client coordinates that packages/advantage-play-kit/src/runtime/input.ts:85-107 records.

The tutorial does not corrupt the scored session. packages/advantage-play-kit/src/react/apk-game-host.tsx:326 mounts the tutorial with sessionMode "tutorial", and line 289 destroys that mount and creates a new controller for play. The scene gates the timer and all input on sessionMode "playing" (alchemists-synthesis.ts:723 and 839), and still redraws the canvas every frame (line 853), so the tutorial demonstration stays visible.


### potion-rush

#### The conveyor draws only the first 24 ingredients, so most words are invisible
- **blocker** | content
- Evidence: packages/game-cartridges/src/potion-rush.ts:1313 creates a fixed pool of 24 text objects (`ingredients: Array.from({ length: 24 }, ...)`). packages/game-cartridges/src/potion-rush.ts:1204 breaks the draw loop before it fills any shape: `if (index >= activeResources.ingredients.length) break;`. The controller puts one ingredient on the conveyor for every sentence word plus one decoy for every sentence (potion-rush.ts:436-443). packages/domain/src/games/learning-content.ts:22 sets the content limit to `default(50)`, so the authenticated route returns up to 50 sentences. A 10-sentence session of 8 words gives 90 ingredients and the game draws 24 of them.
- Impact: The student cannot see or tap most of the words. The word that the active customer needs is often one of the undrawn ingredients, so the order cannot be completed. Victory needs every customer served, so the session ends in defeat or in a stall.

#### Ingredients use only 7 horizontal positions and print on top of each other
- **blocker** | content
- Evidence: packages/game-cartridges/src/potion-rush.ts:319 sets the position as `x: 82 + (ordinal % 7) * 126 + (seed === 0 ? 0 : (seededUnit(seed, ordinal, 23) - 0.5) * 48)`. The modulo gives 7 columns and the seed jitter is at most 24 pixels each way. INGREDIENT_WIDTH is 104 (potion-rush.ts:246), so two ingredients in one column always overlap. Every ingredient moves at the same CONVEYOR_SPEED and wraps at the same point (potion-rush.ts:245 and potion-rush.ts:993-995), so the stack never separates. The hosts pass seed 29 (AuthenticatedCartridgeHost.tsx:272, PublicCartridgeHost.tsx:184).
- Impact: With 8 or more ingredients the student sees stacked, unreadable word tiles. Only about 7 words are legible at one time, and the legible word is the last one drawn, not the one the tap will select.

#### The drawn ingredient position is clamped, but the tap test uses the true position
- **major** | content
- Evidence: packages/game-cartridges/src/potion-rush.ts:1205 clamps the draw position: `const x = clamp(ingredient.x, INGREDIENT_WIDTH / 2, width - INGREDIENT_WIDTH / 2);`. The tap test in packages/game-cartridges/src/potion-rush.ts:378-380 uses the unclamped value: `Math.abs(pointerX - candidate.x) <= candidate.width / 2`. After a wrap the true x becomes `viewportWidth + width` (potion-rush.ts:993-995), which is 1064 for a 960 pixel scene, while the draw code clamps it to 908.
- Impact: A word tile that the student sees at the right or left edge does not respond to a tap, or the tap selects a different hidden ingredient. The student taps a visible word and the game answers with another word.

#### The DUMP control covers the middle cauldron and dumps the wrong cauldron
- **major** | content
- Evidence: packages/game-cartridges/src/potion-rush.ts:384-389 puts the dump hit region at `sceneWidth / 2`, `sceneHeight * 0.7`, with a half width of 64 and a half height of 34. For 960x540 this is x 416 to 544 and y 344 to 412. packages/game-cartridges/src/potion-rush.ts:391-402 puts cauldron slot 1 at centre x 480 with width 230 and y 259 to 403, so the dump region sits inside cauldron 1. The dump test runs first and returns `snapshot.cauldrons.findIndex((cauldron) => cauldron.state === "spoiled")` (potion-rush.ts:387), which is the first spoiled cauldron, not the cauldron under the pointer. The draw code paints the DUMP circle and label at the same place (potion-rush.ts:1200-1202) over the cauldron rectangle drawn at potion-rush.ts:1177-1180.
- Impact: The student taps the middle cauldron to place an ingredient and the game dumps cauldron 0 instead. The DUMP label also hides the middle cauldron state text, so the student cannot read what the middle cauldron holds.

#### The start screen omits the arrow keys, Space, and Backspace, which all work
- **minor** | start-screen
- Evidence: packages/game-cartridges/src/potion-rush.ts:1367 declares `keyboardKeys: ["A / D", "W / S", "Enter", "Escape"]`. packages/game-cartridges/src/potion-rush.ts:29-41 binds ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Space, and Backspace to the same actions. The in-game help line repeats the short list (potion-rush.ts:1228).
- Impact: The student never learns that the arrow keys move the selection and that Space brews or serves. A student who expects arrow keys still works, but a student who reads the briefing uses a smaller control set than the game supports.

#### Escape clears the ingredient selection and the next Enter does nothing
- **minor** | content
- Evidence: The in-game help line says `Escape dump` (packages/game-cartridges/src/potion-rush.ts:1228). packages/game-cartridges/src/potion-rush.ts:925-931 only dumps when the selected cauldron is spoiled; in every other state it calls `setSelectedIngredient(undefined)`. packages/game-cartridges/src/potion-rush.ts:940-941 then returns `emptyResult()` for Enter because `selectedIngredientId` is undefined.
- Impact: The student presses Escape, expects a dump, and instead loses the ingredient highlight. The next Enter press does nothing and gives no message. The student must press A or D before Enter works again.

#### Dumped sentence words return to the conveyor in the decoy colour
- **minor** | content
- Evidence: packages/game-cartridges/src/potion-rush.ts:587-596 rebuilds each returned word with a sentence index of -1. packages/game-cartridges/src/potion-rush.ts:1206 paints an ingredient grey when `ingredient.sentenceIndex < 0` and blue in every other case.
- Impact: After a dump, the real sentence words look the same as the fake ingredients. The student learns that grey means a decoy and then avoids the correct word.

#### The tutorial never highlights the ingredient that it demonstrates
- **minor** | tutorial
- Evidence: packages/game-cartridges/src/potion-rush.ts:1373-1378 and packages/game-cartridges/src/potion-rush.ts:1379-1387 call `controller.placeIngredient(...)` without a first call to `controller.selectIngredient(...)`. The pointer path does call `selectIngredient` before the placement (potion-rush.ts:1243).
- Impact: The student sees the cauldron turn red or grow a word, but never sees which ingredient the tutorial picked. The demonstration teaches the result and not the choice.

#### The legacy Potion Rush page shows a hardcoded Thai loading message and stale sample sentences
- **major** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/potion-rush/page.tsx:149 prints the literal string `"กำลังโหลด"` for every locale. The same page loads content from `/api/v1/games/potion-rush/sentences` (page.tsx:63-65), and apps/advantage-games/src/app/api/v1/games/potion-rush/sentences/route.ts:3-5 serves `SAMPLE_SENTENCES` as a static route. The page also shows a difficulty selector and a leaderboard (page.tsx:279-296 and page.tsx:315-365) that the cartridge version does not have.
- Impact: An English or Chinese student sees a Thai word while the page loads. The page then plays a second, older Potion Rush with fixed sample sentences instead of the student flashcards, and reports a different score model.

#### The legacy page links to three routes that do not exist
- **major** | routing
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/potion-rush/page.tsx:161 and page.tsx:233 use `href="/student/games"`. apps/advantage-games/src/app/[locale]/(student)/student/games/ holds only the apk, sentence, and vocabulary folders and holds no page.tsx. page.tsx:212 uses `href="/student/articles"`, and apps/advantage-games/src/app/[locale]/(student)/student/articles does not exist. All three links also omit the [locale] segment that every page route needs.
- Impact: The Back to Games arrow and the Back to Games button give a 404 page. When the student has too few sentences, the only offered action, Read articles, also gives a 404. The student has no way back to the catalog.

*Checked and correct:* The cover image exists. `apps/advantage-games/public/games/cover/potion-rush-cover.png` matches `gameCards.ts:89`. The catalog entry and the cartridge manifest agree on every field. Compare `catalog.ts:251-270` with `potion-rush.ts:1391-1411`: the id, title, description, version 0.1.0, runtimeApiVersion 1.0.0, inputMode "sentence", the one required asset binding "potion-rush/customer-cauldron", and all 11 capabilities are identical. The card text promises a potion shop, orders, and a conveyor belt, and the scene implements all three (`potion-rush.ts:1177-1210`). The game has a real defeat path: `finish("defeat")` runs when the reputation reaches 0 or when no customer can refill a slot (`potion-rush.ts:969-973` and `potion-rush.ts:1017-1024`). Both tutorial steps act on the live controller and always produce a state change on a fresh session: step one places a word that cannot match the first target word (`potion-rush.ts:1373-1378`), and step two dumps the spoiled cauldron and then places the correct word (`potion-rush.ts:1379-1387`). The keys that the briefing lists (A/D, W/S, Enter, Escape) all perform a real action in `choose` (`potion-rush.ts:908-941`). Tutorial replay remounts a new game, so the demonstration never runs on a used cauldron (`apk-game-host.tsx:519-532`).


### dungeon-liberator

#### Touch and pointer players move only 24 pixels for each tap, and holding a D-pad button does nothing
- **major** | content
- Evidence: packages/game-cartridges/src/dungeon-liberator.ts:1449-1455 handles pointer input only on `input.pointer.released` and always calls `applyMove(direction, MOVE_STEP)`. MOVE_STEP is 24 (dungeon-liberator.ts:304). The keyboard path at dungeon-liberator.ts:1442-1446 gives a held key `PLAYER_SPEED * frameDelta / 1_000`, that is 220 world units each second (dungeon-liberator.ts:305). `input.pointer.down` is never read, so a held D-pad button produces no movement. The player starts at x 88 (dungeon-liberator.ts:578) and the exit portal is at x 882 (dungeon-liberator.ts:592).
- Impact: A student on a phone or a tablet must tap the D-pad about 34 times to cross the dungeon one time, and more times for each prisoner. A keyboard student crosses the same distance in about 4 seconds with one held key. The game is nearly unplayable with touch.

#### The legacy Dungeon Liberator page shows Thai-only text to every student
- **major** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/dungeon-liberator/page.tsx:110 shows the hardcoded string "กำลังโหลด" while it loads. Lines 143-144, 150, 155-166 and 178 hardcode Thai warning text and a Thai button label. No locale lookup guards these strings. No layout.tsx exists in apps/advantage-games/src/app/[locale]/(student)/, so no authentication gate blocks the route.
- Impact: An English or Chinese student who opens /en/student/games/sentence/dungeon-liberator reads Thai text that they cannot understand, and the page is reachable without a sign-in.

#### The legacy page links to /student/games and /student/articles, and neither route exists
- **major** | legacy-page
- Evidence: page.tsx:124-125, :182 and :199 use href="/student/games". page.tsx:174 uses href="/student/articles". apps/advantage-games/src/app/[locale]/(student)/student/ contains only `games` and `leaderboard` directories, and apps/advantage-games/src/app/[locale]/(student)/student/games/ contains only `apk`, `sentence` and `vocabulary` subdirectories with no page.tsx. No middleware file exists in apps/advantage-games, so no redirect adds the missing locale segment.
- Impact: Every exit link on the legacy page gives a 404 page. A student who cannot start the game has no way back to the catalog.

#### The legacy page always serves 10 fixed sample sentences with Thai translations instead of the student's saved sentences
- **major** | legacy-page
- Evidence: page.tsx:48-50 fetches `/api/v1/games/dungeon-liberator/sentences?locale=${locale}`. apps/advantage-games/src/app/api/v1/games/dungeon-liberator/sentences/route.ts:2-5 marks the route `force-static` and returns SAMPLE_SENTENCES. apps/advantage-games/src/lib/games/api/sentencesRoute.ts:4-34 ignores the locale query value. apps/advantage-games/src/lib/games/sampleSentences.ts:3-14 gives every sentence a Thai translation, for example { term: 'The cat sits on the mat', translation: 'แมวนั่งบนเสื่อ' }.
- Impact: The legacy game shows a Thai prompt for each sentence and never uses the student's own flashcards. The student practices content that they did not select, in a language that they may not read.

#### The catalog text and the start screen never mention the monsters, the lives, or the defeat condition
- **major** | start-screen
- Evidence: packages/game-cartridges/src/catalog.ts:275 gives the description "Move through a torchlit dungeon and rescue sentence prisoners in order." apps/advantage-games/src/lib/gameCards.ts:96 gives "Rescue prisoners by collecting them in the correct word order and escape the dungeon!". dungeon-liberator.ts:1490-1491 set the objective and the mechanicInstruction, and packages/game-cartridges/src/standard-experience.ts:38-60 builds the whole briefing from only those fields. The game still creates 2 monsters by default (dungeon-liberator.ts:307, :568) and calls terminalResult("defeat") when the lives reach zero (dungeon-liberator.ts:904).
- Impact: A student starts the game with no warning about the monsters or the 3 lives. The session can end in a loss end screen from a hazard that no catalog text and no start screen text describes.

#### The declared art binding renders nothing, although real Dungeon Liberator sprites exist and the legacy version uses them
- **minor** | cover-asset
- Evidence: dungeon-liberator.ts:1508 declares requiredAssetBindings ["dungeon-liberator/prisoner-rescue"], but createGameConfig reads only context.edition.id for a diagnostic (dungeon-liberator.ts:1525). The scene draws plain circles for the player, the prisoners and the monsters (dungeon-liberator.ts:1320-1332). Real sprites exist at apps/advantage-games/public/games/sentence/dungeon-liberator/ (background.png, player-sheet.png, prisoner-sheet.png, slime-sheet.png) and the legacy component loads them (apps/advantage-games/src/components/games/sentence/dungeon-liberator/DungeonLiberatorGame.tsx:105-110). The debrief still credits "Pixel art assets by ElvGames" (packages/game-cartridges/src/standard-experience.ts:123).
- Impact: The new game looks worse than the old one that the same repository still serves. The end screen credits pixel art that the student never saw.

#### The player and the monsters can move outside the drawn dungeon room and over the status text
- **minor** | content
- Evidence: dungeon-liberator.ts:1111-1112 clamp the player to y between 48 and 492 in a 540-high world, and dungeon-liberator.ts:1201-1205 clamp the monsters the same way. dungeon-liberator.ts:1301-1302 draw the room from height * 0.13 to height * 0.81, which is world y 70.2 to 437.4. The feedback text sits at height - 116 and the instruction text at height - 88 (dungeon-liberator.ts:1338-1350).
- Impact: The student sees the player and the monsters pass through the dungeon walls onto the black area, and the player can sit on top of the feedback and instruction text.

#### The D-pad panel is drawn after the player and the monsters and hides them
- **minor** | content
- Evidence: dungeon-liberator.ts:1331-1332 draw the player circle, then dungeon-liberator.ts:1360 draws each D-pad button with fillRoundedRect at alpha 0.9 on the same graphics object, so the buttons cover the earlier shapes. At a 960 by 540 canvas the buttons cover x 679 to 818 and y 339 to 540, and the player can reach x 48 to 912 and y 48 to 492 (dungeon-liberator.ts:1111-1112).
- Impact: The student loses sight of the player and of any monster that enters the lower right area, because the D-pad panel paints over them.

#### The guided tutorial never demonstrates the movement mechanic that the start screen teaches
- **minor** | tutorial
- Evidence: dungeon-liberator.ts:1493-1497 route both tutorial steps to controller.demonstrate(). dungeon-liberator.ts:1143-1157 pick a prisoner and call resolvePrisoner(candidate.id) directly. resolvePrisoner (dungeon-liberator.ts:824-861) only marks the prisoner collected or makes it flee, and never changes player.x or player.y. The briefing mechanicInstruction says "Use four-way movement to collide with the next word prisoner and lead the chain to the portal." (dungeon-liberator.ts:1491).
- Impact: The student watches a prisoner disappear or turn grey while the player stays at the spawn point. The tutorial shows the consequence but never shows the four-way movement that the student must perform.

*Checked and correct:* The cover file exists and is valid: apps/advantage-games/public/games/cover/dungeon-liberator.png is a 1024 by 1024 PNG, and gameCards.ts:97 points at it. The catalog entry and the cartridge manifest agree on every field: id, title, description, version 0.1.0, runtimeApiVersion 1.0.0, inputMode sentence, requiredAssetBindings and all 11 capabilities match in the same order (catalog.ts:272-292 against dungeon-liberator.ts:1502-1510 with SENTENCE_CAPABILITIES at dungeon-liberator.ts:311-323). The card href /student/games/apk/dungeon-liberator resolves to a real route. The briefing keyboardKeys ["W / Up", "A / Left", "S / Down", "D / Right"] (dungeon-liberator.ts:1492) match DUNGEON_LIBERATOR_KEYBOARD_BINDINGS exactly (dungeon-liberator.ts:31-40), with no extra key and no missing key. Both tutorial steps always perform a visible action: for a sentence with two or more words the incorrect step selects a real prisoner, and for a one-word sentence it spawns the tutorial decoy (dungeon-liberator.ts:1150-1157, :727-751), so neither step silently no-ops. The host mounts the scene before it starts the tutorial controller, so activeController is always set (apk-game-host.tsx:325-329). A true defeat path exists: resolveMonster calls terminalResult("defeat") when the lives reach zero (dungeon-liberator.ts:895-905), and the host forwards that outcome to the end screen instead of the fixed debrief outcome (apk-game-host.tsx:628), so a losing student sees "Try again".


### spellweavers-run

#### The game shows the correct word on the correct button, so the student wins without reading
- **blocker** | content
- Evidence: packages/game-cartridges/src/legacy-traversal-cartridges.ts:291 `const label = action === state.correctAction ? state.answer : `${ACTION_LABELS[action]} route`;`. The correct route gets the answer word. The other two routes get the fixed strings "Center route" and "Right route" from ACTION_LABELS at legacy-traversal-cartridges.ts:110-119. The scene never draws a distractor word. legacy-traversal-cartridges.ts:136-142 builds one target for each word of the sentence, and legacy-traversal-cartridges.ts:291 marks the correct one.
- Impact: The student sees only one button with a real word on it. The student presses that button every time and finishes with 100% accuracy. The student never reads the sentence prompt, so the game teaches nothing.

#### The correct route follows a fixed left, center, right cycle
- **major** | content
- Evidence: packages/game-cartridges/src/legacy-traversal-cartridges.ts:168 `correctAction: options.actions[displayIndex % options.actions.length]!`. options.actions is ["move-left", "confirm", "move-right"] at legacy-traversal-cartridges.ts:459. The index is the target index, so target 0 is always left, target 1 is always center, target 2 is always right, and the pattern repeats.
- Impact: The student learns the key pattern A, S, D, A, S, D and completes the game without looking at the words. The pattern is the same on each replay, because the target order never changes.

#### Card text and briefing text promise a lane runner with falling orbs, but the game draws three static buttons
- **major** | description-mismatch
- Evidence: apps/advantage-games/src/lib/gameCards.ts:104 promises 'Collect word orbs in the correct order to form sentences in this enchanted forest runner!'. packages/game-cartridges/src/catalog.ts:92 and packages/game-cartridges/src/legacy-traversal-cartridges.ts:454 promise 'Change lanes to collect falling word orbs in sentence order.' The scene at legacy-traversal-cartridges.ts:270-303 draws one background rectangle, one panel, one static circle, and three rounded rectangles with text. There is no lane, no orb, no fall, no scroll, and no movement. The legacy version does have lanes and falling orbs (apps/advantage-games/src/lib/games/spellweaversRunConfig.ts:14-35).
- Impact: The student reads the card, expects an enchanted forest runner with falling orbs, and gets a static three button quiz. The briefing subtitle repeats the same false promise on the start screen.

#### Click and tap select the wrong route near the left and right button edges
- **major** | content
- Evidence: packages/game-cartridges/src/legacy-traversal-cartridges.ts:243-251 divides the full canvas width into three equal columns: `Math.floor(localX / (width / options.actions.length))`. The drawn buttons use a different geometry at legacy-traversal-cartridges.ts:274-288: choiceWidth = min(220, width*0.78/3), choiceGap = min(24, width*0.04), rowStart = (width - rowWidth)/2. The configured game width is 960 (legacy-traversal-cartridges.ts:415). At 960 the buttons occupy x 126-346, 370-590, and 614-834, but the click columns are 0-320, 320-640, and 640-960. The pointer handler runs at legacy-traversal-cartridges.ts:348-350.
- Impact: A click in the last 26 pixels of the left button selects the center route. A click in the first 26 pixels of the right button also selects the center route. The student presses the button that shows the answer word and the game records an incorrect attempt.

#### The whole canvas is a click target, so any accidental click records an attempt
- **minor** | content
- Evidence: packages/game-cartridges/src/legacy-traversal-cartridges.ts:348-350 calls choose(actionForPointer(this, input.pointer.x)) for every released pointer. legacy-traversal-cartridges.ts:243-251 uses only the x value and ignores y. The buttons occupy only the band at y = height*0.62 with height 82 (legacy-traversal-cartridges.ts:280, 288).
- Impact: The student clicks the title, the prompt text, or empty background and the game records a route choice. On a touch screen, a scroll or a stray tap lowers the accuracy score.

#### The prompt repeats the full sentence for every word and never shows the progress position
- **major** | content
- Evidence: packages/game-cartridges/src/legacy-traversal-cartridges.ts:136-142 gives every word target the same prompt, `prompt: item.translation`. legacy-traversal-cartridges.ts:296 prints `Build the sentence for: ${state.prompt}`. The progress line at legacy-traversal-cartridges.ts:299 prints only `Target ${state.targetIndex + 1}` with no total, because the second argument of Math.min is Number.MAX_SAFE_INTEGER while the phase is not complete. The scene never shows the words that the student already collected.
- Impact: The student sees the same sentence prompt five or six times without a change. The student cannot see which word position is active, which words are already collected, or how many targets remain.

#### The progress line shows the developer term Compact route or Wide route
- **minor** | content
- Evidence: packages/game-cartridges/src/legacy-traversal-cartridges.ts:299 `${composition?.profile === "compact" ? "Compact route" : "Wide route"}  |  Target ...`. The value comes from the host layout profile, not from the game content.
- Impact: The student reads a layout code word in the progress area. The words Compact route and Wide route have no meaning in the game and give no information about the sentence task.

#### The cartridge has no defeat path, so the loss end screen is unreachable
- **major** | end-screen
- Evidence: packages/game-cartridges/src/legacy-traversal-cartridges.ts:411 is the only completion call: `createTraversalController(options, parsedInput, (result) => context.complete(result, "victory"))`. There is no call with "defeat". In choose() at legacy-traversal-cartridges.ts:179-186, an incorrect action records the attempt and returns; the target stays active and the retry count is unlimited. The debrief renderer supports a defeat state at packages/advantage-play-kit/src/presentation/game-presentation.tsx:317. The legacy version does have a defeat state through mana loss (apps/advantage-games/src/lib/games/spellweaversRunConfig.ts:28-29 and apps/advantage-games/src/lib/games/spellweaversRun.ts:166-167, 227).
- Impact: The student cannot lose. Wrong choices cost nothing and the student can press all three buttons until one is correct. The end screen always reads Victory, so the result carries no meaning.

#### A stale legacy page is publicly reachable and its two exit links are dead
- **major** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/spellweavers-run/page.tsx exists and loads a second, different version of the game at line 211. Line 124 and line 181 and line 198 use href="/student/games", which has no locale segment; the app has no page.tsx under src/app/[locale]/(student)/student/games (only the sub folders apk, sentence, vocabulary). Line 173 uses href="/student/articles"; a search of src/app finds no articles route.
- Impact: The student can reach an old version of Spellweaver's Run that the catalog does not list. Every back link and every article link on that page gives a 404 page, so the student is stuck.

#### The legacy page shows Thai only text to every student
- **major** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/spellweavers-run/page.tsx:109 "กำลังโหลด", line 128 and 184 and 200 "กลับไปหน้าเกม", line 142-143 "ไม่พบประโยคที่บันทึกไว้" and "ประโยคที่บันทึกไว้ไม่เพียงพอ", line 149, 154-165, and 177. The page reads the locale at line 39 but uses it only for the fetch URL at line 48.
- Impact: An English or Chinese student sees Thai text for the loading message, the empty content message, the back button, and the read articles button. The student cannot read the instructions or the error cause.

#### The legacy page sends invented answer counts to the completion API
- **minor** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/spellweavers-run/page.tsx:92-93 sends `correctAnswers: Math.floor(results.accuracy * 10)` and `totalAttempts: 10`. The game result object at line 79 carries only xp, accuracy, and difficulty. The real attempt counts exist in the game component but the page discards them.
- Impact: The student's saved record shows 10 attempts for every session, whatever the true number of words. The correct answer count is a rounded estimate, so the progress history is wrong.

#### The public arcade route always shows Thai sentence prompts
- **minor** | content
- Evidence: apps/advantage-games/src/components/apk/PublicCartridgeHost.tsx:128-130 selects PUBLIC_ARCADE_SENTENCE_FIXTURE for every sentence cartridge. apps/advantage-games/src/lib/apk/public-sentence-fixture.ts:5-6 holds Thai translations only. packages/game-cartridges/src/legacy-traversal-cartridges.ts:140 sets the prompt to item.translation, and line 296 prints it as `Build the sentence for: <Thai text>`. The route at apps/advantage-games/src/app/[locale]/student/arcade/[cartridgeId]/page.tsx:24-29 passes no locale to the host.
- Impact: A student on /en/student/arcade/spellweavers-run or /zh/student/arcade/spellweavers-run reads a Thai prompt. The student cannot understand the sentence to build.

#### The tutorial reuses the live game controller, so a replay can make both steps do nothing
- **minor** | tutorial
- Evidence: packages/game-cartridges/src/legacy-traversal-cartridges.ts:384-392 calls controller.choose on the same activeController for each tutorial step, and it never resets that controller. The replay command resets only the step index (packages/advantage-play-kit/src/presentation/game-tutorial-runtime.ts:224-233). The Replay tutorial button is always visible (packages/advantage-play-kit/src/presentation/game-tutorial-screen.tsx:160). Each replay advances the target by one at legacy-traversal-cartridges.ts:188. After the controller reaches the last target, choose() returns at once because phase === "complete" (legacy-traversal-cartridges.ts:180).
- Impact: When a student presses Replay tutorial, the demonstration starts from a later word, not from the first word. With short content, a few replays finish the tutorial game; then both tutorial steps show no change on the screen and the student sees a frozen Route complete! panel behind the tutorial text.

*Checked and correct:* The cover image is correct. apps/advantage-games/src/lib/gameCards.ts:105 points to /games/cover/cover-spellweavers-run.png, and the file exists at apps/advantage-games/public/games/cover/cover-spellweavers-run.png. The catalog entry and the cartridge manifest agree on every field. packages/game-cartridges/src/catalog.ts:89-97 and the manifest built at packages/game-cartridges/src/legacy-traversal-cartridges.ts:396-405 from SPELLWEAVERS_RUN_OPTIONS (legacy-traversal-cartridges.ts:451-464) match on id, title, description, version 0.1.0, runtimeApiVersion 1.0.0, inputMode sentence, requiredAssetBindings ["spellweavers-run/player-lane"], and capabilities ["timers", "tweens"]. The start screen keyboard list is correct. The briefing keys A, Left Arrow, S, Down Arrow, D, Right Arrow (legacy-traversal-cartridges.ts:458) match the keyboardBindings at legacy-traversal-cartridges.ts:459, and all three mapped actions are in options.actions. No listed key is dead, and no working key is missing from the list. The lazy loader resolves. packages/game-cartridges/src/catalog.ts:545-546 loads createSpellweaversRunCartridge, and the card href /student/games/apk/spellweavers-run matches the real APK route. The two tutorial steps both perform a visible change on a fresh controller: step 1 selects the center route and shows "That route is blocked. Try again.", and step 2 selects the correct route and advances the target. The tutorial uses a separate cartridge mount, so it does not pollute the scored session.


### shadow-gate-dungeon

#### The correct route button prints the answer word, so the student never reads the prompt
- **major** | content
- Evidence: packages/game-cartridges/src/legacy-traversal-cartridges.ts:291 draws each route label as `action === state.correctAction ? state.answer : `${ACTION_LABELS[action]} route``. Only the correct button shows a word from the sentence. The other three buttons show "Left route", "Up route", and "Down route". legacy-traversal-cartridges.ts:168 sets `correctAction: options.actions[displayIndex % options.actions.length]`, and legacy-traversal-cartridges.ts:475 lists the actions as [move-left, move-up, move-down, move-right]. The correct route therefore repeats the fixed cycle left, up, down, right.
- Impact: The student wins every target without reading the prompt. The student sees one button with an English word and three buttons with control names, so the choice is obvious. The student can also press A, W, S, D in a loop and finish the whole game. The game measures no learning.

#### Any tap on the game surface counts as an answer, and the tap zones do not match the drawn buttons
- **major** | content
- Evidence: packages/game-cartridges/src/legacy-traversal-cartridges.ts:348-350 calls `choose(actionForPointer(this, input.pointer.x))` for every pointer release, with no test of the pointer position. packages/advantage-play-kit/src/runtime/input.ts:98 and 116-119 set `released` on any pointerup over the whole game surface. legacy-traversal-cartridges.ts:247-251 maps the pointer to a route by dividing the full 960 pixel width into four equal parts, but legacy-traversal-cartridges.ts:274-278 draws the four buttons from x=69.6 to x=890.4 with 24 pixel gaps. A tap at x=250 is inside the left button but selects the up route. A tap at x=710 is inside the right button but selects the down route.
- Impact: The student loses accuracy and XP after a stray tap on the background, the title, or the prompt panel. On a touch screen this happens often. A deliberate tap near the inner edge of the first or the last button also selects a different route, so the student is marked wrong after a correct choice.

#### The catalog card promises a survival game with a shadow creature that the cartridge does not contain
- **major** | description-mismatch
- Evidence: apps/advantage-games/src/lib/gameCards.ts:112 reads "Collect word crystals and escape the shadow creature in this dark dungeon survival game!". The cartridge scene draws one background rectangle, one panel, one circle, and four static route buttons (packages/game-cartridges/src/legacy-traversal-cartridges.ts:280-293). The cartridge has no creature, no health, no timer, no movement, and no gate. packages/game-cartridges/src/catalog.ts:101 makes a second and different promise, "Explore the dungeon and collect ordered word crystals before opening the gate.". The declared capabilities "arcade-physics", "camera", and "timers" (catalog.ts:106) support none of these claims, because the scene creates no physics body, no camera move, and no timer. The briefing repeats the same promise through options.objective and options.mechanicInstruction (legacy-traversal-cartridges.ts:471-472), which the standard experience prints as the objective and as the keyboard, click, and touch control text (standard-experience.ts:38-62).
- Impact: The student selects a dungeon survival game and receives a four-button multiple-choice screen. The start screen tells the student to "Move through the dungeon toward the next word crystal", but no movement is possible. The student can only press one of four keys to select a route.

#### The cartridge has no defeat path, so the loss end screen is unreachable
- **major** | end-screen
- Evidence: packages/game-cartridges/src/legacy-traversal-cartridges.ts:411 is the only completion call: `createTraversalController(options, parsedInput, (result) => context.complete(result, "victory"))`. The controller has no health, no hazard, and no failure branch (legacy-traversal-cartridges.ts:179-194). An incorrect choice only records the attempt and keeps the same target. The legacy version of the same game does have a defeat path (apps/advantage-games/src/lib/games/shadowGateDungeon.ts:297 and 333, and apps/advantage-games/src/components/games/sentence/shadow-gate-dungeon/ShadowGateDungeonGame.tsx:461).
- Impact: The student can never lose, although the card at gameCards.ts:112 promises a survival game with a creature to escape. The debrief screen can only show a victory outcome. Wrong answers carry no consequence, so the student can press keys at random until the game ends in victory.

#### The card description and the catalog description are two different promises for one game
- **minor** | catalog-drift
- Evidence: apps/advantage-games/src/lib/gameCards.ts:112 reads "Collect word crystals and escape the shadow creature in this dark dungeon survival game!". packages/game-cartridges/src/catalog.ts:101 reads "Explore the dungeon and collect ordered word crystals before opening the gate.". The game page prints the catalog text, not the card text (apps/advantage-games/src/app/[locale]/(student)/student/games/apk/[cartridgeId]/page.tsx:37 and apps/advantage-games/src/components/apk/AuthenticatedCartridgeHost.tsx:252). The public arcade page does the same (apps/advantage-games/src/app/[locale]/student/arcade/[cartridgeId]/page.tsx:26).
- Impact: The student reads one promise on the catalog page and a different promise on the game page. The creature and the survival theme disappear between the two screens.

#### The progress line shows no total and hides the sentence the student builds
- **minor** | content
- Evidence: packages/game-cartridges/src/legacy-traversal-cartridges.ts:298-300 prints `${composition?.profile === "compact" ? "Compact route" : "Wide route"}  |  Target ${Math.min(state.targetIndex + 1, state.phase === "complete" ? state.targetIndex : Number.MAX_SAFE_INTEGER)}`. The text has no target total. At the end of the route the expression returns targetIndex, which is one less than the last target number. The scene never draws the words the student already collected, although the prompt at legacy-traversal-cartridges.ts:296 says `Build the sentence for: ${state.prompt}`. In sentence mode every word of one sentence carries the same prompt, because buildTargets sets prompt to item.translation for each word (legacy-traversal-cartridges.ts:137-143).
- Impact: The student cannot see how many word crystals remain. The student also cannot see the sentence under construction, and the same prompt text repeats for every word of the sentence. The final progress number is wrong by one.

#### A single-word sentence ends the route during the guided tutorial
- **minor** | tutorial
- Evidence: packages/game-cartridges/src/legacy-traversal-cartridges.ts:384-392 runs the tutorial action through the real controller. The second tutorial step selects the correct action (packages/game-cartridges/src/standard-experience.ts:98-103). legacy-traversal-cartridges.ts:186-193 marks the target, and completes the route when progression.isComplete becomes true. packages/game-contracts/src/educational-io.ts:15 accepts any term string, so one saved flashcard with a one-word term produces exactly one target.
- Impact: A student with one single-word sentence sees the message "Route complete!" during the tutorial (legacy-traversal-cartridges.ts:302). The tutorial then hands the student a fresh game that ends after one key press. The student receives no result from the tutorial run, so the screen appears to reset without reason.

#### The legacy page and its end screen link to routes that do not exist
- **major** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/shadow-gate-dungeon/page.tsx:125, :182, and :199 use href="/student/games". apps/advantage-games/src/components/games/sentence/shadow-gate-dungeon/ShadowGateDungeonGame.tsx:477 uses window.location.href = '/student/games'. page.tsx:174 uses href="/student/articles". The application has no page.tsx under app/[locale]/(student)/student/games, no articles route, and no middleware.ts to add a locale segment. The only student pages are the arcade route, the apk route, the sentence and vocabulary game routes, and the leaderboard route.
- Impact: Every "Back to games" link on the legacy page returns 404. The "read articles" button on the empty-content screen returns 404. The Exit button on the legacy end screen also returns 404, so the student is trapped after the game ends.

#### The legacy page shows hardcoded Thai text to every student
- **major** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/shadow-gate-dungeon/page.tsx:110 prints "กำลังโหลด" as the loading label. page.tsx:143-144 print "ไม่พบประโยคที่บันทึกไว้" and "ประโยคที่บันทึกไว้ไม่เพียงพอ" as the heading. page.tsx:150 and :155-166 print the Thai body text. page.tsx:178 prints "ไปอ่านบทความ" on the button. The page loads a translation hook at page.tsx:32-33 but uses it only for the "backToGames" label.
- Impact: An English student or a Chinese student cannot read the loading message, the empty-content warning, the required sentence count, or the main call-to-action button. The student cannot learn why the game refuses to start.

#### A second and different Shadow Gate Dungeon game stays publicly reachable
- **major** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/shadow-gate-dungeon/page.tsx:212 mounts apps/advantage-games/src/components/games/sentence/shadow-gate-dungeon/ShadowGateDungeonGame.tsx (483 lines). That version has a patrolling creature with a sight radius, health, damage, a timer, difficulty selection, creature selection, a virtual d-pad, and a defeat state (ShadowGateDungeonGame.tsx:206-250, 347-370, 385-405, 461-472, and apps/advantage-games/src/lib/games/shadowGateDungeon.ts:233, 289-297, 326-333). The card at apps/advantage-games/src/lib/gameCards.ts:114 links only to /student/games/apk/shadow-gate-dungeon, so the legacy route is reachable by direct URL and by browser history.
- Impact: Two different games carry the same name and the same title text. The legacy route delivers the creature-and-health game that the card describes, and the catalog route delivers a four-button quiz. A student who keeps the old link plays a different game and stores results through a different API.

#### The legacy page sends invented answer counts to the completion API
- **minor** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/shadow-gate-dungeon/page.tsx:93-94 send `correctAnswers: Math.floor(results.accuracy * 10)` and `totalAttempts: 10`. The game reports the real counts in gameState.correctAnswers and gameState.wrongAnswers (apps/advantage-games/src/components/games/sentence/shadow-gate-dungeon/ShadowGateDungeonGame.tsx:130-133), but the page discards them.
- Impact: The stored record always shows 10 attempts, whatever the student did. The stored correct count is a rounded estimate. The student sees wrong totals in any progress or leaderboard view that reads these fields.

*Checked and correct:* The cover image exists. gameCards.ts:113 points to /games/cover/cover-shadow-gate-dungeon.png, and apps/advantage-games/public/games/cover/cover-shadow-gate-dungeon.png is present (2121041 bytes). The catalog entry and the cartridge manifest agree on every audited field: id, title, description, version "0.1.0", runtimeApiVersion "1.0.0", inputMode "sentence", requiredAssetBindings ["shadow-gate-dungeon/player"], and capabilities ["arcade-physics","camera","timers"] (catalog.ts:99-107 against legacy-traversal-cartridges.ts:396-405 and 466-479). The lazy loader resolves to the correct factory (catalog.ts:547-548). The declared briefing keys match the real keyboard bindings: W, A, S, D, and the four arrow keys all map to move-up, move-left, move-down, and move-right (legacy-traversal-cartridges.ts:473-474). No key on the start screen is dead, and no working key is absent from the start screen. Both tutorial steps always run a visible demonstration, because the game declares four actions, so an incorrect action always exists (legacy-traversal-cartridges.ts:388-391), and the scene repaints every frame in tutorial mode (legacy-traversal-cartridges.ts:338-352). The tutorial mutates a separate tutorial-only cartridge instance that the host destroys before real play, so tutorial attempts do not pollute the scored session (apk-game-host.tsx:221, 279-287, 326). Empty flashcard content produces a clear message, "Save at least one flashcard before starting this game." (AuthenticatedCartridgeHost.tsx:186-188). Blank terms cannot produce a zero-target crash, because validateNonEmptyContent rejects them (nonempty-content.ts:61-66).


### rune-forge-chamber

#### The keyboard cursor always holds the correct rune, so Space wins the game
- **blocker** | content
- Evidence: packages/game-cartridges/src/rune-forge-chamber.ts:382 sets the start cursor to runes[0]. Line 394 sets nextRuneId to runes[wordIndex]. Line 654 sets the cursor to runes[0] for each new sentence. Line 658 sets the cursor to the first unselected rune after each correct pick. The runes array holds the words in sentence order (line 355 to 371), so the first unselected rune is always the required word. Line 736 makes the confirm action select the cursor rune, and line 622 marks that rune correct.
- Impact: The student presses Space or Enter repeatedly and forges every sentence with 100 percent accuracy. The student never reads the translation prompt and never learns the word order. The game awards full XP for this input.

#### The scene paints the required rune in a unique color and shows the answer
- **major** | content
- Evidence: packages/game-cartridges/src/rune-forge-chamber.ts:894 fills the rune with 0xf59e0b (amber) when rune.id equals state.nextRuneId, and 0x7c6cff (purple) for all other runes. Line 893 and 895 draw a thick white ring on the cursor rune, which is the same rune.
- Impact: The student sees which rune to select before reading the sentence prompt. The reading task becomes a color-matching task.

#### The start screen does not tell the student about the 12-second timer or the forge health
- **major** | start-screen
- Evidence: packages/game-cartridges/src/rune-forge-chamber.ts:1024 gives the objective, line 1025 gives the mechanic instruction, and neither text names a timer or health. packages/game-cartridges/src/standard-experience.ts:40 to 48 add only two generic instruction rows. The rules are strict: line 55 sets a 12000 ms timer for each sentence, line 717 ends the session in defeat when the timer reaches 0, line 58 removes 15 health for each wrong rune, and line 627 ends the session in defeat at 0 health.
- Impact: The student starts the game without knowledge of the time limit and the damage rule. The session can end in defeat during the first sentence, and the student does not know the cause.

#### A second Rune Forge Chamber page is reachable and all of its exit links are broken
- **major** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/rune-forge-chamber/page.tsx exists and renders an older React and Konva version of the game. Line 130, line 187, and line 204 link to "/student/games". That path has no locale segment, and apps/advantage-games/src/app/[locale]/(student)/student/games/ holds only subdirectories (apk, sentence, vocabulary) with no page.tsx. Line 179 links to "/student/articles", and no articles route exists in apps/advantage-games/src/app. apps/advantage-games/src/components/games/sentence/rune-forge-chamber/RuneForgeChamberGame.tsx:447 sends the end-screen exit to the same missing "/student/games" path.
- Impact: A student who opens this URL plays a different, older version of the game. Every back link and the end-screen exit button gives a 404 page, so the student cannot leave the page except with the browser back button.

#### The legacy page shows Thai text to every student
- **major** | legacy-page
- Evidence: apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/rune-forge-chamber/page.tsx:115 shows the hardcoded loading text "กำลังโหลด". Lines 148 and 149 show hardcoded Thai headings. Line 155 and lines 160 to 171 show hardcoded Thai body text. Line 183 shows a hardcoded Thai button label. The file uses useScopedI18n at lines 42 and 43, so the translation system is available but unused for these strings.
- Impact: An English or Chinese student sees Thai text for the loading state, the empty-content warning, and the read-articles button. The student cannot read the reason why the game refuses to start.

#### The legacy game has no victory path and always ends with a loss screen
- **major** | legacy-page
- Evidence: apps/advantage-games/src/lib/games/runeForgeChamber.ts:6 declares GameStatus as 'start' | 'playing' | 'defeat', with no victory value. Line 138 sets the next timer to floor(maxTimer * 0.8) for each new level, so the time limit falls to zero after enough levels. Lines 184 and 189 are the only terminal transitions, and both set 'defeat'. apps/advantage-games/src/components/games/sentence/rune-forge-chamber/RuneForgeChamberGame.tsx:149 ends the session only for the 'defeat' status, and line 431 and line 432 hardcode the end screen to status="defeat" and the title "Rune Shattered!".
- Impact: The student cannot win the legacy game. A perfect performance still ends with the loss screen "Rune Shattered!", so effort and result do not agree.

#### The legacy sentences API returns the same 10 sample sentences to every student
- **minor** | legacy-page
- Evidence: apps/advantage-games/src/app/api/v1/games/rune-forge-chamber/sentences/route.ts:4 builds the route from SAMPLE_SENTENCES, and line 7 sets dynamic = "force-static". apps/advantage-games/src/lib/games/api/sentencesRoute.ts:7 ignores the request and returns the fixed array. apps/advantage-games/src/lib/games/sampleSentences.ts:4 to 13 hold 10 fixed sentences with Thai translations only. The page requests a locale at page.tsx:54, and the route ignores it.
- Impact: The legacy game never uses the sentences the student saved. Every student practices the same 10 sentences, and the prompt in the center stone is always Thai.

#### The legacy game truncates the sentence and orders the circles by answer after level 1
- **minor** | legacy-page
- Evidence: apps/advantage-games/src/lib/games/runeForgeChamber.ts:79 and line 145 cut the sentence with words.slice(0, wordCount), where wordCount is 4 for easy difficulty (apps/advantage-games/src/lib/games/runeForgeChamberConfig.ts:46). The full translation still appears at RuneForgeChamberGame.tsx:289. Lines 104 to 110 shuffle the circle angles only for the first level; advanceRuneForgeLevel at lines 147 to 157 assigns the angles by index and never shuffles them.
- Impact: On easy difficulty the student sees a full translation but can forge only the first 4 words, so the sentence stays incomplete. From level 2 the word circles orbit in the correct sentence order, so the student can select them clockwise without reading.

#### The first tutorial step shows a health loss with no rune interaction for a one-word sentence
- **minor** | tutorial
- Evidence: packages/game-cartridges/src/rune-forge-chamber.ts:1033 picks the incorrect rune with state.runes.find((rune) => rune.id !== state.nextRuneId). A sentence with one word creates one rune (line 355 to 371), so find returns undefined. Line 1035 then calls demonstrateIncorrectChoice, which only removes 15 health and sets lastOutcome at lines 686 to 690. No rune changes color.
- Impact: The student sees the health value fall and the message "That rune strains the forge" but sees no rune selection. The step does not show the cause of the penalty.

#### The arrow keys move the cursor in sentence order, not around the ring
- **minor** | content
- Evidence: packages/game-cartridges/src/rune-forge-chamber.ts:723 filters the runes into the array order, which is sentence order. Line 730 steps through that array. The visible angle comes from a shuffled orbit slot at lines 355 to 368, so the array order and the ring order differ. Line 727 to 729 also map move-up to the same direction as move-left, and move-down to the same direction as move-right.
- Impact: The cursor jumps to a rune on the opposite side of the ring when the student presses an arrow key. Up and left do the same action, and down and right do the same action, so the four keys give only two results.

*Checked and correct:* The cover asset exists. apps/advantage-games/src/lib/gameCards.ts:121 names /games/cover/cover-rune-forge-chamber.png, and the file is present in apps/advantage-games/public/games/cover/. The catalog entry and the cartridge manifest agree on every field. packages/game-cartridges/src/catalog.ts:295 to 310 and packages/game-cartridges/src/rune-forge-chamber.ts:1043 to 1060 hold the same id, title, description, version 0.1.0, runtimeApiVersion 1.0.0, inputMode sentence, the single required asset binding rune-forge-chamber/orbiting-sigils, and the same seven capabilities. The card text is honest about the mechanic. The card promises taps in the correct order and a forge that cools, and the cartridge has both pointer selection (line 976 to 989) and a real 12-second timer (line 55 and line 717). The declared keyboard keys match the real bindings. The briefing lists WASD, arrow keys, Enter, and Space at line 1026, and the binding table at lines 29 to 39 accepts ArrowLeft, KeyA, ArrowRight, KeyD, ArrowUp, KeyW, ArrowDown, KeyS, Enter, and Space. No listed key is dead, and no working key is missing from the list. The game has a real defeat path. Line 717 ends the session when the timer reaches 0, line 627 ends it at 0 health, and line 1073 calls context.complete(result, "defeat") for both cases, so the loss end screen is reachable. The host shows the correct title for that outcome, because packages/advantage-play-kit/src/react/apk-game-host.tsx:628 passes the runtime outcome and packages/advantage-play-kit/src/presentation/game-presentation.tsx:317 prints "Try again". The tutorial does not damage the scored session. packages/advantage-play-kit/src/react/apk-game-host.tsx:285 to 289 destroys the tutorial mount and creates a new game config, so the 15 health that the tutorial removes and the incorrect attempt that it records never reach the real session. Both tutorial steps perform a visible demonstration for every normal multi-word sentence, and the replay button also creates a fresh controller (apk-game-host.tsx:519 to 532), so the incorrect step never selects an already forged rune.


### village-guardian

#### One monster touch removes all three lives in three frames
- **major** | content
- Evidence: village-guardian.ts:1071-1072 calls applyMonsterInternal on every tick while the monster overlaps the guardian. The function (:804-816) removes one life and returns, with no cooldown, no knockback, and no separation. Monster speed is 0.018-0.032 px/ms (:461-467), so one 16 ms frame moves less than 0.6 px while the 38 px overlap holds for seconds. Proof with dist/village-guardian.js: frame 0 lives=2, frame 1 lives=1, frame 2 lives=0 phase=defeat.
- Impact: The scene shows "Lives 3" (:1288), but one contact ends the session after about 48 ms. The student cannot move away.

#### A held movement key moves the guardian one full step every frame
- **major** | content
- Evidence: village-guardian.ts:1365-1371 builds new Set([...(input.pressed ?? []), ...input.keys]) and calls applyMove for each code. runtime/input.ts:51-74,123-132 shows keys holds every key still down while only pressed clears per snapshot. One step is 24 px (:29), so a held key moves 1440 px/s and crosses the 680 px arena in 0.47 s. Every other cartridge reads the key-down edge only, for example rune-forge-chamber.ts:971 and abyssal-well.ts:1202. The input controller has no blur listener.
- Impact: The student cannot stop on a target. A 100 ms press moves 144 px while villagers stand about 120 px apart, so the guardian hits wrong villagers and takes the trail reset and the 2 s penalty.

#### A window resize during the hide penalty freezes the game
- **major** | other
- Evidence: village-guardian.ts:583 computes correctAction from currentVillager(), which does not exclude a hiding villager. The restore validator at :988 computes the same field from a search that DOES exclude hiding villagers, so the two disagree and it throws "Village Guardian action state is inconsistent". runtime/runtime.ts:234-256 pauses the instance when restoreResponsiveState throws and never resumes.
- Impact: A device rotation or window resize while the next target villager is hidden pauses the game permanently. The student must reload.

#### The start screen promises that a wrong choice keeps the current target
- **major** | start-screen
- Evidence: standard-experience.ts:47 prints "Incorrect choices keep the current learning target active." village-guardian.ts:650-660 applyWrongVillager calls resetVillagerTrail, which empties the trail, returns targetIndex to the first word of the level, and moves every rescued villager to a new position (:673-683). It also hides the touched villager for 2 s and removes 2 s from the timer.
- Impact: The student expects one retry on the same word. The whole sentence restarts, rescued villagers scatter, and the timer drops.

#### The start screen hides the timer, the lives, and the monster
- **minor** | start-screen
- Evidence: village-guardian.ts:1433-1435 names neither the 25 s level timer (:43), the three lives (:40), the 2 s penalty (:34), nor the monster. The game can end in defeat from both the timer and the monster (:1069-1078, :806-816).
- Impact: The student starts without knowledge of the two loss conditions.

#### The catalog card promises village defense that the scene never implements
- **minor** | description-mismatch
- Evidence: gameCards.ts:128 says "Defend the village!" The controller has only four movement actions (:46-52). There is no attack and no block. The monster can only be avoided.
- Impact: The student expects a defense mechanic and finds an escort mechanic.

#### A hidden villager stays visible and readable but cannot be touched
- **minor** | content
- Evidence: village-guardian.ts:1246-1247 draws a hiding villager grey at 0.42 alpha, and :1263 still writes its word label at full opacity. The collision search (:752-754) excludes hiding villagers.
- Impact: The student reads the word and drives onto it, but passes through for 2 s.

#### The tutorial shows the debug word "tutorial wrong" for one-word content
- **minor** | tutorial
- Evidence: village-guardian.ts:1093-1110. With a one-word level no other villager can be the wrong choice, so demonstrate(false) inserts TUTORIAL_WRONG_VILLAGER_WORD = "tutorial wrong" (:165). updateView draws every uncollected villager with its label (:1244-1263). Proof with term "run": villagers become ['tutorial-wrong-villager|word="tutorial wrong"', 'villager-1-0|word="run"'], and the header (:1288) reads "Word 1/2" for a one-word level.
- Impact: The student reads internal test text inside the tutorial and sees a word count one too high.

#### The tutorial teleports the guardian instead of showing the movement mechanic
- **minor** | tutorial
- Evidence: village-guardian.ts:1141 sets player = clonePosition(target) and then collects. The step text promises "through the real game mechanic" (standard-experience.ts:96).
- Impact: The student never sees the four-way step movement the game needs.

#### A tap anywhere on the canvas steers the guardian
- **minor** | content
- Evidence: village-guardian.ts:1374-1396 accepts every pointer release and measures the tap against the D-pad centre at (width-110, height-102), returning undefined only inside a 28 px dead zone (:494-513). The on-screen text (:1301) says "Touch or click the D-pad".
- Impact: A tap on a villager in the arena moves the guardian left or up, because the arena lies left of and above the D-pad centre.

#### The legacy page stays reachable and every one of its links gives a 404
- **major** | legacy-page
- Evidence: sentence/village-guardian/page.tsx:125, :182, :199 link to "/student/games" and :174 to "/student/articles". Neither route has a page.tsx, and the app has no middleware.ts. Thai literals sit at :110, :143-144, :150, :155-159, :162-166, and :178. The page runs a second implementation through VillageGuardianGame.tsx and its own API routes.
- Impact: A student plays an old version with different movement, and every exit link gives a 404.

*Checked and correct:* cover-village-guardian.png exists (gameCards.ts:129). The catalog entry (catalog.ts:312-333) and the manifest (:1444-1462) match on all fields and all eleven capabilities. The briefing keys W, A, S, D, Arrow keys match the real bindings exactly, with no dead key and no hidden key. The game has both terminal paths and calls complete with "victory" and with "defeat", so both end screens appear. Empty content throws before the scene starts. The 24 px grid reaches every villager and the sanctuary. Both tutorial steps produce a visible change for normal multi-word sentences.


### labyrinth-goblin-king

#### The maze, the goblins, and the paladin change do not exist
- **blocker**
- category: description-mismatch
- Evidence: gameCards.ts:136 says "Navigate the maze! Collect word orbs in order and become a Paladin to defeat the goblins!" catalog.ts:111 says "Navigate the maze, collect ordered word orbs, and avoid goblin hazards." The scene builds only one graphics object and six text objects (legacy-traversal-cartridges.ts:317-327). It draws a background, one panel, one player circle, and four rounded rectangles (legacy-traversal-cartridges.ts:279-293). The controller holds targetIndex, score, and attempt counts only (legacy-traversal-cartridges.ts:145-219). There is no maze, no goblin, no paladin state, and no hazard.
- Impact: The student reads a promise of a maze game with enemies. The student gets a four-button multiple-choice screen.

#### The correct route prints the answer
- **blocker**
- category: content
- Evidence: legacy-traversal-cartridges.ts:291 — `const label = action === state.correctAction ? state.answer : ${ACTION_LABELS[action]} route`. The correct rectangle shows the answer word. The other three show the fixed text "Left route", "Up route", or "Down route". legacy-traversal-cartridges.ts:168 sets `correctAction: options.actions[displayIndex % options.actions.length]`, so the correct side cycles in a fixed order.
- Impact: The student sees the answer on the screen and can also win by pressing the four keys in a fixed cycle. The score, the accuracy, and the XP measure no sentence knowledge.

#### The game has no defeat path
- **major**
- category: end-screen
- Evidence: legacy-traversal-cartridges.ts:411 is the only completion call: `context.complete(result, "victory")`. The file contains no "defeat" string.
- Impact: The loss end screen never appears. The catalog promise "avoid goblin hazards" is false, because nothing can hurt the student.

#### The three declared capabilities are not implemented
- **major**
- category: catalog-drift
- Evidence: catalog.ts:116 and legacy-traversal-cartridges.ts:491 declare ["arcade-physics", "camera", "tweens"]. The scene calls only `this.add.graphics` once and `this.add.text` six times (legacy-traversal-cartridges.ts:317-327). The file never calls physics, cameras, or tweens.
- Impact: A host that selects a game by capability gets a game that cannot do what it claims.

#### Five games share one identical screen
- **major**
- category: content
- Evidence: createLegacyTraversalCartridge (legacy-traversal-cartridges.ts:374) builds dragon-rider, spellweavers-run, shadow-gate-dungeon, labyrinth-goblin-king, and griffin-riders-escape from one options record. The only differences are four colors, the title text, and the action count (legacy-traversal-cartridges.ts:436-509).
- Impact: A student who opens five different catalog cards sees the same screen five times, with a different title and a different background color.

#### The legacy page links to routes that do not exist
- **major**
- category: legacy-page
- Evidence: sentence/labyrinth-goblin-king/page.tsx:127, :184, and :201 link to "/student/games". Line 176 links to "/student/articles". The app has no page file for either path, and it has no middleware.ts to add the locale segment.
- Impact: Every "back" control and the "read articles" button give a 404 page.

#### The legacy page shows Thai text to every student
- **major**
- category: legacy-page
- Evidence: sentence/labyrinth-goblin-king/page.tsx:145-146 hold the Thai headings. Lines 152, 157, 161, and 168 hold Thai body text. These are string literals, not translation keys.
- Impact: An English or Chinese student reads Thai for the empty-content warning and the sentence counts.

*Checked and correct:* The cover file public/games/cover/cover-labyrinth-of-the-goblin-king.png exists (gameCards.ts:137). The catalog entry and the manifest agree on id, title, description, version, runtimeApiVersion, inputMode, and requiredAssetBindings (catalog.ts:108-117 against legacy-traversal-cartridges.ts:396-405 and 481-493). The five declared keyboard keys all work: W and ArrowUp, A and ArrowLeft, S and ArrowDown, D and ArrowRight (legacy-traversal-cartridges.ts:488-489).


### abyssal-well

#### The cover file is missing, and the near-name file on disk is a dangling symlink
- **major** | cover-asset
- Evidence: gameCards.ts:145 requests /games/cover/cover-the-abyssal-well.png. That file does not exist. The directory holds abyssal-well-cover.png, which is a symbolic link to /home/daniel-bo/Desktop/advantage-games/public/games/cover/cover-the-abyssal-well.png. That home directory does not exist on this machine, so the link is dangling. The cover directory holds exactly 2 dangling links; the other is griffin-sky-joust-cover.png, which no card uses.
- Impact: The Abyssal Well card shows a broken image box. A rename alone does not repair it, because the link target is absent.

#### The guided tutorial finishes both demonstrations inside one synchronous call
- **major** | tutorial
- Evidence: abyssal-well.ts:1263-1278 calls controller.spawn(...) and then demonstrateShot (:1247). demonstrateShot calls rotate, choose("confirm"), and completeTutorialCollision (:1240), which runs up to 40 controller.advance(50) steps in a plain for loop. The scene repaints only in the Phaser update function (:1194-1216), and the frame scheduler skips controller.advance when sessionMode is not "playing" (:1045-1048). The projectile needs 8 ticks to reach the enemy (:302, :268), and all 8 run before the loop returns.
- Impact: The student never sees the orb appear, the player rotate, or the projectile travel. Both steps change only the feedback text and the counter. The tutorial does not teach the rotate-and-fire mechanic.

#### The head-up display prints the answer and the target enemy has a unique colour
- **major** | content
- Evidence: abyssal-well.ts:1139 prints `Word ${state.words[state.targetIndex]}` — the exact word to shoot. :1128 fills the target orange 0xf59e0b and every other enemy violet 0x8b5cf6, and :1129 gives the target a different outline.
- Impact: The student finishes without reading the translation prompt at :1138. Two independent hints show the answer.

#### Victory needs every word of every sentence at one enemy per two seconds
- **major** | content
- Evidence: abyssal-well.ts:514 flattens all words of all sentences. :503 grants victory only when targetIndex >= words.length. AuthenticatedCartridgeHost.tsx:170 requests content with no limit, and learning-content.ts:22 defaults limit to 50. :659-661 spawns at most one enemy per 2000 ms (:40). The exported per-difficulty word budget of 4, 5, 6 (:46-50) is never applied. The legacy version used one random sentence (lib/games/abyssalWell.ts:59-61).
- Impact: A student with 50 saved sentences must destroy several hundred enemies in order. A full session runs more than 15 minutes, so most students reach defeat or quit first.

#### The Enter key fires but no screen lists it, and the runtime does not suppress its default action
- **minor** | start-screen
- Evidence: abyssal-well.ts:59 binds Enter to "confirm" and :1042-1044 gives the map to the normalizer. The briefing lists only A, Left Arrow, D, Right Arrow, Space (:1262), and the in-scene hint (:1150) also omits Enter. runtime/input.ts:70 calls preventDefault for the arrows and Space only.
- Impact: A working control stays hidden. When a host button holds focus, one Enter press both fires and activates that button.

#### The legacy page always discards the result, because the completion request fails validation
- **blocker** | legacy-page
- Evidence: sentence/abyssal-well/page.tsx:84-96 posts { xpEarned, accuracy, correctAnswers, totalAttempts, userId }. The route validates with gameCompletionInputSchema (lib/games/api/completeRoute.ts:40, domain/src/games/schema.ts:68-82), which is .strict() and requires gameType, difficulty, score, duration, victory, idempotencyKey, and clientTimestamp. The body omits all seven and adds two unknown keys, so the route returns 400 every time (completeRoute.ts:41-50). The page never checks response.ok; its catch (:97-99) handles only a network failure.
- Impact: Every legacy completion fails silently. The student finishes, sees no error, and earns no persisted XP.

#### The legacy page keeps four dead links and eleven Thai literals, and stays publicly reachable
- **major** | legacy-page
- Evidence: sentence/abyssal-well/page.tsx has href="/student/games" at 125, 182, and 199, and href="/student/articles" at 174. Neither route has a page.tsx. Thai literals appear at 129, 143, 144, 150, 155, 159, 162, 166, 178, 185, and 201. The (student) group has no layout and the app has no middleware.ts. api/v1/games/abyssal-well/sentences/route.ts:2,6 serves 10 fixed SAMPLE_SENTENCES instead of student flashcards.
- Impact: A stale second version stays reachable, shows Thai to English and Chinese students, plays fixed samples, and gives a 404 from every navigation link.

*Checked and correct:* The catalog entry (catalog.ts:334-353) and the manifest (:1281-1300) match on every field including all ten capabilities. The card promise of rim defense and climbing word enemies is implemented. A real defeat path works: an enemy at depth 1 removes a life (:490-497), three lives start (:51), zero lives set defeat (:502), and the controller passes the phase to the host (:910-916), which renders "Try again". The declared keys all map to real bindings (:54-60). The in-scene touch hint (:1150) matches the real pointer zones (:716-724), so this game is an exception to the shared pointer-hint defect. Empty content gives a clear message.


### archers-revenge

#### The guided tutorial "incorrect" step shows a correct hit
- **blocker** | tutorial
- Evidence: archers-revenge.ts:1477-1480 finds the shielded enemy at row 0 col 0, but the arrow collision at :1113 sorts by descending y and keeps the FRONT enemy, so the arrow reaches row 2. With the host seed 29 the target column is (29+1+0)%5=0 (:562), so row 2 col 0 is the unshielded target. A node run returned arrowHits=[{"enemyId":"wave:1:row:2:column:0","correct":true}], lastOutcome=correct, score=100.
- Impact: The step "See how feedback helps" demonstrates a CORRECT answer. The student never sees incorrect feedback.

#### Several shielded enemies show the exact correct translation
- **major** | content
- Evidence: archers-revenge.ts:574 picks distractors with items[(seed + wave*15 + index) % items.length], which repeats items below 15 flashcards. :859 and :886 move the target translation to a new enemy every 7 s but leave the old text behind. A node run with 8 items and seed 29 showed 3 enemies carrying trans0 at start and 4 after one rotation, with only one unshielded.
- Impact: Two or more boxes show the correct translation. Shooting the wrong copy records an incorrect attempt. Reading cannot give a reliable answer.

#### The colour of the correct enemy gives the answer away
- **major** | content
- Evidence: archers-revenge.ts:1306-1311 fills the unshielded enemy teal 0x147d6e with a gold 0xf9d65c stroke; every shielded enemy is 0x273849 with grey 0x6d8190.
- Impact: The student wins by colour and never reads the vocabulary.

#### The formation breach ends the session while health remains
- **major** | end-screen
- Evidence: archers-revenge.ts:1079-1082 removes one health point and calls finish("defeat") without testing remaining health. A clock-only node run reached defeat after 65.1 s with hp = 2/3, totalAttempts = 0, xp = 0. The briefing (:1465-1466) never mentions the descent or a time limit.
- Impact: The student loses after about 65 s of thinking, sees "Try again" with 2 of 3 health left, and earns 0 XP.

#### The Enter key fires but no screen lists it
- **minor** | start-screen
- Evidence: archers-revenge.ts:49 binds Enter to "confirm". The briefing lists only A, Left Arrow, D, Right Arrow, Space (:1467), and the in-scene help (:1357) omits Enter.
- Impact: Enter fires an arrow without warning.

#### The wave counter promises three waves the student never sees
- **minor** | description-mismatch
- Evidence: archers-revenge.ts:395 sets DEFAULT_MAX_WAVES = 3 and the HUD prints Wave n/3 (:1342). A wave advances only when the formation empties (:912-919), and a formation holds 15 enemies, so 15 or fewer flashcards win in wave 1. A node run with 8 items recorded waves ['1/3'] and ended in victory.
- Impact: The counter suggests two more waves that never start.

#### The catalog card text does not match the single-target mechanic
- **minor** | description-mismatch
- Evidence: gameCards.ts:152 says "Shoot enemies matching the target translation." The scene keeps exactly one unshielded enemy (:584, :859) while other enemies can carry the same text.
- Impact: Following the card instruction produces incorrect attempts.

#### The touch instruction contradicts the tap behaviour
- **minor** | start-screen
- Evidence: standard-experience.ts:57-58 reuses mechanicInstruction "Aim left or right, then fire..." (archers-revenge.ts:1466). The scene handles one tap as aim plus fire in the same frame (:1409-1412).
- Impact: A touch student expects to aim then fire. The first tap fires at once and can record an incorrect attempt.

#### The legacy page keeps a second reachable version with two dead links
- **major** | legacy-page
- Evidence: vocabulary/archers-revenge/page.tsx:101 links to /games, which has no route. ArchersRevengeGame.tsx:336 sets window.location.href = "/student/games", which has no page.tsx and drops the locale. page.tsx:46 and :139 require 15 or more words while the APK route accepts one (AuthenticatedCartridgeHost.tsx:189-191). No middleware.ts and no (student) layout, so the page is publicly reachable.
- Impact: The old URL plays a different Konva version. Both exit controls give a 404. A student with fewer than 15 flashcards is blocked here but can play the APK route.

*Checked and correct:* cover-archers-revenge.png exists. A node comparison of the catalog entry against the manifest showed no drift in id, title, description, version, runtimeApiVersion, inputMode, requiredAssetBindings, or the nine capabilities. Every listed keyboard key works. The cartridge has a real defeat path for both a breach and zero health. The second tutorial step works. Pointer coordinates convert correctly and the five tap zones align with the five aim columns. The tutorial uses a separate controller.


### storm-castle-tower

#### Falling hazards defeat a reading student in about 13 to 30 seconds
- **major** | content
- Evidence: storm-castle-tower.ts:298 sets HAZARD_INTERVAL_MS = 1600 and :661 drops one hazard per interval. :700 sets the spawn height to player.row - 2, so the student cannot climb away. :299 sets HAZARD_RADIUS = 0.7, so a hazard travels 1.3 rows before the hit test at :670 accepts it. With the speeds at :301 (oil 2.4, rock 3.2 rows/s) the reaction time is 0.54 s for oil and 0.41 s for rock. The column is a uniform draw over 4 columns (:691) and lives start at 3 (:34). A replay with the production seed 29 for an idle player gives the first hit at 21.2 s and defeat at 29.3 s for a 40-word session, and defeat at 13.2 s for an 8-word session. :665-679 gives no grace period after a hit.
- Impact: The student must read a sentence and pick a word with less than 0.55 s to react to each drop. A student who stops to read loses all three lives before finishing the first sentence.

#### The scene paints the correct window in a unique colour
- **major** | content
- Evidence: storm-castle-tower.ts:951 computes target = window.wordIndex === state.targetIndex && open. :953 fills the target orange 0xd28b2d while every other open window uses blue-grey 0x4b6685, and :955 strokes the target gold 0xffdc7c against 0xa8c4d8. :958 prints the word of every open window.
- Impact: The next correct word is the only orange window with a gold border. The student walks to it and presses Space without reading.

#### The word windows are stacked in sentence order along the climb
- **major** | content
- Evidence: storm-castle-tower.ts:437-440 place window index at row maximumRow - index * ROW_GAP. Only the column is random. Word 1 is the lowest window and the final word is the highest. The player starts below every window at startRow = maximumRow + 2 (:428).
- Impact: The correct order equals the climb direction, so the ordering exercise gives no language practice.

#### The victory and defeat messages state the opposite of the student's role
- **minor** | content
- Evidence: storm-castle-tower.ts:992 prints "The tower is secure!" for victory and :994 prints "The tower has fallen." for defeat. The title (:989) is "Storm the Castle Tower", so the student attacks the tower.
- Impact: The winner reads the defender's result and the loser reads the attacker's result.

#### The virtual D-pad accepts taps far outside its drawn box
- **minor** | other
- Evidence: storm-castle-tower.ts:974 draws the D-pad as a 92 by 92 box, 46 px from the centre at (width-110, height-102). chooseStormCastleTowerDirectionFromPointer (:371-372) accepts any tap between 28 and 110 px from that centre, and the scene calls it before the confirm fallback (:1065). At 960x540 the tower spans x 170-790 and the player row is y 389, so the region x 740-790, y 328-410 sits inside the rightmost tower column next to the player.
- Impact: A tap on the rightmost column near the climber moves the student right instead of collecting.

#### The guided tutorial never shows movement or a hazard
- **minor** | tutorial
- Evidence: storm-castle-tower.ts:899 runs controller.tick only when sessionMode === "playing", so the tutorial mount spawns no hazards. moveControllerToWindow (:1091, loops at :1100-1101) applies every grid move inside one synchronous call, and :1126 collects in the same call. The card (gameCards.ts:160) promises "dodging boiling oil and falling rocks".
- Impact: The student sees the climber jump to a window but never sees the climb or a falling hazard. The first hazard in the scored session takes a life.

#### The tutorial incorrect step does nothing for a one-word session
- **minor** | tutorial
- Evidence: storm-castle-tower.ts:1122-1125 select the incorrect candidate with windows.find(w => w.wordIndex !== targetIndex && w.state === "open") and return when none exists. sentenceInputSchema (educational-io.ts:15) has no minimum length.
- Impact: With one target word, step one runs its full 1.4 s of timers with no change on screen.

#### A stale legacy page stays reachable with three dead links and fixed sample content
- **major** | legacy-page
- Evidence: sentence/storm-castle-tower/page.tsx is a second complete version with its own difficulty and guard selection (StormCastleTowerGame.tsx:40-41). It links to /student/games at :126, :183, :200 and to /student/articles at :175; neither route exists. :41-42 import useScopedI18n then disable the unused-variable rule, so every string is a hardcoded English literal ("Back to Games" :130, "No Sentences Saved" :144). :94-95 send a made-up payload, correctAnswers: Math.floor(accuracy*10) with totalAttempts: 10, discarding the real counts from StormCastleTowerGame.tsx:141. sentencesRoute.ts:7 ignores the locale query the page sends at :51.
- Impact: A student plays a different version, sees English in a Thai or Chinese session, reaches a 404 from all four links, and the recorded score does not match the session.

*Checked and correct:* cover-storm-the-castle-tower.png exists (gameCards.ts:161). Every field in catalog.ts:375-393 is identical to the manifest (:1131-1152), including all eight capabilities. The card promise of ordered collection plus falling oil and rocks is implemented. The declared keys WASD, Arrow keys, Space, Enter match STORM_CASTLE_TOWER_KEYBOARD_BINDINGS (:38-49) exactly, with no dead key and no hidden key. A real defeat path exists: damage() (:496) and the wrong-window branch (:634) both call finish("defeat"), and :1163 passes "defeat" to context.complete. Window selection is unambiguous, and a closed window always reopens when it becomes the target, so the session stays winnable.


### griffin-sky-joust

#### Knight placement is a fixed arithmetic progression, not a pseudo-random field
- **major** | content
- Evidence: griffin-sky-joust.ts:279-283 defines hashUnit, which is affine in index, and :393-400 uses it for every knight x, y and vx. A node reproduction gives knight i at x = 248.16 + 61.22*i and y = 224.08 + 15.31*i, with both wrapping. The knights form one straight diagonal line. The seed only translates the whole line: seed 0 and seed 29 move every knight by the same 0.4693 px, and both hosts always pass seed 29.
- Impact: Every student gets the same layout in every session, and the layout is a diagonal line, not a sky field. Knights whose index differs by 12 land about 15 px apart, so circles and word labels overlap. With the 53 words of the sample content, 171 knight pairs overlap and 6 pairs sit less than 10 px apart.

#### All sentence words become knights at once and saturate the sky
- **major** | content
- Evidence: griffin-sky-joust.ts:320-333 flattens every word of every sentence into one target list, and :393-401 creates one knight for every target at session start inside x 120-840 and y 160-340. The content API default is 50 sentences (learning-content.ts:22). Fifty sentences of six words give 300 knights of radius 28 in a 720x180 band on a 960x540 canvas. :906-907 also builds one Phaser text object per knight.
- Impact: The student sees a solid mass of overlapping knights and labels. Free space in the band drops to about 61 percent. The griffin has only 3 health (:40) and every side or below contact removes one (:659-672).

#### Left Arrow and Right Arrow work but the briefing and the in-game hint omit them
- **minor** | start-screen
- Evidence: griffin-sky-joust.ts:31 binds ArrowLeft to move-left and :33 binds ArrowRight to move-right. The briefing declares only ["W","Up Arrow","Space","A","D"] (:1001), and the in-game hint (:877) says "W / up / Space: flap - A / D: drift".
- Impact: The student never learns that the arrow keys also steer the griffin.

#### The "confirm" action has no input binding and no student can trigger it
- **minor** | start-screen
- Evidence: griffin-sky-joust.ts:47-52 publishes "confirm" in GRIFFIN_SKY_JOUST_AVAILABLE_ACTIONS and :742-745 gives it a real behaviour. The keyboard map (:27-34) has no confirm key, and the normalizer (:769-772) declares only pointerTap: { action: "move-up" }.
- Impact: The snapshot tells the host that confirm is available, but no key, click or tap produces it. A host confirm button does nothing.

#### Horizontal drift responds only to a new key press and never accumulates
- **minor** | other
- Evidence: griffin-sky-joust.ts:918-923 reads only newly pressed keys. drift (:611-617) assigns vx = direction * PHYSICS.driftAcceleration, so it sets a fixed 180 instead of adding acceleration, and PHYSICS.maxHorizontalVelocity of 280 (:262) is unreachable. Damping of 0.98 per 16.67 ms (:695) cuts that speed to about 30 percent in one second.
- Impact: The briefing says "drift with A or D" (:1000), but a held key gives one short push. The student must tap many times to cross the canvas.

#### The head-up display text does not scale and leaves its panel on a small canvas
- **minor** | other
- Evidence: griffin-sky-joust.ts:821-823 draws the HUD panel with scaled coordinates, worldY(16) and 82*scale. The four HUD texts use fixed pixel positions (:862-871): title y 28, prompt y 66, progress y 112. On a 640x360 canvas the scale is 0.667, so the panel covers y 10.7 to 65.4 only.
- Impact: On a phone the target word, the translation, the counter, the health and the score print on the open sky over the moving knights.

#### The guided tutorial shows the wrong consequence for one-word content
- **minor** | tutorial
- Evidence: griffin-sky-joust.ts:972-993. For action:select-incorrect, :977 searches for a knight with a different word index and falls back to the current target. With exactly one word that fallback selects the TARGET knight. :988 then places the griffin at knight.y instead of above it. classifyGriffinSkyJoustCollision (:307-312) returns "side-below" for that position, so collide (:668-670) records damage and sets lastOutcome = "damage".
- Impact: With one-word content step one shows "Avoid side and below collisions." instead of "Wrong word. Keep the next target active." The student learns the wrong lesson.

#### The legacy page links to routes that do not exist
- **major** | legacy-page
- Evidence: sentence/griffin-sky-joust/page.tsx:109, :133, :191 and :208 link to /student/games, and :183 links to /student/articles. Both paths omit the locale segment, the app has no middleware, and no student/games page.tsx exists.
- Impact: Every "Back to Games" control and the "Read Articles" control give a 404. The student has no working exit.

#### The legacy page shows English text to every locale
- **major** | legacy-page
- Evidence: page.tsx:42 loads useScopedI18n but marks it unused with an eslint comment. Every string is a hardcoded English literal: :111, :118, :138, :152-153, :159, :187, :194, :215-216.
- Impact: A Thai or Chinese student reads English only.

#### The legacy page always loads the same ten static demo sentences
- **major** | legacy-page
- Evidence: page.tsx:50-51 calls /api/v1/games/griffin-sky-joust/sentences?locale=..., and api/v1/games/griffin-sky-joust/sentences/route.ts:1-7 builds that route from SAMPLE_SENTENCES with export const dynamic = "force-static". sampleSentences.ts holds ten fixed sentences with Thai translations only.
- Impact: The page ignores the student flashcards and the locale value. Every student practises the same ten demo sentences and reads Thai translations.

#### The legacy page sends invented result counters to the API
- **major** | legacy-page
- Evidence: page.tsx:86-97 posts correctAnswers: Math.floor(results.accuracy * 10) (:94) and totalAttempts: 10 (:95). The real game reports only xp and accuracy.
- Impact: The stored record shows 10 attempts for every session, whatever the student did.

#### A stale second version of the game stays publicly reachable
- **major** | legacy-page
- Evidence: page.tsx loads GriffinSkyJoustGame.tsx, a full second implementation of 15 KB. gameCards.ts:170 points the card at the cartridge route, but the legacy route stays live. The legacy version reads e.key values, not event.code (GriffinSkyJoustGame.tsx:190-196), and it has no guided tutorial, no briefing, and no debrief.
- Impact: A student at the old URL plays a different game with different controls and a different result path.

*Checked and correct:* gameCards.ts:169 asks for cover-griffin-sky-joust.png, and that file exists at 2,086,330 bytes. catalog.ts:394-412 and the manifest (:1007-1029) agree on every field and all nine capabilities in the same order. The card text and the catalog description match the real mechanic. A real defeat path exists: damaged (:479-489) calls complete("defeat") at zero health, and the victory path (:645-656) calls complete("victory"). The route target /student/games/apk/griffin-sky-joust exists. The host mounts a separate tutorial session before the scored session, so a demonstration never changes the scored result. Minor note: griffin-sky-joust-cover.png in the cover directory is a dangling symlink, but no card uses that name.


### realm-carver

#### The touch D-pad hit boxes do not match the drawn buttons
- **major** | other
- Evidence: realm-carver.ts:1130-1134 draws five pads with dpadSize = max(28, min(42, width*0.045)) (:1105). The hit test (:505-519) uses different half-widths: horizontalHalf = max(28, min(42, width*0.045)) (:507) but verticalHalf = max(32, min(42, height*0.052)) (:508). A run of the exported realmCarverDirectionFromPointer at 960x540 (centerX=100, centerY=410.4, dpadSize=42, dpadOffset=54) gives: on the centre pad drawn x 58-142, y 368-452, point (59,410) returns "left", (141,410) returns "right", (100,369) "up", (100,451) "down", and only the strip x 88-112 falls through to "confirm". On the up pad, (59,356), (141,356), (100,315) and (100,397) all miss the up box, and (141,397) returns "right". On the down pad, (59,423) returns "left". The normalizer maps every unmatched release to "confirm" (:1073, input-actions.ts:116-118).
- Impact: A tap on the visible arrow buttons gives the wrong direction or no movement. A wrong direction can push the carver into its own trail, which costs one of three hit points.

#### The left D-pad button draws off the canvas at compact widths
- **major** | other
- Evidence: realm-carver.ts:1103-1106 sets centerX = min(100, width*0.14) and dpadOffset = max(48, min(58, height*0.1)). The left pad starts at centerX - dpadOffset - dpadSize. The compact profile accepts a safe rectangle as small as 320x560 (responsive-composition.ts:88-89), and the Phaser factory sets the canvas to that rectangle (phaser-factory.ts:61-62). At 320x560 the left pad spans x -39.2 to 16.8; at 420x760 it spans x -27.2 to 28.8. The glyph goes to centerX - dpadOffset - 10 (:1143), which is x -21.2 at 320 wide, so it is fully off canvas. The same config declares a 48 px minimum touch target (responsive-composition.ts:110).
- Impact: A student on a phone sees no left arrow and can press left only on a thin strip at the screen edge, so a loop that needs left movement is impossible.

#### The prompt prints the answer word and the board highlights it
- **major** | content
- Evidence: realm-carver.ts:590-591 puts the sentence translation in prompt and the target term in answer, and :1138 renders both: setText(`Enclose: ${state.prompt} -> ${state.answer}`). :1124 also paints the target beacon gold 0xfbbf24 while every other beacon stays purple 0xa78bfa. Every word of one sentence shares the same item.translation string (:459-476), so the translation gives no per-word cue.
- Impact: The exact target word appears in the prompt, and the target beacon is the only gold dot. The sentence-order skill is never exercised.

#### Health loss from a collision produces no message
- **major** | other
- Evidence: damage (:640-676) lowers hit points and returns the player to cell (0,0) but sets only lastEvent, never lastOutcome. lastOutcome changes only inside evaluateCapture (:723, :741). The feedback line (:1140) branches on phase and lastOutcome only, so after a self-trail hit (:845) or a monster hit (:892, :908) it still shows "Draw a loop, return to claimed ground, then confirm." A run confirmed three self-trail hits move hit points 3 to 2 to 1 to 0 and then set the phase to defeat.
- Impact: The student loses health three times and jumps back to the corner with no explanation, then sees the defeat screen. Only the small HP counter changes.

#### The briefing and the card never mention the monsters or the trail rule
- **major** | start-screen
- Evidence: The briefing objective and mechanic instruction (:1386-1387) describe movement, the trail and the circuit, but not the two monsters (:348-351), not the damage from touching the own trail (:845), and not the damage from a wrong capture (:745). The card (gameCards.ts:176) and the catalog description (catalog.ts:417) also omit the hazards.
- Impact: The student starts without knowing that red dots are dangerous or that crossing the own trail costs health. Three losses end the session.

#### The wrong-capture message stays on screen after later actions
- **minor** | content
- Evidence: lastOutcome keeps the value "incorrect" until the next capture (:741), and the feedback line (:1140) shows "That word returned to the wild." on every frame while lastOutcome === "incorrect".
- Impact: The error message stays visible during all later movement, so it no longer describes the current action.

#### The prompt line shows empty values on the end phases
- **minor** | content
- Evidence: realm-carver.ts:590-591 return "" for both prompt and answer when the phase is not "playing", and :1138 still renders the template.
- Impact: The last frame before the end screen shows "Enclose:   ->  ".

#### The guided tutorial fails when the content holds one word
- **minor** | tutorial
- Evidence: tutorialTargetPoint (:1342-1356) looks for the word at targetIndex + 1 for the incorrect step. With one word that word does not exist, so it returns an empty interior cell, and executeTutorialLoop (:1358-1375) encloses that empty cell. Runs with [{term:"Hello"}]: seeds 1 and 29 end step one with lastEvent=trail-closed, lastOutcome=undefined, hit points 3, attempts 0, so no incorrect consequence appears. Seeds 0 and 4242 capture the single word, so lastOutcome=correct and the phase becomes victory, and step two then does nothing. Multi-word content works: with 2, 6 and 18 words across seven seeds, step one always produced word-wrong and step two word-correct.
- Impact: With one-word content step one shows nothing wrong, or it shows a correct capture and drives the tutorial to victory, leaving a dead second step.

#### A stale legacy page stays publicly reachable and its links give a 404
- **major** | legacy-page
- Evidence: sentence/realm-carver/page.tsx serves a second copy through RealmCarverGame.tsx. Lines 88, 110 and 130 use <Link href="/student/games">, which has no locale segment and no page.tsx. Hardcoded English strings that ignore the locale sit at :93, :115, :135, :99, :120, and :53, :55, :59; only :90/:112/:132 use the translated t("backToGames"). Lines 47-50 build each item as { term: word, translation: word }, so the translation equals the English word, and the legacy HUD (RealmCarverGame.tsx:227-232, :274) prints that term twice.
- Impact: A student at the legacy URL plays an older version, sees English-only text in a Thai or Chinese session, gets no translation cue, and lands on a 404 when leaving.

*Checked and correct:* cover-realm-carver.png exists (gameCards.ts:177). A Node script compared catalog.ts:414-433 with the manifest (:1397-1415): id, title, description, version, runtimeApiVersion, inputMode, the single asset binding, and all nine capabilities agree exactly, and the lazy loader (catalog.ts:583-584) resolves the correct module. The card text promises territory capture and word order, and the scene implements both. The declared keys W, A, S, D, Arrow keys, Space / Enter (:1388) match the real bindings (:321-332) exactly, with no dead key and no hidden key. A real defeat path exists: three self-trail collisions entered defeat and delivered a valid result (:632-637, :640-676, :845), and the victory path reports "victory" (:1424). The guided tutorial completes both steps correctly for all normal multi-word content.

### paladins-twin-soul

#### The session always ends in defeat within about three seconds
- **blocker** | content
- Evidence: The correct enemy is always the top-row centre cell (paladins-twin-soul.ts:362-364, :408-409). The gun fires automatically every 500 ms with no student input (:48, :915-920). Bullets travel straight up (:1005-1012), so the three wrong enemies in rows 1-3 of the same column always block the answer. The correct enemy is invulnerable until the capture attempt ends (:1013-1019). Each destroyed wrong enemy records an incorrect attempt (:957-958) and spawns one aimed counter-shot (:967-976) against only 3 hit points (:47). Simulation of dist/paladins-twin-soul.js with a 4-word list: a player who tracks the answer loses at 2944 ms with accuracy 0, xp 0, totalAttempts 3. A dodging player loses at 16928 ms with accuracy 0.09. Seeds 0 to 4 all end in defeat between 2048 ms and 3856 ms. A direct choose(correctAction) reaches victory with accuracy 1.0, so the victory path exists but the real controls cannot reach it.
- Impact: The student loses in about three seconds with 0 XP and cannot answer the first word.

#### The automatic gun records wrong answers that the student did not choose
- **major** | content
- Evidence: paladins-twin-soul.ts:915-920 fires on a timer independent of input, and :957-958 records a scored attempt for every enemy any bullet hits. The student has no hold-fire control. Maximum accuracy is N/(4N) = 25 percent, because three wrong enemies stand under each answer.
- Impact: The end screen shows very low accuracy and XP even for a student who knows every word.

#### The correct enemy always occupies the same grid cell
- **major** | content
- Evidence: paladins-twin-soul.ts:362-364 builds the target id from a constant row 0 and column 2, and :408-409 places the target at the same cell in every wave and session. The seed only shifts the formation sideways (:412).
- Impact: The student ignores the prompt and the labels and aims at the centre of the top row.

#### The guided tutorial shows an action that the real controls cannot perform
- **major** | tutorial
- Evidence: paladins-twin-soul.ts:1278-1288 calls controller.choose(<enemy id>). The play loop never calls choose with an enemy id; it sends move-left, move-right and confirm (:499-541). The direct call also skips the captorProtected rule (:1013-1019), so the tutorial destroys the correct enemy immediately, which real play forbids for the first 1200 ms. In tutorial mode the frame scheduler returns at :499, so tick never runs and the formation, paladin and bullets stay frozen. The counter-shot spawned by step 1 (:967-976) stays motionless.
- Impact: Two enemies vanish with no shot, no movement and no bullet flight. The tutorial never demonstrates "Move left or right, then confirm a shot" (:1276).

#### The captured state moves the gun away from the paladin
- **major** | content
- Evidence: paladins-twin-soul.ts:455-457 puts the bullet origin at the captor position when player.isCaptured is true. The capture succeeds at 1184 ms in the seed 0 run. The paladin still moves (:988-993) and still draws at its own position (:634-640) with no capture indicator; the only cue is the text at :658.
- Impact: After the capture the student's keys no longer aim the shots, which rise through the three wrong enemies in the captor column and record three more wrong answers.

#### The briefing lists a control that is not a keyboard key and omits a working key
- **minor** | start-screen
- Evidence: paladins-twin-soul.ts:1277 declares keyboardKeys ["A","Left Arrow","D","Right Arrow","Space","Touch or click"]. game-briefing-screen.tsx:283-295 renders every entry inside a <kbd> element in the Keyboard row. The bindings (:31-38) also map Enter to confirm, and the briefing and the on-canvas hint (:663) both omit Enter.
- Impact: The student sees a key labelled "Touch or click" that does nothing, and never learns that Enter fires.

#### The capture approach jumps the enemy to the wrong depth and teleports it back
- **minor** | content
- Evidence: paladins-twin-soul.ts:886 computes captor.y = 132 + progress * captureTravelMs. captureTravelMs is a time value of 300 ms (:54) used here as a pixel distance. The enemy drops from y 132 to y 432 in 300 ms and returns to y 132 at :892. The horizontal position stays on the formation line (:888).
- Impact: The student sees a purple box flash down and snap back. The capture result depends only on horizontal distance (:893), which the animation does not show.

#### A one-word vocabulary list shows placeholder text on 23 enemies
- **minor** | content
- Evidence: paladins-twin-soul.ts:411 builds the distractor list by removing the target. With one item the list is empty, so :416-422 calls createDecoyItem (:366-372) for every other cell. A run with [{term:'solo'}] returns enemy terms decoy-1-0-0, decoy-1-0-1, solo, decoy-1-0-3. nonempty-content.ts:53-55 accepts a one-item list.
- Impact: A student with one review word sees 23 enemies labelled with placeholder text.

#### The stale legacy page stays reachable and its exit links give a 404
- **major** | legacy-page
- Evidence: vocabulary/paladins-twin-soul/page.tsx:86, :108 and :128 link to /student/games, and PaladinsTwinSoulGame.tsx:355 sets window.location.href = "/student/games" on exit. No page.tsx exists at that path, so all four destinations give a 404, and all four drop the locale prefix. The page uses its own Konva game (:14, :17-20) and its own API routes. This page has no Thai or Chinese literals, so it is an exception to the shared literal defect.
- Impact: The student reaches a second, different game, and the back and exit buttons both give a 404.

#### The briefing never mentions the twin rescue that the card promises
- **minor** | description-mismatch
- Evidence: gameCards.ts:184 promises "rescue your twin soul" and "Match the magic to double your power". The objective (:1275), the mechanic instruction (:1276) and the on-canvas hint (:663) all describe only the formation and the shot. The rescue and the double fire strength occur only when the student destroys the enemy holding the twin (:961-965), which the blocker above prevents.
- Impact: The student reads a promise about a rescue and a power increase, receives no instruction about it, and never sees it.

*Checked and correct:* cover-paladins-twin-soul.png exists (gameCards.ts:185). catalog.ts:434-453 and the manifest (:1292-1310) agree on every field and all ten capabilities in the same order, and the loader (catalog.ts:585-586) resolves the correct module. A real defeat path calls complete(result,"defeat") (:801-812, :1315-1317). The tutorial controller is created after the game mounts (apk-game-host.tsx:326-328), so activeController is always defined, and replay remounts a fresh controller. Both tutorial steps find a valid enemy and produce a state change. The bindings for A, D, the arrow keys and Space all work, and the pointer drag and tap paths both reach the controller.


### griffin-riders-escape

#### The gates, the flight, and the escape do not exist
- **blocker**
- category: description-mismatch
- Evidence: gameCards.ts:192 says "Fly through the magical gates in the correct order to complete the sentence!" catalog.ts:121 says "Switch sky lanes and pass through sentence gates in order." The scene draws a background, one panel, one static circle, and two rounded rectangles (legacy-traversal-cartridges.ts:279-293). The player circle stays at the fixed position (width/2, height*0.48) on every frame (legacy-traversal-cartridges.ts:285). Nothing moves and nothing passes through anything.
- Impact: The student expects a flight game. The student gets two static buttons and a circle that never moves.

#### The correct gate prints the answer
- **blocker**
- category: content
- Evidence: legacy-traversal-cartridges.ts:291 prints the answer on the correct rectangle and "Left route" or "Right route" on the other. legacy-traversal-cartridges.ts:168 makes the correct side alternate left, right, left, right.
- Impact: The student reads the answer and can also win by pressing Left and Right in turn. The result measures no sentence knowledge.

#### The game has no defeat path
- **major**
- category: end-screen
- Evidence: legacy-traversal-cartridges.ts:411 completes only with "victory". The file has no "defeat" string.
- Impact: The loss end screen never appears.

#### The three declared capabilities are not implemented
- **major**
- category: catalog-drift
- Evidence: catalog.ts:126 and legacy-traversal-cartridges.ts:506 declare ["camera", "timers", "tweens"]. The scene calls only `this.add.graphics` and `this.add.text` (legacy-traversal-cartridges.ts:317-327).
- Impact: A host that selects a game by capability gets a game that cannot do what it claims.

#### The legacy page is a dead end with no way back
- **major**
- category: legacy-page
- Evidence: sentence/griffin-riders-escape/page.tsx holds 69 lines and contains no Link element and no href. The other legacy sentence pages give a "back to games" control, for example sentence/labyrinth-goblin-king/page.tsx:127.
- Impact: A student who opens this page can leave only with the browser back button.

#### The legacy page starts the game with no sentences and gives no message
- **major**
- category: legacy-page
- Evidence: sentence/griffin-riders-escape/page.tsx:15 starts `sentences` as an empty array. Lines 26-28 set the state only when `data.sentences` is present. Lines 29-31 write a fetch failure to the console only. Line 63 mounts GriffinRidersEscapeGame with whatever the state holds. The page has no NO_SENTENCES branch, unlike sentence/abyssal-well/page.tsx:113-118.
- Impact: A student with no saved sentences, or a student who meets a network error, sees an empty game and no explanation.

*Checked and correct:* The cover file public/games/cover/cover-griffin-riders-escape.png exists (gameCards.ts:193). The catalog entry and the manifest agree on id, title, description, version, runtimeApiVersion, inputMode, and requiredAssetBindings (catalog.ts:118-127 against legacy-traversal-cartridges.ts:396-405 and 496-509). The four declared keyboard keys all work: A and ArrowLeft give move-left, D and ArrowRight give move-right (legacy-traversal-cartridges.ts:504).

### astral-mage

#### The scene draws the whole sentence in reading order around a clock face
- **blocker** | content
- Evidence: astral-mage.ts:235-242 builds crystalRounds from words.map in sentence order and appends one decoy. getAstralMageCrystalPoints (:300-314) places crystal index i at angle -PI/2 + i*(2PI/n), so index 0 sits at the top and the rest follow clockwise. The array order is the sentence word order. The crystal list is frozen per sentence and is never filtered by wordIndex, so cast crystals stay on screen with their labels (syncTargetLabels :476-489 keys only on id and label).
- Impact: The student reads the sentence clockwise from the top of the circle and clicks in that order. The translation prompt at :522 has no effect on play, so the game measures no sentence knowledge.

#### The only wrong option is the fixed English phrase "Void echo"
- **blocker** | content
- Evidence: astral-mage.ts:241 appends Object.freeze({ id: `echo:${sentenceIndex}`, label: "Void echo" }) as the single decoy for every sentence. No other distractor exists.
- Impact: The student avoids one crystal that always says "Void echo". A Thai or Chinese student also reads an English phrase inside a target-language exercise.

#### The game has no defeat path
- **major** | end-screen
- Evidence: astral-mage.ts:709 is the only completion call: context.complete(result, "victory"). The file contains no "defeat" string. A wrong shot only records an attempt (:322-331) and never removes a life or ends the session.
- Impact: The loss end screen is unreachable. A student can shoot every wrong crystal and still finish with a Victory screen.

#### The Enter key casts but no screen lists it
- **minor** | start-screen
- Evidence: astral-mage.ts:40 binds Enter to "confirm". The briefing lists W, A, S, D, Arrow keys, Space (:678), and the in-scene hint (:538) says "Space casts".
- Impact: A working control stays hidden from the student.

#### The progress line shows no total word count
- **minor** | content
- Evidence: astral-mage.ts:526 prints "Ritual n of N  •  Word k" with no total for the word position, although sentenceWords holds the length.
- Impact: The student cannot tell how many words remain in the current ritual.

*Checked and correct:* cover-astral-mage.png exists (gameCards.ts:201). The catalog entry (catalog.ts:41-57) and the manifest agree on id, title, description, version, runtimeApiVersion, inputMode, requiredAssetBindings (both empty) and all six capabilities. This cartridge declares no art, so it is honest about the shared asset defect. The card text (gameCards.ts:200) matches the mechanic. The five listed keys all map to real bindings (:30-41). The scene keeps drawing during the tutorial, because update gates only the input block on sessionMode (:600) and always calls updateView, so both tutorial steps are visible. syncTargetLabels rebuilds the labels on a signature change, so no label goes stale.


### devourer-slime

#### The tutorial incorrect step does nothing when the sentence has one word
- **major** | tutorial
- Evidence: devourer-slime.ts:1157 selects the demo orb with orbs.find(o => !o.isEaten && o.index !== targetWordIndex). A one-word sentence produces one orb, so find returns undefined and :1158-1164 return accepted:false. A probe against dist/devourer-slime.js with [{term:"Hello"}] printed accepted:false, lastEvent:undefined. sentenceInputSchema (educational-io.ts:15) puts no word count on term.
- Impact: Step one runs its lead-in, demonstration, and linger timers with no change on the canvas.

#### The tutorial eats a distant orb and never moves the slime
- **major** | tutorial
- Evidence: devourer-slime.ts:1481 calls demonstrateOrb, and :1158 calls resolveOrb(id, true) with ignoreDistance true (:722 skips the overlap test). :1435 gates all input and all controller.tick behind sessionMode === "playing", so the tutorial session never moves the slime. The briefing teaches "Move the slime through the world toward the next word orb" (:1476).
- Impact: An orb vanishes on the far side of the arena while the slime stays still. The tutorial never shows movement, collision, or knight avoidance.

#### A one-sentence, one-word session wins during the tutorial
- **minor** | tutorial
- Evidence: The probe printed correct step accepted:true phase:victory delivered:{"accuracy":1,"xp":30}. devourer-slime.ts:764 calls terminalResult("victory") from the demonstration path. The result stays local because :1511 supplies a no-op delivery for a tutorial session.
- Impact: The tutorial canvas prints "Every sentence is complete!" (:1347) before the scored game starts.

#### The canvas prints no message for a correct word and none for a life loss
- **minor** | content
- Evidence: devourer-slime.ts:1345-1355 handles only victory, defeat, incorrect, and eat-enemy. The events correct (:750) and hit (:697) fall through to the idle hint.
- Impact: A correct word and a knight hit show the same idle text.

#### The Space key is bound to an action that can never run
- **minor** | start-screen
- Evidence: devourer-slime.ts:62 binds Space to confirm and :1283 returns confirm for Space. :872 resolves confirm through resolveOrb(id, false), which needs an overlap, but every overlap is consumed in the same frame by resolveCurrentCollision (:826) or tick (:1106). A probe printed confirm-with-no-overlap accepted:false and auto-ate-on-move true. The briefing key list (:1477) omits Space.
- Impact: Space does nothing. The pointer tap path (:1263) reaches the same dead action.

#### The canvas tells touch students to tap, but one tap moves about two pixels
- **major** | content
- Evidence: devourer-slime.ts:1357 prints "Drag or tap in a direction to move". A tap sets pointer.released for one snapshot only (runtime/input.ts:130-131), so :1443 applies one action at about 16.67 ms. :46 sets SLIME_MOVEMENT_SPEED to 0.2 world units per ms, giving 3.3 of 800 world units. The world draws at scale 0.675 (:25-28), so the slime moves about 2 screen pixels.
- Impact: A touch or mouse student taps and sees no movement. Only press-and-hold works, and the hint does not say so.

#### Head-up display text covers the play area and hides word orbs
- **minor** | content
- Evidence: devourer-slime.ts:1298 draws the 800x800 world at scale 0.675 with offsetX 210, so the arena fills x 210 to 750. The title (:1340), prompt (:1341), progress (:1344), feedback (:1355) and instructions (:1358) all start at x 24 with no wrap width. The prefix "Eat the next word: " alone is about 209 px at 22 px Arial.
- Impact: Orbs near the top or bottom left sit under opaque text and cannot be read.

#### The card promises a forest arena that the cartridge never draws
- **minor** | description-mismatch
- Evidence: gameCards.ts:208 reads "Start small in a forest arena...". devourer-slime.ts:1297-1305 draws one flat rectangle and one border. The old React version drew 40 grass circles (DevourerSlimeGame.tsx:41-49).
- Impact: The student picks a forest game and gets an empty green box.

#### The student cannot see the sentence they are building
- **minor** | content
- Evidence: devourer-slime.ts:1341 shows the translation only, and :1364 clears the label of every eaten orb. The progress line (:1342) shows a number, not words. The old version showed a per-word row (DevourerSlimeGame.tsx:199-207).
- Impact: After three words nothing on screen shows which words were eaten.

#### Two movement keys at once silently drop one direction
- **minor** | content
- Evidence: devourer-slime.ts:1278-1281 returns the first key in KEYBOARD_PRIORITY (:357-366), which lists Up and W before Down, Left and Right.
- Impact: Holding W and D moves up only. Diagonal movement is impossible while knights close in.

#### The legacy page stays publicly reachable and serves static Thai sample content
- **major** | legacy-page
- Evidence: sentence/devourer-slime/page.tsx has no guard. hooks/useSession.ts returns a hardcoded mock-user-id with status 'authenticated', and the app has no middleware and no (student) layout. Page :48 requests ?locale=..., but lib/games/api/sentencesRoute.ts:6-7 is force-static and never reads the query; it serves sampleSentences.ts:4-13, whose ten translations are Thai literals. Page :41 calls useScopedI18n with a key absent from locales/en.ts and never uses the result. Strings at :111, :133 and :144 are hardcoded English.
- Impact: Any visitor reaches a second, older game without an account, and every student practises the same ten demo sentences with Thai translations.

#### The legacy start screen lists a Dash control that does not exist
- **major** | legacy-page
- Evidence: DevourerSlimeGame.tsx:149 declares { label: "Dash", keys: "Shift" }. No handler exists in lib/games/devourerSlime.ts or hooks/useDirectionalInput.ts, which traps only the eight movement keys plus Space and Enter (:15-16).
- Impact: The student presses Shift to escape a knight and nothing happens.

#### The legacy end screen links to a leaderboard path that returns 404
- **major** | legacy-page
- Evidence: DevourerSlimeGame.tsx:172 passes showLeaderboardLink. GameEndScreen.tsx:180 uses href="/student/leaderboard". The only leaderboard route is under [locale], and the app has no middleware to add the segment.
- Impact: The leaderboard link gives a 404.

#### The legacy completion request always fails, and the page hides the failure
- **major** | legacy-page
- Evidence: page.tsx:84-95 posts { xpEarned, accuracy, correctAnswers, totalAttempts } with accuracy as a 0-100 percentage (:78-80). completeRoute.ts:40 validates with gameCompletionInputSchema, which is .strict() and requires gameType, difficulty, score, duration, victory, idempotencyKey, clientTimestamp, and accuracy between 0 and 1 (domain/src/games/schema.ts:68-82). The unknown key xpEarned alone fails the strict object, so the route returns 400. The page never reads res.ok.
- Impact: The student sees a victory screen and an XP number, but the run records nothing and no error appears.

*Checked and correct:* cover-devourer-slime.png exists (gameCards.ts:209). A script compared catalog.ts:456-470 with the manifest (:1487-1503) and reported MATCH on every field and all capabilities. The briefing keys W, A, S, D and the arrow keys all appear in DEVOURER_SLIME_KEYBOARD_BINDINGS (:52-62). A real defeat path works: :695 reduces lives, :697 calls terminalResult("defeat") at zero lives, and :1510 passes "defeat" to context.complete. The growth promise holds: the slime radius grows five units per correct word from 25 and passes the knight radius of 35 after three words. Empty content gives a clear message.


### sorcerer-ziggurat

#### Two of the three rune cubes show fixed English placeholder text
- **blocker** | content
- Evidence: sorcerer-ziggurat.ts:212-217 sets labels = { left: alternate, forward: "Moon sigil", right: "Sun sigil" } and then overwrites the correct direction with the expected word. When the correct direction is "left", both other cubes read "Moon sigil" and "Sun sigil". When it is "forward" or "right", one cube still reads a fixed English sigil name. The alternate is also replaced by "Echo rune" when the next word repeats (:209-211).
- Impact: The student picks the only cube that holds a real sentence word. The translation prompt at :466 has no effect on play. A Thai or Chinese student also reads English placeholder text.

#### The correct path is fixed for every student and every replay
- **major** | content
- Evidence: directionFor (:205-207) returns ZIGGURAT_DIRECTIONS[(seed + sentenceIndex*7 + wordIndex*11) % 3]. Both hosts pass seed 29 (AuthenticatedCartridgeHost.tsx:272, PublicCartridgeHost.tsx:184), and standard-experience.ts:70 also fixes the tutorial seed at 29. No other input affects the direction.
- Impact: The whole climb path is the same on every attempt by every student. A student who repeats the game can climb it from memory.

#### The game has no defeat path
- **major** | end-screen
- Evidence: sorcerer-ziggurat.ts:629 is the only completion call: context.complete(result, "victory"). The file contains no "defeat" string. A wrong step only records an attempt (:323-325).
- Impact: The loss end screen is unreachable. A student can step wrong every time and still finish with a Victory screen.

#### The card promises an isometric pyramid that the scene does not draw
- **minor** | description-mismatch
- Evidence: gameCards.ts:216 reads "Jump through an isometric pyramid of cubes". The scene draws two flat filled triangles for the pyramid (:446-447) and flat rounded rectangles with circles for the cubes (:451-459). No isometric projection exists.
- Impact: The student expects a three-dimensional cube puzzle and gets three flat buttons in front of a triangle.

*Checked and correct:* cover-sorcerers-ziggurat.png exists (gameCards.ts:217). The catalog entry (catalog.ts:59-75) and the manifest agree on id, title, description, version, runtimeApiVersion, inputMode, requiredAssetBindings (both empty) and all six capabilities. This cartridge declares no art, so it is honest about the shared asset defect. The six listed keyboard keys A, Left Arrow, W, Up Arrow, D, Right Arrow map exactly to the six real bindings (:30-37), with no dead key and no hidden key. The tutorial fallback correctDirection === "left" ? "right" : "left" is safe for all three direction values, because it never returns the correct direction. The scene keeps drawing during the tutorial, because update gates only the input block on sessionMode (:543) and always calls updateView, so both steps are visible.


### haunted-library

#### The player can never move down a floor, so most sessions are impossible to win
- **blocker** | content
- Evidence: haunted-library.ts:857-896 (moveFloorPhysics) lands the player on the first floor the body crosses, and every floor spans the full canvas width. The only vertical changes are upward, JUMP_FORCE and TRAMPOLINE_FORCE (:71-75). move("down") (:1073-1077) only cancels upward velocity while airborne and does nothing while grounded. A fuzz run of 60 seeds by 4000 random move and tick steps after a climb produced no floor decrease. Doors get a random floor at :492, and findNearestHauntedLibraryDoor (:629) requires door.floor === player.floor. For a 3-sentence set of 6, 6 and 5 words, 492 of 500 seeds place a later door on a lower floor than an earlier door. Seed 7 gives door floors 2, 1, 1, 0, 0, 0.
- Impact: The student opens the first word door on an upper floor and cannot return to the lower floor that holds the next word. The sentence never finishes. The only exit is to let ghosts or bats take all three lives.

#### A door opened in the wrong order is removed from play forever, so the sentence locks
- **blocker** | content
- Evidence: haunted-library.ts:786-788 marks the selected door isOpen: true and never clears it, and findNearestHauntedLibraryDoor (:629) filters !door.isOpen. Proof run with "one two three", seed 11: the player opens door 1 while wordIndex is 0 (wrong, lives 3 to 2), then opens door 0 (correct, wordIndex to 1). The required word is now "two", but door 1 stays open. Standing at door 1 and calling interact() returns accepted:false and wordIndex stays 1.
- Impact: One wrong door press permanently deletes a word the student must still open. move("up") also opens a door instead of jumping whenever an unopened door is within 72 px on the same floor (:1057-1059), so a student who presses W to climb can trigger the lockout by accident.

#### A wrong-then-right sequence makes the state fail its own validation, and a resize freezes the game
- **major** | other
- Evidence: haunted-library.ts:988-991 rejects any state where index === state.wordIndex && restored.isOpen && restored.isCorrect !== true. The controller produces exactly that state after the student opens door k as wrong and later advances wordIndex to k. capture() returns that snapshot (:1149), and apkRestoreResponsiveState (:1395-1398) calls restore, which throws "Haunted Library door state is inconsistent". runtime.ts:234-238 calls capture then restore on every composition profile change, and the catch (:253-257) calls pause and never resumes.
- Impact: A device rotation or a window resize after one wrong door pauses the game forever. Only a page reload recovers it.

#### The guided tutorial driver can pick an already-open door, so a step shows nothing
- **major** | tutorial
- Evidence: haunted-library.ts:1424-1427 selects the demonstration door with state.doors.find(...) and never checks isOpen. openNearestDoor (:780-781) returns emptyResult() when no closed door is found. The scene processes real student keys during the tutorial, because :1364 includes sessionMode === "tutorial", so the student can open the word-0 door before the demonstration runs. Proof run: after word 0 is open and wordIndex is 1, the driver picks door 0, and interact() returns accepted:false with lives and open-door count unchanged. A second cause: for a one-word sentence, doors.find(d => d.wordIndex !== state.wordIndex) is undefined and the driver returns at :1428.
- Impact: The "See how feedback helps" step shows no change. The student watches a 1.4 s step that teaches nothing, and no error explains it.

#### The tutorial spends real lives and real score on the demonstration
- **minor** | tutorial
- Evidence: haunted-library.ts:1441-1442 calls the real controller.interact(). openNearestDoor (:791-801) decrements lives and spawns a bat for the incorrect step. Proof run at wordIndex 0: step 1 gives outcome "incorrect" with lives 3 to 2; step 2 gives "correct". The briefing tip (standard-experience.ts:63) states "The guided tutorial is safe and does not save results or award XP."
- Impact: The HUD line "Lives 3" drops to "Lives 2" during a tutorial the briefing calls safe. The tutorial controller is discarded before real play, so no lasting harm reaches the scored session, but the counter contradicts the tip.

#### The briefing lists a keyboard key that produces no visible change
- **minor** | start-screen
- Evidence: haunted-library.ts:1419 lists "S/Down" in keyboardKeys, and KeyS and ArrowDown map to move-down (:97-98). move("down") (:1073-1077) only clamps upward velocity while airborne and changes nothing on the ground. Because no descent exists, the key has no reachable purpose.
- Impact: The student reads "S/Down", presses it to go down a floor, and sees no change.

#### Legacy page: the end-screen Exit button does nothing and the warning link drops the locale
- **major** | legacy-page
- Evidence: sentence/haunted-library/page.tsx:28-32 declares onNavigate as an optional prop, but a Next.js route component never receives it, so it is always undefined. HauntedLibraryGame.tsx:120-124 defines handleExit, which does nothing without onNavigate, and :293 passes onExit={handleExit}. GameEndScreen.tsx:167-174 renders the Exit button whenever onExit is defined and has no Link fallback, although the comment at HauntedLibraryGame.tsx:29-32 claims one exists. Separately, page.tsx:172 uses <Link href="/">Back to Dashboard</Link>, which drops the [locale] prefix.
- Impact: A student who finishes the legacy version presses Exit and stays on the same screen. This stale second version stays reachable beside the cartridge route.

*Checked and correct:* cover-haunted-library.png exists (gameCards.ts:225). A programmatic comparison of cartridgeCatalog against createHauntedLibraryCartridge().manifest found no drift in any field or in the 12 capability strings. The declared briefing keys map to real bindings: Enter and Space give confirm, A/ArrowLeft and D/ArrowRight move horizontally, and W/ArrowUp jumps or opens a door (:90-101). No working key is missing from the list. The defeat path is real: damage() and the wrong-door branch call finish("defeat"), which sets terminalDeliveryOutcome to "defeat" and delivers it (:728-737, :756-763, :803-805). The catalog promise of ghosts and bats is implemented: ghosts patrol and stun (:508-527, :1102-1108), and bats spawn on wrong doors and chase (:795-801, :1109-1124). The legacy page and its game component contain no Thai or Chinese literals and no /student/games or /student/articles links.


### gryphon-patrol

#### The guided tutorial demonstrates on enemies that are off the screen
- **blocker** | tutorial
- Evidence: gryphon-patrol.ts:1318-1331 picks the target enemy (:1323) and a non-target enemy (:1330). Neither find returns undefined, because buildEnemies always makes at least 2 decoys (:532) and always marks index 0 as the target (:527). The fault is position. The player starts at world x=180 (:627); the camera origin is wrapWorldX(playerX - sceneWidth/2) = 1700 (:564-569); enemies spawn between world x 420 and 1860 (:502). Both hosts pass seed 29, and the host gives the same seed to the tutorial mount (apk-game-host.tsx:315). A replay of the seeded generator for seed 29 puts the first target at world x=723 (screen x = -977) and the first non-target at world x=936 (screen x = -764). With 5 sentence words only 3 of 10 enemies are on screen at the start, and the first target is not one of them. The scene does redraw in tutorial mode (:1281-1286).
- Impact: The student starts the guided tutorial and sees no change. Both steps delete a circle outside the visible sky.

#### The tutorial never shows a projectile, a moving enemy, or a word orb
- **major** | tutorial
- Evidence: gryphon-patrol.ts:1324-1327 calls hitEnemy and then collects the orb in the same synchronous call, so no frame draws between the spawn and the removal. The driver never calls controller.fire(), so no projectile exists. :1284 skips controller.tick when sessionMode is not "playing", so enemies stay frozen. The briefing promises "Fly in four directions, fire at the marked enemy, and collect its dropped word orb" (:1316).
- Impact: The student never sees the orb the objective names. The tutorial shows deletion, not shooting and collecting.

#### The first word target is off the screen at the start of the scored game
- **major** | content
- Evidence: Same geometry: player start x=180 (:627), camera origin 1700 (:564-569), spawn band 420 to 1860 (:502). With seed 29 the first target sits at world x=723, inside the invisible band 660 to 1700. The head-up display shows only the translation prompt (:1201). The scene draws no arrow, no edge marker, and no minimap for off-screen enemies (:1171-1177).
- Impact: The game starts with an empty sky and a prompt. The student must fly blind through a 2000 px wrapped world to find the target.

#### Player flight speed is frame-rate dependent and 50 times the enemy speed
- **major** | content
- Evidence: gryphon-patrol.ts:1222-1232 collects every held direction key into a set and calls controller.choose once per key on every frame. choose calls move, which adds a fixed PLAYER_STEP of 42 px (:371, :846-852) and ignores the frame delta. At 60 fps the player moves 2520 px/s across a 2000 px world (:30) and crosses the 540 px sky in about 0.2 s. Enemies move at 48 to 64 px/s (:378-379) and the projectile at 500 px/s (:372).
- Impact: One key tap throws the gryphon across the world, and the player outruns his own shots. A 144 Hz display moves 2.4 times faster than a 60 Hz display.

#### The touch fire button has no label and its tap zone is larger than the drawn button
- **major** | content
- Evidence: gryphon-patrol.ts:1187-1188 draws an amber rounded rectangle at (width-150, height-82, 120, 54) and adds no text. The only "FIRE" string is in the instruction line (:1214), "Tap FIRE to shoot". chooseGryphonPatrolPointerIntent (:594-601) treats every release with x >= 0.78*width and y >= 0.78*height as a shot. On a 960x540 canvas that zone starts at x=749 while the drawn button starts at x=810.
- Impact: The touch student looks for a FIRE button and finds a blank yellow box. A tap between x=749 and x=810 fires with no visible button under the finger.

#### The Enter key fires but the briefing does not list it
- **minor** | start-screen
- Evidence: GRYPHON_PATROL_KEYBOARD_BINDINGS maps Enter to confirm (:42). The briefing lists only W, A, S, D, Arrow keys, Space (:1317). Every listed key does work.
- Impact: The student does not learn that Enter fires.

#### Decoy enemies carry real sentence words, and the green colour gives the answer away
- **minor** | content
- Evidence: gryphon-patrol.ts:535,542 gives each decoy the word of another sentence target and replaces the word only when it equals the FIRST target word. So when the current target is word 2, a decoy can also show word 2. :1174 fills the current target green 0x6cf0a7 and every other enemy red 0xec6876.
- Impact: The word text cannot decide the answer, because two enemies can show the same word. The student shoots the green circle without reading.

#### The legacy page stays reachable with broken links, a Thai literal, false analytics, and dead difficulty buttons
- **major** | legacy-page
- Evidence: sentence/gryphon-patrol/page.tsx is 369 lines and still serves /en/student/games/sentence/gryphon-patrol. Links point to /student/games (:163, :231) and /student/articles (:210); neither target exists and all three omit the [locale] segment. :151 shows the hardcoded Thai literal "กำลังโหลด". :131-132 post invented values, correctAnswers: results.xp and totalAttempts: results.xp + 2, both marked "// Adjust as needed", plus gameTime: 0 (:133). The four difficulty buttons (:277-291) set state that GryphonPatrolGame.tsx uses only in the result payload (:41, :153) and never in the game rules.
- Impact: The back button and the Read Articles button both give a 404. A non-Thai student sees Thai text while the page loads. The leaderboard stores an invented accuracy, and the four difficulty buttons change nothing.

*Checked and correct:* cover-gryphon-patrol.png exists. The catalog entry (catalog.ts:496-512) agrees with the manifest (:1335-1353) on id, title, description, version, runtimeApiVersion, inputMode, the one asset binding, and all eight capabilities. The card text (gameCards.ts:232) matches the real mechanic. A true defeat path works: enemy contact removes one of three health points (:720-731, :928-935) and zero health calls terminalResult("defeat"), which the host renders as the defeat end screen. The cartridge rejects empty content through validateNonEmptyContent (:486). The tutorial finds never return undefined, and the scene does redraw in tutorial session mode.

