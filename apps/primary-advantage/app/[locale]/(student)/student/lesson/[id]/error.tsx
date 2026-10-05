"use client";

import { useTranslations } from "next-intl";
import { RouteError } from "@/components/shared/route-error";

/**
 * Error boundary for the lesson: the lesson failed to load.
 * @param props.error The thrown error.
 * @param props.reset Retries rendering the failed segment.
 * @returns The lesson error state with a retry and a link back to the stories.
 */
export default function LessonError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Lesson");
  const tRead = useTranslations("ReadList");
  const tError = useTranslations("Error");
  return (
    <RouteError
      error={error}
      reset={reset}
      title={t("error")}
      description={tError("description")}
      backHref="/student/read"
      backLabel={tRead("backToStories")}
    />
  );
}
