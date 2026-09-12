import type { PhysicalAssetFile } from "@reading-advantage/advantage-play-kit/runtime";

/** Reviewed static top-down actors for Labyrinth of the Goblin King. */
export const LABYRINTH_STANDARD_ART_FILES: Readonly<Record<string, PhysicalAssetFile>> = {
  "labyrinth-player-idle": {
    id: "labyrinth-player-idle",
    path: "labyrinth-player-idle.png",
    kind: "spritesheet",
    view: "top-down",
    width: 96,
    height: 96,
    format: "png",
    alpha: true,
    byteSize: 1706,
    sha256: "a30a93135139401276ecd8749c36084f86136d2e7eccb86c46280d2c206c38db",
    provenance: {
      source: "top-down/native/fantasy-dreamland-world/fantasy-dreamland-reborn/characters/fdr-character-016-idle-source-95d28f773928.png",
      license: "LicenseRef-ElvGames",
      creator: "ElvGames",
    },
    grid: { frameWidth: 24, frameHeight: 24, columns: 4, rows: 4, frameCount: 16 },
  },
  "labyrinth-goblin-static": {
    id: "labyrinth-goblin-static",
    path: "labyrinth-goblin-static.png",
    kind: "spritesheet",
    view: "top-down",
    width: 192,
    height: 224,
    format: "png",
    alpha: true,
    byteSize: 3310,
    sha256: "af749317614bd99d32fe5e11deb1a68d290c4220e4ad6788fc81b32241d6d1fa",
    provenance: {
      source: "top-down/native/rogue-adventure-world/enemies/enemy011/enemy-011-a-source-8cb7e3d30a3a.png",
      license: "LicenseRef-ElvGames",
      creator: "ElvGames",
    },
    grid: { frameWidth: 32, frameHeight: 32, columns: 6, rows: 7, frameCount: 42 },
  },
};
