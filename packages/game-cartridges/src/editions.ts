import { APK_RUNTIME_API_VERSION, validateEdition } from "@reading-advantage/advantage-play-kit";

import type {
  CartridgeEdition,
  CartridgeEditionId,
  CartridgeSemanticAsset,
} from "./internal/types";

/** Semantic visual and audio slots shared by the public cartridge catalog. */
export const GAMEPLAY_ASSET_SLOTS = [
  "world.background",
  "player.hero",
  "target.correct",
  "target.incorrect",
  "enemy.basic",
  "feedback.correct",
  "feedback.incorrect",
  "ui.panel",
  "projectile.magic",
  "target.word-crystal",
  "indicator.offscreen",
  "portal.complete",
  "terrain.ziggurat",
  "platform.rune-cube",
  "token.rune",
  "effect.ritual",
  "target.gate",
  "ally.dragon",
  "enemy.boss",
  "lane.marker",
  "target.word-orb",
  "zone.collection",
  "effect.mana",
  "hazard.obstacle",
  "effect.wind",
] as const;

function createProceduralAsset(
  editionId: CartridgeEditionId,
  slot: (typeof GAMEPLAY_ASSET_SLOTS)[number],
): CartridgeSemanticAsset {
  return {
    key: slot,
    type: "procedural",
    provenance: {
      source: `Advantage Play Kit ${editionId} procedural proof artwork v1.0.0`,
      license: "LicenseRef-Reading-Advantage-Original",
      creator: "Reading Advantage",
    },
    metadata: {
      version: "1.0.0",
      format: "procedural",
      optimized: true,
    },
  };
}

function createAssets(
  editionId: CartridgeEditionId,
): Record<(typeof GAMEPLAY_ASSET_SLOTS)[number], CartridgeSemanticAsset> {
  return Object.fromEntries(
    GAMEPLAY_ASSET_SLOTS.map((slot) => [slot, createProceduralAsset(editionId, slot)]),
  ) as Record<(typeof GAMEPLAY_ASSET_SLOTS)[number], CartridgeSemanticAsset>;
}

/** Primary-facing Chibi placeholder edition with forgiving game-feel tuning. */
export const primaryChibiEdition: CartridgeEdition = {
  id: "primary-chibi",
  title: "Primary Chibi",
  runtimeApiVersion: APK_RUNTIME_API_VERSION,
  assets: createAssets("primary-chibi"),
  palette: {
    background: 0x8bd3dd,
    player: 0xffd166,
    friendly: 0x6ee7b7,
    hostile: 0xfb7185,
    accent: 0xa78bfa,
    text: "#172554",
  },
  tuning: {
    speed: 0.8,
    targetScale: 1.25,
    collisionScale: 1.3,
    intensity: 0.65,
    custom: { enemyDensity: 0.75 },
  },
};

/** Secondary-facing Epic placeholder edition with denser, faster game-feel tuning. */
export const secondaryEpicEdition: CartridgeEdition = {
  id: "secondary-epic",
  title: "Secondary Epic",
  runtimeApiVersion: APK_RUNTIME_API_VERSION,
  assets: createAssets("secondary-epic"),
  palette: {
    background: 0x111827,
    player: 0x60a5fa,
    friendly: 0x34d399,
    hostile: 0xef4444,
    accent: 0xf59e0b,
    text: "#f8fafc",
  },
  tuning: {
    speed: 1.15,
    targetScale: 0.95,
    collisionScale: 1,
    intensity: 0.9,
    custom: { enemyDensity: 1.2 },
  },
};

/** Editions available to every public cartridge. */
export const editionCatalog = [primaryChibiEdition, secondaryEpicEdition] as const;

/**
 * Resolves and validates an edition selected by the APK host.
 * @param editionId Edition identifier supplied by the host.
 * @returns The matching runtime-compatible cartridge edition.
 * @throws When the edition identifier is unknown or invalid.
 */
export function resolveCartridgeEdition(editionId: string): CartridgeEdition {
  const edition = editionCatalog.find((candidate) => candidate.id === editionId);
  if (!edition) throw new Error(`Unknown edition: ${editionId}`);
  return validateEdition(edition, GAMEPLAY_ASSET_SLOTS, APK_RUNTIME_API_VERSION);
}
