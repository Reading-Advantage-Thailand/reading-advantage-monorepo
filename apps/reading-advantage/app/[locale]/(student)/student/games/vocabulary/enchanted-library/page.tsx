"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import type { EnchantedLibraryGameResult } from "@/components/games/vocabulary/enchanted-library/EnchantedLibraryGame";
import type { VocabularyItem } from "@/store/useGameStore";
import type { Difficulty } from "@/lib/games/enchantedLibrary";
import { Button } from "@/components/ui/button";
import { ChevronLeft, BookOpen, Trophy, Gamepad2 } from "lucide-react";
import { Header } from "@/components/header";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const EnchantedLibraryGame = dynamic(
  () =>
    import("@/components/games/vocabulary/enchanted-library/EnchantedLibraryGame").then(
      (mod) => mod.EnchantedLibraryGame,
    ),
  { ssr: false },
);

interface RankingEntry {
  userId: string;
  name: string;
  image: string | null;
  xp: number;
}

export default function EnchantedLibraryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [activeTab, setActiveTab] = useState<"game" | "rankings">("game");
  const [rankings, setRankings] = useState<Record<Difficulty, RankingEntry[]>>({
    easy: [],
    normal: [],
    hard: [],
    extreme: [],
  });

  // Load vocabulary from API
  useEffect(() => {
    const loadVocabulary = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/v1/games/enchanted-library/vocabulary?locale=${locale}`,
        );
        const data = await response.json();

        if (
          data.warning === "NO_VOCABULARY" ||
          data.warning === "INSUFFICIENT_VOCABULARY"
        ) {
          setError(data.message);
          setVocabulary([]);
        } else if (data.vocabulary) {
          setVocabulary(data.vocabulary);
          setError(null);
        }
      } catch (err) {
        console.error("Failed to load vocabulary:", err);
        setError("Failed to load vocabulary. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadVocabulary();
  }, [locale]);

  // Load rankings
  useEffect(() => {
    const loadRankings = async () => {
      try {
        const response = await fetch("/api/v1/games/enchanted-library/ranking");
        const data = await response.json();

        if (data.rankings) {
          setRankings(data.rankings);
        }
      } catch (err) {
        console.error("Failed to load rankings:", err);
      }
    };

    loadRankings();
  }, []);

  const handleComplete = useCallback(
    async (results: EnchantedLibraryGameResult & { gameTime: number }) => {
      try {
        const response = await fetch(
          "/api/v1/games/enchanted-library/complete",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              score: results.xp,
              correctAnswers: Math.floor(results.xp / results.accuracy),
              totalAttempts: Math.floor(
                results.xp / results.accuracy / results.accuracy,
              ),
              accuracy: results.accuracy,
              difficulty,
              gameTime: results.gameTime,
            }),
          },
        );

        const data = await response.json();

        if (data.xpEarned) {
          console.log("Game completed! XP earned:", data.xpEarned);
          // Reload rankings after game completion
          const rankingsResponse = await fetch(
            "/api/v1/games/enchanted-library/ranking",
          );
          const rankingsData = await rankingsResponse.json();
          if (rankingsData.rankings) {
            setRankings(rankingsData.rankings);
          }
        }
      } catch (err) {
        console.error("Failed to save game results:", err);
      }
    },
    [difficulty],
  );

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
          <p className="text-lg font-medium text-muted-foreground">
            {"กำลังโหลดคำศัพท์"}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen px-6 py-10 text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
          <Link
            href="/student/games"
            className="text-sm uppercase tracking-[0.2em] text-white/60 transition hover:text-white"
          >
            Back to Games
          </Link>

          <div className="bg-red-900/30 border border-red-500 rounded-lg p-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Unable to Load Game</h2>
            <p className="text-red-200">{error}</p>
            <p className="text-sm text-red-300 mt-4">
              Please save some vocabulary words to your flashcards first by
              reading articles.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-3 sm:px-6 text-slate-900">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href="/student/games">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Games
        </Link>
      </Button>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <Header
            heading="Enchanted Library"
            text="Collect magic books to master new words while dodging friendly spirits."
          >
            <BookOpen className="h-8 w-8 text-primary" />
          </Header>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start">
            <button
              onClick={() => setActiveTab("game")}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                activeTab === "game"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white",
              )}
            >
              <Gamepad2 className="w-4 h-4" />
              Play
            </button>
            <button
              onClick={() => setActiveTab("rankings")}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                activeTab === "rankings"
                  ? "bg-amber-600 text-white shadow-md"
                  : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white",
              )}
            >
              <Trophy className="w-4 h-4" />
              Rankings
            </button>
          </div>
        </div>

        {activeTab === "game" ? (
          <EnchantedLibraryGame
            vocabulary={vocabulary}
            onComplete={handleComplete}
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
            rankings={rankings}
          />
        ) : (
          <div className="p-6 w-full bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
              <Trophy className="w-6 h-6 text-amber-500" />
              Leaderboards
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {(["easy", "normal", "hard", "extreme"] as Difficulty[]).map(
                (dif) => (
                  <div
                    key={dif}
                    className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden"
                  >
                    <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-white/5 flex justify-between items-center">
                      <h3 className="font-bold capitalize text-slate-700 dark:text-white/90">
                        {dif} Mode
                      </h3>
                    </div>
                    <div className="divide-y divide-slate-200 dark:divide-white/5">
                      {rankings[dif]?.length ? (
                        rankings[dif].map((entry, index) => (
                          <div
                            key={entry.userId}
                            className="px-4 py-3 flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                          >
                            <div
                              className={cn(
                                "w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold",
                                index === 0
                                  ? "bg-amber-400 text-slate-900"
                                  : index === 1
                                    ? "bg-slate-300 text-slate-900"
                                    : index === 2
                                      ? "bg-amber-700 text-white"
                                      : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-white/50",
                              )}
                            >
                              {index + 1}
                            </div>
                            <div className="flex-1 truncate font-medium text-slate-700 dark:text-white/80">
                              {entry.name}
                            </div>
                            <div className="font-mono text-purple-600 dark:text-purple-400 font-bold">
                              {entry.xp.toLocaleString()} XP
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-slate-500 dark:text-white/30 text-sm">
                          No records yet
                        </div>
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
