# APK Architecture Decision

## Decision

All new and rebuilt language games use Phaser 4 cartridges. Legacy React-Konva and R3F games remain only as mechanic references until a cartridge cutover is approved. No renderer or behavioral compatibility layer is required.

The stable cartridge boundary is intentionally small:

```text
Host app
  -> literal dynamic cartridge registry
  -> APK React host and Phaser runtime
  -> one cartridge + one audience edition
  -> GameResults callback
  -> host-owned server completion mapping
```

## Package ownership

| Package | Owns | Must not own |
|---|---|---|
| `@reading-advantage/game-contracts` | Strict vocabulary/sentence arrays, five-field results, completion mapping, architecture guards | Phaser, React, auth, DB, Next.js |
| `@reading-advantage/advantage-play-kit` | Phaser lifecycle, normalized browser input, diagnostics, semantic assets, edition validation, accessible React host, test kit | Game-specific rules, app routes, identity, persistence |
| `@reading-advantage/game-cartridges` | Literal dynamic catalog, deterministic mechanics, Phaser scenes, Primary Chibi and Secondary Epic base editions | Next.js, auth, DB, copied host code |
| `apps/advantage-games` | Unauthenticated local QC catalog, fixtures, diagnostics, mock completion inspection | Production identity or progress persistence |
| Reading / Primary hosts | Enabled-game choice, audience edition, navigation, authenticated completion context | Copied cartridge source or trusted client XP |

## Frozen educational ABI

- Vocabulary and sentence callers both pass `Array<{ term, translation }>`; the semantic mode stays distinct.
- Cartridges emit exactly `{ accuracy, xp, score, correctAnswers, totalAttempts }`.
- Legacy optional item IDs are stripped at the host normalization boundary.
- Display `xp` is shown locally but omitted from server input. Identity, tenancy, duration, difficulty, victory, idempotency, timestamps, and authoritative XP remain host/server responsibilities.

## Runtime invariants

- Phaser is loaded lazily in the browser and never imported by the contracts package.
- One mount owns one canvas, input controller, visibility listener, and resize observer.
- Pause, resume, mute, restart, completion-once, failure diagnostics, and destruction are host controls.
- Phaser keeps a logical game world and uses `Scale.FIT`; host resizing refreshes presentation without rewriting world coordinates.
- Edition changes replace semantic assets, palette, and bounded tuning. They do not fork scene source or change educational I/O.

## Reset and cutover

The cancelled Babel Architect Phaser 3 and R3F tracks are evidence, not retained foundations. A legacy game is deleted only after both editions pass product-owner QC, package consumption is green, server mapping is proven, and an exact deletion manifest is reviewed in the game’s successor track.
