"use client";

import type { ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import type { licenses } from "@reading-advantage/domain";
import { Scene } from "@/components/rpg/scene";
import { Meter, Panel } from "@/components/rpg/chrome";
import { cn } from "@/lib/utils";
import { SeatHolders } from "./seat-holders";

type LicenseView = licenses.SchoolLicenseViewOutput;
type Tone = "red" | "gold" | "green";

const INK = "text-[var(--cq-ink-soft)]";
const LINE = "border-[rgba(107,84,56,0.35)]";
const TONES: Record<Tone, string> = {
  red: "bg-[#d64545] text-white",
  gold: "bg-[#e8b534] text-[#3b2a1a]",
  green: "bg-[#4fb45a] text-[#10240f]",
};

/** A small colored label. */
function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] font-bold", TONES[tone])}>{children}</span>;
}

/**
 * The license part of the school profile for a school admin: warning, seats, licenses, and the
 * seat holders. View only: it has no control that changes a license.
 * @param props.view The licenses and the seat totals of the school.
 * @returns The license part (anchor `#license`).
 */
export function LicensePanel({ view }: { view: LicenseView }) {
  const t = useTranslations("Settings.schoolProfile.licensePanel");
  const format = useFormatter();
  const day = (value: string) => format.dateTime(new Date(`${value}T12:00:00Z`), { dateStyle: "medium", timeZone: "UTC" });
  const stateTone: Record<string, Tone> = { active: "green", ended: "red", inactive: "gold" };
  const totals: Array<[string, number]> = [
    [t("seatsUsed"), view.seatsUsed],
    [t("seatsFree"), view.seatsFree],
    [t("seatsTotal"), view.seats],
  ];
  return (
    <div id="license" style={{ clipPath: "inset(0)" }}>
      <Scene place="observatory" className="px-1 py-4 sm:px-3">
        <header className="cq-on-scene flex flex-col gap-1">
          <h2 className="text-2xl font-bold">{t("title")}</h2>
          <p className="text-base">{t("viewOnly")}</p>
        </header>
        {view.seatsOver > 0 ? (
          <Panel pinned className="flex-row items-start gap-3" role="alert">
            <Chip tone="red">{t("overChip")}</Chip>
            <span>
              <b>{t("overTitle", { count: view.seatsOver })}</b>
              <span className={cn("block text-[14px]", INK)}>{t("overBody", { used: view.seatsUsed, seats: view.seats })}</span>
            </span>
          </Panel>
        ) : null}
        {!view.hasActiveLicense ? (
          <Panel pinned className="flex-row items-start gap-3" role="alert">
            <Chip tone="gold">{t("noneChip")}</Chip>
            <span>
              <b>{t("noneTitle")}</b>
              <span className={cn("block text-[14px]", INK)}>{t("noneBody", { used: view.seatsUsed })}</span>
            </span>
          </Panel>
        ) : null}
        <Panel aria-labelledby="h-seats">
          <h3 id="h-seats" className="text-xl font-bold">{t("seatsTitle")}</h3>
          <div className="grid grid-cols-3 gap-3">
            {totals.map(([label, value]) => (
              <div key={label} className={cn("flex flex-col gap-1 rounded-xl border bg-white/35 p-3", LINE)}>
                <span className={cn("text-[13px] leading-tight font-semibold", INK)}>{label}</span>
                <span className="text-3xl leading-none font-bold">{value}</span>
              </div>
            ))}
          </div>
          <Meter value={Math.min(view.seatsUsed, view.seats)} max={view.seats || 1} label={t("seatsUsed")} tone={view.seatsOver > 0 ? "red" : "green"} thin />
          <p className={cn("text-[13px]", INK)}>{t("seatsNote")}</p>
        </Panel>
        <Panel aria-labelledby="h-licenses">
          <h3 id="h-licenses" className="text-xl font-bold">{t("licensesTitle")}</h3>
          {view.licenses.length === 0 ? (
            <p className={INK}>{t("noLicense")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {view.licenses.map((license) => (
                <li key={license.id} className={cn("flex flex-col gap-1 rounded-xl border bg-white/35 p-3", LINE)}>
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <b>{license.name}</b>
                    <Chip tone={stateTone[license.state] ?? "gold"}>{t(`state.${license.state}`)}</Chip>
                  </span>
                  <span className={cn("text-[14px]", INK)}>
                    {t("dateRange", {
                      start: license.startDate ? day(license.startDate) : "-",
                      end: license.endDate ? day(license.endDate) : t("noEnd"),
                    })}{" "}
                    · {t("seatsCount", { count: license.seats })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <SeatHolders />
      </Scene>
    </div>
  );
}
