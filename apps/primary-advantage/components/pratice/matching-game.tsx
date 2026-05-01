"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Header } from "../header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle,
  XCircle,
  Trophy,
  Shuffle,
  Play,
  Clock,
  Target,
  Zap,
  Loader2,
  Languages,
  Volume2,
  Lightbulb,
  Eye,
  EyeOff,
  Link,
  CornerDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";

// Language options for translation matching
const TRANSLATION_LANGUAGES = {
  th: {
    code: "th",
    name: "Thai",
    flag: "🇹🇭",
    nativeName: "ไทย",
  },
  vi: {
    code: "vi",
    name: "Vietnamese",
    flag: "🇻🇳",
    nativeName: "Tiếng Việt",
  },
  cn: {
    code: "cn",
    name: "Chinese (Simplified)",
    flag: "🇨🇳",
    nativeName: "简体中文",
  },
  tw: {
    code: "tw",
    name: "Chinese (Traditional)",
    flag: "🇹🇼",
    nativeName: "繁體中文",
  },
};

interface MatchingPair {
  id: string;
  left: {
    id: string;
    content: string;
    type: "word" | "phrase" | "sentence";
  };
  right: {
    id: string;
    content: string;
    type: "definition" | "translation" | "meaning";
  };
  articleId: string;
  articleTitle: string;
  audioUrl?: string;
  startTime?: number;
  endTime?: number;
}

interface MatchingGameData {
  id: string;
  pairs: MatchingPair[];
  language: "th" | "vi" | "cn" | "tw";
}

interface MatchingGameProps {
  deckId?: string;
  gameData?: MatchingGameData[];
}

interface UserMatch {
  leftId: string;
  rightId: string;
  isCorrect: boolean;
}

export function MatchingGame({ deckId, gameData = [] }: MatchingGameProps) {
  // ALL HOOKS MUST BE DECLARED AT THE TOP LEVEL - NO CONDITIONAL HOOKS
  const router = useRouter();
  const t = useTranslations("SentencesPage.matchingGame");

  // State hooks - always called in the same order
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userMatches, setUserMatches] = useState<UserMatch[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<
    "th" | "vi" | "cn" | "tw"
  >("th");
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [hintsEnabled, setHintsEnabled] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [rawGameData, setRawGameData] = useState<MatchingGameData[]>([]);
  const [activeGameData, setActiveGameData] =
    useState<MatchingGameData[]>(gameData);
  const [audioHintsEnabled, setAudioHintsEnabled] = useState(false);
  const { data: session, update } = useSession();

  // Callback hooks - always called in the same order
  const generatePairsForGame = useCallback(
    (
      gameData: MatchingGameData[],
      language: "th" | "vi" | "cn" | "tw",
    ): MatchingGameData[] => {
      // For translation matching, we use all available pairs
      return gameData.map((game) => {
        const shuffledPairs = [...game.pairs].sort(() => Math.random() - 0.5);

        return {
          ...game,
          pairs: shuffledPairs,
          language,
        };
      });
    },
    [],
  );

  const handlePairSelect = useCallback(
    (leftId: string, rightId: string) => {
      if (isCompleted) return;

      const correctPair = activeGameData[currentIndex]?.pairs.find(
        (pair) => pair.left.id === leftId,
      );
      if (!correctPair) return;

      const isCorrect = rightId === correctPair.right.id;

      const newMatch: UserMatch = {
        leftId,
        rightId,
        isCorrect,
      };

      setUserMatches((prev) => {
        const existing = prev.find((m) => m.leftId === leftId);
        if (existing) {
          return prev.map((m) => (m.leftId === leftId ? newMatch : m));
        } else {
          return [...prev, newMatch];
        }
      });

      setHasUserInteracted(true);
      setSelectedLeft(null);

      if (isCorrect) {
        toast.success(t("results.correctMatch"));
      } else {
        toast.error(t("results.incorrectMatch"));
      }
    },
    [activeGameData, currentIndex, isCompleted, t],
  );

  const handleLeftItemClick = useCallback(
    (leftId: string) => {
      if (isCompleted) return;
      setSelectedLeft((prev) => (prev === leftId ? null : leftId));
    },
    [isCompleted],
  );

  const handleRightItemClick = useCallback(
    (rightId: string) => {
      if (isCompleted || !selectedLeft) return;
      handlePairSelect(selectedLeft, rightId);
    },
    [selectedLeft, isCompleted, handlePairSelect],
  );

  const loadGameDataFromDeck = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/flashcard/decks/${deckId}/sentences-for-matching?language=${selectedLanguage}`,
      );
      if (response.ok) {
        const data = await response.json();
        setRawGameData(data.matchingGames || []);
      } else {
        toast.error(t("toast.failedToLoad"));
      }
    } catch (error) {
      console.error("Error loading matching data:", error);
      toast.error(t("toast.failedToLoadData"));
    } finally {
      setIsLoading(false);
    }
  }, [deckId, selectedLanguage, t]);

  const handleStartGame = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handleNext = useCallback(async () => {
    if (currentIndex < activeGameData.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setGameComplete(true);
      await fetch(`/api/flashcard/decks/${deckId}/sentences-for-matching`, {
        method: "POST",
        body: JSON.stringify({
          score: score,
          timer: timer,
        }),
      });
      setIsPlaying(false);
      update({
        user: {
          ...session?.user,
        },
      });
    }
  }, [currentIndex, activeGameData.length, deckId, score, timer]);

  const handleRestart = useCallback(() => {
    setUserMatches([]);
    setShowResult(false);
    setIsCompleted(false);
    setHasUserInteracted(false);
    setShowCorrectAnswers(false);
    setSelectedLeft(null);
    setHintsEnabled(false);
  }, []);

  const handleCheckAnswer = useCallback(() => {
    const currentGame = activeGameData[currentIndex];
    if (!currentGame || userMatches.length === 0) return;

    const correctCount = userMatches.filter((match) => match.isCorrect).length;
    const isAllCorrect = correctCount === currentGame.pairs.length;

    setIsCompleted(true);
    setShowResult(true);
    setHasUserInteracted(true);

    if (isAllCorrect) {
      setScore((prev) => prev + 1);
      toast.success(t("results.perfect"));
    } else {
      toast.error(
        t("results.tryAgain", {
          correct: correctCount,
          total: currentGame.pairs.length,
        }),
      );
    }
  }, [userMatches, activeGameData, currentIndex, t]);

  const handleRestartGame = useCallback(() => {
    setCurrentIndex(0);
    setScore(0);
    setTimer(0);
    setGameComplete(false);
    setIsPlaying(false);
    setHasUserInteracted(false);
  }, []);

  const handleShowAnswers = useCallback(() => {
    setShowCorrectAnswers(true);
    toast.info(t("results.showAnswers"));
  }, [t]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const playAudio = useCallback(async () => {
    const currentGame = activeGameData[currentIndex];
    const currentPair = currentGame?.pairs.find(
      (pair) => selectedLeft && pair.left.id === selectedLeft,
    );

    if (!currentPair?.audioUrl || isPlayingAudio) return;

    setIsPlayingAudio(true);
    toast.success(t("hints.playingAudio"));

    try {
      await new Promise((resolve, reject) => {
        const audio = new Audio();
        let timeoutId: NodeJS.Timeout;

        const cleanup = () => {
          audio.pause();
          if (timeoutId) clearTimeout(timeoutId);
          audio.removeEventListener("loadeddata", handleLoadedData);
          audio.removeEventListener("seeked", handleSeeked);
          audio.removeEventListener("timeupdate", handleTimeUpdate);
          audio.removeEventListener("ended", handleEnded);
          audio.removeEventListener("error", handleError);
        };

        const handleLoadedData = () => {
          audio.removeEventListener("loadeddata", handleLoadedData);
          if (currentPair.startTime !== undefined) {
            audio.currentTime = currentPair.startTime;
          } else {
            audio.play().catch(handleError);
          }
        };

        const handleSeeked = () => {
          audio.removeEventListener("seeked", handleSeeked);
          audio
            .play()
            .then(() => {
              if (currentPair.endTime !== undefined) {
                audio.addEventListener("timeupdate", handleTimeUpdate);
              }
            })
            .catch(handleError);
        };

        const handleTimeUpdate = () => {
          if (
            currentPair.endTime !== undefined &&
            audio.currentTime >= currentPair.endTime
          ) {
            cleanup();
            resolve(void 0);
          }
        };

        const handleEnded = () => {
          cleanup();
          resolve(void 0);
        };

        const handleError = (error: any) => {
          cleanup();
          reject(error);
        };

        audio.addEventListener("loadeddata", handleLoadedData);
        if (currentPair.startTime !== undefined) {
          audio.addEventListener("seeked", handleSeeked);
        }
        audio.addEventListener("ended", handleEnded);
        audio.addEventListener("error", handleError);

        timeoutId = setTimeout(() => {
          cleanup();
          resolve(void 0);
        }, 10000);

        audio.preload = "auto";
        audio.src = currentPair.audioUrl!;
        audio.load();
      });

      toast.success(t("hints.audioCompleted"));
    } catch (error) {
      console.error("Error playing audio:", error);
      toast.error(t("hints.audioFailed"));
    } finally {
      setIsPlayingAudio(false);
    }
  }, [activeGameData, currentIndex, selectedLeft, isPlayingAudio, t]);

  const toggleHints = useCallback(() => {
    setHintsEnabled((prev) => {
      const newState = !prev;
      if (newState) {
        toast.success(t("hints.enabled"));
      } else {
        toast.info(t("hints.disabled"));
      }
      return newState;
    });
  }, [t]);

  const toggleAudioHints = useCallback(() => {
    setAudioHintsEnabled((prev) => !prev);
  }, []);

  const getMatchStatus = useCallback(
    (leftId: string, rightId: string) => {
      const match = userMatches.find(
        (m) => m.leftId === leftId && m.rightId === rightId,
      );
      return match;
    },
    [userMatches],
  );

  // Memo hooks - always called in the same order
  const activeGameDataWithPairs = useMemo(() => {
    if (rawGameData.length === 0) return [];
    return generatePairsForGame(rawGameData, selectedLanguage);
  }, [rawGameData, selectedLanguage, generatePairsForGame]);

  const currentGame = useMemo(
    () => activeGameData[currentIndex],
    [activeGameData, currentIndex],
  );

  const progress = useMemo(
    () =>
      ((currentIndex + (isCompleted ? 1 : 0)) / activeGameData.length) * 100,
    [currentIndex, isCompleted, activeGameData.length],
  );

  const shuffledRightItems = useMemo(() => {
    if (!currentGame) return [];
    return [...currentGame.pairs.map((pair) => pair.right)].sort(
      () => Math.random() - 0.5,
    );
  }, [currentGame?.pairs]);

  // Effect hooks - always called in the same order
  useEffect(() => {
    setActiveGameData(activeGameDataWithPairs);
    if (activeGameDataWithPairs.length > 0) {
      setCurrentIndex(0);
      setUserMatches([]);
      setShowResult(false);
      setIsCompleted(false);
      setHasUserInteracted(false);
      setShowCorrectAnswers(false);
      setSelectedLeft(null);
    }
  }, [activeGameDataWithPairs]);

  useEffect(() => {
    if (deckId && gameData.length === 0 && rawGameData.length === 0) {
      loadGameDataFromDeck();
    }
  }, [deckId, gameData.length, rawGameData.length, loadGameDataFromDeck]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && !gameComplete) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, gameComplete]);

  useEffect(() => {
    if (currentGame) {
      setUserMatches([]);
      setShowResult(false);
      setIsCompleted(false);
      setHasUserInteracted(false);
      setShowCorrectAnswers(false);
      setSelectedLeft(null);
    }
  }, [currentGame?.id]);

  useEffect(() => {
    if (!currentGame || userMatches.length === 0) return;

    if (
      userMatches.length === currentGame.pairs.length &&
      !isCompleted &&
      hasUserInteracted
    ) {
      const correctCount = userMatches.filter(
        (match) => match.isCorrect,
      ).length;
      const isAllCorrect = correctCount === currentGame.pairs.length;

      setIsCompleted(true);
      setShowResult(true);

      if (isAllCorrect) {
        setScore((prev) => prev + 1);
        toast.success("Perfect! All pairs matched correctly! 🎉");
      } else {
        toast.error(
          `${correctCount}/${currentGame.pairs.length} correct. Try again! 💪`,
        );
      }
    }
  }, [userMatches, currentGame?.pairs.length, isCompleted, hasUserInteracted]);

  // NOW ALL HOOKS ARE DECLARED - SAFE TO HAVE CONDITIONAL RENDERS

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{t("loading.title")}</h3>
            <p className="text-muted-foreground text-sm">
              {t("loading.description")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Game complete screen
  if (gameComplete) {
    const accuracy = Math.round((score / activeGameData.length) * 100);

    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-8 text-center">
          <div className="relative">
            <div className="animate-bounce">
              <Trophy className="mx-auto h-24 w-24 text-yellow-500" />
            </div>
            <div className="bg-primary absolute -top-2 -right-2 h-6 w-6 animate-ping rounded-full" />
          </div>

          <div className="space-y-4">
            <h1 className="gradient-text text-4xl font-bold md:text-5xl">
              {t("complete.title")}
            </h1>
            <p className="text-muted-foreground text-xl">
              {t("complete.subtitle", { count: activeGameData.length })}
            </p>
          </div>

          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-6 md:grid-cols-3">
            <Card className="relative overflow-hidden">
              <CardContent className="p-6 text-center">
                <Target className="mx-auto mb-3 h-8 w-8 text-blue-500" />
                <div className="text-3xl font-bold text-blue-600">{score}</div>
                <p className="text-muted-foreground text-sm">
                  {t("complete.stats.perfectScores")}
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardContent className="p-6 text-center">
                <Zap className="mx-auto mb-3 h-8 w-8 text-green-500" />
                <div className="text-3xl font-bold text-green-600">
                  {accuracy}%
                </div>
                <p className="text-muted-foreground text-sm">
                  {t("complete.stats.accuracy")}
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardContent className="p-6 text-center">
                <Clock className="mx-auto mb-3 h-8 w-8 text-purple-500" />
                <div className="text-3xl font-bold text-purple-600">
                  {formatTime(timer)}
                </div>
                <p className="text-muted-foreground text-sm">
                  {t("complete.stats.totalTime")}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mx-auto flex max-w-md flex-col gap-4 sm:flex-row">
            <Button
              onClick={handleBack}
              size="lg"
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("complete.backToMenu")}
            </Button>
            <Button onClick={handleRestartGame} size="lg" className="flex-1">
              <RotateCcw className="mr-2 h-4 w-4" />
              {t("complete.playAgain")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Start screen
  if (!isPlaying) {
    return (
      <div className="container mx-auto max-w-4xl space-y-8 px-4">
        <Header heading={t("title")} text={t("descriptionShort")} />

        <Card className="mx-auto max-w-2xl">
          <CardHeader className="pb-6 text-center">
            <CardTitle className="text-2xl">{t("startScreen.title")}</CardTitle>
            <p className="text-muted-foreground">{t("startScreen.subtitle")}</p>
          </CardHeader>

          <CardContent className="space-y-8">
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2 text-center">
                <div className="bg-primary/10 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
                  <span className="text-primary text-2xl font-bold">
                    {activeGameData.length}
                  </span>
                </div>
                <p className="text-sm font-medium">
                  {t("startScreen.stats.matchingSets")}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("startScreen.stats.readyToPlay")}
                </p>
              </div>

              <div className="space-y-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                  <Languages className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm font-medium">
                  {t("startScreen.stats.translation")}
                </p>
                <p className="text-muted-foreground text-xs">
                  {TRANSLATION_LANGUAGES[selectedLanguage].flag}{" "}
                  {TRANSLATION_LANGUAGES[selectedLanguage].nativeName}
                </p>
              </div>

              <div className="space-y-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <p className="text-sm font-medium">
                  {t("startScreen.stats.estimatedTime", { time: "5" })}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("startScreen.stats.estimatedTimeLabel")}
                </p>
              </div>
            </div>

            <Separator />

            <div className="bg-muted/50 space-y-3 rounded-lg p-6">
              <div className="flex items-center gap-2">
                <div className="bg-primary h-2 w-2 rounded-full" />
                <p className="text-sm font-medium">
                  {t("startScreen.howToPlay")}
                </p>
              </div>
              <ul className="text-muted-foreground ml-4 space-y-2 text-sm">
                <li>• {t("startScreen.instructions.step1")}</li>
                <li>• {t("startScreen.instructions.step2")}</li>
                <li>• {t("startScreen.instructions.step3")}</li>
              </ul>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language" className="text-sm font-medium">
                  {t("startScreen.language.title")}
                </Label>
                <Select
                  value={selectedLanguage}
                  onValueChange={(value: "th" | "vi" | "cn" | "tw") => {
                    setSelectedLanguage(value);
                    setActiveGameData([]);
                    setRawGameData([]);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRANSLATION_LANGUAGES).map(
                      ([code, lang]) => (
                        <SelectItem key={code} value={code}>
                          <div className="flex items-center gap-2">
                            <span>{lang.flag}</span>
                            <span>{lang.name}</span>
                            <span className="text-muted-foreground text-sm">
                              ({lang.nativeName})
                            </span>
                          </div>
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span>{TRANSLATION_LANGUAGES[selectedLanguage].flag}</span>
                  <span className="font-medium">
                    {TRANSLATION_LANGUAGES[selectedLanguage].name}{" "}
                    {t("startScreen.language.selected")}
                  </span>
                </div>
                <p className="text-muted-foreground text-sm">
                  {t("descriptionLong")}{" "}
                  {TRANSLATION_LANGUAGES[selectedLanguage].name} (
                  {TRANSLATION_LANGUAGES[selectedLanguage].nativeName}).
                </p>
              </div>
            </div>

            <Button
              onClick={() => {
                if (activeGameData.length === 0) {
                  loadGameDataFromDeck();
                } else {
                  handleStartGame();
                }
              }}
              size="lg"
              className="h-12 w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("startScreen.loadingButton")}
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  {t("startScreen.startButton")}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentGame) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">{t("loading.nextSet")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-4 px-4">
      <Header heading={t("title")} text={t("gameplay.instruction")} />

      <div className="space-y-2">
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <span>
            {t("gameplay.progress", {
              current: currentIndex + 1,
              total: activeGameData.length,
            })}
          </span>
          <div className="flex items-center gap-4">
            <span>
              {t("gameplay.score", {
                score,
                total: activeGameData.length,
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(timer)}
            </span>
          </div>
        </div>
        <Progress value={progress} className="h-1" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-3">
              <CardTitle className="text-xl">
                🌐 {t("gameplay.title")}
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                {t("gameplay.instruction")}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-muted/30 flex flex-wrap items-center gap-3 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">{t("hints.title")}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={toggleAudioHints}
                variant={audioHintsEnabled ? "default" : "outline"}
                size="sm"
                className="h-8"
              >
                <Volume2 className="mr-1 h-3 w-3" />
                {t("hints.audio")}
              </Button>
            </div>

            {audioHintsEnabled && selectedLeft && (
              <>
                <Separator orientation="vertical" className="h-6" />
                <Button
                  onClick={playAudio}
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={isPlayingAudio}
                >
                  {isPlayingAudio ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      {t("hints.playing")}
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-3 w-3" />
                      {t("hints.playAudio")}
                    </>
                  )}
                </Button>
              </>
            )}
          </div>

          <div className="bg-muted/10 border-muted-foreground/25 rounded-lg border-2">
            <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <h3 className="font-medium">
                    {t("gameplay.englishSentences")}
                  </h3>
                </div>
                <div className="space-y-2">
                  {currentGame.pairs.map((pair) => {
                    const isSelected = selectedLeft === pair.left.id;
                    const userMatch = userMatches.find(
                      (m) => m.leftId === pair.left.id,
                    );
                    const isMatched = !!userMatch;
                    const isCorrect = userMatch?.isCorrect;

                    return (
                      <Button
                        key={pair.left.id}
                        onClick={() => handleLeftItemClick(pair.left.id)}
                        variant="outline"
                        className={cn(
                          "h-auto w-full justify-start p-4 text-left",
                          isSelected && "ring-primary border-primary ring-2",
                          isMatched &&
                            isCorrect &&
                            (isCompleted || hintsEnabled) &&
                            "border-green-500 bg-green-50 dark:bg-green-950/20",
                          isMatched &&
                            !isCorrect &&
                            (isCompleted || hintsEnabled) &&
                            "border-red-500 bg-red-50 dark:bg-red-950/20",
                          isCompleted && "cursor-default",
                        )}
                        disabled={isCompleted}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {isMatched && isCorrect && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                            {isMatched && !isCorrect && (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="font-medium">
                              {pair.left.content}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {pair.left.type.charAt(0).toUpperCase() +
                              pair.left.type.slice(1)}
                          </p>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 lg:col-start-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <h3 className="font-medium">
                    {TRANSLATION_LANGUAGES[selectedLanguage].flag}{" "}
                    {t("gameplay.translations", {
                      language: TRANSLATION_LANGUAGES[selectedLanguage].name,
                    })}
                  </h3>
                </div>
                <div className="space-y-2">
                  {shuffledRightItems.map((rightItem) => {
                    const userMatch = userMatches.find(
                      (m) => m.rightId === rightItem.id,
                    );
                    const isMatched = !!userMatch;
                    const isCorrect = userMatch?.isCorrect;

                    return (
                      <Button
                        key={rightItem.id}
                        onClick={() => handleRightItemClick(rightItem.id)}
                        variant="outline"
                        className={cn(
                          "h-auto w-full justify-start p-4 text-left",
                          !selectedLeft && "cursor-not-allowed opacity-50",
                          isMatched &&
                            isCorrect &&
                            (isCompleted || hintsEnabled) &&
                            "border-green-500 bg-green-50 dark:bg-green-950/20",
                          isMatched &&
                            !isCorrect &&
                            (isCompleted || hintsEnabled) &&
                            "border-red-500 bg-red-50 dark:bg-red-950/20",
                          isCompleted && "cursor-default",
                        )}
                        disabled={!selectedLeft || isCompleted}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {isMatched && isCorrect && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                            {isMatched && !isCorrect && (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="font-medium">
                              {rightItem.content}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {rightItem.type.charAt(0).toUpperCase() +
                              rightItem.type.slice(1)}
                          </p>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t("gameplay.pairsProgress", {
                matched: userMatches.length,
                total: currentGame.pairs.length,
              })}
            </span>
            {userMatches.length > 0 && (
              <span className="text-muted-foreground">
                {t("gameplay.correctCount", {
                  correct: userMatches.filter((m) => m.isCorrect).length,
                  total: userMatches.length,
                })}
              </span>
            )}
          </div>

          {showResult && (
            <Card
              className={cn(
                "border-2",
                userMatches.every((m) => m.isCorrect)
                  ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                  : "border-red-500 bg-red-50 dark:bg-red-950/20",
              )}
            >
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    {userMatches.every((m) => m.isCorrect) ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600" />
                    )}
                    <h3 className="text-lg font-semibold">
                      {userMatches.every((m) => m.isCorrect)
                        ? t("results.allCorrect")
                        : t("results.partialCorrect", {
                            correct: userMatches.filter((m) => m.isCorrect)
                              .length,
                            total: currentGame.pairs.length,
                          })}
                    </h3>
                  </div>

                  {!userMatches.every((m) => m.isCorrect) &&
                    showCorrectAnswers && (
                      <div className="space-y-3">
                        <Separator />
                        <div>
                          <h4 className="mb-3 font-medium">
                            {t("results.correctMatches")}
                          </h4>
                          <div className="space-y-2">
                            {currentGame.pairs.map((pair, index) => (
                              <div key={pair.id} className="flex gap-3 text-sm">
                                <span className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold">
                                  {index + 1}
                                </span>
                                <p className="flex-1">
                                  <span className="font-medium">
                                    {pair.left.content}
                                  </span>
                                  <span className="text-muted-foreground mx-2">
                                    →
                                  </span>
                                  <span className="font-medium">
                                    {pair.right.content}
                                  </span>
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={handleRestart}
              variant="outline"
              size="sm"
              className="sm:w-auto"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {t("buttons.resetMatches")}
            </Button>

            {!isCompleted && userMatches.length > 0 && (
              <Button
                onClick={handleCheckAnswer}
                variant="outline"
                size="sm"
                className="sm:w-auto"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {t("buttons.checkMatches")}
              </Button>
            )}

            {isCompleted &&
              !userMatches.every((m) => m.isCorrect) &&
              !showCorrectAnswers && (
                <Button
                  onClick={handleShowAnswers}
                  variant="secondary"
                  size="sm"
                  className="sm:w-auto"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {t("buttons.showAnswers")}
                </Button>
              )}

            {isCompleted && (
              <Button onClick={handleNext} className="flex-1">
                {currentIndex < activeGameData.length - 1
                  ? t("buttons.nextSet")
                  : t("buttons.finishGame")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
