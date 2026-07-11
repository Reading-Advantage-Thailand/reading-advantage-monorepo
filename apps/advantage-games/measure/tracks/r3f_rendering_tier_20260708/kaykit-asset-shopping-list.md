# KayKit Asset Shopping List — The Abyssal Well R3F Retheme

Track: r3f_rendering_tier_20260708
Story: S6 (see `spec.md` and `plan.md`)
Date: 2026-07-08

## Goal

Retheme The Abyssal Well from procedural primitives to the project's KayKit 3D house family
(`measure/tech-stack.md#asset-families`), proving the GLB-asset pipeline for the R3F tier.
No custom models are required — creature types swap to KayKit Skeleton variants so the game
stays 100% KayKit (no family mixing per the tech-stack presentation rule).

## Download source

All KayKit packs are **CC0** (public domain) by Kay Lousberg.

- Site: https://kaylousberg.com
- Download format: **`.glb`** (preferred per `tech-stack.md:81`). Avoid FBX/OBJ — those would
  need an extra conversion step the track doesn't scope.

Create an account if needed; downloads are free.

## Packs to download

| # | Pack | Used for in Abyssal Well | Priority |
|---|------|--------------------------|----------|
| 1 | **Dungeon Remastered** | Stone well-wall material/modular ring on the cylinder, rim capstone, torches (lighting + atmosphere), floor debris at the well bottom | Essential |
| 2 | **Skeletons** | All 3 enemy creature types (see creature swap below) — skeleton variants with walk/attack animations | Essential |
| 3 | **Adventurers** | Player character on the rim (replaces the cone ship) — pick one: Knight, Mage, or Ranger | Essential |
| 4 | **Character Animations** | Idle / walk / attack / die clips shared by skeletons and adventurer | Essential |
| 5 | **RPG Tools** | Projectile visuals (arrows / fireballs / spell orbs) + the player's held weapon | Recommended |

Notes:
- Pack 5 (RPG Tools) is optional — if a pack is large and you want to minimize download,
  projectiles can stay as small glowing geometry. But it's cheap and adds polish.
- If any pack offers a choice of `.gltf` + textures vs. single `.glb`, take the **single
  `.glb`** (self-contained, no external texture paths to wire up).

## Where to place the files

KayKit is the **cross-game 3D house family** (not per-game), so it lives in a shared location
that future R3F games (Griffin Rider's Escape, Crystal Cavern Rail Runner, etc.) will reuse.
Do **not** duplicate it under `public/games/sentence/abyssal-well/`.

```
apps/advantage-games/public/assets/3d/kaykit/
├── dungeon-remastered/   # wall.glb, torch.glb, floor.glb, capstone.glb, ...
├── skeletons/            # skeleton-scout.glb, skeleton-warrior.glb, skeleton-mage.glb
├── adventurers/          # knight.glb (or mage.glb / ranger.glb)
├── character-animations/ # idle.glb, walk.glb, attack.glb, die.glb
└── rpg-tools/            # arrow.glb, fireball.glb, spell-orb.glb, ...
```

Subfolder names are the pack slugs; filenames can match what KayKit ships. Once you've
downloaded and placed them, tell me the exact filenames and I'll wire the loader to those
paths (and update this doc with the final inventory).

## Creature-type swap (no custom models)

The current `CreatureType` union (`src/lib/games/abyssalWellConfig.ts:8`) is
`'goblin-scout' | 'cave-spider' | 'shadow-demon'`. KayKit has skeletons, not those creatures.
S6 swaps to skeleton variants — same slow/medium/fast speed tiers, no behavior change:

| Old creature        | New creature        | Speed |
|---------------------|---------------------|-------|
| `goblin-scout`      | `skeleton-scout`    | slow  |
| `cave-spider`       | `skeleton-warrior`  | med   |
| `shadow-demon`      | `skeleton-mage`     | fast  |

This keeps the game 100% KayKit. If you'd rather keep the original creatures, the alternative
is adding Quaternius "Ultimate Monsters" (CC0) for goblin/spider/demon as a documented
family-mixing exception — **not recommended** (the team approved skeleton-only on 2026-07-08).

## What I'll build once the files land

(Tracked as Phase S6 tasks in `plan.md` — no action needed from you on these.)

1. A shared loader (drei `useGLTF` + `SkeletonUtils.clone` for animated models, preload +
   `<Suspense>` fallback) reusable by future R3F games.
2. Reworked `AbyssalWellScene.tsx`: KayKit stone well, rim torches as `pointLight`s, skeleton
   enemies with drei `<Text>` word labels, adventurer player, RPG-Tools projectiles, warm-bloom
   palette replacing neon cyan.
3. Creature-type swap in config + logic tests + start-screen labels.
4. Compliance re-audit (the R3F-canvas deviation from S2 stays; asset-dir spec points at the
   shared KayKit family), coverage >80%, mobile perf re-check, 2D-bundle-isolation re-check.

## Status: COMPLETE (2026-07-08)

Assets are in place. The 3 GitHub repos (Adventures, Skeletons, Dungeon Remastered) covered
100% of needs - the Character Animations and RPG Tools packs from the original list were not
required (animations are embedded in the character `.glb` files; projectiles stay as geometry).

## Checklist for you

- [x] Download Dungeon Remastered (.glb) - cloned from GitHub
- [x] Download Skeletons (.glb) - cloned from GitHub
- [x] Download Adventurers (.glb) - cloned from GitHub
- [x] ~~Download Character Animations~~ - not needed (embedded in character GLBs)
- [x] ~~Download RPG Tools~~ - not needed (projectiles stay as geometry)
- [x] Place under `apps/advantage-games/public/assets/3d/kaykit/<pack-slug>/`
- [x] Tell me the exact filenames so I can wire the loader - finalized (kebab-case)

## Final inventory placed

```
apps/advantage-games/public/assets/3d/kaykit/
├── ATTRIBUTION.md
├── adventurers/
│   ├── LICENSE.txt
│   └── mage.glb                    (player - 3.5M)
├── skeletons/
│   ├── LICENSE.txt
│   ├── skeleton-minion.glb         (slow tier - 4.6M)
│   ├── skeleton-warrior.glb        (medium tier - 4.7M)
│   └── skeleton-mage.glb           (fast tier - 4.6M)
└── dungeon-remastered/
    ├── LICENSE.txt
    ├── torch-lit.glb               (rim torches - 31K)
    ├── wall.glb                    (stone well-wall segments - 52K)
    ├── floor-tile.glb              (well floor / capstone - 28K)
    └── pillar.glb                  (optional rim decoration - 25K)
```

Total ~21MB. All CC0 (Kay Lousberg / kaylousberg.com). Source repos and per-file mapping
documented in `ATTRIBUTION.md`.

The files briefly unblocked the proposed S6 asset pass before the user cancelled the R3F track; no S6 implementation or imported assets are retained.
