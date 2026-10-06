"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckIcon } from "lucide-react";
import type { WorkbookStep } from "@reading-advantage/domain/primary-books/step-map";
import { markLessonTaughtAction, markStepDoneAction, setCurrentLessonAction, type ClassBookActionState } from "@/actions/class-books";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
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
 * The two lesson actions of the lesson plan (FR-3): make a lesson current and mark it taught.
 * @param props.classBookId The class book.
 * @param props.lessonNumber The lesson.
 * @param props.current True for the lesson the pointer is on.
 * @param props.taught True when the lesson is marked taught.
 * @returns The buttons.
 */
export function LessonActions({ classBookId, lessonNumber, current, taught }: { classBookId: string; lessonNumber: number; current: boolean; taught: boolean }) {
  const t = useTranslations("TeacherUi.classBook");
  const { pending, run } = useClassBookAction();
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
