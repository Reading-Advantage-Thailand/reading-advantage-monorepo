// components/flashcards/flashcard-dashboard.tsx
import React from "react";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDashboardData } from "@/actions/flashcard";
import { SingleDeckViewInline } from "./deck-view";
import { EmptyDashboard } from "./empty-deck";
import { Header } from "../header";
import { getTranslations } from "next-intl/server";

interface FlashcardDashboardProps {
  type?: "VOCABULARY" | "SENTENCE";
}

export default async function FlashcardDashboard({
  type,
}: FlashcardDashboardProps) {
  const { success, decks, error, deckType } = await getDashboardData(type);
  const t = await getTranslations("SentencesPage.sentencesCard");
  const tVocabulary = await getTranslations("VocabularyPage");

  // Get appropriate header text based on deck type
  const getHeaderText = () => {
    if (deckType === "VOCABULARY") {
      return tVocabulary("description");
    } else if (deckType === "SENTENCE") {
      return t("description");
    }
    return "Master vocabulary and sentences with personalized flashcard decks";
  };

  if (!success) {
    return (
      <div className="space-y-6">
        <Header heading={t("title")} text={getHeaderText()} variant="warning" />

        <div className="container mx-auto max-w-4xl px-4 py-12">
          <div className="space-y-8 text-center">
            {/* Error Animation */}
            <div className="relative">
              <div className="animate-pulse">
                <AlertCircle className="mx-auto h-16 w-16 text-red-500" />
              </div>
            </div>

            {/* Error Header */}
            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-red-600">
                Unable to Load Flashcard Data
              </h1>
              <p className="text-muted-foreground mx-auto max-w-md text-lg">
                Something went wrong while loading your flashcard information
              </p>
            </div>

            {/* Error Card */}
            <Card className="mx-auto max-w-md border-red-200 bg-red-50 dark:bg-red-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-red-800 dark:text-red-200">
                  <AlertCircle className="h-5 w-5" />
                  Error Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert
                  variant="destructive"
                  className="border-red-200 bg-red-50 dark:bg-red-950/50"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {error ||
                      "Failed to load flashcard data. Please try refreshing the page."}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Action Button */}
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="h-12 px-6"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (decks.length === 0) {
    return (
      <div className="space-y-6">
        <Header heading={t("title")} text={getHeaderText()} />
        <EmptyDashboard deckType={deckType} />
      </div>
    );
  }

  // For filtered type, always show single deck view (even if multiple decks exist)
  if (deckType) {
    const targetDeck = decks.find((deck) => deck.type === deckType) || decks[0];

    return (
      <div className="space-y-6">
        <Header heading={t("title")} text={getHeaderText()} />
        <SingleDeckViewInline
          deck={targetDeck}
          deckType={deckType}
          showHeader={false}
        />
      </div>
    );
  }

  // Original logic for no type filter
  const vocabularyDeck = decks.find((deck) => deck.type === "VOCABULARY");
  const sentenceDeck = decks.find((deck) => deck.type === "SENTENCE");

  // Single deck scenario
  const singleDeck = vocabularyDeck || sentenceDeck;
  if (singleDeck) {
    return (
      <div className="space-y-6">
        <Header heading={t("title")} text={getHeaderText()} />
        <SingleDeckViewInline deck={singleDeck} showHeader={false} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header heading={t("title")} text={getHeaderText()} />
      <EmptyDashboard />
    </div>
  );
}
