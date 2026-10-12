import { useTranslations } from "next-intl";
import { Meter, Panel } from "@/components/rpg/chrome";
import type { TeacherRow } from "@reading-advantage/domain/primary-dashboards";

/**
 * The teachers table (FR-8). The domain sorts the rows by engagement; a teacher without students
 * shows "No students" at the end.
 * @param props.teachers The teacher rows.
 * @returns The panel.
 */
export function TeachersTable({ teachers }: { teachers: TeacherRow[] }) {
  const t = useTranslations("AdminDashboard.teachers");
  return (
    <Panel aria-labelledby="admin-dash-teachers">
      <h2 id="admin-dash-teachers" className="text-xl font-bold">
        {t("heading")}
      </h2>
      {teachers.length === 0 ? (
        <p className="text-[var(--cq-ink-soft)]">{t("empty")}</p>
      ) : (
        <table className="w-full text-left text-[15px]">
          <thead>
            <tr className="text-[13px] text-[var(--cq-ink-soft)]">
              <th className="py-1 pr-2 font-semibold">{t("teacher")}</th>
              <th className="hidden px-2 text-right font-semibold sm:table-cell">{t("classes")}</th>
              <th className="px-2 text-right font-semibold">{t("activeOfStudents")}</th>
              <th className="pl-2 text-right font-semibold sm:w-[34%] sm:text-left">{t("engagement")}</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((row) => {
              const name = row.name ?? t("unnamed");
              return (
                <tr key={row.teacherId} className="border-t border-[rgba(107,84,56,0.35)]">
                  <th scope="row" className="py-2 pr-2 font-bold whitespace-nowrap">
                    {name}
                    <span className="block text-[13px] font-normal text-[var(--cq-ink-soft)] sm:hidden">{t("classCount", { count: row.classes })}</span>
                  </th>
                  <td className="hidden px-2 text-right tabular-nums sm:table-cell">{row.classes}</td>
                  <td className="px-2 text-right tabular-nums">{row.students ? `${row.active} / ${row.students}` : "-"}</td>
                  <td className="pl-2">
                    {row.engagementPercent === null ? (
                      <span className="text-[var(--cq-ink-soft)]">{t("noStudents")}</span>
                    ) : (
                      <div className="flex items-center justify-end gap-2 sm:justify-start">
                        <Meter value={row.active} max={row.students} label={`${name}: ${t("engagement")}`} tone="green" thin className="hidden w-full sm:block" />
                        <span className="w-10 text-right font-bold tabular-nums">{row.engagementPercent}%</span>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
