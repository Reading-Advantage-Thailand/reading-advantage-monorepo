"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Stage,
  Layer,
  Text,
  Group,
  Rect,
  Image as KonvaImage,
} from "react-konva";
import {
  Difficulty,
  GAME_HEIGHT,
  GAME_WIDTH,
  InputState,
  WizardZombieState,
  advanceWizardZombieTime,
  createWizardZombieState,
} from "@/lib/games/wizardZombie";
import type { VocabularyItem } from "@/store/useGameStore";
import { useSound } from "@/hooks/useSound";
import { useInterval } from "@/hooks/useInterval";
import { useDirectionalInput } from "@/hooks/useDirectionalInput";
import { VirtualDPad } from "@/components/games/ui/VirtualDPad";
import { calculateIndicators } from "@/lib/games/wizardZombieIndicators";
import { withBasePath } from "@/lib/games/basePath";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Zap,
  BookOpen,
  Trophy,
  Target,
  Sparkles,
  Home,
  RotateCcw,
  Skull,
} from "lucide-react";
import { calculateXP } from "@/lib/games/xp";
import { useScopedI18n } from "@/locales/client";

export type WizardZombieGameResult = {
  xp: number;
  accuracy: number;
  correctAnswers: number;
  totalAttempts: number;
};

type FloatingText = {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number; // 0-1
  velocity: { x: number; y: number };
};

interface WizardZombieGameProps {
  vocabulary: VocabularyItem[];
  difficulty: Difficulty;
  onComplete: (results: WizardZombieGameResult) => void;
}

// Sprite Helper
const buildSpriteGrid = (width: number, height: number) => {
  const fw = width / 3;
  const fh = height / 3;
  return { fw, fh };
};

const getSpriteCrop = (fw: number, fh: number, col: number, row: number) => ({
  x: col * fw,
  y: row * fh,
  width: fw,
  height: fh,
});

export function WizardZombieGame({
  vocabulary,
  difficulty,
  onComplete,
}: WizardZombieGameProps) {
  const t = useScopedI18n("pages.student.gamesPage");
  const { playSound } = useSound();
  const { input, setVirtualInput, triggerCast, consumeCast } =
    useDirectionalInput();
  const [gameState, setGameState] = useState<WizardZombieState | null>(() =>
    createWizardZombieState(vocabulary, { difficulty }),
  );
  const [hasStarted, setHasStarted] = useState(false);

  const [assets, setAssets] = useState<{
    player: HTMLImageElement;
    zombie: HTMLImageElement;
    orb: HTMLImageElement;
    floor: HTMLImageElement;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });

  // Animation Frames
  const [playerFrame, setPlayerFrame] = useState(0);
  const [zombieFrame, setZombieFrame] = useState(0);
  const [orbFrame, setOrbFrame] = useState(0);

  // Juice State
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [screenShake, setScreenShake] = useState(0);
  const [damageFlash, setDamageFlash] = useState(0); // opacity
  const [shockwaveRing, setShockwaveRing] = useState(0); // scale/opacity

  // Asset Loading
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const loadImage = (src: string): Promise<HTMLImageElement> =>
        new Promise((res, rej) => {
          const img = new Image();
          img.src = withBasePath(src);
          img.onload = () => res(img);
          img.onerror = rej;
        });

      try {
        const [player, zombie, orb, floor] = await Promise.all([
          loadImage(
            "/games/vocabulary/wizard-vs-zombie/player_3x3_pose_sheet.png",
          ),
          loadImage(
            "/games/vocabulary/wizard-vs-zombie/zombie_3x3_pose_sheet.png",
          ),
          loadImage(
            "/games/vocabulary/wizard-vs-zombie/orb_3x3_pose_sheet.png",
          ),
          loadImage("/games/vocabulary/wizard-vs-zombie/tile-ruins.png"),
        ]);
        if (mounted) setAssets({ player, zombie, orb, floor });
      } catch (e) {
        console.error("Failed to load assets", e);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const resetGame = useCallback(() => {
    if (vocabulary.length > 0) {
      setGameState(createWizardZombieState(vocabulary));
    }
  }, [vocabulary]);

  useEffect(() => {
    resetGame();
  }, [resetGame]);

  // Animation Loop
  useInterval(() => {
    if (hasStarted) {
      setPlayerFrame((f) => (f + 1) % 3);
      setZombieFrame((f) => (f + 1) % 3);
      setOrbFrame((f) => (f + 1) % 3);
    }
  }, 150);

  // Calculate indicators
  const indicators =
    gameState && dimensions.width > 0
      ? calculateIndicators(gameState.orbs, camera, dimensions)
      : [];

  // Game Loop
  useInterval(
    () => {
      if (gameState && gameState.status === "playing" && assets && hasStarted) {
        const nextState = advanceWizardZombieTime(
          gameState,
          50,
          input,
          vocabulary,
        );

        // Diffing for Juice
        if (gameState) {
          // Damage check
          if (nextState.player.hp < gameState.player.hp) {
            setScreenShake(10);
            setDamageFlash(0.5);
            setFloatingTexts((prev) => [
              ...prev,
              {
                id: Math.random().toString(),
                x: nextState.player.x,
                y: nextState.player.y - 20,
                text: `-${gameState.player.hp - nextState.player.hp}`,
                color: "#ef4444", // red-500
                life: 1.0,
                velocity: { x: (Math.random() - 0.5) * 2, y: -3 },
              },
            ]);
          }
          // Score check
          if (nextState.score > gameState.score) {
            setFloatingTexts((prev) => [
              ...prev,
              {
                id: Math.random().toString(),
                x: nextState.player.x,
                y: nextState.player.y - 40,
                text: `+${nextState.score - gameState.score}`,
                color: "#fbbf24", // amber-400
                life: 1.0,
                velocity: { x: (Math.random() - 0.5) * 2, y: -4 },
              },
            ]);
          }
          // Penalty check
          if (nextState.score < gameState.score) {
            setFloatingTexts((prev) => [
              ...prev,
              {
                id: Math.random().toString(),
                x: nextState.player.x,
                y: nextState.player.y - 40,
                text: `${nextState.score - gameState.score}`,
                color: "#ef4444", // red-500
                life: 1.0,
                velocity: { x: (Math.random() - 0.5) * 2, y: -2 },
              },
            ]);
          }
        }

        // Update Juice
        if (screenShake > 0) setScreenShake((prev) => Math.max(0, prev - 1));
        if (damageFlash > 0) setDamageFlash((prev) => Math.max(0, prev - 0.05));
        if (shockwaveRing > 0)
          setShockwaveRing((prev) => Math.max(0, prev - 0.1));
        setFloatingTexts((prev) =>
          prev
            .map((ft) => ({
              ...ft,
              life: ft.life - 0.02,
              x: ft.x + ft.velocity.x,
              y: ft.y + ft.velocity.y,
            }))
            .filter((ft) => ft.life > 0),
        );

        setGameState(nextState);

        if (input.cast) {
          consumeCast();
          playSound("success");
          setShockwaveRing(1.0);
        }

        if (dimensions.width > 0 && dimensions.height > 0) {
          const scaleY = dimensions.height / GAME_HEIGHT;
          const scale = Math.max(scaleY, 0.8);

          let camX = dimensions.width / 2 - nextState.player.x * scale;
          let camY = dimensions.height / 2 - nextState.player.y * scale;

          const minX = dimensions.width - GAME_WIDTH * scale;
          const minY = dimensions.height - GAME_HEIGHT * scale;

          if (minX > 0) camX = (dimensions.width - GAME_WIDTH * scale) / 2;
          else camX = Math.max(minX, Math.min(0, camX));

          if (minY > 0) camY = (dimensions.height - GAME_HEIGHT * scale) / 2;
          else camY = Math.max(minY, Math.min(0, camY));

          setCamera({ x: camX, y: camY, scale });
        }
      }
    },
    gameState?.status === "playing" && hasStarted ? 50 : null,
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      if (width > 0 && height > 0) setDimensions({ width, height });
    };

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          setDimensions({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      }
    });

    observer.observe(containerRef.current);
    const interval = setInterval(updateDimensions, 200);
    const timeout = setTimeout(() => clearInterval(interval), 2000);
    updateDimensions();

    return () => {
      observer.disconnect();
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Memoize sprite grids
  const grids = useMemo(() => {
    if (!assets) return null;
    return {
      player: buildSpriteGrid(assets.player.width, assets.player.height),
      zombie: buildSpriteGrid(assets.zombie.width, assets.zombie.height),
      orb: buildSpriteGrid(assets.orb.width, assets.orb.height),
    };
  }, [assets]);

  if (!assets) {
    return (
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-2xl bg-slate-950 flex items-center justify-center border border-white/10"
        style={{ height: "min(75svh, 100%)" }}
      >
        <div className="text-white animate-pulse font-mono tracking-widest uppercase text-sm sm:text-base">
          Initializing Grimoire...
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ minHeight: "400px", height: "100%" }}
      className="relative w-full overflow-hidden rounded-3xl bg-slate-900 shadow-2xl ring-1 ring-white/10 touch-none"
    >
      <AnimatePresence>
        {!hasStarted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col bg-slate-950/90 text-white overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8">
              {/* Header removed to avoid duplication with Main Page Header */}
              <div className="flex justify-end">
                <div className="px-4 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  Ready to Cast
                </div>
              </div>

              <div className="grid gap-8 lg:grid-cols-2">
                <div className="space-y-6">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm space-y-4">
                    <h3 className="flex items-center gap-2 font-bold text-lg text-white">
                      <Shield className="w-5 h-5 text-blue-400" /> Game Rules
                    </h3>
                    <ul className="space-y-3 text-sm text-slate-300">
                      <li className="flex gap-3">
                        <span className="text-blue-400 font-bold">01.</span>
                        <span>
                          The horde is endless. Survive as long as possible by
                          collecting <b>Healing Orbs</b>.
                        </span>
                      </li>
                      <li className="flex gap-3">
                        <span className="text-blue-400 font-bold">02.</span>
                        <span>
                          Match the <b>Target Word</b> shown at the bottom to
                          heal (+10 HP).
                        </span>
                      </li>
                      <li className="flex gap-3">
                        <span className="text-blue-400 font-bold">03.</span>
                        <span>
                          Picking the <b>Wrong Orb</b> reshuffles the field and
                          costs <b>5 points</b>.
                        </span>
                      </li>
                      <li className="flex gap-3">
                        <span className="text-blue-400 font-bold">04.</span>
                        <span>
                          Each correct orb grants one <b>Shockwave</b> charge.
                          Use it to blast zombies back!
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="flex items-center gap-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-blue-200">
                    <Zap className="w-6 h-6 text-yellow-400 shrink-0" />
                    <p>
                      <b>Pro Tip:</b> Use Shockwave when surrounded to create
                      space for an escape!
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 font-bold text-lg text-white">
                      <BookOpen className="w-5 h-5 text-emerald-400" /> Grimoire
                      Preview
                    </h3>
                    <span className="text-xs text-white/40">
                      {vocabulary.length} Arcane Words
                    </span>
                  </div>
                  <div className="max-h-[240px] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/50 scrollbar-thin scrollbar-thumb-white/10">
                    {vocabulary.length === 0 ? (
                      <div className="p-8 text-center text-white/40 italic">
                        Grimoire is empty...
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {vocabulary.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-3 px-4 hover:bg-white/5 transition-colors"
                          >
                            <span className="font-medium text-white">
                              {item.term}
                            </span>
                            <span className="text-slate-400 text-sm">
                              {item.translation}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <footer className="p-4 sm:p-6 md:p-8 border-t border-white/10 bg-slate-900/80 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-6">
              <div className="flex items-center gap-4 sm:gap-6 text-xs uppercase tracking-[0.2em] text-white/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" /> Move:
                  Arrows / WASD
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" /> Cast:
                  Space / Enter
                </div>
              </div>
              <button
                onClick={() => {
                  resetGame();
                  setHasStarted(true);
                }}
                className="group relative w-full sm:w-auto px-8 sm:px-10 py-3 sm:py-4 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
              >
                <span className="relative z-10">
                  {t("common.startSurvival")}
                </span>
                <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
              </button>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>

      {hasStarted && gameState && grids && (
        <>
          {/* Game Over Overlay */}
          <AnimatePresence>
            {gameState.status === "gameover" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-6"
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl p-8 text-center space-y-8"
                >
                  <header className="space-y-2">
                    <div className="w-20 h-20 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Skull className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-bold text-white">
                      Survival Failed
                    </h2>
                    <p className="text-slate-400">
                      The horde has overwhelmed you.
                    </p>
                  </header>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-2xl p-4 space-y-1">
                      <div className="text-xs uppercase tracking-wider text-slate-500 font-bold flex items-center justify-center gap-1">
                        <Trophy className="w-3 h-3" /> {t("common.score")}
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {gameState.score}
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-4 space-y-1">
                      <div className="text-xs uppercase tracking-wider text-slate-500 font-bold flex items-center justify-center gap-1">
                        <Target className="w-3 h-3" /> {t("common.accuracy")}
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {gameState.totalAttempts > 0
                          ? Math.round(
                              (gameState.correctAnswers /
                                gameState.totalAttempts) *
                                100,
                            )
                          : 0}
                        %
                      </div>
                    </div>
                    <div className="col-span-2 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 space-y-1">
                      <div className="text-xs uppercase tracking-wider text-blue-400 font-bold flex items-center justify-center gap-1">
                        <Sparkles className="w-3 h-3" /> XP Gained
                      </div>
                      <div className="text-3xl font-black text-blue-400">
                        +
                        {calculateXP(
                          gameState.score,
                          gameState.correctAnswers,
                          gameState.totalAttempts,
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => {
                        resetGame();
                        setHasStarted(true);
                      }}
                      className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-5 h-5" /> {t("common.playAgain")}
                    </button>
                    <button
                      onClick={() => {
                        const results: WizardZombieGameResult = {
                          xp: calculateXP(
                            gameState.score,
                            gameState.correctAnswers,
                            gameState.totalAttempts,
                          ),
                          accuracy:
                            gameState.totalAttempts > 0
                              ? gameState.correctAnswers /
                                gameState.totalAttempts
                              : 0,
                          correctAnswers: gameState.correctAnswers,
                          totalAttempts: gameState.totalAttempts,
                        };
                        onComplete(results);
                      }}
                      className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                      <Home className="w-5 h-5" /> Exit to Menu
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* HUD Overlay */}
          <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-10 flex flex-col gap-0.5 sm:gap-1 text-white font-bold text-sm sm:text-lg pointer-events-none drop-shadow-md">
            <div>HP: {Math.ceil(gameState.player.hp)}</div>
            <div className="text-blue-400 text-xs sm:text-sm flex items-center gap-0.5 sm:gap-1">
              SHOCKWAVE:{" "}
              {Array(gameState.player.maxShockwaveCharges)
                .fill(0)
                .map((_, i) => (
                  <span
                    key={i}
                    className={
                      i < gameState.player.shockwaveCharges
                        ? "opacity-100"
                        : "opacity-30"
                    }
                  >
                    ⚡
                  </span>
                ))}
            </div>
          </div>
          <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10 text-white font-bold text-sm sm:text-lg pointer-events-none drop-shadow-md">
            {t("common.score")}: {gameState.score}
          </div>

          {/* Target Word - centered below HUD, above virtual controls */}
          <div className="absolute bottom-28 sm:bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-10 bg-black/60 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full border border-white/20 backdrop-blur-sm pointer-events-none whitespace-nowrap">
            <span className="text-white/70 mr-1 sm:mr-2 text-sm sm:text-base">
              Find:
            </span>
            <span className="text-base sm:text-xl font-bold text-yellow-400">
              {gameState.targetWord}
            </span>
          </div>

          {/* Off-screen Indicators */}
          {indicators.map((ind) => (
            <div
              key={ind.orb.id}
              className="absolute z-10 flex items-center justify-center pointer-events-none"
              style={{
                left: ind.x,
                top: ind.y,
                transform: `translate(-50%, -50%) rotate(${ind.rotation}deg)`,
              }}
            >
              <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[15px] border-b-yellow-400 animate-pulse" />
            </div>
          ))}

          {/* Text Labels for Indicators */}
          {indicators.map((ind) => (
            <div
              key={`label-${ind.orb.id}`}
              className="absolute z-10 pointer-events-none text-xs font-bold text-white bg-black/60 px-2 py-1 rounded whitespace-nowrap shadow-lg border border-white/10"
              style={{
                left: ind.x,
                top: ind.y,
                transform: `translate(-50%, -50%) translate(${Math.cos((ind.rotation * Math.PI) / 180) * -35}px, ${Math.sin((ind.rotation * Math.PI) / 180) * -35}px)`,
              }}
            >
              {ind.orb.translation}
            </div>
          ))}

          {/* Virtual Controls */}
          <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 z-20 flex flex-row items-end gap-2 sm:gap-4">
            <button
              onClick={() => triggerCast()}
              disabled={gameState.player.shockwaveCharges === 0}
              className={`w-14 h-14 sm:w-20 sm:h-20 rounded-full border-2 flex items-center justify-center font-bold text-xs sm:text-sm transition-all active:scale-95 ${
                gameState.player.shockwaveCharges > 0
                  ? "bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                  : "bg-slate-800 border-slate-700 text-slate-500 opacity-50"
              }`}
            >
              CAST
            </button>
            <VirtualDPad onInput={setVirtualInput} />
          </div>

          {/* Canvas */}
          <Stage
            width={dimensions.width}
            height={dimensions.height}
            data-testid="stage"
          >
            <Layer
              scaleX={camera.scale}
              scaleY={camera.scale}
              x={camera.x + (Math.random() - 0.5) * screenShake}
              y={camera.y + (Math.random() - 0.5) * screenShake}
            >
              {/* Floor Tiling - Using Rect for proper pattern repeat */}
              <Rect
                x={0}
                y={0}
                width={GAME_WIDTH}
                height={GAME_HEIGHT}
                fillPatternImage={assets.floor}
                fillPatternRepeat="repeat"
                fillPatternScaleX={0.5}
                fillPatternScaleY={0.5}
              />

              <Group>
                {/* Player */}
                <KonvaImage
                  image={assets.player}
                  name="player"
                  x={gameState.player.x}
                  y={gameState.player.y}
                  width={64}
                  height={64}
                  offsetX={32}
                  offsetY={32}
                  crop={getSpriteCrop(
                    grids.player.fw,
                    grids.player.fh,
                    playerFrame,
                    input.dx === 0 && input.dy === 0 ? 0 : 1,
                  )}
                />

                {/* Shockwave FX */}
                {shockwaveRing > 0 && (
                  <Rect
                    x={gameState.player.x}
                    y={gameState.player.y}
                    width={0}
                    height={0}
                    offsetX={0}
                    offsetY={0}
                    stroke="cyan"
                    strokeWidth={10 * shockwaveRing}
                    cornerRadius={250}
                    shadowBlur={20}
                    shadowColor="cyan"
                    opacity={shockwaveRing}
                    scale={{
                      x: (1 - shockwaveRing) * 20 + 1,
                      y: (1 - shockwaveRing) * 20 + 1,
                    }}
                  />
                )}

                {/* Zombies - Offset animation */}
                {gameState.zombies.map((zombie, i) => (
                  <KonvaImage
                    key={zombie.id}
                    image={assets.zombie}
                    name="zombie"
                    x={zombie.x}
                    y={zombie.y}
                    width={48}
                    height={48}
                    offsetX={24}
                    offsetY={24}
                    crop={getSpriteCrop(
                      grids.zombie.fw,
                      grids.zombie.fh,
                      (zombieFrame + i) % 3,
                      0,
                    )}
                  />
                ))}

                {/* Orbs - Offset animation */}
                {gameState.orbs.map((orb, i) => (
                  <Group key={orb.id} x={orb.x} y={orb.y}>
                    <KonvaImage
                      image={assets.orb}
                      name="orb"
                      width={orb.radius * 2}
                      height={orb.radius * 2}
                      offsetX={orb.radius}
                      offsetY={orb.radius}
                      crop={getSpriteCrop(
                        grids.orb.fw,
                        grids.orb.fh,
                        (orbFrame + i) % 3,
                        0,
                      )}
                    />
                    <Text
                      text={orb.translation}
                      fontSize={14}
                      fontStyle="bold"
                      fill="white"
                      offsetX={orb.radius}
                      offsetY={orb.radius + 20}
                      width={orb.radius * 2}
                      align="center"
                      shadowColor="black"
                      shadowBlur={4}
                    />
                  </Group>
                ))}
              </Group>
            </Layer>
          </Stage>

          {/* FX Layer */}
          {damageFlash > 0 && (
            <div
              className="absolute inset-0 bg-red-500 pointer-events-none z-40 transition-opacity duration-75"
              style={{ opacity: damageFlash }}
            />
          )}

          {/* Floating Texts */}
          {floatingTexts.map((ft) => (
            <div
              key={ft.id}
              className="absolute pointer-events-none font-bold text-shadow-sm z-50 whitespace-nowrap"
              style={{
                left: dimensions.width / 2 + (ft.x - camera.x) * camera.scale,
                top: dimensions.height / 2 + (ft.y - camera.y) * camera.scale,
                color: ft.color,
                fontSize: `${Math.max(12, 24 * camera.scale)}px`,
                opacity: ft.life,
                transform: `translate(-50%, -50%) scale(${0.5 + ft.life * 0.5})`,
              }}
            >
              {ft.text}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
