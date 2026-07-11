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

function createDemoActivity(locale: string) {
  const thai = locale.toLowerCase().startsWith("th");
  return activitySchema.parse({
  schemaVersion: "activity.v1",
  activityId: "codecamp.activity.runtime-demo",
  activityVersion: "1.0.0",
  graphVersion: "codecamp.graph.v1",
  objectiveId: "git.commit.create",
  variantKey: "video.runtime-demo.v1",
  mode: "worked_example",
  title: { en: "Interactive Git Commit Tutorial", th: "บทเรียน Git Commit แบบโต้ตอบ" },
  accessibility: { transcriptRequired: true, captionsRequired: true, nonVideoAlternativeResourceId: "diagram.commit-flow" },
  resources: [
    {
      kind: "video",
      resourceId: "video.commit-demo",
      provider: "youtube",
      videoId: "RGOj5yH7evk",
      captionsAvailable: true,
      transcriptResourceId: "transcript.commit-demo",
      segments: [{ segmentId: "segment.stage", label: { en: "Stage files", th: "เตรียมไฟล์" }, startSeconds: 12, endSeconds: 35 }]
    },
    { kind: "transcript", resourceId: "transcript.commit-demo", language: thai ? "th" : "en", text: thai ? "ใช้ git add เพื่อย้ายการเปลี่ยนแปลงจาก working tree ไปยัง staging area ก่อน commit" : "Use git add to move changes from the working tree into the staging area before committing." },
    { kind: "diagram", resourceId: "diagram.commit-flow", assetId: "diagram.commit-flow.v1", alt: { en: "Working tree flows to staging area, then to repository", th: "ลำดับจาก working tree ไป staging area แล้วเข้าสู่ repository" } }
  ],
  checkpoints: [{
    checkpointId: "checkpoint.stage",
    stepId: "ido.stage",
    objectiveId: "git.commit.create",
    variantKey: "checkpoint.runtime-demo.v1",
    trigger: { resourceId: "video.commit-demo", segmentId: "segment.stage" },
    question: {
      kind: "single_choice",
      prompt: { en: "What does git add do?", th: "git add ทำอะไร?" },
      options: [{ optionId: "stage", label: { en: "Stages changes", th: "เตรียมการเปลี่ยนแปลง" } }, { optionId: "publish", label: { en: "Publishes changes", th: "เผยแพร่การเปลี่ยนแปลง" } }],
      correctOptionIds: ["stage"]
    },
    feedback: { correct: { en: "Correct — the changes are now staged.", th: "ถูกต้อง — การเปลี่ยนแปลงถูกเตรียมไว้แล้ว" }, incorrect: { en: "Not yet. Review the staging segment and diagram.", th: "ยังไม่ถูก ลองทบทวนช่วง staging และแผนภาพ" } },
    remediation: [{ kind: "video_segment", resourceId: "video.commit-demo", segmentId: "segment.stage" }, { kind: "diagram", resourceId: "diagram.commit-flow" }],
    evidence: { behavior: "assessed", weight: 0.5 },
    gate: "pause_non_blocking"
  }],
  tutorialSteps: []
  });
}

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

function YouTubeMediaHost({ videoId, locale, onReady }: { videoId: string; locale: string; onReady(controller: RefreshingMediaController): void }) {
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
            target.getIframe().title = locale.startsWith("th") ? "วิดีโอบทเรียน Git commit" : "Git commit tutorial video";
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
  }, [locale, onReady, videoId]);
  return <div ref={mount} className="aspect-video w-full rounded-lg bg-slate-950" aria-label={locale.startsWith("th") ? "กำลังโหลดวิดีโอบทเรียน" : "Loading tutorial video"} />;
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
      controller.pause();
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
 * @param props Active route locale for content and shared controls.
 * @returns Browser-verifiable interactive tutorial content.
 */
export function ActivityRuntimeDemo({ locale }: { locale: string }) {
  const thai = locale.toLowerCase().startsWith("th");
  const demoActivity = useMemo(() => createDemoActivity(locale), [locale]);
  const controller = useMemo(() => new DemoController(), []);
  const attachYouTubeController = useCallback((nextController: RefreshingMediaController) => controller.attach(nextController), [controller]);
  const [attempts, setAttempts] = useState(0);
  const [initialPosition, setInitialPosition] = useState(0);
  const [position, setPosition] = useState(0);
  const [watchedRangeCount, setWatchedRangeCount] = useState(0);
  const [initialWatchedRanges, setInitialWatchedRanges] = useState<Array<{ startSeconds: number; endSeconds: number }>>([]);
  const [hydrated, setHydrated] = useState(false);
  const resumePositionGuard = useRef<number | null>(null);
  useEffect(() => {
    const storedAttempts = readStoredNumber("activity-runtime-demo-attempts", 10_000);
    const storedPosition = readStoredNumber("activity-runtime-demo-position", 24 * 60 * 60);
    const storedWatchedRanges = readStoredWatchedRanges();
    setAttempts(storedAttempts);
    setInitialPosition(storedPosition);
    setPosition(storedPosition);
    resumePositionGuard.current = storedPosition > 0 ? storedPosition : null;
    setInitialWatchedRanges(storedWatchedRanges);
    setWatchedRangeCount(storedWatchedRanges.length);
    setHydrated(true);
  }, []);
  const savePosition = useCallback((seconds: number) => {
    if (resumePositionGuard.current !== null && Math.abs(seconds - resumePositionGuard.current) > 0.75) return;
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
        <p role="status">{thai ? "กำลังโหลดบทเรียนแบบโต้ตอบ…" : "Loading interactive tutorial…"}</p>
      </main>
    );
  }
  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-6 bg-slate-50 p-4 text-slate-950 sm:p-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{thai ? "ตัวอย่างการทำงาน Codecamp" : "Codecamp proof of life"}</p>
        <h1 className="text-3xl font-bold">{thai ? "I Do: สาธิตการสร้าง commit แบบโต้ตอบ" : "I Do: interactive commit demonstration"}</h1>
        <p>{thai ? "เล่นหรือเลื่อนไปหลัง 35 วินาทีเพื่อเปิดคำถามระหว่างเรียน การดู YouTube ต่อจะไม่ถูกบังคับให้ตอบถูก" : "Play or seek past 35 seconds to open the formative checkpoint. YouTube continuation remains non-blocking."}</p>
      </header>
      <div className="rounded-xl border bg-white p-5 shadow-sm [&_button]:m-1 [&_button]:min-h-11 [&_button]:rounded-md [&_button]:border [&_button]:px-4 [&_input]:m-2">
        <InteractiveActivityPlayer
          activity={demoActivity}
          controller={controller}
          locale={locale}
          initialPositionSeconds={initialPosition}
          initialWatchedRanges={initialWatchedRanges}
          onPositionChange={savePosition}
          onPlaybackIntent={() => { resumePositionGuard.current = null; }}
          onSeekIntent={() => { resumePositionGuard.current = null; }}
          onWatchedRangesChange={saveWatchedRanges}
          renderMedia={({ video }) => video.provider === "youtube" && video.videoId
            ? <YouTubeMediaHost videoId={video.videoId} locale={locale} onReady={attachYouTubeController} />
            : null}
          renderResource={({ resource }) => resource.kind === "diagram" ? (
            <figure
              role="img"
              aria-label={resource.alt[locale] ?? resource.alt.en}
              className="my-3 rounded-lg border border-blue-200 bg-blue-50 p-4"
            >
              <div aria-hidden="true" className="flex flex-wrap items-center justify-center gap-2 font-semibold text-blue-950">
                <span className="rounded-md bg-white px-3 py-2 shadow-sm">{thai ? "พื้นที่ทำงาน" : "Working tree"}</span>
                <span>→ git add →</span>
                <span className="rounded-md bg-white px-3 py-2 shadow-sm">{thai ? "พื้นที่เตรียม" : "Staging area"}</span>
                <span>→ git commit →</span>
                <span className="rounded-md bg-white px-3 py-2 shadow-sm">{thai ? "คลังโค้ด" : "Repository"}</span>
              </div>
              <figcaption className="mt-2 text-center text-sm text-blue-800">{thai ? "ใช้ staging area เพื่อเลือกสิ่งที่จะบันทึกใน commit ถัดไป" : "Use the staging area to choose what the next commit records."}</figcaption>
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
      <output aria-live="polite" className="block rounded-md bg-blue-50 p-3 font-medium">{thai ? "จำนวนครั้งที่บันทึกไว้" : "Persisted attempts"}: {attempts}</output>
      <output aria-live="polite" className="block rounded-md bg-blue-50 p-3 font-medium">{thai ? `ตำแหน่งที่บันทึกไว้: ${Math.round(position)} วินาที; ช่วงที่ดู: ${watchedRangeCount}` : `Persisted position: ${Math.round(position)} seconds; watched batches: ${watchedRangeCount}`}</output>
    </main>
  );
}
