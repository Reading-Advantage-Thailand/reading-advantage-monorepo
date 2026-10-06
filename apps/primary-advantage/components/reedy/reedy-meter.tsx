import { ART } from "@/lib/rpg/places";
import { Meter, Panel, RpgLink } from "@/components/rpg/chrome";
import type { VoiceBlock } from "@reading-advantage/domain/primary-voice";

/** What the meter shows (FR-9): the month's minutes and why Reedy may be closed. */
export interface ReedyMeterData {
  remainingSeconds: number;
  budgetSeconds: number;
  blockedBy: VoiceBlock | null;
}

/**
 * Seconds as "m:ss".
 * @param seconds The seconds.
 * @returns The text.
 */
export const minutesText = (seconds: number): string => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/**
 * The minutes-left meter of Reedy (FR-9) with a 48 px link to the Reedy page.
 * @param props.data The entitlement numbers.
 * @param props.t The `Reedy` translator.
 * @param props.link True to show the link (not on the Reedy page itself).
 * @returns The meter card.
 */
export function ReedyMeter({ data, t, link = true }: { data: ReedyMeterData; t: (key: string, values?: Record<string, string | number>) => string; link?: boolean }) {
  const closed = data.blockedBy !== null && data.blockedBy !== "NO_AVATAR";
  return (
    <Panel aria-labelledby="reedy-meter" className="grid grid-cols-[56px_1fr] items-center gap-3">
      <img src={ART.campfire} alt="" className="cq-shadowed w-14" />
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="reedy-meter" className="flex items-center gap-2 text-lg font-bold">
            {t("title")}
            <span className="rounded-full bg-[var(--cq-wood-dark)] px-2 py-0.5 text-xs font-semibold uppercase text-[#fff4dc]">{t("preview")}</span>
          </h2>
          <span className="cq-muted text-sm">{t("minutesLeft", { time: minutesText(data.remainingSeconds) })}</span>
        </div>
        <Meter value={data.remainingSeconds} max={data.budgetSeconds} label={t("meterLabel")} tone="gold" thin />
        {closed ? <p className="cq-muted text-sm">{t(`blocked.${data.blockedBy}`)}</p> : null}
        {link ? (
          <RpgLink tone={closed ? "iron" : "wood"} href="/student/reedy" className="w-fit">
            {t("talk")}
          </RpgLink>
        ) : null}
      </div>
    </Panel>
  );
}
