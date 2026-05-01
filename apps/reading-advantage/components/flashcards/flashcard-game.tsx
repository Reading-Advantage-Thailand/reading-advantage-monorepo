"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { useCurrentLocale } from "@/locales/client";
import {
  ChevronLeft,
  Volume2,
  RotateCcw,
  Trophy,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  Zap,
  RefreshCw,
  Eye,
  EyeOff,
  BookOpen,
  Lightbulb,
  ArrowRight,
  Pause,
  Play,
  SkipForward,
  Heart,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  GraduationCap,
  FileText,
  Brain,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  UserXpEarned,
  ActivityStatus,
  ActivityType,
} from "@/components/models/user-activity-log-model";
import { levelCalculation } from "@/lib/utils";

export enum Rating {
  AGAIN = 1,
  HARD = 2,
  GOOD = 3,
  EASY = 4,
}

interface FlashcardData {
  id: string;
  word?: any; // JSON data structure from API for vocabulary cards
  // Fields for sentence cards
  sentence?: string; // The sentence text
  translation?: {
    en?: string;
    th?: string;
    cn?: string;
    tw?: string;
    vi?: string;
    [key: string]: string | undefined;
  };
  difficulty: number;
  due: string;
  elapsedDays: number;
  lapses: number;
  reps: number;
  scheduledDays: number;
  stability: number;
  state: number; // 0=New, 1=Learning, 2=Review, 3=Relearning
  userId: string;
  articleId: string;
  saveToFlashcard: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FlashcardGameInlineProps {
  cards: FlashcardData[];
  deckId: string;
  deckName: string;
  deckType: "VOCABULARY" | "SENTENCE"; // Add deck type to know what type of cards
  selectedLanguage?: string; // Add selected language prop
  onComplete: () => void;
  onExit: () => void;
}

export function FlashcardGameInline({
  cards,
  deckId,
  deckName,
  deckType,
  selectedLanguage = "en", // Default to English if not provided
  onComplete,
  onExit,
}: FlashcardGameInlineProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    incorrect: 0,
    total: cards.length,
  });
  const [completedCards, setCompletedCards] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studyComplete, setStudyComplete] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);
  const router = useRouter();
  const locale = useCurrentLocale();
  const { toast } = useToast();

  const currentCard = cards[currentCardIndex];

  // Get appropriate translation based on selected language
  const getTranslation = (translation: any) => {
    if (!translation) return "No translation";

    // Use selectedLanguage or fallback to available translations
    return (
      translation[selectedLanguage] ||
      translation["en"] ||
      translation["th"] ||
      Object.values(translation)[0] ||
      "No translation"
    );
  };

  // Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && !studyComplete) {
      timer = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, studyComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleTimer = () => {
    setIsPlaying(!isPlaying);
  };

  const resetTimer = () => {
    setElapsedTime(0);
    setIsPlaying(true);
  };

  const awardXpForCompletion = async () => {
    if (!currentCard?.userId) {
      console.error("No userId found in currentCard");
      return;
    }

    try {
      const xpAmount =
        deckType === "VOCABULARY"
          ? UserXpEarned.Vocabulary_Flashcards
          : UserXpEarned.Sentence_Flashcards;

      const activityType =
        deckType === "VOCABULARY"
          ? ActivityType.VocabularyFlashcards
          : ActivityType.SentenceFlashcards;

      const payload = {
        activityType: activityType,
        activityStatus: ActivityStatus.Completed,
        xpEarned: xpAmount,
        timeTaken: elapsedTime,
        targetId: `flashcard-${deckType.toLowerCase()}-${Date.now()}`, // Add unique targetId
        details: {
          deckId: deckId,
          deckName: deckName,
          deckType: deckType,
          totalCards: cards.length,
          correctAnswers: sessionStats.correct,
          incorrectAnswers: sessionStats.incorrect,
          accuracy:
            sessionStats.correct + sessionStats.incorrect > 0
              ? Math.round(
                  (sessionStats.correct /
                    (sessionStats.correct + sessionStats.incorrect)) *
                    100
                )
              : 0,
          timeTaken: elapsedTime,
          cefr_level: levelCalculation(xpAmount).cefrLevel,
        },
      };

      const response = await fetch(
        `/api/v1/users/${currentCard.userId}/activitylog`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const responseData = await response.json();

      if (response.ok) {
        setXpAwarded(xpAmount);
        return xpAmount;
      } else {
        console.error("Failed to award XP:", responseData);
        toast({
          title: "Error",
          description: "Failed to save your progress. Please try again.",
          variant: "destructive",
        });
        return null;
      }
    } catch (error) {
      console.error("Error awarding XP:", error);
      toast({
        title: "Error",
        description: "Failed to save your progress. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleRating = async (rating: Rating) => {
    if (isSubmitting || !currentCard) return;

    setIsSubmitting(true);

    try {
      // Determine card type based on deckType
      const cardType = deckType === "VOCABULARY" ? "vocabulary" : "sentences";

      // Submit rating to API
      const response = await fetch(`/api/v1/flashcard/progress/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cardId: currentCard.id,
          rating,
          type: cardType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit rating");
      }

      // Update session stats
      const isCorrect = rating >= Rating.GOOD;
      setSessionStats((prev) => ({
        ...prev,
        correct: prev.correct + (isCorrect ? 1 : 0),
        incorrect: prev.incorrect + (isCorrect ? 0 : 1),
      }));

      // Mark card as completed
      setCompletedCards((prev) => [...prev, currentCard.id]);

      // Move to next card or complete session
      if (currentCardIndex < cards.length - 1) {
        setCurrentCardIndex((prev) => prev + 1);
        setShowAnswer(false);
        resetTimer();
      } else {
        const awardedXp = await awardXpForCompletion();

        setStudyComplete(true);
        setIsPlaying(false);

        if (awardedXp) {
          setTimeout(() => {
            toast({
              title: "🎉 Congratulations!",
              description: `You earned ${awardedXp} XP!`,
              variant: "default",
            });
          }, 1000);
        }

        toast({
          title: "Success",
          description: "Study session completed!",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast({
        title: "Error",
        description: "Failed to save progress. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleSkip = () => {
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex((prev) => prev + 1);
      setShowAnswer(false);
      resetTimer();
    }
  };

  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      speechSynthesis.speak(utterance);
    }
  };

  const handleCompleteSession = () => {
    // Call onComplete to notify parent component
    onComplete();

    // Optional: Show a final toast
    if (xpAwarded) {
      toast({
        title: "Session Completed!",
        description: `Total XP earned: ${xpAwarded}`,
        variant: "default",
      });
    }
  };

  if (studyComplete) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardContent className="space-y-6 p-8 text-center">
          <div className="space-y-4">
            <Trophy className="mx-auto h-16 w-16 text-yellow-500" />
            <h2 className="text-2xl font-bold">Study Session Complete!</h2>
            {xpAwarded && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  <span className="text-lg font-semibold text-green-700 dark:text-green-300">
                    +{xpAwarded} XP Earned!
                  </span>
                </div>
              </div>
            )}
            <p className="text-muted-foreground">
              Great job! You&apos;ve completed your flashcard session.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <CheckCircle className="mx-auto h-8 w-8 text-green-500" />
              <div className="text-2xl font-bold text-green-600">
                {sessionStats.correct}
              </div>
              <div className="text-sm text-muted-foreground">Correct</div>
            </div>
            <div className="space-y-2">
              <XCircle className="mx-auto h-8 w-8 text-red-500" />
              <div className="text-2xl font-bold text-red-600">
                {sessionStats.incorrect}
              </div>
              <div className="text-sm text-muted-foreground">Incorrect</div>
            </div>
            <div className="space-y-2">
              <Clock className="mx-auto h-8 w-8 text-blue-500" />
              <div className="text-2xl font-bold text-blue-600">
                {formatTime(elapsedTime)}
              </div>
              <div className="text-sm text-muted-foreground">Time</div>
            </div>
          </div>

          <Separator />

          <div className="flex justify-center gap-3">
            <Button onClick={handleCompleteSession} size="lg">
              <CheckCircle className="mr-2 h-4 w-4" />
              Complete Session
            </Button>
            <Button onClick={onExit} variant="outline" size="lg">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentCard) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardContent className="space-y-4 p-8 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-orange-500" />
          <h3 className="text-lg font-semibold">No Cards Available</h3>
          <p className="text-muted-foreground">
            There are no cards to study at this time.
          </p>
          <Button onClick={onExit} variant="outline">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  const progress = ((currentCardIndex + 1) / cards.length) * 100;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header with progress and controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button onClick={onExit} variant="ghost" size="sm">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle className="text-lg">{deckName}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Card {currentCardIndex + 1} of {cards.length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(elapsedTime)}
              </Badge>
              <Button
                onClick={toggleTimer}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Button
                onClick={resetTimer}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current card */}
      <Card className="min-h-[400px]">
        <CardContent className="p-8">
          <div className="space-y-6">
            {/* Card type indicator */}
            <div className="flex items-center justify-between">
              <Badge
                variant={deckType === "VOCABULARY" ? "default" : "secondary"}
                className="text-sm"
              >
                {deckType === "VOCABULARY" ? (
                  <GraduationCap className="mr-1 h-3 w-3" />
                ) : (
                  <FileText className="mr-1 h-3 w-3" />
                )}
                {deckType}
              </Badge>
              <Badge variant="outline">
                {currentCard.state === 0 ? (
                  <Lightbulb className="mr-1 h-3 w-3" />
                ) : currentCard.state === 1 || currentCard.state === 3 ? (
                  <Brain className="mr-1 h-3 w-3" />
                ) : (
                  <Target className="mr-1 h-3 w-3" />
                )}
                {currentCard.state === 0
                  ? "NEW"
                  : currentCard.state === 1 || currentCard.state === 3
                    ? "LEARNING"
                    : "REVIEW"}
              </Badge>
            </div>

            {/* Question side */}
            <div className="space-y-4 text-center">
              {deckType === "VOCABULARY" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h2 className="text-4xl font-bold text-primary">
                      {currentCard.word?.vocabulary || "No word"}
                    </h2>
                    {currentCard.word?.pos && (
                      <Badge variant="outline" className="text-xs">
                        {currentCard.word.pos}
                      </Badge>
                    )}
                  </div>
                  <Button
                    onClick={() =>
                      speakText(currentCard.word?.vocabulary || "")
                    }
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-2xl font-medium leading-relaxed">
                    {currentCard.sentence || "No sentence"}
                  </h2>
                  <Button
                    onClick={() => speakText(currentCard.sentence || "")}
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Answer side */}
            {showAnswer ? (
              <div className="space-y-6">
                <div className="space-y-4 text-center">
                  {deckType === "VOCABULARY" ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold">Definition</h3>
                        <p className="text-lg text-muted-foreground">
                          {getTranslation(currentCard.word?.definition) ||
                            "No definition"}
                        </p>
                      </div>
                      {currentCard.word?.example && (
                        <div className="space-y-2">
                          <h3 className="text-xl font-semibold">Example</h3>
                          <p className="text-lg italic text-muted-foreground">
                            &quot;{currentCard.word.example}&quot;
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold">Translation</h3>
                      <p className="text-lg text-muted-foreground">
                        {getTranslation(currentCard.translation)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Rating buttons */}
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      How well did you know this?
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Button
                      onClick={() => handleRating(Rating.AGAIN)}
                      disabled={isSubmitting}
                      variant="destructive"
                      className="h-16 flex-col gap-1"
                    >
                      <XCircle className="h-5 w-5" />
                      <span className="text-xs">Again</span>
                      <span className="text-xs opacity-75">&lt;1m</span>
                    </Button>
                    <Button
                      onClick={() => handleRating(Rating.HARD)}
                      disabled={isSubmitting}
                      variant="secondary"
                      className="h-16 flex-col gap-1"
                    >
                      <ThumbsDown className="h-5 w-5" />
                      <span className="text-xs">Hard</span>
                      <span className="text-xs opacity-75">&lt;6m</span>
                    </Button>
                    <Button
                      onClick={() => handleRating(Rating.GOOD)}
                      disabled={isSubmitting}
                      variant="default"
                      className="h-16 flex-col gap-1"
                    >
                      <ThumbsUp className="h-5 w-5" />
                      <span className="text-xs">Good</span>
                      <span className="text-xs opacity-75">&lt;10m</span>
                    </Button>
                    <Button
                      onClick={() => handleRating(Rating.EASY)}
                      disabled={isSubmitting}
                      variant="default"
                      className="h-16 flex-col gap-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-5 w-5" />
                      <span className="text-xs">Easy</span>
                      <span className="text-xs opacity-75">4d</span>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 text-center">
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    {deckType === "VOCABULARY"
                      ? "What does this word mean?"
                      : "What does this sentence mean?"}
                  </p>
                  <Button
                    onClick={handleShowAnswer}
                    size="lg"
                    className="h-14 px-8"
                  >
                    <Eye className="mr-2 h-5 w-5" />
                    Show Answer
                  </Button>
                </div>
                <div className="flex justify-center gap-2">
                  <Button
                    onClick={handleSkip}
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                  >
                    <SkipForward className="mr-1 h-4 w-4" />
                    Skip
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Session stats */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">
                  {sessionStats.correct}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">
                  {sessionStats.incorrect}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">
                  {sessionStats.total}
                </span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Accuracy:{" "}
              {sessionStats.correct + sessionStats.incorrect > 0
                ? Math.round(
                    (sessionStats.correct /
                      (sessionStats.correct + sessionStats.incorrect)) *
                      100
                  )
                : 0}
              %
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
