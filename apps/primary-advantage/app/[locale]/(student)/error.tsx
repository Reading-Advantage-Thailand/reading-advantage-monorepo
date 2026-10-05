"use client";

import { useTranslations } from "next-intl";
import { RouteError } from "@/components/shared/route-error";
import { STUDENT_HOME } from "@/lib/student-home";

/**
 * Error boundary for the student route group: the message, a retry, and a link to the
 * student home.
 * @param props.error The thrown error.
 * @param props.reset Retries rendering the failed segment.
 * @returns The student error state.
 */
export default function StudentError({
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
      backHref={STUDENT_HOME}
      backLabel={t("goHome")}
    />
  );
}
