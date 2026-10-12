import { useTranslations } from "next-intl";
import { Meter, Panel } from "@/components/rpg/chrome";
import type { SchoolDashboard } from "@reading-advantage/domain/primary-dashboards";

/**
 * One key number: a label that names the metric, the value, an optional meter, and a note.
 * @param props The label, the value, the meter pair (value, max), and the note.
 * @returns The tile.
 */
function Tile({ label, value, sub, meter }: { label: string; value: string; sub: string; meter?: [number, number] }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-[rgba(107,84,56,0.35)] bg-[rgba(255,255,255,0.35)] p-3">
      <span className="text-[13px] leading-tight font-semibold text-[var(--cq-ink-soft)]">{label}</span>
      <span className="text-3xl leading-none font-bold tabular-nums">{value}</span>
      {meter ? <Meter value={meter[0]} max={meter[1] || 1} label={label} tone="green" thin /> : null}
      <span className="text-[13px] text-[var(--cq-ink-soft)]">{sub}</span>
    </div>
  );
}

/**
 * The key numbers panel (FR-3). A school with no students shows one sentence and no zeros.
 * @param props.kpis The key numbers of the school in the range.
 * @returns The panel.
 */
export function KeyNumbers({ kpis }: { kpis: SchoolDashboard["kpis"] }) {
  const t = useTranslations("AdminDashboard.keyNumbers");
  const empty = kpis.activeStudents.total === 0;
  return (
    <Panel aria-labelledby="admin-dash-key">
      <h2 id="admin-dash-key" className="text-xl font-bold">
        {t("heading")}
      </h2>
      {empty ? (
        <p className="text-[var(--cq-ink-soft)]">{t("empty")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Tile
            label={t("activeStudents")}
            value={kpis.activeStudents.active.toLocaleString("en-US")}
            meter={[kpis.activeStudents.active, kpis.activeStudents.total]}
            sub={t("activeStudentsSub", { total: kpis.activeStudents.total, percent: kpis.activeStudents.percent ?? 0 })}
          />
          <Tile label={t("activeTeachers")} value={String(kpis.activeTeachers.active)} sub={t("activeTeachersSub", { total: kpis.activeTeachers.total })} />
          <Tile label={t("classes")} value={String(kpis.classesWithActivity.active)} sub={t("classesSub", { total: kpis.classesWithActivity.total })} />
          <Tile label={t("articles")} value={kpis.articlesOpened.toLocaleString("en-US")} sub={t("articlesSub")} />
          <Tile label={t("xp")} value={kpis.xpEarned.toLocaleString("en-US")} sub={t("xpSub")} />
          <Tile label={t("newStudents")} value={String(kpis.newStudents)} sub={t("newStudentsSub")} />
        </div>
      )}
    </Panel>
  );
}
