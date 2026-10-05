import { MicIcon } from "lucide-react";
import type { VoiceBlock } from "@reading-advantage/domain/primary-voice";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const ratio = data.budgetSeconds > 0 ? Math.min(1, data.remainingSeconds / data.budgetSeconds) : 0;
  const closed = data.blockedBy !== null && data.blockedBy !== "NO_AVATAR";
  return (
    <section aria-labelledby="reedy-meter" className="bg-card text-card-foreground flex flex-col gap-3 rounded-2xl border p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="reedy-meter" className="flex items-center gap-2 text-lg font-bold">
          <MicIcon className="size-5" aria-hidden="true" />
          {t("title")}
          <span className="bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100 rounded-full px-2 py-0.5 text-xs font-semibold uppercase">{t("preview")}</span>
        </h2>
        <span className="text-muted-foreground text-sm">{t("minutesLeft", { time: minutesText(data.remainingSeconds) })}</span>
      </div>
      <div role="progressbar" aria-label={t("meterLabel")} aria-valuemin={0} aria-valuemax={data.budgetSeconds} aria-valuenow={data.remainingSeconds} className="bg-muted h-3 w-full overflow-hidden rounded-full">
        <div className="bg-brand-500 h-full rounded-full" style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
      {closed ? <p className="text-muted-foreground text-sm">{t(`blocked.${data.blockedBy}`)}</p> : null}
      {link ? (
        <Link href="/student/reedy" className={cn(buttonVariants({ variant: closed ? "outline" : "default" }), "min-h-12 w-full rounded-xl px-5 text-base sm:w-auto")}>
          {t("talk")}
        </Link>
      ) : null}
    </section>
  );
}
