# Gameplay evaluation

This evaluation covers all 28 cartridge identities in the current portfolio.
It uses controller source inspection, existing planning records, and explicitly labeled browser observations.
It does not contain customer session results or measured usage data.
The owner identified Wizard vs. Zombie as a likely customer favorite.
That statement is the only customer preference evidence used here.

The entries distinguish source inferences from browser observations.
Browser sessions can verify presentation and controls. Student sessions must establish comprehension and enjoyment.

## Survival and exploration

### Wizard vs. Zombie

- **Loop:** The player reads a Thai prompt, selects its English meaning, avoids zombies, and earns a shockwave after a correct collection.
- **Meaningful decision:** The player chooses a route and decides when nearby zombies justify one limited shockwave.
- **Code inference:** Correctness depends on soul collision, while enemy pursuit adds continuous pressure. This can make control errors look like language errors.
- **Recommended rebuild:** Keep the connected graveyard. Improve route cues, spawn pacing, English answer audio, and visible protection feedback.
- **Suitable modality:** Show the Thai prompt with English text or audio choices. Audio playback needs replay and an explicit reading option.
- **Source:** [wizard-vs-zombie.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/wizard-vs-zombie.ts:974), [wizard-vs-zombie.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/wizard-vs-zombie.ts:1117), and [handoff-portfolio.md](/home/daniebo/Desktop/reading-advantage-monorepo/measure/tracks/apk_arcade_portfolio_refactor_20260908/handoff-portfolio.md:7).

### Enchanted Library

- **Loop:** The player crosses a room, collects the matching translation book, restores mana, and uses shield charges against spirits.
- **Meaningful decision:** The player balances the shortest book route against spirit risk and shield timing.
- **Code inference:** Every book collision creates a new full layout. The player cannot learn stable shelf routes across targets.
- **Recommended rebuild:** Use authored rooms with stable shelves, clear exits, and shield decisions that change safe routes.
- **Suitable modality:** Reading and listening vocabulary both fit. Listening should identify the prompt while visible books remain readable.
- **Source:** [enchanted-library.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/enchanted-library.ts:665) and [enchanted-library.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/enchanted-library.ts:1455).

### Shadow Gate Dungeon

- **Loop:** Move through supplied English word crystals in sentence order while a creature pursues the player. Enter the unlocked gate to finish.
- **Meaningful decision:** Choose a route to the next word while avoiding other words and the creature.
- **Learning:** A prominent Thai sentence provides the target. Physical word contact records an answer. Creature contact stays outside language accuracy.
- **Observed gameplay:** Native pointer movement completed “I see a bridge” and reached the gate. Results showed 400 points, 100% accuracy, and 4/4 correct.
- **Recommended improvement:** Add authored rooms, useful obstacles, and coherent dungeon art. The current open room does not provide enough route choices.
- **Suitable modality:** Reading supports sentence order. A later listening mode needs separate English audio choices and completed-playback rules.
- **Evidence limit:** One sample sentence completed in a standalone preview. Authenticated results, longer sessions, and final art remain unverified.
- **Source:** [shadow-gate-dungeon.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/shadow-gate-dungeon.ts). Native result: `/tmp/shadow-stage.png`.

### Labyrinth of the Goblin King

- **Original loop:** Move continuously through a maze, collect English words in sentence order, and avoid goblins. Complete a sentence to gain temporary power.
- **Meaningful decision:** Queue turns at junctions and choose routes around goblins. Use temporary power to chase goblins.
- **Regression:** The previous APK loader used a generic direction quiz. It removed maze movement, visible English words, goblins, and temporary power.
- **Active rebuild:** The dedicated source cartridge restores maze movement, queued turns, physical word contacts, goblin behavior, and finite sentence completion.
- **Learning:** Show the Thai sentence prominently and retain supplied English word labels. Keep movement and goblin contact outside language accuracy.
- **Assets:** The preview uses the inspected crypt floor and top-down static actors. Directional animation and coherent wall art remain unfinished.
- **Observed gameplay:** After the spawn correction, native keyboard movement completed “I see a bridge” with all three lives and 4/4 correct answers.
- **Recommended improvement:** Add verified actor animation and coherent wall art. Review longer sentences and touch controls.
- **Evidence limit:** Six focused cases pass. Native completion covers one sample sentence. Pointer control, final art, and authenticated results remain unverified.
- **Source:** [labyrinth-goblin-king.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/labyrinth-goblin-king.ts). Native result: `/tmp/labyrinth-native-result.png`.

### Dungeon Liberator

- **Loop:** The player rescues sentence prisoners in order, forms a trailing chain, avoids monsters, and escorts the chain to an exit.
- **Meaningful decision:** The player chooses routes that protect the chain while reaching the next required prisoner.
- **Code inference:** A wrong prisoner resets the chain. Monster contact can also remove progress, which creates repeated traversal.
- **Current correction:** Matching English words now count equally. Restored trails retain the selected prisoner identities.
- **Observed presentation:** The compact preview shows a bare Thai target, readable English labels, and clearly sized top-down actors.
- **Recommended rebuild:** Keep the escort identity. Review recovery checkpoints, touch controls, and suitable abilities.
- **Suitable modality:** Reading fits ordered prisoner labels. A later listening mode needs separate English audio choices and explicit playback rules.
- **Observed gameplay:** Native play completed an escort recovery route. The reward correction then passed a focused restore case and a clean native completion.
- **Evidence limit:** The focused case verifies capped repeat rewards. Final map design, touch controls, and authenticated results remain under review.
- **Source:** [dungeon-liberator.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/dungeon-liberator.ts:843) and [dungeon-liberator.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/dungeon-liberator.ts:1540).

### Village Guardian

- **Loop:** The player rescues ordered villagers, maintains their trail through hazards, and leads the group to sanctuary.
- **Meaningful decision:** The player chooses a safe path and protects the weakest trail section.
- **Code inference:** This structure closely matches Dungeon Liberator. The controller lacks a unique guardian action that changes escort strategy.
- **Recommended rebuild:** Use one escort engine. Add village defenses or route preparation before retaining a separate public title.
- **Suitable modality:** Reading and listening sentence modes both fit. Speech can state the sentence before the rescue route begins.
- **Source:** [village-guardian.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/village-guardian.ts:725) and [village-guardian.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/village-guardian.ts:1564).

### Devourer Slime

- **Loop:** The slime eats sentence words in order, grows after correct words, shrinks after wrong words, and can overpower smaller knights.
- **Meaningful decision:** The player chooses whether current size supports an attack or requires an avoidance route.
- **Code inference:** Each sentence replaces the arena entities. This limits long-range planning despite the persistent growth rule.
- **Recommended rebuild:** Keep growth as the central rule. Add authored size gates, optional prey, and routes that open at clear thresholds.
- **Suitable modality:** Reading fits visible word order. Listening can present a sentence before the player chooses visible word orbs.
- **Source:** [devourer-slime.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/devourer-slime.ts:744) and [devourer-slime.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/devourer-slime.ts:804).

#### Next implementation packet

- Preserve free movement, physical orb contact, slime growth, knight avoidance, size-based knight eating, finite sentences, and five-field results.
- Show the bare Thai sentence as the main target. Show the built English sentence and neutral English word orbs.
- Remove the title, control sentence, world-mode label, answer hint, and instructional feedback from the live board.
- Count an orb as correct when its visible English term matches the expected term. Track repeated occurrences without hidden-index penalties.
- Present bounded orb waves for long sentences. Keep the expected remaining term visible and preserve every supplied word across waves and restore.
- Size complete labels from the rendered canvas bounds. Keep card, text, pointer, and collision geometry aligned at native and CSS-scaled widths.
- Keep held keyboard movement. Stop pointer movement on release, cancel, pause, and cleanup.
- Replace restore counter replay with validated direct counters. Bound sentence, word, actor, random, time, and result fields before mutation.
- Retain `tile-grass` for the arena. It is an inspected 16×16 top-down ElvGames tile, but the current opaque green arena fill hides it.
- Retain `enemy-idle` for the slime. It is an inspected 192×32 ElvGames sheet with six purple slime frames.
- Retain `player-knight` for hazards. It is an inspected 192×32 ElvGames sheet with six knight frames.
- Bind no uninspected terrain or actor assets. The current side-view actors remain a perspective limit within the top-down movement arena.
- Own `packages/game-cartridges/src/devourer-slime.ts`, its focused test, the single catalog art mapping, and Thai host content lists.
- Test physical ordered capture, duplicate fairness, wrong-word shrink, size-gated knight contact, long waves, pointer release, compact labels, completion, and bounded restore.

## Flight and aerial action

### Dragon Flight and Dragon Rider

- **Loop:** The player reads a Thai vocabulary target and selects one of two English gates on the shared flight engine.
- **Meaningful decision:** The player identifies the English meaning and commits to its lane before gate contact.
- **Current implementation:** Both historical identities use the vocabulary flight engine. Their routes and result identifiers remain separate.
- **Earlier baseline:** Dragon Rider showed generic route labels. Dragon Flight showed reversed language direction and immediate click progression.
- **Current correction:** All three hosts now supply Thai prompts. The cartridges show supplied English choices with compact label handling.
- **Recommended improvement:** Verify sustained flight, growth, and guardian pacing through complete native sessions before accepting the experience.
- **Suitable modality:** Keep the Thai target and offer English audio choices. Speakers replay audio; gate traversal submits the answer.
- **Scope:** Preserve the vocabulary lane identity separately from Griffin's sentence Joust gameplay.
- **Source:** [Shared flight cartridge](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/dragon-flight.ts).

### Griffin Rider's Escape

- **Loop:** The shared legacy controller maps each next sentence word to a left or right gate.
- **Meaningful decision:** The implemented decision is which word gate continues the sentence.
- **Code inference:** Correct sides cycle by target index. The controller contains no pursuit or escape state.
- **Recommended rebuild:** Trace the historical Griffin identity against Griffin Sky-Joust. Preserve the owner's intended Joust mechanic separately from dragon lane choices.
- **Suitable modality:** Reading is primary for word order. Listening can play the complete sentence before visible word gates appear.
- **Source:** [legacy-traversal-cartridges.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/legacy-traversal-cartridges.ts:199) and [legacy-traversal-cartridges.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/legacy-traversal-cartridges.ts:674).

### Spellweaver's Run

- **Loop:** The player changes lanes to catch the next English word for a Thai sentence. Contact resolves the answer.
- **Meaningful decision:** The player reads the supplied choices and selects a lane before the falling words reach the player.
- **Current implementation:** Seeded choices replace the predictable lane sequence. Equivalent visible correct words receive equal treatment.
- **Browser observation:** Native lane changes completed `I see a bridge` with score 400, accuracy 100%, and 4/4 correct.
- **Recommended improvement:** Review timing with students. Improve running animation and route artwork without reducing word readability.
- **Suitable modality:** Reading supports ordered word collection. Listening can present the sentence before a run, with replay available.
- **Evidence:** [Cartridge source](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/spellweavers-run.ts) and [native victory image](/tmp/spellweaver-stage.png).

### Griffin Sky-Joust

- **Loop:** The player controls altitude and drift, then lands on knights carrying sentence words in order.
- **Meaningful decision:** The player chooses an approach angle that produces a top strike without a side collision.
- **Code inference:** Collision geometry can cause damage without recording a language attempt. Control precision can obscure learning performance.
- **Browser observation:** The public preview showed eleven word enemies from two sentences, including a second sentence before the first was complete.
- **Visual defects:** A dragon-like rider and purple flying creatures appear over repeated terrain viewed from above, despite the griffin and knight description.
- **Verification limit:** Public taps moved the rider, but this session did not verify a successful top strike or a complete encounter.
- **Recommended rebuild:** Keep aerial collision play. Add landing assistance, a strong target marker, and separate control damage from language scoring.
- **Suitable modality:** Reading fits visible sentence words. Listening can state the sentence before the aerial sequence.
- **Source:** [griffin-sky-joust.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/griffin-sky-joust.ts:687) and [griffin-sky-joust.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/griffin-sky-joust.ts:1203).

### Gryphon Patrol

- **Loop:** The player flies through a wrapped world, shoots the enemy for the next word, then collects its dropped orb.
- **Meaningful decision:** The player chooses an attack route and then chooses a safe recovery route.
- **Code inference:** One language match requires both a shot and an orb collection. The second control task delays learning progress.
- **Recommended rebuild:** Keep the patrol identity only if recovery routes create useful strategy. Shorten the shot-to-credit interval.
- **Suitable modality:** Reading is primary for enemy labels. Listening can state the target sentence before each patrol wave.
- **Source:** [gryphon-patrol.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/gryphon-patrol.ts:795) and [gryphon-patrol.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/gryphon-patrol.ts:1455).

## Defense and ranged combat

### Magic Defense

- **Loop:** The player types or selects a translation before its missile reaches one of three castles.
- **Meaningful decision:** The player decides how quickly to answer while castle health and the session timer fall.
- **Code inference:** Correct answers add mana, but the controller exposes no player action that spends mana.
- **Recommended rebuild:** Add a clear spell choice that spends mana on shields, slowing, or area defense.
- **Suitable modality:** Reading and listening vocabulary both fit. Listening should use selectable answers instead of mandatory typed recall.
- **Source:** [magic-defense.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/magic-defense.ts:927) and [magic-defense.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/magic-defense.ts:1499).

### Archer's Revenge

- **Loop:** The player aims across an enemy formation and shoots the unshielded translation target.
- **Meaningful decision:** The player chooses the correct target and lines up a precise shot.
- **Code inference:** The correct enemy is the only unshielded enemy. Shield state can reveal the answer without vocabulary recognition.
- **Recommended rebuild:** Make all targets vulnerable. Use formation movement, limited arrows, or cover to create the combat decision.
- **Suitable modality:** Reading and listening vocabulary both fit. Speech can provide the prompt while targets keep visible translations.
- **Source:** [archers-revenge.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/archers-revenge.ts:575) and [archers-revenge.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/archers-revenge.ts:1189).

### Paladin's Twin-Soul

- **Loop:** The player moves under a vocabulary enemy, shoots it, avoids counterfire, and can recover a captured twin.
- **Meaningful decision:** The player chooses target order and position while preserving the twin's stronger volley.
- **Code inference:** Every hit removes its enemy, including a wrong target. This permits formation clearing without correct recognition.
- **Recommended rebuild:** Keep the twin rescue rule. Let wrong targets survive, counterattack, or block the correct target.
- **Suitable modality:** Reading and listening vocabulary both fit. Speech should precede each formation and remain replayable.
- **Source:** [paladins-twin-soul.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/paladins-twin-soul.ts:1027) and [paladins-twin-soul.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/paladins-twin-soul.ts:1356).

### Castle Defense

- **Loop:** The player collects sentence words in order, carries the chain to a tower slot, and survives enemy waves.
- **Meaningful decision:** The player chooses a collection route and a build location before the next attack.
- **Code inference:** One wrong word resets the full sentence inventory. The repeated collection can dominate the defense decision.
- **Recommended rebuild:** Preserve partial progress and add distinct tower effects. Let word order determine available defenses.
- **Suitable modality:** Reading is primary for construction order. Listening can state the sentence before collection.
- **Source:** [castle-defense.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/castle-defense.ts:822) and [castle-defense.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/castle-defense.ts:1735).

### The Abyssal Well

- **Loop:** The player rotates around radial lanes and shoots enemies carrying sentence words in order before they breach the rim.
- **Meaningful decision:** The player prioritizes lanes by word order, enemy depth, and travel distance.
- **Code inference:** Future words can arrive before the current word. A correct future word becomes an incorrect attempt when shot early.
- **Implemented:** A prominent Thai sentence directs English word selection. Four neutral cards connect to their enemies through visible lines.
- **Implemented:** Held rotation, direct counter restoration, and duplicate-word fairness preserve the radial defense rules. Reviewed assets show the well and actors.
- **Gameplay evidence:** One keyboard session completed four ordered words with 400 points and 100% accuracy. A later visual check confirmed first-spawn visibility.
- **Recommended improvement:** Review four simultaneous enemies, touch aiming, and longer sentences. Check whether each enemy remains readable as its depth changes.
- **Listening gap:** This game does not yet provide verified English answer audio. Add selectable English audio while retaining the Thai prompt.
- **Source:** [abyssal-well.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/abyssal-well.ts:406) and [abyssal-well.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/abyssal-well.ts:476).

## Construction, puzzles, and service

### RPG Battle

- **Loop:** The player types or selects an English word for a Thai target to attack. Wrong answers trigger enemy counterattacks.
- **Meaningful decision:** The player chooses typed recall or a visible answer and tries to maintain an attack streak.
- **Browser observation:** Four native typed answers reached the common victory screen with score 400 and 100% accuracy.
- **Code inference:** Attack power follows the target index. Correct answers skip all counterattacks, so the player makes no tactical combat choice.
- **Recommended rebuild:** Add two or three bounded actions with clear costs. Keep language correctness as the gate for each action.
- **Suitable modality:** Reading best supports typed recall. Listening fits a selectable-answer variant with replay and transcript controls.
- **Source:** [rpg-battle.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/rpg-battle.ts:764) and [rpg-battle.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/rpg-battle.ts:815).

### Rune Match

- **Loop:** The player swaps adjacent vocabulary runes, matches the current target, triggers powers, and withstands timed monster attacks.
- **Meaningful decision:** The player chooses a swap that advances the target while preparing heal, shield, or damage groups.
- **Code inference:** The controller repairs the board to ensure a target move after turns. This can interrupt stable multi-turn planning.
- **Recommended rebuild:** Keep the board identity. Make repair visible, reduce label density, and reward planned power combinations.
- **Suitable modality:** Reading is primary because the board carries many labels. Listening can announce the current target only.
- **Source:** [rune-match.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/rune-match.ts:1320) and [rune-match.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/rune-match.ts:1374).

### Alchemist's Synthesis

- **Loop:** The player selects the source term that matches each translation before a 60-second timer expires.
- **Meaningful decision:** The player chooses among shuffled terms under time pressure.
- **Code inference:** Each round uses the deck's ordered terms as its option set. Large decks can produce crowded, uncontrolled choice difficulty.
- **Recommended rebuild:** Show three or four ingredients per recipe. Add recipe effects that change the next round or timer.
- **Suitable modality:** Reading and listening vocabulary both fit. Listening can speak the translation while source terms remain visible.
- **Source:** [alchemists-synthesis.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/alchemists-synthesis.ts:300) and [alchemists-synthesis.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/alchemists-synthesis.ts:924).

### Astral Mage

- **Loop:** The player moves near crystals and shoots sentence words in order to complete a constellation.
- **Meaningful decision:** The player chooses a route between the required crystal and decoys.
- **Code inference:** Crystals use evenly spaced circular positions. This produces repeated geometry with little spatial planning.
- **Recommended rebuild:** Use changing constellations, line-of-sight blockers, and spells that alter safe crystal routes.
- **Suitable modality:** Reading is primary for word order. Listening can play the sentence before the constellation appears.
- **Source:** [astral-mage.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/astral-mage.ts:337) and [astral-mage.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/astral-mage.ts:424).

### The Sorcerer's Ziggurat

- **Loop:** The player chooses the left, forward, or right rune cube containing the next sentence word.
- **Meaningful decision:** The player identifies the next word and commits to one adjacent climbing route.
- **Code inference:** A seeded function assigns each correct direction. The controller stores sentence progress but no persistent branch consequences.
- **Recommended rebuild:** Keep accessible three-way choices. Add branches with visible risk, recovery, and route rewards.
- **Suitable modality:** Reading is primary. Listening can state the sentence before each short climb.
- **Source:** [sorcerer-ziggurat.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/sorcerer-ziggurat.ts:273) and [sorcerer-ziggurat.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/sorcerer-ziggurat.ts:333).

### Potion Rush

- **Loop:** The player assigns ordered sentence ingredients to active cauldrons, dumps spoiled brews, and serves waiting customers.
- **Meaningful decision:** The player chooses which customer and cauldron need attention under shared time pressure.
- **Code inference:** One wrong ingredient spoils the full cauldron. Recovery requires dumping progress and repeating the brew.
- **Recommended rebuild:** Keep service management. Allow one correction action and give customers distinct but readable priorities.
- **Suitable modality:** Reading is primary for word order and concurrent recipes. Listening can introduce each order with replay.
- **Source:** [potion-rush.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/potion-rush.ts:809) and [potion-rush.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/potion-rush.ts:1418).

### Rune Forge Chamber

- **Loop:** The player selects orbiting runes in sentence order while chamber hazards reduce stability.
- **Meaningful decision:** The player chooses the correct rune while its screen position changes.
- **Current behavior:** A bare Thai sentence leads English rune selection. Visible word equality accepts duplicate words fairly. Seeded waves vary card positions.
- **Local play evidence:** Pointer selection completed “I see a bridge” with 400 points, 100% accuracy, and four correct answers.
- **Compact review:** Complete English cards remain visible on the moving orbit. The preview uses the reviewed crypt floor.
- **Remaining evidence:** Authenticated results, native touch, and longer sentences remain unverified.
- **Recommended rebuild:** Connect orbit timing to safe forge windows, combos, or heat management.
- **Suitable modality:** Reading is primary for moving labels. Listening can provide the sentence before each orbit cycle.
- **Source:** [rune-forge-chamber.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/rune-forge-chamber.ts:638) and [rune-forge-chamber.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/rune-forge-chamber.ts:1057).

### Realm Carver

- **Loop:** The player leaves safe territory, draws a closed trail, and captures sentence words in order while monsters threaten the trail.
- **Meaningful decision:** The player balances capture size, target inclusion, route length, and exposure.
- **Code inference:** A closed area evaluates only the earliest active captured word. Other captured words receive no immediate language result.
- **Recommended rebuild:** Keep this distinct territory game. Preview captured targets and explain which word the closure will evaluate.
- **Suitable modality:** Reading is primary for spatial labels. Listening can state the target sentence and repeat the next word.
- **Source:** [realm-carver.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/realm-carver.ts:722) and [realm-carver.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/realm-carver.ts:1429).

## Vertical traversal

### Storm the Castle Tower

- **Loop:** The player moves through four tower columns, confirms near ordered word windows, and avoids falling oil and rocks.
- **Meaningful decision:** The player chooses a route that reaches the next word while avoiding the active hazard column.
- **Current behavior:** Visible English words determine correctness. The camera shows a bounded set of word windows beneath a bare Thai prompt.
- **Local play evidence:** Keyboard movement and nearby confirmation completed four words with 400 points and 100% accuracy. A hazard removed one life.
- **Remaining review:** The wall texture depicts repeated platform strips. Native touch, long sessions, and safe hazard intervals remain unverified.
- **Recommended rebuild:** Keep vertical climbing. Telegraph drops and validate that every target has a reachable safe interval.
- **Suitable modality:** Reading is primary for window labels. Listening can state the sentence before a tower section.
- **Source:** [storm-castle-tower.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/storm-castle-tower.ts:675) and [storm-castle-tower.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/storm-castle-tower.ts:1148).

### The Haunted Library

- **Loop:** The player traverses library floors, uses edge trampolines, opens ordered word doors, and avoids ghosts and bats.
- **Meaningful decision:** The player chooses a floor route and the right moment to approach a door.
- **Code inference:** Confirm opens the nearest eligible door. Tight layouts can turn a proximity choice into an unintended language attempt.
- **Recommended rebuild:** Keep multi-floor traversal. Add explicit door focus and require a clear focus state before confirmation.
- **Suitable modality:** Reading is primary for door labels. Listening can state each sentence with replay and transcript controls.
- **Source:** [haunted-library.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/haunted-library.ts:840) and [haunted-library.ts](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/haunted-library.ts:1519).

#### Haunted Library implementation packet

**Retain the physical loop.** The player walks across four floors, uses edge trampolines, descends through floors, and confirms near doors. Correct doors stun nearby ghosts. Wrong doors remove one life and release a moving bat. Ghosts and bats damage the player without recording language attempts. The cartridge emits one standard five-field result.
The [original specification](/home/daniebo/Desktop/reading-advantage-monorepo/apps/advantage-games/measure/archive/the-haunted-library-20260328/spec.md) defines this multi-floor door and trampoline identity.

**Correct the learning direction.** Each door displays one token from the supplied English `term`. The board uses the supplied `translation` as its sentence prompt. All three authenticated hosts currently omit `haunted-library` from their forced Thai content lists. Add the identity to all three lists and strict Thai response checks.

**Make visible answers fair.** Correctness currently compares `door.wordIndex` with `wordIndex`. Two doors can display the same English word but produce different results. Accept any unopened door whose displayed word equals the current English target. Preserve each door ID and ordered sentence position for restore.

**Clarify selection.** Confirm selects the nearest unopened door within 72 world pixels. Overlapping door ranges can make the selected door unclear. Add a visible focus marker for the exact door that Confirm will open. Keep movement available while the marker changes.

**Clean the live board.** Remove the title, `Find the next word:` prefix, feedback sentences, control sentence, and layout labels. Show the bare Thai sentence above the playfield. Keep only concise numeric word progress, lives, and score. The shared briefing keeps the current movement and trampoline instructions.

**Protect compact labels.** Door labels use 13-pixel text at an offset without width measurement or viewport clamping. Seeded doors can share a floor and overlap. Give each English label an opaque background and at least 16 displayed pixels. Measure full labels, wrap long words only when needed, and clamp each label inside the viewport. Resolve same-floor label collisions without moving the door collision body.

**Replace mismatched art.** The current kit uses `tile-stone`, grave props, `player-mage`, and `enemy-spirit`. The stone tile is the rejected furniture strip. Grave props do not depict a library. Reuse the reviewed `enchanted-library-bookshelf` for shelf scenery and `wizard-floor` for a quiet fallback floor. Inspect a side-view player, ghost, door, and trampoline set before actor replacement. The reviewed Wizard actors use a top-down view and do not match this side-view cross-section.

**Preserve these contracts.** Keep four floors, horizontal wrap, gravity, edge trampolines, manual descent, ghost stun, bat release, invulnerability, stable seeded placement, capture and restore, and one completion. Keep hazard damage outside language accuracy.

**Add focused checks.** Cover duplicate visible words, exact focus selection, label bounds, label collision avoidance, bare Thai text, Thai host selection, and strict fallback rejection. Retain the current gravity, trampoline, hazard, restore, and completion cases.

**Verify one full session.** Use a real Thai sentence with repeated English words and one long word. Complete every door with keyboard and touch controls at 390×844. Confirm all floors remain reachable. Confirm the player can identify the focused door before every attempt. Confirm hazards remain avoidable during trampoline travel. Check one wrong door, one bat collision, one responsive restore, victory, replay, and exit. Record native screenshots before gameplay acceptance.

## Corrected dragon consolidation

The owner selected Dragon Flight and clarified that its two-lane mechanic serves vocabulary choices.
The owner rejected combining vocabulary and sentence games under one flight game.
Griffin remains separate because its intended Joust combat creates different player decisions.

| Historical identity | Shared rebuilt game | Mode | Route and history proposal |
|---|---|---|---|
| `dragon-flight` | Dragon Flight | Vocabulary | Keep the current route, result identifier, and competition scope. |
| `dragon-rider` | Dragon Flight | Vocabulary | Resolve launches to the shared engine. Keep `dragon-rider` for old routes, results, and competition history. |
| `griffin-riders-escape` | Separate Griffin identity under review | Existing sentence contract | Trace the historical Joust identity. Preserve its route and history while resolving the mismatch. |

Do not merge old scores across these identifiers.
Historical scores remain in their original game scopes.
The owner selected **Dragon Flight** as the consolidated public title on 2026-09-08.
The selection applies to the dragon vocabulary lane game. It does not combine Griffin sentence gameplay with that game.

## Evidence limits

Source inspection supports the loop and weakness statements above.
It does not establish enjoyment, accessibility, customer preference, or presentation quality.
The existing planning record contains the owner's Wizard observation and no complete customer comparison.
Real play should measure comprehension, control errors, voluntary replay, and spoken prompt clarity.

## Unresolved owner decisions

1. Review the selected flight assets through the common visual comparison.
2. Resolve the historical Griffin title against the intended Joust mechanic; historical scores remain separate.
3. Select which parallel exploration, escort, shooter, and vertical games receive rebuilds.
4. Confirm customer favorites beyond the reported Wizard observation.
5. Select the next listening pilots after Wizard vocabulary.
6. Approve any retirement route, catalog label, and history presentation before removal.
