import { z } from "zod";
import { activitySchema, loadActivity, resourceRefSchema, type Activity } from "./core.js";

/** Stable issue codes emitted by the authoring validator. */
export type ActivityAuthoringIssueCode =
  | "SCHEMA_INVALID"
  | "DUPLICATE_ID"
  | "DANGLING_RESOURCE"
  | "DANGLING_SEGMENT"
  | "RESOURCE_KIND_MISMATCH"
  | "INVALID_TIME_RANGE"
  | "YOUTUBE_HARD_GATE"
  | "HOSTED_HARD_GATE_UNAPPROVED"
  | "ACCESSIBILITY_REQUIREMENT"
  | "INVALID_QUESTION";

/** One actionable activity authoring problem. */
export type ActivityAuthoringIssue = {
  code: ActivityAuthoringIssueCode;
  path: string;
  message: string;
};

/** Result returned by activity authoring validation. */
export type ActivityValidationResult =
  | { ok: true; activity: Activity; issues: [] }
  | { ok: false; issues: ActivityAuthoringIssue[] };

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  return [...new Set(values.filter((value) => seen.size === seen.add(value).size))];
}

function issue(code: ActivityAuthoringIssueCode, path: string, message: string): ActivityAuthoringIssue {
  return { code, path, message };
}

/**
 * Validates referential integrity, time ranges, provider policy, and ID uniqueness.
 * @param input Untrusted or migrated activity content.
 * @returns Canonical activity data or a complete issue list.
 */
export function validateActivity(input: unknown): ActivityValidationResult {
  let activity: Activity;
  try {
    activity = loadActivity(input);
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues.map((entry) => entry.message).join("; ")
      : error instanceof Error ? error.message : "Unknown activity schema error";
    return { ok: false, issues: [issue("SCHEMA_INVALID", "activity", message)] };
  }

  const issues: ActivityAuthoringIssue[] = [];
  const resources = new Map(activity.resources.map((resource) => [resource.resourceId, resource]));
  for (const value of duplicates(activity.resources.map((resource) => resource.resourceId))) {
    issues.push(issue("DUPLICATE_ID", "resources", `Duplicate resourceId: ${value}`));
  }
  const stepIds = [...activity.checkpoints.map((checkpoint) => checkpoint.stepId), ...activity.tutorialSteps.map((step) => step.stepId)];
  for (const value of duplicates(stepIds)) issues.push(issue("DUPLICATE_ID", "steps", `Duplicate stepId: ${value}`));
  for (const value of duplicates(activity.checkpoints.map((checkpoint) => checkpoint.checkpointId))) {
    issues.push(issue("DUPLICATE_ID", "checkpoints", `Duplicate checkpointId: ${value}`));
  }

  for (const resource of activity.resources) {
    if (resource.kind !== "video") continue;
    for (const segmentId of duplicates(resource.segments.map((segment) => segment.segmentId))) {
      issues.push(issue("DUPLICATE_ID", `resources.${resource.resourceId}.segments`, `Duplicate segmentId: ${segmentId}`));
    }
    resource.segments.forEach((segment, index) => {
      if (segment.endSeconds <= segment.startSeconds) {
        issues.push(issue("INVALID_TIME_RANGE", `resources.${resource.resourceId}.segments.${index}`, "Segment endSeconds must be greater than startSeconds"));
      }
    });
    if (resource.transcriptResourceId) {
      const transcript = resources.get(resource.transcriptResourceId);
      if (!transcript) {
        issues.push(issue("DANGLING_RESOURCE", `resources.${resource.resourceId}.transcriptResourceId`, `Unknown transcript resource: ${resource.transcriptResourceId}`));
      } else if (transcript.kind !== "transcript") {
        issues.push(issue("RESOURCE_KIND_MISMATCH", `resources.${resource.resourceId}.transcriptResourceId`, `Resource ${resource.transcriptResourceId} is not a transcript`));
      }
    } else if (activity.accessibility.transcriptRequired) {
      issues.push(issue("ACCESSIBILITY_REQUIREMENT", `resources.${resource.resourceId}.transcriptResourceId`, "A transcript is required for every video"));
    }
    if (activity.accessibility.captionsRequired && !resource.captionsAvailable) {
      issues.push(issue("ACCESSIBILITY_REQUIREMENT", `resources.${resource.resourceId}.captionsAvailable`, "Captions are required for every video"));
    }
  }

  const validateRef = (ref: z.infer<typeof resourceRefSchema>, path: string): void => {
    const resource = resources.get(ref.resourceId);
    if (!resource) {
      issues.push(issue("DANGLING_RESOURCE", path, `Unknown resource: ${ref.resourceId}`));
      return;
    }
    if (ref.kind === "video_segment") {
      if (resource.kind !== "video" || !resource.segments.some((segment) => segment.segmentId === ref.segmentId)) {
        issues.push(issue("DANGLING_SEGMENT", path, `Unknown video segment: ${ref.resourceId}/${ref.segmentId}`));
      }
      return;
    }
    if (resource.kind !== ref.kind) {
      issues.push(issue("RESOURCE_KIND_MISMATCH", path, `Resource ${ref.resourceId} is ${resource.kind}, not ${ref.kind}`));
    }
  };

  if (activity.accessibility.nonVideoAlternativeResourceId) {
    const alternative = resources.get(activity.accessibility.nonVideoAlternativeResourceId);
    if (!alternative) {
      issues.push(issue("DANGLING_RESOURCE", "accessibility.nonVideoAlternativeResourceId", `Unknown accessibility resource: ${activity.accessibility.nonVideoAlternativeResourceId}`));
    } else if (!(["diagram", "transcript", "lesson_section"] as const).includes(alternative.kind as "diagram" | "transcript" | "lesson_section")) {
      issues.push(issue("RESOURCE_KIND_MISMATCH", "accessibility.nonVideoAlternativeResourceId", `Resource ${alternative.resourceId} is not a non-video learning alternative`));
    }
  }

  activity.checkpoints.forEach((checkpoint, checkpointIndex) => {
    const video = resources.get(checkpoint.trigger.resourceId);
    if (!video) {
      issues.push(issue("DANGLING_RESOURCE", `checkpoints.${checkpointIndex}.trigger`, `Unknown trigger resource: ${checkpoint.trigger.resourceId}`));
    } else if (video.kind !== "video" || !video.segments.some((segment) => segment.segmentId === checkpoint.trigger.segmentId)) {
      issues.push(issue("DANGLING_SEGMENT", `checkpoints.${checkpointIndex}.trigger`, `Unknown trigger segment: ${checkpoint.trigger.segmentId}`));
    }
    if (video?.kind === "video" && video.provider === "youtube" && checkpoint.gate === "answer_before_continue") {
      issues.push(issue("YOUTUBE_HARD_GATE", `checkpoints.${checkpointIndex}.gate`, "YouTube checkpoints must remain non-blocking"));
    }
    if (video?.kind === "video" && video.provider === "hosted" && checkpoint.gate === "answer_before_continue" && !video.hardGateApproval) {
      issues.push(issue("HOSTED_HARD_GATE_UNAPPROVED", `checkpoints.${checkpointIndex}.gate`, "Hosted hard gates require explicit approval metadata"));
    }
    checkpoint.remediation.forEach((ref, refIndex) => validateRef(ref, `checkpoints.${checkpointIndex}.remediation.${refIndex}`));
    if (checkpoint.question.kind !== "free_text") {
      for (const optionId of duplicates(checkpoint.question.options.map((option) => option.optionId))) {
        issues.push(issue("DUPLICATE_ID", `checkpoints.${checkpointIndex}.question.options`, `Duplicate optionId: ${optionId}`));
      }
      const optionIds = new Set(checkpoint.question.options.map((option) => option.optionId));
      if (checkpoint.question.correctOptionIds.some((optionId) => !optionIds.has(optionId))) {
        issues.push(issue("INVALID_QUESTION", `checkpoints.${checkpointIndex}.question`, "Correct answer references an unknown option"));
      }
    }
  });
  activity.tutorialSteps.forEach((step, stepIndex) => {
    step.resourceRefs.forEach((ref, refIndex) => validateRef(ref, `tutorialSteps.${stepIndex}.resourceRefs.${refIndex}`));
    for (const checkId of duplicates(step.checks.map((check) => check.checkId))) {
      issues.push(issue("DUPLICATE_ID", `tutorialSteps.${stepIndex}.checks`, `Duplicate checkId: ${checkId}`));
    }
    for (const hintId of duplicates(step.hints.map((hint) => hint.hintId))) {
      issues.push(issue("DUPLICATE_ID", `tutorialSteps.${stepIndex}.hints`, `Duplicate hintId: ${hintId}`));
    }
    for (const revealId of duplicates(step.reveals.map((reveal) => reveal.revealId))) {
      issues.push(issue("DUPLICATE_ID", `tutorialSteps.${stepIndex}.reveals`, `Duplicate revealId: ${revealId}`));
    }
  });

  return issues.length === 0
    ? { ok: true, activity: activitySchema.parse(activity), issues: [] }
    : { ok: false, issues };
}
