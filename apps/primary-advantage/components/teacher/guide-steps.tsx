import type { getTranslations } from "next-intl/server";
import { StatusChip } from "@reading-advantage/ui";
import type { LessonGuidePeriod, LessonGuideStep } from "@reading-advantage/domain/primary-books";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Workbook steps that use the games: the bell-ringer (1) and the practice steps (9, 10). FR-13. */
export const GAME_STEPS = [1, 9, 10];

/**
 * One list of the guide (teacher actions, teacher language, student actions, or watch-fors).
 * @param props.heading The list heading.
 * @param props.items The lines; nothing renders for an empty list.
 * @returns The list.
 */
function GuideList({ heading, items }: { heading: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-col gap-1">
      <h5 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">{heading}</h5>
      <ul className="list-disc space-y-0.5 pl-5 text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The teacher guide (FR-8): the 13 workbook steps grouped into the four periods with the
 * teacher actions, the teacher language, the student actions, the watch-fors, the full script,
 * and a games link on the bell-ringer and practice steps (FR-13).
 * @param props.guide The periods with their steps, in the guide language of the locale.
 * @param props.stepsDone Workbook steps the class has done; marks them. Empty on the manual.
 * @param props.gamesHref Where the games link opens.
 * @param props.t The `TeacherUi.classBook` translator of the page.
 * @returns The guide sections.
 */
export function GuideSteps({ guide, stepsDone = [], gamesHref = "/teacher/game-challenges", t }: { guide: LessonGuidePeriod[]; stepsDone?: number[]; gamesHref?: string; t: Awaited<ReturnType<typeof getTranslations<"TeacherUi.classBook">>> }) {
  if (!guide.length) return <p className="text-muted-foreground text-sm">{t("guide.empty")}</p>;
  return (
    <div className="flex flex-col gap-6">
      {guide.map((group) => (
        <section key={group.period} aria-labelledby={`guide-period-${group.period}`} className="flex flex-col gap-3">
          <h3 id={`guide-period-${group.period}`} className="text-base font-semibold">
            {t("period", { period: group.period })}
          </h3>
          <ol className="flex flex-col gap-3">
            {group.steps.map((step) => (
              <GuideStepItem key={step.step} step={step} done={stepsDone.includes(step.step)} gamesHref={gamesHref} labels={{ step: t("stepLabel", { step: step.step, title: step.title }), done: t("guide.done"), teacherActions: t("guide.teacherActions"), teacherLanguage: t("guide.teacherLanguage"), studentActions: t("guide.studentActions"), watchFor: t("guide.watchFor"), script: t("guide.script"), games: t("guide.games") }} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

/**
 * One workbook step of the guide.
 * @param props.step The step.
 * @param props.done True when the class has done the step.
 * @param props.gamesHref Where the games link opens.
 * @param props.labels The translated labels.
 * @returns The list item.
 */
function GuideStepItem({ step, done, gamesHref, labels }: { step: LessonGuideStep; done: boolean; gamesHref: string; labels: Record<"step" | "done" | "teacherActions" | "teacherLanguage" | "studentActions" | "watchFor" | "script" | "games", string> }) {
  return (
    <li className={cn("flex flex-col gap-3 rounded-xl border p-3", done && "border-primary bg-primary/5")}>
      <h4 className="flex flex-wrap items-center gap-2 font-semibold">
        {labels.step}
        {done ? <StatusChip tone="success">{labels.done}</StatusChip> : null}
      </h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <GuideList heading={labels.teacherActions} items={step.teacherActions} />
        <GuideList heading={labels.teacherLanguage} items={step.teacherLanguage} />
        <GuideList heading={labels.studentActions} items={step.studentActions} />
        <GuideList heading={labels.watchFor} items={step.watchFor} />
      </div>
      {step.scriptMd ? (
        <details className="rounded-lg border">
          <summary className="min-h-11 cursor-pointer px-3 py-2 text-sm font-medium">{labels.script}</summary>
          <pre className="font-sans whitespace-pre-wrap px-3 pb-3 text-sm">{step.scriptMd}</pre>
        </details>
      ) : null}
      {GAME_STEPS.includes(step.step) ? (
        <Link href={gamesHref} className="text-primary min-h-11 inline-flex w-fit items-center text-sm font-medium underline-offset-4 hover:underline">
          {labels.games}
        </Link>
      ) : null}
    </li>
  );
}
