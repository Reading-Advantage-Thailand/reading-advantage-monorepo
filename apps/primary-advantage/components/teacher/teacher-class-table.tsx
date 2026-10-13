"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useIntlFormatter } from "@/lib/intl-locale";
import { DownloadIcon, SearchIcon } from "lucide-react";
import type { ClassStatus, ClassTrend, TeacherClassRow } from "@reading-advantage/domain/primary-home";
import { calendarDayKey } from "@reading-advantage/domain/calendar-day";
import { toTeacherClassCsv } from "@reading-advantage/domain/teacher-class-csv";
import { Link } from "@/i18n/navigation";
import { Panel, RpgButton, RpgLink } from "@/components/rpg/chrome";
import { cn } from "@/lib/utils";

/** The sortable columns, in the order of the table. */
const SORT_KEYS = ["name", "students", "active", "level", "xp", "trend", "status"] as const;
/** A sortable column of the class table. */
type SortKey = (typeof SORT_KEYS)[number];
/** The sort order of a column. */
type SortDir = "asc" | "desc";

/** The columns where the first tap shows the biggest value first. */
const FIRST_DESC: ReadonlySet<SortKey> = new Set(["students", "active", "level", "xp"]);
/** Sort rank of a status: the classes that need a look come first. */
const STATUS_RANK: Record<ClassStatus, number> = { needsAttention: 0, someQuiet: 1, onTrack: 2, noStudents: 3 };
/** Sort rank of a trend: down, flat, up. */
const TREND_RANK: Record<ClassTrend, number> = { down: 0, flat: 1, up: 2 };
/** Chip look and symbol of each status. The symbol and the word carry the meaning, not the colour. */
const STATUS_VIEW: Record<ClassStatus, { mark: string; className: string }> = {
  onTrack: { mark: "✓", className: "bg-[#3f9c4f] text-white" },
  someQuiet: { mark: "~", className: "bg-[#e8b534] text-[#3b2a1a]" },
  needsAttention: { mark: "!", className: "bg-[#d64545] text-white" },
  noStudents: { mark: "–", className: "bg-[#8a7a66] text-white" },
};
/** Symbol and look of each trend. */
const TREND_VIEW: Record<ClassTrend, { mark: string; className: string }> = {
  up: { mark: "▲", className: "text-[#2f7d3b]" },
  flat: { mark: "▬", className: "text-[var(--cq-ink-soft)]" },
  down: { mark: "▼", className: "text-[#b3321f]" },
};
const SOFT = "text-[var(--cq-ink-soft)]";
const FIELD = "flex min-h-12 items-center gap-2 rounded-xl border-2 border-[var(--cq-parchment-edge)] bg-white/60 px-3 text-base";

/**
 * Reads the value that a column sorts on.
 * @param row The class row.
 * @param key The column.
 * @returns A string or a number.
 */
function sortValue(row: TeacherClassRow, key: SortKey): string | number {
  switch (key) {
    case "name":
      return row.name.toLowerCase();
    case "students":
      return row.students;
    case "active":
      return row.active7d;
    case "level":
      return row.averageLevel ?? -1;
    case "xp":
      return row.xp7d;
    case "trend":
      return TREND_RANK[row.trend];
    case "status":
      return STATUS_RANK[row.status];
  }
}

/**
 * Sorts the class rows. A tie keeps the order of the class name.
 * @param rows The rows to sort.
 * @param key The column.
 * @param dir The order.
 * @returns A new sorted array.
 */
function sortRows(rows: readonly TeacherClassRow[], key: SortKey, dir: SortDir): TeacherClassRow[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = sortValue(a, key);
    const y = sortValue(b, key);
    if (x !== y) return (x < y ? -1 : 1) * sign;
    return a.name.localeCompare(b.name);
  });
}

/**
 * The class table of the teacher home: a search box, a sort control, the CSV download, and one row
 * for each class. At 768 px and more it is a table with sort buttons in the column heads; below
 * that each class is a card. A tap on the class name opens the class page.
 * @param props.rows The class rows of the teacher, parsed on the server.
 * @param props.className Extra classes for the panel.
 * @returns The panel.
 */
export function TeacherClassTable({ rows, className }: { rows: readonly TeacherClassRow[]; className?: string }) {
  const t = useTranslations("TeacherHome");
  const tUi = useTranslations("TeacherUi");
  const format = useIntlFormatter();
  const headingId = useId();
  const selectId = useId();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "name", dir: "asc" });

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sortRows(
      rows.filter((row) => row.name.toLowerCase().includes(needle)),
      sort.key,
      sort.dir,
    );
  }, [rows, query, sort]);

  /** Sorts on a column: a second tap on the same column changes the order. */
  const chooseColumn = (key: SortKey) =>
    setSort((now) => (now.key === key ? { key, dir: now.dir === "asc" ? "desc" : "asc" } : { key, dir: FIRST_DESC.has(key) ? "desc" : "asc" }));

  /** Downloads the shown rows, in the shown order, as a CSV file (with a UTF-8 byte order mark for Excel) named with the Bangkok date. */
  const downloadCsv = () => {
    const url = URL.createObjectURL(new Blob(["\uFEFF", toTeacherClassCsv(shown)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `teacher-classes-${calendarDayKey(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Safari cancels the download when the URL is revoked at once.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const sortDirText = sort.dir === "asc" ? t("table.sortAsc") : t("table.sortDesc");
  const num = (value: number) => format.number(value);
  const level = (value: number | null) => (value === null ? "—" : format.number(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
  const activeText = (row: TeacherClassRow) => (row.students ? t("table.activeOf", { active: row.active7d, students: row.students, percent: row.activeRate7d }) : "—");
  const statusChip = (status: ClassStatus) => (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-bold whitespace-nowrap", STATUS_VIEW[status].className)}>
      <span aria-hidden="true">{STATUS_VIEW[status].mark}</span>
      {t(`table.status.${status}`)}
    </span>
  );
  const trendMark = (trend: ClassTrend) => (
    <span className={cn("inline-flex items-center gap-1 font-bold whitespace-nowrap", TREND_VIEW[trend].className)}>
      <span aria-hidden="true">{TREND_VIEW[trend].mark}</span>
      {t(`table.trend.${trend}`)}
    </span>
  );

  return (
    <Panel aria-labelledby={headingId} className={cn("min-w-0", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="text-xl font-bold">
          {t("classes.heading")}
        </h2>
        {rows.length ? (
          <RpgButton small tone="wood" onClick={downloadCsv} aria-label={t("table.csvLabel")}>
            <DownloadIcon className="size-4" aria-hidden="true" />
            {t("table.csv")}
          </RpgButton>
        ) : null}
      </div>

      {!rows.length ? (
        <div className="flex flex-col items-start gap-2">
          <p className="font-bold">{t("classes.empty")}</p>
          <p className={SOFT}>{t("classes.emptyHint")}</p>
          <RpgLink href="/teacher/my-classes" tone="gold">
            {t("classes.goToClasses")}
          </RpgLink>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className={cn(FIELD, "flex-1")}>
              <SearchIcon className="size-4 shrink-0" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label={t("table.searchLabel")}
                placeholder={t("table.search")}
                className="min-w-0 flex-1 bg-transparent outline-none"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2 md:hidden">
              <label htmlFor={selectId} className={cn("text-[15px]", SOFT)}>
                {t("table.sortBy")}
              </label>
              <select
                id={selectId}
                value={sort.key}
                onChange={(event) => {
                  const key = event.target.value as SortKey;
                  setSort({ key, dir: FIRST_DESC.has(key) ? "desc" : "asc" });
                }}
                className={cn(FIELD, "min-w-0 flex-1 basis-32 font-semibold")}
              >
                {SORT_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {t(`table.columns.${key}`)}
                  </option>
                ))}
              </select>
              <RpgButton small tone="wood" aria-label={`${sortDirText}: ${t("table.sortDirection")}`} onClick={() => chooseColumn(sort.key)}>
                {sortDirText}
              </RpgButton>
            </div>
          </div>

          {shown.length === 0 ? (
            <p className={SOFT} role="status">
              {t("table.noMatch", { query: query.trim() })}
            </p>
          ) : (
            <>
              <table className="hidden w-full text-left text-[15px] whitespace-nowrap md:table">
                <thead>
                  <tr className={cn("text-[13px]", SOFT)}>
                    {SORT_KEYS.map((key) => (
                      <th
                        key={key}
                        scope="col"
                        aria-sort={key === sort.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                        className={cn("py-1 font-semibold", key === "name" ? "pr-2" : "px-1.5", ["students", "level", "xp"].includes(key) && "text-right")}
                      >
                        <button
                          type="button"
                          onClick={() => chooseColumn(key)}
                          className={cn("inline-flex min-h-12 items-center gap-1 font-semibold", key === sort.key && "text-[var(--cq-ink)]")}
                        >
                          {t(`table.columns.${key}`)}
                          <span aria-hidden="true" className="w-3 text-[11px]">
                            {key === sort.key ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                          </span>
                        </button>
                      </th>
                    ))}
                    <th scope="col" className="py-1 pl-2">
                      <span className="sr-only">{t("table.actions")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((row) => (
                    <tr key={row.id} className="border-t border-[rgba(107,84,56,0.35)]">
                      <th scope="row" className="max-w-[13rem] py-2 pr-2 font-bold whitespace-normal">
                        <ClassNameLink row={row} />
                        {row.grade !== null ? <span className={cn("block text-[13px] font-normal", SOFT)}>{t("classes.grade", { grade: row.grade })}</span> : null}
                      </th>
                      <td className="px-1.5 text-right tabular-nums">{num(row.students)}</td>
                      <td className="px-1.5 tabular-nums">{activeText(row)}</td>
                      <td className="px-1.5 text-right tabular-nums">{level(row.averageLevel)}</td>
                      <td className="px-1.5 text-right tabular-nums">{num(row.xp7d)}</td>
                      <td className="px-1.5">{trendMark(row.trend)}</td>
                      <td className="px-1.5">{statusChip(row.status)}</td>
                      <td className="py-2 pl-2 text-right">
                        <RpgLink small href={`/teacher/class-roster/${row.id}#class-login`} tone="gold" aria-label={tUi("startClassFor", { name: row.name })}>
                          {tUi("startClass")}
                        </RpgLink>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <ul className="flex flex-col gap-3 md:hidden">
                {shown.map((row) => (
                  <li key={row.id} className="flex flex-col gap-2 rounded-xl border border-[rgba(107,84,56,0.35)] bg-[rgba(255,255,255,0.35)] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-col">
                        <ClassNameLink row={row} large />
                        {row.grade !== null ? <span className={cn("text-[13px]", SOFT)}>{t("classes.grade", { grade: row.grade })}</span> : null}
                      </div>
                      {statusChip(row.status)}
                    </div>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[15px]">
                      <Value label={t("table.columns.students")}>{num(row.students)}</Value>
                      <Value label={t("table.columns.active")}>{activeText(row)}</Value>
                      <Value label={t("table.columns.level")}>{level(row.averageLevel)}</Value>
                      <Value label={t("table.columns.xp")}>
                        {num(row.xp7d)} {trendMark(row.trend)}
                      </Value>
                    </dl>
                    <RpgLink href={`/teacher/class-roster/${row.id}#class-login`} tone="gold" className="w-full" aria-label={tUi("startClassFor", { name: row.name })}>
                      {tUi("startClass")}
                    </RpgLink>
                  </li>
                ))}
              </ul>
              <p className={cn("text-[13px]", SOFT)}>{t("table.legend")}</p>
            </>
          )}
        </>
      )}
    </Panel>
  );
}

/**
 * The class name as a link to the class page (48 px tall).
 * @param props.row The class row.
 * @param props.large True for the bigger card text.
 * @returns The link.
 */
function ClassNameLink({ row, large }: { row: TeacherClassRow; large?: boolean }) {
  return (
    <Link
      href={`/teacher/class-roster/${row.id}`}
      className={cn("inline-flex min-h-12 items-center break-words underline-offset-4 hover:underline", large && "text-lg font-bold")}
    >
      {row.name}
    </Link>
  );
}

/**
 * One label and value pair of a class card.
 * @param props.label The label.
 * @param props.children The value.
 * @returns The pair.
 */
function Value({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className={cn("text-[13px]", SOFT)}>{label}</dt>
      <dd className="font-bold tabular-nums">{children}</dd>
    </div>
  );
}
