/** Public educational input and result ABI. */
export {
  gameResultsSchema,
  normalizeSentenceInput,
  normalizeVocabularyInput,
  sentenceInputSchema,
  vocabularyInputSchema,
  vocabularyItemSchema,
} from "./educational-io.js";

/** Public educational input and result types. */
export type {
  GameResults,
  SentenceInput,
  VocabularyInput,
  VocabularyItem,
} from "./educational-io.js";

/** Public host completion mapping boundary. */
export {
  gameCompletionInputSchema,
  gameDifficultySchema,
  hostCompletionContextSchema,
  mapGameResultsToCompletionInput,
} from "./completion.js";

/** Public host completion mapping types. */
export type {
  GameCompletionInput,
  HostCompletionContext,
} from "./completion.js";

/** Public existing-core Reading/Primary host-proof binding contract. */
export {
  EXISTING_CORE_HOST_PROOF_BINDINGS,
  EXISTING_CORE_HOST_PROOF_RECEIPTS,
  HOST_PROOF_RESPONSIVE_WIDE_MIN_WIDTH,
  existingCoreHostProofBindingSchema,
  existingCoreHostProofCartridgeIdSchema,
  hostProofViewportProfileSchema,
  getExistingCoreHostProofBinding,
  isExistingCoreHostProofCartridge,
  resolveHostProofViewportProfile,
} from "./host-proof-bindings.js";

/** Public existing-core host-proof binding types. */
export type {
  ExistingCoreHostProofBinding,
  ExistingCoreHostProofCartridgeId,
  HostProofViewportProfile,
} from "./host-proof-bindings.js";

/** Public title-local Dragon Rider host-proof admission contract. */
export {
  DRAGON_RIDER_HOST_PROOF_BINDING,
  dragonRiderHostProofBindingSchema,
  dragonRiderHostProofClaimIdSchema,
  dragonRiderHostProofClaimIdsSchema,
  dragonRiderHostProofSemanticKeySchema,
  dragonRiderHostProofSelectedSemanticKeysSchema,
} from "./dragon-rider-host-proof-binding.js";

/** Public Dragon Rider host-proof admission type. */
export type { DragonRiderHostProofBinding } from "./dragon-rider-host-proof-binding.js";

/** Public APK source-architecture scanner. */
export { scanAPKArchitecture } from "./architecture.js";

/** Public APK source-architecture scanner types. */
export type {
  ArchitectureLayer,
  ArchitectureScanOptions,
  ArchitectureScanResult,
  ArchitectureSourceFile,
  ArchitectureViolation,
} from "./architecture.js";

/** Public frozen multiplayer.v1 wire contract. */
export * from "./multiplayer.js";
