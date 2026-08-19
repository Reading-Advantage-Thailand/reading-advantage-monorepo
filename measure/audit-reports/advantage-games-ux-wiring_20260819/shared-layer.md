# Advantage Games UX Wiring Audit — Shared Layer

**Date:** 2026-08-19

## Launch path

1. Public home `apps/advantage-games/src/app/page.tsx` reads `gameCards`.
2. `resolveGameHref` prefixes `/en`.
3. Every playable card opens `/en/student/games/apk/{id}`.
4. `AuthenticatedApkPage` loads `getCartridgeCatalogEntry(id)`.
5. `AuthenticatedCartridgeHost` loads `cartridgeLoaders[id]` and `GET /api/v1/apk/content`.
6. `APKGameHost` shows briefing, tutorial, play, and debrief.

Public preview lives at `/[locale]/student/arcade/{id}`. That route uses `PublicCartridgeHost` and fixture text. Catalog cards do not use that route.

Leftover Konva pages still exist under `student/games/sentence/` and `student/games/vocabulary/`. Catalog cards do not open those pages. Bookmarks still do.

There is no `student/games/page.tsx`. Debrief exit and leftover "Back" links that target `/student/games` open a missing page.

## Hosts

### AuthenticatedCartridgeHost

- File: `apps/advantage-games/src/components/apk/AuthenticatedCartridgeHost.tsx`
- `createStudentEdition` maps every `requiredAssetBindings` key to `STUDENT_EDITION_ASSET`.
- That asset is `asset-6aeab3f50c0f6be4.png` under `/assets/apk/standard-pack-qc/`.
- `seed={29}`.
- `standardExperience={cartridge.standardExperience}`.
- `onNavigate("catalog")` uses `/${locale}/student/games`.
- `resolveContentLocale` maps `zh` to `cn` and maps all other non-`th` locales to `en`.

### PublicCartridgeHost

- File: `apps/advantage-games/src/components/apk/PublicCartridgeHost.tsx`
- Same QC image as `DEVELOPER_PREVIEW_ASSET`.
- Sentence games use `PUBLIC_ARCADE_SENTENCE_FIXTURE`.
- Vocabulary games use `PUBLIC_ARCADE_VOCABULARY_FIXTURE`.
- Banner text says "Preview mode" and "does not save progress".

## Standard experience

`packages/game-cartridges/src/standard-experience.ts` builds one briefing, one tutorial, and one debrief for every cartridge.

- Start label: "Start guided tutorial".
- Start phase: `tutorial`.
- Tutorial steps: `action:select-incorrect`, then `action:select-correct`.
- Tutorial seed: 29.
- Debrief credit: "Pixel art assets by ElvGames".
- Replay returns to briefing.
- Exit destination: `catalog`.

## Music

`useBackgroundMusic` lists all 28 catalog IDs plus `babel-architect`. Files exist under `public/sounds/music/{id}.mp3`.

APK hosts do not call the hook. These leftover pages do:

- `DragonRiderGame`
- `PaladinsTwinSoulGame`
- `ArchersRevengeGame`
- `GriffinRidersEscapeGame`

Catalog play is silent for all 28 titles.

## Asset use

`rg` on `packages/game-cartridges/src` finds no `load.image` and no `add.image`. Scenes use `this.add.graphics()` and `this.add.text()`.

Empty bindings:

- `dragon-flight`
- `astral-mage`
- `sorcerer-ziggurat`

Those three games receive no edition image. They draw shapes only.

## Graph coverage (package filter)

Query of `advantage-games`, `game-cartridges`, and `advantage-play-kit`:

| Game | Nodes |
|---|---|
| rpg-battle | 66 |
| dragon-flight | 54 |
| potion-rush | 48 |
| enchanted-library | 42 |
| dungeon-liberator | 24 |
| castle-defense | 24 |
| rune-match | 22 |
| rune-forge-chamber | 22 |
| wizard-vs-zombie | 21 |
| village-guardian | 21 |
| shadow-gate-dungeon | 21 |
| labyrinth-goblin-king | 21 |
| haunted-library | 16 |
| alchemists-synthesis | 14 |
| devourer-slime | 13 |
| magic-defense | 10 |
| storm-castle-tower, spellweavers-run, realm-carver, paladins-twin-soul, gryphon-patrol, griffin-sky-joust, griffin-riders-escape, dragon-rider, archers-revenge | 4 each |
| sorcerer-ziggurat, astral-mage | 1 each |
| abyssal-well | 0 |

The graph indexes leftover start-screen helpers in `tests/e2e/helpers/gameHelpers.ts`. It does not index most APK cartridge scenes.

## Catalog-path defects confirmed from a second graph walk

These items were missing or incomplete in the first two passes. Source now confirms them.

### Signed-out catalog launch

Catalog cards open `/en/student/games/apk/{id}` (`src/app/page.tsx` `resolveGameHref`). That route mounts `AuthenticatedCartridgeHost`. A signed-out fetch of `/api/v1/apk/content` returns 401 `"Authentication required"` (`content-route.ts:121`). The host paints that string in red inside the black play surface. The catalog page has no login control. `/login` exists (`src/app/login/page.tsx`). `resolveStudentRedirect` always returns `"/"`, so a later sign-in does not return to the game.

### Catalog locale lock

`resolveGameHref` always prefixes `/en`. Thai and Chinese students who use the Vocab Arcade home always open the English APK route.

### Public arcade Exit is dead

`PublicCartridgeHost` does not pass `onNavigate`. `APKGameHost` Exit calls `onNavigate?.(effectiveDebrief.exitDestination)`. With no handler, Exit does nothing. The arcade route is also an orphan: product UI does not link to `/[locale]/student/arcade/[cartridgeId]`. Tests and login-form fixtures still mention it.

### Pack root ignores `basePath`

Both hosts set `pack.root` to `"/assets/apk/standard-pack-qc/"`. Legacy Konva games call `withBasePath`. `next.config.ts` can set `basePath` from `NEXT_PUBLIC_BASE_PATH` or GitHub Actions (`/${repoName}`). Under a based deploy, the QC pack URL 404s. Cartridges still do not load pack files, so this stays latent until preload exists.

### Leaderboard stays empty on the catalog path

APK hosts do not call `useLeaderboard`. Only leftover `GameEndScreen` records scores. That screen links to `/student/leaderboard` with no locale segment. The live page is `/[locale]/student/leaderboard`. Catalog APK completion posts to `/api/v1/apk/complete` and never writes `LEADERBOARD_KEY`.

### Dead-weight sizes

`du` on this tree: `public/games` is 233 MB. `public/sounds` is 31 MB. The catalog APK path loads none of it.

## Locale and exit

App locales from `[locale]/layout.tsx` are `en`, `th`, and `zh`.

`AuthenticatedApkPage.resolveContentLocale`:

- `th` → `th`
- `zh` → `cn`
- all other values → `en`

`AuthenticatedCartridgeHost` then assigns `/${locale}/student/games`. After a Chinese session the browser opens `/cn/student/games`. That locale is not in the app.

## Cover files

27 of 28 card paths exist. `abyssal-well` points to `cover-the-abyssal-well.png`. Disk has `abyssal-well-cover.png` only.

Unused extra file: `griffin-sky-joust-cover.png`. The card uses `cover-griffin-sky-joust.png`.
