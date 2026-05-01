"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, Loader2, AlertCircle, Target } from "lucide-react";
import { ArchersRevengeGame } from "@/components/games/vocabulary/archers-revenge/ArchersRevengeGame";
import type { ArchersRevengeResults } from "@/lib/games/archersRevenge";
import { useGameStore } from "@/store/useGameStore";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useScopedI18n, useCurrentLocale } from "@/locales/client";
import { useSession } from "@/hooks/useSession";

export default function ArchersRevengePage() {
  const t = useScopedI18n("pages.student.gamesPage");
  useCurrentLocale();
  useSession();
  const vocabulary = useGameStore((state) => state.vocabulary);
  const setVocabulary = useGameStore((state) => state.setVocabulary);
  const setLastResult = useGameStore((state) => state.setLastResult);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const fetchVocabulary = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          "/api/v1/games/archers-revenge/vocabulary"
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch vocabulary");
        }

        if (data.vocabulary && data.vocabulary.length >= 15) {
          setVocabulary(data.vocabulary);
        } else {
          setError(data.message || t("notEnoughWords", { count: "15" }));
        }
      } catch (err) {
        console.error("Error fetching vocabulary:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load vocabulary"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchVocabulary();
  }, [setVocabulary, t]);

  const handleComplete = useCallback(
    async (gameResults: ArchersRevengeResults) => {
      setLastResult(gameResults.xp, gameResults.accuracy);

      try {
        const response = await fetch("/api/v1/games/archers-revenge/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            correctAnswers: gameResults.correctAnswers,
            totalAttempts: gameResults.totalAttempts,
            accuracy: gameResults.accuracy,
            score: gameResults.score,
            timeTaken: gameResults.timeTaken,
            difficulty: gameResults.difficulty,
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
    [setLastResult]
  );

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/games">
          <ChevronLeft className="mr-1 h-4 w-4" />
          {t("backToGames")}
        </Link>
      </Button>

      <Header
        heading={t("games.archersRevenge.title")}
        text={t("games.archersRevenge.description")}
      >
        <Target className="h-8 w-8 text-primary" />
      </Header>

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

      {!isLoading && !error && vocabulary.length >= 15 && (
        <Card className="overflow-hidden border-2">
          <CardContent className="p-0">
            <ArchersRevengeGame
              vocabulary={vocabulary}
              onComplete={handleComplete}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
