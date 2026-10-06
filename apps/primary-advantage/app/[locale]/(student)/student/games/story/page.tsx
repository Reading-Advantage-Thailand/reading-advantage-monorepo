import { getTranslations } from "next-intl/server";

import { StoryGamesClient } from "@/components/story-games/StoryGamesClient";
import { Scene } from "@/components/rpg/scene";

/**
 * Page metadata for the word adventures route.
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "StoryGames" });
  return { title: t("title"), description: t("description") };
}

/**
 * Word adventures: 3D games with the student's saved words and sentences.
 * The list sits in the arena scene (docs/primary-rpg-skin.md §4).
 * @returns The game list (locked games link to reading) with the player.
 */
export default async function PrimaryStoryGamesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "StoryGames" });
  return (
    <Scene place="arena">
      <header className="cq-on-scene flex flex-col gap-1">
        <h1 className="text-2xl font-bold md:text-3xl">{t("title")}</h1>
        <p>{t("description")}</p>
      </header>
      <StoryGamesClient />
    </Scene>
  );
}
