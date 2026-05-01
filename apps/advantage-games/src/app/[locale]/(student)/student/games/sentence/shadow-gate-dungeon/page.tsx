"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { AlertTriangle, BookOpen, ArrowRight } from "lucide-react";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { useSession } from "@/hooks/useSession";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const ShadowGateDungeonGame = dynamic(
  () =>
    import("@/components/games/sentence/shadow-gate-dungeon").then(
      (mod) => mod.ShadowGateDungeonGame,
    ),
  { ssr: false },
);

import { Button } from "@/components/ui/button";
import { ChevronLeft, Castle } from "lucide-react";
import { Header } from "@/components/header";

type WarningStatus = {
  type: "NO_SENTENCES" | "INSUFFICIENT_SENTENCES" | null;
  requiredCount?: number;
  currentCount?: number;
};

export default function ShadowGateDungeonPage() {
  const t = useScopedI18n("pages.student.gamesPage.shadowGateDungeon");
  const { data: session } = useSession();
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
    const fetchSentences = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(
          `/api/v1/games/shadow-gate-dungeon/sentences?locale=${locale}`,
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
    async (results: { xp: number; accuracy: number }) => {
      setLastResult(results.xp, results.accuracy);

      try {
        await fetch("/api/v1/games/shadow-gate-dungeon/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            xpEarned: results.xp,
            accuracy: results.accuracy,
            correctAnswers: Math.floor(results.accuracy * 10),
            totalAttempts: 10,
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
              <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border-2 border-purple-500/30 rounded-3xl p-5 md:p-12 shadow-2xl backdrop-blur-sm">
                <div className="flex justify-center mb-6">
                  <div className="bg-purple-500/20 p-6 rounded-full border-2 border-purple-500/50">
                    <AlertTriangle className="w-16 h-16 text-purple-400" />
                  </div>
                </div>

                <h1 className="text-3xl md:text-4xl font-bold text-center mb-4 bg-gradient-to-r from-purple-300 to-indigo-300 bg-clip-text text-transparent">
                  {warningStatus.type === "NO_SENTENCES"
                    ? "ไม่พบประโยคที่บันทึกไว้"
                    : "ประโยคที่บันทึกไว้ไม่เพียงพอ"}
                </h1>

                <div className="text-center mb-8 space-y-3">
                  {warningStatus.type === "NO_SENTENCES" ? (
                    <p className="text-lg text-white/80">
                      คุณยังไม่มีประโยคที่บันทึกไว้ในแฟลชการ์ด
                    </p>
                  ) : (
                    <>
                      <p className="text-lg text-white/80">
                        คุณต้องมีประโยคอย่างน้อย{" "}
                        <span className="text-purple-400 font-bold text-2xl">
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

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/student/articles"
                    className="group bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-purple-500/50 flex items-center justify-center gap-2"
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
          heading="Shadow Gate Dungeon"
          text="Collect word crystals and escape the shadow creature!"
        >
          <Castle className="h-8 w-8 text-primary" />
        </Header>

        <ShadowGateDungeonGame vocabulary={sentences} onComplete={handleComplete} />
      </div>
    </main>
  );
}
