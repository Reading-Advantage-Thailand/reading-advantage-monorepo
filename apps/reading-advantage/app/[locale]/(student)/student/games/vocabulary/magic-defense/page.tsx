"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { GameContainer } from "@/components/games/game/GameContainer";
import { useGameStore } from "@/store/useGameStore";
import { Loader2, AlertCircle, ChevronLeft, Wand2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { useScopedI18n } from "@/locales/client";

export default function MagicDefensePage() {
  const t = useScopedI18n("pages.student.gamesPage");
  const setVocabulary = useGameStore((state) => state.setVocabulary);
  const setLastResult = useGameStore((state) => state.setLastResult);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVocabulary = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/v1/games/magic-defense/vocabulary");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch vocabulary");
        }

        if (data.vocabulary && data.vocabulary.length >= 10) {
          setVocabulary(data.vocabulary);
        } else {
          setError(data.message || t("notEnoughWords", { count: "10" }));
        }
      } catch (err) {
        console.error("Error fetching vocabulary:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load vocabulary",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchVocabulary();
  }, [setVocabulary]);

  const handleComplete = useCallback(
    async (results: {
      score: number;
      correctAnswers: number;
      totalAttempts: number;
      accuracy: number;
      difficulty: string;
    }) => {
      const xp = Math.floor(results.correctAnswers * results.accuracy);
      setLastResult(xp, results.accuracy);

      try {
        const response = await fetch("/api/v1/games/magic-defense/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            score: results.score,
            correctAnswers: results.correctAnswers,
            totalAttempts: results.totalAttempts,
            accuracy: results.accuracy,
            difficulty: results.difficulty,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          console.log("Game completed! XP earned:", data.xpEarned);
        } else {
          console.error("Failed to save game results:", data.message);
        }
      } catch (err) {
        console.error("Error saving game results:", err);
      }
    },
    [setLastResult],
  );

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/student/games">
          <ChevronLeft className="mr-1 h-4 w-4" />
          {t("backToGames")}
        </Link>
      </Button>

      {/* Header */}
      <Header
        heading={t("games.magicDefense.title")}
        text={t("games.magicDefense.description")}
      >
        <Wand2 className="h-8 w-8 text-primary" />
      </Header>

      {/* Loading State */}
      {isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
            <p className="text-lg font-medium text-muted-foreground">
              {t("loadingVocabulary")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("unableToStartGame")}</AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <p>{error}</p>
            <p className="text-sm opacity-80">{t("saveTip")}</p>
          </AlertDescription>
        </Alert>
      )}

      {/* Game Container */}
      {!isLoading && !error && (
        <Card className="overflow-hidden border-2 shadow-xl bg-slate-900 border-slate-800">
          <CardContent className="p-0">
            <GameContainer onComplete={handleComplete} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
