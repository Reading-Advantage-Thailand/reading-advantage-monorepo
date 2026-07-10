import type { Activity } from "@reading-advantage/activity-runtime/core";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { resolveCheckpointPolicy, sampleCueCrossings, type MediaController, type MediaSnapshot } from "./controllers.js";

/** Server assessment response used for immediate formative feedback. */
export type PlayerAssessment = { isCorrect: boolean };

/** Props for the accessible interactive activity player. */
export type InteractiveActivityPlayerProps = {
  activity: Activity;
  controller: MediaController;
  locale: string;
  onAssess(input: { checkpointId: string; answer: unknown }): Promise<PlayerAssessment>;
};

function text(value: Record<string, string>, locale: string): string {
  return value[locale] ?? value.en ?? Object.values(value)[0] ?? "";
}

/**
 * Renders a provider-neutral interactive video, checkpoint, and remediation surface.
 * @param props Activity content, controller, locale, and server assessment callback.
 * @returns Accessible React learning activity.
 */
export function InteractiveActivityPlayer({ activity, controller, locale, onAssess }: InteractiveActivityPlayerProps) {
  const [snapshot, setSnapshot] = useState<MediaSnapshot>(() => controller.getSnapshot());
  const [activeCheckpointId, setActiveCheckpointId] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [assessment, setAssessment] = useState<PlayerAssessment | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const previousSeconds = useRef(snapshot.currentSeconds);
  const triggered = useRef(new Set<string>());
  const video = activity.resources.find((resource) => resource.kind === "video");
  const checkpoint = activity.checkpoints.find((candidate) => candidate.checkpointId === activeCheckpointId);
  const transcriptCandidate = video?.transcriptResourceId
    ? activity.resources.find((resource) => resource.resourceId === video.transcriptResourceId && resource.kind === "transcript")
    : undefined;
  const transcript = transcriptCandidate?.kind === "transcript" ? transcriptCandidate : undefined;
  const alternative = activity.accessibility.nonVideoAlternativeResourceId
    ? activity.resources.find((resource) => resource.resourceId === activity.accessibility.nonVideoAlternativeResourceId)
    : undefined;
  const reducedMotion = useMemo(() => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  useEffect(() => controller.subscribe((next) => {
    const cues = activity.checkpoints.flatMap((candidate) => {
      const source = activity.resources.find((resource) => resource.resourceId === candidate.trigger.resourceId);
      const segment = source?.kind === "video" ? source.segments.find((item) => item.segmentId === candidate.trigger.segmentId) : undefined;
      return segment ? [{ checkpointId: candidate.checkpointId, seconds: segment.endSeconds }] : [];
    });
    const crossed = sampleCueCrossings(previousSeconds.current, next.currentSeconds, cues.map((cue) => cue.seconds));
    const cue = cues.find((candidate) => crossed.includes(candidate.seconds) && !triggered.current.has(candidate.checkpointId));
    if (cue) {
      triggered.current.add(cue.checkpointId);
      controller.pause();
      setActiveCheckpointId(cue.checkpointId);
      setAssessment(null);
      setSelectedAnswer("");
    }
    previousSeconds.current = next.currentSeconds;
    setSnapshot(next);
  }), [activity, controller]);

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!checkpoint || !selectedAnswer) return;
    setAssessment(await onAssess({ checkpointId: checkpoint.checkpointId, answer: selectedAnswer }));
  };
  const replay = (): void => {
    if (!checkpoint) return;
    const source = activity.resources.find((resource) => resource.resourceId === checkpoint.trigger.resourceId);
    const segment = source?.kind === "video" ? source.segments.find((item) => item.segmentId === checkpoint.trigger.segmentId) : undefined;
    if (!segment) return;
    controller.seek(segment.startSeconds);
    void controller.play();
  };
  const policy = video && checkpoint
    ? resolveCheckpointPolicy(video.provider, checkpoint.gate, Boolean(video.hardGateApproval))
    : "pause_non_blocking";

  return (
    <section aria-label={text(activity.title, locale)} data-slot="interactive-activity-player" data-reduced-motion={reducedMotion}>
      <div data-slot="activity-media-surface" aria-label="Tutorial media" />
      <button data-slot="activity-play-toggle" type="button" onClick={() => snapshot.status === "playing" ? controller.pause() : void controller.play()}>
        {snapshot.status === "playing" ? "Pause" : "Play"}
      </button>
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
      {alternative?.kind === "diagram" ? <div role="img" aria-label={text(alternative.alt, locale)} data-asset-id={alternative.assetId} /> : null}
      {checkpoint ? (
        <form onSubmit={(event) => void submit(event)} data-slot="activity-checkpoint">
          <fieldset>
            <legend>{text(checkpoint.question.prompt, locale)}</legend>
            {checkpoint.question.kind !== "free_text" ? checkpoint.question.options.map((option) => (
              <label key={option.optionId}>
                <input type="radio" name={checkpoint.checkpointId} value={option.optionId} checked={selectedAnswer === option.optionId} onChange={() => setSelectedAnswer(option.optionId)} />
                {text(option.label, locale)}
              </label>
            )) : (
              <label>
                Answer
                <input type="text" value={selectedAnswer} onChange={(event) => setSelectedAnswer(event.currentTarget.value)} />
              </label>
            )}
          </fieldset>
          <button type="submit">Check answer</button>
          {checkpoint.remediation.some((resource) => resource.kind === "video_segment") ? (
            <button type="button" onClick={replay}>
              Replay {video?.segments.find((segment) => segment.segmentId === checkpoint.trigger.segmentId) ? text(video.segments.find((segment) => segment.segmentId === checkpoint.trigger.segmentId)!.label, locale) : "segment"}
            </button>
          ) : null}
          <button
            type="button"
            disabled={policy === "answer_before_continue" && assessment?.isCorrect !== true}
            onClick={() => { setActiveCheckpointId(null); void controller.play(); }}
          >
            Continue video
          </button>
        </form>
      ) : null}
    </section>
  );
}
