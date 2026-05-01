"use client";

import { useState, useEffect } from "react";
import { ClozeTestGame } from "./cloze-test-game";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClozeTestPage() {
  const [deckId, setDeckId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDeckId() {
      try {
        const response = await fetch("/api/v1/flashcard/deck-id");
        const deckResult = await response.json();

        if (deckResult.success) {
          setDeckId(deckResult.deckId);
        } else {
          setError(deckResult.error || "Failed to load flashcard deck");
        }
      } catch (err) {
        setError("Failed to load flashcard deck");
      } finally {
        setLoading(false);
      }
    }

    fetchDeckId();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Header
          heading="Cloze Test Game"
          text="Practice filling in missing words from your flashcard sentences!"
        />
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !deckId) {
    return (
      <div className="space-y-6">
        <Header
          heading="Cloze Test Game"
          text="Practice filling in missing words from your flashcard sentences!"
        />
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">{error}</p>
            <p className="text-muted-foreground mt-2 text-sm">
              Start reading articles and saving sentences as flashcards to
              unlock this game!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <ClozeTestGame deckId={deckId} />;
}
