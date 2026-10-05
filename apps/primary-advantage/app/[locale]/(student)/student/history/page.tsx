import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BookOpenIcon, RotateCcwIcon } from "lucide-react";
import { HistoryList } from "@/components/student/history-list";

/**
 * Page title for the reading history.
 * @returns The metadata.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("StudentHistory");
  return { title: t("title") };
}

/**
 * Student reading history: the stories to read again, then every story the student opened. Both
 * lists load on the client with their own loading, empty, and error states.
 * @returns The history page.
 */
export default async function HistoryPage() {
  const t = await getTranslations("StudentHistory");
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold md:text-3xl">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </header>
      <section aria-labelledby="history-read-again" className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="history-read-again" className="flex items-center gap-2 text-xl font-semibold">
            <RotateCcwIcon aria-hidden="true" className="size-5 text-amber-600 dark:text-amber-400" />
            {t("readAgain")}
          </h2>
          <p className="text-muted-foreground text-sm">{t("readAgainHint")}</p>
        </div>
        <HistoryList variant="reminder" />
      </section>
      <section aria-labelledby="history-records" className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="history-records" className="flex items-center gap-2 text-xl font-semibold">
            <BookOpenIcon aria-hidden="true" className="text-primary size-5" />
            {t("records")}
          </h2>
          <p className="text-muted-foreground text-sm">{t("recordsHint")}</p>
        </div>
        <HistoryList variant="history" />
      </section>
    </div>
  );
}
