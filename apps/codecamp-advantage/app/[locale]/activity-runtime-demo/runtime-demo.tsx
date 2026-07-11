"use client";

import { createYouTubeMediaController, InteractiveActivityPlayer, TutorialActivityPanel, type MediaController, type MediaSnapshot, type YouTubeMediaController, type YouTubePlayerPort } from "@reading-advantage/activity-react";
import { codecampAPKUnit, createCodecampAPKActivity, createCodecampAPKTutorialActivity } from "@reading-advantage/codecamp-knowledge/apk-unit";
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

export function YouTubeMediaHost({ videoId, locale, onReady }: { videoId: string; locale: string; onReady(controller: RefreshingMediaController): void }) {
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
            target.getIframe().title = locale.startsWith("th") ? "วิดีโอวงจร Phaser cartridge" : "Phaser cartridge lifecycle video";
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

export class DemoController implements MediaController {
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
  const demoActivity = useMemo(() => createCodecampAPKActivity(locale), [locale]);
  const tutorialActivity = useMemo(() => createCodecampAPKTutorialActivity(locale), [locale]);
  const controller = useMemo(() => new DemoController(), []);
  const attachYouTubeController = useCallback((nextController: RefreshingMediaController) => controller.attach(nextController), [controller]);
  const [attempts, setAttempts] = useState(0);
  const [initialPosition, setInitialPosition] = useState(0);
  const [position, setPosition] = useState(0);
  const [watchedRangeCount, setWatchedRangeCount] = useState(0);
  const [tutorialChecks, setTutorialChecks] = useState(0);
  const [supportUses, setSupportUses] = useState(0);
  const [completedTutorialStepIds, setCompletedTutorialStepIds] = useState<string[]>([]);
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
    setTutorialChecks(readStoredNumber("activity-runtime-demo-tutorial-checks", 10_000));
    setSupportUses(readStoredNumber("activity-runtime-demo-support-uses", 10_000));
    try {
      const storedCompleted: unknown = JSON.parse(globalThis.localStorage?.getItem("activity-runtime-demo-completed-tutorial-steps") ?? "[]");
      setCompletedTutorialStepIds(Array.isArray(storedCompleted) ? storedCompleted.filter((stepId): stepId is string => typeof stepId === "string") : []);
    } catch {
      setCompletedTutorialStepIds([]);
    }
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
        <h1 className="text-3xl font-bold">{thai ? "I Do: วิเคราะห์ Phaser cartridge แบบโต้ตอบ" : "I Do: trace a Phaser cartridge interactively"}</h1>
        <p>{thai ? "เล่นหรือเลื่อนไปหลัง 55 วินาทีเพื่อเปิดคำถามเรื่องขอบเขต React host การดู YouTube ต่อจะไม่ถูกบังคับให้ตอบถูก" : "Play or seek past 55 seconds to open the React-host boundary checkpoint. YouTube continuation remains non-blocking."}</p>
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
                <span className="rounded-md bg-white px-3 py-2 shadow-sm">React host</span>
                <span>→ mount →</span>
                <span className="rounded-md bg-white px-3 py-2 shadow-sm">Phaser cartridge</span>
                <span>→ result →</span>
                <span className="rounded-md bg-white px-3 py-2 shadow-sm">{thai ? "หลักฐานการเรียนรู้" : "Learning evidence"}</span>
              </div>
              <figcaption className="mt-2 text-center text-sm text-blue-800">{thai ? "host ดูแลการ mount, persistence และ navigation ส่วน cartridge ดูแลกลไกเกม" : "The host owns mounting, persistence, and navigation; the cartridge owns the game mechanic."}</figcaption>
            </figure>
          ) : undefined}
          onAssess={async ({ answer }) => {
            const next = attempts + 1;
            globalThis.localStorage?.setItem("activity-runtime-demo-attempts", String(next));
            setAttempts(next);
            return { isCorrect: answer === "persist" };
          }}
        />
      </div>
      <output aria-live="polite" className="block rounded-md bg-blue-50 p-3 font-medium">{thai ? "จำนวนครั้งที่บันทึกไว้" : "Persisted attempts"}: {attempts}</output>
      <output aria-live="polite" className="block rounded-md bg-blue-50 p-3 font-medium">{thai ? `ตำแหน่งที่บันทึกไว้: ${Math.round(position)} วินาที; ช่วงที่ดู: ${watchedRangeCount}` : `Persisted position: ${Math.round(position)} seconds; watched batches: ${watchedRangeCount}`}</output>
      <section aria-labelledby="we-do-heading" className="space-y-3">
        <h2 id="we-do-heading" className="text-2xl font-bold">{thai ? "We Do: เติม APK cartridge manifest" : "We Do: complete an APK cartridge manifest"}</h2>
        <p>{thai ? "clone repo แบบมีคำแนะนำ แล้วใช้ผลตรวจจาก server เพื่อบันทึกหลักฐาน" : "Clone the guided repository, then use server-verified checks to record evidence."}</p>
        <TutorialActivityPanel
          activity={tutorialActivity}
          locale={locale}
          renderResource={() => <div role="img" aria-label={thai ? "ขอบเขต React host และ cartridge" : "React host and cartridge boundary"} className="rounded-md bg-blue-50 p-3">React host → APK cartridge → validated result</div>}
          onSupportUsage={() => {
            const next = supportUses + 1;
            globalThis.localStorage?.setItem("activity-runtime-demo-support-uses", String(next));
            setSupportUses(next);
          }}
          completedStepIds={completedTutorialStepIds}
          onCompletedStep={(stepId) => {
            const next = [...new Set([...completedTutorialStepIds, stepId])];
            globalThis.localStorage?.setItem("activity-runtime-demo-completed-tutorial-steps", JSON.stringify(next));
            setCompletedTutorialStepIds(next);
          }}
          onCheck={async () => {
            const next = tutorialChecks + 1;
            globalThis.localStorage?.setItem("activity-runtime-demo-tutorial-checks", String(next));
            setTutorialChecks(next);
            return { passed: true, checks: codecampAPKUnit.wedo.manifest.steps[0]!.checks.map(({ checkId }) => ({ checkId, passed: true })) };
          }}
        />
        <output aria-live="polite" className="block rounded-md bg-blue-50 p-3 font-medium">{thai ? "การตรวจที่บันทึกไว้" : "Persisted tutorial checks"}: {tutorialChecks}; {thai ? "การใช้ตัวช่วย" : "support uses"}: {supportUses}</output>
      </section>
      <section aria-labelledby="you-do-heading" className="space-y-3 rounded-xl border bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{thai ? "งานอิสระ" : "Independent transfer"}</p>
        <h2 id="you-do-heading" className="text-2xl font-bold">{thai ? "You Do: สร้างเกมเรียงประโยค" : "You Do: build a sentence-sorting cartridge"}</h2>
        <p>{codecampAPKUnit.youdo.brief[locale] ?? codecampAPKUnit.youdo.brief.en}</p>
        <h3 className="font-semibold">{thai ? "เกณฑ์ PR" : "PR rubric"}</h3>
        <ul className="list-disc space-y-1 pl-6">{codecampAPKUnit.youdo.rubric.dimensions.map((dimension) => <li key={dimension.dimensionId}><strong>{Math.round(dimension.weight * 100)}%</strong> — {dimension.criteria[locale] ?? dimension.criteria.en}</li>)}</ul>
        <p>{thai ? "ตรวจที่จำเป็น" : "Required checks"}: {codecampAPKUnit.youdo.requiredChecks.join(", ")}</p>
      </section>
    </main>
  );
}
