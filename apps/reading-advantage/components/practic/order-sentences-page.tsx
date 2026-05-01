"use client";

import { useState, useEffect } from "react";
import { OrderSentenceGame } from "@/components/practic/order-sentences-game";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function SentencesOrderingPage() {
  const [deckResult, setDeckResult] = useState<{
    success: boolean;
    deckId?: string;
    error?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDeckId = async () => {
      try {
        const response = await fetch('/api/v1/flashcard/deck-info');
        const data = await response.json();
        setDeckResult(data);
      } catch (error) {
        console.error('Error fetching deck info:', error);
        setDeckResult({
          success: false,
          error: "Failed to load deck information"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeckId();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!deckResult?.success) {
    return (
      <div className="space-y-6">
        <Header
          heading="Order Sentences Game"
          text="Practice arranging sentences from your flashcard articles!"
        />
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">{deckResult?.error}</p>
            <p className="text-muted-foreground mt-2 text-sm">
              Start reading articles and saving sentences as flashcards to
              unlock this game!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <OrderSentenceGame deckId={deckResult.deckId} />;
}
