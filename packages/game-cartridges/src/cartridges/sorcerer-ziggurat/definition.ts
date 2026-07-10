import type { SentenceInput } from "@reading-advantage/game-contracts";

import type {
  CartridgeGameConfigOptions,
  GameCartridgeDefinition,
} from "../../internal/types";
import { toAPKDiagnostic } from "../../internal/types";
import {
  createSorcererZigguratGameConfig,
  SORCERER_ZIGGURAT_ASSET_SLOTS,
} from "./scene";

export {
  createSorcererZigguratGameConfig,
  SORCERER_ZIGGURAT_ASSET_SLOTS,
} from "./scene";

/** Public Sorcerer's Ziggurat sentence cartridge using the step-graph family. */
export const sorcererZigguratCartridge = {
  manifest: {
    id: "sorcerer-ziggurat",
    title: "The Sorcerer's Ziggurat",
    description:
      "Jump across adjacent rune cubes in the correct order to complete ancient rituals.",
    inputMode: "sentence",
    runtimeApiVersion: "1.0.0",
    version: "0.1.0",
    capabilities: ["camera", "particles", "tweens"],
    requiredAssetSlots: SORCERER_ZIGGURAT_ASSET_SLOTS,
  },
  createGameConfig: (context) =>
    createSorcererZigguratGameConfig({
      input: context.input as SentenceInput,
      edition: context.edition,
      complete: (result) => context.complete(result),
      diagnostics: (event) => context.diagnostic(toAPKDiagnostic(event)),
      seed: context.seed ?? Date.now(),
    } satisfies CartridgeGameConfigOptions<SentenceInput>),
} as const satisfies GameCartridgeDefinition;

export default sorcererZigguratCartridge;
