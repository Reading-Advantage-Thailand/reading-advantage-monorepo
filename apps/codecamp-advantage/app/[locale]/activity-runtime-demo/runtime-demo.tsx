"use client";

import { createYouTubeMediaController, InteractiveActivityPlayer, type MediaController, type MediaSnapshot, type YouTubeMediaController, type YouTubePlayerPort } from "@reading-advantage/activity-react";
import { activitySchema } from "@reading-advantage/activity-runtime/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function readStoredNumber(key: string, maximum: number): number {
  const value = Number(globalThis.localStorage?.getItem(key));
  return Number.isFinite(value) && value >= 0 && value <= maximum ? value : 0;
}

function readStoredWatchedRanges(): Array<{ startSeconds: number; endSeconds: number }> {
  try {
    const value: unknown = JSON.parse(globalThis.localStorage?.getItem("activity-runtime-demo-watched-ranges") ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((range): range is { startSeconds: number; endSeconds: number } =>
      typeof range === "object" && range !== null
      && Number.isFinite((range as { startSeconds?: unknown }).startSeconds)
      && Number.isFinite((range as { endSeconds?: unknown }).endSeconds)
      && Number((range as { startSeconds: number }).startSeconds) >= 0
      && Number((range as { endSeconds: number }).endSeconds) > Number((range as { startSeconds: number }).startSeconds));
  } catch {
    return [];
  }
}

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

type RefreshingMediaController = YouTubeMediaController;

interface YouTubePlayer extends YouTubePlayerPort {
  getIframe(): HTMLIFrameElement;
}

interface YouTubeApi {
  Player: new (element: HTMLElement, options: {
    videoId: string;
    playerVars: { enablejsapi: 1; origin: string };
    events: {
      onReady(event: { target: YouTubePlayer }): void;
      onStateChange(event: { data: number }): void;
      onError(event: { data: number }): void;
      onApiChange(): void;
    };
  }) => YouTubePlayer;
}

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YouTubeApi> | undefined;

function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT) return Promise.resolve(window.YT);
  youtubeApiPromise ??= new Promise<YouTubeApi>((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      if (window.YT) resolve(window.YT);
      else reject(new Error("YouTube IFrame API did not initialize"));
    };
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    if (existing) return;
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.addEventListener("error", () => {
      youtubeApiPromise = undefined;
      script.remove();
      reject(new Error("YouTube IFrame API failed to load"));
    }, { once: true });
    document.body.append(script);
  });
  return youtubeApiPromise;
}

function YouTubeMediaHost({ videoId, onReady }: { videoId: string; onReady(controller: RefreshingMediaController): void }) {
  const mount = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let disposed = false;
    let controller: RefreshingMediaController | undefined;
    let refreshTimer: number | undefined;
    void loadYouTubeApi().then((api) => {
      if (disposed || !mount.current) return;
      new api.Player(mount.current, {
        videoId,
        playerVars: { enablejsapi: 1, origin: window.location.origin },
        events: {
          onReady: ({ target }) => {
            if (disposed) {
              target.destroy();
              return;
            }
            target.getIframe().title = "Git commit tutorial video";
            controller = createYouTubeMediaController(target);
            onReady(controller);
            refreshTimer = window.setInterval(() => controller?.refresh(), 500);
          },
          onStateChange: ({ data }) => controller?.handleStateChange(data),
          onError: ({ data }) => controller?.handleError(data),
          onApiChange: () => controller?.handleApiChange(),
        },
      });
    });
    return () => {
      disposed = true;
      if (refreshTimer !== undefined) window.clearInterval(refreshTimer);
      controller?.destroy();
    };
  }, [onReady, videoId]);
  return <div ref={mount} className="aspect-video w-full rounded-lg bg-slate-950" aria-label="Loading tutorial video" />;
}

class DemoController implements MediaController {
  private snapshot: MediaSnapshot = { status: "idle", currentSeconds: 0, durationSeconds: 0, captionsEnabled: false };
  private readonly listeners = new Set<(snapshot: MediaSnapshot) => void>();
  private delegate: RefreshingMediaController | undefined;
  private unsubscribeDelegate: (() => void) | undefined;
  private pendingSeekSeconds: number | undefined;
  getSnapshot(): MediaSnapshot { return this.snapshot; }
  subscribe(listener: (snapshot: MediaSnapshot) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  play(): void | Promise<void> { return this.delegate?.play(); }
  pause(): void { this.delegate?.pause(); }
  seek(seconds: number): void {
    if (this.delegate) this.delegate.seek(seconds);
    else this.pendingSeekSeconds = seconds;
  }
  attach(controller: RefreshingMediaController): void {
    this.unsubscribeDelegate?.();
    this.delegate?.destroy();
    this.delegate = controller;
    this.snapshot = controller.getSnapshot();
    this.unsubscribeDelegate = controller.subscribe((snapshot) => this.publish(snapshot));
    this.publish(this.snapshot);
    if (this.pendingSeekSeconds !== undefined) {
      controller.seek(this.pendingSeekSeconds);
      this.pendingSeekSeconds = undefined;
    }
  }
  destroy(): void {
    this.unsubscribeDelegate?.();
    this.delegate?.destroy();
    this.delegate = undefined;
    this.unsubscribeDelegate = undefined;
    this.listeners.clear();
  }
  private publish(snapshot: MediaSnapshot): void { this.snapshot = snapshot; this.listeners.forEach((listener) => listener(snapshot)); }
}

/**
 * Renders a live browser host for the shared interactive activity package.
 * @returns Browser-verifiable interactive tutorial content.
 */
export function ActivityRuntimeDemo() {
  const controller = useMemo(() => new DemoController(), []);
  const attachYouTubeController = useCallback((nextController: RefreshingMediaController) => controller.attach(nextController), [controller]);
  const [attempts, setAttempts] = useState(0);
  const [initialPosition, setInitialPosition] = useState(0);
  const [position, setPosition] = useState(0);
  const [watchedRangeCount, setWatchedRangeCount] = useState(0);
  const [initialWatchedRanges, setInitialWatchedRanges] = useState<Array<{ startSeconds: number; endSeconds: number }>>([]);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const storedAttempts = readStoredNumber("activity-runtime-demo-attempts", 10_000);
    const storedPosition = readStoredNumber("activity-runtime-demo-position", 24 * 60 * 60);
    const storedWatchedRanges = readStoredWatchedRanges();
    setAttempts(storedAttempts);
    setInitialPosition(storedPosition);
    setPosition(storedPosition);
    setInitialWatchedRanges(storedWatchedRanges);
    setWatchedRangeCount(storedWatchedRanges.length);
    setHydrated(true);
  }, []);
  const savePosition = useCallback((seconds: number) => {
    globalThis.localStorage?.setItem("activity-runtime-demo-position", String(seconds));
    setPosition(seconds);
  }, []);
  const saveWatchedRanges = useCallback((ranges: Array<{ startSeconds: number; endSeconds: number }>) => {
    globalThis.localStorage?.setItem("activity-runtime-demo-watched-ranges", JSON.stringify(ranges));
    setWatchedRangeCount(ranges.length);
  }, []);
  if (!hydrated) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl bg-slate-50 p-4 text-slate-950 sm:p-8">
        <p role="status">Loading interactive tutorial…</p>
      </main>
    );
  }
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
          initialWatchedRanges={initialWatchedRanges}
          onPositionChange={savePosition}
          onWatchedRangesChange={saveWatchedRanges}
          renderMedia={({ video }) => video.provider === "youtube" && video.videoId
            ? <YouTubeMediaHost videoId={video.videoId} onReady={attachYouTubeController} />
            : null}
          renderResource={({ resource }) => resource.kind === "diagram" ? (
            <figure
              role="img"
              aria-label={resource.alt.en}
              className="my-3 rounded-lg border border-blue-200 bg-blue-50 p-4"
            >
              <div aria-hidden="true" className="flex flex-wrap items-center justify-center gap-2 font-semibold text-blue-950">
                <span className="rounded-md bg-white px-3 py-2 shadow-sm">Working tree</span>
                <span>→ git add →</span>
                <span className="rounded-md bg-white px-3 py-2 shadow-sm">Staging area</span>
                <span>→ git commit →</span>
                <span className="rounded-md bg-white px-3 py-2 shadow-sm">Repository</span>
              </div>
              <figcaption className="mt-2 text-center text-sm text-blue-800">Use the staging area to choose what the next commit records.</figcaption>
            </figure>
          ) : undefined}
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
