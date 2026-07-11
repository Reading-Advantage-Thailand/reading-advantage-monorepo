# APK Runner Traversal Wave W3 Baseline

## Scope and method

This baseline freezes mechanic and content evidence for the four W3 legacy games. It does not approve their renderer, route, state, persistence, timing, or input architecture for reuse.

- Source inspection was bounded to each route, React-Konva component, pure game-state module, and config module after `build-graph` searches identified the relevant symbols and callers.
- Live checks used the seeded legacy APIs from the isolated Advantage Games dev server at `http://localhost:3100` with `codecamp_advantage` as the local PostgreSQL database. All four APIs returned fixture vocabulary or sentence content; no temporary seed mutation was needed.
- Kimi WebBridge was used to navigate and start all four games in the user's Chrome session at a 1920x871 desktop viewport.
- Playwright repeated each start at 1440x900 and 390x844. Every route returned HTTP 200, every start control became visible, every game entered gameplay, and no page or console errors were observed.
- The browser accepted seeded fixture content, not a claim that a production student's saved-word inventory was exercised.

## Frozen wave matrix

| Public ID | Content mode | Essential legacy loop | Controls actually implemented | Terminal loop and legacy result evidence | APK systems to reuse |
|---|---|---|---|---|---|
| `dragon-rider` | Vocabulary pairs | A timed two-gate aerial traversal presents one target term and two translations. Correct gates grow a dragon flight; wrong gates shrink it. The final army is compared with a boss-power threshold. | Left: `ArrowLeft`/`A` or the left pointer button. Right: `ArrowRight`/`D` or the right pointer button. | Time expiry enters the boss phase. Victory is `dragonCount >= max(3, ceil(totalAttempts * 0.75))`. Legacy output exposes XP, accuracy, victory, correct answers, attempts, dragon count, and boss power. | Deterministic two-lane target/decoy gate sequence, scrolling gate cadence, timed phase transition, target feedback, boss threshold, and shared result adapter. |
| `spellweavers-run` | Sentences | A continuous three-lane field sends word orbs toward a collection zone. The player selects the lane containing the next word in sentence order. Correct words build the sentence and combo; wrong words consume mana. | Left: `ArrowLeft`/`A` or tap left third. Center: `ArrowDown`/`S` or tap center third. Right: `ArrowRight`/`D` or tap right third. | Collecting all words wins; depleted mana loses. Legacy output is XP, accuracy, and difficulty, derived from correct/attempt counts plus survival, speed, and completion bonuses. | Deterministic three-lane spawner, ordered-target collector, collection-zone collision, mana/penalty state, combo scoring, sentence progress HUD, and result adapter. |
| `griffin-riders-escape` | Sentences | A forward three-lane flight spawns one correct word gate, decoy gates, and obstacles. The player changes lanes before objects reach the collision plane. Correct gates advance the sentence and combo; obstacles or wrong gates cost lives. | Swipe left/right only in the live component. The start screen claims Left/Right Arrow support, but no keyboard listener exists. | Completing the current sentence wins; losing all lives loses. Legacy output is XP and accuracy, derived from correct/attempt counts, remaining lives, and time. | Deterministic perspective gate wave, lane-switch state, collision plane, obstacle/decoy generation, lives/combo state, ordered sentence progress, and result adapter. |
| `storm-castle-tower` | Sentences | A vertical grid traversal places ordered word windows up a scrolling tower. The player climbs between cells, collects the next word, and avoids falling oil or rocks. Wrong windows and hazards cost lives. | Move: arrows/WASD or four touch buttons. Collect: Space/Enter or touch-only Collect button. | Collecting every word wins; losing all lives loses. Legacy output is XP and accuracy from correct words and attempts. | Deterministic grid movement, ordered windows, camera/scroll target, hazard schedule and collision, lives state, touch D-pad, and result adapter. |

## Live responsive evidence

| Game | 1440x900 | 390x844 | Frozen defects to avoid in APK |
|---|---|---|---|
| `dragon-rider` | Starts with four Konva layer canvases filling the viewport. | No horizontal overflow; prompt, gates, dragon, and 72px left/right controls remain visible. | Renderer produces four DOM canvases for one game. Preserve the readable two-choice composition, not the Konva layering or route-owned lifecycle. |
| `spellweavers-run` | Starts with one full-viewport canvas and no horizontal overflow. | No horizontal overflow, but most of the playfield is empty black space; the translation header is clipped at the top, a word orb is clipped against the upper-right edge, and the active collection action has no semantic control. | HUD/playfield composition and spawn visibility are not acceptable references. Rebuild must make the target, incoming word, lanes, player/action, and collection zone legible at once. |
| `griffin-riders-escape` | Starts with one full-viewport canvas. | No horizontal overflow, but the perspective compresses the gates into tiny labels near the horizon and the rider is partly hidden by the bottom sentence strip. | Claimed keyboard input is absent. Perspective targets are too small at the moment the live baseline was captured, and there is no visible or semantic mobile lane control. |
| `storm-castle-tower` | The gameplay container is 1440px wide while the Konva canvas remains 390px wide, leaving most of the viewport blank. | The 390x700 canvas fits without horizontal overflow; target and touch D-pad are visible. | The desktop ResizeObserver/fullscreen transition freezes the stage at a stale mobile-sized width. Touch controls lack accessible names and respond only to `touchstart`; canvas text/targets are not semantic. |

The mobile contact sheet is [browser-evidence/mobile-contact-sheet.png](browser-evidence/mobile-contact-sheet.png). The isolated desktop Storm sizing failure is [browser-evidence/storm-castle-tower-desktop.png](browser-evidence/storm-castle-tower-desktop.png). Individual 390x844 captures are retained beside the contact sheet.

The exact ordered S1 content fixtures are frozen in `packages/game-cartridges/src/runner-wave-blueprints.ts`: four vocabulary pairs for `dragon-rider` and two sentences for each sentence cartridge. They are bounded contract inputs derived from the seeded browser payloads, not an attempt to preserve the entire mutable legacy fixture database.

## Shared contract implications

1. The wave needs one deterministic lane/traversal clock and seeded spawn API, with per-cartridge configuration for two-lane gates, three-lane collection, forward collision, or vertical grid traversal.
2. Input declarations must be truthful and equivalent across keyboard, pointer, and touch. A declared input must have both a tested binding and an accessible visible affordance where the viewport requires one.
3. Each cartridge owns only mechanic configuration and presentation hooks. Content loading, edition selection, lifecycle, completion persistence, and route ownership remain with the W2 generic authenticated host.
4. The stable five-field cartridge result remains `accuracy`, `xp`, `score`, `correctAnswers`, and `totalAttempts`. Cartridge XP is display-only input to the W2 completion boundary; persisted XP remains server-owned. Difficulty, lives, boss power, combo, elapsed time, and victory detail are diagnostic state rather than extra result fields.
5. Responsive acceptance must assert target readability and control visibility, not only the absence of horizontal overflow.

## Evidence commands

```bash
build-graph search ./graph.db dragonRider
build-graph search ./graph.db spellweaversRun
build-graph search ./graph.db griffinRidersEscape
build-graph search ./graph.db stormCastleTower

# Isolated legacy server used for browser evidence
DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5432/codecamp_advantage' \
  ../../node_modules/.bin/next dev --turbopack --port 3100
```
