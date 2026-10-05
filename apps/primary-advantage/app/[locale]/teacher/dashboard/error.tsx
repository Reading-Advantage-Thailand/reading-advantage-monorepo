"use client";

import { useTranslations } from "next-intl";
import { RouteError } from "@/components/shared/route-error";

/**
 * Error boundary for the teacher dashboard: the dashboard data failed to load.
 * @param props.error The thrown error.
 * @param props.reset Retries rendering the failed segment.
 * @returns The error state with a retry and a link to My Classes.
 */
export default function TeacherDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("TeacherHome");
  const tClasses = useTranslations("TeacherMyClasses.page");
  return (
    <RouteError
      error={error}
      reset={reset}
      title={t("loadError")}
      description={t("loadErrorHint")}
      backHref="/teacher/my-classes"
      backLabel={tClasses("title")}
    />
  );
}
