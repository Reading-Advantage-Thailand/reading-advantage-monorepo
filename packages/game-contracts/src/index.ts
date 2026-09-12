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

/** Public listening session and completion evidence contracts. */
export {
  MAX_ANSWER_AUDIO_EVIDENCE_PAIRS,
  MAX_LISTENING_SESSION_ITEMS,
  completionMetadataSchema,
  getReadToSelectAudioCompletionCounts,
  learningEvidenceSchema,
  listeningEvidenceSchema,
  listeningLocaleSchema,
  listeningSessionConfigSchema,
  preparedListeningVocabularyResponseSchema,
  preparedReadToSelectAudioVocabularyResponseSchema,
  preparedSpeechClipSchema,
  preparedSpeechSchema,
  readToSelectAudioEvidenceSchema,
  readToSelectAudioSessionConfigSchema,
} from "./listening.js";

/** Public RPG quest and cosmetic contracts. */
export {
  equipRpgCosmeticInputSchema,
  equipRpgCosmeticResultSchema,
  rpgCosmeticIdSchema,
  rpgCosmeticSchema,
  rpgCosmeticSlotSchema,
  rpgQuestIdSchema,
  rpgQuestStateSchema,
  studentRpgStateSchema,
} from "./rpg.js";
export type {
  EquipRpgCosmeticInput,
  EquipRpgCosmeticResult,
  RpgCosmetic,
  RpgCosmeticId,
  RpgQuestId,
  RpgQuestState,
  StudentRpgState,
} from "./rpg.js";

/** Public listening session and completion evidence types. */
export type {
  CompletionMetadata,
  LearningEvidence,
  ListeningEvidence,
  ListeningSessionConfig,
  PreparedListeningVocabularyResponse,
  PreparedReadToSelectAudioVocabularyResponse,
  PreparedSpeech,
  PreparedSpeechClip,
  ReadToSelectAudioEvidence,
  ReadToSelectAudioCompletionCounts,
  ReadToSelectAudioSessionConfig,
} from "./listening.js";

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

export * from "./challenges.js";
