import type {
  APKDiagnosticInput,
  RuntimeCartridge,
  RuntimeCartridgeManifest,
  RuntimeEdition,
  SemanticAsset,
} from "@reading-advantage/advantage-play-kit";
import type {
  GameResults,
  SentenceInput,
  VocabularyInput,
} from "@reading-advantage/game-contracts";
import type Phaser from "phaser";

/** Identifies the learning-content shape accepted by a cartridge. */
export type CartridgeContentMode = "vocabulary" | "sentence";

/** Names the Phaser capability families exercised by a cartridge. */
export type CartridgeCapability =
  | "arcade-physics"
  | "camera"
  | "object-pool"
  | "particles"
  | "timers"
  | "tweens";

/** Identifies a supported visual and audience-tuning edition. */
export type CartridgeEditionId = "primary-chibi" | "secondary-epic";

/** Public semantic asset type shared with the APK runtime. */
export type CartridgeSemanticAsset = SemanticAsset;

/** Public audience edition type shared with the APK runtime. */
export type CartridgeEdition = RuntimeEdition;

/** Manifest specialization for the public APK cartridge catalog. */
export type CartridgeManifest = RuntimeCartridgeManifest & {
  /** Stable product-facing cartridge identifier. */
  id:
    | "dragon-flight"
    | "dungeon-liberator"
    | "magic-defense"
    | "astral-mage"
    | "sorcerer-ziggurat"
    | "dragon-rider";
  /** Educational input mode used by runtime validation. */
  inputMode: CartridgeContentMode;
  /** Phaser capability families demonstrated by this cartridge. */
  capabilities: readonly CartridgeCapability[];
};

/** Reports structured cartridge activity to the APK host diagnostic surface. */
export interface CartridgeDiagnostic {
  /** Diagnostic event name. */
  type: "scene-ready" | "answer" | "round" | "complete" | "error";
  /** Optional structured details. */
  details?: Record<string, unknown>;
}

/** Supplies typed learning input to a deterministic Phaser configuration builder. */
export interface CartridgeGameConfigOptions<
  TInput extends VocabularyInput | SentenceInput,
> {
  /** Stable vocabulary or sentence array passed by the host. */
  input: TInput;
  /** Resolved audience edition. */
  edition: CartridgeEdition;
  /** Called once when the learning loop produces final results. */
  complete: (results: GameResults) => void;
  /** Receives structured runtime evidence for the QC host. */
  diagnostics: (event: CartridgeDiagnostic) => void;
  /** Deterministic random seed for reproducible sessions. */
  seed: number;
}

/** Reusable Phaser-native cartridge consumed directly by the APK runtime. */
export type GameCartridgeDefinition = RuntimeCartridge & {
  /** Browser-safe cartridge metadata. */
  manifest: CartridgeManifest;
};

/** Browser-safe catalog metadata paired with a literal dynamic import. */
export interface CartridgeCatalogEntry {
  /** Stable cartridge identifier. */
  id: CartridgeManifest["id"];
  /** Product-facing title. */
  title: string;
  /** Short mechanic description. */
  description: string;
  /** Semantic input mode. */
  inputMode: CartridgeContentMode;
  /** Archetype used to plan catalog rebuild waves. */
  mechanic:
    | "gate-runner"
    | "sentence-order-collection"
    | "typing-defense"
    | "target-action"
    | "step-traversal";
  /** Edition IDs verified for this cartridge. */
  editions: readonly CartridgeEditionId[];
}

/**
 * Converts cartridge diagnostics into the APK structured event contract.
 * @param event Cartridge-specific diagnostic and optional details.
 * @returns A timestamp-free diagnostic accepted by the runtime.
 */
export function toAPKDiagnostic(event: CartridgeDiagnostic): APKDiagnosticInput {
  return {
    level: event.type === "error" ? "error" : "info",
    code: `CARTRIDGE_${event.type.replaceAll("-", "_").toUpperCase()}`,
    message: event.type.replaceAll("-", " "),
    ...(event.details === undefined ? {} : { details: event.details }),
  };
}

/** Narrows a runtime Phaser configuration to the cartridge builder return type. */
export type CartridgePhaserConfig = Phaser.Types.Core.GameConfig;
