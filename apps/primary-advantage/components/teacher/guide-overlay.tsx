"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeftIcon, ChevronRightIcon, LifeBuoyIcon } from "lucide-react";
import type { LessonGuideStep } from "@reading-advantage/domain/primary-books";
import { markStepDoneAction } from "@/actions/class-books";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GAME_STEPS } from "./guide-steps";
import { TEACHER_ACTION, TEACHER_CARD } from "./teacher-shell";
import { useClassBookAction } from "./class-book-pacing-controls";

/**
 * The live guide of a lesson (FR-9): one workbook step at a time with the teacher actions, the
 * teacher language, a tip, and a mark-done button; opens on the first step the class has not done.
 * @param props.classBookId The class book.
 * @param props.lessonNumber The lesson.
 * @param props.steps The 13 guide steps in the guide language.
 * @param props.stepsDone Workbook steps the class has done.
 * @param props.gamesHref Where the games link opens.
 * @returns The overlay panel, or nothing without steps.
 */
export function GuideOverlay({ classBookId, lessonNumber, steps, stepsDone, gamesHref = "/teacher/game-challenges" }: { classBookId: string; lessonNumber: number; steps: LessonGuideStep[]; stepsDone: number[]; gamesHref?: string }) {
  const t = useTranslations("TeacherUi.classBook");
  const { pending, run } = useClassBookAction();
  const firstOpen = steps.findIndex((step) => !stepsDone.includes(step.step));
  const [index, setIndex] = useState(firstOpen === -1 ? Math.max(0, steps.length - 1) : firstOpen);
  const step = steps[index];
  if (!step) return null;
  const done = stepsDone.includes(step.step);
  const tip = step.watchFor[0] ?? step.teacherLanguage[0] ?? null;
  return (
    <section aria-labelledby="live-guide" className={cn(TEACHER_CARD, "border-primary/40")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="live-guide" className="flex items-center gap-2 text-lg font-semibold">
          <LifeBuoyIcon className="text-primary size-5" aria-hidden="true" />
          {t("guide.live")}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t("guide.stepOf", { step: step.step, total: steps.length })} · {t("period", { period: step.period })}
        </p>
      </div>
      {firstOpen === -1 ? <p role="status" className="text-sm font-medium">{t("guide.allDone")}</p> : null}
      <h3 className="text-xl font-bold">{t("stepLabel", { step: step.step, title: step.title })}</h3>
      {step.teacherActions.length ? (
        <ol className="list-decimal space-y-1 pl-5">
          {step.teacherActions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ol>
      ) : null}
      {step.teacherLanguage.length ? (
        <ul className="space-y-1">
          {step.teacherLanguage.map((line) => (
            <li key={line} className="font-article text-lg">
              {line}
            </li>
          ))}
        </ul>
      ) : null}
      {tip ? (
        <p className="bg-(--accent-amber-light) rounded-xl px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
          <span className="font-semibold">{t("guide.tip")}: </span>
          {tip}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" className={TEACHER_ACTION} disabled={index === 0} onClick={() => setIndex(index - 1)}>
          <ChevronLeftIcon aria-hidden="true" />
          {t("lesson.previous")}
        </Button>
        <Button type="button" variant="outline" className={TEACHER_ACTION} disabled={index >= steps.length - 1} onClick={() => setIndex(index + 1)}>
          {t("lesson.next")}
          <ChevronRightIcon aria-hidden="true" />
        </Button>
        <Button type="button" variant={done ? "ghost" : "default"} className={TEACHER_ACTION} disabled={pending} aria-pressed={done} onClick={() => run(() => markStepDoneAction(classBookId, lessonNumber, step.step, !done))}>
          {done ? t("guide.undo") : t("guide.markDone")}
        </Button>
        {GAME_STEPS.includes(step.step) ? (
          <Link href={gamesHref} className="text-primary min-h-11 inline-flex items-center text-sm font-medium underline-offset-4 hover:underline">
            {t("guide.games")}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
