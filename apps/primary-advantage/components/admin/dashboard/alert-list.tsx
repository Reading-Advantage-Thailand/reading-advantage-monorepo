import { useTranslations } from "next-intl";
import { Panel } from "@/components/rpg/chrome";
import { cn } from "@/lib/utils";
import type { SchoolAlert } from "@reading-advantage/domain/primary-dashboards";

/** The look of each severity: a text label, a mark, and a colour (the colour is never the only cue). */
const SEVERITY = {
  critical: { mark: "!!", cls: "bg-[#d64545] text-white" },
  high: { mark: "!", cls: "bg-[#e8892f] text-[#3b2a1a]" },
  medium: { mark: "i", cls: "bg-[#e8b534] text-[#3b2a1a]" },
} as const;

/** The message keys of each alert code. */
const KEYS = {
  "low-activity": ["lowActivity", "lowActivityHint"],
  "license-ends-soon": ["licenseEndsSoon", "licenseEndsSoonHint"],
  "license-ended": ["licenseEnded", "licenseEndedHint"],
  "seats-nearly-full": ["seatsNearlyFull", "seatsNearlyFullHint"],
} as const;

/**
 * The alert list (FR-6). The alerts come sorted from the domain; nothing is stored.
 * @param props.alerts The alerts that fired.
 * @param props.schoolEmpty True when the school has no students (the "all clear" text changes).
 * @returns The panel.
 */
export function AlertList({ alerts, schoolEmpty }: { alerts: SchoolAlert[]; schoolEmpty: boolean }) {
  const t = useTranslations("AdminDashboard.alerts");
  return (
    <Panel aria-labelledby="admin-dash-alerts">
      <h2 id="admin-dash-alerts" className="text-xl font-bold">
        {t("heading")}
      </h2>
      {alerts.length ? (
        <ul className="flex flex-col gap-2">
          {alerts.map((alert) => {
            const [title, hint] = KEYS[alert.code];
            return (
              <li key={alert.code} className="flex items-start gap-3 rounded-xl border border-[rgba(107,84,56,0.35)] bg-[rgba(255,255,255,0.35)] p-3">
                <span className={cn("mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-bold", SEVERITY[alert.severity].cls)}>
                  <span aria-hidden="true">{SEVERITY[alert.severity].mark}</span>
                  {t(`severity.${alert.severity}`)}
                </span>
                <span className="flex min-w-0 flex-col">
                  <b>{t(title, alert.values)}</b>
                  <span className="text-[14px] text-[var(--cq-ink-soft)]">{t(hint, alert.values)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="flex items-center gap-2 text-[var(--cq-ink-soft)]">
          <span aria-hidden="true" className="text-xl">
            ✓
          </span>
          {schoolEmpty ? t("noneEmpty") : t("none")}
        </p>
      )}
    </Panel>
  );
}
