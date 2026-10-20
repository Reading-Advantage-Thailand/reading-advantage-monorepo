import type { ReactNode } from "react";

/**
 * The title of a lesson step in the Chibi Quest skin: a wooden sign with the step icon and the
 * title (the h1 of the step), and a parchment strip with the line under it. It reads on the
 * clearing scene of the student lesson and on the parchment ground of the teacher rehearsal.
 * @param props.icon The step icon (decoration only).
 * @param props.title The step title.
 * @param props.subtitle The line under the title.
 * @param props.children Extra content under the line, such as the feature chips.
 * @returns The step header.
 */
export function TaskHeader({ icon, title, subtitle, children }: { icon?: ReactNode; title: ReactNode; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <h1 className="cq-sign max-w-full text-2xl leading-tight md:text-3xl">
        {icon ? <span aria-hidden="true" className="inline-flex shrink-0 [&>svg]:size-7">{icon}</span> : null}
        <span className="min-w-0">{title}</span>
      </h1>
      {subtitle || children ? (
        <div className="cq-panel flex w-full max-w-2xl flex-col items-center gap-3 text-base md:text-lg">
          {subtitle ? <p>{subtitle}</p> : null}
          {children}
        </div>
      ) : null}
    </div>
  );
}
