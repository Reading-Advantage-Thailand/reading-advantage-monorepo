"use client";

import { useTranslations } from "next-intl";
import { RouteError } from "@/components/shared/route-error";

/**
 * Error boundary for the school dashboard: the dashboard data failed to load.
 * @param props.error The thrown error.
 * @param props.reset Retries rendering the failed segment.
 * @returns The error state with a retry and a link to the teachers page.
 */
export default function AdminDashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("AdminDashboard");
  return <RouteError error={error} reset={reset} title={t("loadError")} description={t("loadErrorHint")} backHref="/admin/teachers" backLabel={t("back")} />;
}
