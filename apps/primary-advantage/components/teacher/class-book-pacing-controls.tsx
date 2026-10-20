"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckIcon, RotateCcwIcon } from "lucide-react";
import type { WorkbookStep } from "@reading-advantage/domain/primary-books/step-map";
import { markLessonTaughtAction, markStepDoneAction, setCurrentLessonAction, teachLessonAgainAction, type ClassBookActionState } from "@/actions/class-books";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Panel, RpgButton } from "@/components/rpg/chrome";
import { cn } from "@/lib/utils";
import { TEACHER_ACTION } from "./teacher-shell";

/**
 * Runs a class book action, refreshes the page on success, and shows the error on failure.
 * @returns The pending flag and the runner.
 */
export function useClassBookAction() {
  const t = useTranslations("TeacherUi.classBook");
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (action: () => Promise<ClassBookActionState>) =>
    start(async () => {
      const result = await action();
      if (result?.success) router.refresh();
      else toast.error(t("actionError"));
    });
  return { pending, run };
}

/**
 * The lesson actions of the lesson plan (FR-3): make a lesson current, mark it taught, and teach it again.
 * @param props.classBookId The class book.
 * @param props.lessonNumber The lesson.
 * @param props.current True for the lesson the pointer is on.
 * @param props.taught True when the lesson is marked taught.
 * @param props.canTeachAgain True when the lesson has a run to repeat (taught, a step done, or earlier runs).
 * @returns The buttons and the Teach again dialog.
 */
export function LessonActions({ classBookId, lessonNumber, current, taught, canTeachAgain = false }: { classBookId: string; lessonNumber: number; current: boolean; taught: boolean; canTeachAgain?: boolean }) {
  const t = useTranslations("TeacherUi.classBook");
  const { pending, run } = useClassBookAction();
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {current ? null : (
        <Button type="button" variant="outline" size="sm" className={TEACHER_ACTION} disabled={pending} onClick={() => run(() => setCurrentLessonAction(classBookId, lessonNumber))}>
          {t("setCurrent")}
        </Button>
      )}
      {taught ? null : (
        <Button type="button" variant="default" size="sm" className={TEACHER_ACTION} disabled={pending} onClick={() => run(() => markLessonTaughtAction(classBookId, lessonNumber))}>
          {t("markTaught")}
        </Button>
      )}
      {canTeachAgain ? (
        <RpgButton tone="iron" small disabled={pending} aria-haspopup="dialog" onClick={() => setConfirming(true)}>
          <RotateCcwIcon aria-hidden="true" className="size-4" />
          {t("teachAgain")}
        </RpgButton>
      ) : null}
      {confirming ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Panel role="alertdialog" aria-modal="true" aria-labelledby={`teach-again-title-${lessonNumber}`} className="w-full max-w-md">
            <h2 id={`teach-again-title-${lessonNumber}`} className="text-2xl font-bold">
              {t("teachAgainTitle", { number: lessonNumber })}
            </h2>
            <p className="text-base">{t("teachAgainBody1", { number: lessonNumber })}</p>
            <p className="text-base">{t("teachAgainBody2")}</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <RpgButton tone="iron" className="w-full sm:w-auto" disabled={pending} autoFocus onClick={() => setConfirming(false)}>
                {t("teachAgainCancel")}
              </RpgButton>
              <RpgButton
                tone="gold"
                className="w-full sm:w-auto"
                disabled={pending}
                onClick={() => {
                  setConfirming(false);
                  run(() => teachLessonAgainAction(classBookId, lessonNumber));
                }}
              >
                {t("teachAgain")}
              </RpgButton>
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The 13 workbook steps of the current lesson as toggle buttons (the workbook-first lock).
 * @param props.classBookId The class book.
 * @param props.lessonNumber The lesson.
 * @param props.steps The workbook steps.
 * @param props.stepsDone The steps already done.
 * @returns The toggle list.
 */
export function StepChecklist({ classBookId, lessonNumber, steps, stepsDone }: { classBookId: string; lessonNumber: number; steps: readonly WorkbookStep[]; stepsDone: number[] }) {
  const t = useTranslations("TeacherUi.classBook");
  const { pending, run } = useClassBookAction();
  const done = new Set(stepsDone);
  return (
    <ul aria-label={t("steps")} className="grid gap-2 sm:grid-cols-2">
      {steps.map((step) => {
        const isDone = done.has(step.step);
        return (
          <li key={step.step}>
            <button
              type="button"
              aria-pressed={isDone}
              disabled={pending}
              onClick={() => run(() => markStepDoneAction(classBookId, lessonNumber, step.step, !isDone))}
              className={cn(
                "flex min-h-11 w-full items-center gap-2 rounded-xl border px-3 text-left text-sm",
                isDone ? "border-primary bg-primary/10" : "bg-background",
              )}
            >
              <span aria-hidden="true" className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border", isDone && "bg-primary text-primary-foreground border-primary")}>
                {isDone ? <CheckIcon className="size-3.5" /> : null}
              </span>
              <span className="min-w-0 flex-1">{t("stepLabel", { step: step.step, title: step.title })}</span>
              <span className="text-muted-foreground text-xs">{t("period", { period: step.period })}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
