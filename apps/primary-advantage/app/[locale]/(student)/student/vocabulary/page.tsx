import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FlashcardDashboard from "@/components/flashcards/flashcard-dashboard";
import { getTranslations } from "next-intl/server";

export default async function VocabularyPage() {
  const t = await getTranslations("VocabularyPage");
  return (
    <Tabs defaultValue="flashcard">
      <TabsList className="grid h-fit w-full grid-cols-1 md:grid-cols-6">
        <TabsTrigger className="text-xs sm:text-sm" value="flashcard">
          {t("vocabularyCard")}
        </TabsTrigger>
      </TabsList>
      <TabsContent className="mt-4" value="flashcard">
        <FlashcardDashboard type="VOCABULARY" />
      </TabsContent>
    </Tabs>
  );
}
