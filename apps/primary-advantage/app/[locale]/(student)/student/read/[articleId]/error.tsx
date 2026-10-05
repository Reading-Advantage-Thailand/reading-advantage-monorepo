"use client";

import { useTranslations } from "next-intl";
import { RouteError } from "@/components/shared/route-error";

/**
 * Error boundary for the article view: the article failed to load. A missing article is not an
 * error here; the page shows its own not-found state.
 * @param props.error The thrown error.
 * @param props.reset Retries rendering the failed segment.
 * @returns The article error state with a retry and a link back to the stories.
 */
export default function ArticleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("ReadList");
  const te = useTranslations("Error");
  return (
    <RouteError
      error={error}
      reset={reset}
      title={t("articleError")}
      description={te("description")}
      backHref="/student/read"
      backLabel={t("backToStories")}
    />
  );
}
