/** T10-accepted capability registry and successor-hash binding. */
export {
  ACCEPTED_CAPABILITY_IDS,
  ACCEPTED_CAPABILITY_REGISTRY,
  ACCEPTED_T10_INPUTS,
  BLOCKED_SCOPES,
  buildAcceptedCapabilityManifest,
} from "./capability-manifest.js";
export type {
  AcceptedCapability,
  AcceptedCapabilityManifest,
  AcceptedT10Inputs,
  BlockedScopes,
} from "./capability-manifest.js";

/** `capability:bounded-frame-delta` shared core. */
export {
  BOUNDED_FRAME_DELTA_CEILING_MS,
  clampFrameDelta,
  createBoundedFrameScheduler,
} from "./bounded-frame-loop.js";
export type {
  BoundedFrameScheduler,
  BoundedFrameTick,
} from "./bounded-frame-loop.js";

/** `capability:input-action-normalization` shared core. */
export {
  createInputActionNormalizer,
  INPUT_ACTION_IDS,
} from "./input-actions.js";
export type {
  InputAction,
  InputActionEdge,
  InputActionId,
  InputActionNormalizerConfig,
  KeyboardActionMap,
  PhysicalInputDescriptor,
  PointerDragMap,
  PointerTapMap,
} from "./input-actions.js";

/** `capability:language-target-progression` shared core. */
export {
  createLanguageTargetProgression,
} from "./language-target-progression.js";
export type {
  LanguageTargetProgression,
  MatchResult,
  ProgressionSnapshot,
  TargetIdentityOptions,
} from "./language-target-progression.js";

/** `capability:nonempty-content-precondition` shared core. */
export {
  assertNonEmptyContent,
  isBlank,
  validateNonEmptyContent,
} from "./nonempty-content.js";
export type {
  NonEmptyContent,
  NonEmptyContentItem,
} from "./nonempty-content.js";

/** `capability:result-accounting` shared core. */
export {
  accumulateResult,
  calculateXp,
  createResultAccountant,
  finalizeResult,
  RESULT_ACCOUNTING_ZERO_ATTEMPTS_XP,
} from "./result-accounting.js";
export type {
  AccountedResult,
  ResultAccountant,
  ResultAccountingPolicy,
  ResultCounters,
} from "./result-accounting.js";

/** `capability:single-completion-emission` shared core. */
export {
  createCompletionLatch,
} from "./single-completion.js";
export type {
  CompletionDelivery,
  CompletionLatch,
} from "./single-completion.js";

/** `capability:time-and-frame-loop` shared core. */
export {
  createCountdownTimer,
  createStopwatchTimer,
} from "./time-threshold.js";
export type {
  TimeThresholdTick,
  TimeThresholdTimer,
} from "./time-threshold.js";

/** Deterministic reusable movement, collision, pooling, spawning, and projectile primitives. */
export {
  advanceBody,
  createDeterministicSpawner,
  createObjectPool,
  intersects,
  stepProjectile,
} from "./gameplay-primitives.js";
export type {
  DeterministicSpawner,
  DeterministicSpawnerConfig,
  GameplayBounds,
  GameplayVector,
  KinematicBody,
  ObjectPool,
  ObjectPoolConfig,
  ProjectileState,
  ProjectileStep,
} from "./gameplay-primitives.js";
