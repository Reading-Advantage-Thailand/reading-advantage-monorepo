"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, use } from "react";
import { DragonRiderGame } from "@/components/games/vocabulary/dragon-rider/DragonRiderGame";
import { useGameStore } from "@/store/useGameStore";
import { AlertTriangle, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DragonRiderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const vocabulary = useGameStore((state) => state.vocabulary);
  const setVocabulary = useGameStore((state) => state.setVocabulary);
  const setLastResult = useGameStore((state) => state.setLastResult);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load Vocabulary
        const vocabRes = await fetch(
          `/api/v1/games/dragon-rider/vocabulary?locale=${locale}`,
        );
        const vocabData = await vocabRes.json();

        if (vocabRes.ok && vocabData.vocabulary) {
          if (
            vocabData.warning === "NO_VOCABULARY" ||
            vocabData.warning === "INSUFFICIENT_VOCABULARY"
          ) {
            setError(vocabData.message);
            setVocabulary([]);
          } else {
            setVocabulary(vocabData.vocabulary);
            setError(null);
          }
        } else {
          setError("Failed to load vocabulary");
        }
      } catch (err) {
        console.error("Failed to load game data", err);
        setError("Failed to load game data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [setVocabulary, locale]);

  const handleComplete = useCallback(
    async (results: any) => {
      setLastResult(results.xp, results.accuracy);
      // Note: difficulty is now part of results from the game
      try {
        await fetch("/api/v1/games/dragon-rider/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(results),
        });
      } catch (error) {
        console.error("Failed to save dragon rider results", error);
      }
    },
    [setLastResult],
  );

  if (loading) {
    return (
      <main className="min-h-screen px-6 py-10 text-white flex items-center justify-center">
        <div className="animate-pulse text-xl text-indigo-400 font-medium">
          Loading Dragon Rider...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen px-6 py-10 text-white">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-6 mt-20 text-center">
          <AlertTriangle className="size-16 text-yellow-500" />
          <h2 className="text-3xl font-bold">Adventure Paused</h2>
          <p className="text-lg text-slate-400">{error}</p>
          <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 text-sm text-slate-500">
            Tip: Read articles and save words to your flashcards to build your
            dragon&apos;s vocabulary.
          </div>
          <Link
            href="/student/games"
            className="mt-4 px-6 py-3 rounded-lg bg-indigo-600 font-bold hover:bg-indigo-500 transition-colors"
          >
            Back to Games
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-2 sm:px-4 md:px-6 py-2 sm:py-4 text-white">
      <div className="mx-auto w-full max-w-6xl">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/student/games">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Menu
          </Link>
        </Button>
        <DragonRiderGame vocabulary={vocabulary} onComplete={handleComplete} />
      </div>
    </main>
  );
}
