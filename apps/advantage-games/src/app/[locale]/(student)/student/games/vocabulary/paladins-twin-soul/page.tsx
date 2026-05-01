"use client";

import React, { useCallback, useEffect, useState, use } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Sword, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { useScopedI18n, useCurrentLocale } from "@/locales/client";
import { useGameStore } from "@/store/useGameStore";
import { useSession } from "@/hooks/useSession";
import { VocabularyItem } from "@/lib/games/paladinsTwinSoul";

// Dynamic import for game component to avoid SSR issues with Konva
const PaladinsTwinSoulGame = dynamic(
  () => import("@/components/games/vocabulary/paladins-twin-soul/PaladinsTwinSoulGame").then((mod) => mod.PaladinsTwinSoulGame),
  { ssr: false }
);

export default function PaladinsTwinSoulPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const t = useScopedI18n("pages.student.gamesPage");
  const currentLocale = useCurrentLocale();
  // Use locale from params to ensure it's available
  const pageLocale = locale || currentLocale;
  const { data: session } = useSession();
  const setLastResult = useGameStore((state) => state.setLastResult);
  
  // Use session to ensure compliance with auth requirements
  const isAuthenticated = !!session?.user;
  
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVocabulary = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/v1/games/paladins-twin-soul/vocabulary?locale=${pageLocale}`);
        const data = await res.json();

        if (res.ok && data.vocabulary && data.vocabulary.length > 0) {
          setVocabulary(data.vocabulary);
        } else {
          setError(data.message || "Failed to load vocabulary");
        }
      } catch (err) {
        console.error("Failed to fetch vocabulary:", err);
        setError("An error occurred while loading the game.");
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchVocabulary();
    }
  }, [pageLocale, isAuthenticated]);

  const handleComplete = useCallback(async (results: { xp: number; accuracy: number }) => {
    setLastResult(results.xp, results.accuracy);

    try {
      await fetch("/api/v1/games/paladins-twin-soul/complete", {
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
        <Header heading="Paladin's Twin-Soul" text="Defend the realm and rescue your twin soul!">
          <Sword className="h-8 w-8 text-primary" />
        </Header>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
            <p className="text-lg font-medium text-muted-foreground">Preparing for Battle...</p>
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
        <Header heading="Paladin's Twin-Soul" text="Defend the realm and rescue your twin soul!">
          <Sword className="h-8 w-8 text-primary" />
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
      <Header heading="Paladin's Twin-Soul" text="Defend the realm and rescue your twin soul!">
        <Sword className="h-8 w-8 text-primary" />
      </Header>
      <div className="mx-auto w-full max-w-4xl">
        <PaladinsTwinSoulGame vocabulary={vocabulary} onComplete={handleComplete} />
      </div>
    </div>
  );
}
