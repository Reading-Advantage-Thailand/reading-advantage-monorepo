"use client";

import dynamic from "next/dynamic";
import type { PotionRushGameResult } from "@/components/games/sentence/potion-rush/PotionRushGame";
import type { VocabularyItem } from "@/store/useGameStore";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Beaker,
  ArrowLeft,
  Trophy,
  Gamepad2,
  AlertTriangle,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { Header } from "@/components/header";
import { useCallback, useEffect, useState } from "react";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const PotionRushGame = dynamic(
  () => import("@/components/games/sentence/potion-rush/PotionRushGame"),
  { ssr: false },
);

type Difficulty = "easy" | "normal" | "hard" | "extreme";

type RankingEntry = {
  userId: string;
  name: string;
  image: string | null;
  xp: number;
};

type WarningStatus = {
  type: "NO_SENTENCES" | "INSUFFICIENT_SENTENCES" | null;
  requiredCount?: number;
  currentCount?: number;
};

export default function PotionRushPage() {
  const [vocabList, setVocabList] = useState<VocabularyItem[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [activeTab, setActiveTab] = useState<"game" | "rankings">("game");
  const [rankings, setRankings] = useState<Record<string, RankingEntry[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [warningStatus, setWarningStatus] = useState<WarningStatus>({
    type: null,
  });

  const locale = useCurrentLocale();
  const t = useScopedI18n("pages.student.gamesPage.potionRush");

  // Fetch Sentences
  useEffect(() => {
    const fetchSentences = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(
          `/api/v1/games/potion-rush/sentences?locale=${locale}`,
        );
        const data = await res.json();

        if (data.warning === "NO_SENTENCES") {
          setWarningStatus({ type: "NO_SENTENCES" });
        } else if (data.warning === "INSUFFICIENT_SENTENCES") {
          setWarningStatus({
            type: "INSUFFICIENT_SENTENCES",
            requiredCount: data.requiredCount,
            currentCount: data.currentCount,
          });
        } else {
          setWarningStatus({ type: null });
        }

        if (data.sentences) {
          setVocabList(data.sentences);
        }
      } catch (error) {
        console.error("Failed to load sentences:", error);
        setWarningStatus({ type: "NO_SENTENCES" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSentences();
  }, [locale]);

  // Fetch Rankings
  const fetchRankings = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/games/potion-rush/ranking");
      const data = await res.json();
      if (data.rankings) {
        setRankings(data.rankings);
      }
    } catch (error) {
      console.error("Failed to load rankings:", error);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "rankings") {
      fetchRankings();
    }
  }, [activeTab, fetchRankings]);

  const handleComplete = useCallback(
    async (results: {
      xp: number;
      accuracy: number;
      difficulty: string;
      score: number;
    }) => {
      try {
        await fetch("/api/v1/games/potion-rush/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            score: results.score,
            accuracy: results.accuracy,
            difficulty: results.difficulty,
            correctAnswers: Math.floor(results.score / 10), // Approximate for now or rely on game store to pass correct counts
            totalAttempts: Math.floor(results.score / 10) + 2, // Approximate
            gameTime: 0, // Not passed yet
          }),
        });

        // Refresh rankings silently
        fetchRankings();
      } catch (e) {
        console.error("Failed to submit game results", e);
      }
    },
    [fetchRankings],
  );

  // Loading Screen
  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
          <p className="text-lg font-medium text-muted-foreground">
            {"กำลังโหลด"}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Warning Screen
  if (warningStatus.type) {
    return (
      <main className="min-h-screen px-6 py-10 text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 items-start">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/student/games">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Games
            </Link>
          </Button>

          <Header
            heading="Potion Rush"
            text="Mix ingredients to fulfill orders and become the master alchemist!"
          >
            <Beaker className="h-8 w-8 text-primary" />
          </Header>

          <div className="flex items-center justify-center min-h-[70vh]">
            <div className="max-w-2xl w-full">
              <div className="bg-gradient-to-br from-amber-500/10 to-red-500/10 border-2 border-amber-500/30 rounded-3xl p-8 md:p-12 shadow-2xl backdrop-blur-sm">
                <div className="flex justify-center mb-6">
                  <div className="bg-amber-500/20 p-6 rounded-full border-2 border-amber-500/50">
                    <AlertTriangle className="w-16 h-16 text-amber-400" />
                  </div>
                </div>

                <h1 className="text-3xl md:text-4xl font-bold text-center mb-4 bg-gradient-to-r from-amber-300 to-red-300 bg-clip-text text-transparent">
                  {warningStatus.type === "NO_SENTENCES"
                    ? t("noSentences")
                    : t("insufficientSentences")}
                </h1>

                <div className="text-center mb-8 space-y-3">
                  {warningStatus.type === "NO_SENTENCES" ? (
                    <p className="text-lg text-white/80">
                      {t("noSentencesDesc")}
                    </p>
                  ) : (
                    <>
                      <p className="text-lg text-white/80">
                        {t("insufficientDesc", {
                          count: warningStatus.requiredCount || 0,
                        })}
                      </p>
                      <p className="text-lg text-white/80">
                        {t("currentCount", {
                          count: warningStatus.currentCount || 0,
                        })}
                      </p>
                    </>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/student/articles"
                    className="group bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/50 flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-5 h-5" />
                    {t("readArticles")}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full h-full min-h-[calc(100vh-120px)] bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-white/10 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link
            href="/student/games"
            className="p-2 hover:bg-white/10 rounded-full transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent truncate">
              {"Potion Rush"}
            </h1>
            <p className="text-xs text-white/50 hidden sm:block">
              {t("subtitle")}
            </p>
          </div>
        </div>

        <div className="flex bg-slate-800 p-1 rounded-lg shrink-0">
          <button
            onClick={() => setActiveTab("game")}
            className={cn(
              "px-2 sm:px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-1 sm:gap-2",
              activeTab === "game"
                ? "bg-purple-600 text-white shadow-md"
                : "text-white/60 hover:text-white",
            )}
          >
            <Gamepad2 className="w-4 h-4" />
            <span className="hidden sm:inline">{t("play")}</span>
          </button>
          <button
            onClick={() => setActiveTab("rankings")}
            className={cn(
              "px-2 sm:px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-1 sm:gap-2",
              activeTab === "rankings"
                ? "bg-amber-600 text-white shadow-md"
                : "text-white/60 hover:text-white",
            )}
          >
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">{t("rankings")}</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden">
        {activeTab === "game" ? (
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Difficulty Selector */}
            <div className="bg-slate-900/80 border-b border-white/5 py-2 px-3 sm:px-6 flex flex-wrap justify-center gap-1 sm:gap-2">
              {(["easy", "normal", "hard", "extreme"] as Difficulty[]).map(
                (dif) => (
                  <button
                    key={dif}
                    onClick={() => setDifficulty(dif)}
                    className={cn(
                      "px-2 sm:px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all border",
                      difficulty === dif
                        ? "bg-white text-slate-900 border-white scale-105"
                        : "bg-transparent text-white/40 border-white/10 hover:border-white/30",
                    )}
                  >
                    {dif}
                  </button>
                ),
              )}
            </div>

            {/* Game Canvas container - grow to fill remaining space */}
            <div className="flex-1 h-full w-full bg-neutral-900 relative">
              <div className="absolute inset-0">
                <PotionRushGame
                  vocabList={vocabList}
                  difficulty={difficulty}
                  onComplete={handleComplete}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 sm:p-6 max-w-4xl mx-auto w-full h-full overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center gap-2">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
              {t("leaderboards")}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
              {(["easy", "normal", "hard", "extreme"] as Difficulty[]).map(
                (dif) => (
                  <div
                    key={dif}
                    className="bg-slate-900 rounded-xl border border-white/10 overflow-hidden"
                  >
                    <div className="px-4 py-3 bg-slate-800 border-b border-white/5 flex justify-between items-center">
                      <h3 className="font-bold capitalize text-white/90">
                        {t("mode", { difficulty: t(`difficulty.${dif}`) })}
                      </h3>
                    </div>
                    <div className="divide-y divide-white/5">
                      {rankings[dif]?.length ? (
                        rankings[dif].map((entry, index) => (
                          <div
                            key={entry.userId}
                            className="px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
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
                                      : "bg-slate-800 text-white/50",
                              )}
                            >
                              {index + 1}
                            </div>
                            <div className="flex-1 truncate font-medium text-white/80">
                              {entry.name}
                            </div>
                            <div className="font-mono text-purple-400 font-bold">
                              {entry.xp.toLocaleString()} XP
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-white/30 text-sm">
                          {t("noRecords")}
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
