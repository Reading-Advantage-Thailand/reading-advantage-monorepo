"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useGameStore } from "@/store/useGameStore";
import { useRPGBattleStore } from "@/store/useRPGBattleStore";
import {
  selectBattleActions,
  WordPerformance,
} from "@/lib/games/rpgBattleWordSelection";
import { calculateRpgBattleXp } from "@/lib/games/rpgBattleXp";
import {
  battleEnemies,
  battleHeroes,
  battleLocations,
} from "@/lib/games/rpgBattleSelection";
import {
  rollEnemyDamage,
  scaleBattleXp,
  scaleEnemyHealth,
} from "@/lib/games/rpgBattleScaling";
import { ActionMenu } from "@/components/games/vocabulary/rpg-battle/ActionMenu";
import { BattleScene } from "@/components/games/vocabulary/rpg-battle/BattleScene";
import { BattleLog } from "@/components/games/vocabulary/rpg-battle/BattleLog";
import { HealthBar } from "@/components/games/vocabulary/rpg-battle/HealthBar";
import { Sprite } from "@/components/games/vocabulary/rpg-battle/Sprite";
import { BattleResults } from "@/components/games/vocabulary/rpg-battle/BattleResults";
import { BattleEffects } from "@/components/games/vocabulary/rpg-battle/BattleEffects";
import { BattleSelectionModal } from "@/components/games/vocabulary/rpg-battle/BattleSelectionModal";
import { FloatingTextItem } from "@/components/games/vocabulary/rpg-battle/FloatingText";
import { StartScreen } from "@/components/games/vocabulary/rpg-battle/StartScreen";
import { useSound } from "@/hooks/useSound";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, AlertCircle, ChevronLeft, Swords } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { useScopedI18n } from "@/locales/client";

const ACTION_COUNT = 3;
const BASIC_DAMAGE = 10;
const POWER_DAMAGE = 18;
const MAX_TURNS = 12;

export default function RpgBattlePage() {
  const t = useScopedI18n("pages.student.gamesPage");
  const vocabulary = useGameStore((state) => state.vocabulary);
  const setVocabulary = useGameStore((state) => state.setVocabulary);
  const setLastResult = useGameStore((state) => state.setLastResult);

  const {
    playerHealth,
    playerMaxHealth,
    enemyHealth,
    enemyMaxHealth,
    turn,
    status,
    battleLog,
    playerPose,
    enemyPose,
    inputLocked,
    revealedTranslation,
    selectionStep,
    selectedHeroId,
    selectedLocationId,
    selectedEnemyId,
    streak,
    initializeBattle,
    setStatus,
    setTurn,
    damageEnemy,
    enemyAttack,
    submitAnswer,
    addLogEntry,
    selectHero,
    selectLocation,
    selectEnemy,
    resetSelection,
  } = useRPGBattleStore();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [performance, setPerformance] = useState<
    Record<string, WordPerformance>
  >({});
  const [turnsTaken, setTurnsTaken] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [flashKey, setFlashKey] = useState(0);
  const [flashTone, setFlashTone] = useState<"player" | "enemy">("enemy");
  const [showResults, setShowResults] = useState(false);
  const [resultXp, setResultXp] = useState(1);
  const [resultAccuracy, setResultAccuracy] = useState(0);
  const [heroSprite, setHeroSprite] = useState(() => battleHeroes[0].sprite);
  const [enemySprite, setEnemySprite] = useState(() => battleEnemies[0].sprite);
  const { playSound } = useSound();
  const resultsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Game key to force remount on restart if needed,
  // currently used primarily to trigger data refetch if logic dictates,
  // but here we might just reset state.
  const [gameKey, setGameKey] = useState(0);
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [floatingTexts, setFloatingTexts] = useState<FloatingTextItem[]>([]);

  const spawnFloatingText = (
    text: string,
    x: number,
    y: number,
    type: FloatingTextItem["type"],
  ) => {
    const id = Math.random().toString(36).substring(7);
    setFloatingTexts((prev) => [...prev, { id, text, x, y, type }]);

    // Auto remove after animation
    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((item) => item.id !== id));
    }, 1000);
  };

  const selectedEnemy = useMemo(
    () => battleEnemies.find((enemy) => enemy.id === selectedEnemyId),
    [selectedEnemyId],
  );
  const enemyMultiplier = selectedEnemy?.multiplier ?? 1;
  const selectedLocation = useMemo(
    () =>
      battleLocations.find((location) => location.id === selectedLocationId),
    [selectedLocationId],
  );

  // Fetch vocabulary from API
  useEffect(() => {
    const fetchVocabulary = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/v1/games/rpg-battle/vocabulary");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch vocabulary");
        }

        if (data.vocabulary && data.vocabulary.length >= 5) {
          setVocabulary(data.vocabulary);
        } else {
          setError(data.message || t("notEnoughWords", { count: "5" }));
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
  }, [setVocabulary, gameKey, t]);

  useEffect(() => {
    if (vocabulary.length > 0 && !showStartScreen) {
      // Only reset selection if we have vocabulary loaded and not showing start screen
      resetSelection();
      setStatus("idle");
    }
  }, [resetSelection, setStatus, vocabulary.length, gameKey, showStartScreen]);

  useEffect(() => {
    if (selectionStep !== "ready" || !selectedHeroId || !selectedEnemyId) {
      return;
    }

    const heroSelection =
      battleHeroes.find((hero) => hero.id === selectedHeroId) ??
      battleHeroes[0];
    const enemySelection = selectedEnemy ?? battleEnemies[0];

    setHeroSprite(heroSelection.sprite);
    setEnemySprite(enemySelection.sprite);
    initializeBattle({
      enemyMaxHealth: scaleEnemyHealth(enemySelection.multiplier),
    });
  }, [
    initializeBattle,
    selectedEnemy,
    selectedEnemyId,
    selectedHeroId,
    selectionStep,
  ]);

  useEffect(() => {
    setLongestStreak((prev) => Math.max(prev, streak));
  }, [streak]);

  const actions = useMemo(
    () => selectBattleActions(vocabulary, performance, { count: ACTION_COUNT }),
    [performance, vocabulary],
  );

  const { totalCorrect, totalAttempts } = useMemo(() => {
    return Object.values(performance).reduce(
      (acc, entry) => ({
        totalCorrect: acc.totalCorrect + entry.correct,
        totalAttempts: acc.totalAttempts + entry.attempts,
      }),
      { totalCorrect: 0, totalAttempts: 0 },
    );
  }, [performance]);

  const handleGameComplete = useCallback(
    async (xp: number, accuracy: number, outcome: "victory" | "defeat") => {
      // Send results to API
      try {
        const response = await fetch("/api/v1/games/rpg-battle/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            xp,
            accuracy,
            totalAttempts,
            totalCorrect,
            turnsTaken: Math.max(1, turnsTaken),
            heroId: selectedHeroId,
            enemyId: selectedEnemyId,
            outcome,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          console.log("Game completed! XP earned:", data.xpEarned);
          setLastResult(data.xpEarned, accuracy);
        } else {
          console.error("Failed to save game results:", data.message);
        }
      } catch (err) {
        console.error("Error saving game results:", err);
      }
    },
    [
      selectedHeroId,
      selectedEnemyId,
      totalAttempts,
      totalCorrect,
      turnsTaken,
      setLastResult,
    ],
  );

  useEffect(() => {
    if (resultsTimeoutRef.current) {
      clearTimeout(resultsTimeoutRef.current);
      resultsTimeoutRef.current = null;
    }

    if (status === "victory" || status === "defeat") {
      const accuracy = totalAttempts > 0 ? totalCorrect / totalAttempts : 0;
      setResultAccuracy(accuracy);
      const baseXp = calculateRpgBattleXp({
        playerHealth,
        playerMaxHealth,
        turnsTaken: Math.max(1, turnsTaken),
        maxTurns: MAX_TURNS,
        longestStreak,
      });
      const finalXp = scaleBattleXp(baseXp, enemyMultiplier);
      setResultXp(finalXp);

      // Call handleGameComplete to save results
      handleGameComplete(finalXp, accuracy, status);

      setShowResults(false);
      resultsTimeoutRef.current = setTimeout(() => {
        setShowResults(true);
      }, 1200);
    } else {
      setShowResults(false);
    }

    return () => {
      if (resultsTimeoutRef.current) {
        clearTimeout(resultsTimeoutRef.current);
        resultsTimeoutRef.current = null;
      }
    };
  }, [
    status,
    longestStreak,
    playerHealth,
    playerMaxHealth,
    totalAttempts,
    totalCorrect,
    turnsTaken,
    enemyMultiplier,
    handleGameComplete,
  ]);

  const menuActions = useMemo(
    () =>
      actions.map((action) => ({
        id: action.id,
        label: action.term,
        power: action.power,
      })),
    [actions],
  );

  const updatePerformance = (term: string, correct: boolean) => {
    setPerformance((prev) => {
      const current = prev[term] ?? { correct: 0, attempts: 0 };
      return {
        ...prev,
        [term]: {
          correct: current.correct + (correct ? 1 : 0),
          attempts: current.attempts + 1,
        },
      };
    });
  };

  const triggerEnemyTurn = () => {
    const damage = rollEnemyDamage(enemyMultiplier);
    setTurn("enemy");
    setTimeout(() => {
      enemyAttack(damage);
      spawnFloatingText(`-${damage}`, 20, 60, "damage-player"); // Player position
      setTurnsTaken((prev) => prev + 1);
      setFlashTone("player");
      setFlashKey((prev) => prev + 1);
      setShakeKey((prev) => prev + 1);
      addLogEntry("Enemy strikes back!", "enemy");
      playSound("missile-hit");
    }, 600);
  };

  const handleSubmit = (value: string) => {
    if (status !== "playing" || inputLocked || turn !== "player") return;

    const normalized = value.trim().toLowerCase();
    const matched = actions.find(
      (action) => action.translation.toLowerCase() === normalized,
    );
    const fallback =
      actions.find((action) => action.power === "power") ?? actions[0];

    if (matched) {
      // Calculate damage with streak bonus
      const baseDamage =
        matched.power === "power" ? POWER_DAMAGE : BASIC_DAMAGE;
      // Bonus: +1 damage for every 2 streak
      const streakBonus = Math.floor(streak / 2);
      const damage = baseDamage + streakBonus;

      const nextEnemyHealth = Math.max(0, enemyHealth - damage);

      submitAnswer(value, matched.translation, matched.power);
      playSound("success");

      // TTS: Speak the word
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(matched.term);
        utterance.lang = "en-US"; // Assume English terms for now
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      }

      updatePerformance(matched.term, true);
      addLogEntry(`You cast ${matched.term}!`, "player");
      damageEnemy(damage);
      spawnFloatingText(`-${damage}`, 80, 40, "damage-enemy");
      if (Math.random() > 0.8) {
        setTimeout(() => {
          spawnFloatingText("CRITICAL!", 80, 20, "crit");
        }, 200);
      }
      setTurnsTaken((prev) => prev + 1);
      setFlashTone("enemy");
      setFlashKey((prev) => prev + 1);
      setShakeKey((prev) => prev + 1);
      setInputValue("");

      if (nextEnemyHealth > 0) {
        triggerEnemyTurn();
      }
      return;
    }

    if (fallback) {
      submitAnswer(value, fallback.translation);
      playSound("error");
      updatePerformance(fallback.term, false);
      addLogEntry(
        `Incorrect! The spell was ${fallback.translation}.`,
        "system",
      );
      setInputValue("");
      // Trigger enemy turn on incorrect answer
      triggerEnemyTurn();
    }
  };

  const handleRestart = () => {
    setInputValue("");
    setTurnsTaken(0);
    setLongestStreak(0);
    setFlashKey(0);
    setShakeKey(0);
    setFlashTone("enemy");
    setShowResults(false);
    setResultXp(1);
    setResultAccuracy(0);
    setPerformance({}); // Reset performance on restart
    setShowStartScreen(true); // Show start screen again
    setStatus("idle"); // Reset status to idle
    // Increment gameKey to potentially re-fetch vocabulary if we wanted to shuffle,
    // or just to reset internal state if components rely on mount.
    // For now effectively acting as a soft reload of the game logic.
    setGameKey((prev) => prev + 1);
  };

  const handleStartBattle = () => {
    setShowStartScreen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/student/games">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToGames")}
          </Link>
        </Button>
        <Header
          heading={t("games.rpgBattle.title")}
          text={t("games.rpgBattle.description")}
        >
          <Swords className="h-8 w-8 text-primary" />
        </Header>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
            <p className="text-lg font-medium text-muted-foreground">
              {t("loadingVocabulary")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("preparingGame")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/student/games">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToGames")}
          </Link>
        </Button>
        <Header
          heading={t("games.rpgBattle.title")}
          text={t("games.rpgBattle.description")}
        >
          <Swords className="h-8 w-8 text-primary" />
        </Header>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("unableToStartGame")}</AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <p>{error}</p>
            <p className="text-sm opacity-80">{t("saveTip")}</p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/student/games">
          <ChevronLeft className="mr-1 h-4 w-4" />
          {t("backToGames")}
        </Link>
      </Button>
      <Header
        heading={t("games.rpgBattle.title")}
        text={t("games.rpgBattle.description")}
      >
        <Swords className="h-8 w-8 text-primary" />
      </Header>

      {showStartScreen && vocabulary.length > 0 && status === "idle" ? (
        <Card className="overflow-hidden border-2 shadow-xl bg-slate-900 border-slate-800 min-h-[600px]">
          <CardContent className="p-0 h-full">
            <StartScreen vocabulary={vocabulary} onStart={handleStartBattle} />
          </CardContent>
        </Card>
      ) : null}
      {showResults && (status === "victory" || status === "defeat") ? (
        <BattleResults
          outcome={status}
          xp={resultXp}
          accuracy={resultAccuracy}
          onRestart={handleRestart}
        />
      ) : !showStartScreen ? (
        <Card className="overflow-hidden border-2 shadow-xl bg-slate-900 border-slate-800">
          <CardContent className="p-0">
            <BattleEffects
              shakeKey={shakeKey}
              flashKey={flashKey}
              flashTone={flashTone}
            >
              <BattleScene
                floatingTexts={floatingTexts}
                streak={streak}
                backgroundImage={selectedLocation?.background}
                playerHealth={
                  <HealthBar
                    current={playerHealth}
                    max={playerMaxHealth}
                    label="Hero"
                    tone="player"
                  />
                }
                enemyHealth={
                  <HealthBar
                    current={enemyHealth}
                    max={enemyMaxHealth}
                    label="Enemy"
                    tone="enemy"
                  />
                }
                player={
                  <Sprite
                    src={heroSprite}
                    pose={playerPose}
                    alt="Hero"
                    size={140}
                    flip
                  />
                }
                enemy={
                  <Sprite
                    src={enemySprite}
                    pose={enemyPose}
                    alt="Enemy"
                    size={140}
                  />
                }
                actionMenu={
                  <div className="space-y-2">
                    <ActionMenu
                      actions={menuActions}
                      value={inputValue}
                      onChange={setInputValue}
                      onSubmit={handleSubmit}
                      disabled={
                        inputLocked || turn !== "player" || status !== "playing"
                      }
                    />
                    <AnimatePresence>
                      {revealedTranslation ? (
                        <motion.p
                          key={revealedTranslation}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="text-sm font-semibold text-amber-400"
                        >
                          {t("rpgBattle.correctAnswer", {
                            answer: revealedTranslation,
                          })}
                        </motion.p>
                      ) : null}
                    </AnimatePresence>
                  </div>
                }
                battleLog={<BattleLog entries={battleLog} />}
                turnIndicator={
                  <div className="text-xs text-slate-400">
                    {t("rpgBattle.turn", {
                      who:
                        turn === "player"
                          ? t("rpgBattle.player")
                          : t("rpgBattle.enemy"),
                    })}
                  </div>
                }
              />
            </BattleEffects>
          </CardContent>
        </Card>
      ) : null}
      {!showStartScreen && (
        <BattleSelectionModal
          step={selectionStep}
          heroes={battleHeroes}
          locations={battleLocations}
          enemies={battleEnemies}
          onSelectHero={selectHero}
          onSelectLocation={selectLocation}
          onSelectEnemy={selectEnemy}
        />
      )}
    </div>
  );
}
