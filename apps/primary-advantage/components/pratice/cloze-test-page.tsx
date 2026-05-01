import { ClozeTestGame } from "@/components/pratice/cloze-test-game";
import { getFlashcardDeckId } from "@/actions/pratice";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";

export default async function ClozeTestPage() {
  const t = await getTranslations("SentencesPage.clozeTestGame");
  const deckResult = await getFlashcardDeckId();

  if (!deckResult.success) {
    return (
      <div className="space-y-6">
        <Header heading={t("title")} text={t("description")} />
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">{deckResult.error}</p>
            <p className="text-muted-foreground mt-2 text-sm">
              {t("noDeck.message")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <ClozeTestGame deckId={deckResult.deckId} />;
}
