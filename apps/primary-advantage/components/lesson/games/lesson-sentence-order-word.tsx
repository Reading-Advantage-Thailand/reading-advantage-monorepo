"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
  Volume2,
  Lightbulb,
  Type,
  Plus,
  Minus,
  Languages,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { getLessonOrderingWords } from "@/actions/flashcard";
import { ActivityType, UserXpEarned } from "@/types/enum";
import { updateUserActivity } from "@/actions/user";
import { useSession } from "next-auth/react";

interface OrderWordData {
  id: string;
  articleId: string;
  articleTitle: string;
  sentence: string;
  correctOrder: string[];
  words: Array<{
    id: string;
    text: string;
    translation?: {
      th?: string;
      cn?: string;
      tw?: string;
      vi?: string;
    };
    audioUrl?: string;
    startTime?: number;
    endTime?: number;
    partOfSpeech?: string;
  }>;
  difficulty: "easy" | "medium" | "hard";
  context?: string;
  sentenceTranslations?: {
    th?: string;
    cn?: string;
    tw?: string;
    vi?: string;
  };
}

interface OrderWordGameProps {
  deckId?: string;
  sentences?: OrderWordData[];
}

interface ClickableWord {
  id: string;
  text: string;
  originalIndex: number;
  translation?: {
    th?: string;
    cn?: string;
    tw?: string;
    vi?: string;
  };
  audioUrl?: string;
  startTime?: number;
  endTime?: number;
  partOfSpeech?: string;
}

const SUPPORTED_LANGUAGES = {
  th: "🇹🇭 Thai",
  vi: "🇻🇳 Vietnamese",
  cn: "🇨🇳 Chinese (Simplified)",
  tw: "🇹🇼 Chinese (Traditional)",
};

export default function LessonSentenceOrderWord({
  articleId,
}: {
  articleId: string;
}) {
  const t = useTranslations("SentencesPage.orderWordGame");
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedWords, setSelectedWords] = useState<ClickableWord[]>([]);
  const [availableWords, setAvailableWords] = useState<ClickableWord[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { data: session, update } = useSession();
  // Add flag to track if user has made any moves
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isPlayingHintAudio, setIsPlayingHintAudio] = useState(false);
  const [showCorrectOrder, setShowCorrectOrder] = useState(false);

  const [highlightHintsEnabled, setHighlightHintsEnabled] = useState(false);
  const [audioHintsEnabled, setAudioHintsEnabled] = useState(false);

  // Translation language (selected before game starts)
  const [selectedLanguage, setSelectedLanguage] = useState<string>("th");

  const [activeSentences, setActiveSentences] = useState<OrderWordData[]>([]);

  useEffect(() => {
    if (articleId) {
      loadSentencesFromDeck();
    }
  }, [articleId]);

  const loadSentencesFromDeck = async () => {
    setIsLoading(true);
    try {
      const response = (await getLessonOrderingWords(articleId)) as {
        sentences: OrderWordData[];
        totalSentences: number;
      };
      setActiveSentences(response.sentences || []);
    } catch (error) {
      console.error("Error loading sentences:", error);
      toast.error(t("toast.failedToLoadSentences"));
    } finally {
      setIsLoading(false);
    }
  };

  const currentSentence = useMemo(
    () => activeSentences[currentIndex],
    [activeSentences, currentIndex],
  );

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && !gameComplete) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, gameComplete]);

  // Shuffle words function
  const shuffleWords = useCallback((words: typeof currentSentence.words) => {
    // Create a copy of the words array
    const wordsToShuffle = [...words];

    // Fisher-Yates shuffle algorithm for better randomization
    for (let i = wordsToShuffle.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [wordsToShuffle[i], wordsToShuffle[j]] = [
        wordsToShuffle[j],
        wordsToShuffle[i],
      ];
    }

    // Map to clickable format with unique IDs
    return wordsToShuffle.map((word, index) => ({
      id: `${word.id}-shuffled-${Date.now()}-${index}`,
      text: word.text,
      originalIndex: words.findIndex((w) => w.id === word.id),
      translation: word.translation,
      audioUrl: word.audioUrl,
      startTime: word.startTime,
      endTime: word.endTime,
      partOfSpeech: word.partOfSpeech,
    }));
  }, []);

  // Initialize shuffled words when sentence changes
  useEffect(() => {
    if (currentSentence?.words) {
      const shuffled = shuffleWords(currentSentence.words);
      setAvailableWords(shuffled);
      setSelectedWords([]);
      setShowResult(false);
      setIsCompleted(false);
      setHasUserInteracted(false);
      setShowCorrectOrder(false);
    }
  }, [currentSentence?.id, shuffleWords]);

  // Check answer when selected words change
  useEffect(() => {
    if (!currentSentence?.correctOrder || selectedWords.length === 0) return;

    // Only auto-complete if:
    // 1. User has selected all words
    // 2. Game is not already completed
    // 3. User has actually interacted with the game
    if (
      selectedWords.length === currentSentence.words.length &&
      !isCompleted &&
      hasUserInteracted
    ) {
      const userWordOrder = selectedWords.map((item) => item.text);
      const isCorrect =
        JSON.stringify(userWordOrder) ===
        JSON.stringify(currentSentence.correctOrder);

      if (isCorrect) {
        setIsCompleted(true);
        setShowResult(true);
        setScore((prev) => prev + 1);
        // toast.success("Perfect! Correct word order! 🎉");
      }
    }
  }, [
    selectedWords,
    currentSentence?.correctOrder,
    isCompleted,
    hasUserInteracted,
  ]);

  // Click handlers
  const handleWordClick = useCallback((word: ClickableWord) => {
    setSelectedWords((prev) => [...prev, word]);
    setAvailableWords((prev) => prev.filter((w) => w.id !== word.id));
    setHasUserInteracted(true);
  }, []);

  const handleSelectedWordClick = useCallback(
    (word: ClickableWord, index: number) => {
      setSelectedWords((prev) => prev.filter((_, i) => i !== index));
      setAvailableWords((prev) => [...prev, word]);
      setHasUserInteracted(true);
    },
    [],
  );

  const handleStartGame = useCallback(() => {
    setIsPlaying(true);
    toast.success(
      t("toast.gameStarted", {
        language:
          SUPPORTED_LANGUAGES[
            selectedLanguage as keyof typeof SUPPORTED_LANGUAGES
          ],
      }),
    );
  }, [selectedLanguage, t]);

  const handleNext = useCallback(async () => {
    if (currentIndex < activeSentences.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setGameComplete(true);
      await updateUserActivity(
        articleId,
        ActivityType.SENTENCE_WORD_ORDERING,
        UserXpEarned.SENTENCE_WORD_ORDERING,
        timer,
        {
          score: UserXpEarned.SENTENCE_WORD_ORDERING,
        },
      );
      setIsPlaying(false);
      update({
        user: {
          ...session?.user,
        },
      });
    }
  }, [currentIndex, activeSentences.length]);

  const handleRestart = useCallback(() => {
    if (currentSentence?.words) {
      const shuffled = shuffleWords(currentSentence.words);
      setAvailableWords(shuffled);
      setSelectedWords([]);
      setShowResult(false);
      setIsCompleted(false);
      setHasUserInteracted(false);
      setShowCorrectOrder(false);
      setHighlightHintsEnabled(false);
      setAudioHintsEnabled(false);
    }
  }, [currentSentence?.words, shuffleWords]);

  const handleCheckAnswer = useCallback(() => {
    if (!currentSentence?.correctOrder || selectedWords.length === 0) return;

    const userWordOrder = selectedWords.map((item) => item.text);
    const isCorrect =
      JSON.stringify(userWordOrder) ===
      JSON.stringify(currentSentence.correctOrder);

    setIsCompleted(true);
    setShowResult(true);
    setHasUserInteracted(true);

    if (isCorrect) {
      setScore((prev) => prev + 1);
      toast.success(t("results.perfect"));
    } else {
      toast.error(t("results.notQuiteRight"));
    }
  }, [selectedWords, currentSentence?.correctOrder, t]);

  const handleRestartGame = useCallback(() => {
    setCurrentIndex(0);
    setScore(0);
    setTimer(0);
    setGameComplete(false);
    setIsPlaying(false);
    setHasUserInteracted(false);
  }, []);

  const handleShowAnswer = useCallback(() => {
    setShowCorrectOrder(true);
    toast.info(t("results.correctOrderRevealed"));
  }, [t]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleLanguageChange = useCallback(
    (value: string) => {
      setSelectedLanguage(value);
      const language =
        SUPPORTED_LANGUAGES[value as keyof typeof SUPPORTED_LANGUAGES];
      toast.success(t("toast.languageSet", { language }));
    },
    [t],
  );

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const progress = useMemo(
    () =>
      ((currentIndex + (isCompleted ? 1 : 0)) / activeSentences.length) * 100,
    [currentIndex, isCompleted, activeSentences.length],
  );

  const isCorrect = useMemo(() => {
    const userWordOrder = selectedWords.map((item) => item.text);
    return (
      JSON.stringify(userWordOrder) ===
      JSON.stringify(currentSentence?.correctOrder || [])
    );
  }, [selectedWords, currentSentence?.correctOrder]);

  const isInCorrectPosition = useCallback(
    (word: ClickableWord, currentIndex: number) => {
      if (!currentSentence?.correctOrder || !highlightHintsEnabled)
        return false;
      return currentSentence.correctOrder[currentIndex] === word.text;
    },
    [currentSentence?.correctOrder, highlightHintsEnabled],
  );

  const shouldHighlightAvailableWord = useCallback(
    (word: ClickableWord) => {
      if (!currentSentence?.correctOrder || !highlightHintsEnabled)
        return false;
      // Highlight if this word should be the next one in the sequence
      const nextPosition = selectedWords.length;
      return currentSentence.correctOrder[nextPosition] === word.text;
    },
    [
      currentSentence?.correctOrder,
      highlightHintsEnabled,
      selectedWords.length,
    ],
  );

  const toggleHighlightHints = useCallback(() => {
    setHighlightHintsEnabled((prev) => !prev);
  }, []);

  const toggleAudioHints = useCallback(() => {
    setAudioHintsEnabled((prev) => !prev);
  }, []);

  const playHintAudio = useCallback(async () => {
    if (!currentSentence?.words || isPlayingHintAudio) return;

    setIsPlayingHintAudio(true);
    // toast.success("Playing correct word order audio 🔊");

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
          audio.currentTime = currentSentence.words[currentIndex].startTime!;
        };

        const handleSeeked = () => {
          audio.removeEventListener("seeked", handleSeeked);
          audio
            .play()
            .then(() => {
              audio.addEventListener("timeupdate", handleTimeUpdate);
            })
            .catch(handleError);
        };

        const handleTimeUpdate = () => {
          const tolerance = 0.5;
          if (
            audio.currentTime + tolerance >=
            currentSentence.words[currentIndex].endTime!
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
        audio.addEventListener("seeked", handleSeeked);
        audio.addEventListener("ended", handleEnded);
        audio.addEventListener("error", handleError);

        timeoutId = setTimeout(() => {
          cleanup();
          resolve(void 0);
        }, 5000);

        audio.preload = "auto";
        audio.src = currentSentence.words[currentIndex].audioUrl!;
        audio.load();
      });
    } catch (error) {
      // console.warn(`Failed to play audio for word ${i + 1}:`, error);
    } finally {
      // toast.success("Audio sequence completed! 🎵");
      setIsPlayingHintAudio(false);
    }
  }, [currentSentence, isPlayingHintAudio]);

  const formedSentence = useMemo(() => {
    return selectedWords.map((word) => word.text).join(" ");
  }, [selectedWords]);

  // Helper function to get translation for a word
  const getWordTranslation = useCallback(
    (word: ClickableWord) => {
      if (!word.translation || !selectedLanguage) return null;
      return word.translation[
        selectedLanguage as keyof typeof word.translation
      ];
    },
    [selectedLanguage],
  );

  const getSentenceTranslation = useCallback(() => {
    if (!currentSentence?.sentenceTranslations || !selectedLanguage)
      return null;
    return currentSentence.sentenceTranslations[
      selectedLanguage as keyof typeof currentSentence.sentenceTranslations
    ];
  }, [currentSentence, selectedLanguage]);

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
    const accuracy = Math.round((score / activeSentences.length) * 100);

    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-8 text-center">
          {/* Trophy Animation */}
          <div className="relative">
            <div className="animate-bounce">
              <Trophy className="mx-auto h-24 w-24 text-yellow-500" />
            </div>
            <div className="bg-primary absolute -top-2 -right-2 h-6 w-6 animate-ping rounded-full" />
          </div>

          {/* Results Header */}
          <div className="space-y-4">
            <h1 className="gradient-text text-4xl font-bold md:text-5xl">
              {t("complete.title")}
            </h1>
            <p className="text-muted-foreground text-xl">
              {t("complete.subtitle", { count: activeSentences.length })}
            </p>
            <p className="text-muted-foreground text-sm">
              {t("complete.usingTranslations", {
                language:
                  SUPPORTED_LANGUAGES[
                    selectedLanguage as keyof typeof SUPPORTED_LANGUAGES
                  ],
              })}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-6 md:grid-cols-3">
            <Card className="relative overflow-hidden">
              <CardContent className="p-6 text-center">
                <Target className="mx-auto mb-3 h-8 w-8 text-blue-500" />
                <div className="text-3xl font-bold text-blue-600">{score}</div>
                <p className="text-muted-foreground text-sm">
                  {t("complete.stats.correctAnswers")}
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

          {/* Action Buttons */}
          <div className="mx-auto flex max-w-md flex-col gap-4 sm:flex-row">
            <Button
              onClick={handleBack}
              size="lg"
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("backToMenu")}
            </Button>
            <Button onClick={handleRestartGame} size="lg" className="flex-1">
              <RotateCcw className="mr-2 h-4 w-4" />
              {t("playAgain")}
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
        <Card className="mx-auto max-w-2xl">
          <CardHeader className="pb-6 text-center">
            <CardTitle className="text-2xl">{t("startScreen.title")}</CardTitle>
            <p className="text-muted-foreground">{t("startScreen.subtitle")}</p>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Game Stats */}
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2 text-center">
                <div className="bg-primary/10 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
                  <span className="text-primary text-2xl font-bold">
                    {activeSentences.length}
                  </span>
                </div>
                <p className="text-sm font-medium">
                  {t("startScreen.stats.sentences")}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("startScreen.stats.readyToPlay")}
                </p>
              </div>

              <div className="space-y-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                  <Type className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm font-medium">
                  {t("startScreen.stats.clickToOrder")}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("startScreen.stats.withTranslations")}
                </p>
              </div>

              <div className="space-y-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <p className="text-sm font-medium">
                  {t("startScreen.stats.estimatedTime", { time: 10 })}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("startScreen.stats.estimatedTimeLabel")}
                </p>
              </div>
            </div>

            <Separator />

            {/* Game Instructions */}
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
                <li>• {t("startScreen.instructions.step4")}</li>
                <li>• {t("startScreen.instructions.step5")}</li>
              </ul>
            </div>

            <Separator />

            {/* Language Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Languages className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold">
                  {t("startScreen.language.title")}
                </h3>
              </div>
              <Select
                value={selectedLanguage}
                onValueChange={handleLanguageChange}
              >
                <SelectTrigger className="h-12">
                  <div className="flex items-center gap-3">
                    <Languages className="h-4 w-4" />
                    <SelectValue
                      placeholder={t("startScreen.language.selected")}
                    />
                  </div>
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-60">
                  {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                    <SelectItem key={code} value={code}>
                      <div className="flex items-center gap-2">
                        <span>{name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-sm">
                {t("startScreen.language.description", {
                  language:
                    SUPPORTED_LANGUAGES[
                      selectedLanguage as keyof typeof SUPPORTED_LANGUAGES
                    ],
                })}
              </p>
            </div>

            <Separator />

            <Button
              onClick={handleStartGame}
              size="lg"
              className="h-12 w-full"
              disabled={activeSentences.length === 0}
            >
              <Play className="mr-2 h-5 w-5" />
              {activeSentences.length === 0
                ? t("startScreen.noSentences")
                : t("startScreen.startButton", {
                    language:
                      SUPPORTED_LANGUAGES[
                        selectedLanguage as keyof typeof SUPPORTED_LANGUAGES
                      ],
                  })}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentSentence) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading next challenge...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-4 px-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <span>
            {t("gameplay.progress", {
              current: currentIndex + 1,
              total: activeSentences.length,
            })}
          </span>
          <div className="flex items-center gap-4">
            <span>
              {t("gameplay.score", { score, total: activeSentences.length })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(timer)}
            </span>
          </div>
        </div>
        <Progress value={progress} className="h-1" />
      </div>

      {/* Game Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-3">
              <CardTitle className="text-xl">
                {t("gameplay.articleFrom", {
                  title: currentSentence.articleTitle,
                })}
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                {t("gameplay.subtitle")}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Sentence Formation Area */}
          <div className="min-h-[120px] rounded-lg border-2 border-dashed border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 p-4 dark:border-blue-800 dark:from-blue-950/20 dark:to-purple-950/20">
            <div className="space-y-4">
              {/* <div className="flex items-center gap-2">
                <Type className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Target translation:{" "}
                  {getSentenceTranslation() || "Building sentence..."}
                </p>
              </div> */}

              <div className="flex items-center gap-2">
                <Type className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {t("gameplay.yourSentence")}
                </p>
              </div>

              {selectedWords.length === 0 ? (
                <div className="flex min-h-[80px] items-center justify-center">
                  <p className="text-muted-foreground text-center italic">
                    {t("gameplay.startByClicking")}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Word pills with individual translations */}
                  <div className="flex min-h-[60px] flex-wrap items-center gap-2">
                    {selectedWords.map((word, index) => {
                      const isInCorrectPos = isInCorrectPosition(word, index);

                      return (
                        <div
                          key={`${word.id}-selected-${index}`}
                          className="space-y-1"
                        >
                          <button
                            onClick={() => handleSelectedWordClick(word, index)}
                            className={cn(
                              "group relative flex items-center gap-2 rounded-lg border-2 bg-white px-3 py-2 text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-md dark:bg-gray-900",
                              "cursor-pointer select-none",
                              {
                                // Normal state
                                "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600":
                                  !isInCorrectPos,

                                // Correct position highlighting
                                "border-green-400 bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-200":
                                  highlightHintsEnabled &&
                                  isInCorrectPos &&
                                  !isCompleted,

                                // Completed states
                                "border-green-500 bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-300":
                                  isCompleted && isCorrect,
                                "border-red-500 bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300":
                                  isCompleted && !isCorrect,
                              },
                            )}
                            disabled={isCompleted}
                          >
                            <span>{word.text}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Formed sentence and its translation */}
                  <div className="space-y-3 border-t border-blue-200 pt-3 dark:border-blue-800">
                    {/* English sentence */}
                    <div>
                      <p className="text-lg font-medium text-blue-900 dark:text-blue-100">
                        "{formedSentence}"{isCompleted && isCorrect && " ✓"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {/* Sentence translation */}

              <div className="rounded-lg border border-green-200 bg-white/50 p-3 dark:border-green-800 dark:bg-gray-800/50">
                <div className="mb-2 flex items-center gap-2">
                  <Languages className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                    {t("gameplay.translationLabel", {
                      language:
                        SUPPORTED_LANGUAGES[
                          selectedLanguage as keyof typeof SUPPORTED_LANGUAGES
                        ],
                    })}
                  </span>
                </div>
                <p className="font-medium text-green-700 dark:text-green-300">
                  "{getSentenceTranslation()}"
                </p>
              </div>
            </div>
          </div>

          {/* Hint Controls */}
          <div className="bg-muted/30 flex flex-wrap items-center gap-3 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">{t("hints.title")}</span>
            </div>

            {/* <Button
              onClick={toggleHighlightHints}
              variant={highlightHintsEnabled ? "default" : "outline"}
              size="sm"
              className="h-8"
            >
              <Target className="mr-1 h-3 w-3" />
              Highlight
            </Button> */}

            <Button
              onClick={toggleAudioHints}
              variant={audioHintsEnabled ? "default" : "outline"}
              size="sm"
              className="h-8"
            >
              <Volume2 className="mr-1 h-3 w-3" />
              {t("hints.audio")}
            </Button>

            {audioHintsEnabled && (
              <>
                <Separator orientation="vertical" className="h-6" />
                <Button
                  onClick={playHintAudio}
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={isPlayingHintAudio}
                >
                  {isPlayingHintAudio ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      {t("hints.playing")}
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-3 w-3" />
                      {t("hints.playOrder")}
                    </>
                  )}
                </Button>
              </>
            )}
          </div>

          {/* Available Words Bank */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Plus className="text-muted-foreground h-4 w-4" />
              <p className="text-sm font-medium">
                {t("gameplay.clickWordsToAdd")}{" "}
                {!hasUserInteracted && t("gameplay.startByClickingWord")}
              </p>
            </div>

            <div className="bg-muted/30 min-h-[140px] rounded-lg border-2 border-dashed p-4">
              {availableWords.length === 0 ? (
                <div className="flex h-full min-h-[100px] items-center justify-center">
                  <p className="text-muted-foreground">
                    {t("gameplay.allWordsUsed")}{" "}
                    {selectedWords.length === currentSentence.words.length
                      ? t("gameplay.checkSentence")
                      : ""}
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {availableWords.map((word) => {
                    const shouldHighlight = shouldHighlightAvailableWord(word);

                    return (
                      <div key={word.id} className="space-y-1">
                        <button
                          onClick={() => handleWordClick(word)}
                          className={cn(
                            "group relative flex items-center gap-2 rounded-lg border-2 bg-white px-3 py-2 text-sm font-medium shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md dark:bg-gray-900",
                            "cursor-pointer select-none",
                            {
                              // Normal state
                              "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600":
                                !shouldHighlight,

                              // Next word highlighting
                              "border-blue-400 bg-blue-50 text-blue-800 shadow-md ring-2 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-200 dark:ring-blue-800":
                                shouldHighlight,
                            },
                          )}
                          disabled={isCompleted}
                        >
                          {/* <Plus className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" /> */}
                          <span>{word.text}</span>

                          {/* {word.partOfSpeech && (
                            <Badge variant="secondary" className="text-xs">
                              {word.partOfSpeech}
                            </Badge>
                          )} */}

                          {shouldHighlight && (
                            <Badge
                              variant="secondary"
                              className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            >
                              Next
                            </Badge>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Result Display */}
          {showResult && (
            <Card
              className={cn(
                "border-2",
                isCorrect
                  ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                  : "border-red-500 bg-red-50 dark:bg-red-950/20",
              )}
            >
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    {isCorrect ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600" />
                    )}
                    <h3 className="text-lg font-semibold">
                      {isCorrect
                        ? t("results.perfect")
                        : t("results.notQuiteRight")}
                    </h3>
                  </div>

                  {!isCorrect && showCorrectOrder && (
                    <div className="space-y-3">
                      <Separator />
                      <div>
                        <h4 className="mb-3 font-medium">
                          {t("results.correctOrder")}
                        </h4>
                        <p className="text-lg leading-relaxed">
                          {currentSentence.correctOrder.join(" ")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={handleRestart}
              variant="outline"
              size="sm"
              className="sm:w-auto"
            >
              {showCorrectOrder || isCompleted ? (
                <RotateCcw className="mr-2 h-4 w-4" />
              ) : (
                <Shuffle className="mr-2 h-4 w-4" />
              )}
              {showCorrectOrder || isCompleted
                ? t("buttons.tryAgain")
                : t("buttons.shuffleWords")}
            </Button>

            {!isCompleted && selectedWords.length > 0 && (
              <Button
                onClick={handleCheckAnswer}
                variant="outline"
                size="sm"
                className="sm:w-auto"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {t("buttons.checkAnswer")}
              </Button>
            )}

            {isCompleted && !isCorrect && !showCorrectOrder && (
              <Button
                onClick={handleShowAnswer}
                variant="secondary"
                size="sm"
                className="sm:w-auto"
              >
                <XCircle className="mr-2 h-4 w-4" />
                {t("buttons.showAnswer")}
              </Button>
            )}

            {isCompleted && (
              <Button onClick={handleNext} className="flex-1">
                {currentIndex < activeSentences.length - 1
                  ? t("buttons.nextSentence")
                  : t("buttons.finishGame")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
