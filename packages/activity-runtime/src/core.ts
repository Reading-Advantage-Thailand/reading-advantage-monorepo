import { z } from "zod";
import { createVerificationDigest, serverVerifiedResultSchema } from "./internal/verification.js";

/** Canonical schema version for interactive learning activities. */
export const ACTIVITY_SCHEMA_VERSION = "activity.v1" as const;

/** Stable machine-readable activity contract failure codes. */
export type ActivityContractErrorCode =
  | "UNSUPPORTED_VERSION"
  | "INVALID_LEGACY_ACTIVITY"
  | "RESOURCE_NOT_FOUND"
  | "SEGMENT_NOT_FOUND"
  | "ACTIVITY_MISMATCH"
  | "VERIFICATION_MISMATCH";

/** Error raised when an activity cannot be loaded or resolved deterministically. */
export class ActivityContractError extends Error {
  /** Stable failure category for adapters and authoring tools. */
  readonly code: ActivityContractErrorCode;

  /**
   * Creates an activity contract error.
   * @param code Stable machine-readable failure category.
   * @param message Actionable human-readable explanation.
   */
  constructor(code: ActivityContractErrorCode, message: string) {
    super(message);
    this.name = "ActivityContractError";
    this.code = code;
  }
}

/** Localized non-empty strings keyed by BCP-47-style locale identifiers. */
export const localizedTextSchema = z
  .record(z.string().trim().min(2), z.string().trim().min(1))
  .refine((value) => Object.keys(value).length > 0, "At least one localized value is required");

/** Trusted timestamp range authored as part of a video resource. */
export const videoSegmentSchema = z
  .object({
    segmentId: z.string().trim().min(1),
    label: localizedTextSchema,
    startSeconds: z.number().finite().nonnegative(),
    endSeconds: z.number().finite().positive(),
  })
  .strict();

/** Video resource resolved by a provider-owned identifier or hosted asset identifier. */
export const videoResourceSchema = z
  .object({
    kind: z.literal("video"),
    resourceId: z.string().trim().min(1),
    provider: z.enum(["youtube", "hosted"]),
    videoId: z.string().trim().min(1).optional(),
    assetId: z.string().trim().min(1).optional(),
    transcriptResourceId: z.string().trim().min(1).optional(),
    captionsAvailable: z.boolean(),
    hardGateApproval: z
      .object({
        approvalId: z.string().trim().min(1),
        approvedBy: z.string().trim().min(1),
        approvedAt: z.string().datetime({ offset: true }),
      })
      .strict()
      .optional(),
    segments: z.array(videoSegmentSchema),
  })
  .strict()
  .superRefine((resource, context) => {
    if (resource.provider === "youtube" && !resource.videoId) {
      context.addIssue({ code: "custom", path: ["videoId"], message: "YouTube resources require videoId" });
    }
    if (resource.provider === "hosted" && !resource.assetId) {
      context.addIssue({ code: "custom", path: ["assetId"], message: "Hosted resources require assetId" });
    }
  });

/** Transcript resource providing an accessible non-player representation. */
export const transcriptResourceSchema = z
  .object({
    kind: z.literal("transcript"),
    resourceId: z.string().trim().min(1),
    language: z.string().trim().min(2),
    text: z.string().trim().min(1),
  })
  .strict();

/** Diagram resource resolved through a trusted asset identifier. */
export const diagramResourceSchema = z
  .object({
    kind: z.literal("diagram"),
    resourceId: z.string().trim().min(1),
    alt: localizedTextSchema,
    caption: localizedTextSchema.optional(),
    assetId: z.string().trim().min(1),
  })
  .strict();

/** Lesson-section resource that can be selected by remediation policy. */
export const lessonSectionResourceSchema = z
  .object({
    kind: z.literal("lesson_section"),
    resourceId: z.string().trim().min(1),
    sectionId: z.string().trim().min(1),
    label: localizedTextSchema,
  })
  .strict();

/** Repository location whose path is trusted because it is activity-authored. */
export const repositoryLocationResourceSchema = z
  .object({
    kind: z.literal("repository_location"),
    resourceId: z.string().trim().min(1),
    repositoryId: z.string().trim().min(1),
    filePath: z
      .string()
      .trim()
      .min(1)
      .refine(
        (path) => !path.startsWith("/")
          && !path.startsWith("\\")
          && !path.split(/[\\/]/).includes("..")
          && !/^[A-Za-z]:[\\/]/.test(path),
        "Repository filePath must be relative and cannot traverse parent directories",
      ),
    symbol: z.string().trim().min(1).nullable(),
    label: localizedTextSchema,
  })
  .strict();

/** Every resource an activity can resolve without provider-specific client data. */
export const activityResourceSchema = z.union([
  videoResourceSchema,
  transcriptResourceSchema,
  diagramResourceSchema,
  lessonSectionResourceSchema,
  repositoryLocationResourceSchema,
]);

const videoSegmentRefSchema = z
  .object({ kind: z.literal("video_segment"), resourceId: z.string().trim().min(1), segmentId: z.string().trim().min(1) })
  .strict();
const diagramRefSchema = z
  .object({ kind: z.literal("diagram"), resourceId: z.string().trim().min(1) })
  .strict();
const lessonSectionRefSchema = z
  .object({ kind: z.literal("lesson_section"), resourceId: z.string().trim().min(1) })
  .strict();
const repositoryLocationRefSchema = z
  .object({ kind: z.literal("repository_location"), resourceId: z.string().trim().min(1) })
  .strict();

/** Curated reference returned by rules or models; authoritative details stay in resources. */
export const resourceRefSchema = z.discriminatedUnion("kind", [
  videoSegmentRefSchema,
  diagramRefSchema,
  lessonSectionRefSchema,
  repositoryLocationRefSchema,
]);

const optionSchema = z.object({ optionId: z.string().trim().min(1), label: localizedTextSchema }).strict();
const choiceQuestionSchema = z
  .object({
    kind: z.enum(["single_choice", "multiple_choice"]),
    prompt: localizedTextSchema,
    options: z.array(optionSchema).min(2),
    correctOptionIds: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();
const freeTextQuestionSchema = z
  .object({
    kind: z.literal("free_text"),
    prompt: localizedTextSchema,
    acceptedAnswers: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();

/** Formative question types supported by the activity contract. */
export const activityQuestionSchema = z.union([choiceQuestionSchema, freeTextQuestionSchema]);

/** Timestamp checkpoint whose trigger and remediation use stable resource identifiers. */
export const checkpointSchema = z
  .object({
    checkpointId: z.string().trim().min(1),
    stepId: z.string().trim().min(1),
    objectiveId: z.string().trim().min(1),
    variantKey: z.string().trim().min(1),
    trigger: z
      .object({ resourceId: z.string().trim().min(1), segmentId: z.string().trim().min(1) })
      .strict(),
    question: activityQuestionSchema,
    feedback: z.object({ correct: localizedTextSchema, incorrect: localizedTextSchema }).strict(),
    remediation: z.array(resourceRefSchema),
    evidence: z
      .object({ behavior: z.enum(["assessed", "engagement"]), weight: z.number().finite().min(0).max(1) })
      .strict(),
    gate: z.enum(["pause_non_blocking", "answer_before_continue"]),
  })
  .strict();

/** Deterministic tutorial check authored for a repository step. */
export const tutorialCheckSchema = z
  .object({
    checkId: z.string().trim().min(1),
    kind: z.enum(["git_status", "git_log", "file_contains", "test"]),
    expected: z.string().min(1),
  })
  .strict();

/** Guided repository step with intentionally fading support. */
export const tutorialStepSchema = z
  .object({
    stepId: z.string().trim().min(1),
    order: z.number().int().positive(),
    objectiveId: z.string().trim().min(1),
    variantKey: z.string().trim().min(1),
    instruction: localizedTextSchema,
    resourceRefs: z.array(resourceRefSchema),
    checks: z.array(tutorialCheckSchema).min(1),
    hints: z.array(z.object({ hintId: z.string().trim().min(1), text: localizedTextSchema }).strict()),
    reveals: z.array(z.object({ revealId: z.string().trim().min(1), text: localizedTextSchema }).strict()),
    scaffoldLevel: z.number().int().min(0).max(3),
  })
  .strict();

/** Canonical interactive activity schema. */
export const activitySchema = z
  .object({
    schemaVersion: z.literal(ACTIVITY_SCHEMA_VERSION),
    activityId: z.string().trim().min(1),
    activityVersion: z.string().trim().min(1),
    graphVersion: z.string().trim().min(1),
    objectiveId: z.string().trim().min(1),
    variantKey: z.string().trim().min(1),
    mode: z.enum(["worked_example", "guided_practice", "independent_practice", "assessment", "teaching"]),
    title: localizedTextSchema,
    accessibility: z
      .object({
        transcriptRequired: z.boolean(),
        captionsRequired: z.boolean(),
        nonVideoAlternativeResourceId: z.string().trim().min(1).optional(),
      })
      .strict(),
    resources: z.array(activityResourceSchema),
    checkpoints: z.array(checkpointSchema),
    tutorialSteps: z.array(tutorialStepSchema),
  })
  .strict();

/** Canonical activity contract inferred from the Zod schema. */
export type Activity = z.infer<typeof activitySchema>;

const legacyActivitySchema = z
  .object({
    schemaVersion: z.literal("activity.v0"),
    id: z.string().trim().min(1),
    version: z.string().trim().min(1),
    graphVersion: z.string().trim().min(1),
    objectiveId: z.string().trim().min(1),
    variantKey: z.string().trim().min(1),
    mode: activitySchema.shape.mode,
    title: z.string().trim().min(1),
    resources: z.array(activityResourceSchema),
    checkpoints: z.array(checkpointSchema),
    tutorialSteps: z.array(tutorialStepSchema),
  })
  .strict();

/**
 * Loads the canonical contract or migrates the bounded activity.v0 shape.
 * @param input Untrusted authored activity data.
 * @returns A validated activity.v1 contract.
 * @throws ActivityContractError when the version is unsupported or migration input is invalid.
 */
export function loadActivity(input: unknown): Activity {
  const version = typeof input === "object" && input !== null && "schemaVersion" in input
    ? (input as { schemaVersion?: unknown }).schemaVersion
    : undefined;
  if (version === ACTIVITY_SCHEMA_VERSION) return activitySchema.parse(input);
  if (version === "activity.v0") {
    const parsed = legacyActivitySchema.safeParse(input);
    if (!parsed.success) {
      throw new ActivityContractError("INVALID_LEGACY_ACTIVITY", `Invalid activity.v0 contract: ${parsed.error.issues[0]?.message ?? "unknown error"}`);
    }
    return activitySchema.parse({
      schemaVersion: ACTIVITY_SCHEMA_VERSION,
      activityId: parsed.data.id,
      activityVersion: parsed.data.version,
      graphVersion: parsed.data.graphVersion,
      objectiveId: parsed.data.objectiveId,
      variantKey: parsed.data.variantKey,
      mode: parsed.data.mode,
      title: { en: parsed.data.title },
      accessibility: { transcriptRequired: false, captionsRequired: false },
      resources: parsed.data.resources,
      checkpoints: parsed.data.checkpoints,
      tutorialSteps: parsed.data.tutorialSteps,
    });
  }
  throw new ActivityContractError("UNSUPPORTED_VERSION", `Unsupported activity schema version: ${String(version)}`);
}

/** Trusted segment resolution result consumed by media adapters. */
export type ResolvedVideoSegment = {
  resourceId: string;
  segmentId: string;
  startSeconds: number;
  endSeconds: number;
  label: z.infer<typeof localizedTextSchema>;
};

/**
 * Resolves trusted timestamps from activity-authored resource and segment IDs.
 * @param activity Validated activity contract.
 * @param resourceId Stable video resource identifier.
 * @param segmentId Stable segment identifier within the video.
 * @returns The trusted playback range and label.
 * @throws ActivityContractError when the resource or segment does not exist.
 */
export function resolveVideoSegment(activity: Activity, resourceId: string, segmentId: string): ResolvedVideoSegment {
  const resource = activity.resources.find((candidate) => candidate.resourceId === resourceId);
  if (!resource || resource.kind !== "video") {
    throw new ActivityContractError("RESOURCE_NOT_FOUND", `Video resource not found: ${resourceId}`);
  }
  const segment = resource.segments.find((candidate) => candidate.segmentId === segmentId);
  if (!segment) throw new ActivityContractError("SEGMENT_NOT_FOUND", `Video segment not found: ${resourceId}/${segmentId}`);
  return { resourceId, ...segment };
}

const eventBase = { eventId: z.string().trim().min(1), occurredAt: z.string().datetime({ offset: true }) };

/** Canonical bounded client event schema for activity state transitions. */
/** Canonical version for activity evidence metadata and events. */
export const ACTIVITY_EVIDENCE_SCHEMA_VERSION = "activity-evidence.v1" as const;

const timingMetadataSchema = z
  .object({ wallClockMs: z.number().finite().nonnegative(), activeMs: z.number().finite().nonnegative() })
  .strict()
  .refine((timing) => timing.activeMs <= timing.wallClockMs, "activeMs cannot exceed wallClockMs");

const activityEngagementMetadataShape = {
  schemaVersion: z.literal(ACTIVITY_EVIDENCE_SCHEMA_VERSION).default(ACTIVITY_EVIDENCE_SCHEMA_VERSION),
  activityId: z.string().trim().min(1),
  activityVersion: z.string().trim().min(1),
  graphVersion: z.string().trim().min(1),
  objectiveId: z.string().trim().min(1),
  variantKey: z.string().trim().min(1),
};

const activityEvidenceMetadataShape = {
  ...activityEngagementMetadataShape,
  stepId: z.string().trim().min(1),
  submissionId: z.string().trim().min(1),
  attemptNumber: z.number().int().positive(),
  hintsUsed: z.number().int().nonnegative(),
  revealsUsed: z.number().int().nonnegative(),
  scaffoldLevel: z.number().int().min(0).max(3).default(0),
  interventionLevel: z.number().int().min(0).max(3),
  evidenceConfidence: z.number().finite().min(0).max(1),
  timing: timingMetadataSchema,
};

/** Strict context for engagement events that never implies an assessed attempt. */
export const activityEngagementMetadataSchema = z.object(activityEngagementMetadataShape).strict();

/** Engagement metadata inferred from the context-only schema. */
export type ActivityEngagementMetadata = z.infer<typeof activityEngagementMetadataSchema>;

/** Strict metadata shared by assessed activity evidence and contextual events. */
export const activityEvidenceMetadataSchema = z.object(activityEvidenceMetadataShape).strict();

/** Complete evidence metadata inferred from the strict schema. */
export type ActivityEvidenceMetadata = z.infer<typeof activityEvidenceMetadataSchema>;

/**
 * Normalizes learner answers for deterministic server comparison.
 * @param value Raw learner or authored answer value.
 * @returns A stable lowercase representation with arrays sorted.
 */
export function normalizeActivityAnswer(value: unknown): string {
  if (Array.isArray(value)) return value.map(normalizeActivityAnswer).sort().join("|");
  if (typeof value === "string") return value.trim().toLowerCase();
  if (typeof value === "number" || typeof value === "boolean") return String(value).toLowerCase();
  if (value == null) return "";
  return JSON.stringify(value);
}

const persistedEventBase = {
  eventId: z.string().trim().min(1),
  occurredAt: z.string().datetime({ offset: true }),
};
const emptyEventPayloadSchema = z.object({}).strict();

const activityEvidenceEventUnionSchema = z.union([
  z.object({ ...activityEngagementMetadataShape, ...persistedEventBase, kind: z.literal("playback_started"), payload: z.object({ positionSeconds: z.number().nonnegative() }).strict() }).strict(),
  z.object({ ...activityEngagementMetadataShape, ...persistedEventBase, kind: z.literal("playback_paused"), payload: z.object({ positionSeconds: z.number().nonnegative() }).strict() }).strict(),
  z.object({ ...activityEngagementMetadataShape, ...persistedEventBase, kind: z.literal("playback_seeked"), payload: z.object({ fromSeconds: z.number().nonnegative(), toSeconds: z.number().nonnegative() }).strict() }).strict(),
  z.object({ ...activityEngagementMetadataShape, ...persistedEventBase, kind: z.literal("watched_range"), payload: z.object({ startSeconds: z.number().nonnegative(), endSeconds: z.number().nonnegative() }).strict().refine((range) => range.endSeconds > range.startSeconds) }).strict(),
  z.object({ ...activityEngagementMetadataShape, ...persistedEventBase, kind: z.literal("resource_opened"), payload: z.object({ resourceId: z.string().trim().min(1) }).strict() }).strict(),
  z.object({ ...activityEngagementMetadataShape, ...persistedEventBase, kind: z.literal("activity_completed"), payload: emptyEventPayloadSchema }).strict(),
  z.object({ ...activityEvidenceMetadataShape, ...persistedEventBase, kind: z.literal("checkpoint_answered"), payload: z.object({ checkpointId: z.string().trim().min(1), answer: z.unknown(), verifiedResult: serverVerifiedResultSchema }).strict() }).strict(),
  z.object({ ...activityEvidenceMetadataShape, ...persistedEventBase, kind: z.literal("tutorial_step_completed"), payload: z.object({ stepId: z.string().trim().min(1), checkResults: z.array(z.object({ checkId: z.string().trim().min(1), passed: z.boolean() }).strict()), verifiedResult: serverVerifiedResultSchema }).strict() }).strict(),
  z.object({ ...activityEvidenceMetadataShape, ...persistedEventBase, kind: z.literal("hint_used"), payload: z.object({ hintId: z.string().trim().min(1) }).strict() }).strict(),
  z.object({ ...activityEvidenceMetadataShape, ...persistedEventBase, kind: z.literal("reveal_used"), payload: z.object({ revealId: z.string().trim().min(1) }).strict() }).strict(),
  z.object({ ...activityEvidenceMetadataShape, ...persistedEventBase, kind: z.literal("intervention_used"), payload: z.object({ level: z.number().int().min(1).max(3) }).strict() }).strict(),
]);

/** Strict persistence-ready event with kind-discriminated payloads and metadata. */
export const activityEvidenceEventSchema = activityEvidenceEventUnionSchema.superRefine((event, context) => {
  if (event.kind === "checkpoint_answered") {
    const verification = event.payload.verifiedResult;
    const digest = createVerificationDigest(event.activityId, event.payload.checkpointId, event.payload.answer);
    if (verification.activityId !== event.activityId || verification.subjectId !== event.payload.checkpointId || verification.inputDigest !== digest) {
      context.addIssue({ code: "custom", path: ["payload", "verifiedResult"], message: "Checkpoint verification binding does not match event metadata" });
    }
  }
  if (event.kind === "tutorial_step_completed") {
    const verification = event.payload.verifiedResult;
    const digest = createVerificationDigest(event.activityId, event.payload.stepId, event.payload.checkResults);
    if (verification.activityId !== event.activityId || verification.subjectId !== event.payload.stepId || verification.inputDigest !== digest) {
      context.addIssue({ code: "custom", path: ["payload", "verifiedResult"], message: "Tutorial verification binding does not match event metadata" });
    }
  }
});

/** Server-generated persistence event inferred from its discriminated schema. */
export type ActivityEvidenceEvent = z.infer<typeof activityEvidenceEventSchema>;

const stateEventMetadata = {
  ...activityEvidenceMetadataShape,
  ...eventBase,
};

const activityEventUnionSchema = z.union([
  z.object({ ...stateEventMetadata, kind: z.literal("playback_started"), positionSeconds: z.number().nonnegative() }).strict(),
  z.object({ ...stateEventMetadata, kind: z.literal("playback_paused"), positionSeconds: z.number().nonnegative() }).strict(),
  z.object({ ...stateEventMetadata, kind: z.literal("playback_seeked"), positionSeconds: z.number().nonnegative() }).strict(),
  z.object({ ...stateEventMetadata, kind: z.literal("watched_range"), startSeconds: z.number().nonnegative(), endSeconds: z.number().nonnegative() }).strict()
    .refine((event) => event.endSeconds > event.startSeconds, "endSeconds must be greater than startSeconds"),
  z.object({ ...stateEventMetadata, kind: z.literal("checkpoint_answered"), checkpointId: z.string().min(1), answer: z.unknown() }).strict(),
  z.object({ ...stateEventMetadata, kind: z.literal("resource_opened"), resourceId: z.string().min(1) }).strict(),
  z.object({ ...stateEventMetadata, kind: z.literal("hint_used"), stepId: z.string().min(1), hintId: z.string().min(1) }).strict(),
  z.object({ ...stateEventMetadata, kind: z.literal("reveal_used"), stepId: z.string().min(1), revealId: z.string().min(1) }).strict(),
  z.object({ ...stateEventMetadata, kind: z.literal("intervention_used"), level: z.number().int().min(1).max(3) }).strict(),
  z.object({ ...stateEventMetadata, kind: z.literal("tutorial_step_completed"), stepId: z.string().min(1) }).strict(),
  z.object({ ...stateEventMetadata, kind: z.literal("activity_completed") }).strict(),
]);

/** Canonical bounded client event schema for activity state transitions. */
export const activityEventSchema = activityEventUnionSchema;

/** Activity event inferred from the canonical event schema. */
export type ActivityEvent = z.infer<typeof activityEventSchema>;

/** Input accepted by the event reducer before schema defaults are applied. */
export type ActivityEventInput = z.input<typeof activityEventSchema>;

/** Framework-neutral deterministic activity state. */
export type ActivityState = {
  activityId: string;
  playback: "idle" | "playing" | "paused";
  positionSeconds: number;
  watchedRanges: Array<{ startSeconds: number; endSeconds: number }>;
  checkpointAttempts: Record<string, { attemptNumber: number; answer: unknown }>;
  assessedCheckpointResults: Record<string, { attemptNumber: number; isCorrect: boolean; score: number }>;
  assessedTutorialResults: Record<string, { attemptNumber: number; isCorrect: boolean; score: number }>;
  completedStepIds: string[];
  openedResourceIds: string[];
  support: { hintsUsed: number; revealsUsed: number; interventionLevel: number };
  completed: boolean;
  processedEventIds: string[];
  processedAssessedEventIds: string[];
};

/**
 * Creates the empty state for a new or resumed activity projection.
 * @param activityId Stable activity identifier.
 * @returns Deterministic initial state.
 */
export function createInitialActivityState(activityId: string): ActivityState {
  return {
    activityId,
    playback: "idle",
    positionSeconds: 0,
    watchedRanges: [],
    checkpointAttempts: {},
    assessedCheckpointResults: {},
    assessedTutorialResults: {},
    completedStepIds: [],
    openedResourceIds: [],
    support: { hintsUsed: 0, revealsUsed: 0, interventionLevel: 0 },
    completed: false,
    processedEventIds: [],
    processedAssessedEventIds: [],
  };
}

/**
 * Replays one server-generated assessed event after JSON persistence.
 * @param state Current activity projection state.
 * @param input Serialized or typed assessed persistence event.
 * @returns State with server-assessed correctness projected idempotently.
 * @throws ActivityContractError for engagement events or activity mismatches.
 */
export function reduceAssessedActivityEvent(state: ActivityState, input: unknown): ActivityState {
  const event = activityEvidenceEventSchema.parse(input);
  if (event.activityId !== state.activityId) {
    throw new ActivityContractError(
      "ACTIVITY_MISMATCH",
      `Assessed event activity ${event.activityId} does not match state activity ${state.activityId}`,
    );
  }
  if (event.kind !== "checkpoint_answered" && event.kind !== "tutorial_step_completed") {
    throw new ActivityContractError("VERIFICATION_MISMATCH", `Event is not an assessed result: ${event.kind}`);
  }
  if (state.processedAssessedEventIds.includes(event.eventId)) return state;
  const next: ActivityState = {
    ...state,
    assessedCheckpointResults: { ...state.assessedCheckpointResults },
    assessedTutorialResults: { ...state.assessedTutorialResults },
    processedAssessedEventIds: [...state.processedAssessedEventIds, event.eventId],
  };
  if (event.kind === "checkpoint_answered") {
    next.assessedCheckpointResults[event.payload.checkpointId] = {
      attemptNumber: event.attemptNumber,
      isCorrect: event.payload.verifiedResult.isCorrect,
      score: event.payload.verifiedResult.score ?? (event.payload.verifiedResult.isCorrect ? 1 : 0),
    };
  } else {
    next.assessedTutorialResults[event.payload.stepId] = {
      attemptNumber: event.attemptNumber,
      isCorrect: event.payload.verifiedResult.isCorrect,
      score: event.payload.verifiedResult.score ?? (event.payload.verifiedResult.isCorrect ? 1 : 0),
    };
  }
  return next;
}

function mergeWatchedRanges(ranges: ActivityState["watchedRanges"]): ActivityState["watchedRanges"] {
  const sorted = [...ranges].sort((left, right) => left.startSeconds - right.startSeconds);
  return sorted.reduce<ActivityState["watchedRanges"]>((merged, range) => {
    const previous = merged.at(-1);
    if (previous && range.startSeconds <= previous.endSeconds) {
      previous.endSeconds = Math.max(previous.endSeconds, range.endSeconds);
    } else {
      merged.push({ ...range });
    }
    return merged;
  }, []);
}

/**
 * Applies one validated activity event idempotently.
 * @param state Current projection state.
 * @param input Untrusted or typed event input.
 * @returns The next deterministic state, or the same state for a duplicate event.
 */
export function reduceActivityEvent(state: ActivityState, input: ActivityEventInput): ActivityState {
  const event = activityEventSchema.parse(input);
  if (event.activityId !== state.activityId) {
    throw new ActivityContractError(
      "ACTIVITY_MISMATCH",
      `Event activity ${event.activityId} does not match state activity ${state.activityId}`,
    );
  }
  if (state.processedEventIds.includes(event.eventId)) return state;
  const next: ActivityState = {
    ...state,
    checkpointAttempts: { ...state.checkpointAttempts },
    completedStepIds: [...state.completedStepIds],
    openedResourceIds: [...state.openedResourceIds],
    watchedRanges: state.watchedRanges.map((range) => ({ ...range })),
    support: { ...state.support },
    processedEventIds: [...state.processedEventIds, event.eventId],
  };
  switch (event.kind) {
    case "playback_started": next.playback = "playing"; next.positionSeconds = event.positionSeconds; break;
    case "playback_paused":
    case "playback_seeked": next.playback = "paused"; next.positionSeconds = event.positionSeconds; break;
    case "watched_range": next.watchedRanges = mergeWatchedRanges([...next.watchedRanges, { startSeconds: event.startSeconds, endSeconds: event.endSeconds }]); next.positionSeconds = Math.max(next.positionSeconds, event.endSeconds); break;
    case "checkpoint_answered": {
      const previous = next.checkpointAttempts[event.checkpointId];
      next.checkpointAttempts[event.checkpointId] = { attemptNumber: (previous?.attemptNumber ?? 0) + 1, answer: event.answer };
      next.playback = "paused";
      break;
    }
    case "resource_opened": if (!next.openedResourceIds.includes(event.resourceId)) next.openedResourceIds.push(event.resourceId); break;
    case "hint_used": next.support.hintsUsed += 1; break;
    case "reveal_used": next.support.revealsUsed += 1; break;
    case "intervention_used": next.support.interventionLevel = Math.max(next.support.interventionLevel, event.level); break;
    case "tutorial_step_completed": if (!next.completedStepIds.includes(event.stepId)) next.completedStepIds.push(event.stepId); break;
    case "activity_completed": next.completed = true; next.playback = "paused"; break;
  }
  return next;
}

const activityPracticePartSchema = z
  .object({
    partId: z.string().trim().min(1),
    rawAnswer: z.unknown(),
    normalizedAnswer: z.string().optional(),
    isCorrect: z.boolean().optional(),
    score: z.number().optional(),
    maxScore: z.number().optional(),
    misconceptionTags: z.array(z.string()).optional(),
    hintsUsed: z.number().int().nonnegative().optional(),
    revealStepsSeen: z.number().int().nonnegative().optional(),
    totalRevealSteps: z.number().int().nonnegative().optional(),
    misconceptionSeverityByTag: z.record(z.enum(["minor", "severe"])).optional(),
    changedCount: z.number().int().nonnegative().optional(),
    firstInteractionAt: z.string().min(1).optional(),
    answeredAt: z.string().min(1).optional(),
    wallClockMs: z.number().nonnegative().optional(),
    activeMs: z.number().nonnegative().optional(),
  })
  .strict();

const activityPracticeTimingSchema = z
  .object({
    startedAt: z.string().min(1),
    submittedAt: z.string().min(1),
    wallClockMs: z.number().nonnegative(),
    activeMs: z.number().nonnegative(),
    idleMs: z.number().nonnegative(),
    pauseCount: z.number().int().nonnegative(),
    focusLossCount: z.number().int().nonnegative(),
    visibilityHiddenCount: z.number().int().nonnegative(),
    longestIdleMs: z.number().nonnegative().optional(),
    confidence: z.enum(["high", "medium", "low"]),
    confidenceReasons: z.array(z.string()).optional(),
  })
  .strict()
  .refine((timing) => timing.activeMs <= timing.wallClockMs, "activeMs cannot exceed wallClockMs");

/** Strict practice.v1 envelope with required activity evidence metadata. */
export const activityPracticeSubmissionEnvelopeSchema = z
  .object({
    contractVersion: z.literal("practice.v1"),
    activityId: z.string().trim().min(1),
    mode: z.enum(["worked_example", "guided_practice", "independent_practice", "assessment", "teaching"]),
    status: z.enum(["draft", "submitted", "graded", "returned"]),
    attemptNumber: z.number().int().positive(),
    submittedAt: z.string().min(1),
    answers: z.record(z.unknown()),
    parts: z.array(activityPracticePartSchema),
    artifact: z.record(z.unknown()).optional(),
    interactionHistory: z.array(z.unknown()).optional(),
    analytics: activityEvidenceMetadataSchema,
    studentFeedback: z.string().optional(),
    teacherSummary: z.string().optional(),
    timing: activityPracticeTimingSchema.optional(),
  })
  .strict();

/** Practice.v1 submission whose analytics are guaranteed to be activity evidence. */
export type ActivityPracticeSubmissionEnvelope = z.infer<typeof activityPracticeSubmissionEnvelopeSchema>;

/** Context-only engagement projection that deliberately has no correctness fields. */
export type ActivityEngagementContext = {
  kind: "activity_engagement.v1";
  activityId: string;
  objectiveId: string;
  variantKey: string;
  watchedRanges: Array<{ startSeconds: number; endSeconds: number }>;
  openedResourceIds: string[];
};

/**
 * Marks playback and resource use as contextual engagement rather than mastery.
 * @param input Activity identifiers and normalized engagement context.
 * @returns A context-only projection without correctness or score.
 */
export function mapEngagementContext(input: Omit<ActivityEngagementContext, "kind">): ActivityEngagementContext {
  return { kind: "activity_engagement.v1", ...input };
}
