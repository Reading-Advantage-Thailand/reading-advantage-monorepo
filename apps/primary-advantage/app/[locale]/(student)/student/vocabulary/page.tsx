import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import FlashcardDashboard from "@/components/flashcards/flashcard-dashboard";
import { FlashcardDeckSkeleton } from "@/components/flashcards/flashcard-dashboard-skeleton";

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
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold md:text-3xl">{t("vocabularyTitle")}</h1>
        <p className="text-muted-foreground">{t("vocabularySubtitle")}</p>
      </header>
      <Suspense fallback={<div aria-busy="true"><FlashcardDeckSkeleton /></div>}>
        <FlashcardDashboard type="VOCABULARY" />
      </Suspense>
    </div>
  );
}
