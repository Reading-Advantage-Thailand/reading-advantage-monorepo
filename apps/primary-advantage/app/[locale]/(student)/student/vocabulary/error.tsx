"use client";

import { useTranslations } from "next-intl";
import { RouteError } from "@/components/shared/route-error";
import { STUDENT_HOME } from "@/lib/student-home";

/**
 * Error boundary for the vocabulary page.
 * @param props.error The thrown error.
 * @param props.reset Retries rendering the failed segment.
 * @returns The error state with a retry and a link to the student home.
 */
export default function VocabularyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Flashcards");
  const te = useTranslations("Error");
  return (
    <RouteError
      error={error}
      reset={reset}
      title={t("loadError")}
      description={t("loadErrorHint")}
      backHref={STUDENT_HOME}
      backLabel={te("goHome")}
    />
  );
}
