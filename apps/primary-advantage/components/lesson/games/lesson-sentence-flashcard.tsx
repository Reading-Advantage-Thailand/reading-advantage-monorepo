"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useTransition,
  useContext,
} from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Trophy,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Eye,
  Volume2,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Zap,
  SkipForward,
  Target,
  Brain,
  Lightbulb,
  GraduationCap,
  Sparkles,
  Star,
  CheckCircle,
  BookOpen,
  AlertCircle,
  RefreshCw,
  Languages,
  RefreshCcwIcon,
  Loader2,
} from "lucide-react";
import { useLocale } from "next-intl";
import {
  Card as FsrsCard,
  Rating,
  fsrs,
  generatorParameters,
  Grade,
} from "ts-fsrs";
import { toast } from "sonner";
import AudioButton from "@/components/audio-button";
import { getLessonFlashcards } from "@/actions/flashcard";
import { ActivityType, FlashcardType, UserXpEarned } from "@/types/enum";
import {
  Select,
  SelectValue,
  SelectItem,
  SelectContent,
  SelectTrigger,
} from "@/components/ui/select";
import { SENTENCE_LANGUAGES } from "../../flashcards/deck-view";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { reviewCard } from "@/actions/flashcard";
import { QuizContext, QuizContextProvider } from "@/contexts/question-context";
import { updateUserActivity } from "@/actions/user";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";

enum GameState {
  LOADING = "LOADING",
  PLAYING = "PLAYING",
  COMPLETED = "COMPLETED",
  NO_CARDS = "NO_CARDS",
  START_GAME = "START_GAME",
  ERROR = "ERROR",
}

interface SessionStats {
  correct: number;
  incorrect: number;
  total: number;
  accuracy: number;
}

interface CompletionData {
  xpEarned: number;
  timeTaken: number;
  sessionStats: SessionStats;
  isExistingCompletion?: boolean;
  completionDate?: string;
}

interface FlashcardWord {
  id: string;
  sentence: string;
  translation: Record<string, string>;
  state: string;
  startTime?: number;
  endTime?: number;
  audioUrl?: string;
}

function LessonSentenceFlashcardCardContent({
  articleId,
}: {
  articleId: string;
}) {
  const t = useTranslations("SentenceFlashcards");
  // State management
  const [gameState, setGameState] = useState<GameState>(GameState.LOADING);
  const [words, setWords] = useState<FlashcardWord[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [completionData, setCompletionData] = useState<CompletionData | null>(
    null,
  );
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    correct: 0,
    incorrect: 0,
    total: 0,
    accuracy: 0,
  });
  const [selectedLanguage, setSelectedLanguage] = useState<string>("th");
  const [isPending, startTransition] = useTransition();
  const [completedCards, setCompletedCards] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [cardRating, setCardRating] = useState<{ [cardId: string]: Rating }>(
    {},
  );
  const { timer, setPaused } = useContext(QuizContext);
  const { data: session, update } = useSession();

  // Computed values
  const currentCard = words[currentCardIndex];

  // Utility functions
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const calculateAccuracy = (correct: number, total: number): number => {
    return total > 0 ? Math.round((correct / total) * 100) : 0;
  };

  const loadGameData = async () => {
    try {
      setGameState(GameState.LOADING);

      // Check for existing completion first
      //   await checkExistingCompletion();

      // If already completed, don't load cards
      if (gameState === GameState.COMPLETED) return;

      const response = await getLessonFlashcards(
        articleId,
        FlashcardType.SENTENCE,
      );

      setWords(response.cards as FlashcardWord[]);
      setGameState(GameState.START_GAME);
      //   setCurrentCardIndex(0);
      //   setStartTime(Date.now());
      //   setIsTimerRunning(true);
    } catch (error) {
      console.error("Error loading game data:", error);
      setGameState(GameState.ERROR);
    }
  };

  // Game logic
  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleCardRating = async (rating: Rating) => {
    if (isPending) return;

    setCardRating((prev) => ({ ...prev, [currentCard.id]: rating }));

    if (currentCardIndex < words.length - 1) {
      setCurrentCardIndex((prev) => prev + 1);
      setCompletedCards((prev) => prev + 1);

      setWords((prev) =>
        prev.map((card, index) =>
          index === currentCardIndex + 1 ? { ...card, flipped: false } : card,
        ),
      );
      setShowAnswer(false);
    } else {
      const finalCompleted = completedCards + 1;
      setCompletedCards(finalCompleted);
      setPaused(true);
      startTransition(async () => {
        try {
          const reviewPromises = Object.entries({
            ...cardRating,
            [currentCard.id]: rating,
          }).map(([cardId, cardRating]) =>
            reviewCard(cardId, cardRating as Rating),
          );

          const results = await Promise.all(reviewPromises);

          const allSuccess = results.every((r) => r.success);

          if (allSuccess) {
            setSessionComplete(true);
            await updateUserActivity(
              articleId,
              ActivityType.SENTENCE_FLASHCARDS,
              UserXpEarned.SENTENCE_FLASHCARDS,
              timer,
              {
                details: {
                  cardRating,
                },
                score: UserXpEarned.SENTENCE_FLASHCARDS,
              },
            );
            update({
              user: {
                ...session?.user,
              },
            });
          } else {
            toast.error("Failed to save ratings");
          }
        } catch (error) {
          console.error("Error rating cards:", error);
          toast.error("Failed to save ratings");
        }
      });

      setGameState(GameState.COMPLETED);
    }
  };

  // Initialize game on mount
  useEffect(() => {
    loadGameData();
  }, []);

  // Force render completion if we have completion data (for debugging)
  const shouldShowCompletion =
    gameState === GameState.COMPLETED ||
    (completionData && completionData.isExistingCompletion);

  if (shouldShowCompletion) {
    // Create default completion data if missing
    const safeCompletionData = completionData || {
      xpEarned: 20,
      timeTaken: 0,
      sessionStats: { correct: 0, incorrect: 0, total: 0, accuracy: 0 },
      isExistingCompletion: true,
      completionDate: new Date().toISOString(),
    };

    return (
      <div className="space-y-6">
        <Card className="overflow-hidden border-emerald-200 bg-gradient-to-br from-emerald-50 via-emerald-50 to-emerald-100 pb-14 dark:border-emerald-800 dark:from-emerald-950/20 dark:via-emerald-950/20 dark:to-emerald-950/30">
          <CardContent className="p-8 text-center">
            <div className="space-y-6">
              {/* Trophy and celebration */}
              <div className="space-y-4">
                <div className="relative">
                  <Trophy className="mx-auto h-20 w-20 text-yellow-500 drop-shadow-lg" />
                  <div className="absolute -top-2 -right-2">
                    <Sparkles className="h-8 w-8 animate-pulse text-yellow-400" />
                  </div>
                  <div className="absolute -bottom-2 -left-2">
                    <Star className="h-6 w-6 animate-pulse text-yellow-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-3xl font-bold text-transparent">
                    {t("complete.title")}
                  </h2>
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    {t("complete.subtitle")}
                  </p>
                </div>
              </div>

              <Separator className="bg-emerald-200 dark:bg-emerald-800" />

              {/* Stats Grid */}
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {UserXpEarned.SENTENCE_FLASHCARDS}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t("complete.xpEarned")}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {formatTime(timer)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t("complete.timeTaken")}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {completedCards}/{words.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t("complete.completedLabel")}
                  </div>
                </div>
              </div>

              <Separator className="bg-emerald-200 dark:bg-emerald-800" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render loading state
  if (gameState === GameState.LOADING) {
    return (
      <div className="space-y-6">
        <Card className="overflow-hidden border-gray-200 dark:border-gray-800">
          <CardContent className="p-8">
            <div className="flex min-h-[400px] flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600 dark:border-emerald-800 dark:border-t-emerald-400"></div>
                <GraduationCap className="absolute inset-0 m-auto h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="space-y-2 text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t("loading.title")}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {t("loading.subtitle")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render error state
  if (gameState === GameState.ERROR) {
    return (
      <div className="space-y-6">
        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="p-8 text-center">
            <div className="space-y-6">
              <AlertTriangle className="mx-auto h-16 w-16 text-red-500" />
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {t("error.title")}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {t("error.description")}
                </p>
              </div>
              <Button onClick={loadGameData} size="lg" variant="outline">
                <RotateCcw className="mr-2 h-4 w-4" />
                {t("error.retry")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render no current card state
  if (!currentCard) {
    return (
      <div className="space-y-6">
        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="p-8 text-center">
            <div className="space-y-6">
              <AlertTriangle className="mx-auto h-12 w-12 text-orange-500" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t("empty.title")}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {t("empty.description")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate progress
  const progress = (currentCardIndex / words.length) * 100;

  const languageOptions = SENTENCE_LANGUAGES;

  if (gameState === GameState.START_GAME) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="space-y-6">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/20">
                <GraduationCap className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">{t("start.title")}</h3>
                <p>{t("start.subtitle")}</p>
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="w-full max-w-md space-y-4">
                    <div className="flex items-center justify-center gap-2">
                      <Languages className="h-5 w-5 text-indigo-500" />
                      <Label className="text-base font-semibold">
                        {t("start.language")}
                      </Label>
                    </div>
                    <Select
                      value={selectedLanguage}
                      onValueChange={(value) => {
                        setSelectedLanguage(value);
                      }}
                    >
                      <SelectTrigger className="h-12 w-full">
                        <SelectValue>
                          {selectedLanguage && (
                            <div className="flex items-center gap-3">
                              <span className="text-lg">
                                {
                                  languageOptions[
                                    selectedLanguage as keyof typeof languageOptions
                                  ]?.flag
                                }
                              </span>
                              <div className="flex flex-col text-left">
                                <span className="font-medium">
                                  {
                                    languageOptions[
                                      selectedLanguage as keyof typeof languageOptions
                                    ]?.name
                                  }
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  {
                                    languageOptions[
                                      selectedLanguage as keyof typeof languageOptions
                                    ]?.nativeName
                                  }
                                </span>
                              </div>
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(languageOptions).map((language) => (
                          <SelectItem key={language.code} value={language.code}>
                            <div className="flex items-center gap-3">
                              <span className="text-lg">{language.flag}</span>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {language.name}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  {language.nativeName}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-muted-foreground text-xs">
                      {t("start.languageNote")}
                    </p>
                  </div>
                  <Button onClick={() => setGameState(GameState.PLAYING)}>
                    {t("start.startButton")}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render playing state
  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold text-emerald-800 dark:text-emerald-200">
                {t("header.title")}
              </CardTitle>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                {t("header.progress", {
                  current: currentCardIndex + 1,
                  total: words.length,
                })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="flex items-center gap-2 border-emerald-200 bg-white px-3 py-1 dark:border-emerald-800 dark:bg-gray-900"
              >
                <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-mono text-emerald-800 dark:text-emerald-200">
                  {formatTime(timer)}
                </span>
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <Progress value={progress} className="h-3" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-emerald-700 dark:text-emerald-300">
                {t("header.progressLabel")}
              </span>
              <span className="font-medium text-emerald-800 dark:text-emerald-200">
                {t("header.percentComplete", { percent: Math.round(progress) })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Card */}
      <Card className="min-h-[500px] border-gray-200 shadow-lg dark:border-gray-800">
        <CardContent className="p-8">
          <div className="space-y-8">
            {/* Card Type Indicators */}
            <div className="flex items-center justify-between">
              <Badge
                variant="default"
                className="bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <GraduationCap className="mr-2 h-4 w-4" />
                {t("badge.typeSentence")}
              </Badge>
              <Badge
                variant="outline"
                className="border-gray-300 px-3 py-1 dark:border-gray-600"
              >
                {currentCard.state === "NEW" && (
                  <>
                    <Lightbulb className="mr-2 h-4 w-4 text-yellow-500" />
                    {t("badge.new")}
                  </>
                )}

                {currentCard.state === "LEARNING" && (
                  <>
                    <Brain className="mr-2 h-4 w-4 text-blue-500" />
                    {t("badge.learning")}
                  </>
                )}
                {currentCard.state === "REVIEW" && (
                  <>
                    <Target className="mr-2 h-4 w-4 text-green-500" />
                    {t("badge.review")}
                  </>
                )}
                {currentCard.state === "RELEARNING" && (
                  <>
                    <RefreshCcwIcon className="mr-2 h-4 w-4 text-green-500" />
                    {t("badge.relearning")}
                  </>
                )}
              </Badge>
            </div>

            {/* Question Side */}
            <div className="space-y-6 text-center">
              <div className="space-y-4">
                <h2 className="text-5xl font-bold text-emerald-700 drop-shadow-sm dark:text-emerald-300">
                  {currentCard.sentence}
                </h2>
                <div className="flex justify-center gap-3">
                  {currentCard.audioUrl && (
                    <AudioButton
                      audioUrl={currentCard.audioUrl}
                      startTimestamp={currentCard.startTime || 0}
                      endTimestamp={currentCard.endTime || 0}
                    />
                  )}
                </div>
              </div>
            </div>

            <Separator className="my-8 bg-gray-200 dark:bg-gray-800" />

            {/* Answer Side */}
            {showAnswer ? (
              <div className="space-y-8">
                <div className="space-y-6 text-center">
                  <h3 className="text-3xl font-medium text-gray-700 dark:text-gray-300">
                    {currentCard.translation[selectedLanguage]}
                  </h3>
                </div>

                {/* Rating Buttons */}
                <div className="space-y-6">
                  <div className="text-center">
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                      {t("rating.prompt")}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <Button
                      onClick={() => handleCardRating(Rating.Again)}
                      disabled={isPending}
                      variant="outline"
                      className="h-20 flex-col border-red-200 transition-all duration-200 hover:border-red-300 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20"
                    >
                      <ThumbsDown className="mb-2 h-6 w-6 text-red-500" />
                      <span className="text-sm font-medium">
                        {t("rating.again")}
                      </span>
                    </Button>
                    <Button
                      onClick={() => handleCardRating(Rating.Hard)}
                      disabled={isPending}
                      variant="outline"
                      className="h-20 flex-col border-orange-200 transition-all duration-200 hover:border-orange-300 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-950/20"
                    >
                      <AlertTriangle className="mb-2 h-6 w-6 text-orange-500" />
                      <span className="text-sm font-medium">
                        {t("rating.hard")}
                      </span>
                    </Button>
                    <Button
                      onClick={() => handleCardRating(Rating.Good)}
                      disabled={isPending}
                      variant="outline"
                      className="h-20 flex-col border-green-200 transition-all duration-200 hover:border-green-300 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950/20"
                    >
                      <ThumbsUp className="mb-2 h-6 w-6 text-green-500" />
                      <span className="text-sm font-medium">
                        {t("rating.good")}
                      </span>
                    </Button>
                    <Button
                      onClick={() => handleCardRating(Rating.Easy)}
                      disabled={isPending}
                      variant="outline"
                      className="h-20 flex-col border-blue-200 transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950/20"
                    >
                      <Zap className="mb-2 h-6 w-6 text-blue-500" />
                      <span className="text-sm font-medium">
                        {t("rating.easy")}
                      </span>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8 text-center">
                <div className="space-y-6">
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    {t("prompt.thinkAndReveal")}
                  </p>
                  <Button
                    onClick={handleShowAnswer}
                    size="lg"
                    className="h-16 bg-gradient-to-r from-emerald-600 to-emerald-700 px-12 text-lg text-white shadow-lg hover:from-emerald-700 hover:to-emerald-800"
                  >
                    <Eye className="mr-3 h-6 w-6" />
                    {t("buttons.showAnswer")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Session Statistics */}
      <Card className="border-gray-200 dark:border-gray-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("stats.completed", { count: completedCards })}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("stats.remaining", {
                    count: words.length - completedCards - 1,
                  })}
                </span>
              </div>
            </div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t("stats.total", { count: words.length })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LessonSentenceFlashcardGame({
  articleId,
}: {
  articleId: string;
}) {
  return (
    <QuizContextProvider>
      <LessonSentenceFlashcardCardContent articleId={articleId} />
    </QuizContextProvider>
  );
}
