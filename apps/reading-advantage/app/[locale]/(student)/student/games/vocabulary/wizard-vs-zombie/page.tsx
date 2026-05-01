"use client";

import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  WizardZombieGame,
  WizardZombieGameResult,
} from "@/components/games/vocabulary/wizard-vs-zombie/WizardZombieGame";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { VocabularyItem } from "@/store/useGameStore";
import { StartScreen } from "@/components/games/vocabulary/wizard-vs-zombie/StartScreen";
import { Difficulty } from "@/lib/games/wizardZombie";
import { AnimatePresence, motion } from "framer-motion";
import { useScopedI18n } from "@/locales/client";

export default function WizardZombiePage() {
  const t = useScopedI18n("pages.student.gamesPage");
  const { data: session } = useSession();
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");

  useEffect(() => {
    // Fetch Vocabulary
    const fetchVocab = async () => {
      try {
        const res = await fetch("/api/v1/games/wizard-vs-zombie/vocabulary");
        const data = await res.json();
        if (data.vocabulary && data.vocabulary.length > 0) {
          setVocabulary(data.vocabulary);
        } else {
          // Fallback
          setVocabulary([
            { term: "Run", translation: "Correr" },
            { term: "Jump", translation: "Saltar" },
            { term: "Eat", translation: "Comer" },
            { term: "Sleep", translation: "Dormir" },
            { term: "Play", translation: "Jugar" },
          ]);
        }
      } catch (e) {
        console.error("Failed to fetch vocabulary", e);
        // Fallback
        setVocabulary([
          { term: "Run", translation: "Correr" },
          { term: "Jump", translation: "Saltar" },
          { term: "Eat", translation: "Comer" },
          { term: "Sleep", translation: "Dormir" },
          { term: "Play", translation: "Jugar" },
        ]);
      }
    };
    fetchVocab();
  }, []);

  const handleStart = useCallback((selectedDifficulty: Difficulty) => {
    setDifficulty(selectedDifficulty);
    setIsPlaying(true);
  }, []);

  const handleComplete = useCallback(
    async (results: WizardZombieGameResult) => {
      setIsPlaying(false); // Return to start screen

      try {
        await fetch("/api/v1/games/wizard-vs-zombie/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            score: results.xp,
            correctAnswers: results.correctAnswers,
            totalAttempts: results.totalAttempts,
            accuracy: results.accuracy * 100,
            difficulty: difficulty,
          }),
        });
      } catch (error) {
        console.error("Failed to submit results", error);
      }
    },
    [difficulty],
  );

  return (
    <div className="space-y-6 mb-10">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/student/games">
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t("backToGames")}
        </Link>
      </Button>

      <Header
        heading={t("games.wizardVsZombie.title")}
        text={t("collectHealingOrbs")}
      >
        <div className="p-2 bg-purple-500/10 rounded-lg">
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-purple-500/20 text-purple-400"
          >
            XP: {session?.user?.xp || 0}
          </Button>
        </div>
      </Header>

      <div
        className="w-full max-w-6xl mx-auto overflow-hidden rounded-xl border-2 border-slate-800 bg-slate-950 shadow-2xl backdrop-blur-sm relative"
        style={{ height: "min(85svh, 100%)" }}
      >
        {/* Background Elements internal to the game card */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(88,28,135,0.15),rgba(2,6,23,0.8))]" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
        </div>

        <div className="relative z-10 w-full h-full flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {!isPlaying ? (
              <motion.div
                key="start-screen"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full"
              >
                <StartScreen vocabulary={vocabulary} onStart={handleStart} />
              </motion.div>
            ) : (
              <motion.div
                key="game"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full h-full flex items-center justify-center"
              >
                <WizardZombieGame
                  vocabulary={vocabulary}
                  difficulty={difficulty}
                  onComplete={handleComplete}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
