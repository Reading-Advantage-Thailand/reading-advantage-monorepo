/**
 * Stable asset manifest for Babel's Architect.
 *
 * The first playable build renders all visuals from code-generated Phaser
 * graphics using a constrained low-color palette. This manifest is the single
 * source of truth for every asset slot so a future approved pack (Pixel Crawler
 * by Anokolisa or equivalent) can replace placeholders through file swaps and
 * loader config without touching scene or logic code.
 *
 * Replacement workflow:
 * 1. Drop licensed sprite files into `public/games/sentence/babel-architect/`.
 * 2. Flip `source` from "code-generated" to "file" and set the `path`.
 * 3. The scene loader reads the manifest; no logic or layout changes.
 */

/** Constrained palette shared by every placeholder visual. */
export const BABEL_ARCHITECT_PALETTE = {
  background: 0x0b1020,
  backgroundTop: 0x1a1f3a,
  stone: 0x6b7280,
  stoneHighlight: 0x9ca3af,
  stable: 0x4ade80,
  unstable: 0xef4444,
  text: 0xf8fafc,
  accent: 0xfbbf24,
  stabilityHigh: 0x22d3ee,
  stabilityLow: 0xef4444,
  towerBase: 0x374151,
} as const;

/** Asset slot categories that every Babel Architect build must define. */
export type BabelArchitectAssetKey =
  | "block-stone"
  | "block-stable"
  | "block-unstable"
  | "background"
  | "tower-base"
  | "particle"
  | "ui-accent";

/** Source kind for a manifest entry. */
export type BabelArchitectAssetSource =
  | { kind: "code-generated"; paletteKey: keyof typeof BABEL_ARCHITECT_PALETTE }
  | { kind: "file"; path: string };

/** A single manifest entry describing one replaceable visual slot. */
export interface BabelArchitectAssetEntry {
  /** Stable key the scene and loader reference. */
  key: BabelArchitectAssetKey;
  /** Current placeholder source. */
  source: BabelArchitectAssetSource;
  /** Preferred future replacement path under the public asset directory. */
  replacementPath: string;
  /** Human note for the future asset ingestion decision. */
  note: string;
}

/** Public asset directory required by the shared game compliance spec. */
export const BABEL_ARCHITECT_ASSET_DIR =
  "/games/sentence/babel-architect";

/**
 * The full asset manifest. Add or replace entries here when swapping
 * code-generated placeholders for a licensed sprite pack.
 */
export const BABEL_ARCHITECT_ASSET_MANIFEST: Record<
  BabelArchitectAssetKey,
  BabelArchitectAssetEntry
> = {
  "block-stone": {
    key: "block-stone",
    source: { kind: "code-generated", paletteKey: "stone" },
    replacementPath: `${BABEL_ARCHITECT_ASSET_DIR}/sprites/block-stone.png`,
    note: "Default selectable stone block. Pixel Crawler: stone-tile / crate frame.",
  },
  "block-stable": {
    key: "block-stable",
    source: { kind: "code-generated", paletteKey: "stable" },
    replacementPath: `${BABEL_ARCHITECT_ASSET_DIR}/sprites/block-stable.png`,
    note: "Correctly placed block. Pixel Crawler: reinforced-stone / lit crystal.",
  },
  "block-unstable": {
    key: "block-unstable",
    source: { kind: "code-generated", paletteKey: "unstable" },
    replacementPath: `${BABEL_ARCHITECT_ASSET_DIR}/sprites/block-unstable.png`,
    note: "Incorrectly placed block. Pixel Crawler: cracked-stone / damaged frame.",
  },
  background: {
    key: "background",
    source: { kind: "code-generated", paletteKey: "background" },
    replacementPath: `${BABEL_ARCHITECT_ASSET_DIR}/backgrounds/tower-night.png`,
    note: "Vertical tower backdrop. Pixel Crawler: dungeon / night-sky tilemap.",
  },
  "tower-base": {
    key: "tower-base",
    source: { kind: "code-generated", paletteKey: "towerBase" },
    replacementPath: `${BABEL_ARCHITECT_ASSET_DIR}/sprites/tower-base.png`,
    note: "Foundation the stack rests on. Pixel Crawler: castle-foundation tile.",
  },
  particle: {
    key: "particle",
    source: { kind: "code-generated", paletteKey: "accent" },
    replacementPath: `${BABEL_ARCHITECT_ASSET_DIR}/particles/spark.png`,
    note: "Placement feedback spark. Pixel Crawler: dust / magic particle.",
  },
  "ui-accent": {
    key: "ui-accent",
    source: { kind: "code-generated", paletteKey: "accent" },
    replacementPath: `${BABEL_ARCHITECT_ASSET_DIR}/ui/accent.png`,
    note: "HUD accent and stability bar. Pixel Crawler: ui-frame / gem.",
  },
};

/** Preferred future asset-pack family; ingestion tracked separately. */
export const PREFERRED_ASSET_PACK = {
  name: "Pixel Crawler by Anokolisa",
  license: "Requires separate asset-ingestion decision before commit",
} as const;
