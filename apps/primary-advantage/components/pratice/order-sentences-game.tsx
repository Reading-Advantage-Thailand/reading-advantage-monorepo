"use client";
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Header } from "../header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle,
  XCircle,
  Trophy,
  Shuffle,
  Play,
  GripVertical,
  Clock,
  Target,
  Zap,
  Loader2,
  Volume2,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";

interface OrderSentenceData {
  id: string;
  articleId: string;
  articleTitle: string;
  flashcardSentence: string;
  correctOrder: string[];
  sentences: Array<{
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
    isFromFlashcard?: boolean;
  }>;
  difficulty: "easy" | "medium" | "hard";
  startIndex: number;
  flashcardIndex: number;
}

interface OrderSentenceGameProps {
  deckId?: string;
  sentences?: OrderSentenceData[];
}

interface DraggableSentence {
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
  isFromFlashcard?: boolean;
}

export function OrderSentenceGame({
  deckId,
  sentences = [],
}: OrderSentenceGameProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userOrder, setUserOrder] = useState<DraggableSentence[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [draggedItem, setDraggedItem] = useState<DraggableSentence | null>(
    null,
  );
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Add flag to track if user has made any moves
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isPlayingHintAudio, setIsPlayingHintAudio] = useState(false);
  const [showCorrectOrder, setShowCorrectOrder] = useState(false);

  const [highlightHintsEnabled, setHighlightHintsEnabled] = useState(false);
  const [audioHintsEnabled, setAudioHintsEnabled] = useState(false);
  const t = useTranslations("SentencesPage.sentenceOrder");
  const { data: session, update } = useSession();

  const [activeSentences, setActiveSentences] =
    useState<OrderSentenceData[]>(sentences);

  useEffect(() => {
    if (deckId && sentences.length === 0) {
      loadSentencesFromDeck();
    }
  }, [deckId]);

  const loadSentencesFromDeck = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/flashcard/decks/${deckId}/sentences-for-ordering`,
      );
      if (response.ok) {
        const data = await response.json();
        setActiveSentences(data.sentenceGroups || []);
      } else {
        toast.error("Failed to load sentences from flashcard deck");
      }
    } catch (error) {
      console.error("Error loading sentences:", error);
      toast.error("Failed to load sentences");
    } finally {
      setIsLoading(false);
    }
  };

  const currentSentenceGroup = useMemo(
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

  // Fixed shuffle sentences function
  const shuffleSentences = useCallback(
    (sentences: typeof currentSentenceGroup.sentences) => {
      // Create a copy of the sentences array
      const sentencesToShuffle = [...sentences];

      // Fisher-Yates shuffle algorithm for better randomization
      for (let i = sentencesToShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sentencesToShuffle[i], sentencesToShuffle[j]] = [
          sentencesToShuffle[j],
          sentencesToShuffle[i],
        ];
      }

      // Map to draggable format with unique IDs
      return sentencesToShuffle.map((sentence, index) => ({
        id: `${sentence.id}-shuffled-${Date.now()}-${index}`,
        text: sentence.text,
        originalIndex: sentences.findIndex((s) => s.id === sentence.id),
        translation: sentence.translation,
        audioUrl: sentence.audioUrl,
        startTime: sentence.startTime,
        endTime: sentence.endTime,
        isFromFlashcard: sentence.isFromFlashcard,
      }));
    },
    [],
  );

  // Initialize shuffled sentences when sentence group changes
  useEffect(() => {
    if (currentSentenceGroup?.sentences) {
      setUserOrder(shuffleSentences(currentSentenceGroup.sentences));
      setShowResult(false);
      setIsCompleted(false);
      setHasUserInteracted(false); // Reset interaction flag
      setShowCorrectOrder(false); // Reset correct order visibility
    }
  }, [currentSentenceGroup?.id, shuffleSentences]);

  // Check answer when order changes - Only if user has interacted
  useEffect(() => {
    if (!currentSentenceGroup?.correctOrder || userOrder.length === 0) return;

    // Only auto-complete if:
    // 1. User has all sentences placed
    // 2. Game is not already completed
    // 3. User has actually interacted with the game (dragged something)
    if (
      userOrder.length === currentSentenceGroup.sentences.length &&
      !isCompleted &&
      hasUserInteracted // Only check if user has made a move
    ) {
      const userSentenceOrder = userOrder.map((item) => item.text);
      const isCorrect =
        JSON.stringify(userSentenceOrder) ===
        JSON.stringify(currentSentenceGroup.correctOrder);

      if (isCorrect) {
        setIsCompleted(true);
        setShowResult(true);
        setScore((prev) => prev + 1);
        toast.success("Perfect! Correct sentence order! 🎉");
      }
    }
  }, [
    userOrder,
    currentSentenceGroup?.correctOrder,
    isCompleted,
    hasUserInteracted,
  ]);

  // Drag handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, item: DraggableSentence) => {
      setDraggedItem(item);
      e.dataTransfer.effectAllowed = "move";
    },
    [],
  );

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      if (!draggedItem) return;

      const dragIndex = userOrder.findIndex(
        (item) => item.id === draggedItem.id,
      );
      if (dragIndex === dropIndex) {
        setDragOverIndex(null);
        return;
      }

      const newOrder = [...userOrder];
      const [removed] = newOrder.splice(dragIndex, 1);
      newOrder.splice(dropIndex, 0, removed);

      setUserOrder(newOrder);
      setDraggedItem(null);
      setDragOverIndex(null);

      // Mark that user has interacted
      setHasUserInteracted(true);
    },
    [draggedItem, userOrder],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDragOverIndex(null);
  }, []);

  const handleStartGame = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handleNext = useCallback(async () => {
    if (currentIndex < activeSentences.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setGameComplete(true);
      await fetch(`/api/flashcard/decks/${deckId}/sentences-for-ordering`, {
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
  }, [currentIndex, activeSentences.length]);

  const handleRestart = useCallback(() => {
    if (currentSentenceGroup?.sentences) {
      setUserOrder(shuffleSentences(currentSentenceGroup.sentences));
      setShowResult(false);
      setIsCompleted(false);
      setHasUserInteracted(false);
      setShowCorrectOrder(false);
      setHighlightHintsEnabled(false);
      setAudioHintsEnabled(false);
    }
  }, [currentSentenceGroup?.sentences, shuffleSentences]);

  const handleCheckAnswer = useCallback(() => {
    if (!currentSentenceGroup?.correctOrder || userOrder.length === 0) return;

    const userSentenceOrder = userOrder.map((item) => item.text);
    const isCorrect =
      JSON.stringify(userSentenceOrder) ===
      JSON.stringify(currentSentenceGroup.correctOrder);

    setIsCompleted(true);
    setShowResult(true);
    setHasUserInteracted(true); // Mark as interacted when manually checking

    if (isCorrect) {
      setScore((prev) => prev + 1);
      toast.success("Perfect! Correct sentence order! 🎉");
    } else {
      toast.error("Not quite right. Try again! 💪");
    }
  }, [userOrder, currentSentenceGroup?.correctOrder]);

  const handleRestartGame = useCallback(() => {
    setCurrentIndex(0);
    setScore(0);
    setTimer(0);
    setGameComplete(false);
    setIsPlaying(false);
    setHasUserInteracted(false); // Reset interaction flag for new game
  }, []);

  const handleShowAnswer = useCallback(() => {
    setShowCorrectOrder(true);
    toast.info("Correct order revealed! 📖");
  }, []);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // const handleLanguageChange = (value: string) => {
  //   setSelectedLanguage(value);
  //   const language =
  //     AVAILABLE_LANGUAGES[value as keyof typeof AVAILABLE_LANGUAGES];
  //   toast.success(`Translation language changed to ${language.name}`);
  // };

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
    const userSentenceOrder = userOrder.map((item) => item.text);
    return (
      JSON.stringify(userSentenceOrder) ===
      JSON.stringify(currentSentenceGroup?.correctOrder || [])
    );
  }, [userOrder, currentSentenceGroup?.correctOrder]);

  const isInCorrectPosition = useCallback(
    (sentence: DraggableSentence, currentIndex: number) => {
      if (!currentSentenceGroup?.correctOrder || !highlightHintsEnabled)
        return false;
      return currentSentenceGroup.correctOrder[currentIndex] === sentence.text;
    },
    [currentSentenceGroup?.correctOrder, highlightHintsEnabled],
  );

  const toggleHighlightHints = useCallback(() => {
    setHighlightHintsEnabled((prev) => {
      const newState = !prev;

      return newState;
    });
  }, []);

  const toggleAudioHints = useCallback(() => {
    setAudioHintsEnabled((prev) => {
      const newState = !prev;

      return newState;
    });
  }, []);

  // Play continuous audio from first to last correct sentence
  const playHintAudio = useCallback(async () => {
    if (
      !currentSentenceGroup?.sentences ||
      isPlayingHintAudio ||
      !audioRef.current
    )
      return;

    setIsPlayingHintAudio(true);
    toast.success("Playing correct order audio sequence 🔊");

    try {
      const audio = audioRef.current;

      // Get sentences in correct order
      const correctOrderSentences = currentSentenceGroup.correctOrder
        .map((sentenceText) =>
          currentSentenceGroup.sentences.find((s) => s.text === sentenceText),
        )
        .filter(Boolean);

      if (correctOrderSentences.length === 0) {
        toast.error("No sentences found for audio playback");
        return;
      }

      // Get the first sentence's start time and last sentence's end time
      const firstSentence = correctOrderSentences[0];
      const lastSentence =
        correctOrderSentences[correctOrderSentences.length - 1];

      // Check if we have valid audio data
      if (
        !firstSentence?.audioUrl ||
        firstSentence.startTime === undefined ||
        lastSentence?.endTime === undefined
      ) {
        toast.error("Audio data not available for playback");
        return;
      }

      // Play continuous audio from start of first sentence to end of last sentence
      await new Promise<void>((resolve) => {
        let intervalRef: NodeJS.Timeout | null = null;

        const cleanup = () => {
          if (intervalRef) {
            clearInterval(intervalRef);
            intervalRef = null;
          }
          audio.removeEventListener("canplaythrough", handleCanPlay);
          audio.removeEventListener("error", handleError);
        };

        const handleCanPlay = () => {
          audio.removeEventListener("canplaythrough", handleCanPlay);

          // Set start time to the beginning of the first sentence
          audio.currentTime = firstSentence.startTime! - 0.05;

          audio
            .play()
            .then(() => {
              const tolerance = 0.0005;
              intervalRef = setInterval(() => {
                // Stop at the end of the last sentence
                if (audio.currentTime + tolerance >= lastSentence.endTime!) {
                  audio.pause();
                  cleanup();
                  resolve(void 0);
                }
              }, 50);
            })
            .catch(() => {
              cleanup();
              resolve();
            });
        };

        const handleError = () => {
          cleanup();
          resolve();
        };

        audio.addEventListener("canplaythrough", handleCanPlay);
        audio.addEventListener("error", handleError);

        audio.src = firstSentence.audioUrl!;
        audio.load();

        // Fallback timeout
        setTimeout(() => {
          cleanup();
          resolve();
        }, 10000);
      });

      toast.success("Audio sequence completed! 🎵");
    } catch (error) {
      console.error("Error playing hint audio:", error);
      toast.error("Failed to play hint audio");
    } finally {
      setIsPlayingHintAudio(false);
    }
  }, [currentSentenceGroup, isPlayingHintAudio]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{t("loading")}</h3>
            <p className="text-muted-foreground text-sm">
              {t("fetchingSentences")}
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
              🎉 {t("completedTitle")}
            </h1>
            <p className="text-muted-foreground text-xl">
              {t("completedDescription", { count: activeSentences.length })}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-6 md:grid-cols-3">
            <Card className="relative overflow-hidden">
              <CardContent className="p-6 text-center">
                <Target className="mx-auto mb-3 h-8 w-8 text-blue-500" />
                <div className="text-3xl font-bold text-blue-600">{score}</div>
                <p className="text-muted-foreground text-sm">{t("correct")}</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardContent className="p-6 text-center">
                <Zap className="mx-auto mb-3 h-8 w-8 text-green-500" />
                <div className="text-3xl font-bold text-green-600">
                  {accuracy}%
                </div>
                <p className="text-muted-foreground text-sm">{t("accuracy")}</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardContent className="p-6 text-center">
                <Clock className="mx-auto mb-3 h-8 w-8 text-purple-500" />
                <div className="text-3xl font-bold text-purple-600">
                  {formatTime(timer)}
                </div>
                <p className="text-muted-foreground text-sm">
                  {t("totalTime")}
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
        <Header heading={t("title")} text={t("description")} />

        <Card className="mx-auto max-w-2xl">
          <CardHeader className="pb-6 text-center">
            <CardTitle className="text-2xl">{t("readyToStart")}</CardTitle>
            <p className="text-muted-foreground">{t("arrangeSentences")}</p>
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
                <p className="text-sm font-medium">{t("sentences")}</p>
                <p className="text-muted-foreground text-xs">
                  {t("readyToPlay")}
                </p>
              </div>

              <div className="space-y-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                  <GripVertical className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm font-medium">{t("dragAndDrop")}</p>
                <p className="text-muted-foreground text-xs">
                  {t("easyInteraction")}
                </p>
              </div>

              <div className="space-y-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <p className="text-sm font-medium">
                  {t("playtime", { time: 15 })}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("estimatedTime")}
                </p>
              </div>
            </div>

            <Separator />

            {/* Game Instructions */}
            <div className="bg-muted/50 space-y-3 rounded-lg p-6">
              <div className="flex items-center gap-2">
                <div className="bg-primary h-2 w-2 rounded-full" />
                <p className="text-sm font-medium">{t("howToPlay")}</p>
              </div>
              <ul className="text-muted-foreground ml-4 space-y-2 text-sm">
                <li>• {t("eachGameShows")}</li>
                <li>• {t("dragSentences")}</li>
                <li>• {t("completeAll")}</li>
              </ul>
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
                ? t("noSentencesAvailable")
                : t("startGame")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentSentenceGroup) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">{t("loadingNextChallenge")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-4 px-4">
      <Header heading={t("title")} text={t("descriptionPlaying")} />

      {/* Hidden audio element for playback */}
      <audio ref={audioRef} style={{ display: "none" }} />

      {/* Minimal Progress Bar */}
      <div className="space-y-2">
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <span>
            {currentIndex + 1} of {activeSentences.length}
          </span>
          <div className="flex items-center gap-4">
            <span>
              {score}/{activeSentences.length} correct
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
                📖 {currentSentenceGroup.articleTitle}
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                {t("descriptionPlaying2")}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Hint Controls */}

          <div className="bg-muted/30 flex flex-wrap items-center gap-3 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">{t("hints.title")}:</span>
            </div>

            {/* Highlight Toggle */}
            <div className="flex items-center gap-2">
              <Button
                onClick={toggleHighlightHints}
                variant={highlightHintsEnabled ? "default" : "outline"}
                size="sm"
                className="h-8"
              >
                <Target className="mr-1 h-3 w-3" />
                {t("hints.highlight")}
              </Button>
            </div>

            {/* Audio Toggle */}
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

            {/* Audio Play Button - Only show when audio hints are enabled */}
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

          {/* Drag and Drop Area */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <GripVertical className="text-muted-foreground h-4 w-4" />
              <p className="text-sm font-medium">
                {t("hints.dragToReorder")}{" "}
                {!hasUserInteracted && `(${t("hints.startByMovingASentence")})`}
              </p>
            </div>

            <div className="border-muted-foreground/25 bg-muted/30 min-h-[400px] rounded-lg border-2 border-dashed p-4">
              {userOrder.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground">
                    {t("hints.sentencesWillAppearHere")}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userOrder.map((item, index) => {
                    const isInCorrectPos = isInCorrectPosition(item, index);

                    return (
                      <div
                        key={item.id}
                        draggable={!isCompleted}
                        onDragStart={(e) => handleDragStart(e, item)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "group relative rounded-lg border-2 p-4 transition-all duration-200",
                          "cursor-move select-none",
                          {
                            // Normal state
                            "border-border bg-card hover:bg-muted/50":
                              dragOverIndex !== index &&
                              draggedItem?.id !== item.id &&
                              !isInCorrectPos,

                            // Hint: Correct position highlighting
                            "border-green-400 bg-green-50 shadow-md ring-2 ring-green-200 dark:bg-green-950/30 dark:ring-green-800":
                              // hintsEnabled && isInCorrectPos && !isCompleted,
                              highlightHintsEnabled &&
                              isInCorrectPos &&
                              !isCompleted,

                            // Drag over state
                            "border-primary bg-primary/5 scale-[1.02] shadow-md":
                              dragOverIndex === index,

                            // Being dragged
                            "scale-95 rotate-2 opacity-60":
                              draggedItem?.id === item.id,

                            // Completed states
                            "border-green-500 bg-green-50 dark:bg-green-950/20":
                              isCompleted && isCorrect,
                            "border-red-500 bg-red-50 dark:bg-red-950/20":
                              isCompleted && !isCorrect,
                          },
                        )}
                      >
                        <div className="flex items-center justify-center gap-3">
                          <div className="flex items-center gap-2 pt-1">
                            <GripVertical className="text-muted-foreground group-hover:text-foreground h-4 w-4 transition-colors" />
                            <div
                              className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                                {
                                  "bg-green-500 text-white":
                                    highlightHintsEnabled &&
                                    isInCorrectPos &&
                                    !isCompleted,
                                  "bg-muted":
                                    !highlightHintsEnabled ||
                                    !isInCorrectPos ||
                                    isCompleted,
                                },
                              )}
                            >
                              {index + 1}
                            </div>
                          </div>

                          <div className="flex-1 justify-center space-y-3">
                            <div className="flex items-center gap-2">
                              <p className="flex-1 text-sm leading-relaxed font-medium md:text-xl">
                                {item.text}
                              </p>
                              {highlightHintsEnabled &&
                                isInCorrectPos &&
                                !isCompleted && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  >
                                    ✓ {t("correctAnswer")}
                                  </Badge>
                                )}
                            </div>
                          </div>
                        </div>
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
                        ? t("perfectCorrectOrder")
                        : t("notQuiteRight")}
                    </h3>
                  </div>

                  {!isCorrect && showCorrectOrder && (
                    <div className="space-y-3">
                      <Separator />
                      <div>
                        <h4 className="mb-3 font-medium">
                          {t("correctOrder")}:
                        </h4>
                        <div className="space-y-2">
                          {currentSentenceGroup.correctOrder.map(
                            (sentence, index) => (
                              <div key={index} className="flex gap-3 text-sm">
                                <span className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold">
                                  {index + 1}
                                </span>
                                <p className="flex-1">{sentence}</p>
                              </div>
                            ),
                          )}
                        </div>
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
                ? t("playAgain")
                : t("shuffleAgain")}
            </Button>

            {!isCompleted && (
              <Button
                onClick={handleCheckAnswer}
                variant="outline"
                size="sm"
                className="sm:w-auto"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {t("checkAnswer")}
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
                {t("showAnswer")}
              </Button>
            )}

            {isCompleted && (
              <Button onClick={handleNext} className="flex-1">
                {currentIndex < activeSentences.length - 1
                  ? t("nextSentence")
                  : t("finishGame")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
