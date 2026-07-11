"use client";

import { Link } from "@/i18n/navigation";
import { trpc } from "@/lib/trpc";
import {
  InteractiveActivityPlayer,
  TutorialActivityPanel,
  type TutorialSupportUsage,
} from "@reading-advantage/activity-react";
import { DemoController, YouTubeMediaHost } from "../../activity-runtime-demo/runtime-demo";
import type { Activity } from "@reading-advantage/activity-runtime";
import { activityEventSchema } from "@reading-advantage/activity-runtime/core";
import type { AppRouter } from "@reading-advantage/api";
import {
  codecampAPKUnit,
  codecampAPKReference,
  createCodecampAPKActivity,
  createCodecampAPKTutorialActivity,
} from "@reading-advantage/codecamp-knowledge/apk-unit";
import { createStorageTutorialReportQueue, enqueueTutorialReport, flushTutorialReportQueue } from "@reading-advantage/codecamp-knowledge";
import type { inferRouterOutputs } from "@trpc/server";
import type { inferRouterInputs } from "@trpc/server";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SessionSummary = NonNullable<inferRouterOutputs<AppRouter>["activity"]["get"]>;
type TutorialReportInput = inferRouterInputs<AppRouter>["activity"]["reportTutorial"];
type PreparedTutorialReport = inferRouterOutputs<AppRouter>["activity"]["prepareTutorial"];

function useDurableActivitySession(activity: Activity) {
  const storageKey = `codecamp-activity-session:${activity.activityId}@${activity.activityVersion}`;
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const startRequested = useRef(false);
  const sequence = useRef(0);
  const start = trpc.activity.start.useMutation({
    onSuccess: (next) => {
      globalThis.localStorage?.setItem(storageKey, next.sessionId);
      setSessionId(next.sessionId);
      setSummary(next);
    },
  });
  const existing = trpc.activity.get.useQuery(
    { sessionId: sessionId ?? "pending" },
    { enabled: sessionId !== null, retry: false },
  );
  const append = trpc.activity.append.useMutation({ onSuccess: setSummary });

  const appendEvent = useCallback(async (details: Record<string, unknown>) => {
    if (!sessionId) return;
    const authoredStep = activity.checkpoints[0] ?? activity.tutorialSteps[0];
    if (!authoredStep) return;
    const eventId = crypto.randomUUID();
    const event = activityEventSchema.parse({
      schemaVersion: "activity-evidence.v1", activityId: activity.activityId, activityVersion: activity.activityVersion,
      graphVersion: activity.graphVersion, objectiveId: authoredStep.objectiveId, variantKey: authoredStep.variantKey,
      stepId: authoredStep.stepId, submissionId: eventId, attemptNumber: 1,
      hintsUsed: summary?.support.hintsUsed ?? 0, revealsUsed: summary?.support.revealsUsed ?? 0,
      scaffoldLevel: "scaffoldLevel" in authoredStep ? authoredStep.scaffoldLevel : 0,
      interventionLevel: summary?.support.interventionLevel ?? 0, evidenceConfidence: 0.5,
      timing: { wallClockMs: 0, activeMs: 0 }, eventId, occurredAt: new Date().toISOString(), ...details,
    });
    const sequenceKey = `codecamp-activity-sequence:${sessionId}`;
    const storedSequence = Number(globalThis.localStorage?.getItem(sequenceKey) ?? 0);
    const nextSequence = Math.max(sequence.current, Number.isFinite(storedSequence) ? storedSequence : 0) + 1;
    sequence.current = nextSequence;
    globalThis.localStorage?.setItem(sequenceKey, String(nextSequence));
    await append.mutateAsync({ sessionId, batch: { batchId: crypto.randomUUID(), deviceId: `codecamp-web-${sessionId}`, events: [{ clientSequence: nextSequence, event }] } });
  }, [activity, append, sessionId, summary]);

  const startNewSession = useCallback(() => {
    if (startRequested.current) return;
    startRequested.current = true;
    start.mutate({ activityId: activity.activityId, activityVersion: activity.activityVersion });
  }, [activity.activityId, activity.activityVersion, start]);

  useEffect(() => {
    const stored = globalThis.localStorage?.getItem(storageKey);
    if (stored) setSessionId(stored);
    else startNewSession();
  }, [startNewSession, storageKey]);

  useEffect(() => {
    if (existing.data) setSummary(existing.data);
    if (sessionId && existing.isFetched && existing.data === null) {
      globalThis.localStorage?.removeItem(storageKey);
      setSessionId(null);
      startRequested.current = false;
      startNewSession();
    }
  }, [existing.data, existing.isFetched, sessionId, startNewSession, storageKey]);

  const appendSupport = useCallback(async (usage: TutorialSupportUsage) => {
    if (!sessionId) return;
    const step = activity.tutorialSteps.find(({ stepId }) => stepId === usage.stepId);
    if (!step) return;
    await appendEvent(usage.kind === "hint" ? { kind: "hint_used", stepId: step.stepId, hintId: usage.supportId } : { kind: "reveal_used", stepId: step.stepId, revealId: usage.supportId });
  }, [activity.tutorialSteps, appendEvent, sessionId]);

  const retry = () => {
    start.reset();
    startRequested.current = false;
    startNewSession();
  };

  return { sessionId, summary, setSummary, existing, appendSupport, appendEvent, retry, error: start.error ?? existing.error ?? append.error };
}

function LessonShell({ locale, eyebrow, title, children }: { locale: string; eyebrow: string; title: string; children: React.ReactNode }) {
  const thai = locale.toLowerCase().startsWith("th");
  return (
    <main className="container mx-auto max-w-4xl space-y-6 py-8 md:py-12">
      <Link href="/module/apk-game-creation" className="inline-flex min-h-11 items-center rounded-md border px-4">← {thai ? "กลับไป Unit 20" : "Back to Unit 20"}</Link>
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{eyebrow}</p>
        <h1 className="text-3xl font-bold">{title}</h1>
      </header>
      {children}
    </main>
  );
}

function WorkedExample({ locale }: { locale: string }) {
  const thai = locale.toLowerCase().startsWith("th");
  const activity = useMemo(() => createCodecampAPKActivity(locale), [locale]);
  const controller = useMemo(() => new DemoController(), []);
  const attachYouTubeController = useCallback((nextController: Parameters<DemoController["attach"]>[0]) => controller.attach(nextController), [controller]);
  const lastWatchedEnd = useRef(0);
  const session = useDurableActivitySession(activity);
  const assess = trpc.activity.assessCheckpoint.useMutation();
  const checkpoint = activity.checkpoints[0]!;

  return (
    <LessonShell locale={locale} eyebrow="I Do" title={thai ? "วิเคราะห์ Phaser cartridge" : "Trace a Phaser cartridge"}>
      <p>{thai ? "ดูตัวอย่างหรืออ่าน transcript แล้วเปิด checkpoint ระบบจะตรวจและบันทึกคำตอบบน server" : "Watch the worked example or use its transcript, then open the checkpoint. The server assesses and stores the answer."}</p>
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <InteractiveActivityPlayer
          activity={activity}
          controller={controller}
          locale={locale}
          initialPositionSeconds={session.summary?.positionSeconds ?? 0}
          initialWatchedRanges={session.summary?.watchedRanges ?? []}
          onPlaybackIntent={() => void session.appendEvent({ kind: controller.getSnapshot().status === "playing" ? "playback_paused" : "playback_started", positionSeconds: controller.getSnapshot().currentSeconds })}
          onSeekIntent={(positionSeconds) => void session.appendEvent({ kind: "playback_seeked", positionSeconds })}
          onWatchedRangesChange={(ranges) => { const latest = ranges.at(-1); if (latest && latest.endSeconds > lastWatchedEnd.current + 0.5) { lastWatchedEnd.current = latest.endSeconds; void session.appendEvent({ kind: "watched_range", ...latest }); } }}
          renderMedia={({ video }) => (
            <div className="space-y-3">
              <YouTubeMediaHost videoId={video.videoId!} locale={locale} onReady={attachYouTubeController} />
              <button type="button" className="min-h-11 rounded-md border px-4" onClick={() => controller.seek(55)}>{thai ? "ใช้ transcript/แผนภาพแทน — เปิด checkpoint" : "Use transcript/diagram alternative — open checkpoint"}</button>
            </div>
          )}
          renderResource={({ resource }) => resource.kind === "diagram" ? <div role="img" aria-label={resource.alt[locale] ?? resource.alt.en} className="rounded-md bg-blue-50 p-4">React host → APK cartridge → validated learning result</div> : undefined}
          onAssess={async ({ answer }) => {
            if (!session.sessionId) return { isCorrect: false };
            const attemptNumber = (session.summary?.assessedCheckpointResults[checkpoint.checkpointId]?.attemptNumber ?? 0) + 1;
            const response = await assess.mutateAsync({
              sessionId: session.sessionId,
              attempt: { eventId: crypto.randomUUID(), checkpointId: checkpoint.checkpointId, submissionId: crypto.randomUUID(), attemptNumber, answer, submittedAt: new Date().toISOString(), hintsUsed: session.summary?.support.hintsUsed ?? 0, revealsUsed: session.summary?.support.revealsUsed ?? 0, interventionLevel: session.summary?.support.interventionLevel ?? 0, evidenceConfidence: 1, timingMs: 0 },
            });
            session.setSummary(response.session);
            return { isCorrect: response.isCorrect };
          }}
        />
      </div>
      <section aria-labelledby="reference-cartridge-heading" className="space-y-3 rounded-xl border bg-white p-5 shadow-sm">
        <h2 id="reference-cartridge-heading" className="text-xl font-semibold">{thai ? "Reference cartridge และ annotated diff" : "Reference cartridge and annotated diff"}</h2>
        <pre className="overflow-x-auto rounded-md bg-slate-950 p-4 text-sm text-slate-50"><code>{codecampAPKReference.code}</code></pre>
        <ul className="list-disc space-y-2 pl-6">{codecampAPKReference.annotations[thai ? "th" : "en"].map((annotation) => <li key={annotation}>{annotation}</li>)}</ul>
      </section>
      <p role="status" aria-live="polite">{session.summary ? (thai ? `Session ที่บันทึก: ${session.summary.sessionId}` : `Durable session: ${session.summary.sessionId}`) : (thai ? "กำลังเริ่ม session…" : "Starting durable session…")}</p>
      {session.summary?.assessedCheckpointResults[checkpoint.checkpointId] ? <p className="rounded-md bg-green-50 p-3 text-green-900">{thai ? "ผลที่ server บันทึก" : "Server-restored assessment"}: {session.summary.assessedCheckpointResults[checkpoint.checkpointId].isCorrect ? (thai ? "ผ่าน" : "passed") : (thai ? "ยังไม่ผ่าน" : "not yet passed")} ({thai ? "ครั้งที่" : "attempt"} {session.summary.assessedCheckpointResults[checkpoint.checkpointId].attemptNumber})</p> : null}
      {session.error ? <div role="alert" className="space-y-2 text-red-700"><p>{session.error.message}</p><button type="button" className="min-h-11 rounded-md border px-4" onClick={session.retry}>{thai ? "ลองเริ่ม session อีกครั้ง" : "Retry durable session"}</button></div> : null}
    </LessonShell>
  );
}

function GuidedPractice({ locale }: { locale: string }) {
  const thai = locale.toLowerCase().startsWith("th");
  const activity = useMemo(() => createCodecampAPKTutorialActivity(locale), [locale]);
  const session = useDurableActivitySession(activity);
  const [prepared, setPrepared] = useState<PreparedTutorialReport | null>(null);
  const [localResultText, setLocalResultText] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportStored, setReportStored] = useState(false);
  const prepare = trpc.activity.prepareTutorial.useMutation();
  const reissue = trpc.activity.reissueTutorialCredential.useMutation();
  const report = trpc.activity.reportTutorial.useMutation();

  const prepareSnapshot = async () => {
    if (!session.sessionId) return;
    setReportError(null);
    setReportStored(false);
    setPrepared(await prepare.mutateAsync({ sessionId: session.sessionId, submissionId: crypto.randomUUID(), repositoryId: codecampAPKUnit.wedo.manifest.repositoryId, stepId: "wedo.apk.manifest" }));
  };

  const flushQueuedReports = useCallback(async () => {
    if (!session.sessionId) return { uploaded: [], failed: 0, expired: 0 };
    const queue = createStorageTutorialReportQueue(globalThis.localStorage);
    return flushTutorialReportQueue(queue, new Date().toISOString(), async (_endpoint, body) => {
      const response = await report.mutateAsync(body as TutorialReportInput);
      session.setSummary(response.session);
      return response.verified;
    }, async (entry) => {
      const queued = entry.request as TutorialReportInput;
      const refreshed = await reissue.mutateAsync({ sessionId: session.sessionId!, submissionId: queued.submissionId, repositoryStateId: queued.repositoryStateId, stepId: queued.localResult.stepId });
      return { ...queued, credential: refreshed.credential };
    });
  }, [reissue, report, session]);

  const submitVerifiedResult = async () => {
    if (!prepared || !session.sessionId) return;
    try {
      setReportError(null);
      const localResult = JSON.parse(localResultText) as TutorialReportInput["localResult"];
      const request: TutorialReportInput = { submissionId: prepared.submissionId, repositoryStateId: prepared.repositoryStateId, credential: prepared.credential, localResult };
      const queue = createStorageTutorialReportQueue(globalThis.localStorage);
      await enqueueTutorialReport(queue, "trpc:activity.reportTutorial", request, new Date().toISOString());
      const result = await flushQueuedReports();
      if (result.uploaded.length === 0) throw new Error("Report queued for automatic retry when the connection returns");
      setReportStored(true);
      setPrepared(null);
      setLocalResultText("");
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "Invalid tutorial result");
    }
  };

  useEffect(() => {
    if (!session.sessionId) return;
    const retryQueued = () => { void flushQueuedReports(); };
    retryQueued();
    globalThis.addEventListener?.("online", retryQueued);
    return () => globalThis.removeEventListener?.("online", retryQueued);
  }, [flushQueuedReports, session.sessionId]);

  return (
    <LessonShell locale={locale} eyebrow="We Do" title={thai ? "เติม APK manifest" : "Complete the APK manifest"}>
      <p>{thai ? "ทำงานใน guided fixture แล้วส่งผลด้วย CLI ปุ่มตรวจด้านล่างอ่านเฉพาะผล repository ที่ server ตรวจและบันทึกแล้ว" : "Work in the guided fixture and report it with the CLI. The check button below reads only server-verified, durably stored repository evidence."}</p>
      <pre className="overflow-x-auto rounded-md bg-slate-950 p-4 text-sm text-slate-50"><code>cd packages/codecamp-knowledge/fixtures/apk-guided{"\n"}../../node_modules/.bin/tutorial-check --step wedo.apk.manifest</code></pre>
      <section aria-labelledby="repository-report-heading" className="space-y-3 rounded-xl border bg-white p-5 shadow-sm">
        <h2 id="repository-report-heading" className="text-xl font-semibold">{thai ? "ส่งผล repository ที่ตรวจแล้ว" : "Report verified repository evidence"}</h2>
        <p>{thai ? "เตรียม snapshot ก่อนรัน checker แล้ววาง JSON ที่ checker ส่งออก" : "Prepare a server-captured snapshot before running the checker, then paste its JSON output."}</p>
        <button type="button" disabled={!session.sessionId || prepare.isPending} className="min-h-11 rounded-md border px-4 disabled:opacity-60" onClick={() => void prepareSnapshot()}>{prepare.isPending ? (thai ? "กำลังเตรียม…" : "Preparing…") : (thai ? "1. เตรียม snapshot ใหม่" : "1. Prepare a fresh snapshot")}</button>
        {prepared ? <p role="status" className="text-sm text-green-800">{thai ? "snapshot พร้อมแล้ว" : "Snapshot prepared"}: <code>{prepared.repositoryStateId}</code></p> : null}
        <label className="block font-medium" htmlFor="tutorial-result">{thai ? "JSON จาก tutorial-check" : "tutorial-check JSON"}</label>
        <textarea id="tutorial-result" value={localResultText} onChange={(event) => setLocalResultText(event.target.value)} rows={8} className="w-full rounded-md border p-3 font-mono text-sm" />
        <button type="button" disabled={!prepared || !localResultText || report.isPending || reissue.isPending} className="min-h-11 rounded-md bg-blue-700 px-4 text-white disabled:opacity-60" onClick={() => void submitVerifiedResult()}>{report.isPending || reissue.isPending ? (thai ? "กำลังส่ง…" : "Reporting…") : (thai ? "2. ตรวจซ้ำและบันทึกบน server" : "2. Re-verify and store on server")}</button>
        {reportStored ? <p role="status" className="text-green-800">{thai ? "บันทึกหลักฐานแล้ว" : "Evidence stored"}</p> : null}
        {reportError || prepare.error || report.error || reissue.error ? <p role="alert" className="text-red-700">{reportError ?? prepare.error?.message ?? report.error?.message ?? reissue.error?.message}</p> : null}
      </section>
      <TutorialActivityPanel
        activity={activity}
        locale={locale}
        completedStepIds={session.summary?.completedStepIds ?? []}
        onSupportUsage={session.appendSupport}
        renderResource={() => <div role="img" aria-label={thai ? "ขอบเขต React host และ APK" : "React host and APK boundary"} className="rounded-md bg-blue-50 p-4">React host → APK cartridge → validated result</div>}
        onCheck={async (stepId) => {
          const refreshed = await session.existing.refetch();
          const result = refreshed.data?.assessedTutorialResults[stepId];
          const passed = result?.isCorrect === true;
          return { passed, checks: codecampAPKUnit.wedo.manifest.steps.find((step) => step.stepId === stepId)!.checks.map(({ checkId }) => ({ checkId, passed })) };
        }}
      />
      <p role="status" aria-live="polite">{session.summary ? (thai ? `Session ที่บันทึก: ${session.summary.sessionId}` : `Durable session: ${session.summary.sessionId}`) : (thai ? "กำลังเริ่ม session…" : "Starting durable session…")}</p>
      {session.summary ? <p className="rounded-md bg-blue-50 p-3">{thai ? "ตัวช่วยที่ server บันทึก" : "Server-restored support use"}: {thai ? "คำใบ้" : "hints"} {session.summary.support.hintsUsed}; {thai ? "เฉลยช่วยเหลือ" : "reveals"} {session.summary.support.revealsUsed}</p> : null}
      {session.error ? <div role="alert" className="space-y-2 text-red-700"><p>{session.error.message}</p><button type="button" className="min-h-11 rounded-md border px-4" onClick={session.retry}>{thai ? "ลองเริ่ม session อีกครั้ง" : "Retry durable session"}</button></div> : null}
    </LessonShell>
  );
}

function IndependentTransfer({ locale }: { locale: string }) {
  const thai = locale.toLowerCase().startsWith("th");
  return (
    <LessonShell locale={locale} eyebrow="You Do" title={thai ? "สร้างเกมเรียงประโยค" : "Build a sentence-sorting cartridge"}>
      <p>{codecampAPKUnit.youdo.brief[locale] ?? codecampAPKUnit.youdo.brief.en}</p>
      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">{thai ? "เกณฑ์ PR" : "PR rubric"}</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6">{codecampAPKUnit.youdo.rubric.dimensions.map((dimension) => <li key={dimension.dimensionId}><strong>{Math.round(dimension.weight * 100)}%</strong> — {dimension.criteria[locale] ?? dimension.criteria.en}</li>)}</ul>
        <h2 className="mt-6 text-xl font-semibold">{thai ? "การตรวจที่จำเป็น" : "Required checks"}</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6">{(codecampAPKUnit.youdo.requiredCheckLabels[locale] ?? codecampAPKUnit.youdo.requiredCheckLabels.en).map((check) => <li key={check}>{check}</li>)}</ul>
      </section>
      <p>{thai ? "ส่ง PR จาก repository ของ Unit 20 การประเมินที่ผ่านจะเข้าสู่ mastery evidence และตารางทบทวน FSRS" : "Submit the PR from the Unit 20 repository. Passing assessment projects mastery evidence and the canonical FSRS review schedule."}</p>
      <Link href="/module/apk-game-creation" className="inline-flex min-h-11 items-center rounded-md bg-blue-700 px-4 text-white">{thai ? "เปิด repository และส่ง PR" : "Open repository and submit PR"}</Link>
    </LessonShell>
  );
}

/** Renders the requested production APK lesson stage. */
export function APKUnitLesson({ locale, stage }: { locale: string; stage: number }) {
  const thai = locale.toLowerCase().startsWith("th");
  const access = trpc.codecamp.moduleBySlug.useQuery({ slug: "apk-game-creation" }, { retry: false });
  if (![1, 2, 3].includes(stage)) return <main className="container py-12"><h1 className="text-2xl font-bold">{thai ? "ไม่พบบทเรียน" : "Lesson not found"}</h1></main>;
  if (access.isLoading) return <main className="container py-12"><p role="status">{thai ? "กำลังตรวจสิทธิ์ Unit 20…" : "Checking Unit 20 access…"}</p></main>;
  if (!access.data) return <main className="container space-y-3 py-12"><h1 className="text-2xl font-bold">{thai ? "ยังไม่ได้มอบหมาย Unit 20" : "Unit 20 is not assigned"}</h1><p className="text-muted-foreground">{thai ? "หลักสูตรเดิมของคุณยังคงลำดับเดิม" : "Your existing curriculum sequence remains unchanged."}</p><button type="button" className="min-h-11 rounded-md border px-4" onClick={() => void access.refetch()}>{thai ? "ตรวจสิทธิ์อีกครั้ง" : "Check access again"}</button></main>;
  if (stage === 1) return <WorkedExample locale={locale} />;
  if (stage === 2) return <GuidedPractice locale={locale} />;
  return <IndependentTransfer locale={locale} />;
}
