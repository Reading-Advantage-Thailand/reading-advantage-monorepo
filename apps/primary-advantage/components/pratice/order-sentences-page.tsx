import { OrderSentenceGame } from "@/components/pratice/order-sentences-game";
import { getFlashcardDeckId } from "@/actions/pratice";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";

export default async function SentencesOrderingPage() {
  const deckResult = await getFlashcardDeckId();
  const t = await getTranslations("SentencesPage.sentenceOrder");

  if (!deckResult.success) {
    return (
      <div className="space-y-6">
        <Header heading={t("title")} text={t("descriptionNodeck")} />
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">{deckResult.error}</p>
            <p className="text-muted-foreground mt-2 text-sm">
              {t("contentNoDeck")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <OrderSentenceGame deckId={deckResult.deckId} />;
}
