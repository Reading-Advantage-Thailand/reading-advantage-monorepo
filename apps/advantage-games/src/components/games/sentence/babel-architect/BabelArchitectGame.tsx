"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, BookOpen, Building2, ChevronUp, RotateCw } from "lucide-react";
import {
  completeBabelArchitectRun,
  createBabelArchitectState,
  estimateBabelArchitectXP,
  placeBabelArchitectBlock,
  tickBabelArchitect,
  type BabelArchitectDifficulty,
  type BabelArchitectState,
} from "@/lib/games/babelArchitect";
import type { VocabularyItem } from "@/store/useGameStore";
import { useGameFullscreen } from "@/hooks/useGameFullscreen";
import { useAccessibilitySettings } from "@/hooks/useAccessibilitySettings";
import { GameEndScreen } from "@/components/games/game/GameEndScreen";
import { GameStartScreen } from "@/components/games/game/GameStartScreen";
import {
  createBabelArchitectGame,
  type BabelArchitectAdapterHandle,
} from "./babelArchitectAdapter";

/** Final results handed to the page for XP display and server submission. */
export type BabelArchitectGameResult = {
  xp: number;
  accuracy: number;
  score: number;
  correctAnswers: number;
  totalAttempts: number;
  victory: boolean;
};

interface BabelArchitectGameProps {
  sentences: VocabularyItem[];
  onComplete: (results: BabelArchitectGameResult) => void;
}

const VIEWPORT_WIDTH = 390;
const VIEWPORT_HEIGHT = 844;

/**
 * Runs Babel's Architect with a Phaser render layer and React-owned rules.
 * @param sentences Sentence items for the round.
 * @param onComplete Callback fired once with final XP, accuracy, and score.
 * @returns The start, play, and end screens for the tower-stacking game.
 */
export function BabelArchitectGame({ sentences, onComplete }: BabelArchitectGameProps) {
  const { containerRef, enterFullscreen, exitFullscreen } = useGameFullscreen();
  const { getEffectiveTextSize } = useAccessibilitySettings();
  const [gameState, setGameState] = useState<BabelArchitectState | null>(null);
  const [gamePhase, setGamePhase] = useState<"start" | "playing" | "ended">("start");
  const [results, setResults] = useState<BabelArchitectGameResult | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<BabelArchitectDifficulty>("normal");

  const gameStateRef = useRef<BabelArchitectState | null>(null);
  gameStateRef.current = gameState;
  const adapterRef = useRef<BabelArchitectAdapterHandle | null>(null);
  const rafRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const hasReportedRef = useRef(false);
  const phaserContainerRef = useRef<HTMLDivElement | null>(null);
  const placeBlockRef = useRef<(blockId: string) => void>(() => {});

  placeBlockRef.current = (blockId: string) => {
    const prev = gameStateRef.current;
    if (!prev || prev.phase !== "playing") return;
    const next = placeBabelArchitectBlock(prev, blockId);
    gameStateRef.current = next;
    adapterRef.current?.setState(next);
    setGameState(next);
  };

  const createInitialState = useCallback(() => {
    return createBabelArchitectState(sentences, {
      difficulty: selectedDifficulty,
      nowMs: Date.now(),
    });
  }, [sentences, selectedDifficulty]);

  const handleStart = useCallback(() => {
    if (sentences.length === 0) return;
    const initial = createInitialState();
    gameStateRef.current = initial;
    setGameState(initial);
    setResults(null);
    hasReportedRef.current = false;
    setGamePhase("playing");
  }, [sentences.length, createInitialState]);

  const handleRestart = useCallback(() => {
    setGamePhase("start");
    setGameState(null);
    gameStateRef.current = null;
  }, []);

  useEffect(() => {
    if (gamePhase === "playing") {
      enterFullscreen();
    } else {
      exitFullscreen();
    }
  }, [gamePhase, enterFullscreen, exitFullscreen]);

  useEffect(() => {
    if (gamePhase !== "playing" || !phaserContainerRef.current || !gameStateRef.current) {
      return;
    }

    const adapter = createBabelArchitectGame({
      container: phaserContainerRef.current,
      width: VIEWPORT_WIDTH,
      height: VIEWPORT_HEIGHT,
      initialState: gameStateRef.current,
      onPlaceBlock: (blockId) => placeBlockRef.current(blockId),
    });
    adapterRef.current = adapter;

    return () => {
      adapter.destroy();
      adapterRef.current = null;
    };
  }, [gamePhase]);

  useEffect(() => {
    if (gamePhase !== "playing") return;

    const loop = (timestamp: number) => {
      const delta = lastFrameRef.current ? timestamp - lastFrameRef.current : 16;
      lastFrameRef.current = timestamp;
      const clampedDelta = Math.min(delta, 50);
      const prev = gameStateRef.current;
      if (prev && prev.phase === "playing") {
        const next = tickBabelArchitect(prev, clampedDelta);
        gameStateRef.current = next;
        adapterRef.current?.setState(next);
        setGameState(next);
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      lastFrameRef.current = 0;
    };
  }, [gamePhase]);

  useEffect(() => {
    if (!gameState) return;
    if (gameState.phase === "victory" || gameState.phase === "defeat") {
      if (gamePhase !== "ended") {
        const summary = completeBabelArchitectRun(gameState);
        const xp = estimateBabelArchitectXP(summary);
        setResults({
          xp,
          accuracy: summary.accuracy,
          score: summary.score,
          correctAnswers: summary.correctAnswers,
          totalAttempts: summary.totalAttempts,
          victory: summary.victory,
        });
        setGamePhase("ended");
      }
    }
  }, [gameState?.phase, gamePhase, gameState]);

  useEffect(() => {
    if (gamePhase === "ended" && results && !hasReportedRef.current) {
      hasReportedRef.current = true;
      onComplete(results);
    }
  }, [gamePhase, results, onComplete]);

  if (gamePhase === "start") {
    return (
      <div
        ref={containerRef}
        className="relative mx-auto aspect-[390/844] w-full max-w-[420px] overflow-hidden rounded-3xl bg-slate-900 shadow-2xl ring-1 ring-white/10"
      >
        <GameStartScreen
          gameTitle="Babel's Architect"
          gameSubtitle="Build the sentence from the translation"
          vocabulary={sentences}
          icon={Building2}
          instructions={[
            {
              step: 1,
              text: "Read the translation at the top to learn the target sentence.",
              icon: BookOpen,
            },
            {
              step: 2,
              text: "Tap the stone blocks in the correct word order to stack the tower.",
              icon: ChevronUp,
            },
            {
              step: 3,
              text: "Wrong placements crack the tower's stability. Build every sentence before it collapses.",
              icon: AlertTriangle,
            },
          ]}
          proTip="Stability slowly drains over time. Correct placements recover stability, so build quickly and accurately."
          controls={[
            { label: "Place block", keys: "Tap / 1-9", color: "bg-amber-500" },
            { label: "Restart", keys: "After end screen", color: "bg-slate-500" },
          ]}
          startButtonText="Raise the Tower"
          onStart={handleStart}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <label
                htmlFor="babel-difficulty"
                className="text-sm uppercase tracking-wider text-white/50"
              >
                Tower Height:
              </label>
              <select
                id="babel-difficulty"
                value={selectedDifficulty}
                onChange={(e) =>
                  setSelectedDifficulty(e.target.value as BabelArchitectDifficulty)
                }
                className="bg-slate-800 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="easy">Foundation (Easy)</option>
                <option value="normal">Spire (Normal)</option>
                <option value="hard">Babel (Hard)</option>
              </select>
            </div>
          </div>
        </GameStartScreen>
      </div>
    );
  }

  if (gamePhase === "ended" && results) {
    return (
      <div
        ref={containerRef}
        className="relative mx-auto aspect-[390/844] w-full max-w-[420px] overflow-hidden rounded-3xl bg-slate-900 shadow-2xl ring-1 ring-white/10"
      >
        <GameEndScreen
          status={results.victory ? "victory" : "defeat"}
          score={results.score}
          xp={results.xp}
          accuracy={results.accuracy}
          onRestart={handleRestart}
          customStats={[
            { label: "Sentences", value: gameState?.currentSentenceIndex ?? 0 },
            {
              label: "Errors",
              value: gameState?.errors ?? 0,
              icon: RotateCw,
            },
          ]}
          showLeaderboardLink
          gameId="babel-architect"
          gameName="Babel's Architect"
        />
      </div>
    );
  }

  const textSize = getEffectiveTextSize(16);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto aspect-[390/844] w-full max-w-[420px] overflow-hidden rounded-3xl bg-slate-900 shadow-2xl ring-1 ring-white/10 touch-none"
    >
      <div ref={phaserContainerRef} className="absolute inset-0" />

      {gameState && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-1 p-3">
          <p
            className="text-center text-amber-200/90"
            style={{ fontSize: textSize }}
          >
            {gameState.targetTranslation}
          </p>
          <div className="flex items-start justify-between gap-2">
            <span
              className="rounded-lg bg-amber-500/20 px-2 py-1 font-bold text-amber-300"
              style={{ fontSize: textSize }}
            >
              Stability: {Math.round(gameState.stability)}
            </span>
            <span
              className="rounded-lg bg-cyan-500/10 px-2 py-1 font-semibold text-cyan-300"
              style={{ fontSize: textSize }}
            >
              Sentence {gameState.currentSentenceIndex + 1}/{gameState.sentences.length}
            </span>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center text-xs text-white/40">
        Tap blocks in sentence order
      </div>
    </div>
  );
}
