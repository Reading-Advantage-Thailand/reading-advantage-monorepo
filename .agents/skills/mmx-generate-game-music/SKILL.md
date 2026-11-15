---
name: mmx-generate-game-music
description: Generate high-quality game music for Reading Advantage educational games using the MiniMax CLI (mmx). Use this skill whenever the user wants to create, generate, or update background music, theme songs, soundtracks, or audio for any game in apps/advantage-games. Triggers on requests like "generate music for [game name]", "create game soundtrack", "make theme music", "replace game audio", or when discussing music/audio improvements for the games. Also use when the user mentions mmx, MiniMax, music generation, or wants to improve the current 8-bit style game sounds.
---

# MMX Generate Game Music

Generate high-quality theme music and soundtracks for Reading Advantage educational games using the MiniMax CLI (`mmx`).

## Context

The `apps/advantage-games` app contains educational browser games with fantasy/RPG themes (dragons, wizards, castles, potions, etc.). The audio in `public/sounds/` is mostly basic SFX. This skill generates instrumental music for each game's theme with the `mmx` CLI.

## Prerequisites

- `mmx` CLI installed and authenticated (`mmx --version` should work)
- Working directory should be the monorepo root or `apps/advantage-games`

## Game Themes Reference

Map game names to musical themes:

### Sentence Games
- **abyssal-well** — Dark, mysterious, underwater depths. Cinematic ambient.
- **castle-defense** — Epic orchestral battle, medieval warfare.
- **devourer-slime** — Quirky, gooey, slightly menacing. Comedic horror.
- **dungeon-liberator** — Heroic rescue, dark dungeons, triumphant.
- **griffin-riders-escape** — Soaring, adventurous, aerial chase.
- **griffin-sky-joust** — Noble, medieval aerial combat, regal.
- **gryphon-patrol** — Majestic, guardian-like, watchful.
- **haunted-library** — Spooky, mysterious, magical books. Gothic.
- **labyrinth-goblin-king** — Mischievous, tricky, dark fantasy.
- **potion-rush** — Bubbly, alchemical, frantic but fun.
- **realm-carver** — Epic world-building, powerful, god-like.
- **rune-forge-chamber** — Mystical crafting, ancient magic, hammering metal.
- **shadow-gate-dungeon** — Dark, ominous, portal to shadow realm.
- **spellweavers-run** — Magical, fast-paced, spell-casting.
- **storm-castle-tower** — Stormy, siege, dramatic weather.
- **village-guardian** — Warm, protective, pastoral but vigilant.

### Vocabulary Games
- **alchemists-synthesis** — Magical chemistry, bubbling potions, transformation.
- **archers-revenge** — Swift, precise, woodland, vengeful.
- **dragon-flight** — Epic, soaring, powerful beast riding.
- **dragon-rider** — Majestic, bonded companions, aerial adventure.
- **enchanted-library** — Whimsical, magical books, discovery.
- **paladins-twin-soul** — Holy, dual-natured, righteous combat.
- **rpg-battle** — Classic turn-based battle, heroic, tactical.
- **rune-match** — Mystical puzzle, ancient symbols, magical energy.
- **wizard-vs-zombie** — Dark humor, magical apocalypse, quirky.

### Core Game Engine
- **game-start-screen** — Grand opening, welcoming, adventurous.
- **game-end-screen** — Triumphant victory, accomplishment.
- **battle-theme** — Tense combat, action-packed, driving rhythm.
- **menu-theme** — Relaxed, inviting, medieval tavern feel.

## Workflow

### 1. Identify the Game and Theme

Ask the user which game(s) they want music for, or infer from context. Determine if they want:
- **Background music** (longer, looping, instrumental)
- **Theme song** (shorter, could have lyrics)
- **Battle music** (intense, fast-paced)
- **Menu/ambient music** (relaxed, atmospheric)

### 2. Build the Prompt

Use `--instrumental` for background/game music. Only use lyrics if explicitly requested for a theme song.

For instrumental tracks, build rich prompts using these flags:

```bash
mmx music generate \
  --prompt "<rich description>" \
  --instrumental \
  --genre "<genre>" \
  --mood "<mood>" \
  --instruments "<instruments>" \
  --tempo "<tempo>" \
  --structure "<structure>" \
  --use-case "background music for educational browser game" \
  --model music-2.6 \
  --format mp3 \
  --out "public/sounds/<game-name>-<type>.mp3"
```

**Prompt building rules:**
- **Prompt**: 1-2 vivid sentences describing the musical style and emotion. Max 2000 chars combined with structured flags.
- **Genre**: Choose from orchestral, cinematic, electronic, folk, medieval, fantasy, ambient, rock
- **Mood**: Match the game theme (epic, mysterious, whimsical, dark, triumphant, relaxing, tense)
- **Instruments**: Be specific. Examples: "orchestral strings, brass, timpani", "harp, flute, gentle strings", "electric guitar, synthesizer, heavy drums", "lute, recorder, medieval drums"
- **Tempo**: fast, moderate, slow (or use --bpm for exact value)
- **Structure**: For longer tracks use "intro-verse-chorus-verse-chorus-bridge-chorus-outro". For ambient: "intro-theme-variation-theme-outro".
- **Model**: Use `music-2.6` (recommended) unless user requests a different model
- **Avoid**: Only add if there are specific elements to exclude

### 3. Ensure Sufficient Length

Short lyrics produce short tracks (25 seconds in one early test). To generate longer tracks:

- **Instrumental tracks**: The AI will generate appropriate length based on the structure. Use full song structures to get 1.5-3 minute tracks.
- **With lyrics**: You MUST provide substantial lyrics (max 3500 chars). Use multiple verses, choruses, bridge. Follow this template for minimum length:

```
[Intro]
(Instrumental intro description)

[Verse 1]
8-12 lines of lyrics here

[Chorus]
4-6 lines, repeatable

[Verse 2]
8-12 lines, different from verse 1

[Chorus]
Repeat chorus

[Bridge]
4-6 lines, different mood

[Chorus]
Final chorus

[Outro]
(Instrumental fade)
```

Write lyrics that fit the game's theme and educational context. Keep language appropriate for all ages.

### 4. Generate and Save

Save all generated music to `apps/advantage-games/public/sounds/` with descriptive filenames:
- Format: `<game-name>-<type>.mp3`
- Examples: `castle-defense-battle.mp3`, `haunted-library-ambient.mp3`, `game-main-theme.mp3`

Run the mmx command. If it fails, retry with simplified prompt or different model.

### 5. Verify the Output

After generation:
- Check the file exists and has reasonable size (>100KB for a full song)
- If file is too small (<50KB), the generation may have failed or produced a very short clip
- For instrumental tracks, expect 1-3 minutes
- For tracks with lyrics, length depends on lyric density but aim for 1.5+ minutes

### 6. Update Game Code (if needed)

If this is replacing existing music or adding new tracks:
- Update the game's component to reference the new audio file
- Update `useSound.ts` hook if adding new sound types
- Consider adding volume controls or audio settings

## Examples

### Example 1: Castle Defense Battle Music

```bash
mmx music generate \
  --prompt "Epic medieval castle siege, armies clashing, defenders holding the walls" \
  --instrumental \
  --genre orchestral \
  --mood "epic, tense, triumphant" \
  --instruments "brass section, timpani, orchestral strings, choir" \
  --tempo fast \
  --structure "intro-build-verse-chorus-verse-chorus-bridge-chorus-outro" \
  --use-case "background music for castle defense educational game" \
  --model music-2.6 \
  --format mp3 \
  --out "apps/advantage-games/public/sounds/castle-defense-battle.mp3"
```

### Example 2: Haunted Library Ambient

```bash
mmx music generate \
  --prompt "Mysterious magical library, floating books, ghostly whispers, ancient knowledge" \
  --instrumental \
  --genre ambient \
  --mood "mysterious, magical, slightly spooky" \
  --instruments "harp, celesta, ethereal pads, subtle choir" \
  --tempo slow \
  --structure "intro-theme-variation1-theme-variation2-theme-outro" \
  --use-case "background music for haunted library educational game" \
  --model music-2.6 \
  --format mp3 \
  --out "apps/advantage-games/public/sounds/haunted-library-ambient.mp3"
```

### Example 3: Game Main Theme with Lyrics

```bash
mmx music generate \
  --prompt "Grand adventure theme song for an educational fantasy RPG game, inspiring and heroic" \
  --lyrics "<full lyrics that follow the template in step 3>" \
  --genre "orchestral pop" \
  --mood "inspiring, adventurous, uplifting" \
  --instruments "orchestral strings, piano, drums, choir" \
  --tempo moderate \
  --structure "verse-chorus-verse-chorus-bridge-chorus-outro" \
  --vocals "powerful mixed choir with lead female vocals" \
  --use-case "main theme song for educational RPG game" \
  --model music-2.6 \
  --format mp3 \
  --out "apps/advantage-games/public/sounds/game-main-theme.mp3"
```

## Important Notes

- **Overwriting**: Confirm with the user before you overwrite existing audio files.
- **Batch generation**: You can generate multiple tracks in sequence. Consider a consistent "sound pack" for related games (for example, all castle games share orchestral brass elements).
