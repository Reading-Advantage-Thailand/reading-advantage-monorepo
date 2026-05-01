"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useScopedI18n } from "@/locales/client";
import Image from "next/image";
import "animate.css";
import { Button } from "../ui/button";
import { toast } from "../ui/use-toast";
import { Skeleton } from "../ui/skeleton";
import AudioButton from "../audio-button";
import {
  UserXpEarned,
  ActivityStatus,
  ActivityType,
} from "../models/user-activity-log-model";
import { levelCalculation } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  Shuffle,
  Plus,
  Type,
  Lightbulb,
  Volume2,
  Clock,
  Trophy,
  Target,
  Zap,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "../ui/progress";
import { Separator } from "../ui/separator";
import { AUDIO_URL } from "@/server/constants";

interface OrderWordData {
  id: string;
  articleId: string;
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
    timepoint?: number;
    endTimepoint?: number;
  }>;
  difficulty: "easy" | "medium" | "hard";
  context?: string;
  sentenceTranslations?: {
    th?: string;
    cn?: string;
    tw?: string;
    vi?: string;
  };
  timepoint?: number;
  endTimepoint?: number;
  audioUrl?: string;
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
  timepoint?: number;
  endTimepoint?: number;
}

type Props = {
  userId: string;
  articleId: string;
  onCompleteChange: (complete: boolean) => void;
};

export default function LessonOrderWords({
  userId,
  articleId,
  onCompleteChange,
}: Props) {
  const t = useScopedI18n("pages.student.practicePage");
  const tUpdateScore = useScopedI18n(
    "pages.student.practicePage.flashcardPractice"
  );
  const router = useRouter();

  // Game state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedWords, setSelectedWords] = useState<ClickableWord[]>([]);
  const [availableWords, setAvailableWords] = useState<ClickableWord[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isScoreSaved, setIsScoreSaved] = useState(false);
  const [isAlreadyCompleted, setIsAlreadyCompleted] = useState(false);
  const [activityData, setActivityData] = useState<any>(null);

  // Game data
  const [sentences, setSentences] = useState<OrderWordData[]>([]);

  // Hints
  const [isPlayingHintAudio, setIsPlayingHintAudio] = useState(false);
  const [showCorrectOrder, setShowCorrectOrder] = useState(false);
  const [audioHintsEnabled, setAudioHintsEnabled] = useState(false);

  // User interaction tracking
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  const currentSentence = useMemo(
    () => sentences[currentIndex],
    [sentences, currentIndex]
  );

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!gameComplete && sentences.length > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameComplete, sentences.length]);

  // Load sentences from API
  const loadSentences = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/v1/users/sentences/${userId}?articleId=${articleId}`
      );
      const data = await res.json();

      if (data.sentences && data.sentences.length > 0) {
        // Convert API data to game format
        const gameData: OrderWordData[] = data.sentences
          .slice(0, 10) // Limit to 10 sentences
          .map((sentence: any, index: number) => {
            const words = sentence.sentence.split(" ");
            const shuffledWords = shuffleWords(words);

            return {
              id: `sentence-${index}`,
              articleId: sentence.articleId,
              sentence: sentence.sentence,
              correctOrder: words,
              words: words.map((word: string, wordIndex: number) => ({
                id: `word-${index}-${wordIndex}`,
                text: word,
                audioUrl: sentence.audioUrl,
                startTime: sentence.timepoint,
                endTime: sentence.endTimepoint,
                timepoint: sentence.timepoint,
                endTimepoint: sentence.endTimepoint,
              })),
              difficulty: "medium" as const,
              sentenceTranslations: {
                th: sentence.translation?.th || "",
              },
              timepoint: sentence.timepoint,
              endTimepoint: sentence.endTimepoint,
              audioUrl: sentence.audioUrl,
            };
          });

        setSentences(gameData);
      } else {
        // No sentences available
        setSentences([]);
      }
    } catch (error) {
      console.error("Error loading sentences:", error);
      toast({
        title: t("toast.error"),
        description: t("toast.errorDescription"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check if activity is already completed
  const checkActivityCompletion = async () => {
    try {
      const res = await fetch(
        `/api/v1/users/${userId}/activitylog?articleId=${articleId}&activityType=sentence_word_ordering`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.activityLogs && data.activityLogs.length > 0) {
          const completedActivity = data.activityLogs.find(
            (log: any) => log.completed === true
          );
          if (completedActivity) {
            setActivityData(completedActivity);
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

  // Shuffle words function
  const shuffleWords = useCallback((words: string[]) => {
    const wordsToShuffle = [...words];
    for (let i = wordsToShuffle.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [wordsToShuffle[i], wordsToShuffle[j]] = [
        wordsToShuffle[j],
        wordsToShuffle[i],
      ];
    }
    return wordsToShuffle;
  }, []);

  // Initialize shuffled words when sentence changes
  useEffect(() => {
    if (currentSentence?.words) {
      const shuffled = currentSentence.words.map((word, index) => ({
        id: word.id,
        text: word.text,
        originalIndex: index,
        translation: word.translation,
        audioUrl: word.audioUrl,
        startTime: word.startTime,
        endTime: word.endTime,
        timepoint: word.timepoint,
        endTimepoint: word.endTimepoint,
      }));

      // Shuffle the words
      const shuffledWords = [...shuffled];
      for (let i = shuffledWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledWords[i], shuffledWords[j]] = [
          shuffledWords[j],
          shuffledWords[i],
        ];
      }

      setAvailableWords(shuffledWords);
      setSelectedWords([]);
      setShowResult(false);
      setIsCompleted(false);
      setHasUserInteracted(false);
      setShowCorrectOrder(false);
    }
  }, [currentSentence?.id]);

  // Check answer when selected words change
  useEffect(() => {
    if (!currentSentence?.correctOrder || selectedWords.length === 0) return;

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
        toast({
          title: t("toast.success"),
          description: "Perfect! Correct word order! 🎉",
        });
      }
    }
  }, [
    selectedWords,
    currentSentence?.correctOrder,
    isCompleted,
    hasUserInteracted,
    t,
  ]);

  // Save score when game completes
  useEffect(() => {
    const saveScore = async () => {
      if (
        gameComplete &&
        !isScoreSaved &&
        !isAlreadyCompleted &&
        sentences.length > 0
      ) {
        try {
          setIsScoreSaved(true);

          const updateScore = await fetch(
            `/api/v1/users/${userId}/activitylog`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                articleId: articleId,
                activityType: ActivityType.SentenceWordOrdering,
                activityStatus: ActivityStatus.Completed,
                xpEarned: UserXpEarned.Sentence_Word_Ordering,
                details: {
                  cefr_level: levelCalculation(
                    UserXpEarned.Sentence_Word_Ordering
                  ).cefrLevel,
                  score: score,
                  totalSentences: sentences.length,
                  timeTaken: timer,
                },
              }),
            }
          );

          if (updateScore?.status === 200) {
            router.refresh();
            toast({
              title: t("toast.success"),
              description: tUpdateScore("yourXp", {
                xp: UserXpEarned.Sentence_Word_Ordering,
              }),
            });
          }
        } catch (error) {
          console.error("Error saving score:", error);
          setIsScoreSaved(false);
          toast({
            title: t("toast.error"),
            description: t("toast.errorDescription"),
            variant: "destructive",
          });
        }
      }
    };

    saveScore();
  }, [
    gameComplete,
    isScoreSaved,
    isAlreadyCompleted,
    sentences.length,
    userId,
    articleId,
    score,
    timer,
    router,
    t,
    tUpdateScore,
  ]);

  // Load initial data
  useEffect(() => {
    loadSentences();
    checkActivityCompletion();
  }, []);

  // Update completion state
  useEffect(() => {
    if (gameComplete || isAlreadyCompleted) {
      onCompleteChange(true);
    }
  }, [gameComplete, isAlreadyCompleted, onCompleteChange]);

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
    []
  );

  const handleNext = useCallback(() => {
    if (currentIndex < sentences.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setGameComplete(true);
    }
  }, [currentIndex, sentences.length]);

  const toggleAudioHints = useCallback(() => {
    setAudioHintsEnabled((prev) => !prev);
  }, []);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const progress = useMemo(
    () => ((currentIndex + (isCompleted ? 1 : 0)) / sentences.length) * 100,
    [currentIndex, isCompleted, sentences.length]
  );

  const isCorrect = useMemo(() => {
    const userWordOrder = selectedWords.map((item) => item.text);
    return (
      JSON.stringify(userWordOrder) ===
      JSON.stringify(currentSentence?.correctOrder || [])
    );
  }, [selectedWords, currentSentence?.correctOrder]);

  const handleRestart = useCallback(() => {
    if (currentSentence?.words) {
      console.log("Reset - Score Before:", score);

      // If the current sentence was completed correctly (showing result and is correct), decrease score
      if (showResult && isCorrect && score > 0) {
        console.log("Decreasing score by 1");
        setScore((prev) => Math.max(0, prev - 1));
      }

      const shuffled = currentSentence.words.map((word, index) => ({
        id: word.id,
        text: word.text,
        originalIndex: index,
        translation: word.translation,
        audioUrl: word.audioUrl,
        startTime: word.startTime,
        endTime: word.endTime,
        timepoint: word.timepoint,
        endTimepoint: word.endTimepoint,
      }));

      // Shuffle the words
      const shuffledWords = [...shuffled];
      for (let i = shuffledWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledWords[i], shuffledWords[j]] = [
          shuffledWords[j],
          shuffledWords[i],
        ];
      }

      setAvailableWords(shuffledWords);
      setSelectedWords([]);
      setShowResult(false);
      setIsCompleted(false);
      setHasUserInteracted(false);
      setShowCorrectOrder(false);
      setAudioHintsEnabled(false);
    }
  }, [currentSentence?.words, score, showResult, isCorrect]);

  const handleCheckAnswer = useCallback(() => {
    if (!currentSentence?.correctOrder || selectedWords.length === 0) return;

    const userWordOrder = selectedWords.map((item) => item.text);
    const isCorrectAnswer =
      JSON.stringify(userWordOrder) ===
      JSON.stringify(currentSentence.correctOrder);

    setIsCompleted(true);
    setShowResult(true);
    setHasUserInteracted(true);

    if (isCorrectAnswer) {
      setScore((prev) => prev + 1);
      toast({
        title: t("toast.success"),
        description: "Perfect! Correct word order! 🎉",
      });
    } else {
      toast({
        title: t("toast.error"),
        description: "Not quite right. Try again! 💪",
        variant: "destructive",
      });
    }
  }, [selectedWords, currentSentence?.correctOrder, t]);

  const handleShowAnswer = useCallback(() => {
    setShowCorrectOrder(true);
    toast({
      title: "Answer Revealed",
      description: "Correct order revealed! 📖",
    });
  }, []);

  const formedSentence = useMemo(() => {
    return selectedWords.map((word) => word.text).join(" ");
  }, [selectedWords]);

  const getSentenceTranslation = useCallback(() => {
    if (!currentSentence?.sentenceTranslations) return null;
    return currentSentence.sentenceTranslations.th;
  }, [currentSentence]);

  // Loading state
  if (isLoading) {
    return (
      <div className="mt-5">
        <div className="grid w-full gap-10">
          <div className="mx-auto px-12 xl:h-[400px] w-full md:w-[725px] xl:w-[710px] space-y-6 mt-5">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[20px] w-2/3" />
            <Skeleton className="h-[20px] w-full" />
            <Skeleton className="h-[20px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  // No sentences available
  if (sentences.length === 0) {
    return (
      <div className="mt-5">
        <div className="text-center xl:h-[400px] w-full space-y-6 mt-5 flex flex-col items-center justify-center">
          <div className="text-4xl mb-4">📚</div>
          <h3 className="text-lg font-semibold text-orange-700 dark:text-orange-300 mb-2">
            Need More Sentences
          </h3>
          <p className="text-orange-600 dark:text-orange-400">
            You need to collect at least 5 sentences in Phase 6 to practice word
            ordering.
          </p>
        </div>
      </div>
    );
  }

  // Game complete screen
  if (gameComplete || isAlreadyCompleted) {
    // Use data from API if available, otherwise use current game data
    const displayScore = activityData?.details?.score || score;
    const displayTotalSentences =
      activityData?.details?.totalSentences || sentences.length;
    const displayTimeTaken = activityData?.details?.timeTaken || timer;
    const displayTitle =
      activityData?.details?.title || "Word Ordering Practice";
    const displayLevel = activityData?.details?.level || "";
    const displayCefrLevel = activityData?.details?.cefr_level || "";
    const displayGenre = activityData?.details?.genre || "";
    const displaySubgenre =
      activityData?.details?.subgenre || activityData?.details?.subGenre || "";
    const displayXpEarned =
      activityData?.xpEarned || UserXpEarned.Sentence_Word_Ordering;

    const accuracy =
      displayTotalSentences > 0
        ? Math.round((displayScore / displayTotalSentences) * 100)
        : 0;

    return (
      <div className="mt-5">
        <Card className="max-w-4xl mx-auto">
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
                <h1 className="text-4xl font-bold md:text-5xl">
                  🎉 Amazing Work!
                </h1>
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xl">
                    You completed {displayTotalSentences} word ordering
                    challenges
                  </p>
                  {displayTitle && (
                    <p className="text-lg font-semibold text-blue-600">
                      {displayTitle}
                    </p>
                  )}
                  {(displayLevel || displayCefrLevel || displayGenre) && (
                    <div className="flex flex-wrap justify-center gap-2 text-sm text-muted-foreground">
                      {displayLevel && <span>Level {displayLevel}</span>}
                      {displayCefrLevel && <span>• {displayCefrLevel}</span>}
                      {displayGenre && <span>• {displayGenre}</span>}
                      {displaySubgenre && <span>• {displaySubgenre}</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="mx-auto grid max-w-2xl grid-cols-1 gap-6 md:grid-cols-4">
                <Card className="relative overflow-hidden">
                  <CardContent className="p-6 text-center">
                    <Target className="mx-auto mb-3 h-8 w-8 text-blue-500" />
                    <div className="text-2xl font-bold text-blue-600">
                      {accuracy}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Accuracy
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                  <CardContent className="p-6 text-center">
                    <Zap className="mx-auto mb-3 h-8 w-8 text-green-500" />
                    <div className="text-2xl font-bold text-green-600">
                      {displayScore}/{displayTotalSentences}
                    </div>
                    <div className="text-sm text-muted-foreground">Correct</div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                  <CardContent className="p-6 text-center">
                    <Clock className="mx-auto mb-3 h-8 w-8 text-purple-500" />
                    <div className="text-2xl font-bold text-purple-600">
                      {formatTime(displayTimeTaken)}
                    </div>
                    <div className="text-sm text-muted-foreground">Time</div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                  <CardContent className="p-6 text-center">
                    <Trophy className="mx-auto mb-3 h-8 w-8 text-yellow-500" />
                    <div className="text-2xl font-bold text-yellow-600">
                      +{displayXpEarned}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      XP Earned
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentSentence) {
    return (
      <div className="mt-5">
        <div className="text-center">
          <p className="text-muted-foreground">Loading next challenge...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <span>
            {currentIndex + 1} of {sentences.length}
          </span>
          <div className="flex items-center gap-4">
            <span>
              {score}/{sentences.length} correct
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
                {t("orderWordsPractice.tryToSortThisSentence")}
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Click words below to form the correct sentence
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Translation and Audio */}
          <div className="flex justify-center gap-2 px-2 mb-5">
            <Image
              src={"/man-mage-light.svg"}
              alt="Man"
              width={92}
              height={115}
              className="animate__animated animate__tada"
            />
            <div className="relative ml-2 w-fit rounded-2xl border-2 border-gray-200 p-4">
              {getSentenceTranslation() && (
                <div className="mb-3">
                  <p className="text-sm text-muted-foreground">Translation:</p>
                  <p>{getSentenceTranslation()}</p>
                </div>
              )}
              <div className="pt-3">
                <AudioButton
                  key={currentIndex}
                  audioUrl={`https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/${AUDIO_URL}/${currentSentence.audioUrl}`}
                  startTimestamp={currentSentence.timepoint || 0}
                  endTimestamp={currentSentence.endTimepoint || 0}
                />
              </div>
              <div
                className="absolute h-4 w-4 rotate-45 border-b-2 border-l-2 border-gray-200 bg-white dark:bg-[#020817]"
                style={{
                  top: "calc(50% - 8px)",
                  left: "-10px",
                }}
              ></div>
            </div>
          </div>

          {/* Sentence Formation Area */}
          <div className="min-h-[120px] rounded-lg border-2 border-dashed border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 p-4 dark:border-blue-800 dark:from-blue-950/20 dark:to-purple-950/20">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Your sentence:</span>
              </div>

              <div className="flex min-h-[60px] flex-wrap gap-1 border-b-2 border-t-2 border-gray-200 py-1">
                {selectedWords.map((word, i) => (
                  <button
                    key={word.id}
                    className="rounded-2xl border-2 border-b-4 border-gray-200 p-2 hover:bg-gray-50"
                    onClick={() => handleSelectedWordClick(word, i)}
                  >
                    {word.text}
                  </button>
                ))}
              </div>

              {formedSentence && (
                <div className="rounded-lg border border-green-200 bg-white/50 p-3 dark:border-green-800 dark:bg-gray-800/50">
                  <p className="text-sm font-medium">{formedSentence}</p>
                </div>
              )}
            </div>
          </div>

          {/* Hint Controls */}
          <div className="bg-muted/30 flex flex-wrap items-center gap-3 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Hints:</span>
            </div>

            <Button
              onClick={toggleAudioHints}
              variant={audioHintsEnabled ? "default" : "outline"}
              size="sm"
              className="h-8"
            >
              <Volume2 className="mr-1 h-3 w-3" />
              Audio
            </Button>
          </div>

          {/* Available Words Bank */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Plus className="text-muted-foreground h-4 w-4" />
              <p className="text-sm font-medium">
                Click words to add them to your sentence (
                {availableWords.length} remaining)
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-1">
              {availableWords.map((word) => (
                <button
                  key={word.id}
                  className="rounded-2xl border-2 border-b-4 border-gray-200 p-2 hover:bg-gray-50"
                  onClick={() => handleWordClick(word)}
                >
                  {word.text}
                </button>
              ))}
            </div>
          </div>

          {/* Result Display */}
          {showResult && (
            <Card
              className={cn(
                "border-2",
                isCorrect
                  ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                  : "border-red-500 bg-red-50 dark:bg-red-950/20"
              )}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  {isCorrect ? (
                    <>
                      <CheckCircle className="h-6 w-6 text-green-600" />
                      <div>
                        <h3 className="font-semibold text-green-800">
                          Perfect! ✨
                        </h3>
                        <p className="text-sm text-green-600">
                          You got the correct word order!
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-6 w-6 text-red-600" />
                      <div>
                        <h3 className="font-semibold text-red-800">
                          Not quite right
                        </h3>
                        <p className="text-sm text-red-600">
                          Try rearranging the words
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {showCorrectOrder && !isCorrect && (
                  <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded">
                    <p className="text-sm font-medium mb-1">Correct order:</p>
                    <p className="text-sm">
                      {currentSentence.correctOrder.join(" ")}
                    </p>
                  </div>
                )}
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
              {showCorrectOrder || isCompleted ? "Try Again" : "Shuffle Words"}
            </Button>

            {!isCompleted && selectedWords.length > 0 && (
              <Button
                onClick={handleCheckAnswer}
                variant="outline"
                size="sm"
                className="sm:w-auto"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Check Answer
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
                Show Answer
              </Button>
            )}

            {isCompleted && (
              <Button onClick={handleNext} className="flex-1">
                {currentIndex < sentences.length - 1
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
