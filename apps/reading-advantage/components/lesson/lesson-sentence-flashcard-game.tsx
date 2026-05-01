"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AUDIO_URL } from "@/server/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Trophy,
  Eye,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Target,
  Brain,
  Sparkles,
  RefreshCw,
  GraduationCap,
  CheckCircle,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Lightbulb,
  Zap,
  SkipForward,
} from "lucide-react";
import { useLocale } from "next-intl";
import { Card as FsrsCard, Rating, fsrs, generatorParameters } from "ts-fsrs";
import { toast } from "sonner";
import AudioButton from "@/components/audio-button";
import {
  UserXpEarned,
  ActivityStatus,
  ActivityType,
} from "@/components/models/user-activity-log-model";
import { levelCalculation } from "@/lib/utils";

// FSRS Configuration
const f = fsrs(generatorParameters({ enable_fuzz: true }));

enum GameState {
  LOADING = "LOADING",
  PLAYING = "PLAYING",
  COMPLETED = "COMPLETED",
  NO_CARDS = "NO_CARDS",
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
}

interface FlashcardSentence {
  id: string;
  sentence: string;
  translation: Record<string, string>;
  sn?: number;
  timepoint?: number;
  endTimepoint?: number;
  audioUrl?: string;
}

interface Sentence extends FsrsCard {
  id: string;
  sentence: FlashcardSentence;
  articleId: string;
}

interface LessonSentenceFlashcardGameProps {
  articleId: string;
  userId: string;
  onCompleteChange: (complete: boolean) => void;
}

export default function LessonSentenceFlashcardGame({
  articleId,
  userId,
  onCompleteChange,
}: LessonSentenceFlashcardGameProps) {
  // State management
  const [gameState, setGameState] = useState<GameState>(GameState.LOADING);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  // Hooks
  const currentLocale = useLocale();

  // Computed values
  const currentCard = sentences[currentCardIndex];

  // Utility functions
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const calculateAccuracy = (correct: number, total: number): number => {
    return total > 0 ? Math.round((correct / total) * 100) : 0;
  };

  const getTotalElapsedTime = (): number => {
    if (!startTime) return 0;
    return Math.floor((Date.now() - startTime) / 1000);
  };

  const updateSessionStats = (isCorrect: boolean) => {
    setSessionStats((prev) => {
      const newCorrect = prev.correct + (isCorrect ? 1 : 0);
      const newIncorrect = prev.incorrect + (isCorrect ? 0 : 1);
      const newTotal = newCorrect + newIncorrect;
      return {
        correct: newCorrect,
        incorrect: newIncorrect,
        total: newTotal,
        accuracy: calculateAccuracy(newCorrect, newTotal),
      };
    });
  };

  // Timer effect
  useEffect(() => {
    if (!isTimerRunning || !startTime) return;

    const timer = setInterval(() => {
      const currentElapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(currentElapsed);
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerRunning, startTime]);

  // Timer management functions
  const toggleTimer = () => setIsTimerRunning((prev) => !prev);

  const resetTimer = () => {
    const now = Date.now();
    setStartTime(now);
    setElapsedTime(0);
    setIsTimerRunning(true);
  };

  // Load game data
  const loadGameData = useCallback(async () => {
    try {
      setGameState(GameState.LOADING);
      const response = await fetch(`/api/v1/lesson/sentences/${articleId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Check if already completed
      if (data.isCompleted && data.completionData) {
        const completionData: CompletionData = {
          xpEarned: data.completionData.xpEarned,
          timeTaken: data.completionData.timeTaken,
          sessionStats: {
            correct: data.completionData.details?.correct || 0,
            incorrect: data.completionData.details?.incorrect || 0,
            total: data.completionData.details?.total || 0,
            accuracy: data.completionData.details?.accuracy || 0,
          },
        };

        setCompletionData(completionData);
        setGameState(GameState.COMPLETED);
        onCompleteChange(true);
        return;
      }

      if (data.flashcards && data.flashcards.length > 0) {
        const transformedSentences: Sentence[] = data.flashcards.map(
          (item: any) => ({
            id: item.id,
            sentence: {
              id: item.id,
              sentence: item.sentence,
              translation: item.translation || {},
              sn: item.sn,
              timepoint: item.timepoint,
              endTimepoint: item.endTimepoint,
              audioUrl: item.audioUrl
                ? `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/${AUDIO_URL}/${item.audioUrl}`
                : undefined,
            },
            articleId: item.articleId,
            // FSRS properties
            due: new Date(item.due),
            stability: item.stability || 0,
            difficulty: item.difficulty || 0,
            elapsed_days: item.elapsed_days || 0,
            scheduled_days: item.scheduled_days || 0,
            reps: item.reps || 0,
            lapses: item.lapses || 0,
            state: item.state || 0,
            last_review: item.last_review
              ? new Date(item.last_review)
              : undefined,
          }),
        );

        // Use all cards, not just due cards
        setSentences(transformedSentences);
        setGameState(GameState.PLAYING);
        const gameStartTime = Date.now();
        setStartTime(gameStartTime);
        setIsTimerRunning(true);
        console.log("Game started:", {
          gameStartTime,
          cardsCount: transformedSentences.length,
        });
      } else {
        setGameState(GameState.NO_CARDS);
        onCompleteChange(true);
      }
    } catch (error) {
      console.error("Error fetching sentences:", error);
      setGameState(GameState.ERROR);
      toast.error("Failed to load flashcards");
    }
  }, [articleId, onCompleteChange]);

  // Initial load
  useEffect(() => {
    if (articleId) {
      loadGameData();
    }
  }, [articleId, loadGameData]);

  // Remove duplicate fetchSentences and useEffect with hasInitializedRef

  // Handle rating submission
  const handleRating = async (rating: Rating) => {
    if (!currentCard || isSubmitting) return;

    setIsSubmitting(true);
    const isCorrect = rating >= Rating.Good;

    try {
      // Calculate new FSRS values
      const schedulingCards = f.repeat(currentCard, new Date());
      let updatedCard;

      switch (rating) {
        case Rating.Again:
          updatedCard = schedulingCards[Rating.Again].card;
          break;
        case Rating.Hard:
          updatedCard = schedulingCards[Rating.Hard].card;
          break;
        case Rating.Good:
          updatedCard = schedulingCards[Rating.Good].card;
          break;
        case Rating.Easy:
          updatedCard = schedulingCards[Rating.Easy].card;
          break;
        default:
          updatedCard = schedulingCards[Rating.Good].card;
      }

      // Update session stats
      updateSessionStats(isCorrect);

      // Update card in database
      await fetch(`/api/v1/lesson/sentences/update/${currentCard.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          due: updatedCard.due.toISOString(),
          stability: updatedCard.stability,
          difficulty: updatedCard.difficulty,
          elapsed_days: updatedCard.elapsed_days,
          scheduled_days: updatedCard.scheduled_days,
          reps: updatedCard.reps,
          lapses: updatedCard.lapses,
          state: updatedCard.state,
        }),
      });

      // Move to next card or complete session
      const nextIndex = currentCardIndex + 1;
      if (nextIndex >= sentences.length) {
        await completeSession();
      } else {
        setCurrentCardIndex(nextIndex);
        setShowAnswer(false);
      }
    } catch (error) {
      console.error("Error updating card:", error);
      toast.error("Failed to update card progress");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Complete the session
  const completeSession = async () => {
    try {
      // Calculate total time before stopping the timer
      const totalTime = getTotalElapsedTime();
      console.log("Session completion:", {
        startTime,
        currentTime: Date.now(),
        elapsedTime,
        totalTime,
        isTimerRunning,
      });
      setGameState(GameState.COMPLETED);
      setIsTimerRunning(false);
      const xpEarned = UserXpEarned.Lesson_Sentence_Flashcards;

      // Log activity
      await fetch(`/api/v1/users/${userId}/activitylog`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          articleId: articleId,
          activityType: ActivityType.LessonSentenceFlashcards,
          activityStatus: ActivityStatus.Completed,
          xpEarned: xpEarned,
          details: {
            completedCards: sentences.length,
            accuracy: sessionStats.accuracy,
            timeTaken: totalTime,
            cefr_level: levelCalculation(xpEarned).cefrLevel,
          },
        }),
      });

      setCompletionData({
        xpEarned,
        timeTaken: totalTime,
        sessionStats: {
          ...sessionStats,
          total: sentences.length,
        },
      });

      toast.success(`Great job! You earned ${xpEarned} XP!`);
      setTimeout(() => onCompleteChange(true), 1000);
    } catch (error) {
      console.error("Error completing session:", error);
      toast.error("Failed to save session progress");
    }
  };

  // Get translation in current locale
  const getCurrentTranslation = () => {
    if (!currentCard?.sentence.translation) return "Translation not available";

    const localeMap: Record<string, string> = {
      en: "en",
      th: "th",
      "zh-CN": "cn",
      "zh-TW": "tw",
      vi: "vi",
    };

    const mappedLocale = localeMap[currentLocale] || "en";
    return (
      currentCard.sentence.translation[mappedLocale] ||
      currentCard.sentence.translation.en ||
      "Translation not available"
    );
  };

  // Render different game states
  if (gameState === GameState.LOADING) {
    return (
      <div className="space-y-6">
        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="p-8 text-center">
            <div className="space-y-6">
              <RefreshCw className="mx-auto h-12 w-12 text-emerald-600 dark:text-emerald-400 animate-spin" />
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Loading Sentence Flashcards...
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Please wait while we prepare your flashcards.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState === GameState.NO_CARDS) {
    return (
      <div className="space-y-6">
        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="p-8 text-center">
            <div className="space-y-6">
              <div className="mx-auto w-24 h-24 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
                <GraduationCap className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  No Cards to Practice
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Great job! You have no sentence cards that need practice at
                  this time.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState === GameState.ERROR) {
    return (
      <div className="space-y-6">
        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="p-8 text-center">
            <div className="space-y-6">
              <AlertTriangle className="mx-auto h-16 w-16 text-red-500" />
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Something went wrong
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Failed to load flashcards. Please try again.
                </p>
              </div>
              <Button onClick={loadGameData} size="lg" variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState === GameState.COMPLETED && completionData) {
    return (
      <div className="space-y-6">
        <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg mb-4">
              <Trophy className="h-12 w-12 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
              Congratulations!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-lg text-emerald-700 dark:text-emerald-300">
                You&apos;ve completed your sentence flashcard session!
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Great job on improving your understanding!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  +{completionData.xpEarned}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  XP Earned
                </div>
              </div>
              <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                  {completionData.sessionStats.accuracy}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Accuracy
                </div>
              </div>
              <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                  {formatTime(completionData.timeTaken)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Time Taken
                </div>
              </div>
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
                  No Card Available
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  There are no cards to study at this time.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate progress
  const progress = (currentCardIndex / sentences.length) * 100;

  // Main flashcard UI - Phase 9 style
  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold text-emerald-800 dark:text-emerald-200">
                Sentence Flashcards
              </CardTitle>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Card {currentCardIndex + 1} of {sentences.length}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="flex items-center gap-2 px-3 py-1 border-emerald-200 dark:border-emerald-800 bg-white dark:bg-gray-900"
              >
                <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-mono text-emerald-800 dark:text-emerald-200">
                  {formatTime(elapsedTime)}
                </span>
              </Badge>
              <Button
                onClick={toggleTimer}
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/20"
              >
                {isTimerRunning ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Button
                onClick={resetTimer}
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/20"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <Progress value={progress} className="h-3" />
            <div className="flex justify-between items-center text-sm">
              <span className="text-emerald-700 dark:text-emerald-300">
                Progress
              </span>
              <span className="font-medium text-emerald-800 dark:text-emerald-200">
                {Math.round(progress)}% Complete
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Card */}
      <Card className="min-h-[500px] shadow-lg border-gray-200 dark:border-gray-800">
        <CardContent className="p-8">
          <div className="space-y-8">
            {/* Card Type Indicators */}
            <div className="flex items-center justify-between">
              <Badge
                variant="default"
                className="px-3 py-1 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <GraduationCap className="mr-2 h-4 w-4" />
                SENTENCE
              </Badge>
              <Badge
                variant="outline"
                className="px-3 py-1 border-gray-300 dark:border-gray-600"
              >
                {currentCard.state === 0 ? (
                  <>
                    <Lightbulb className="mr-2 h-4 w-4 text-yellow-500" />
                    NEW
                  </>
                ) : currentCard.state === 1 || currentCard.state === 3 ? (
                  <>
                    <Brain className="mr-2 h-4 w-4 text-blue-500" />
                    LEARNING
                  </>
                ) : (
                  <>
                    <Target className="mr-2 h-4 w-4 text-green-500" />
                    REVIEW
                  </>
                )}
              </Badge>
            </div>

            {/* Question Side */}
            <div className="text-center space-y-6">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold text-emerald-700 dark:text-emerald-300 drop-shadow-sm leading-relaxed">
                  {currentCard.sentence?.sentence}
                </h2>
                <div className="flex justify-center gap-3">
                  {currentCard.sentence.audioUrl && (
                    <AudioButton
                      audioUrl={currentCard.sentence.audioUrl}
                      startTimestamp={currentCard.sentence.timepoint || 0}
                      endTimestamp={
                        currentCard.sentence.endTimepoint ||
                        (currentCard.sentence.timepoint
                          ? currentCard.sentence.timepoint + 5
                          : 5)
                      }
                    />
                  )}
                </div>
              </div>
            </div>

            <Separator className="my-8 bg-gray-200 dark:bg-gray-800" />

            {/* Answer Side */}
            {showAnswer ? (
              <div className="space-y-8">
                <div className="text-center space-y-6">
                  <h3 className="text-2xl font-medium text-gray-700 dark:text-gray-300 leading-relaxed">
                    {getCurrentTranslation()}
                  </h3>
                </div>

                {/* Rating Buttons */}
                <div className="space-y-6">
                  <div className="text-center">
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                      How well did you understand this sentence?
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Button
                      onClick={() => handleRating(Rating.Again)}
                      disabled={isSubmitting}
                      variant="outline"
                      className="h-20 flex-col border-red-200 hover:bg-red-50 hover:border-red-300 transition-all duration-200 dark:border-red-800 dark:hover:bg-red-950/20"
                    >
                      <ThumbsDown className="h-6 w-6 mb-2 text-red-500" />
                      <span className="text-sm font-medium">Again</span>
                    </Button>
                    <Button
                      onClick={() => handleRating(Rating.Hard)}
                      disabled={isSubmitting}
                      variant="outline"
                      className="h-20 flex-col border-orange-200 hover:bg-orange-50 hover:border-orange-300 transition-all duration-200 dark:border-orange-800 dark:hover:bg-orange-950/20"
                    >
                      <AlertTriangle className="h-6 w-6 mb-2 text-orange-500" />
                      <span className="text-sm font-medium">Hard</span>
                    </Button>
                    <Button
                      onClick={() => handleRating(Rating.Good)}
                      disabled={isSubmitting}
                      variant="outline"
                      className="h-20 flex-col border-green-200 hover:bg-green-50 hover:border-green-300 transition-all duration-200 dark:border-green-800 dark:hover:bg-green-950/20"
                    >
                      <ThumbsUp className="h-6 w-6 mb-2 text-green-500" />
                      <span className="text-sm font-medium">Good</span>
                    </Button>
                    <Button
                      onClick={() => handleRating(Rating.Easy)}
                      disabled={isSubmitting}
                      variant="outline"
                      className="h-20 flex-col border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 dark:border-blue-800 dark:hover:bg-blue-950/20"
                    >
                      <Zap className="h-6 w-6 mb-2 text-blue-500" />
                      <span className="text-sm font-medium">Easy</span>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-8">
                <div className="space-y-6">
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    Think about the meaning of this sentence, then reveal the
                    answer.
                  </p>
                  <Button
                    onClick={() => setShowAnswer(true)}
                    size="lg"
                    className="h-16 px-12 text-lg bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg text-white"
                  >
                    <Eye className="mr-3 h-6 w-6" />
                    Show Translation
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
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Correct: {sessionStats.correct}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Incorrect: {sessionStats.incorrect}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Total: {sessionStats.total}
                </span>
              </div>
            </div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Accuracy: {sessionStats.accuracy}%
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
