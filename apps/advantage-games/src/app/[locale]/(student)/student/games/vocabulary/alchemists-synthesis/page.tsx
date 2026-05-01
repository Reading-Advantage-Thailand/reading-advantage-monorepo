"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useSession } from "@/hooks/useSession";
import {
  AlchemistsSynthesisGame,
  AlchemistsSynthesisGameResult,
} from "@/components/games/vocabulary/alchemists-synthesis/AlchemistsSynthesisGame";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { VocabularyItem } from "@/store/useGameStore";
import { useScopedI18n, useCurrentLocale } from "@/locales/client";

export default function AlchemistsSynthesisPage() {
  const t = useScopedI18n("pages.student.gamesPage");
  useCurrentLocale();
  const { data: session } = useSession();
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);

  useEffect(() => {
    const fetchVocab = async () => {
      try {
        const res = await fetch("/api/v1/games/alchemists-synthesis/vocabulary");
        const data = await res.json();
        if (data.vocabulary && data.vocabulary.length > 0) {
          setVocabulary(data.vocabulary);
        } else {
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

  const handleComplete = useCallback(
    async (results: AlchemistsSynthesisGameResult) => {
      try {
        await fetch("/api/v1/games/alchemists-synthesis/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            score: results.xp,
            correctAnswers: results.correctAnswers,
            totalAttempts: results.totalAttempts,
            accuracy: results.accuracy * 100,
            difficulty: results.difficulty,
          }),
        });
      } catch (error) {
        console.error("Failed to submit results", error);
      }
    },
    []
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
        heading={t("games.alchemistsSynthesis.title")}
        text={t("games.alchemistsSynthesis.description")}
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
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(88,28,135,0.15),rgba(2,6,23,0.8))]" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
        </div>

        <div className="relative z-10 w-full h-full flex flex-col justify-center">
          <AlchemistsSynthesisGame
            vocabulary={vocabulary}
            onComplete={handleComplete}
          />
        </div>
      </div>
    </div>
  );
}
