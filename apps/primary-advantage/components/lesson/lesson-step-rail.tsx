"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckIcon, ChevronDownIcon, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSound } from "@/hooks/use-sound";

/** Props for LessonStepRail. */
export interface LessonStepRailProps {
  /** Step names in order. */
  steps: string[];
  /** The open step, from 1. */
  current: number;
  /** The lesson timer, when it runs (rendered once). */
  timer?: React.ReactNode;
}

/**
 * Lesson progress rail. On phones and tablets it sits above the task: the open step, a
 * progress bar with one segment per step, and a 48 px toggle for the full step list. From
 * 1280 px it is the sidebar with the list always open. The current step has aria-current.
 * @param props The step names, the open step, and the timer.
 * @returns The rail.
 */
export function LessonStepRail({ steps, current, timer }: LessonStepRailProps) {
  const t = useTranslations("Lesson");
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const listId = useId();
  const total = steps.length;
  // A short sound when the lesson moves to another step (FR-9); none on the first render.
  const { play } = useSound();
  const previous = useRef(current);
  useEffect(() => {
    if (previous.current !== current) play("phaseChange");
    previous.current = current;
  }, [current, play]);
  const stepName = t("rail.stepName", { step: current, total, name: steps[current - 1] ?? "" });

  return (
    <section aria-labelledby={titleId} className="cq-panel xl:sticky xl:top-22">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={titleId} className="cq-muted text-xs font-semibold tracking-wide uppercase">
            {t("progress.title")}
          </h2>
          <p className="font-semibold">{stepName}</p>
        </div>
        {timer ? (
          <div className="lg-chip flex shrink-0 items-center gap-1.5">
            <Timer className="size-4" aria-hidden="true" />
            {timer}
          </div>
        ) : null}
      </div>

      <div
        role="progressbar"
        aria-labelledby={titleId}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-valuetext={stepName}
        className="lf-steps mt-3"
      >
        {steps.map((step, index) => (
          <span key={step} data-state={index + 1 < current ? "done" : index + 1 === current ? "current" : "todo"} />
        ))}
      </div>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen(!open)}
        className="mt-2 flex min-h-12 w-full items-center justify-between rounded-lg text-sm font-bold text-[var(--cq-wood-dark)] underline-offset-4 hover:underline xl:hidden"
      >
        {open ? t("rail.hideSteps") : t("rail.showSteps")}
        <ChevronDownIcon className={cn("size-4", open && "rotate-180")} aria-hidden="true" />
      </button>

      <ol id={listId} className={cn("mt-3 flex-col gap-2", open ? "flex" : "hidden", "xl:flex")}>
        {steps.map((step, index) => {
          const number = index + 1;
          const done = number < current;
          const active = number === current;
          return (
            <li key={step} aria-current={active ? "step" : undefined} className="flex items-center gap-3 text-sm">
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold",
                  done ? "lf-good border-2" : active ? "lf-medal border-2" : "cq-muted border-2 border-[var(--cq-parchment-edge)] bg-[var(--cq-parchment-2)]",
                )}
              >
                {done ? <CheckIcon className="size-3" /> : number}
              </span>
              <span className={cn(active ? "font-bold" : done ? "cq-muted" : undefined)}>
                {number}. {step}
              </span>
              {done ? <span className="sr-only">{t("rail.done")}</span> : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
