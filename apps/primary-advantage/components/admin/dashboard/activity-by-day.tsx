import { useTranslations } from "next-intl";
import { Panel } from "@/components/rpg/chrome";
import { cn } from "@/lib/utils";
import type { SchoolDashboard } from "@reading-advantage/domain/primary-dashboards";

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/**
 * Finds the weekday offset (Monday = 0) of a "YYYY-MM-DD" day.
 * @param day The day.
 * @returns The offset from 0 to 6.
 */
function mondayOffset(day: string): number {
  return (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
}

/**
 * The activity by day panel (FR-9): a Monday-first calendar grid with one cell for each day of
 * the range (the count in the cell, today with a gold outline), and three summary numbers.
 * @param props.activity The activity by day output.
 * @param props.endDay The last day of the range (today in Bangkok).
 * @param props.schoolEmpty True when the school has no students.
 * @returns The panel.
 */
export function ActivityByDay({ activity, endDay, schoolEmpty }: { activity: SchoolDashboard["activityByDay"]; endDay: string; schoolEmpty: boolean }) {
  const t = useTranslations("AdminDashboard.activity");
  const days = activity.days;
  const max = Math.max(1, ...days.map((d) => d.activeStudents));
  const lead = days.length ? mondayOffset(days[0].day) : 0;
  const shade = (n: number) => (n === 0 ? "rgba(107,84,56,0.10)" : `rgba(79,180,90,${0.25 + 0.65 * (n / max)})`);
  return (
    <Panel aria-labelledby="admin-dash-activity">
      <h2 id="admin-dash-activity" className="text-xl font-bold">
        {t("heading")}
      </h2>
      {schoolEmpty || days.length === 0 ? (
        <p className="text-[var(--cq-ink-soft)]">{t("empty")}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,26rem)_1fr]">
          <div className="flex flex-col gap-1" role="table" aria-label={t("aria", { count: days.length })}>
            <div className="grid grid-cols-7 gap-1 text-center text-[12px] font-semibold text-[var(--cq-ink-soft)]" role="row">
              {WEEKDAYS.map((key) => (
                <span key={key} role="columnheader">
                  {t(`weekdays.${key}`)}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1" role="rowgroup">
              {Array.from({ length: lead }, (_, i) => (
                <div key={`lead-${i}`} aria-hidden="true" />
              ))}
              {days.map((d) => (
                <div
                  key={d.day}
                  role="cell"
                  aria-label={t("cell", { day: d.day, count: d.activeStudents })}
                  data-today={d.day === endDay ? "true" : undefined}
                  className={cn(
                    "relative flex aspect-square flex-col items-center justify-center rounded-md border border-[rgba(107,84,56,0.3)]",
                    d.day === endDay && "outline outline-[3px] outline-offset-1 outline-[var(--cq-gold)]",
                  )}
                  style={{ background: shade(d.activeStudents) }}
                >
                  <span aria-hidden="true" className="absolute top-0.5 left-1 text-[10px] leading-none text-[var(--cq-ink-soft)]">
                    {Number(d.day.slice(8))}
                  </span>
                  <span aria-hidden="true" className="text-base font-bold tabular-nums">
                    {d.activeStudents}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-3 self-start lg:grid-cols-1">
            <div>
              <dt className="text-[13px] font-semibold text-[var(--cq-ink-soft)]">{t("events")}</dt>
              <dd className="text-2xl font-bold tabular-nums">{activity.totalEvents.toLocaleString("en-US")}</dd>
            </div>
            <div>
              <dt className="text-[13px] font-semibold text-[var(--cq-ink-soft)]">{t("peak")}</dt>
              <dd className="text-2xl font-bold tabular-nums">{activity.peakDay?.activeStudents ?? 0}</dd>
            </div>
            <div>
              <dt className="text-[13px] font-semibold text-[var(--cq-ink-soft)]">{t("average")}</dt>
              <dd className="text-2xl font-bold tabular-nums">{Math.round(activity.dailyAverage)}</dd>
            </div>
          </dl>
        </div>
      )}
    </Panel>
  );
}
