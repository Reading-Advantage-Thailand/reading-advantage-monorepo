"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { AUDIO_WORDS_URL } from "@/server/constants";

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
  isExistingCompletion?: boolean;
  completionDate?: string;
}

interface FlashcardWord {
  id: string;
  vocabulary: string;
  definition: Record<string, string>;
  startTime?: number;
  endTime?: number;
  audioUrl?: string;
}

interface Word extends FsrsCard {
  id: string;
  word: FlashcardWord;
  articleId: string;
}

interface LessonVocabularyFlashcardGameProps {
  articleId: string;
  userId: string;
  onCompleteChange: (complete: boolean) => void;
}

export default function LessonVocabularyFlashcardGame({
  articleId,
  userId,
  onCompleteChange,
}: LessonVocabularyFlashcardGameProps) {
  // State management
  const [gameState, setGameState] = useState<GameState>(GameState.LOADING);
  const [words, setWords] = useState<Word[]>([]);
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

  // Hooks
  const currentLocale = useLocale();

  // Computed values
  const currentCard = words[currentCardIndex];
  const fnFsrs = f;

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
    if (!startTime) return elapsedTime;
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

  // Timer management
  useEffect(() => {
    if (!isTimerRunning) return;

    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerRunning]);

  const toggleTimer = () => setIsTimerRunning((prev) => !prev);
  const resetTimer = () => {
    setElapsedTime(0);
    // Don't reset startTime to preserve total session time
    setIsTimerRunning(true);
  };

  // API functions
  const awardXpForCompletion = async (): Promise<number> => {
    try {
      const response = await fetch(`/api/v1/users/${userId}/award-xp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 20,
          source: "lesson_flashcard_completion",
          articleId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.xpAwarded || 20;
      }
    } catch (error) {
      console.warn("Failed to award XP:", error);
    }
    return 20;
  };

  const checkExistingCompletion = async () => {
    try {
      const response = await fetch(
        `/api/v1/users/${userId}/activitylog?activityType=lesson_flashcard&targetId=${articleId}`,
      );

      if (!response.ok) return;

      const data = await response.json();

      // Find lesson_flashcard activity for this article
      const existingActivity = data?.activityLogs?.find(
        (log: any) =>
          log.activityType === "lesson_flashcard" && log.targetId === articleId,
      );

      // If we found a lesson_flashcard activity, regardless of completed status
      // (because some activities may have completed: false but still have completion data)
      if (existingActivity && existingActivity.details) {
        const completionData: CompletionData = {
          xpEarned: existingActivity.xpEarned || 20,
          timeTaken: existingActivity.timeTaken || existingActivity.timer || 0,
          sessionStats: {
            correct:
              existingActivity.details?.correct ||
              existingActivity.details?.correctAnswers ||
              0,
            incorrect:
              existingActivity.details?.incorrect ||
              existingActivity.details?.incorrectAnswers ||
              0,
            total:
              existingActivity.details?.total ||
              existingActivity.details?.totalCards ||
              0,
            accuracy: existingActivity.details?.accuracy || 0,
          },
          isExistingCompletion: true,
          completionDate: existingActivity.createdAt,
        };

        setCompletionData(completionData);
        setGameState(GameState.COMPLETED);
        onCompleteChange(true);
      }
    } catch (error) {
      console.error("Error checking completion:", error);
    }
  };

  const loadGameData = async () => {
    try {
      setGameState(GameState.LOADING);

      // Check for existing completion first
      await checkExistingCompletion();

      // If already completed, don't load cards
      if (gameState === GameState.COMPLETED) return;

      const response = await fetch(`/api/v1/lesson/words/${articleId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch flashcards");
      }

      const data = await response.json();

      if (
        !data.flashcards ||
        !Array.isArray(data.flashcards) ||
        data.flashcards.length === 0
      ) {
        setGameState(GameState.NO_CARDS);
        onCompleteChange(true);
        return;
      }

      setWords(data.flashcards);
      setCurrentCardIndex(0);
      setGameState(GameState.PLAYING);
      setStartTime(Date.now());
      setIsTimerRunning(true);
    } catch (error) {
      console.error("Error loading game data:", error);
      setGameState(GameState.ERROR);
    }
  };

  // Game logic
  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleSkip = () => {
    if (currentCardIndex < words.length - 1) {
      setCurrentCardIndex((prev) => prev + 1);
      setShowAnswer(false);
      // Reset card timer but keep the session timer running
      setElapsedTime(0);
    } else {
      // Complete session without rating
      handleSessionComplete();
    }
  };

  const handleDelete = async (cardId: string) => {
    if (!cardId) return;

    setIsDeleting(true);
    try {
      await fetch(`/api/v1/lesson/words/update/${cardId}`, {
        method: "DELETE",
      });

      // Remove card from current set
      const newWords = words.filter((word) => word.id !== cardId);
      setWords(newWords);

      if (newWords.length === 0) {
        handleSessionComplete();
      } else if (currentCardIndex >= newWords.length) {
        setCurrentCardIndex(0);
      }

      setShowAnswer(false);
    } catch (error) {
      console.error("Error deleting card:", error);
      // Simple error message
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRating = async (rating: Rating) => {
    if (isSubmitting || !currentCard) return;

    setIsSubmitting(true);

    try {
      const preCard = currentCard;
      const scheduling_cards: any = fnFsrs.repeat(preCard, preCard.due);

      // Update card
      const updatedCard = scheduling_cards[rating].card;
      const newWords = [...words];
      newWords[currentCardIndex] = updatedCard;
      setWords(newWords);

      // Update card state in DB (don't block UI if this fails)
      try {
        await fetch(`/api/v1/lesson/words/update/${updatedCard.id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            due: updatedCard.due,
            stability: updatedCard.stability,
            difficulty: updatedCard.difficulty,
            elapsed_days: updatedCard.elapsed_days,
            scheduled_days: updatedCard.scheduled_days,
            reps: updatedCard.reps,
            lapses: updatedCard.lapses,
            state: updatedCard.state,
          }),
        });
      } catch (updateError) {
        console.warn("Failed to update card state:", updateError);
      }

      // Update session stats first
      const isCorrect = rating >= Rating.Good;

      // Calculate final stats properly to avoid race condition
      const newCorrect = sessionStats.correct + (isCorrect ? 1 : 0);
      const newIncorrect = sessionStats.incorrect + (isCorrect ? 0 : 1);
      const newTotal = newCorrect + newIncorrect;
      const newAccuracy = calculateAccuracy(newCorrect, newTotal);

      const finalStats = {
        correct: newCorrect,
        incorrect: newIncorrect,
        total: newTotal,
        accuracy: newAccuracy,
      };

      // Update the state for UI consistency
      updateSessionStats(isCorrect);

      // Move to next card or complete session
      if (currentCardIndex < words.length - 1) {
        setCurrentCardIndex((prev) => prev + 1);
        setShowAnswer(false);
        // Reset card timer but keep the session timer running
        setElapsedTime(0);
      } else {
        // Complete session - pass calculated final stats
        await handleSessionComplete(finalStats);
      }
    } catch (error) {
      console.error("Error handling rating:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSessionComplete = async (finalStats?: typeof sessionStats) => {
    setIsTimerRunning(false);
    const totalElapsedTime = getTotalElapsedTime();
    const awardedXp = await awardXpForCompletion();

    // Use provided finalStats or current sessionStats as fallback
    const statsToUse = finalStats || sessionStats;

    // Log completion activity
    try {
      const activityData = {
        activityType: "lesson_flashcard",
        targetId: articleId,
        completed: true,
        activityStatus: "completed", // เพิ่มตัวนี้เพื่อให้ backend รู้ว่าเสร็จแล้ว
        details: {
          title: "Lesson Flashcard",
          articleId,
          contentId: articleId,
          total: statsToUse.total,
          correct: statsToUse.correct,
          incorrect: statsToUse.incorrect,
          accuracy: statsToUse.accuracy,
          timeTaken: totalElapsedTime,
        },
        xpEarned: awardedXp,
        timeTaken: totalElapsedTime,
      };

      const response = await fetch(`/api/v1/users/${userId}/activitylog`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activityData),
      });

      if (response.ok) {
        const result = await response.json();
      } else {
        console.error("❌ Failed to log activity, response:", response.status);
      }
    } catch (error) {
      console.warn("❌ Failed to log activity:", error);
    }

    const completionData: CompletionData = {
      xpEarned: awardedXp,
      timeTaken: totalElapsedTime,
      sessionStats: statsToUse, // Use the passed stats or fallback
      isExistingCompletion: false,
    };

    setCompletionData(completionData);
    setGameState(GameState.COMPLETED);
    onCompleteChange(true);

    // Show success toast
    if (awardedXp > 0) {
      setTimeout(() => {
        toast.success(
          `Great job! You earned ${awardedXp} XP for completing the flashcards!`,
        );
      }, 1000);
    }
  };

  const handleCompleteSession = () => {
    onCompleteChange(true);
  };

  // Initialize game on mount
  useEffect(() => {
    loadGameData();
  }, []);

  // Update completion when game state changes
  // Update completion when game state changes
  useEffect(() => {
    if (gameState === GameState.NO_CARDS || gameState === GameState.COMPLETED) {
      onCompleteChange(true);
    }
  }, [gameState, onCompleteChange]);

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
        <Card className="overflow-hidden bg-gradient-to-br from-emerald-50 via-emerald-50 to-emerald-100 dark:from-emerald-950/20 dark:via-emerald-950/20 dark:to-emerald-950/30 border-emerald-200 dark:border-emerald-800 pb-14">
          <CardContent className="p-8 text-center">
            <div className="space-y-6">
              {/* Trophy and celebration */}
              <div className="space-y-4">
                <div className="relative">
                  <Trophy className="mx-auto h-20 w-20 text-yellow-500 drop-shadow-lg" />
                  <div className="absolute -top-2 -right-2">
                    <Sparkles className="h-8 w-8 text-yellow-400 animate-pulse" />
                  </div>
                  <div className="absolute -bottom-2 -left-2">
                    <Star className="h-6 w-6 text-yellow-400 animate-pulse" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent">
                    Vocabulary Practice Complete!
                  </h2>
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    Excellent work on your vocabulary practice session
                  </p>
                </div>
              </div>

              <Separator className="bg-emerald-200 dark:bg-emerald-800" />

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {safeCompletionData.xpEarned}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    XP Earned
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {formatTime(safeCompletionData.timeTaken)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Time Taken
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {safeCompletionData.sessionStats.correct}/
                    {safeCompletionData.sessionStats.total}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Correct
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {safeCompletionData.sessionStats.accuracy}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Accuracy
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
            <div className="flex flex-col items-center justify-center space-y-6 min-h-[400px]">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-emerald-200 dark:border-emerald-800 border-t-emerald-600 dark:border-t-emerald-400 rounded-full animate-spin"></div>
                <GraduationCap className="absolute inset-0 m-auto h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Loading Flashcards
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Preparing your vocabulary practice...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render no cards state
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
                  Great job! You have no vocabulary cards that need practice at
                  this time.
                </p>
              </div>
              <Button
                onClick={handleCompleteSession}
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Continue
              </Button>
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
                  Something went wrong
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Failed to load flashcards. Please try again.
                </p>
              </div>
              <Button onClick={loadGameData} size="lg" variant="outline">
                <RotateCcw className="mr-2 h-4 w-4" />
                Try Again
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
  const progress = (currentCardIndex / words.length) * 100;

  // Render playing state
  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold text-emerald-800 dark:text-emerald-200">
                Vocabulary Flashcards
              </CardTitle>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Card {currentCardIndex + 1} of {words.length}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="flex items-center gap-2 px-3 py-1 border-emerald-200 dark:border-emerald-800 bg-white dark:bg-gray-900"
              >
                <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-mono text-emerald-800 dark:text-emerald-200">
                  {formatTime(getTotalElapsedTime())}
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
                VOCABULARY
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
                <h2 className="text-5xl font-bold text-emerald-700 dark:text-emerald-300 drop-shadow-sm">
                  {currentCard.word?.vocabulary}
                </h2>
                <div className="flex justify-center gap-3">
                  {currentCard.word.audioUrl && (
                    <AudioButton
                      audioUrl={
                        currentCard.word.audioUrl ||
                        `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/${AUDIO_WORDS_URL}/${currentCard.articleId}.mp3`
                      }
                      startTimestamp={currentCard?.word?.startTime || 0}
                      endTimestamp={currentCard?.word?.endTime || 0}
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                  >
                    <Volume2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            <Separator className="my-8 bg-gray-200 dark:bg-gray-800" />

            {/* Answer Side */}
            {showAnswer ? (
              <div className="space-y-8">
                <div className="text-center space-y-6">
                  <h3 className="text-3xl font-medium text-gray-700 dark:text-gray-300">
                    {currentCard.word.definition[currentLocale]}
                  </h3>
                </div>

                {/* Rating Buttons */}
                <div className="space-y-6">
                  <div className="text-center">
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                      How well did you know this word?
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

                {/* Delete Button */}
                <div className="text-center">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(currentCard?.id)}
                    disabled={isDeleting}
                    className="font-medium"
                  >
                    {isDeleting ? (
                      <>
                        <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                        Removing...
                      </>
                    ) : (
                      "Remove from Practice"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-8">
                <div className="space-y-6">
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    Think about the meaning of this word, then reveal the
                    answer.
                  </p>
                  <Button
                    onClick={handleShowAnswer}
                    size="lg"
                    className="h-16 px-12 text-lg bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg text-white"
                  >
                    <Eye className="mr-3 h-6 w-6" />
                    Show Answer
                  </Button>
                </div>
                <div className="flex justify-center">
                  <Button
                    onClick={handleSkip}
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <SkipForward className="mr-2 h-4 w-4" />
                    Skip Card
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
