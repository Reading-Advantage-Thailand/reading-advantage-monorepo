import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import FlashcardDashboard from "@/components/flashcards/flashcard-dashboard";
import { FlashcardDeckSkeleton } from "@/components/flashcards/flashcard-dashboard-skeleton";
import { Scene } from "@/components/rpg/scene";

/**
 * Page title for the vocabulary page.
 * @returns The metadata.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Flashcards");
  return { title: t("vocabularyTitle") };
}

/**
 * Vocabulary page: the title and the vocabulary flashcard deck (with its own loading, empty,
 * and error states).
 * @returns The page.
 */
export default async function VocabularyPage() {
  const t = await getTranslations("Flashcards");
  // The spellbook in the wizard tower (docs/primary-rpg-skin.md §4).
  return (
    <Scene place="wizard-tower">
      <header className="cq-on-scene flex flex-col gap-1">
        <h1 className="text-2xl font-bold md:text-3xl">{t("vocabularyTitle")}</h1>
        <p>{t("vocabularySubtitle")}</p>
      </header>
      <Suspense fallback={<div aria-busy="true"><FlashcardDeckSkeleton /></div>}>
        <FlashcardDashboard type="VOCABULARY" />
      </Suspense>
    </Scene>
  );
}
