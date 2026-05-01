"use client";

import React, { useCallback, useEffect, useState, use } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Map as MapIcon, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { useScopedI18n, useCurrentLocale } from "@/locales/client";
import { useSession } from "@/hooks/useSession";
import { useGameStore } from "@/store/useGameStore";
import { SentenceItem } from "@/lib/games/realmCarver";

// Dynamic import for game component to avoid SSR issues with Konva
const RealmCarverGame = dynamic(
  () => import("@/components/games/sentence/realm-carver/RealmCarverGame").then((mod) => mod.RealmCarverGame),
  { ssr: false }
);

export default function RealmCarverPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const t = useScopedI18n("pages.student.gamesPage");
  const currentLocale = useCurrentLocale();
  const { data: session } = useSession();
  const setLastResult = useGameStore((state) => state.setLastResult);
  
  const [sentences, setSentences] = useState<SentenceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSentences = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/v1/games/realm-carver/sentences?locale=${locale}`);
        const data = await res.json();

        if (res.ok && data.sentences && data.sentences.length > 0) {
          const sentence = data.sentences[0];
          const words = sentence.text.split(" ").map((word: string) => ({
            term: word,
            translation: word,
          }));
          setSentences(words);
        } else if (data.warning === "NO_SENTENCES") {
          setError("No sentences available for this level.");
        } else {
          setError(data.message || "Failed to load sentences");
        }
      } catch (err) {
        console.error("Failed to fetch sentences:", err);
        setError("An error occurred while loading the game.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSentences();
  }, [locale]);

  const handleComplete = useCallback(async (results: { xp: number; accuracy: number }) => {
    // Update local store
    setLastResult(results.xp, results.accuracy);

    // Save to API
    try {
      await fetch("/api/v1/games/realm-carver/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(results),
      });
    } catch (err) {
      console.error("Failed to save game results:", err);
    }
  }, [setLastResult]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/student/games">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("backToGames")}
          </Link>
        </Button>
        <Header heading="Realm Carver" text="Claim territory and capture magical words.">
          <MapIcon className="h-8 w-8 text-primary" />
        </Header>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
            <p className="text-lg font-medium text-muted-foreground">Loading Map...</p>
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
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("backToGames")}
          </Link>
        </Button>
        <Header heading="Realm Carver" text="Claim territory and capture magical words.">
          <MapIcon className="h-8 w-8 text-primary" />
        </Header>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to Start Game</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/student/games">
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t("backToGames")}
        </Link>
      </Button>
      <Header heading="Realm Carver" text="Claim territory and capture magical words.">
        <MapIcon className="h-8 w-8 text-primary" />
      </Header>
      <div className="mx-auto w-full max-w-4xl">
        <RealmCarverGame sentences={sentences} onComplete={handleComplete} />
      </div>
    </div>
  );
}
