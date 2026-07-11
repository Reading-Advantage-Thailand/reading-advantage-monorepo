import type { Activity } from "@reading-advantage/activity-runtime/core";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { mergeWatchedRanges, resolveCheckpointPolicy, sampleCueCrossings, type MediaController, type MediaSnapshot } from "./controllers.js";

/** Server assessment response used for immediate formative feedback. */
export type PlayerAssessment = { isCorrect: boolean };

/** Props for the accessible interactive activity player. */
export type InteractiveActivityPlayerProps = {
  activity: Activity;
  controller: MediaController;
  locale: string;
  onAssess(input: { checkpointId: string; answer: unknown }): Promise<PlayerAssessment>;
  onEngage?(input: { checkpointId: string; answer: unknown }): void | Promise<void>;
  renderMedia?(input: { video: Extract<Activity["resources"][number], { kind: "video" }> }): ReactNode;
  renderResource?(input: { resource: Activity["resources"][number]; context: "alternative" | "remediation" }): ReactNode;
  initialPositionSeconds?: number;
  onPositionChange?(seconds: number): void;
  onWatchedRangesChange?(ranges: Array<{ startSeconds: number; endSeconds: number }>): void;
};

function text(value: Record<string, string>, locale: string): string {
  return value[locale] ?? value.en ?? Object.values(value)[0] ?? "";
}

function resourceContent(resource: Activity["resources"][number], locale: string): ReactNode {
  switch (resource.kind) {
    case "diagram":
      return (
        <div role="img" aria-label={text(resource.alt, locale)} data-asset-id={resource.assetId}>
          Diagram: {resource.caption ? text(resource.caption, locale) : text(resource.alt, locale)}
        </div>
      );
    case "transcript":
      return <p>{resource.text}</p>;
    case "lesson_section":
      return <a href={`#lesson-section-${resource.sectionId}`}>{text(resource.label, locale)}</a>;
    case "repository_location":
      return (
        <div>
          <span>{text(resource.label, locale)}</span>{" "}
          <code>{resource.repositoryId}/{resource.filePath}{resource.symbol ? `#${resource.symbol}` : ""}</code>
        </div>
      );
    case "video":
      return null;
  }
}

/**
 * Renders a provider-neutral interactive video, checkpoint, and remediation surface.
 * @param props Activity content, controller, locale, and server assessment callback.
 * @returns Accessible React learning activity.
 */
export function InteractiveActivityPlayer({ activity, controller, locale, onAssess, onEngage, renderMedia, renderResource, initialPositionSeconds = 0, onPositionChange, onWatchedRangesChange }: InteractiveActivityPlayerProps) {
  const [snapshot, setSnapshot] = useState<MediaSnapshot>(() => controller.getSnapshot());
  const [activeCheckpointId, setActiveCheckpointId] = useState<string | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [freeTextAnswer, setFreeTextAnswer] = useState("");
  const [assessment, setAssessment] = useState<PlayerAssessment | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const previousSeconds = useRef(snapshot.currentSeconds);
  const previousStatus = useRef(snapshot.status);
  const triggered = useRef(new Set<string>());
  const watchedRanges = useRef<Array<{ startSeconds: number; endSeconds: number }>>([]);
  const initialPosition = useRef(initialPositionSeconds);
  const positionChangeCallback = useRef(onPositionChange);
  const watchedRangesChangeCallback = useRef(onWatchedRangesChange);
  const checkpointForm = useRef<HTMLFormElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const remediationEndSeconds = useRef<number | null>(null);
  const video = activity.resources.find((resource) => resource.kind === "video");
  const checkpoint = activity.checkpoints.find((candidate) => candidate.checkpointId === activeCheckpointId);
  const checkpointVideoCandidate = checkpoint
    ? activity.resources.find((resource) => resource.resourceId === checkpoint.trigger.resourceId)
    : undefined;
  const checkpointVideo = checkpointVideoCandidate?.kind === "video" ? checkpointVideoCandidate : undefined;
  const transcriptCandidate = video?.transcriptResourceId
    ? activity.resources.find((resource) => resource.resourceId === video.transcriptResourceId && resource.kind === "transcript")
    : undefined;
  const transcript = transcriptCandidate?.kind === "transcript" ? transcriptCandidate : undefined;
  const alternative = activity.accessibility.nonVideoAlternativeResourceId
    ? activity.resources.find((resource) => resource.resourceId === activity.accessibility.nonVideoAlternativeResourceId)
    : undefined;
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = (): void => setReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener?.("change", updatePreference);
    return () => preference.removeEventListener?.("change", updatePreference);
  }, []);

  useEffect(() => {
    positionChangeCallback.current = onPositionChange;
    watchedRangesChangeCallback.current = onWatchedRangesChange;
  }, [onPositionChange, onWatchedRangesChange]);

  useEffect(() => {
    const unsubscribe = controller.subscribe((next) => {
    if (remediationEndSeconds.current !== null && next.status === "playing" && next.currentSeconds >= remediationEndSeconds.current) {
      remediationEndSeconds.current = null;
      controller.pause();
    }
    const cues = activity.checkpoints.flatMap((candidate) => {
      const source = activity.resources.find((resource) => resource.resourceId === candidate.trigger.resourceId);
      const segment = source?.kind === "video" ? source.segments.find((item) => item.segmentId === candidate.trigger.segmentId) : undefined;
      return segment ? [{ checkpointId: candidate.checkpointId, seconds: segment.endSeconds }] : [];
    });
    const crossed = sampleCueCrossings(previousSeconds.current, next.currentSeconds, cues.map((cue) => cue.seconds));
    const cue = cues.find((candidate) => crossed.includes(candidate.seconds) && !triggered.current.has(candidate.checkpointId));
    if (cue) {
      triggered.current.add(cue.checkpointId);
      previousFocus.current = document.activeElement as HTMLElement | null;
      controller.pause();
      setActiveCheckpointId(cue.checkpointId);
      setAssessment(null);
      setSelectedOptionIds([]);
      setFreeTextAnswer("");
    }
    if (previousStatus.current === "playing" && next.currentSeconds > previousSeconds.current) {
      watchedRanges.current = mergeWatchedRanges([...watchedRanges.current, { startSeconds: previousSeconds.current, endSeconds: next.currentSeconds }]);
    }
    if (next.status !== "playing" && watchedRanges.current.length > 0) watchedRangesChangeCallback.current?.(watchedRanges.current);
    previousSeconds.current = next.currentSeconds;
    previousStatus.current = next.status;
    positionChangeCallback.current?.(next.currentSeconds);
    setSnapshot(next);
    });
    if (initialPosition.current > 0) controller.seek(initialPosition.current);
    return () => { unsubscribe(); controller.destroy(); };
  }, [activity, controller]);

  useEffect(() => {
    if (checkpoint) checkpointForm.current?.querySelector<HTMLElement>("input, button")?.focus();
  }, [checkpoint]);

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!checkpoint) return;
    const answer = checkpoint.question.kind === "multiple_choice"
      ? selectedOptionIds
      : checkpoint.question.kind === "single_choice"
        ? selectedOptionIds[0]
        : freeTextAnswer;
    if ((Array.isArray(answer) && answer.length === 0) || !answer) return;
    if (checkpoint.evidence.behavior === "engagement") {
      await onEngage?.({ checkpointId: checkpoint.checkpointId, answer });
      setAssessment({ isCorrect: true });
      return;
    }
    setAssessment(await onAssess({ checkpointId: checkpoint.checkpointId, answer }));
  };
  const replay = (): void => {
    if (!checkpoint) return;
    const source = activity.resources.find((resource) => resource.resourceId === checkpoint.trigger.resourceId);
    const segment = source?.kind === "video" ? source.segments.find((item) => item.segmentId === checkpoint.trigger.segmentId) : undefined;
    if (!segment) return;
    remediationEndSeconds.current = segment.endSeconds;
    controller.seek(segment.startSeconds);
    void controller.play();
  };
  const policy = checkpointVideo && checkpoint
    ? resolveCheckpointPolicy(checkpointVideo.provider, checkpoint.gate, Boolean(checkpointVideo.hardGateApproval))
    : "pause_non_blocking";
  const hardGateLocked = policy === "answer_before_continue" && assessment?.isCorrect !== true;

  return (
    <section aria-label={text(activity.title, locale)} data-slot="interactive-activity-player" data-reduced-motion={reducedMotion}>
      <div data-slot="activity-media-surface" aria-label="Tutorial media">
        {video ? renderMedia?.({ video }) : null}
      </div>
      <button data-slot="activity-play-toggle" data-touch-target="true" type="button" disabled={hardGateLocked} onClick={() => snapshot.status === "playing" ? controller.pause() : void controller.play()}>
        {snapshot.status === "playing" ? "Pause" : "Play"}
      </button>
      <label>
        Seek tutorial video
        <input
          type="range"
          min={0}
          max={Math.max(1, snapshot.durationSeconds)}
          value={Math.min(snapshot.currentSeconds, Math.max(1, snapshot.durationSeconds))}
          disabled={hardGateLocked}
          onChange={(event) => controller.seek(Number(event.currentTarget.value))}
        />
      </label>
      {snapshot.status === "error" ? (
        <div role="alert">
          <p>{snapshot.errorMessage ?? "Media could not be loaded."}</p>
          <button data-touch-target="true" type="button" onClick={() => hardGateLocked ? replay() : void controller.play()}>Retry media</button>
        </div>
      ) : null}
      <span role="status" aria-live="polite">
        {assessment && checkpoint ? text(assessment.isCorrect ? checkpoint.feedback.correct : checkpoint.feedback.incorrect, locale) : ""}
      </span>
      {transcript ? (
        <div data-slot="activity-transcript">
          <button type="button" aria-expanded={transcriptOpen} onClick={() => setTranscriptOpen((open) => !open)}>
            {transcriptOpen ? "Hide transcript" : "Show transcript"}
          </button>
          {transcriptOpen ? <p>{transcript.text}</p> : null}
        </div>
      ) : null}
      {alternative ? (
        <div data-slot="activity-alternative">
          {renderResource?.({ resource: alternative, context: "alternative" }) ?? resourceContent(alternative, locale)}
        </div>
      ) : null}
      {checkpoint ? (
        <form ref={checkpointForm} onSubmit={(event) => void submit(event)} data-slot="activity-checkpoint">
          <fieldset>
            <legend>{text(checkpoint.question.prompt, locale)}</legend>
            {checkpoint.question.kind !== "free_text" ? checkpoint.question.options.map((option) => (
              <label key={option.optionId}>
                <input
                  type={checkpoint.question.kind === "multiple_choice" ? "checkbox" : "radio"}
                  name={checkpoint.checkpointId}
                  value={option.optionId}
                  checked={selectedOptionIds.includes(option.optionId)}
                  onChange={() => setSelectedOptionIds((current) => checkpoint.question.kind === "multiple_choice"
                    ? current.includes(option.optionId)
                      ? current.filter((optionId) => optionId !== option.optionId)
                      : [...current, option.optionId]
                    : [option.optionId])}
                />
                {text(option.label, locale)}
              </label>
            )) : (
              <label>
                Answer
                <input type="text" value={freeTextAnswer} onChange={(event) => setFreeTextAnswer(event.currentTarget.value)} />
              </label>
            )}
          </fieldset>
          <button data-touch-target="true" type="submit">Check answer</button>
          {checkpoint.remediation.some((resource) => resource.kind === "video_segment") ? (
            <button data-touch-target="true" type="button" onClick={replay}>
              Replay {checkpointVideo?.segments.find((segment) => segment.segmentId === checkpoint.trigger.segmentId) ? text(checkpointVideo.segments.find((segment) => segment.segmentId === checkpoint.trigger.segmentId)!.label, locale) : "segment"}
            </button>
          ) : null}
          <div data-slot="activity-remediation-resources">
            {checkpoint.remediation.map((reference) => {
              if (reference.kind === "video_segment") return null;
              const resource = activity.resources.find((candidate) => candidate.resourceId === reference.resourceId);
              return resource ? (
                <div key={`${reference.kind}:${reference.resourceId}`}>
                  {renderResource?.({ resource, context: "remediation" }) ?? resourceContent(resource, locale)}
                </div>
              ) : null;
            })}
          </div>
          <button
            type="button"
            disabled={hardGateLocked}
            data-touch-target="true"
            onClick={() => { setActiveCheckpointId(null); void controller.play(); previousFocus.current?.focus(); }}
          >
            Continue video
          </button>
        </form>
      ) : null}
    </section>
  );
}
