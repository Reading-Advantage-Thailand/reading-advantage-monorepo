"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useScopedI18n, useCurrentLocale } from "@/locales/client";
import {
  Gamepad2,
  Zap,
  Flame,
  ArrowLeft,
  Puzzle,
  Shield,
  RotateCcw,
  CheckCircle2,
  Trophy,
} from "lucide-react";
import Image from "next/image";
import { useGameStore, VocabularyItem } from "@/store/useGameStore";

// Game Components - Imports
import { WizardZombieGame } from "@/components/games/vocabulary/wizard-vs-zombie/WizardZombieGame";
import { RuneMatchGame } from "@/components/games/vocabulary/rune-match/RuneMatchGame";
import { DragonFlightGame } from "@/components/games/vocabulary/dragon-flight/DragonFlightGame";
import { GameContainer as MagicDefenseGame } from "@/components/games/game/GameContainer";

interface Phase10VocabularyMatchingProps {
  userId: string;
  articleId: string;
  onCompleteChange: (complete: boolean) => void;
}

type GameId =
  | "wizard-vs-zombie"
  | "rune-match"
  | "dragon-flight"
  | "magic-defense";

interface GameOption {
  id: GameId;
  title: string;
  description: string;
  icon: any;
  coverImage: string;
  color: string;
  difficulty: string;
  type: string;
}

const GAMES: GameOption[] = [
  {
    id: "wizard-vs-zombie",
    title: "Wizard vs Zombie",
    description: "Use your vocabulary powers to defeat the zombie horde.",
    icon: Zap,
    coverImage: "/games/cover/wizard-vs-zombie-cover.png",
    color: "from-yellow-500 via-amber-500 to-orange-500",
    difficulty: "Easy",
    type: "Spelling",
  },
  {
    id: "rune-match",
    title: "Rune Match",
    description: "Match runes and vocabulary to unlock ancient secrets.",
    icon: Puzzle,
    coverImage: "/games/cover/rune-match-cover.png",
    color: "from-green-500 via-emerald-500 to-teal-500",
    difficulty: "Easy",
    type: "Matching",
  },
  {
    id: "dragon-flight",
    title: "Dragon Flight",
    description: "Choose the correct gate to grow your dragon flight.",
    icon: Flame,
    coverImage: "/games/cover/dragon-flight-cover.png",
    color: "from-purple-500 via-pink-500 to-rose-500",
    difficulty: "Medium",
    type: "Strategy",
  },
  {
    id: "magic-defense",
    title: "Magic Defense",
    description: "Defend your tower using magic spells and vocabulary.",
    icon: Shield,
    coverImage: "/games/cover/magic-defense-cover.png",
    color: "from-blue-500 via-cyan-500 to-teal-500",
    difficulty: "Hard",
    type: "Vocabulary",
  },
];

interface GameResult {
  score: number;
  accuracy: number;
  correctAnswers: number;
  totalAttempts: number;
  gameId: GameId;
}

const Phase10VocabularyMatching: React.FC<Phase10VocabularyMatchingProps> = ({
  userId,
  articleId,
  onCompleteChange,
}) => {
  const t = useScopedI18n("pages.student.lessonPage");
  const currentLocale = useCurrentLocale() as "en" | "th" | "cn" | "tw" | "vi";

  // State
  const [lessonVocabulary, setLessonVocabulary] = useState<VocabularyItem[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [vocabError, setVocabError] = useState<string | null>(null);
  const [isHistoryChecked, setIsHistoryChecked] = useState(false);

  // Magic Defense Store Helper
  const setStoreVocabulary = useGameStore((state) => state.setVocabulary);

  // Buffer onCompleteChange to avoid re-triggering effect
  const onCompleteRef = React.useRef(onCompleteChange);
  useEffect(() => {
    onCompleteRef.current = onCompleteChange;
  }, [onCompleteChange]);

  // 1. Fetch History & Vocabulary on Mount
  useEffect(() => {
    const initPhase = async () => {
      setIsLoading(true);
      try {
        // Parallel Fetch: Vocabulary & Activity Log
        const [vocabRes, logRes] = await Promise.all([
          fetch(`/api/v1/users/wordlist/${userId}?articleId=${articleId}`),
          fetch(
            `/api/v1/users/${userId}/activitylog?articleId=${articleId}&activityType=vocabulary_matching`,
          ),
        ]);

        // Process Vocabulary
        const vocabData = await vocabRes.json();
        if (vocabData.word && Array.isArray(vocabData.word)) {
          const vocab: VocabularyItem[] = vocabData.word.map((item: any) => ({
            term: item.word.vocabulary,
            translation:
              item.word.definition[currentLocale] || item.word.definition["en"],
          }));

          if (vocab.length < 5) {
            setVocabError(t("phase10.notEnoughVocab"));
          } else {
            setLessonVocabulary(vocab);
          }
        }

        // Process Activity Log
        if (logRes.ok) {
          const logData = await logRes.json();
          if (logData.activityLogs && logData.activityLogs.length > 0) {
            // Find the most recent completed log
            const completedLog = logData.activityLogs.find(
              (log: any) => log.completed === true,
            );

            if (completedLog) {
              onCompleteRef.current(true); // Unlock Next

              // Restore last result for the Summary Screen
              if (completedLog.details) {
                setLastResult({
                  score: completedLog.details.score || 0,
                  accuracy: completedLog.details.accuracy || 0,
                  correctAnswers: completedLog.details.correctAnswers || 0,
                  totalAttempts: completedLog.details.totalAttempts || 0,
                  gameId: completedLog.details.gameId || "wizard-vs-zombie", // Default fallback
                });
              }
            }
          }
        }
      } catch (error) {
        console.error("Error initializing Phase 10:", error);
        setVocabError(t("phase10.failedToLoad"));
      } finally {
        setIsLoading(false);
        setIsHistoryChecked(true);
      }
    };

    initPhase();
  }, [userId, articleId, currentLocale]); // Removed onCompleteChange dependency

  // 2. Handle Game Completion
  const handleGameComplete = async (result: any) => {
    const gameResult: GameResult = {
      score: result.score || result.xp || 0,
      accuracy: result.accuracy || 0,
      correctAnswers: result.correctAnswers || 0,
      totalAttempts: result.totalAttempts || 0,
      gameId: activeGame!,
    };

    setLastResult(gameResult);
    setActiveGame(null);
    onCompleteChange(true); // Unlock Next

    // Save to server
    try {
      await fetch(`/api/v1/users/${userId}/activitylog`, {
        method: "POST",
        body: JSON.stringify({
          activityType: "vocabulary_matching",
          activityStatus: "completed",
          xpEarned: 10,
          articleId: articleId,
          details: {
            articleId: articleId, // Added as requested
            gameId: activeGame,
            score: gameResult.score,
            accuracy: gameResult.accuracy,
            correctAnswers: gameResult.correctAnswers,
            totalAttempts: gameResult.totalAttempts,
          },
        }),
      });
    } catch (e) {
      console.error("Failed to save activity log", e);
    }
  };

  const handlePlayGame = (gameId: GameId) => {
    if (gameId === "magic-defense") {
      setStoreVocabulary(lessonVocabulary);
    }
    setActiveGame(gameId);
  };

  // --- RENDER: Active Game ---
  if (activeGame) {
    if (typeof document === "undefined") return null;

    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          onClick={() => setActiveGame(null)}
        />

        {/* Modal Container */}
        <div className="relative w-full max-w-6xl h-full max-h-[85vh] bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 flex items-center justify-between bg-slate-900/50 border-b border-slate-800/50 backdrop-blur-md z-10 shrink-0">
            <Button
              size="sm"
              onClick={() => setActiveGame(null)}
              className="text-slate-400 hover:text-white hover:bg-slate-800/50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("phase10.exitGame")}
            </Button>
            <div className="text-slate-200 font-bold text-lg">
              {GAMES.find((g) => g.id === activeGame)?.title}
            </div>
            <div className="w-24" /> {/* Spacer */}
          </div>

          {/* Game Content */}
          <div className="flex-1 overflow-hidden relative bg-slate-950">
            {activeGame === "wizard-vs-zombie" && (
              <div className="w-full h-full flex items-center justify-center">
                <WizardZombieGame
                  vocabulary={lessonVocabulary}
                  difficulty="normal"
                  onComplete={handleGameComplete}
                />
              </div>
            )}

            {activeGame === "rune-match" && (
              <div className="w-full h-full p-4 overflow-y-auto">
                <RuneMatchGame
                  vocabulary={lessonVocabulary}
                  onComplete={handleGameComplete}
                />
              </div>
            )}

            {activeGame === "dragon-flight" && (
              <div className="w-full h-full flex items-center justify-center bg-black">
                <DragonFlightGame
                  vocabulary={lessonVocabulary}
                  onComplete={handleGameComplete}
                  onRestart={() => {}}
                />
              </div>
            )}

            {activeGame === "magic-defense" && (
              <div className="w-full h-full flex items-center justify-center p-4">
                <MagicDefenseGame onComplete={handleGameComplete} />
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  // --- RENDER: Loading / Error ---
  if (isLoading || !isHistoryChecked) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto p-8">
        <div className="h-12 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse mx-auto opacity-50" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-80 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse opacity-50"
            />
          ))}
        </div>
      </div>
    );
  }

  // --- RENDER: Main Menu ---
  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in slide-in-from-bottom-4 fade-in duration-500 pb-12">
      {/* Header */}
      <div className="text-center space-y-4 bg-gradient-to-br from-indigo-300 via-purple-300 to-pink-300 dark:from-indigo-950 dark:via-purple-950 dark:to-pink-950 p-8 rounded-2xl border border-indigo-200 dark:border-indigo-800">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-100 dark:bg-indigo-900 rounded-full mb-4">
          <Gamepad2 className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("phase10Title")}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          {t("phase10Description")}
        </p>
      </div>

      {vocabError && (
        <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-xl text-center text-destructive flex flex-col items-center gap-2">
          <Shield className="w-8 h-8" />
          <div className="font-semibold">{t("phase10.failedToLoad")}</div>
          <div className="text-sm opacity-80">{vocabError}</div>
        </div>
      )}

      {!vocabError && (
        <>
          {/* Summary Card (If Completed) */}
          {lastResult && (
            <div className="bg-slate-900 rounded-3xl p-1 border border-slate-800 shadow-2xl overflow-hidden mb-12 transform transition-all hover:scale-[1.01]">
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-8 rounded-[22px] relative overflow-hidden">
                {/* Background FX */}
                <div className="absolute top-0 right-0 p-48 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 p-32 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-green-500 blur-xl opacity-20 animate-pulse" />
                      <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
                        <Trophy className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-2xl font-bold text-white">
                          {t("phase10.awesome")}
                        </h3>
                        <Badge
                          variant="secondary"
                          className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border-0"
                        >
                          {t("phase10.completed")}
                        </Badge>
                      </div>
                      <p className="text-slate-400 text-sm">
                        {t("phase10.youCompleted")}
                        <b>
                          {GAMES.find((g) => g.id === lastResult.gameId)?.title}
                        </b>
                        .
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 md:gap-12 bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                    <div className="text-center">
                      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">
                        {t("phase10.score")}
                      </div>
                      <div className="text-3xl font-black text-yellow-400 tabular-nums">
                        {lastResult.score}
                      </div>
                    </div>
                    <div className="w-px h-10 bg-white/10" />
                    <div className="text-center">
                      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">
                        {t("phase10.accuracy")}
                      </div>
                      <div className="text-3xl font-black text-blue-400 tabular-nums">
                        {Math.round(lastResult.accuracy * 100)}
                        <span className="text-lg ml-0.5">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 w-full md:w-auto">
                    <Button
                      onClick={() => handlePlayGame(lastResult.gameId)}
                      size="lg"
                      className="w-full md:w-auto bg-white text-slate-950 hover:bg-slate-200 font-bold rounded-xl shadow-lg shadow-white/5"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      {t("phase10.playAgain")}
                    </Button>
                    <p className="text-[10px] text-center text-slate-500">
                      {t("phase10.continueNext")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Game Selection Grid */}
          <div className="space-y-4">
            {!lastResult && (
              <div className="flex items-center gap-2 text-sm text-slate-500 font-medium px-1">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                {t("phase10.chooseGame")}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
              {GAMES.map((game) => {
                const Icon = game.icon;
                const isLastPlayed = lastResult?.gameId === game.id;

                return (
                  <Card
                    key={game.id}
                    className={`group relative cursor-pointer overflow-hidden border-2 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl flex flex-col
                                    ${
                                      isLastPlayed
                                        ? "border-green-500/50 ring-4 ring-green-500/10 dark:bg-slate-900"
                                        : "border-transparent hover:border-purple-500/30 bg-white dark:bg-slate-900/50 shadow-md"
                                    }
                                `}
                    onClick={() => handlePlayGame(game.id)}
                  >
                    <div className="relative h-40 w-full overflow-hidden">
                      <Image
                        src={game.coverImage}
                        alt={game.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div
                        className={`absolute inset-0 bg-gradient-to-t ${game.color} opacity-80 group-hover:opacity-60 transition-opacity duration-300`}
                      />

                      <div className="absolute top-3 right-3">
                        <Badge
                          variant="secondary"
                          className="backdrop-blur-md bg-white/20 text-white border-white/20 shadow-sm"
                        >
                          {game.difficulty}
                        </Badge>
                      </div>

                      <div className="absolute bottom-3 left-3 flex items-center gap-3">
                        <div className="p-2.5 bg-white/90 dark:bg-slate-950/90 rounded-xl shadow-lg backdrop-blur-sm transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 text-primary">
                          <Icon className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    <CardContent className="p-5 flex-1 flex flex-col">
                      <div className="mb-2">
                        <h3 className="font-bold text-lg leading-tight group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {game.title}
                        </h3>
                        <div className="text-xs text-muted-foreground font-medium mt-1">
                          {game.type}
                        </div>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {game.description}
                      </p>

                      {isLastPlayed && (
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs font-bold text-green-600 dark:text-green-400">
                          <CheckCircle2 className="w-3 h-3" />
                          {t("phase10.lastPlayed")}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

Phase10VocabularyMatching.displayName = "Phase10VocabularyMatching";
export default Phase10VocabularyMatching;
