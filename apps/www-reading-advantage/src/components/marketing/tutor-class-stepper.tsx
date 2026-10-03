"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

export type TutorPhase = { title: string; description: string };

type TutorClassStepperProps = {
  phases: readonly TutorPhase[];
  /** Number of printed workbook steps. Phases after this index are added phases. */
  printedCount: number;
  printedGroup: string;
  addedGroup: string;
  /** Text with a "#" placeholder for the printed step number. */
  stepOf: string;
  addedTag: string;
  prev: string;
  next: string;
  listLabel: string;
};

/**
 * Interactive walk through the phases of one Tutor Advantage class.
 * Uses the tabs pattern: arrow keys, Home and End move between phases.
 * @param props The phase list, the number of printed steps, and localized labels.
 * @returns The stepper.
 */
export function TutorClassStepper({
  phases,
  printedCount,
  printedGroup,
  addedGroup,
  stepOf,
  addedTag,
  prev,
  next,
  listLabel,
}: TutorClassStepperProps) {
  const [active, setActive] = useState(0);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const last = phases.length - 1;

  const go = (index: number, focus = false) => {
    const clamped = Math.max(0, Math.min(last, index));
    setActive(clamped);
    if (focus) refs.current[clamped]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowDown: index + 1,
      ArrowLeft: index - 1,
      ArrowUp: index - 1,
      Home: 0,
      End: last,
    };
    if (event.key in keys) {
      event.preventDefault();
      go(keys[event.key], true);
    }
  };

  const phase = phases[active];
  const isPrinted = active < printedCount;

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-7">
        <div role="tablist" aria-label={listLabel} className="space-y-6">
          {[
            { label: printedGroup, from: 0, to: printedCount },
            { label: addedGroup, from: printedCount, to: phases.length },
          ].map((group) => (
            <div key={group.label}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {phases.slice(group.from, group.to).map((item, offset) => {
                  const index = group.from + offset;
                  const selected = index === active;
                  const printed = index < printedCount;
                  return (
                    <button
                      key={item.title}
                      ref={(node) => {
                        refs.current[index] = node;
                      }}
                      type="button"
                      role="tab"
                      id={`tutor-phase-tab-${index}`}
                      aria-selected={selected}
                      aria-controls="tutor-phase-panel"
                      tabIndex={selected ? 0 : -1}
                      onClick={() => go(index)}
                      onKeyDown={(event) => onKeyDown(event, index)}
                      className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2 motion-reduce:transition-none ${
                        selected
                          ? "border-emerald-900 bg-emerald-900 text-white"
                          : printed
                            ? "border-emerald-200 bg-white text-emerald-950 hover:border-emerald-600"
                            : "border-dashed border-emerald-600 bg-emerald-50 text-emerald-950 hover:border-emerald-800"
                      }`}
                    >
                      {printed ? (
                        <span
                          aria-hidden="true"
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                            selected ? "bg-white text-emerald-900" : "bg-emerald-100 text-emerald-900"
                          }`}
                        >
                          {index + 1}
                        </span>
                      ) : (
                        <span aria-hidden="true" className="text-base leading-none">
                          +
                        </span>
                      )}
                      {item.title}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-5">
        <div
          role="tabpanel"
          id="tutor-phase-panel"
          aria-labelledby={`tutor-phase-tab-${active}`}
          aria-live="polite"
          className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8 lg:sticky lg:top-24"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
            {isPrinted ? stepOf.replace("#", String(active + 1)) : addedTag}
          </p>
          <h3 className="mb-4 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            {phase.title}
          </h3>
          <p className="min-h-[5.5rem] text-base leading-relaxed text-slate-700 md:text-lg">
            {phase.description}
          </p>
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-emerald-100 pt-5">
            <button
              type="button"
              onClick={() => go(active - 1)}
              disabled={active === 0}
              className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border border-emerald-300 px-3 text-sm font-medium text-emerald-950 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {prev}
            </button>
            <span className="whitespace-nowrap text-sm tabular-nums text-site-body">
              {active + 1} / {phases.length}
            </span>
            <button
              type="button"
              onClick={() => go(active + 1)}
              disabled={active === last}
              className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full bg-emerald-900 px-3 text-sm font-medium text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2 disabled:opacity-40"
            >
              {next}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
