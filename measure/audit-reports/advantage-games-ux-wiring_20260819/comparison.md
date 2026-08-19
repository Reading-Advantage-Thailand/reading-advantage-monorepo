# Comparison with the 2026-08-19 audit report

Copied from `measure/audit-reports/advantage-games-ux-wiring_20260819-independent/comparison.md`.

I wrote this audit without reading `measure/audit-reports/advantage-games-ux-wiring_20260819/`.
I read that report only after I finished. The two reports agree on the shared layer and cover
different ground below it.

## Where the two reports agree

Both reports independently reach the same shared-layer conclusions:
no cartridge loads art, both hosts bind every key to one QC image, the debrief exit opens a page
that does not exist, the Chinese route locale becomes `cn` and leaves the app, the catalog hardcodes
`/en`, the public arcade Exit is dead and the route is an orphan, the pack root ignores `basePath`,
the leaderboard stays empty, the seed is fixed at 29, the debrief credits unused pixel art, and the
five traversal titles are one shared left/right quiz that prints the answer on the correct button.
Both also find the `abyssal-well` cover missing and `griffin-sky-joust-cover.png` unused.

## What the other report has that I missed

I verified each of these against disk before recording it here.

1. **The music is a placeholder set.** All 30 files in `public/sounds/music/` are exactly 4,387
   bytes, so every track is the same stub. My report said only that the audio is unused.
2. **`useBackgroundMusic` exists** and four leftover pages call it. My statement that the APK host
   has no audio path is correct, but the hook is wired on the legacy path, not absent from the repo.
3. **Seven catalog covers are JPEG files with a `.png` name**: alchemists-synthesis, astral-mage,
   devourer-slime, dragon-rider, gryphon-patrol, haunted-library, sorcerers-ziggurat.
4. **`games/sentence/griffin-riders-escape/gate.png` and `obstacle.png` are 0 bytes.**
5. **The QC image is a 192x384 hero sheet** (6 by 12, 4 empty frames) bound as `view: screen`. I
   recorded its size but not that a sprite sheet is bound as a screen.
6. **QC hit FX has 19 empty frames of 24, and the gamepad UI has 90 empty of 220.**
7. **No cartridge key is a standard-pack semantic key**, so the 43,075-asset pack is off the
   catalog path.
8. **The answer to the 27 count.** An older product list held 27 titles and included Babel's
   Architect. The catalog dropped that title and added Astral Mage and The Sorcerer's Ziggurat, so
   the live count is 28. `public/sounds/music/babel-architect.mp3` still ships.
9. **`resolveStudentRedirect` always returns `/`**, so a sign-in does not return the student to the
   game. I found the missing login link but not this second half.
10. **The lost start-flow choices.** The leftover start screens let the student pick a difficulty, a
    hero, an arena, an enemy, a monster, a rune type, or an opponent. The APK briefing dropped all
    of them for castle-defense, rpg-battle, rune-match, rune-forge-chamber, and village-guardian.
    This whole class is absent from my report.
11. **haunted-library: the on-screen D-pad covers floor 0.**

## What my report has that the other report does not

1. **The 26 leftover pages.** The other report places them outside its agreed scope. My report
   documents them per game with line numbers: dead `/student/games` and `/student/articles` links,
   hardcoded Thai literals, static sample content that ignores the student flashcards, completion
   payloads that fail `gameCompletionInputSchema` and return 400 with no message, and invented
   analytics counters such as `totalAttempts: 10`.
2. **Gameplay blockers proved by running the built controllers.** Examples: castle-defense
   deadlocks after the sixth wave, so 7 or more sentences can never finish; paladins-twin-soul ends
   in defeat within about 3 seconds and caps accuracy at 25 percent; haunted-library has no way to
   descend a floor and 492 of 500 seeds are unwinnable; magic-defense accepts only ASCII keys, so
   Thai, Chinese, and Vietnamese translations cannot be typed; rpg-battle is unwinnable past 10
   items; archers-revenge loses at about 65 seconds with health still shown.
3. **A capture and restore inconsistency that freezes the game.** In haunted-library and
   village-guardian, `capture()` can return a snapshot that the cartridge's own `restore()`
   validator rejects. `runtime.ts:234-256` captures and restores on every composition change and
   pauses without resuming, so a device rotation freezes the session until a reload.
4. **Tutorial correctness, step by step.** Several drivers do nothing or demonstrate the opposite
   consequence: archers-revenge demonstrates a correct hit during the incorrect step, castle-defense
   collects the correct word with one-word content, griffin-sky-joust shows collision damage instead
   of a wrong word, gryphon-patrol demonstrates on enemies that are off the screen, abyssal-well
   runs the whole demonstration inside one synchronous call so no frame draws it, and
   haunted-library spends real lives during a tutorial the briefing calls safe.
5. **English placeholder text inside target-language exercises**: "Void echo", "Moon sigil",
   "Sun sigil", "Storm cloud", "Decoy translation 1", and "tutorial wrong".
6. **Keyboard key drift per game.** Listed keys that do nothing, and working keys that no screen
   names, with the binding line for each.

## Suggested merge

The other report is the stronger asset and product-regression record. This report is the stronger
gameplay, tutorial, and leftover-route record. A merged document should take Part 1 from either
report, the asset tables from the other report, and Part 2 from this one.
