"use client";

import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Panel, RpgButton } from "@/components/rpg/chrome";

/** One student on a page of the seat holder list. */
interface SeatHolder {
  id: string;
  name: string;
  username: string;
  classes: string[];
  joinedAt: string;
}

/** One page answer of `GET /api/users/me/school/seat-holders`. */
interface SeatHoldersPage {
  page: number;
  pageSize: number;
  total: number;
  holders: SeatHolder[];
}

const INK = "text-[var(--cq-ink-soft)]";
const LINE = "border-[rgba(107,84,56,0.35)]";

/**
 * The students of the school (50 for each page): name, username, classes, join date. View only.
 * @returns The seat holder panel with the Previous and Next buttons.
 */
export function SeatHolders() {
  const t = useTranslations("Settings.schoolProfile.licensePanel");
  const format = useFormatter();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SeatHoldersPage | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setFailed(false);
    fetch(`/api/users/me/school/seat-holders?page=${page}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        return (await response.json()) as SeatHoldersPage;
      })
      .then((next) => live && setData(next))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const from = data && data.holders.length > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? (data.page - 1) * data.pageSize + data.holders.length : 0;

  return (
    <Panel aria-labelledby="h-seat-holders">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="h-seat-holders" className="text-xl font-bold">{t("holdersTitle")}</h3>
        {data && data.total > 0 ? (
          <span className={`text-[14px] font-semibold ${INK}`}>{t("holdersRange", { from, to, total: data.total })}</span>
        ) : null}
      </div>
      {failed ? <p role="status">{t("holdersError")}</p> : null}
      {data && data.total === 0 ? <p className={INK}>{t("holdersEmpty")}</p> : null}
      {data && data.holders.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[15px]">
            <thead>
              <tr className={`text-[13px] ${INK}`}>
                <th className="py-1 pr-2 font-semibold">{t("colName")}</th>
                <th className="px-2 font-semibold">{t("colUsername")}</th>
                <th className="hidden px-2 font-semibold sm:table-cell">{t("colClasses")}</th>
                <th className="hidden pl-2 font-semibold sm:table-cell">{t("colJoined")}</th>
              </tr>
            </thead>
            <tbody>
              {data.holders.map((holder) => {
                const classes = holder.classes.length > 0 ? holder.classes.join(", ") : t("noClass");
                return (
                  <tr key={holder.id} className={`border-t ${LINE}`}>
                    <th scope="row" className="py-2 pr-2 font-bold whitespace-nowrap">
                      {holder.name}
                      <span className={`block text-[13px] font-normal sm:hidden ${INK}`}>{classes}</span>
                    </th>
                    <td className="px-2 whitespace-nowrap">{holder.username}</td>
                    <td className="hidden px-2 sm:table-cell">{classes}</td>
                    <td className="hidden pl-2 whitespace-nowrap sm:table-cell">
                      {format.dateTime(new Date(holder.joinedAt), { dateStyle: "medium" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <RpgButton tone="iron" small disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("previous")}</RpgButton>
        <span className={`text-[14px] font-semibold ${INK}`}>{t("pageOf", { page, pages })}</span>
        <RpgButton small disabled={page >= pages} onClick={() => setPage(page + 1)}>{t("next")}</RpgButton>
      </div>
    </Panel>
  );
}
