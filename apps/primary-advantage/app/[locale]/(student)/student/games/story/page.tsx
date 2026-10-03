import { getTranslations } from "next-intl/server";

import { StoryGamesClient } from "@/components/story-games/StoryGamesClient";

/**
 * Page metadata for the story adventures route.
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "StoryGames" });
  return { title: t("title"), description: t("description") };
}

/**
 * Story adventures: read-and-play 3D games built on a story.
 * @returns The story and game picker with the player.
 */
export default async function PrimaryStoryGamesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "StoryGames" });
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
      </header>
      <StoryGamesClient />
    </main>
  );
}
