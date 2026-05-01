"use client";

import React from "react";
import { useGameStore, Difficulty } from "@/store/useGameStore";
import { StartScreen } from "./StartScreen";
import { GameEngine } from "./GameEngine";
import { ResultsScreen } from "./ResultsScreen";
import { calculateXP } from "@/lib/games/xp";

import { RankingDialog } from "./RankingDialog";

interface GameContainerProps {
  onComplete?: (results: {
    score: number;
    correctAnswers: number;
    totalAttempts: number;
    accuracy: number;
    difficulty: Difficulty;
  }) => void;
}

export function GameContainer({ onComplete }: GameContainerProps) {
  const {
    status,
    vocabulary,
    score,
    correctAnswers,
    totalAttempts,
    resetGame,
  } = useGameStore();

  const [difficulty, setDifficulty] = React.useState<Difficulty>("normal");
  const [showRanking, setShowRanking] = React.useState(false);

  const accuracy = totalAttempts > 0 ? correctAnswers / totalAttempts : 0;
  const xp = calculateXP(score, correctAnswers, totalAttempts);

  React.useEffect(() => {
    if (status === "game-over" && onComplete) {
      onComplete({
        score,
        correctAnswers,
        totalAttempts,
        accuracy,
        difficulty,
      });
    }
  }, [
    status,
    onComplete,
    score,
    correctAnswers,
    totalAttempts,
    accuracy,
    difficulty,
  ]);

  const handleStart = (selectedDifficulty: Difficulty) => {
    setDifficulty(selectedDifficulty);
    resetGame();
  };

  return (
    <div className="relative w-full h-[560px] sm:h-[600px] overflow-hidden rounded-3xl border border-purple-500/20 bg-slate-900/40 backdrop-blur-md shadow-[0_0_40px_rgba(168,85,247,0.15)] ring-1 ring-white/10">
      {status === "idle" && (
        <StartScreen
          vocabulary={vocabulary}
          onStart={handleStart}
          onShowRanking={() => setShowRanking(true)}
        />
      )}

      {status === "playing" && <GameEngine difficulty={difficulty} />}

      {status === "game-over" && (
        <ResultsScreen
          score={score}
          accuracy={accuracy}
          xp={xp}
          missedWords={useGameStore.getState().missedWords}
          onRestart={resetGame}
          onShowRanking={() => setShowRanking(true)}
        />
      )}

      <RankingDialog open={showRanking} onOpenChange={setShowRanking} />
    </div>
  );
}
