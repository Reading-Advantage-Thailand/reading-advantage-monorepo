# Dragon Flight rebuild packet

## Required identity

Dragon Flight is the selected dragon lane game. It uses vocabulary choices.
Griffin Sky-Joust remains a separate aerial combat game with sentence content.
Preserve existing identifiers, routes, results, and historical competition scopes during implementation.
Route retirement and deployment remain separate release actions.

## Evidence of lost gameplay

The current cartridge completes each correct gate click immediately.
The primary agent completed the four-item public preview through four clicks.
The cartridge has no flock growth, timed flight, or guardian encounter.
Its alternating correct side permits answers without reading.

The original Dragon Flight implementation has moving gate pairs and a dragon flock.
Correct choices increase the flock. Wrong choices reduce it according to difficulty.
The flight timer leads to an animated guardian encounter.
The original Dragon Rider rules use the same growth and guardian structure.

Source locations:

- `packages/game-cartridges/src/dragon-flight.ts`
- `apps/advantage-games/src/lib/games/dragonFlight.ts`
- `apps/advantage-games/src/lib/games/dragonRider.ts`
- `apps/advantage-games/src/components/games/vocabulary/dragon-flight/DragonFlightGame.tsx`

The original component uses `GATE_TRAVEL_MS = 7200` and moves the player toward the selected lane before accounting for a choice.
These values document the existing experience. They do not establish suitable pacing for the rebuilt game.

## Implementation boundaries

1. Restore moving gates, visible flock growth, and a concluding guardian encounter.
2. Show one prominent Thai prompt and English gate labels.
3. Keep gameplay sentences in the briefing and Practice.
4. Use the common left and right actions for keyboard and touch.
5. Use seeded answer placement without a repeating left-right pattern.
6. Count one deliberate selection per gate encounter.
7. Preserve the five-field result and one completion per session.
8. Preserve independent historical results for Dragon Rider.
9. Reuse the rebuilt lane engine for the Dragon Rider route.
10. Keep Griffin sentence combat outside this engine.

Use reviewed flight assets that share the same perspective and pixel scale.
Compare actual actor, gate, background, and guardian images before binding them.
Use the current APK simulation, input, audio, and lifecycle services where they meet these requirements.

Do not invent a false distractor when the input lacks two distinct English meanings.
Define truthful behavior for that input before implementing selection accounting.
English audio choices must use the shared playback and confirmation rules when audio support is added.

## Required verification

Tests must cover seeded choices, duplicate meanings, one selection per encounter, timer boundaries, pause, replay, and completion accounting.
Browser play must show actual travel, lane changes, growth, wrong-choice recovery, and the guardian encounter.
Check the Thai prompt and both English choices at phone and wide sizes.
Verify that the player can identify the target without searching through instructions.
Compare the rebuilt mechanic with the original flight experience before phase review.

This packet records preparatory review. It does not establish an implemented or accepted flight rebuild.
