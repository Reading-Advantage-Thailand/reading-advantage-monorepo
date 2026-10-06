import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FlashcardDashboard from "@/components/flashcards/flashcard-dashboard";
import { FlashcardDeckSkeleton } from "@/components/flashcards/flashcard-dashboard-skeleton";
import SentencesOrderingPage from "@/components/practice/order-sentences-page";
import ClozeTestPage from "@/components/practice/cloze-test-page";
import OrderWordPage from "@/components/practice/order-words-page";
import ManageTab from "@/components/manage-tab";
import { getAllSentenceCards } from "@/actions/flashcard";
import MatchingGamePage from "@/components/practice/matching-page";
import { Scene } from "@/components/rpg/scene";

/** Practice tabs in display order, with their message keys in SentencesPage. */
const TABS = [
  { value: "flashcard", label: "sentences" },
  { value: "orderSentence", label: "orderSentence" },
  { value: "clozeTest", label: "clozeTest" },
  { value: "orderWord", label: "orderWord" },
  { value: "matching", label: "matching" },
  { value: "manage", label: "manage.heading" },
] as const;

/**
 * Page title for the sentences page.
 * @returns The metadata.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Flashcards");
  return { title: t("sentencesTitle") };
}

/**
 * Sentences page: the title, one row of practice tabs (it scrolls sideways on phones, 48 px
 * tabs), and the sentence flashcard deck with its own loading, empty, and error states. The
 * practice activities are unchanged.
 * @returns The page.
 */
export default async function SentencesPage() {
  const [flashcardsResult, t, tPage] = await Promise.all([
    getAllSentenceCards(),
    getTranslations("Flashcards"),
    getTranslations("SentencesPage"),
  ]);

  // The scrolls in the archive; the practice modes are signs (docs/primary-rpg-skin.md §4).
  return (
    <Scene place="archive">
      <header className="cq-on-scene flex flex-col gap-1">
        <h1 className="text-2xl font-bold md:text-3xl">{t("sentencesTitle")}</h1>
        <p>{t("sentencesSubtitle")}</p>
      </header>
      <Tabs defaultValue="flashcard" className="gap-4">
        <TabsList
          aria-label={t("practiceTabs")}
          className="cq-tabs h-auto w-full justify-start overflow-x-auto"
        >
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="h-12 flex-none">
              {tPage(tab.label)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="flashcard">
          <Suspense fallback={<div aria-busy="true"><FlashcardDeckSkeleton /></div>}>
            <FlashcardDashboard type="SENTENCE" />
          </Suspense>
        </TabsContent>
        <TabsContent value="orderSentence">
          <SentencesOrderingPage />
        </TabsContent>
        <TabsContent value="clozeTest">
          <ClozeTestPage />
        </TabsContent>
        <TabsContent value="orderWord">
          <OrderWordPage />
        </TabsContent>
        <TabsContent value="matching">
          <MatchingGamePage />
        </TabsContent>
        <TabsContent value="manage">
          <ManageTab data={flashcardsResult.cards || []} />
        </TabsContent>
      </Tabs>
    </Scene>
  );
}
