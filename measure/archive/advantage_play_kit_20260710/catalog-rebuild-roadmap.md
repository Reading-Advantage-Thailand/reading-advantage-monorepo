# Advantage Play Kit Catalog Rebuild Roadmap

## Scope and evidence boundary

This roadmap inventories the **27 entries in the current working-tree** `apps/advantage-games/src/lib/gameCards.ts`: 25 are marked `playable` and two are marked `coming-soon`. The registry status is catalog metadata, not proof that a game is production-ready. Existing components, rules, and assets are mechanic evidence only; each migration is a Phaser 4 rebuild behind the frozen educational I/O ABI.

The current catalog file is already modified by work outside this track. Compared with `HEAD`, the working tree removes `abyssal-well` and `babel-architect`, both formerly marked `playable`. They are therefore excluded from the 27-row current-catalog matrix below, but recorded under **Catalog drift and exclusions** so their disposition cannot be lost.

`UNPUBLISHED-GAMES-REPORT.md` was used as dated QC evidence, not as a live verdict. It identifies nine games already imported into Reading Advantage and records a 2026-07-07 browser review of sixteen others, followed by a fix log. The file is also currently modified, and this roadmap did not rerun those games. Every successor track must establish its own baseline.

### Frozen migration invariant

- Vocabulary input remains `Array<{ term: string; translation: string }>`.
- Sentence input remains the same pair-array shape with sentence semantics.
- Output remains `{ accuracy, xp, score, correctAnswers, totalAttempts }`.
- The host, not the cartridge, supplies identity, tenancy, difficulty mapping, duration, idempotency, timestamps, victory interpretation, and authoritative XP persistence.
- Catalog identity is preserved by default. A legacy game may become a thin configuration of a shared mechanic cartridge, but its public game ID is not silently renamed or retired.

## Reusable APK mechanic families

| Family | Shared Phaser-native foundation | Initial proof relationship | Follow-on extension points |
|---|---|---|---|
| Gate, runner, and traversal | Arcade physics, lane/gate choices, scrolling camera, pooled obstacles, checkpoints, touch/keyboard steering | `gate-runner` proves the vocabulary gate core inspired by Dragon Flight | Ordered sentence gates, collection runners, flight, platform movement, isometric step graphs |
| Arena and target action | Player movement, target acquisition, projectiles, collision layers, pooled enemies, camera bounds, off-screen indicators | Reuse APK input, physics, camera, particles, and pooling; requires a bounded `target-action` blueprint | Bow aiming, aerial joust, twin-avatar survival, sentence-order targets, territory capture |
| Defense and combat | Timed waves, threat lanes, typed answer validation, health/objectives, projectiles, turn or wave state | `typing-defense` proves typed vocabulary waves inspired by Magic Defense | Tower-defense collection, turn-based battles, escort defense, survival/stealth variants |
| Free-roam ordered collection | World navigation, ordered collectible validation, collision feedback, hazards, camera, minimap/indicators | `sentence-collector` proves sentence-token collection | Vocabulary pickup, rescue/escort, maze, stealth, growth, doors/floors, patrol maps |
| Puzzle, matching, and workstations | Board/grid state, drag/tap selection, deterministic shuffles, merge/match resolution, timers, combo feedback | Requires a bounded `puzzle-workstation` blueprint | Pair matching, merge recipes, conveyor sorting, radial sentence sequencing |

The three proof cartridges are foundations, not permanent catalog IDs. For example, the generic `gate-runner` proof should become reusable code beneath the public `dragon-flight` cartridge/configuration. This keeps host analytics and completion identity stable while avoiding copied scenes.

## Migration waves

| Wave | Purpose | Exit condition |
|---|---|---|
| W0 — foundation proofs | Turn Dragon Flight, Magic Defense, and one sentence collector into the first real catalog-backed uses of `gate-runner`, `typing-defense`, and `sentence-collector` | All three run in the QC testbed in both editions and complete Reading/Primary package-consumption smoke tests |
| W1 — unfinished first | Build Astral Mage and Sorcerer's Ziggurat, the only current catalog entries with no implementation beyond cover/registry evidence | Both become playable APK cartridges; their new family extensions are reusable and separately tested |
| W2 — deployed/high-value cutover | Rebuild the nine games the dated import report identifies as already published to Reading Advantage, excluding W0 games already cut over | Reading and Primary consume package entries without copied source; legacy deployment risk is retired incrementally |
| W3 — high-reuse unpublished cohort | Rebuild games that exercise broadly reusable runner, arena, defense, and collector variants, including games with prior QC defects | Each new family extension supports at least two catalog entries or documents why a single exceptional mechanic is justified |
| W4 — distinctive/asset-heavy cohort | Rebuild remaining puzzles, complex maps, unusual movement, and visually demanding variants | Remaining current catalog IDs are APK-backed or have an explicit product-owner retirement decision with evidence |

Within a wave, unfinished or demonstrably broken games go first. `playable` status alone never outranks a current browser failure.

## Family 1: Gate, runner, and traversal

| Game | Current evidence | Input | Essential mechanic and controls | Reusable APK systems | Proposed cartridge ID | Asset needs | Primary Chibi / Secondary Epic | Wave and disposition |
|---|---|---|---|---|---|---|---|---|
| Dragon Flight | Playable; dated report lists it as published | Vocabulary | Choose the correct translation gate while flying; left/right keyboard, pointer, or touch steering | Gate-runner core, Arcade physics, scrolling camera, gate pool, tweens, seeded rounds | `dragon-flight` backed by `gate-runner` | Dragon/flight avatar, paired gates, sky layers, success/failure effects, UI/audio | Chibi: larger gates, slower approach, playful hatchlings. Epic: narrower gates, denser formations, mature dragon/sky treatment | **W0, rebuild/configure.** Canonical gate proof and first public-ID cutover |
| Dragon Rider | Playable; dated report lists it as published | Vocabulary | Ride through a village and collect/protect the correct vocabulary targets; directional movement plus collect/collision | Runner steering, collectible pool, hazards, camera, indicators, combo feedback | `dragon-rider` | Rider/dragon animation, village/parallax, collectible and hazard atlas, feedback/audio | Chibi: friendly village, generous pickups/hitboxes. Epic: armored rider, attack aftermath, faster hazards without gore | **W2, rebuild as runner-collector variant** |
| Spellweaver's Run | Playable; dated report records working three-lane sentence play | Sentence | Change lanes and collect words in order while running; left/right or lane taps | Lane runner, sentence sequencer, object pool, camera, HUD clipping, combo/mana feedback | `spellweavers-run` | Runner, lane tiles, word-orb atlas, forest layers, spell feedback/audio | Chibi: bright forest, oversized orbs, low hazard density. Epic: dark enchanted road, tighter timing, stronger effects | **W3, rebuild on runner + sentence sequencing** |
| Griffin Rider's Escape | Playable; dated report records a previously repaired frozen loop | Sentence | Fly through ordered word gates and avoid obstacles; vertical/lane steering by keyboard/touch | Gate-runner extension for ordered sentence tokens, obstacle pool, flight physics, camera | `griffin-riders-escape` | Griffin/rider animation, word gates, obstacles, sky layers, damage/boost effects | Chibi: rounded griffin, large gates, forgiving collisions. Epic: knight/griffin silhouette, stormier sky, faster obstacle cadence | **W3, rebuild as sentence gate-runner** |
| Storm the Castle Tower | Playable; dated report records platform/position and difficulty issues | Sentence | Scale a tower and collect words in order while dodging falling hazards; directional movement plus collect/jump action | Platform physics, vertical camera, ordered collector, hazard pools, checkpointing | `storm-castle-tower` | Climber, tower tiles, oil/rocks, word pickups, height HUD, impact/audio | Chibi: toy-block tower, broad ledges, softened hazards. Epic: siege tower, narrow ledges, heavier impact treatment | **W4, rebuild as platform-sequencer** |
| The Sorcerer's Ziggurat | Coming soon; audit records registry + cover only and 0/25 implementation checks | Sentence | Traverse an isometric cube pyramid in correct sentence order; directional/tile-step controls | Deterministic step graph, isometric projection, tweened movement, sentence sequencer, camera | `sorcerer-ziggurat` | Isometric cube tiles, sorcerer, runes, ritual effects, depth-safe UI/audio | Chibi: chunky candy-color cubes, highlighted valid steps. Epic: ancient stone ziggurat, arcane void, denser effects | **W1, build from zero.** Unfinished-first platform family foundation |

## Family 2: Arena and target action

| Game | Current evidence | Input | Essential mechanic and controls | Reusable APK systems | Proposed cartridge ID | Asset needs | Primary Chibi / Secondary Epic | Wave and disposition |
|---|---|---|---|---|---|---|---|---|
| Archer's Revenge | Playable; dated report records end-to-end shooting | Vocabulary | Aim/fire at enemies matching the target translation while avoiding shielded targets; pointer/touch aim and fire | Target-action blueprint, projectile/enemy pools, collision filters, waves, camera feedback | `archers-revenge` | Archer, enemy/shield variants, arrows, arena/forest, target and hit effects | Chibi: suction-cup/cartoon arrows and large labels. Epic: ranger silhouettes, armored targets, sharper but non-graphic hits | **W3, establish reusable target-action blueprint** |
| Paladin's Twin-Soul | Playable; dated report records arena waves/projectiles | Vocabulary | Survive waves and match vocabulary magic to strengthen a paired hero; move/aim/fire via keyboard and virtual stick | Arena movement, wave director, projectile pools, paired-entity state, vocabulary targeting | `paladins-twin-soul` | Twin heroes, enemy atlas, magic types, arena, projectile/merge effects | Chibi: super-deformed twins, readable color magic, low density. Epic: mature paladins, denser battlefield, restrained high-intensity VFX | **W3, target-action/arena variant** |
| Griffin Sky-Joust | Playable; dated report records working flap/drift combat | Sentence | Flap/drift and strike enemies carrying the next sentence word; keyboard/tap flap plus horizontal drift | Aerial physics, ordered target validation, enemy pool, camera, health/collision feedback | `griffin-sky-joust` | Griffin/knight flight frames, enemy knights, sky layers, word banners, joust effects | Chibi: bouncy mounts, large labels, generous altitude recovery. Epic: armored sky knights, faster formations, dramatic clouds | **W3, aerial target-action + sentence ordering** |
| Astral Mage | Coming soon; audit records registry + cover only and 0/25 implementation checks | Sentence | Navigate a magical void and shoot crystals in sentence order; move and directional aim/fire | Target-action blueprint, ordered targets, projectiles, off-screen indicators, camera, spawn director | `astral-mage` | Mage, crystal targets, astral background, projectiles, portal/completion VFX, UI/audio | Chibi: star-sprite companion, large glowing crystals, low visual threat. Epic: cosmic mage, sharper crystal silhouettes, denser void hazards | **W1, build from zero.** Unfinished-first target-action foundation |
| Gryphon Patrol | Playable; dated report records mobile letterboxing and placeholder-looking player art | Sentence | Patrol a large sky arena and hunt sentence targets; free flight, aim/select, minimap navigation | Aerial arena, camera bounds, minimap, target indicators, ordered target system, spawn pools | `gryphon-patrol` | Gryphon/patrol craft, sky map, target enemies, minimap icons, trail/impact VFX | Chibi: rounded patrol mount and simple minimap. Epic: military-fantasy patrol, layered clouds, stronger motion cues | **W4, rebuild after aerial foundations; asset-heavy** |
| Realm Carver | Playable; dated report records a repaired loading-contract bug | Sentence | Move through wild magic, claim territory, and capture words in order; directional/touch movement | Territory grid, ordered pickups, camera, collision regions, minimap/progress feedback | `realm-carver` | Hero, terrain/territory tiles, magic boundary effects, word beacons, minimap/UI | Chibi: paint-like territory bloom, broad safe paths. Epic: fractured realm tiles, sharper corruption effects, tighter capture windows | **W4, exceptional territory-action variant** |

## Family 3: Defense and combat

| Game | Current evidence | Input | Essential mechanic and controls | Reusable APK systems | Proposed cartridge ID | Asset needs | Primary Chibi / Secondary Epic | Wave and disposition |
|---|---|---|---|---|---|---|---|---|
| Magic Defense | Playable; dated report lists it as published | Vocabulary | Type translations to destroy falling threats before they damage castles; keyboard-first with touch-accessible text input | Typing-defense core, wave/timer director, pooled threats/projectiles, objectives, combo feedback | `magic-defense` backed by `typing-defense` | Castle states, falling threats, wand/bolts, explosions, lane backgrounds, UI/audio | Chibi: toy castles, slow threats, large prompt/input. Epic: fortified keeps, denser assault, stronger spell effects | **W0, rebuild/configure.** Canonical typing-defense proof |
| RPG Battle | Playable; dated report lists it as published | Vocabulary | Choose actions and type translations to win a turn-based duel; pointer/touch menus plus keyboard text | Turn-state machine, typed validation, enemy scaling, animation/tween sequencing, combat log | `rpg-battle` | Hero/enemy animation sets, locations, action icons, health UI, combat/spell effects | Chibi: expressive heroes/monsters, simplified choices. Epic: mature party/monsters, tactical presentation, richer but readable VFX | **W2, rebuild as turn-based typed-combat variant** |
| Castle Defense | Playable; dated report lists it as published | Sentence | Collect or place sentence words to build towers and repel attackers; tap/drag/select plus defensive placement | Sentence sequencer, tower slots, wave director, physics/collisions, projectiles, objective health | `castle-defense` | Castle/tower states, defenders/enemies, word building pieces, projectiles, battlefield/audio | Chibi: block-built towers, friendly defenders, generous placement. Epic: siege defense, denser waves, more restrained UI | **W2, sentence-defense blueprint** |
| Wizard vs Zombie | Playable; dated report lists it as published | Vocabulary | Move through an arena, collect the correct vocabulary orbs, and survive a horde; directional/virtual-stick movement | Arena movement, target pickups, enemy waves/pools, health, camera, indicators | `wizard-vs-zombie` | Wizard, non-graphic zombie variants, orbs, arena tiles, spells/hit feedback | Chibi: goofy monsters, bright orbs, low density. Epic: dark-fantasy horde, faster pressure, no gore | **W2, arena-survival variant on defense/action systems** |
| Village Guardian | Playable; dated report records escort/defense gameplay | Sentence | Rescue villagers in sentence order and escort them to safety while avoiding an enemy; directional/virtual-stick movement | Ordered rescue targets, follower/escort state, enemy AI, safe-zone collision, timer | `village-guardian` | Guardian, villagers, enemy, village/safe-zone tiles, word labels, rescue effects | Chibi: cheerful villagers, obvious safe zone, slow pursuer. Epic: frontier village, armored guardian, denser patrol pressure | **W3, escort-defense extension** |
| Shadow Gate Dungeon | Playable; dated report records stealth radius and ordered crystals | Sentence | Collect crystals in order while evading a shadow creature; directional/virtual-stick movement | Ordered collector, detection/stealth system, enemy AI, health/timer, camera/indicators | `shadow-gate-dungeon` | Hero/shadow creature, dungeon tiles, crystals, detection radius, stealth/damage VFX | Chibi: mischievous shadow, high-contrast safe zones. Epic: ominous dungeon, subtler detection cues plus accessible overlay | **W3, stealth-defense/collector hybrid** |

## Family 4: Free-roam ordered collection

| Game | Current evidence | Input | Essential mechanic and controls | Reusable APK systems | Proposed cartridge ID | Asset needs | Primary Chibi / Secondary Epic | Wave and disposition |
|---|---|---|---|---|---|---|---|---|
| Dungeon Liberator | Playable; dated report records polished end-to-end play | Sentence | Navigate a dungeon and rescue word-bearing prisoners in order before escaping; directional/virtual-stick movement | Sentence-collector core, camera, collision map, ordered rescue targets, hazards, exits | `dungeon-liberator` backed by `sentence-collector` | Knight, prisoner variants, dungeon tiles, exit, traps, rescue feedback/audio | Chibi: toy dungeon, big prisoners/labels, simple routes. Epic: stone prison, armored cast, tighter hazards | **W0, canonical sentence-collector-backed catalog proof** |
| Enchanted Library | Playable; dated report lists it as published | Vocabulary | Collect the correct magic books while dodging spirits; directional/touch movement | Free-roam collector, target validation, enemy AI, camera, pickup effects, progress HUD | `enchanted-library` | Reader/mage, books, spirits, library tiles, shelves, sparkles/audio | Chibi: friendly book spirits, bright shelves, large books. Epic: arcane archive, spectral enemies, denser room layout | **W2, vocabulary collector variant** |
| Labyrinth of the Goblin King | Playable; dated report records maze, ordered orbs, and goblins | Sentence | Navigate a maze, collect words in order, then defeat goblins; directional/virtual-stick movement | Maze/collision map, sentence collector, enemy AI, camera, state transition to empowered mode | `labyrinth-goblin-king` | Paladin, goblins, maze tiles, orbs, transformation/combat effects, minimap | Chibi: storybook maze and comic goblins, clear routes. Epic: ruined labyrinth, armored paladin, more complex patrols | **W3, maze-collector extension** |
| Devourer Slime | Playable; dated report records growth through ordered word orbs | Sentence | Eat words in sentence order to grow large enough to defeat enemies; directional/virtual-stick movement | Sentence collector, growth/scaling state, collision tiers, enemy pool, camera, HUD | `devourer-slime` | Slime growth stages, word food, forest arena, knights, eat/grow effects | Chibi: cute slime stages, oversized food, forgiving tiers. Epic: magical ooze, darker forest, denser prey/enemies | **W3, growth-collector extension** |
| The Haunted Library | Playable; dated report records a repaired runaway animation-loop defect | Sentence | Explore multiple library floors and open magical doors in sentence order; directional movement and door interaction | Multi-room/floor map, sentence collector, door state, enemy/haunt AI, camera, transitions | `haunted-library` | Explorer, ghosts, shelves/rooms/stairs, doors/runes, haunt effects/audio | Chibi: playful ghosts and colorful rooms. Epic: gothic archive, atmospheric lighting, stronger tension without obscuring prompts | **W4, multi-room collector; map/asset-heavy** |

## Family 5: Puzzle, matching, and workstations

| Game | Current evidence | Input | Essential mechanic and controls | Reusable APK systems | Proposed cartridge ID | Asset needs | Primary Chibi / Secondary Epic | Wave and disposition |
|---|---|---|---|---|---|---|---|---|
| Rune Match | Playable; dated report lists it as published | Vocabulary | Match vocabulary runes to attack monsters; tap/click board selections | Puzzle-workstation blueprint, deterministic board, pair validation, combos, enemy/progression feedback | `rune-match` | Rune set, board/UI, monster roster, attack/clear effects, audio | Chibi: jewel-like runes and cute monsters, larger grid cells. Epic: carved runes and mature monsters, denser board effects | **W2, establish puzzle-workstation blueprint** |
| Alchemist's Synthesis | Playable; dated report records working match/merge logic after a repaired start-layout blocker | Vocabulary | Match and merge vocabulary ingredients into recipes/spells; tap/drag selection | Puzzle grid, merge rules, deterministic spawn, recipe goals, timers, combo/tween feedback | `alchemists-synthesis` | Ingredients, bottles/cauldron, recipe UI, laboratory background, synthesis effects/audio | Chibi: candy-color ingredients, simple recipes, large pieces. Epic: occult laboratory, layered recipes, stronger transformation VFX | **W2, merge-puzzle extension** |
| Potion Rush | Playable; dated report lists it as published | Sentence | Fulfil potion orders by selecting conveyor ingredients in sentence order; tap/click collection | Conveyor pool, sentence sequencer, order queue, timer, workstation feedback, discard flow | `potion-rush` | Conveyor/ingredients, customers, cauldron, shop, potion effects, order UI/audio | Chibi: cozy shop and expressive customers, slow belt. Epic: busy arcane apothecary, faster orders, richer apparatus | **W2, sentence workstation extension** |
| Rune Forge Chamber | Playable; dated report records radial word selection and forge timer | Sentence | Tap orbiting words in order before the forge cools; pointer/touch selection | Radial layout, sentence sequencer, timer/heat state, tweened orbit, forge feedback | `rune-forge-chamber` | Forge/anvil, rune circles, word tokens, chamber background, heat/spark effects/audio | Chibi: round forge, large tokens, slower orbit. Epic: monumental forge, tighter timer, stronger heat/metal effects | **W4, radial puzzle-workstation variant** |

## Catalog drift and exclusions

### Current catalog versus canonical server enum

- Current working-tree catalog only: `astral-mage`, `sorcerer-ziggurat`. Both are zero-implementation `coming-soon` entries and are intentionally W1.
- `packages/domain/src/games/schema.ts` enum only: `abyssal-well`.
- Shared by both: 25 IDs.
- The server enum must add a game only when its APK cartridge can complete and the production host mapping has been reviewed. Catalog presence alone is insufficient.

### Removed from the current working-tree catalog

| ID | Evidence | Roadmap disposition |
|---|---|---|
| `abyssal-well` | Present in `HEAD` catalog and the server enum, but its app route/component/logic are currently deleted by unrelated work | Do not restore or delete further in this track. Product owner must decide whether it joins a future radial-defense/target-action cohort or is formally retired; reconcile the server enum in that dedicated track |
| `babel-architect` | Present in `HEAD` catalog but removed in the current working tree; its attempted Phaser work is cancelled/deleted and it is absent from the server enum | Keep as historical mechanic evidence only. If revived, propose a new `babel-architect` sentence stacking/physics cartridge in its own track; do not resurrect the cancelled implementation |

## Cartridge acceptance criteria

A catalog row is accepted as APK-backed only when its successor track records all of the following:

1. **Mechanic acceptance:** the recognizable learning loop in this matrix is playable; exact legacy movement, scoring, renderer structure, and appearance are not acceptance requirements.
2. **Contract acceptance:** strict vocabulary or sentence pair-array input is validated, and completion emits exactly one valid `GameResults` object. Counterexamples reject extra or malformed fields.
3. **Phaser-native implementation:** gameplay uses Phaser 4 systems appropriate to the family and contains no new Konva/R3F gameplay layer or app-private route/auth/database dependency.
4. **Edition parity:** one scene source resolves both `primary-chibi` and `secondary-epic` semantic manifests. Every required asset slot has provenance and optimization metadata; audience tuning remains inside APK safe bounds.
5. **Controls and accessibility:** desktop keyboard/mouse and 390x844 touch play are complete. Prompts, instructions, pause/errors, and results have accessible DOM counterparts outside the canvas.
6. **Result mapping:** Reading and Primary smoke tests use the same public package export and stable array ABI. The host derives authoritative completion context and never trusts cartridge XP, user, school, idempotency, or timestamp values.
7. **Quality:** deterministic learning-loop tests and lifecycle tests exceed 80% coverage for new code; lint, type-check, package build, affected app build, browser smoke, restart/destroy leak checks, and architecture guards pass.
8. **Performance:** the successor track records frame-time, viewport behavior, asset memory/transfer budgets, and failure diagnostics on both reference viewport classes.
9. **Product-owner QC:** both editions receive explicit visual/gameplay approval in the Advantage Games QC testbed. Automated tests cannot substitute for this approval.
10. **Cutover evidence:** the enabled-game registry points to the package loader, production host smoke is green, analytics/completion identity is unchanged, and a track-scoped deletion manifest is reviewed before any legacy file is removed.

## Legacy retirement criteria

“Retirement” means deleting the old implementation after a package cutover; it does **not** mean deleting the public catalog identity unless the product owner explicitly chooses that outcome.

For each accepted cartridge, the successor track must generate and review an exact manifest from the repository at cutover time covering these candidate surfaces:

- Legacy page: `apps/advantage-games/src/app/[locale]/(student)/student/games/<mode>/<game-id>/`.
- Legacy app API: `apps/advantage-games/src/app/api/v1/games/<game-id>/` once all hosts use their canonical content/completion adapters.
- Legacy game component: `apps/advantage-games/src/components/games/<mode>/<game-id>/`, or the specifically identified shared component for exceptional games such as Magic Defense.
- Legacy rules/config/tests: matching `apps/advantage-games/src/lib/games/<camelGameName>*` files and any game-specific stores/hooks.
- Legacy assets: matching `apps/advantage-games/public/games/**/<game-id>/` trees only after all retained assets are imported into versioned edition manifests with provenance.
- Legacy copied host trees in Reading or Primary, identified by package/no-copy guards.

Deletion is prohibited when any of these remain unresolved: missing edition approval, failing mobile controls, incomplete host smoke, server-enum drift, unproven completion mapping, retained route callers, asset-license uncertainty, copied host imports, or an unreviewed exact-file manifest. Covers may remain as catalog marketing assets even after gameplay assets move into edition packs.

## Bounded successor track proposals

The foundation track should create or approve bounded follow-on tracks rather than append the rebuilds indefinitely:

1. `apk_incomplete_sentence_action_202607xx`: Astral Mage and Sorcerer's Ziggurat only; establish target-action and isometric step-graph extensions.
2. `apk_runner_traversal_wave_202607xx`: Dragon Rider, Spellweaver's Run, Griffin Rider's Escape, and Storm the Castle Tower after the Dragon Flight proof.
3. `apk_arena_target_action_wave_202607xx`: Archer's Revenge, Paladin's Twin-Soul, Griffin Sky-Joust, Gryphon Patrol, and Realm Carver.
4. `apk_defense_combat_wave_202607xx`: RPG Battle, Castle Defense, Wizard vs Zombie, Village Guardian, and Shadow Gate Dungeon after Magic Defense.
5. `apk_collector_adventure_wave_202607xx`: Enchanted Library, Labyrinth of the Goblin King, Devourer Slime, and Haunted Library after Dungeon Liberator.
6. `apk_puzzle_workstation_wave_202607xx`: Rune Match, Alchemist's Synthesis, Potion Rush, and Rune Forge Chamber.
7. A separate authenticated Advantage Games arcade product track after package consumption is proven; it must not be bundled into any cartridge rebuild wave.

Each successor track must refine its row-level assets and controls from live browser baselines before implementation. Family grouping is an architectural starting point, not permission to flatten distinctive mechanics into identical games.

## Exact files inspected

The following files and directory inventories were read without modification while producing this roadmap:

- `apps/advantage-games/src/lib/gameCards.ts` (current working tree and `HEAD` comparison).
- `apps/advantage-games/UNPUBLISHED-GAMES-REPORT.md`.
- `packages/domain/src/games/schema.ts`.
- `apps/advantage-games/src/components/games/game/GameEngine.tsx`.
- `apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/magic-defense/page.tsx`.
- `apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/rpg-battle/page.tsx`.
- Every current `*Game.tsx` directly under `apps/advantage-games/src/components/games/sentence/*/` and `apps/advantage-games/src/components/games/vocabulary/*/` via a filename/export/state inventory.
- Current route directories under `apps/advantage-games/src/app/[locale]/(student)/student/games/{sentence,vocabulary}/`.
- Current API directories under `apps/advantage-games/src/app/api/v1/games/`.
- Current asset directories under `apps/advantage-games/public/games/`.
- `apps/advantage-games/measure/tracks/astral-mage-compliance-audit_20260426/{report.md,plan.md,metadata.json,spec.md,index.md}`.
- `apps/advantage-games/measure/tracks/sorcerer-ziggurat-compliance-audit_20260426/{report.md,plan.md,metadata.json,spec.md,index.md}`.
- `packages/game-cartridges/src/{catalog.ts,gate-runner.ts,sentence-collector.ts,typing-defense.ts,editions.ts,internal/types.ts}` as in-progress proof-cartridge evidence.
- `measure/tracks/advantage_play_kit_20260710/{spec.md,plan.md}`.

No app code, package code, existing Measure file, catalog entry, enum, route, or asset was changed by this roadmap task.
