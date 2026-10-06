"use client";

import { useTranslations } from "next-intl";
import { RouteError } from "@/components/shared/route-error";
import { TEACHER_HOME } from "@/lib/teacher-home";

/**
 * Error boundary for the teacher route group: the message, a retry, and a link to the
 * teacher dashboard.
 * @param props.error The thrown error.
 * @param props.reset Retries rendering the failed segment.
 * @returns The teacher error state.
 */
export default function TeacherError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Error");
  return (
    <RouteError
      error={error}
      reset={reset}
      title={t("title")}
      description={t("description")}
      backHref={TEACHER_HOME}
      backLabel={t("goHome")}
    />
  );
}
