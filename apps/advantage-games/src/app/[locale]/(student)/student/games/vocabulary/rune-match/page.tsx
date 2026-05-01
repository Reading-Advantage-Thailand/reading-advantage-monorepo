"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect } from "react";
import type { RuneMatchGameResult } from "@/components/games/vocabulary/rune-match/RuneMatchGame";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { ChevronLeft, Swords } from "lucide-react";
import { SAMPLE_VOCABULARY } from "@/lib/games/sampleVocabulary";
import { useGameStore } from "@/store/useGameStore";
import { useScopedI18n, useCurrentLocale } from "@/locales/client";
import { useSession } from "@/hooks/useSession";

const RuneMatchGame = dynamic(
  () =>
    import("@/components/games/vocabulary/rune-match/RuneMatchGame").then(
      (mod) => mod.RuneMatchGame,
    ),
  { ssr: false },
);

export default function RuneMatchPage() {
  const t = useScopedI18n("pages.student.gamesPage");
  const locale = useCurrentLocale();
  const { data: session } = useSession();
  const vocabulary = useGameStore((state) => state.vocabulary);
  const setVocabulary = useGameStore((state) => state.setVocabulary);
  const setLastResult = useGameStore((state) => state.setLastResult);

  useEffect(() => {
    const fetchVocabulary = async () => {
      try {
        const response = await fetch("/api/v1/games/rune-match/vocabulary");
        const data = await response.json();
        if (data.vocabulary && data.vocabulary.length > 0) {
          setVocabulary(data.vocabulary);
        } else {
          // Fallback to sample if API fails or returns no data (e.g. for demo/testing)
          console.warn("No vocabulary found from API, using sample data");
          setVocabulary(SAMPLE_VOCABULARY);
        }
      } catch (error) {
        console.error("Failed to fetch vocabulary:", error);
        setVocabulary(SAMPLE_VOCABULARY);
      }
    };

    if (vocabulary.length === 0) {
      fetchVocabulary();
    }
  }, [vocabulary.length, setVocabulary]);

  const handleComplete = useCallback(
    async (results: RuneMatchGameResult) => {
      setLastResult(results.xp, results.accuracy);

      try {
        await fetch("/api/v1/games/rune-match/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            score: results.score,
            correctAnswers: results.correctAnswers,
            totalAttempts: results.totalAttempts,
            accuracy: results.accuracy,
            difficulty: results.monsterType || "NORMAL",
            locale,
            userId: session?.user?.id,
          }),
        });
      } catch (error) {
        console.error("Failed to submit game results:", error);
      }
    },
    [setLastResult, locale, session],
  );

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/student/games">
          <ChevronLeft className="mr-1 h-4 w-4" />
          {t("backToGames")}
        </Link>
      </Button>

      <Header
        heading={t("games.runeMatch.title")}
        text={t("games.runeMatch.description")}
      >
        <Swords className="h-8 w-8 text-primary" />
      </Header>

      <div className="w-full max-w-6xl mx-auto overflow-hidden rounded-xl border-2 border-slate-800 bg-slate-900/50 shadow-2xl backdrop-blur-sm md:aspect-video">
        <RuneMatchGame vocabulary={vocabulary} onComplete={handleComplete} />
      </div>
    </div>
  );
}
