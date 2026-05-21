---
name: mmx-generate-game-music
description: Generate high-quality game music for Reading Advantage educational games using the MiniMax CLI (mmx). Use this skill whenever the user wants to create, generate, or update background music, theme songs, soundtracks, or audio for any game in apps/advantage-games. Triggers on requests like "generate music for [game name]", "create game soundtrack", "make theme music", "replace game audio", or when discussing music/audio improvements for the games. Also use when the user mentions mmx, MiniMax, music generation, or wants to improve the current 8-bit style game sounds.
---

# MMX Generate Game Music

Generate high-quality theme music and soundtracks for Reading Advantage educational games using the MiniMax CLI (`mmx`).

## Context

The `apps/advantage-games` app contains ~30 educational browser games with fantasy/RPG themes (dragons, wizards, castles, potions, etc.). The current audio in `public/sounds/` consists of basic 8-bit style SFX (cash-register, angry-grunt, success, etc.) and lacks proper thematic background music.

This skill helps you generate cinematic, high-quality instrumental music tailored to each game's theme using MiniMax's music generation API via the `mmx` CLI.

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

The user's anime example was only 25 seconds because lyrics were too short. To generate longer tracks:

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
  --lyrics "[Intro]
Welcome to a world of wonder
Where knowledge is your greatest power

[Verse 1]
In the halls of ancient castles tall
Where dragons soar and heroes call
Every word you learn becomes a spell
To conquer fears and break the darkest well
Read the runes and solve the mystery
Write your own legendary history

[Chorus]
Reading Advantage, open up your mind
Adventure waits for those who seek to find
Through every chapter, every quest, every rhyme
You're growing stronger one word at a time

[Verse 2]
From the village green to the wizard's tower
Learning grows like a magical flower
Battle orcs with verbs and potions too
Collect the orbs of knowledge shining through
Meet the magicians of grammar and prose
As your understanding blooms and grows

[Chorus]
Reading Advantage, open up your mind
Adventure waits for those who seek to find
Through every chapter, every quest, every rhyme
You're growing stronger one word at a time

[Bridge]
Choose your adventure, pick your path
With every sentence, feel the aftermath
Of wisdom gained and skills renewed
Your reading power is your attitude

[Chorus]
Reading Advantage, open up your mind
Adventure waits for those who seek to find
Through every chapter, every quest, every rhyme
You're growing stronger one word at a time

[Outro]
Your adventure begins now..." \
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

- **Lyrics length**: The user's first attempt generated only 25 seconds because lyrics were too short. Always use the full template above for lyric tracks.
- **Instrumental preferred**: For background gameplay music, instrumental is usually better (no lyrics to distract from reading).
- **File sizes**: If output is unexpectedly small, the generation may have partially failed. Check the file and retry with a simpler prompt.
- **Model choice**: Use `music-2.6` (recommended). Only use `music-2.6-free` or `music-2.5+` if specifically requested.
- **Overwriting**: Confirm with user before overwriting existing audio files.
- **Batch generation**: You can generate multiple tracks in sequence. Consider generating a consistent "sound pack" for related games (e.g., all castle games share orchestral brass elements).
- **Game integration**: After generating, remind the user to update game components to use the new audio files via the `useSound` hook or direct Audio API.
