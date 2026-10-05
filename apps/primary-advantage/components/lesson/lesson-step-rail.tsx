"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckIcon, ChevronDownIcon, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const stepName = t("rail.stepName", { step: current, total, name: steps[current - 1] ?? "" });

  return (
    <section aria-labelledby={titleId} className="bg-card rounded-2xl border p-4 shadow-sm xl:sticky xl:top-22">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={titleId} className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            {t("progress.title")}
          </h2>
          <p className="font-semibold">{stepName}</p>
        </div>
        {timer ? (
          <div className="bg-muted flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1">
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
        className="mt-3 flex gap-1"
      >
        {steps.map((step, index) => (
          <span
            key={step}
            className={cn(
              "h-2 flex-1 rounded-full",
              index + 1 < current ? "bg-primary" : index + 1 === current ? "bg-brand-400" : "bg-muted",
            )}
          />
        ))}
      </div>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen(!open)}
        className="text-primary mt-2 flex min-h-12 w-full items-center justify-between rounded-lg text-sm font-medium xl:hidden"
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
                  done ? "bg-primary text-primary-foreground" : active ? "bg-brand-400 text-brand-900" : "bg-muted text-muted-foreground",
                )}
              >
                {done ? <CheckIcon className="size-3" /> : number}
              </span>
              <span className={cn(active ? "font-semibold" : done ? "text-muted-foreground" : "text-foreground")}>
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
