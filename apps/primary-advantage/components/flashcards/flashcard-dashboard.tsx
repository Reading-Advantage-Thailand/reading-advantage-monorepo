import { BookOpenIcon, FileTextIcon, GraduationCapIcon, TriangleAlertIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState, ErrorState } from "@reading-advantage/ui";
import { getDashboardData } from "@/actions/flashcard";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { RetryButton } from "@/components/shared/retry-button";
import { cn } from "@/lib/utils";
import { SingleDeckViewInline } from "./deck-view";

/**
 * The flashcard deck of the vocabulary or sentences page. The page renders the title. States: an
 * error with a retry (it reloads the page data) when the dashboard data fails, an empty state with
 * a way to the stories when the student has saved nothing, otherwise the deck view.
 * @param props.type The deck type of the page.
 * @returns The deck view or a state panel.
 */
export default async function FlashcardDashboard({ type }: { type: "VOCABULARY" | "SENTENCE" }) {
  const [{ success, decks }, t] = await Promise.all([getDashboardData(type), getTranslations("Flashcards")]);
  const vocabulary = type === "VOCABULARY";

  if (!success) {
    return (
      <ErrorState
        className="bg-card border"
        icon={<TriangleAlertIcon />}
        title={t("loadError")}
        description={t("loadErrorHint")}
        action={<RetryButton />}
      />
    );
  }

  const deck = decks.find((candidate) => candidate.type === type) ?? decks[0];
  if (!deck) {
    return (
      <EmptyState
        className="bg-card border"
        icon={vocabulary ? <GraduationCapIcon /> : <FileTextIcon />}
        title={vocabulary ? t("vocabularyEmpty") : t("sentencesEmpty")}
        description={vocabulary ? t("vocabularyEmptyHint") : t("sentencesEmptyHint")}
        action={
          <Link href="/student/read" className={cn(buttonVariants({ variant: "default" }), "min-h-12 rounded-xl px-6")}>
            <BookOpenIcon aria-hidden="true" />
            {t("findStory")}
          </Link>
        }
      />
    );
  }

  return <SingleDeckViewInline deck={deck} deckType={type} showHeader={false} />;
}
