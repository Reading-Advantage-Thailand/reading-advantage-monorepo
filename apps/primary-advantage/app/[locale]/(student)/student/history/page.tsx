import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HistoryList } from "@/components/student/history-list";
import { Sign } from "@/components/rpg/chrome";
import { Scene } from "@/components/rpg/scene";
import { ART } from "@/lib/rpg/places";

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
  // The adventurer's journal at the inn (docs/primary-rpg-skin.md §4).
  return (
    <Scene place="inn" className="gap-8">
      <header className="cq-on-scene flex flex-col gap-1">
        <h1 className="text-2xl font-bold md:text-3xl">{t("title")}</h1>
        <p>{t("subtitle")}</p>
      </header>
      <section aria-labelledby="history-read-again" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Sign className="w-fit">
            <img src={ART.campfire} alt="" className="size-6" />
            <h2 id="history-read-again" className="m-0 text-[length:inherit] font-bold">
              {t("readAgain")}
            </h2>
          </Sign>
          <p className="cq-on-scene text-sm">{t("readAgainHint")}</p>
        </div>
        <HistoryList variant="reminder" />
      </section>
      <section aria-labelledby="history-records" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Sign className="w-fit">
            <img src={ART.scroll} alt="" className="size-6" />
            <h2 id="history-records" className="m-0 text-[length:inherit] font-bold">
              {t("records")}
            </h2>
          </Sign>
          <p className="cq-on-scene text-sm">{t("recordsHint")}</p>
        </div>
        <HistoryList variant="history" />
      </section>
    </Scene>
  );
}
