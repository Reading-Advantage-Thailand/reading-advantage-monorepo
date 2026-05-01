"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { AlertTriangle, BookOpen, ArrowRight } from "lucide-react";
import { useCurrentLocale } from "@/locales/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const CastleDefenseGame = dynamic(
  () =>
    import("@/components/games/sentence/castle-defense").then(
      (mod) => mod.CastleDefenseGame,
    ),
  { ssr: false },
);

import { Button } from "@/components/ui/button";
import { ChevronLeft, Shield } from "lucide-react";
import { Header } from "@/components/header";

type WarningStatus = {
  type: "NO_SENTENCES" | "INSUFFICIENT_SENTENCES" | null;
  requiredCount?: number;
  currentCount?: number;
};

export default function CastleDefensePage() {
  // Use local state for sentences — NOT the shared vocabulary store,
  // because Castle Defense uses sentences (not vocab words) and the store
  // is shared with vocabulary games which would cause cross-contamination.
  const [sentences, setSentences] = useState<
    { term: string; translation: string }[]
  >([]);
  const setLastResult = useGameStore((state) => state.setLastResult);
  const [warningStatus, setWarningStatus] = useState<WarningStatus>({
    type: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const locale = useCurrentLocale();

  useEffect(() => {
    // Always fetch fresh sentences from the API (never reuse vocab store)
    const fetchSentences = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(
          `/api/v1/games/castle-defense/sentences?locale=${locale}`,
        );
        const data = await res.json();

        // Check for warnings about insufficient sentences
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
        }

        if (data.sentences) {
          setSentences(data.sentences);
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
    async (results: { xp: number; accuracy: number; difficulty: string }) => {
      setLastResult(results.xp, results.accuracy);

      try {
        await fetch("/api/v1/games/castle-defense/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            xpEarned: results.xp,
            difficulty: results.difficulty,
            accuracy: results.accuracy,
            // Logic to calculate other stats if needed, or send 0
            correctAnswers: Math.floor(results.accuracy * 10), // Estimate
            totalAttempts: 10, // Estimate
          }),
        });
      } catch (e) {
        console.error("Failed to submit game results", e);
      }
    },
    [setLastResult],
  );

  // Show loading state
  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
          <p className="text-lg font-medium text-muted-foreground">
            {"กำลังโหลด"}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show warning screen if insufficient sentences
  if (
    warningStatus.type === "NO_SENTENCES" ||
    warningStatus.type === "INSUFFICIENT_SENTENCES"
  ) {
    return (
      <main className="min-h-screen px-3 py-4 md:px-6 md:py-10 text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 md:gap-8">
          <Link
            href="/student/games"
            className="inline-flex items-center text-sm uppercase tracking-[0.2em] text-white/60 transition hover:text-white"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            {"กลับไปหน้าเกม"}
          </Link>

          <div className="flex items-center justify-center min-h-[70vh]">
            <div className="max-w-2xl w-full">
              {/* Warning Card */}
              <div className="bg-gradient-to-br from-amber-500/10 to-red-500/10 border-2 border-amber-500/30 rounded-3xl p-5 md:p-12 shadow-2xl backdrop-blur-sm">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div className="bg-amber-500/20 p-6 rounded-full border-2 border-amber-500/50">
                    <AlertTriangle className="w-16 h-16 text-amber-400" />
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-bold text-center mb-4 bg-gradient-to-r from-amber-300 to-red-300 bg-clip-text text-transparent">
                  {warningStatus.type === "NO_SENTENCES"
                    ? "ไม่พบประโยคที่บันทึกไว้"
                    : "ประโยคที่บันทึกไว้ไม่เพียงพอ"}
                </h1>

                {/* Description */}
                <div className="text-center mb-8 space-y-3">
                  {warningStatus.type === "NO_SENTENCES" ? (
                    <p className="text-lg text-white/80">
                      คุณยังไม่มีประโยคที่บันทึกไว้ในแฟลชการ์ด
                    </p>
                  ) : (
                    <>
                      <p className="text-lg text-white/80">
                        คุณต้องมีประโยคอย่างน้อย{" "}
                        <span className="text-amber-400 font-bold text-2xl">
                          {warningStatus.requiredCount}
                        </span>{" "}
                        ประโยค
                      </p>
                      <p className="text-lg text-white/80">
                        แต่ตอนนี้คุณมีเพียง{" "}
                        <span className="text-red-400 font-bold text-2xl">
                          {warningStatus.currentCount}
                        </span>{" "}
                        ประโยค
                      </p>
                    </>
                  )}
                </div>

                {/* Progress Bar (for insufficient sentences) */}
                {warningStatus.type === "INSUFFICIENT_SENTENCES" && (
                  <div className="mb-8">
                    <div className="bg-slate-800/50 rounded-full h-4 overflow-hidden border border-white/10">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-red-500 h-full transition-all duration-500 rounded-full"
                        style={{
                          width: `${Math.min(
                            ((warningStatus.currentCount || 0) /
                              (warningStatus.requiredCount || 1)) *
                              100,
                            100,
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="text-center text-sm text-white/60 mt-2">
                      ต้องการอีก{" "}
                      {(warningStatus.requiredCount || 0) -
                        (warningStatus.currentCount || 0)}{" "}
                      ประโยค
                    </p>
                  </div>
                )}

                {/* Instructions */}
                <div className="bg-slate-900/50 rounded-2xl p-6 mb-8 border border-white/10">
                  <div className="flex items-start gap-3">
                    <BookOpen className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
                    <div className="space-y-2">
                      <h3 className="font-semibold text-white text-lg">
                        วิธีบันทึกประโยค:
                      </h3>
                      <ol className="text-white/70 space-y-2 text-sm md:text-base list-decimal list-inside">
                        <li>ไปที่หน้าอ่านบทความ (Articles)</li>
                        <li>เลือกบทความที่ต้องการอ่าน</li>
                        <li>คลิกที่ประโยคที่ต้องการบันทึก</li>
                        <li>
                          เลือก &quot;บันทึกลงแฟลชการ์ด&quot; (Save to
                          Flashcard)
                        </li>
                        <li>กลับมาที่หน้านี้เพื่อเล่นเกม</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/student/articles"
                    className="group bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/50 flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-5 h-5" />
                    ไปอ่านบทความ
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="/student/games"
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 border border-white/10"
                  >
                    กลับไปหน้าเกม
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Show game if everything is OK
  return (
    <main className="min-h-screen px-3 pt-3 pb-6 md:px-6 md:pt-6 transition-colors duration-300 text-slate-900">
      <Button variant="ghost" size="sm" asChild className="mb-2 md:mb-4">
        <Link href="/student/games">
          <ChevronLeft className="mr-1 h-4 w-4" />
          {"กลับไปหน้าเกม"}
        </Link>
      </Button>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 md:gap-8">
        <Header
          heading="Castle Defense"
          text="Collect words to build towers and defend your castle!"
        >
          <Shield className="h-8 w-8 text-primary" />
        </Header>

        <CastleDefenseGame vocabulary={sentences} onComplete={handleComplete} />
      </div>
    </main>
  );
}
