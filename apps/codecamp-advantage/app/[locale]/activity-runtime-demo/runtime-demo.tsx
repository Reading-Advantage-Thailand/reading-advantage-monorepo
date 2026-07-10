"use client";

import { InteractiveActivityPlayer, type MediaController, type MediaSnapshot } from "@reading-advantage/activity-react";
import { activitySchema } from "@reading-advantage/activity-runtime/core";
import { useCallback, useMemo, useState } from "react";

const demoActivity = activitySchema.parse({
  schemaVersion: "activity.v1",
  activityId: "codecamp.activity.runtime-demo",
  activityVersion: "1.0.0",
  graphVersion: "codecamp.graph.v1",
  objectiveId: "git.commit.create",
  variantKey: "video.runtime-demo.v1",
  mode: "worked_example",
  title: { en: "Interactive Git Commit Tutorial" },
  accessibility: { transcriptRequired: true, captionsRequired: true, nonVideoAlternativeResourceId: "diagram.commit-flow" },
  resources: [
    {
      kind: "video",
      resourceId: "video.commit-demo",
      provider: "youtube",
      videoId: "RGOj5yH7evk",
      captionsAvailable: true,
      transcriptResourceId: "transcript.commit-demo",
      segments: [{ segmentId: "segment.stage", label: { en: "Stage files" }, startSeconds: 12, endSeconds: 35 }]
    },
    { kind: "transcript", resourceId: "transcript.commit-demo", language: "en", text: "Use git add to move changes from the working tree into the staging area before committing." },
    { kind: "diagram", resourceId: "diagram.commit-flow", assetId: "diagram.commit-flow.v1", alt: { en: "Working tree flows to staging area, then to repository" } }
  ],
  checkpoints: [{
    checkpointId: "checkpoint.stage",
    stepId: "ido.stage",
    objectiveId: "git.commit.create",
    variantKey: "checkpoint.runtime-demo.v1",
    trigger: { resourceId: "video.commit-demo", segmentId: "segment.stage" },
    question: {
      kind: "single_choice",
      prompt: { en: "What does git add do?" },
      options: [{ optionId: "stage", label: { en: "Stages changes" } }, { optionId: "publish", label: { en: "Publishes changes" } }],
      correctOptionIds: ["stage"]
    },
    feedback: { correct: { en: "Correct — the changes are now staged." }, incorrect: { en: "Not yet. Review the staging segment and diagram." } },
    remediation: [{ kind: "video_segment", resourceId: "video.commit-demo", segmentId: "segment.stage" }, { kind: "diagram", resourceId: "diagram.commit-flow" }],
    evidence: { behavior: "assessed", weight: 0.5 },
    gate: "pause_non_blocking"
  }],
  tutorialSteps: []
});

class DemoController implements MediaController {
  private snapshot: MediaSnapshot = { status: "ready", currentSeconds: 0, durationSeconds: 90, captionsEnabled: true };
  private readonly listeners = new Set<(snapshot: MediaSnapshot) => void>();
  getSnapshot(): MediaSnapshot { return this.snapshot; }
  subscribe(listener: (snapshot: MediaSnapshot) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  play(): void { this.publish({ ...this.snapshot, status: "playing" }); }
  pause(): void { this.publish({ ...this.snapshot, status: "paused" }); }
  seek(seconds: number): void { this.publish({ ...this.snapshot, currentSeconds: seconds }); }
  destroy(): void { this.listeners.clear(); }
  private publish(snapshot: MediaSnapshot): void { this.snapshot = snapshot; this.listeners.forEach((listener) => listener(snapshot)); }
}

/**
 * Renders a live browser host for the shared interactive activity package.
 * @returns Browser-verifiable interactive tutorial content.
 */
export function ActivityRuntimeDemo() {
  const controller = useMemo(() => new DemoController(), []);
  const [attempts, setAttempts] = useState(() => Number(globalThis.localStorage?.getItem("activity-runtime-demo-attempts") ?? 0));
  const [initialPosition] = useState(() => Number(globalThis.localStorage?.getItem("activity-runtime-demo-position") ?? 0));
  const [position, setPosition] = useState(initialPosition);
  const [watchedRangeCount, setWatchedRangeCount] = useState(0);
  const savePosition = useCallback((seconds: number) => {
    globalThis.localStorage?.setItem("activity-runtime-demo-position", String(seconds));
    setPosition(seconds);
  }, []);
  const saveWatchedRanges = useCallback((ranges: Array<{ startSeconds: number; endSeconds: number }>) => {
    globalThis.localStorage?.setItem("activity-runtime-demo-watched-ranges", JSON.stringify(ranges));
    setWatchedRangeCount(ranges.length);
  }, []);
  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-6 bg-slate-50 p-4 text-slate-950 sm:p-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Codecamp proof of life</p>
        <h1 className="text-3xl font-bold">I Do: interactive commit demonstration</h1>
        <p>Play or seek past 35 seconds to open the formative checkpoint. YouTube continuation remains non-blocking.</p>
      </header>
      <div className="rounded-xl border bg-white p-5 shadow-sm [&_button]:m-1 [&_button]:min-h-11 [&_button]:rounded-md [&_button]:border [&_button]:px-4 [&_input]:m-2">
        <InteractiveActivityPlayer
          activity={demoActivity}
          controller={controller}
          locale="en"
          initialPositionSeconds={initialPosition}
          onPositionChange={savePosition}
          onWatchedRangesChange={saveWatchedRanges}
          renderMedia={({ video }) => video.provider === "youtube" ? (
            <iframe
              className="aspect-video w-full rounded-lg border-0"
              src={`https://www.youtube.com/embed/${video.videoId}`}
              title="Git commit tutorial video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : null}
          onAssess={async ({ answer }) => {
            const next = attempts + 1;
            globalThis.localStorage?.setItem("activity-runtime-demo-attempts", String(next));
            setAttempts(next);
            return { isCorrect: answer === "stage" };
          }}
        />
      </div>
      <output aria-live="polite" className="block rounded-md bg-blue-50 p-3 font-medium">Persisted attempts: {attempts}</output>
      <output aria-live="polite" className="block rounded-md bg-blue-50 p-3 font-medium">Persisted position: {position} seconds; watched batches: {watchedRangeCount}</output>
    </main>
  );
}
