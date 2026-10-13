import { useTranslations } from "next-intl";
import { useIntlFormatter } from "@/lib/intl-locale";
import type { PlatformTotals } from "@reading-advantage/domain/primary-dashboards";
import { Meter, Panel } from "@/components/rpg/chrome";

/**
 * One total: a label that names the metric, the value, an optional meter, and a note.
 * @param props The label, the value, the meter pair (value, max), and the note.
 * @returns The tile.
 */
function Tile({ label, value, sub, meter }: { label: string; value: string; sub?: string; meter?: [number, number] }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-[rgba(107,84,56,0.35)] bg-[rgba(255,255,255,0.35)] p-3">
      <span className="text-[13px] leading-tight font-semibold text-[var(--cq-ink-soft)]">{label}</span>
      <span className="text-3xl leading-none font-bold tabular-nums">{value}</span>
      {meter ? <Meter value={meter[0]} max={meter[1] || 1} label={label} tone="green" thin /> : null}
      {sub ? <span className="text-[13px] text-[var(--cq-ink-soft)]">{sub}</span> : null}
    </div>
  );
}

/**
 * The totals strip of the system dashboard (FR-8): six totals, and a note with the count of
 * students without a school only when that count is more than 0.
 * @param props.totals The platform totals.
 * @returns The panel.
 */
export function PlatformTotalsPanel({ totals }: { totals: PlatformTotals }) {
  const t = useTranslations("SystemDashboard.totals");
  const format = useIntlFormatter();
  const num = (value: number) => format.number(value);
  const hasStudents = totals.students > 0;
  const percent = hasStudents ? Math.round((100 * totals.activeStudents) / totals.students) : 0;
  return (
    <Panel aria-labelledby="system-dash-totals">
      <h2 id="system-dash-totals" className="text-xl font-bold">
        {t("heading")}
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Tile label={t("schools")} value={num(totals.schools)} />
        <Tile label={t("students")} value={num(totals.students)} />
        <Tile label={t("teachers")} value={num(totals.teachers)} />
        <Tile
          label={t("active")}
          value={num(totals.activeStudents)}
          meter={hasStudents ? [totals.activeStudents, totals.students] : undefined}
          sub={hasStudents ? t("activeSub", { active: num(totals.activeStudents), total: num(totals.students), percent }) : undefined}
        />
        <Tile label={t("articles")} value={num(totals.articlesOpened)} />
        <Tile
          label={t("seatsUsed")}
          value={totals.seats ? num(totals.seatsUsed) : "—"}
          meter={totals.seats ? [totals.seatsUsed, totals.seats] : undefined}
          sub={totals.seats ? t("seatsOf", { seats: num(totals.seats) }) : t("noLicense")}
        />
      </div>
      {totals.studentsWithoutSchool > 0 ? (
        <p className="flex items-start gap-2 rounded-xl border border-[#d6a23c] bg-[rgba(232,181,52,0.25)] px-3 py-2 text-[15px]" role="note">
          <span aria-hidden="true" className="font-bold">
            !
          </span>
          <span>{t("withoutSchool", { count: totals.studentsWithoutSchool })}</span>
        </p>
      ) : null}
    </Panel>
  );
}
