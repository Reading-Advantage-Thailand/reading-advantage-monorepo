"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useScopedI18n } from "@/locales/client";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
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
  Lightbulb,
  Eye,
  EyeOff,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { levelCalculation, splitTextIntoSentences } from "@/lib/utils";
import {
  UserXpEarned,
  ActivityStatus,
  ActivityType,
} from "../models/user-activity-log-model";
import subtlex from "subtlex-word-frequencies";

interface ClozeTestData {
  id: string;
  articleId: string;
  articleTitle: string;
  sentence: string;
  words: Array<{
    word: string;
    start: number;
    end: number;
  }>;
  blanks: Array<{
    id: string;
    position: number;
    correctAnswer: string;
    options: string[];
    hint?: string;
  }>;
  translation?: {
    th?: string;
    cn?: string;
    tw?: string;
    vi?: string;
  };
  audioUrl?: string;
  startTime?: number;
  endTime?: number;
  difficulty: "easy" | "medium" | "hard";
}

interface UserAnswer {
  blankId: string;
  selectedAnswer: string;
  isCorrect: boolean;
}

type Props = {
  userId: string;
  articleId: string;
  onCompleteChange: (complete: boolean) => void;
};

export default function LessonClozeTest({
  userId,
  articleId,
  onCompleteChange,
}: Props) {
  const t = useScopedI18n("pages.student.practicePage");
  const tc = useScopedI18n("components.articleContent");
  const tUpdateScore = useScopedI18n(
    "pages.student.practicePage.flashcardPractice"
  );
  const router = useRouter();

  // Game state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDifficulty, setSelectedDifficulty] = useState<
    "easy" | "medium" | "hard"
  >("medium");

  // Track which sentences have been completed with perfect score
  const [completedSentences, setCompletedSentences] = useState<Set<number>>(
    new Set()
  );

  // Activity completion tracking
  const [isAlreadyCompleted, setIsAlreadyCompleted] = useState(false);
  const [isScoreSaved, setIsScoreSaved] = useState(false);
  const [activityLogData, setActivityLogData] = useState<any>(null);

  // Game data
  const [rawSentenceData, setRawSentenceData] = useState<ClozeTestData[]>([]);
  const [activeSentences, setActiveSentences] = useState<ClozeTestData[]>([]);

  // Game results tracking
  const [gameResults, setGameResults] = useState<
    Array<{
      sentenceId: string;
      results: Array<{
        blankId: string;
        correct: boolean;
        selectedAnswer: string;
        correctAnswer: string;
      }>;
    }>
  >([]);

  // UI state
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [hintsEnabled, setHintsEnabled] = useState(false);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [audioHintsEnabled, setAudioHintsEnabled] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Client-side blank generation function
  const generateBlanksForSentence = useCallback(
    (
      sentenceData: ClozeTestData,
      difficulty: "easy" | "medium" | "hard"
    ): ClozeTestData => {
      const blankCount =
        difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3;

      // Filter candidate words for blanking
      const candidateWords = sentenceData.words.filter((wordObj) => {
        const word = wordObj.word.toLowerCase();
        const commonWords = [
          "the",
          "and",
          "for",
          "are",
          "but",
          "not",
          "you",
          "all",
          "can",
          "had",
          "her",
          "was",
          "one",
          "our",
          "out",
          "day",
          "get",
          "has",
          "him",
          "his",
          "how",
          "its",
          "may",
          "new",
          "now",
          "old",
          "see",
          "two",
          "way",
          "who",
          "boy",
          "did",
          "man",
          "end",
          "few",
          "run",
          "own",
          "say",
          "she",
          "too",
          "use",
          "many",
          "some",
          "time",
          "very",
          "when",
          "much",
          "know",
          "take",
          "than",
          "only",
          "think",
          "also",
          "back",
          "after",
          "first",
          "well",
          "year",
          "work",
          "such",
          "make",
          "even",
          "most",
          "give",
        ];

        return (
          word.length > 2 &&
          !commonWords.includes(word) &&
          /^[a-zA-Z]+$/.test(word)
        );
      });

      // Select words to blank out
      const selectedWords = candidateWords
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(blankCount, candidateWords.length));

      // Generate blanks
      const blanks = selectedWords.map((wordObj, index) => {
        const wordPosition = sentenceData.sentence.indexOf(wordObj.word);

        // Generate options (simplified - you can enhance this)
        const options = [wordObj.word];
        const allWords = sentenceData.words.map((w) => w.word);
        const distractors = allWords
          .filter(
            (w) =>
              w !== wordObj.word &&
              w.length >= wordObj.word.length - 2 &&
              w.length <= wordObj.word.length + 2
          )
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);

        options.push(...distractors);

        // Shuffle options
        const shuffledOptions = options.sort(() => Math.random() - 0.5);

        return {
          id: `blank-${index}`,
          position: wordPosition,
          correctAnswer: wordObj.word,
          options: shuffledOptions,
          hint: `Word that starts at ${wordObj.start.toFixed(1)}s`,
        };
      });

      return {
        ...sentenceData,
        blanks: blanks.sort((a, b) => a.position - b.position),
        difficulty,
      };
    },
    []
  );

  // Generate active sentences based on difficulty
  const activeSentencesWithBlanks = useMemo(() => {
    if (rawSentenceData.length === 0) return [];

    return rawSentenceData.map((sentence) =>
      generateBlanksForSentence(sentence, selectedDifficulty)
    );
  }, [rawSentenceData, selectedDifficulty, generateBlanksForSentence]);

  // Update active sentences when blanks are regenerated
  useEffect(() => {
    setActiveSentences(activeSentencesWithBlanks);
    // Reset current game state when difficulty changes
    if (activeSentencesWithBlanks.length > 0) {
      setCurrentIndex(0);
      setUserAnswers([]);
      setShowResult(false);
      setIsCompleted(false);
      setHasUserInteracted(false);
      setShowCorrectAnswers(false);
    }
  }, [activeSentencesWithBlanks]);

  // Load sentences from the lesson article
  const loadSentencesFromArticle = async () => {
    console.log("loadSentencesFromArticle called for articleId:", articleId);
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/v1/users/sentences/${userId}/?articleId=${articleId}`
      );
      console.log("Sentences API response status:", response.status);
      if (response.ok) {
        const data = await response.json();
        console.log("Loaded sentences data:", data);

        // Transform the lesson sentence data to match ClozeTestData structure
        const transformedSentences: ClozeTestData[] = data.sentences.map(
          (sentenceData: any, index: number) => {
            const words = sentenceData.sentence
              .split(" ")
              .map((word: string, wordIndex: number) => ({
                word: word.replace(/[^\w\s]/gi, ""), // Clean punctuation for word matching
                start: wordIndex * 0.5, // Approximate timing
                end: (wordIndex + 1) * 0.5,
              }));

            return {
              id: `sentence-${index}`,
              articleId: sentenceData.articleId,
              articleTitle: `Sentence ${index + 1}`,
              sentence: sentenceData.sentence,
              words,
              blanks: [], // Will be populated by generateBlanksForSentence
              audioUrl: sentenceData.audioUrl,
              difficulty: "medium" as const,
            };
          }
        );

        setRawSentenceData(transformedSentences);
      } else {
        toast({
          title: "Error",
          description: "Failed to load sentences from lesson",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading sentences:", error);
      toast({
        title: "Error",
        description: "Failed to load sentences",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check if activity is already completed (similar to phase 10 pattern)
  const checkActivityCompletion = async () => {
    try {
      const res = await fetch(
        `/api/v1/users/${userId}/activitylog?articleId=${articleId}&activityType=sentence_cloze_test`
      );
      if (res.ok) {
        const data = await res.json();
        console.log("Activity log response:", data);
        if (data.activityLogs && data.activityLogs.length > 0) {
          const completedActivity = data.activityLogs.find(
            (log: any) => log.completed === true
          );
          if (completedActivity) {
            console.log("Found completed activity:", completedActivity);
            setActivityLogData(completedActivity);
            setIsAlreadyCompleted(true);
            setIsScoreSaved(true);
            setGameComplete(true);
            onCompleteChange(true);
          }
        }
      }
    } catch (error) {
      console.error("Error checking activity completion:", error);
    }
  };

  useEffect(() => {
    loadSentencesFromArticle();
    checkActivityCompletion();
  }, []);

  const currentSentence = useMemo(
    () => activeSentences[currentIndex],
    [activeSentences, currentIndex]
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

  // Reset answers when sentence changes
  useEffect(() => {
    if (currentSentence) {
      setUserAnswers([]);
      setShowResult(false);
      setIsCompleted(false);
      setHasUserInteracted(false);
      setShowCorrectAnswers(false);
    }
  }, [currentSentence?.id]);

  // Check completion when answers change
  useEffect(() => {
    if (!currentSentence || userAnswers.length === 0) return;

    // Only auto-complete if user has answered all blanks
    if (
      userAnswers.length === currentSentence.blanks.length &&
      !isCompleted &&
      hasUserInteracted
    ) {
      const correctCount = userAnswers.filter(
        (answer) => answer.isCorrect
      ).length;
      const isAllCorrect = correctCount === currentSentence.blanks.length;

      setIsCompleted(true);
      setShowResult(true);

      if (isAllCorrect) {
        // Only add to score if this sentence hasn't been completed with perfect score yet
        if (!completedSentences.has(currentIndex)) {
          setScore((prev) => prev + 1);
          setCompletedSentences((prev) => new Set([...prev, currentIndex]));
        }
        toast({
          title: t("toast.success"),
          description: "Perfect! All blanks filled correctly! 🎉",
        });
      } else {
        toast({
          title: "Try Again",
          description: `${correctCount}/${currentSentence.blanks.length} correct. Try again! 💪`,
          variant: "destructive",
        });
      }
    }
  }, [
    userAnswers,
    currentSentence?.blanks.length,
    isCompleted,
    hasUserInteracted,
    t,
  ]);

  const handleAnswerSelect = useCallback(
    (blankId: string, selectedAnswer: string) => {
      if (isCompleted) return;

      const blank = currentSentence?.blanks.find((b) => b.id === blankId);
      if (!blank) return;

      const isCorrect = selectedAnswer === blank.correctAnswer;

      setUserAnswers((prev) => {
        const existing = prev.find((a) => a.blankId === blankId);
        const newAnswer: UserAnswer = {
          blankId,
          selectedAnswer,
          isCorrect,
        };

        if (existing) {
          return prev.map((a) => (a.blankId === blankId ? newAnswer : a));
        } else {
          return [...prev, newAnswer];
        }
      });

      setHasUserInteracted(true);
    },
    [currentSentence?.blanks, isCompleted]
  );

  const handleStartGame = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const saveSentenceResult = useCallback(async () => {
    if (!currentSentence || userAnswers.length === 0) return;

    try {
      // Save current sentence results to game results
      const sentenceResults = currentSentence.blanks.map((blank) => {
        const userAnswer = userAnswers.find((a) => a.blankId === blank.id);
        return {
          blankId: blank.id,
          correct: userAnswer?.isCorrect || false,
          selectedAnswer: userAnswer?.selectedAnswer || "",
          correctAnswer: blank.correctAnswer,
        };
      });

      setGameResults((prev) => [
        ...prev,
        {
          sentenceId: currentSentence.id,
          results: sentenceResults,
        },
      ]);
    } catch (error) {
      console.error("Error preparing sentence result:", error);
    }
  }, [currentSentence, userAnswers]);

  const saveGameResults = useCallback(async () => {
    console.log("saveGameResults called with gameResults:", gameResults);
    try {
      if (isAlreadyCompleted || isScoreSaved) return;

      setIsScoreSaved(true);

      // Save activity log similar to phase 10 pattern
      const updateScore = await fetch(`/api/v1/users/${userId}/activitylog`, {
        method: "POST",
        body: JSON.stringify({
          activityType: ActivityType.SentenceClozeTest,
          activityStatus: ActivityStatus.Completed,
          xpEarned: UserXpEarned.Sentence_Cloze_Test,
          articleId: articleId,
          details: {
            articleId: articleId,
            difficulty: selectedDifficulty,
            totalScore: score,
            totalQuestions: activeSentences.length,
            timeTaken: timer,
            cefr_level: levelCalculation(UserXpEarned.Sentence_Cloze_Test)
              .cefrLevel,
          },
        }),
      });

      if (updateScore?.status === 200) {
        router.refresh();
        toast({
          title: t("toast.success"),
          imgSrc: true,
          description: tUpdateScore("yourXp", {
            xp: UserXpEarned.Sentence_Cloze_Test,
          }),
        });
        onCompleteChange(true);
      } else {
        throw new Error("Failed to save score");
      }
    } catch (error) {
      console.error("Error saving game results:", error);
      setIsScoreSaved(false);
      toast({
        title: t("toast.error"),
        description: t("toast.errorDescription"),
        variant: "destructive",
      });
    }
  }, [
    gameResults,
    timer,
    selectedDifficulty,
    isAlreadyCompleted,
    isScoreSaved,
    score,
    activeSentences.length,
    userId,
    articleId,
    router,
    t,
    tUpdateScore,
    onCompleteChange,
  ]);

  const handleNext = useCallback(async () => {
    // Create stable references to avoid dependency issues
    const currentSentenceRef = currentSentence;
    const userAnswersRef = userAnswers;
    const isCompletedRef = isCompleted;
    const currentIndexRef = currentIndex;
    const activeSentencesLengthRef = activeSentences.length;

    // Save current sentence results before moving to next
    if (currentSentenceRef && userAnswersRef.length > 0 && isCompletedRef) {
      await saveSentenceResult();
    }

    if (currentIndexRef < activeSentencesLengthRef - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Save final game results
      await saveGameResults();
      setGameComplete(true);
      setIsPlaying(false);
    }
  }, [
    saveSentenceResult,
    saveGameResults,
    currentSentence,
    userAnswers,
    isCompleted,
    currentIndex,
    activeSentences.length,
  ]);

  const handleRestart = useCallback(() => {
    // If current sentence was previously completed with perfect score, remove it from completed set
    if (completedSentences.has(currentIndex)) {
      setCompletedSentences((prev) => {
        const newSet = new Set(prev);
        newSet.delete(currentIndex);
        return newSet;
      });
      setScore((prev) => prev - 1);
    }

    // Reset all current sentence state
    setUserAnswers([]);
    setShowResult(false);
    setIsCompleted(false);
    setHasUserInteracted(false);
    setShowCorrectAnswers(false);
    setHintsEnabled(false);

    // Show toast to confirm reset
    toast({
      title: "Answers Reset",
      description: "All answers for this sentence have been cleared.",
    });
  }, [currentIndex, completedSentences]);

  const handleCheckAnswer = useCallback(() => {
    if (!currentSentence || userAnswers.length === 0) return;

    const correctCount = userAnswers.filter(
      (answer) => answer.isCorrect
    ).length;
    const isAllCorrect = correctCount === currentSentence.blanks.length;
    const hasAnsweredAllBlanks =
      userAnswers.length === currentSentence.blanks.length;

    // Only mark as completed if all blanks are answered
    if (hasAnsweredAllBlanks) {
      setIsCompleted(true);
      setShowResult(true);
      setHasUserInteracted(true);

      if (isAllCorrect) {
        // Only add to score if this sentence hasn't been completed with perfect score yet
        if (!completedSentences.has(currentIndex)) {
          setScore((prev) => prev + 1);
          setCompletedSentences((prev) => new Set([...prev, currentIndex]));
        }
        toast({
          title: t("toast.success"),
          description: "Perfect! All blanks filled correctly! 🎉",
        });
      } else {
        toast({
          title: "Try Again",
          description: `${correctCount}/${currentSentence.blanks.length} correct. Try again! 💪`,
          variant: "destructive",
        });
      }
    } else {
      // Show message that all blanks must be filled
      toast({
        title: "Incomplete",
        description: `Please fill all ${currentSentence.blanks.length} blanks before checking answers. (${userAnswers.length}/${currentSentence.blanks.length} filled)`,
        variant: "destructive",
      });
    }
  }, [userAnswers, currentSentence, t]);

  const handleRestartGame = useCallback(() => {
    setCurrentIndex(0);
    setScore(0);
    setTimer(0);
    setGameComplete(false);
    setIsPlaying(false);
    setHasUserInteracted(false);
    setCompletedSentences(new Set());
  }, []);

  const handleShowAnswers = useCallback(() => {
    setShowCorrectAnswers(true);
    toast({
      title: "Answer Revealed",
      description: "Correct answers revealed! 📖",
    });
  }, []);

  const toggleHints = useCallback(() => {
    setHintsEnabled((prev) => {
      const newState = !prev;
      if (newState) {
        toast({
          title: "Hints Enabled",
          description: "💡 Incorrect answers will be highlighted.",
        });
      } else {
        toast({
          title: "Hints Disabled",
          description: "Hints disabled",
        });
      }
      return newState;
    });
  }, []);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const progress = useMemo(
    () =>
      ((currentIndex + (isCompleted ? 1 : 0)) / activeSentences.length) * 100,
    [currentIndex, isCompleted, activeSentences.length]
  );

  // Render sentence with blanks
  const renderSentenceWithBlanks = useCallback(() => {
    if (!currentSentence) return null;

    let sentence = currentSentence.sentence;
    const blanks = [...currentSentence.blanks].sort(
      (a, b) => b.position - a.position
    );

    // Replace each blank with a placeholder
    blanks.forEach((blank) => {
      const userAnswer = userAnswers.find((a) => a.blankId === blank.id);
      const blankElement = `<BLANK_${blank.id}>`;
      sentence =
        sentence.slice(0, blank.position) +
        blankElement +
        sentence.slice(blank.position + blank.correctAnswer.length);
    });

    // Split sentence by blanks and render
    const parts = sentence.split(/<BLANK_([^>]+)>/);

    return (
      <div className="text-lg leading-relaxed">
        {parts.map((part, index) => {
          if (index % 2 === 0) {
            // Regular text
            return <span key={index}>{part}</span>;
          } else {
            // Blank
            const blankId = part;
            const blank = currentSentence.blanks.find((b) => b.id === blankId);
            const userAnswer = userAnswers.find((a) => a.blankId === blankId);

            if (!blank) return null;

            return (
              <span key={index} className="mx-1 inline-block">
                <Select
                  value={userAnswer?.selectedAnswer || ""}
                  onValueChange={(value) => handleAnswerSelect(blankId, value)}
                  disabled={isCompleted}
                >
                  <SelectTrigger
                    className={cn(
                      "inline-flex h-8 w-auto min-w-[80px] px-3 py-1",
                      userAnswer?.isCorrect === true &&
                        hintsEnabled &&
                        "border-green-500 bg-green-50 dark:bg-green-950 dark:border-green-400",
                      userAnswer?.isCorrect === false &&
                        hintsEnabled &&
                        "border-red-500 bg-red-50 dark:bg-red-950 dark:border-red-400"
                    )}
                  >
                    <SelectValue placeholder="___" />
                  </SelectTrigger>
                  <SelectContent>
                    {blank.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </span>
            );
          }
        })}
      </div>
    );
  }, [
    currentSentence,
    userAnswers,
    isCompleted,
    hintsEnabled,
    handleAnswerSelect,
  ]);

  // Effect to check completion when game is finished
  useEffect(() => {
    if (gameComplete && !isAlreadyCompleted && !isScoreSaved) {
      saveGameResults();
    }
  }, [gameComplete, isAlreadyCompleted, isScoreSaved, saveGameResults]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Loading your sentences...</h3>
            <p className="text-muted-foreground text-sm">
              Preparing cloze test from lesson sentences
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Game complete screen
  if ((gameComplete && !isAlreadyCompleted) || isAlreadyCompleted) {
    // Use data from API if available, otherwise use current game data
    const apiData = activityLogData?.details;
    const displayScore = apiData?.totalScore ?? score;
    const displayTotal = apiData?.totalQuestions ?? activeSentences.length;
    const displayTime = apiData?.timeTaken ?? timer;
    const displayDifficulty = apiData?.difficulty ?? selectedDifficulty;

    const accuracy =
      displayTotal > 0 ? Math.round((displayScore / displayTotal) * 100) : 0;

    return (
      <Card className="mx-auto w-full">
        <CardContent className="p-8">
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
                🎉 Fantastic Work!
              </h1>
              <p className="text-muted-foreground text-xl">
                You completed {displayTotal} cloze test challenges
              </p>
              {apiData?.title && (
                <p className="text-muted-foreground text-lg">
                  📖 {apiData.title}
                </p>
              )}
            </div>

            {/* Stats Grid */}
            <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-4">
              <Card className="relative overflow-hidden">
                <CardContent className="p-6 text-center">
                  <Target className="mx-auto mb-3 h-8 w-8 text-blue-500" />
                  <div className="text-3xl font-bold text-blue-600">
                    {displayScore}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Perfect Scores
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden">
                <CardContent className="p-6 text-center">
                  <Zap className="mx-auto mb-3 h-8 w-8 text-green-500" />
                  <div className="text-3xl font-bold text-green-600">
                    {accuracy}%
                  </div>
                  <p className="text-muted-foreground text-sm">Accuracy</p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden">
                <CardContent className="p-6 text-center">
                  <Clock className="mx-auto mb-3 h-8 w-8 text-purple-500" />
                  <div className="text-3xl font-bold text-purple-600">
                    {formatTime(displayTime)}
                  </div>
                  <p className="text-muted-foreground text-sm">Total Time</p>
                </CardContent>
              </Card>

              {activityLogData?.xpEarned && (
                <Card className="relative overflow-hidden">
                  <CardContent className="p-6 text-center">
                    <Trophy className="mx-auto mb-3 h-8 w-8 text-yellow-500" />
                    <div className="text-3xl font-bold text-yellow-600">
                      +{activityLogData.xpEarned}
                    </div>
                    <p className="text-muted-foreground text-sm">XP Earned</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Start screen
  if (!isPlaying) {
    return (
      <div className="mx-auto space-y-6">
        {/* Header Section */}
        <Card className="mx-auto w-full">
          <CardHeader className="pb-6 text-center">
            <CardTitle className="text-2xl">Ready to Start?</CardTitle>
            <p className="text-muted-foreground">
              Fill in the blanks in sentences from this lesson
            </p>
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
                <p className="text-sm font-medium">Sentences</p>
                <p className="text-muted-foreground text-xs">
                  Ready to practice
                </p>
              </div>

              <div className="space-y-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm font-medium">Fill Blanks</p>
                <p className="text-muted-foreground text-xs">
                  {selectedDifficulty === "easy" && "1 blank each"}
                  {selectedDifficulty === "medium" && "2 blanks each"}
                  {selectedDifficulty === "hard" && "3 blanks each"}
                </p>
              </div>

              <div className="space-y-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <p className="text-sm font-medium">
                  ~
                  {selectedDifficulty === "easy"
                    ? "5"
                    : selectedDifficulty === "medium"
                      ? "10"
                      : "15"}{" "}
                  min
                </p>
                <p className="text-muted-foreground text-xs">Estimated time</p>
              </div>
            </div>

            <Separator />

            {/* Difficulty Selector */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="difficulty" className="text-sm font-medium">
                  Choose Difficulty Level
                </Label>
                <Select
                  value={selectedDifficulty}
                  onValueChange={(value: "easy" | "medium" | "hard") => {
                    setSelectedDifficulty(value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">🟢</span>
                        <span>Easy</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-600">🟡</span>
                        <span>Medium</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="hard">
                      <div className="flex items-center gap-2">
                        <span className="text-red-600">🔴</span>
                        <span>Hard</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Difficulty Description */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="mb-2 flex items-center gap-2">
                  {selectedDifficulty === "easy" && (
                    <span className="text-green-600">🟢</span>
                  )}
                  {selectedDifficulty === "medium" && (
                    <span className="text-yellow-600">🟡</span>
                  )}
                  {selectedDifficulty === "hard" && (
                    <span className="text-red-600">🔴</span>
                  )}
                  <span className="font-medium capitalize">
                    {selectedDifficulty} Mode
                  </span>
                </div>
                <p className="text-muted-foreground text-sm">
                  {selectedDifficulty === "easy" &&
                    "Perfect for beginners. One word will be missing from each sentence."}
                  {selectedDifficulty === "medium" &&
                    "Moderate challenge. Two words will be missing from each sentence."}
                  {selectedDifficulty === "hard" &&
                    "Maximum challenge. Three words will be missing from each sentence."}
                </p>
              </div>
            </div>

            <Button
              onClick={handleStartGame}
              size="lg"
              className="h-12 w-full"
              disabled={activeSentences.length === 0}
            >
              <Play className="mr-2 h-5 w-5" />
              {activeSentences.length === 0
                ? "No sentences available"
                : "Start Practice"}
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
            {currentIndex + 1} of {activeSentences.length}
          </span>
          <div className="flex items-center gap-4">
            <span>
              {score}/{activeSentences.length} perfect
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
                📖 {currentSentence.articleTitle}
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Fill in the missing words by selecting from the dropdown menus
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Hint Controls */}
          <div className="bg-muted/30 flex flex-wrap items-center gap-3 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Hints:</span>
            </div>
            <Button
              onClick={toggleHints}
              variant={hintsEnabled ? "default" : "outline"}
              size="sm"
              className="h-8"
            >
              {hintsEnabled ? (
                <Eye className="mr-1 h-3 w-3" />
              ) : (
                <EyeOff className="mr-1 h-3 w-3" />
              )}
              {hintsEnabled ? "Enabled" : "Disabled"}
            </Button>
          </div>

          {/* Sentence with Blanks */}
          <Card className="border-muted-foreground/25 bg-muted/10 border-2">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Target className="text-primary h-5 w-5" />
                  <p className="text-sm font-medium">
                    Complete the sentence by filling in the blanks:
                  </p>
                </div>

                <div className="bg-card rounded-lg border p-4">
                  {renderSentenceWithBlanks()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress indicator for current sentence */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Progress: {userAnswers.length}/{currentSentence.blanks.length}{" "}
              blanks filled
            </span>
            {userAnswers.length > 0 && (
              <span className="text-muted-foreground">
                Correct: {userAnswers.filter((a) => a.isCorrect).length}/
                {userAnswers.length}
              </span>
            )}
          </div>

          {/* Result Display */}
          {showResult && (
            <Card
              className={cn(
                "border-2",
                userAnswers.every((a) => a.isCorrect)
                  ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                  : "border-red-500 bg-red-50 dark:bg-red-950/20"
              )}
            >
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    {userAnswers.every((a) => a.isCorrect) ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600" />
                    )}
                    <h3 className="text-lg font-semibold">
                      {userAnswers.every((a) => a.isCorrect)
                        ? "Perfect! All blanks correct! 🎉"
                        : `${userAnswers.filter((a) => a.isCorrect).length}/${currentSentence.blanks.length} correct 💪`}
                    </h3>
                  </div>

                  {!userAnswers.every((a) => a.isCorrect) &&
                    showCorrectAnswers && (
                      <div className="space-y-3">
                        <Separator />
                        <div>
                          <h4 className="mb-3 font-medium">Correct Answers:</h4>
                          <div className="space-y-2">
                            {currentSentence.blanks.map((blank, index) => (
                              <div
                                key={blank.id}
                                className="flex gap-3 text-sm"
                              >
                                <span className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold">
                                  {index + 1}
                                </span>
                                <p className="flex-1">
                                  <span className="font-medium">
                                    {blank.correctAnswer}
                                  </span>
                                  {blank.hint && (
                                    <span className="text-muted-foreground ml-2">
                                      ({blank.hint})
                                    </span>
                                  )}
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

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={handleRestart}
              variant="outline"
              size="sm"
              className="sm:w-auto"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Answers
            </Button>

            {!isCompleted && userAnswers.length > 0 && (
              <Button
                onClick={handleCheckAnswer}
                variant="outline"
                size="sm"
                className="sm:w-auto"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Check Answers
              </Button>
            )}

            {isCompleted &&
              !userAnswers.every((a) => a.isCorrect) &&
              !showCorrectAnswers && (
                <Button
                  onClick={handleShowAnswers}
                  variant="secondary"
                  size="sm"
                  className="sm:w-auto"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Show Answers
                </Button>
              )}

            {isCompleted && (
              <Button onClick={handleNext} className="flex-1">
                {currentIndex < activeSentences.length - 1
                  ? "Next Sentence"
                  : "Finish Practice"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
