"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyDashboard } from "./empty-deck";
import { DeckView } from "./deck-view";
import { getUserFlashcardDecks } from "@/actions/flashcard";

export interface Deck {
  id: string;
  name: string;
  description?: string;
  type: "VOCABULARY" | "SENTENCE";
  totalCards: number;
  dueCards: number;
  newCards: number;
  learningCards: number;
  reviewCards: number;
  masteredCards: number;
  createdAt: Date;
  updatedAt: Date;
}

interface FlashcardDashboardProps {
  userId?: string; // Optional userId prop for compatibility
  deckType?: "VOCABULARY" | "SENTENCE" | "ALL"; // Filter by deck type
}

export function FlashcardDashboard({
  userId,
  deckType = "ALL",
}: FlashcardDashboardProps) {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("vocabulary");

  useEffect(() => {
    fetchDecks();
  }, []);

  const fetchDecks = async () => {
    try {
      setLoading(true);
      const result = await getUserFlashcardDecks();
      if (result.success) {
        setDecks(result.decks);
      } else {
        console.error("Error fetching decks:", result.error);
      }
    } catch (error) {
      console.error("Error fetching decks:", error);
    } finally {
      setLoading(false);
    }
  };

  const vocabularyDecks = decks.filter((deck) => deck.type === "VOCABULARY");
  const sentenceDecks = decks.filter((deck) => deck.type === "SENTENCE");

  // Filter decks based on deckType prop
  const getFilteredDecks = () => {
    switch (deckType) {
      case "VOCABULARY":
        return vocabularyDecks;
      case "SENTENCE":
        return sentenceDecks;
      case "ALL":
      default:
        return decks;
    }
  };

  const filteredDecks = getFilteredDecks();

  if (loading) {
    return (
      <div className="container mx-auto space-y-6 px-4 py-8">
        <div className="border rounded-lg shadow-sm bg-card">
          <div className="p-6">
            <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="p-6 pt-0">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div>
        <div className="pb-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Flashcard Dashboard</h2>
              <p className="text-muted-foreground">
                {deckType === "VOCABULARY"
                  ? "Manage your vocabulary learning decks"
                  : deckType === "SENTENCE"
                    ? "Manage your sentence learning decks"
                    : "Manage your vocabulary and sentence learning decks"}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 pt-0">
          {deckType === "ALL" ? (
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger
                  value="vocabulary"
                  className="flex items-center gap-2"
                >
                  <span>Vocabulary</span>
                  {vocabularyDecks.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {vocabularyDecks.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="sentence"
                  className="flex items-center gap-2"
                >
                  <span>Sentences</span>
                  {sentenceDecks.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {sentenceDecks.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="vocabulary" className="mt-6">
                {vocabularyDecks.length > 0 ? (
                  <DeckView
                    decks={vocabularyDecks}
                    deckType="VOCABULARY"
                    onDeckUpdate={fetchDecks}
                  />
                ) : (
                  <EmptyDashboard deckType="VOCABULARY" />
                )}
              </TabsContent>

              <TabsContent value="sentence" className="mt-6">
                {sentenceDecks.length > 0 ? (
                  <DeckView
                    decks={sentenceDecks}
                    deckType="SENTENCE"
                    onDeckUpdate={fetchDecks}
                  />
                ) : (
                  <EmptyDashboard deckType="SENTENCE" />
                )}
              </TabsContent>
            </Tabs>
          ) : (
            // Show only the specific deck type without tabs
            <div className="mt-6">
              {filteredDecks.length > 0 ? (
                <DeckView
                  decks={filteredDecks}
                  deckType={deckType}
                  onDeckUpdate={fetchDecks}
                />
              ) : (
                <EmptyDashboard deckType={deckType} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
