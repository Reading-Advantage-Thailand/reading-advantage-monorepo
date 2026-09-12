import type { PhysicalAssetFile } from "@reading-advantage/advantage-play-kit/runtime";

/** Reviewed castle wall for Storm the Castle Tower. */
export const STORM_STANDARD_ART_FILES: Readonly<Record<string, PhysicalAssetFile>> = {
  "storm-castle-blue-wall": {
    id: "storm-castle-blue-wall",
    path: "storm-castle-blue-wall.png",
    kind: "image",
    view: "top-down",
    width: 32,
    height: 64,
    format: "png",
    alpha: true,
    byteSize: 601,
    sha256: "5b42f7debb6456f7a8238d8ea58876d5d7fdf52f450b44119b8aa624d35d1549",
    provenance: {
      source: "top-down/native/fantasy-dreamland-world/processed/remastered-castle/remastered-castle-blue-narrow-wall.png",
      license: "LicenseRef-ElvGames",
      creator: "ElvGames",
    },
  },
};
