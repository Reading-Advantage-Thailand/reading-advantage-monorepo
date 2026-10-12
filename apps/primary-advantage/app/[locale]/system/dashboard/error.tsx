"use client";

import { useTranslations } from "next-intl";
import { RouteError } from "@/components/shared/route-error";

/**
 * Error boundary for the system dashboard: the platform data failed to load.
 * @param props.error The thrown error.
 * @param props.reset Retries rendering the failed segment.
 * @returns The error state with a retry and a link to the schools page.
 */
export default function SystemDashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("SystemDashboard");
  return <RouteError error={error} reset={reset} title={t("loadError")} description={t("loadErrorHint")} backHref="/system/schools" backLabel={t("back")} />;
}
