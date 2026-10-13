import { useTranslations } from "next-intl";
import { useIntlFormatter } from "@/lib/intl-locale";
import type { TeacherHome } from "@reading-advantage/domain/primary-home";
import { Meter, Panel } from "@/components/rpg/chrome";
import { cn } from "@/lib/utils";

const SOFT = "text-[var(--cq-ink-soft)]";

/**
 * One number of the strip: a label, a big value, an optional meter, and an optional hint.
 * @param props.label The label.
 * @param props.value The value text.
 * @param props.hint A short line under the value.
 * @param props.meter The meter as a value and a maximum.
 * @param props.alert True shows the value in red.
 * @returns The tile.
 */
function Tile({ label, value, hint, meter, alert }: { label: string; value: string; hint?: string; meter?: [number, number]; alert?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-[rgba(107,84,56,0.35)] bg-[rgba(255,255,255,0.35)] p-3">
      <span className={cn("text-[13px] leading-tight font-semibold", SOFT)}>{label}</span>
      <span className={cn("text-3xl leading-none font-bold tabular-nums", alert && "text-[#b3321f]")}>{value}</span>
      {meter ? <Meter value={meter[0]} max={meter[1] || 1} label={label} tone="green" thin /> : null}
      {hint ? <span className={cn("text-[13px]", SOFT)}>{hint}</span> : null}
    </div>
  );
}

/**
 * The summary strip of the teacher home: eight numbers on one parchment panel. Row 1 is "your
 * classes" (classes, students, active students in 30 days, average level). Row 2 is "activity"
 * (active today, completed today, open assignments, need help).
 * @param props.home The teacher home data.
 * @returns The panel.
 */
export function TeacherSummaryStrip({ home }: { home: TeacherHome }) {
  const t = useTranslations("TeacherHome");
  const format = useIntlFormatter();
  const none = home.studentCount === 0;
  return (
    <Panel aria-label={t("summary")}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label={t("stats.classes")} value={format.number(home.classes.length)} />
        <Tile label={t("stats.students")} value={format.number(home.studentCount)} />
        <Tile
          label={t("stats.activeStudents")}
          value={format.number(home.activeStudents30d)}
          meter={none ? undefined : [home.activeStudents30d, home.studentCount]}
          hint={none ? t("stats.noStudentsYet") : t("stats.activeStudentsOf", { active: home.activeStudents30d, total: home.studentCount, percent: home.engagementRate30d })}
        />
        <Tile
          label={t("stats.averageLevel")}
          value={home.averageLevel === null ? "—" : format.number(home.averageLevel, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          hint={home.averageLevel === null ? t("stats.noStudentsYet") : t("stats.averageLevelHint")}
        />
        <Tile label={t("stats.activeToday")} value={format.number(home.activeToday)} hint={none ? undefined : t("stats.activeTodayOf", { count: home.studentCount })} />
        <Tile label={t("stats.completedToday")} value={format.number(home.completedToday)} hint={t("stats.completedTodayHint")} />
        <Tile label={t("stats.openAssignments")} value={format.number(home.openAssignmentCount)} />
        <Tile
          label={t("stats.needsHelp")}
          value={format.number(home.needsHelpCount)}
          alert={home.needsHelpCount > 0}
          hint={home.needsHelpCount > 0 ? t("stats.needsHelpHint") : undefined}
        />
      </div>
    </Panel>
  );
}
