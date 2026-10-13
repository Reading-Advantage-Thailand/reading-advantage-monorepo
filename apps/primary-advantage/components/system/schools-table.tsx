"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { SearchIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { PlatformSchoolRow, PlatformSchoolStatus } from "@reading-advantage/domain/primary-dashboards";
import { Panel, RpgLink } from "@/components/rpg/chrome";
import { cn } from "@/lib/utils";
import { useIntlFormatter } from "@/lib/intl-locale";

/** The sortable columns, in the order of the table. */
const SORT_KEYS = ["name", "active", "articles", "seats", "last", "status"] as const;
/** A sortable column of the schools table. */
type SortKey = (typeof SORT_KEYS)[number];
/** The sort order of a column. */
type SortDir = "asc" | "desc";
/** The sort state: null keeps the order of the domain (quiet first, then name). */
type SortState = { key: SortKey; dir: SortDir } | null;

/** The columns where the first tap shows the biggest value first. */
const FIRST_DESC: ReadonlySet<SortKey> = new Set(["active", "articles", "seats", "last"]);
/** Sort rank of a status: quiet schools come first. */
const STATUS_RANK: Record<PlatformSchoolStatus, number> = { quiet: 0, active: 1, no_students: 2 };
/** Chip look and mark of each status. The mark and the word carry the meaning, not the colour. */
const STATUS_VIEW: Record<PlatformSchoolStatus, { mark: string; className: string }> = {
  quiet: { mark: "!", className: "bg-[#d64545] text-white" },
  active: { mark: "✓", className: "bg-[#3f9c4f] text-white" },
  no_students: { mark: "–", className: "bg-[#8a7a66] text-white" },
};
/** The key of the message for each status. */
const STATUS_KEY: Record<PlatformSchoolStatus, "quiet" | "active" | "noStudents"> = { quiet: "quiet", active: "active", no_students: "noStudents" };
const SOFT = "text-[var(--cq-ink-soft)]";
const FIELD = "flex min-h-12 items-center gap-2 rounded-xl border-2 border-[var(--cq-parchment-edge)] bg-white/60 px-3 text-base";

/**
 * Reads the value that a column sorts on.
 * @param row The school row.
 * @param key The column.
 * @returns A string or a number. A missing value gives the lowest value.
 */
function sortValue(row: PlatformSchoolRow, key: SortKey): string | number {
  switch (key) {
    case "name":
      return row.name;
    case "active":
      return row.activeStudents;
    case "articles":
      return row.articlesOpened;
    case "seats":
      return row.seats ? row.seatsUsed / row.seats : -1;
    case "last":
      return row.lastActivityAt ?? "";
    case "status":
      return STATUS_RANK[row.status];
  }
}

/**
 * Sorts the school rows. A tie keeps the order of the school name.
 * @param rows The rows to sort.
 * @param sort The sort state. Null keeps the order of the rows (the domain order).
 * @returns A new array.
 */
function sortRows(rows: readonly PlatformSchoolRow[], sort: SortState): PlatformSchoolRow[] {
  if (!sort) return [...rows];
  const sign = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = sortValue(a, sort.key);
    const y = sortValue(b, sort.key);
    if (typeof x === "string" && typeof y === "string" && sort.key === "name") return x.localeCompare(y) * sign;
    if (x !== y) return (x < y ? -1 : 1) * sign;
    return a.name.localeCompare(b.name);
  });
}

/**
 * The link target of a school row: the school choice of the admin dashboard.
 * @param row The school row.
 * @returns The path.
 */
function schoolHref(row: PlatformSchoolRow): string {
  return `/admin/dashboard?school=${encodeURIComponent(row.id)}`;
}

/**
 * The schools table of the system dashboard: a search box, a sort control, and one row for each
 * school. At 768 px and more it is a table with sort buttons in the column heads; below that each
 * school is a card. The default order is the order of the rows (quiet first, then name).
 * @param props.rows The school rows, parsed on the server, in the domain order.
 * @returns The panel.
 */
export function SchoolsTable({ rows }: { rows: readonly PlatformSchoolRow[] }) {
  const t = useTranslations("SystemDashboard");
  const format = useIntlFormatter();
  const headingId = useId();
  const selectId = useId();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>(null);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sortRows(
      rows.filter((row) => row.name.toLowerCase().includes(needle)),
      sort,
    );
  }, [rows, query, sort]);

  /** Sorts on a column: a second tap on the same column changes the order. */
  const chooseColumn = (key: SortKey) =>
    setSort((now) => (now?.key === key ? { key, dir: now.dir === "asc" ? "desc" : "asc" } : { key, dir: FIRST_DESC.has(key) ? "desc" : "asc" }));

  const num = (value: number) => format.number(value);
  const activeText = (row: PlatformSchoolRow) => (row.students ? t("table.activeOf", { active: row.activeStudents, students: row.students, percent: row.activePercent ?? 0 }) : "—");
  const seatsText = (row: PlatformSchoolRow) =>
    row.seats === null ? t("table.noLicense") : row.students === 0 ? "—" : t("table.seatsOf", { used: num(row.seatsUsed), total: num(row.seats) });
  // The day key is already a Bangkok calendar day, so it prints in UTC without a shift.
  const lastText = (row: PlatformSchoolRow) =>
    row.lastActivityDay ? format.dateTime(new Date(`${row.lastActivityDay}T00:00:00Z`), { day: "numeric", month: "short", timeZone: "UTC" }) : t("table.none");
  const statusChip = (status: PlatformSchoolStatus) => (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-bold whitespace-nowrap", STATUS_VIEW[status].className)}>
      <span aria-hidden="true">{STATUS_VIEW[status].mark}</span>
      {t(`status.${STATUS_KEY[status]}`)}
    </span>
  );

  return (
    <Panel aria-labelledby={headingId} className="min-w-0">
      <h2 id={headingId} className="text-xl font-bold">
        {t("table.heading")}
      </h2>

      {!rows.length ? (
        <div className="flex flex-col items-start gap-2">
          <p className="font-bold">{t("table.empty")}</p>
          <p className={SOFT}>{t("table.emptyHint")}</p>
          <RpgLink href="/system/schools" tone="gold">
            {t("table.goToSchools")}
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
                value={sort?.key ?? ""}
                onChange={(event) => {
                  const key = event.target.value as SortKey | "";
                  setSort(key ? { key, dir: FIRST_DESC.has(key) ? "desc" : "asc" } : null);
                }}
                className={cn(FIELD, "min-w-0 flex-1 basis-32 font-semibold")}
              >
                <option value="">{t("table.sortDefault")}</option>
                {SORT_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {t(`table.columns.${key}`)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label={t("table.sortDirection")}
                disabled={!sort}
                onClick={() => sort && chooseColumn(sort.key)}
                className={cn(FIELD, "justify-center font-semibold disabled:opacity-50")}
              >
                {sort?.dir === "desc" ? t("table.sortDesc") : t("table.sortAsc")}
              </button>
            </div>
          </div>

          {shown.length === 0 ? (
            <p className={SOFT} role="status">
              {t("table.noMatch", { query: query.trim() })}
            </p>
          ) : (
            <>
              <table className="hidden w-full text-left text-[15px] md:table">
                <thead>
                  <tr className={cn("text-[13px]", SOFT)}>
                    {SORT_KEYS.map((key) => (
                      <th
                        key={key}
                        scope="col"
                        aria-sort={key === sort?.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                        className={cn("py-1 font-semibold", key === "name" ? "pr-2" : "px-1.5", key === "articles" && "text-right")}
                      >
                        <button
                          type="button"
                          onClick={() => chooseColumn(key)}
                          className={cn("inline-flex min-h-12 items-center gap-1 font-semibold", key === sort?.key && "text-[var(--cq-ink)]")}
                        >
                          {t(`table.columns.${key}`)}
                          <span aria-hidden="true" className="w-3 text-[11px]">
                            {key === sort?.key ? (sort.dir === "asc" ? "▲" : "▼") : ""}
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
                      <th scope="row" className="max-w-[15rem] py-2 pr-2 font-bold">
                        <SchoolNameLink row={row} />
                      </th>
                      <td className="px-1.5 whitespace-nowrap tabular-nums">{activeText(row)}</td>
                      <td className="px-1.5 text-right tabular-nums">{num(row.articlesOpened)}</td>
                      <td className={cn("px-1.5 whitespace-nowrap tabular-nums", row.seats === null && SOFT)}>{seatsText(row)}</td>
                      <td className={cn("px-1.5 whitespace-nowrap", !row.lastActivityDay && SOFT)}>{lastText(row)}</td>
                      <td className="px-1.5">{statusChip(row.status)}</td>
                      <td className="py-2 pl-2 text-right">
                        <RpgLink small href={schoolHref(row)} tone="gold" aria-label={t("table.openFor", { name: row.name })}>
                          {t("table.open")}
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
                      <SchoolNameLink row={row} large />
                      {statusChip(row.status)}
                    </div>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[15px]">
                      <Value label={t("table.columns.active")}>{activeText(row)}</Value>
                      <Value label={t("table.columns.articles")}>{num(row.articlesOpened)}</Value>
                      <Value label={t("table.columns.seats")}>{seatsText(row)}</Value>
                      <Value label={t("table.columns.last")}>{lastText(row)}</Value>
                    </dl>
                    <RpgLink href={schoolHref(row)} tone="gold" className="w-full" aria-label={t("table.openFor", { name: row.name })}>
                      {t("table.openCard")}
                    </RpgLink>
                  </li>
                ))}
              </ul>
              <p className={cn("text-[13px]", SOFT)}>{t("table.footnote")}</p>
            </>
          )}
        </>
      )}
    </Panel>
  );
}

/**
 * The school name as a link to the admin dashboard of the school (48 px tall).
 * @param props.row The school row.
 * @param props.large True for the bigger card text.
 * @returns The link.
 */
function SchoolNameLink({ row, large }: { row: PlatformSchoolRow; large?: boolean }) {
  return (
    <Link href={schoolHref(row)} className={cn("inline-flex min-h-12 min-w-0 items-center break-words underline-offset-4 hover:underline", large && "text-lg font-bold")}>
      {row.name}
    </Link>
  );
}

/**
 * One label and value pair of a school card.
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
