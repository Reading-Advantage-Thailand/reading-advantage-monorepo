import type { PhysicalAssetFile } from "@reading-advantage/advantage-play-kit/runtime";

/** Reviewed well mouth for The Abyssal Well. */
export const ABYSSAL_STANDARD_ART_FILES: Readonly<Record<string, PhysicalAssetFile>> = {
  "abyssal-well-mouth": {
    id: "abyssal-well-mouth",
    path: "abyssal-well-mouth.png",
    kind: "image",
    view: "top-down",
    width: 48,
    height: 96,
    format: "png",
    alpha: true,
    byteSize: 2408,
    sha256: "cde73abab30fa21e7fad4bcaccd124f210c30c6e09751214585c312bd861648e",
    provenance: {
      source: "top-down/native/farming-game-world/processed/fg-abandoned-mines-review-parts/fg-abandoned-mines-review-parts-pit-round-black.png",
      license: "LicenseRef-ElvGames",
      creator: "ElvGames",
    },
  },
};
