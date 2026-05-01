"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { useSession } from "@/hooks/useSession";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import Link from "next/link";
import { calculateXP } from "@/lib/xp";
import type { SlimeState } from "@/lib/games/devourerSlime";

const DevourerSlimeGame = dynamic(
  () =>
    import("@/components/games/sentence/devourer-slime/DevourerSlimeGame").then(
      (mod) => mod.DevourerSlimeGame,
    ),
  { ssr: false },
);

type WarningStatus = {
  type: "NO_SENTENCES" | "INSUFFICIENT_SENTENCES" | null;
  requiredCount?: number;
  currentCount?: number;
};

export default function DevourerSlimePage() {
  const [sentences, setSentences] = useState<
    { term: string; translation: string }[]
  >([]);
  const setLastResult = useGameStore((state) => state.setLastResult);
  const [warningStatus, setWarningStatus] = useState<WarningStatus>({
    type: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const locale = useCurrentLocale();
  useSession();
  useScopedI18n("pages.student.gamesPage.devourerSlime");

  useEffect(() => {
    const fetchSentences = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(
          `/api/v1/games/devourer-slime/sentences?locale=${locale}`,
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
          setSentences(data.sentences || []);
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

  const handleComplete = useCallback(
    async (state: SlimeState) => {
      const xp = calculateXP(state.score, state.correctAnswers, state.totalAttempts);
      const accuracy = state.totalAttempts > 0
        ? Math.round((state.correctAnswers / state.totalAttempts) * 100)
        : 0;
      setLastResult(xp, accuracy);

      try {
        await fetch("/api/v1/games/devourer-slime/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            xpEarned: xp,
            accuracy,
            correctAnswers: state.correctAnswers,
            totalAttempts: state.totalAttempts,
          }),
        });
      } catch (e) {
        console.error("Failed to submit game results", e);
      }
    },
    [setLastResult],
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-slate-100">
        <Header heading="Devourer Slime" />
        <main className="flex flex-1 items-center justify-center p-4">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-emerald-400 mx-auto" />
            <p className="text-emerald-300 animate-pulse font-medium">
              Concocting Slimy Essence...
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (warningStatus.type) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header heading="Devourer Slime" />
        <main className="flex flex-1 items-center justify-center p-4">
          <Card className="w-full max-w-md border-2 border-emerald-500/50 bg-emerald-950/30 backdrop-blur-sm">
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="bg-emerald-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                <AlertTriangle className="h-8 w-8 text-emerald-400" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-emerald-100">
                  {warningStatus.type === "NO_SENTENCES"
                    ? "Forest Empty"
                    : "Insufficient Essence"}
                </h2>
                <p className="text-emerald-200/80">
                  {warningStatus.type === "NO_SENTENCES"
                    ? "No sentences found for the devourer slime. Add some to start your training!"
                    : `You need at least ${warningStatus.requiredCount} sentences to play. You currently have ${warningStatus.currentCount}.`}
                </p>
              </div>

              <Button asChild variant="default" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-lg">
                <Link href="/">Back to Library</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <Header heading="Devourer Slime" />
      <main className="flex-1 p-4 flex items-center justify-center max-w-4xl mx-auto w-full">
        <DevourerSlimeGame
          sentences={sentences}
          onComplete={handleComplete}
        />
      </main>
    </div>
  );
}
