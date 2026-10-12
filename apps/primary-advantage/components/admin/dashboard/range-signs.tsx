import { useTranslations } from "next-intl";
import { Sign } from "@/components/rpg/chrome";
import { Link } from "@/i18n/navigation";
import { DASHBOARD_RANGES, type DashboardRange } from "@reading-advantage/domain/primary-dashboards";
import { dashboardHref, type AdoptionView } from "./href";

/**
 * The range signs (7, 30, 90 days). A change keeps the adoption view and the SYSTEM school.
 * @param props.range The open range.
 * @param props.by The adoption view.
 * @param props.school The SYSTEM school id, if any.
 * @returns The sign row.
 */
export function RangeSigns({ range, by, school }: { range: DashboardRange; by: AdoptionView; school?: string | null }) {
  const t = useTranslations("AdminDashboard");
  return (
    <nav aria-label={t("rangeLabel")} className="cq-signs">
      {DASHBOARD_RANGES.map((n) => (
        <Link key={n} href={dashboardHref({ range: n, by, school })} aria-current={n === range ? "true" : undefined} className="inline-flex min-h-12 items-center">
          <Sign small active={n === range}>
            {t("days", { count: n })}
          </Sign>
        </Link>
      ))}
    </nav>
  );
}
