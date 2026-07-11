"use client";

import type { Activity } from "@reading-advantage/activity-runtime/core";
import { useMemo, useState } from "react";

/** Server-verified result returned after checking one tutorial step. */
export type TutorialStepVerification = {
  passed: boolean;
  checks: Array<{ checkId: string; passed: boolean }>;
};

/** Support interaction emitted before a hint or reveal becomes visible. */
export type TutorialSupportUsage = {
  stepId: string;
  kind: "hint" | "reveal";
  supportId: string;
};

/** Props for the reusable framework-neutral tutorial step surface. */
export type TutorialActivityPanelProps = {
  activity: Activity;
  locale: string;
  onCheck(stepId: string): Promise<TutorialStepVerification>;
  onSupportUsage?(usage: TutorialSupportUsage): void | Promise<void>;
  completedStepIds?: string[];
  defaultCompletedStepIds?: string[];
  onCompletedStep?(stepId: string): void | Promise<void>;
  renderResource?(resourceId: string): React.ReactNode;
};

const labels = {
  en: { progress: "Tutorial progress", check: "Run verified checks", checking: "Checking repository…", passed: "Step verified", failed: "Checks still need work", hint: "Show next hint", reveal: "Show reveal", complete: "Tutorial complete", checkResults: "Check results" },
  th: { progress: "ความคืบหน้าบทฝึก", check: "ตรวจสอบ repository", checking: "กำลังตรวจสอบ repository…", passed: "ผ่านขั้นตอนแล้ว", failed: "ยังต้องแก้ไขบางจุด", hint: "แสดงคำใบ้ถัดไป", reveal: "แสดงคำตอบช่วยเหลือ", complete: "จบบทฝึกแล้ว", checkResults: "ผลการตรวจสอบ" },
} as const;

/**
 * Renders ordered tutorial instructions, fading support, and server-verified check feedback.
 * @param props Authored activity, locale, verification callback, and optional resource renderer.
 * @returns An accessible tutorial region that never computes assessed correctness locally.
 */
export function TutorialActivityPanel({ activity, locale, onCheck, onSupportUsage, completedStepIds: controlledCompletedStepIds, defaultCompletedStepIds = [], onCompletedStep, renderResource }: TutorialActivityPanelProps) {
  const copy = locale.toLowerCase().startsWith("th") ? labels.th : labels.en;
  const steps = useMemo(() => [...activity.tutorialSteps].sort((left, right) => left.order - right.order), [activity.tutorialSteps]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hintCount, setHintCount] = useState(0);
  const [revealCount, setRevealCount] = useState(0);
  const [verification, setVerification] = useState<TutorialStepVerification | null>(null);
  const [checking, setChecking] = useState(false);
  const [internalCompletedStepIds, setInternalCompletedStepIds] = useState<string[]>(defaultCompletedStepIds);
  const completedStepIds = controlledCompletedStepIds ?? internalCompletedStepIds;
  const step = steps[activeIndex];

  if (!step) return null;
  const text = (localized: Record<string, string>) => localized[locale] ?? localized.en ?? Object.values(localized)[0] ?? "";
  const completed = completedStepIds.includes(step.stepId);
  const tutorialComplete = completedStepIds.length === steps.length;

  const showSupport = async (kind: "hint" | "reveal", supportId: string) => {
    await onSupportUsage?.({ stepId: step.stepId, kind, supportId });
    if (kind === "hint") setHintCount((count) => count + 1);
    else setRevealCount((count) => count + 1);
  };

  const runChecks = async () => {
    setChecking(true);
    try {
      const result = await onCheck(step.stepId);
      setVerification(result);
      if (result.passed && !completed) {
        if (controlledCompletedStepIds === undefined) setInternalCompletedStepIds((ids) => [...ids, step.stepId]);
        await onCompletedStep?.(step.stepId);
      }
    } finally {
      setChecking(false);
    }
  };

  const advance = () => {
    setActiveIndex((index) => Math.min(index + 1, steps.length - 1));
    setHintCount(0);
    setRevealCount(0);
    setVerification(null);
  };

  return (
    <section aria-labelledby="tutorial-panel-title" className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
      <header className="space-y-2">
        <p id="tutorial-panel-title" className="text-sm font-semibold uppercase tracking-wide text-blue-700">{text(activity.title)}</p>
        <div role="progressbar" aria-label={copy.progress} aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={completedStepIds.length} className="h-2 overflow-hidden rounded bg-slate-200">
          <div className="h-full bg-blue-700" style={{ width: `${(completedStepIds.length / steps.length) * 100}%` }} />
        </div>
        <p>{activeIndex + 1}/{steps.length}: {text(step.instruction)}</p>
      </header>

      {step.resourceRefs.map(({ resourceId }) => <div key={resourceId}>{renderResource?.(resourceId) ?? <code>{resourceId}</code>}</div>)}

      <ul aria-label={copy.checkResults} className="space-y-1">
        {step.checks.map((check) => {
          const result = verification?.checks.find(({ checkId }) => checkId === check.checkId);
          return <li key={check.checkId}>{result ? (result.passed ? "✓" : "✕") : "○"} <code>{check.checkId}</code></li>;
        })}
      </ul>

      <div className="flex flex-wrap gap-2">
        {hintCount < step.hints.length ? <button type="button" className="min-h-11 rounded-md border px-4 focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => void showSupport("hint", step.hints[hintCount]!.hintId)}>{copy.hint}</button> : null}
        {revealCount < step.reveals.length ? <button type="button" className="min-h-11 rounded-md border px-4 focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => void showSupport("reveal", step.reveals[revealCount]!.revealId)}>{copy.reveal}</button> : null}
        <button type="button" disabled={checking} className="min-h-11 rounded-md bg-blue-700 px-4 text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60" onClick={() => void runChecks()}>{checking ? copy.checking : copy.check}</button>
      </div>

      {step.hints.slice(0, hintCount).map((hint) => <aside key={hint.hintId} className="rounded-md bg-amber-50 p-3"><strong>{copy.hint}:</strong> {text(hint.text)}</aside>)}
      {step.reveals.slice(0, revealCount).map((reveal) => <aside key={reveal.revealId} className="rounded-md bg-rose-50 p-3"><strong>{copy.reveal}:</strong> {text(reveal.text)}</aside>)}
      <p role="status" aria-live="polite">{tutorialComplete ? copy.complete : verification ? (verification.passed ? copy.passed : copy.failed) : ""}</p>
      {verification?.passed && activeIndex < steps.length - 1 ? <button type="button" className="min-h-11 rounded-md border px-4" onClick={advance}>Next</button> : null}
    </section>
  );
}
