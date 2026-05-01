"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage } from "react-konva";
import { usePotionRushStore } from "@/store/usePotionRushStore";
import { VocabularyItem } from "@/store/useGameStore";
import { withBasePath } from "@/lib/games/basePath";
import { useGameLoop } from "@/hooks/useGameLoop";
import { AnimatePresence, motion, useAnimation } from "framer-motion";
import { useRouter } from "next/navigation";
import { Beaker } from "lucide-react";
import { GameEndScreen } from "@/components/games/game/GameEndScreen";
import {
  GameStartScreen,
  type ControlHint,
  type Instruction,
} from "@/components/games/game/GameStartScreen";
import { useScopedI18n } from "@/locales/client";

// Components
import ConveyorBelt from "./ConveyorBelt";
import CauldronStation from "./CauldronStation";
import CustomerQueue from "./CustomerQueue";
import TrashPortal from "./TrashPortal";
import PotionRushEffectsLayer from "./PotionRushEffectsLayer";
import PotionRushSoundController from "./PotionRushSoundController";

export interface PotionRushGameResult {
  xp: number;
  accuracy: number;
  difficulty: "easy" | "normal" | "hard" | "extreme";
  score: number;
}

interface PotionRushGameProps {
  vocabList: VocabularyItem[];
  difficulty: "easy" | "normal" | "hard" | "extreme";
  onComplete: (results: PotionRushGameResult) => void;
}

export default function PotionRushGame({
  vocabList,
  difficulty,
  onComplete,
}: PotionRushGameProps) {
  const t = useScopedI18n("pages.student.gamesPage.potionRush");
  const router = useRouter();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasStarted, setHasStarted] = useState(false);

  // Image Loading State
  const [images, setImages] = useState<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    const assets = {
      wall: withBasePath("/games/sentence/potion-rush/shop-wall.png"),
      floor: withBasePath("/games/sentence/potion-rush/shop-floor.png"),
      counter: withBasePath("/games/sentence/potion-rush/shop-counter.png"),
    };

    const loadedImgs: Record<string, HTMLImageElement> = {};
    let count = 0;
    const sources = Object.entries(assets);

    sources.forEach(([key, src]) => {
      const img = new window.Image();
      img.src = src;
      img.onload = () => {
        loadedImgs[key] = img;
        count++;
        if (count === sources.length) {
          setImages(loadedImgs);
        }
      };
      img.onerror = () => {
        console.error(`Failed to load: ${src}`);
        count++;
        if (count === sources.length) {
          setImages(loadedImgs);
        }
      };
    });
  }, []);

  // Store Actions
  const startGame = usePotionRushStore((state) => state.startGame);
  const tick = usePotionRushStore((state) => state.tick);
  const gameState = usePotionRushStore((state) => state.gameState);
  const reset = usePotionRushStore((state) => state.reset);
  const score = usePotionRushStore((state) => state.score);
  const reputation = usePotionRushStore((state) => state.reputation);
  const completedSentences = usePotionRushStore(
    (state) => state.completedSentences,
  );
  const totalXpEarned = usePotionRushStore((state) => state.totalXpEarned);
  const timeLeft = usePotionRushStore((state) => state.timeLeft);
  const timeLimit = usePotionRushStore((state) => state.timeLimit);

  // Visual Effects
  const controls = useAnimation();
  const prevReputation = useRef(reputation);

  useEffect(() => {
    if (reputation < prevReputation.current) {
      // Trigger Damage Effect
      controls.start("damage");
    }
    prevReputation.current = reputation;
  }, [reputation, controls]);

  // Game Over Handler
  useEffect(() => {
    if (gameState === "GAME_OVER") {
      onComplete({
        xp: totalXpEarned,
        accuracy: Math.max(0, Math.min(reputation, 100)) / 100,
        difficulty: difficulty,
        score: score,
      });
    }
  }, [gameState, totalXpEarned, reputation, difficulty, score, onComplete]);

  // Format Time
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Layout Constants
  const isPortrait = dimensions.height > dimensions.width;
  const VIRTUAL_WIDTH = isPortrait ? 720 : 1280;
  const VIRTUAL_HEIGHT = isPortrait ? 1280 : 720;

  // Calculate Scale to fit (Contain)
  const scaleX = dimensions.width / VIRTUAL_WIDTH;
  const scaleY = dimensions.height / VIRTUAL_HEIGHT;
  const scale = Math.min(scaleX, scaleY);

  // Center the Stage
  const stageX = (dimensions.width - VIRTUAL_WIDTH * scale) / 2;
  const stageY = (dimensions.height - VIRTUAL_HEIGHT * scale) / 2;

  const LAYOUT = isPortrait
    ? {
        wallH: 640,
        floorH: 640,
        counterY: 400,
        customerY: 402,
        cauldronY: 600,
        beltY: 1120,
        trashX: 360, // Center
        trashY: 880, // Between Cauldrons and Belt
        isPortrait: true,
      }
    : {
        wallH: 480,
        floorH: 240,
        counterY: 480 - 80, // 400
        customerY: 402, // 2px below counter top
        cauldronY: 540,
        beltY: 620,
        trashX: 1230,
        trashY: 540,
        isPortrait: false,
      };

  // Initialization & Resize — use ResizeObserver so we get the real size
  // the moment the flex container is laid out (window.resize doesn't fire on mount)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Game Loop (fixed timestep to match other Konva games)
  const isRunning =
    gameState === "PLAYING" && dimensions.width > 0 && dimensions.height > 0;
  useGameLoop((dt) => tick(dt, VIRTUAL_WIDTH), isRunning, 50);

  // Initial Start
  useEffect(() => {
    return () => reset();
  }, [reset]);

  if (dimensions.width === 0)
    return <div ref={containerRef} className="w-full h-full" />;

  return (
    <div ref={containerRef} className="w-full h-full relative font-sans">
      <PotionRushSoundController />

      <AnimatePresence>
        {!hasStarted && (
          <GameStartScreen
            gameTitle={t("title")}
            gameSubtitle={t("gameSubtitle")}
            icon={Beaker}
            vocabulary={vocabList}
            instructions={[
              { step: 1, text: t("instructions.step1") },
              { step: 2, text: t("instructions.step2") },
              { step: 3, text: t("instructions.step3") },
            ]}
            proTip={t("proTip")}
            controls={[
              {
                label: t("controls.match"),
                keys: t("controls.matchKeys"),
                color: "bg-amber-500",
              },
              {
                label: t("controls.drag"),
                keys: t("controls.dragKeys"),
                color: "bg-emerald-500",
              },
            ]}
            startButtonText={t("startButton")}
            onStart={() => {
              setHasStarted(true);
              startGame(vocabList, difficulty);
            }}
          />
        )}
      </AnimatePresence>

      {/* HUD Overlay (HTML is easier for text overlays than Canvas sometimes) */}
      {hasStarted && (
        <div className="absolute top-0 left-0 w-full p-2 sm:p-4 text-white z-10 pointer-events-none flex justify-between items-start">
          <div>
            <div className="text-base sm:text-xl font-bold text-amber-400 drop-shadow-lg">
              {t("hud.score")}: {score}
            </div>
            <div className="text-xs sm:text-sm text-slate-300 drop-shadow-md">
              {t("hud.reputation")}: {Math.max(0, Math.round(reputation))}%
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-white drop-shadow-lg bg-black/30 px-2 sm:px-4 py-1 rounded-full">
            {formatTime(timeLeft)}
          </div>
        </div>
      )}

      <motion.div
        animate={controls}
        variants={{
          default: { x: 0 },
          damage: {
            x: [0, -10, 10, -10, 10, 0],
            transition: { duration: 0.4 },
          },
        }}
        className="relative"
      >
        <Stage
          width={dimensions.width}
          height={dimensions.height}
          scaleX={scale}
          scaleY={scale}
          x={stageX}
          y={stageY}
        >
          <Layer>
            {/* 1. Background Wall */}
            {images.wall && (
              <KonvaImage
                image={images.wall}
                width={VIRTUAL_WIDTH}
                height={LAYOUT.wallH}
              />
            )}

            {/* 2. Background Floor */}
            {images.floor && (
              <KonvaImage
                image={images.floor}
                y={LAYOUT.wallH}
                width={VIRTUAL_WIDTH}
                height={LAYOUT.floorH}
              />
            )}

            {/* 3. Customer Queue (Behind counter) */}
            <CustomerQueue y={LAYOUT.customerY} width={VIRTUAL_WIDTH} />

            {/* 4. Counter (In front of customers) */}
            {images.counter && (
              <KonvaImage
                image={images.counter}
                y={LAYOUT.counterY}
                width={VIRTUAL_WIDTH}
                height={160}
              />
            )}

            {/* 5. Active Stations */}
            <CauldronStation
              y={LAYOUT.cauldronY}
              width={VIRTUAL_WIDTH}
              layout={LAYOUT}
            />

            <TrashPortal x={LAYOUT.trashX} y={LAYOUT.trashY} />

            <ConveyorBelt
              y={LAYOUT.beltY}
              width={VIRTUAL_WIDTH}
              dragBoundFunc={(pos) => pos}
              layout={LAYOUT}
            />

            <PotionRushEffectsLayer />
          </Layer>
        </Stage>
      </motion.div>

      {/* Red Flash Overlay */}
      <motion.div
        className="absolute inset-0 bg-red-500 pointer-events-none z-40"
        initial={{ opacity: 0 }}
        animate={controls}
        variants={{
          default: { opacity: 0 },
          damage: {
            opacity: [0, 0.3, 0],
            transition: { duration: 0.4 },
          },
        }}
      />

      {gameState === "GAME_OVER" && (
        <GameEndScreen
          status={reputation <= 0 ? "defeat" : "victory"}
          title={reputation <= 0 ? t("messages.defeat") : t("messages.victory")}
          subtitle={
            reputation <= 0
              ? t("messages.defeatDesc")
              : t("messages.victoryDesc")
          }
          score={score}
          xp={totalXpEarned}
          accuracy={Math.max(0, Math.min(reputation, 100)) / 100}
          customStats={[
            {
              label: t("messages.customersServed"),
              value: completedSentences,
            },
          ]}
          restartButtonText={t("messages.openAgain")}
          onRestart={() => startGame(vocabList, difficulty)}
          onExit={() => router.push("/")}
        />
      )}
    </div>
  );
}
