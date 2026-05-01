"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, Loader2, AlertCircle, Flame } from "lucide-react";
import { DragonFlightGame } from "@/components/games/vocabulary/dragon-flight/DragonFlightGame";
import type { DragonFlightResults } from "@/lib/games/dragonFlight";
import { useGameStore } from "@/store/useGameStore";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useScopedI18n } from "@/locales/client";

export default function DragonFlightPage() {
  const t = useScopedI18n("pages.student.gamesPage");
  const vocabulary = useGameStore((state) => state.vocabulary);
  const setVocabulary = useGameStore((state) => state.setVocabulary);
  const setLastResult = useGameStore((state) => state.setLastResult);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [xpEarned, setXpEarned] = useState<number | null>(null);
  const [results, setResults] = useState<DragonFlightResults | null>(null);
  const [gameKey, setGameKey] = useState(0); // Key to force component remount

  // Fetch vocabulary from API on mount
  useEffect(() => {
    const fetchVocabulary = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/v1/games/dragon-flight/vocabulary");
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
  }, [setVocabulary, gameKey, t]); // Re-fetch when gameKey changes

  const handleRestart = useCallback(() => {
    setXpEarned(null);
    setResults(null);
    setGameKey((prev) => prev + 1); // Increment key to remount component
  }, []);

  const handleComplete = useCallback(
    async (gameResults: DragonFlightResults) => {
      setLastResult(gameResults.xp, gameResults.accuracy);
      setResults(gameResults); // Store full results for display

      // Send results to API
      try {
        const response = await fetch("/api/v1/games/dragon-flight/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            correctAnswers: gameResults.correctAnswers,
            totalAttempts: gameResults.totalAttempts,
            accuracy: gameResults.accuracy,
            dragonCount: gameResults.dragonCount,
            timeTaken: gameResults.timeTaken,
            difficulty: gameResults.difficulty,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setXpEarned(data.xpEarned);
          console.log("Game completed! XP earned:", data.xpEarned);
        } else {
          console.error("Failed to save game results:", data.message);
        }
      } catch (err) {
        console.error("Error saving game results:", err);
      }
    },
    [setLastResult, setResults],
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
        heading={t("games.dragonFlight.title")}
        text={t("games.dragonFlight.description")}
      >
        <Flame className="h-8 w-8 text-primary" />
      </Header>

      {/* Loading State */}
      {isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
            <p className="text-lg font-medium text-muted-foreground">
              {t("loadingVocabulary")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("preparingAdventure")}
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
      {!isLoading && !error && vocabulary.length >= 10 && (
        <Card className="overflow-hidden border-2">
          <CardContent className="p-0">
            <DragonFlightGame
              key={gameKey}
              vocabulary={vocabulary}
              onComplete={handleComplete}
              onRestart={handleRestart}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
