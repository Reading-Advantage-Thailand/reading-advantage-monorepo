/** Public deterministic test helpers. */
export {
  createDeterministicRandom,
  createMockGameFactory,
  createMockHost,
} from "./test-kit.js";

/** Public test-helper types. */
export type { MockGameFactory, MockHostAdapter } from "./test-kit.js";

/** Deterministic clock, RNG, and input-sequence fixtures for the seven accepted capabilities. */
export {
  createDeterministicClock,
  createDeterministicInputSequence,
  createDeterministicRandom as createDeterministicRandomFixture,
  RESPONSIVE_VIEWPORT_FIXTURES,
  WORST_CASE_TEXT_FIXTURES,
} from "./deterministic-fixtures.js";
export type {
  DeterministicClock,
  DeterministicInputDescriptor,
  DeterministicInputSequence,
  ResponsiveViewportFixture,
} from "./deterministic-fixtures.js";

/** Shared deterministic guided tutorial QC fixture factory. */
export { createGameTutorialQcFixture } from "./game-tutorial-qc-fixtures.js";

/** Shared guided tutorial QC fixture contracts. */
export type {
  GameTutorialQcClock,
  GameTutorialQcFixture,
  GameTutorialQcInputMode,
  GameTutorialQcInputSequence,
  GameTutorialQcResources,
} from "./game-tutorial-qc-fixtures.js";

/** Lifecycle, leak, exactly-once, canonical-pack, selected-union, and attribution assertion helpers. */
export {
  assertAttributionRegistered,
  assertExactlyOnceCompletion,
  assertNoDirectAssetPaths,
  assertSelectedUnionOnly,
} from "./assertions.js";
export type {
  AttributionSnapshot,
  CompletionLatchSnapshot,
} from "./assertions.js";

/** Public test-only canonical ingestion receipt fixture factory. */
export {
  createCanonicalIngestionReceiptFixture,
} from "../assets/standard-pack-suitability-ingestion-negative-fixtures.test-support.js";

/** Public test-only legacy ingestion-required suitability fixture. */
export {
  LEGACY_INGESTION_REQUIRED_FIXTURE,
} from "../assets/standard-pack-suitability-test-fixtures.test-support.js";
