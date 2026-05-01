"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/header";
import Image from "next/image";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  GripVertical,
  Lightbulb,
  Loader2,
  Play,
  RotateCcw,
  Shuffle,
  Target,
  Trophy,
  Volume2,
  XCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { levelCalculation, splitTextIntoSentences } from "@/lib/utils";
import {
  UserXpEarned,
  ActivityStatus,
  ActivityType,
} from "../models/user-activity-log-model";
import "animate.css";
import { AUDIO_URL } from "@/server/constants";

interface OrderSentenceData {
  id: string;
  articleId: string;
  articleTitle: string;
  correctOrder: string[];
  sentences: Array<{
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
  }>;
  difficulty: "easy" | "medium" | "hard";
  startIndex: number;
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
}

type Props = {
  userId: string;
  articleId: string;
  onCompleteChange: (complete: boolean) => void;
};

export default React.memo(function LessonOrderSentences({
  userId,
  articleId,
  onCompleteChange,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userOrder, setUserOrder] = useState<DraggableSentence[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const timerRef = useRef(0);
  const [displayTimer, setDisplayTimer] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState<DraggableSentence | null>(
    null
  );
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isPlayingHintAudio, setIsPlayingHintAudio] = useState(false);
  const [showCorrectOrder, setShowCorrectOrder] = useState(false);
  const [highlightHintsEnabled, setHighlightHintsEnabled] = useState(false);
  const [audioHintsEnabled, setAudioHintsEnabled] = useState(false);
  const [activeSentences, setActiveSentences] = useState<OrderSentenceData[]>(
    []
  );
  const [sentenceResults, setSentenceResults] = useState<
    Array<{ sentenceId: string; isCorrect: boolean }>
  >([]);
  const [completedActivityData, setCompletedActivityData] = useState<any>(null);

  // Check if activity already exists
  const checkExistingActivity = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/v1/users/${userId}/activitylog?articleId=${articleId}&activityType=sentence_ordering`
      );
      if (response.ok) {
        const data = await response.json();
        const existingActivity = data.activityLogs?.find(
          (activity: any) =>
            activity.activityType === "sentence_ordering" &&
            activity.targetId === articleId &&
            activity.completed
        );

        if (existingActivity) {
          setIsCompleted(true);
          setGameComplete(true);
          setCompletedActivityData(existingActivity);
          onCompleteChange(true);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error checking existing activity:", error);
      return false;
    }
  }, [userId, articleId, onCompleteChange]);

  // Load sentences from article
  const loadSentencesFromArticle = useCallback(async () => {
    setIsLoading(true);

    try {
      // First check if activity already exists
      const activityExists = await checkExistingActivity();
      if (activityExists) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(`/api/v1/articles/${articleId}`);

      if (response.ok) {
        const data = await response.json();

        // Use timepoints data instead of splitting passage
        const timepoints = data.article.timepoints || [];

        if (timepoints.length < 5) {
          toast({
            title: "Error",
            description: "Not enough sentences available for ordering",
            variant: "destructive",
          });
          return;
        }

        // Create sentence groups (5 consecutive sentences each)
        const sentenceGroups: OrderSentenceData[] = [];
        const maxGroups = Math.min(3, timepoints.length - 4); // Ensure we have at least 5 sentences

        for (let i = 0; i < maxGroups; i++) {
          // Select 5 consecutive sentences randomly
          const startIndex = Math.floor(
            Math.random() * (timepoints.length - 4)
          );
          const selectedTimepoints = timepoints.slice(
            startIndex,
            startIndex + 5
          );

          const sentenceGroup: OrderSentenceData = {
            id: `group-${i}-${Date.now()}`,
            articleId: articleId,
            articleTitle: data.article.title,
            correctOrder: selectedTimepoints.map((tp: any) => tp.sentences),
            sentences: selectedTimepoints.map((tp: any, index: number) => ({
              id: `sentence-${tp.index}-${Date.now()}-${index}`,
              text: tp.sentences,
              originalIndex: tp.index,
              audioUrl: `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/${AUDIO_URL}/${tp.file}`,
              startTime: tp.timeSeconds,
              endTime:
                index < 4
                  ? selectedTimepoints[index + 1].timeSeconds
                  : timepoints[startIndex + 5]
                    ? timepoints[startIndex + 5].timeSeconds - 0.5
                    : tp.timeSeconds + 4,
            })),
            difficulty: "medium" as const,
            startIndex,
          };

          sentenceGroups.push(sentenceGroup);
        }

        setActiveSentences(sentenceGroups);
      } else {
        toast({
          title: "Error",
          description: "Failed to load article sentences",
          variant: "destructive",
        });
      }
    } catch (error) {
      if (error instanceof Error) {
        console.warn("Failed to load sentences:", error.message);
      }
      toast({
        title: "Error",
        description: "Failed to load sentences",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [articleId, checkExistingActivity, toast]);

  useEffect(() => {
    if (userId && articleId) {
      loadSentencesFromArticle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, articleId]);

  const currentSentenceGroup = useMemo(
    () => activeSentences[currentIndex],
    [activeSentences, currentIndex]
  );

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && !gameComplete) {
      interval = setInterval(() => {
        timerRef.current += 1;
        setDisplayTimer(timerRef.current);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, gameComplete]);

  // Shuffle sentences function
  const shuffleSentences = useCallback(
    (sentences: typeof currentSentenceGroup.sentences) => {
      const sentencesToShuffle = [...sentences];

      for (let i = sentencesToShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sentencesToShuffle[i], sentencesToShuffle[j]] = [
          sentencesToShuffle[j],
          sentencesToShuffle[i],
        ];
      }

      return sentencesToShuffle.map((sentence, index) => ({
        id: `${sentence.id}-shuffled-${Date.now()}-${index}`,
        text: sentence.text,
        originalIndex: sentences.findIndex((s) => s.id === sentence.id),
        translation: sentence.translation,
        audioUrl: sentence.audioUrl,
        startTime: sentence.startTime,
        endTime: sentence.endTime,
      }));
    },
    []
  );

  // Initialize shuffled sentences when sentence group changes
  useEffect(() => {
    if (currentSentenceGroup?.sentences) {
      setUserOrder(shuffleSentences(currentSentenceGroup.sentences));
      setShowResult(false);
      setIsCompleted(false);
      setHasUserInteracted(false);
      setShowCorrectOrder(false);
    }
  }, [currentSentenceGroup?.id, shuffleSentences]);

  // Check answer when order changes
  useEffect(() => {
    if (!currentSentenceGroup?.correctOrder || userOrder.length === 0) return;

    if (
      userOrder.length === currentSentenceGroup.sentences.length &&
      !isCompleted &&
      hasUserInteracted
    ) {
      const userSentenceOrder = userOrder.map((item) => item.text);
      const isCorrect =
        JSON.stringify(userSentenceOrder) ===
        JSON.stringify(currentSentenceGroup.correctOrder);

      if (isCorrect) {
        setIsCompleted(true);
        setShowResult(true);
        setScore((prev) => prev + 1);
        setSentenceResults((prev) => [
          ...prev,
          { sentenceId: currentSentenceGroup.id, isCorrect: true },
        ]);
        toast({
          title: "Perfect!",
          description: "Correct sentence order! 🎉",
        });
      }
    }
  }, [
    userOrder,
    currentSentenceGroup?.correctOrder,
    currentSentenceGroup?.id,
    isCompleted,
    hasUserInteracted,
    toast,
  ]);

  // Drag handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, item: DraggableSentence) => {
      setDraggedItem(item);
      e.dataTransfer.effectAllowed = "move";
    },
    []
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
        (item) => item.id === draggedItem.id
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
      setHasUserInteracted(true);
    },
    [draggedItem, userOrder]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDragOverIndex(null);
  }, []);

  const handleStartGame = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handleNext = useCallback(async () => {
    if (!isCompleted && currentSentenceGroup) {
      setSentenceResults((prev) => [
        ...prev,
        { sentenceId: currentSentenceGroup.id, isCorrect: false },
      ]);
    }

    if (currentIndex < activeSentences.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      await saveGameResults();
      setGameComplete(true);
      setIsPlaying(false);
      onCompleteChange(true);
    }
  }, [
    currentIndex,
    activeSentences.length,
    isCompleted,
    currentSentenceGroup,
    onCompleteChange,
  ]);

  const saveGameResults = useCallback(async () => {
    try {
      const gameSession = `lesson-sentence-ordering-${Date.now()}`;

      const response = await fetch(`/api/v1/users/${userId}/activitylog`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          articleId: articleId,
          activityType: ActivityType.SentenceOrdering,
          activityStatus: ActivityStatus.Completed,
          xpEarned: UserXpEarned.Sentence_Ordering,
          timeTaken: timerRef.current,
          details: {
            cefr_level: levelCalculation(UserXpEarned.Sentence_Ordering)
              .cefrLevel,
            totalQuestions: activeSentences.length,
            correctAnswers: score,
            gameSession: gameSession,
            sentenceResults: sentenceResults,
          },
        }),
      });

      if (response.ok) {
        toast({
          title: "Great Job!",
          description: `You earned ${UserXpEarned.Sentence_Ordering} XP! 🎉`,
        });
      } else {
        console.error("Failed to save game results");
      }
    } catch (error) {
      console.error("Error saving game results:", error);
    }
  }, [
    userId,
    articleId,
    activeSentences.length,
    score,
    sentenceResults,
    toast,
  ]);

  const handleRestart = useCallback(() => {
    if (currentSentenceGroup?.sentences) {
      setUserOrder(shuffleSentences(currentSentenceGroup.sentences));
      setShowResult(false);
      setIsCompleted(false);
      setHasUserInteracted(false);
      setShowCorrectOrder(false);
      setHighlightHintsEnabled(false);
      setAudioHintsEnabled(false);
      // Decrease score by 1 when restarting (if score > 0)
      if (score > 0) {
        setScore((prev) => prev - 1);
      }
    }
  }, [currentSentenceGroup?.sentences, shuffleSentences, score]);

  const handleCheckAnswer = useCallback(() => {
    if (!currentSentenceGroup?.correctOrder || userOrder.length === 0) return;

    const userSentenceOrder = userOrder.map((item) => item.text);
    const isCorrect =
      JSON.stringify(userSentenceOrder) ===
      JSON.stringify(currentSentenceGroup.correctOrder);

    setIsCompleted(true);
    setShowResult(true);
    setHasUserInteracted(true);

    if (isCorrect) {
      setScore((prev) => prev + 1);
      setSentenceResults((prev) => [
        ...prev,
        { sentenceId: currentSentenceGroup.id, isCorrect: true },
      ]);
      toast({
        title: "Perfect!",
        description: "Correct sentence order! 🎉",
      });
    } else {
      setSentenceResults((prev) => [
        ...prev,
        { sentenceId: currentSentenceGroup.id, isCorrect: false },
      ]);
      toast({
        title: "Not quite right",
        description: "Try again! 💪",
        variant: "destructive",
      });
    }
  }, [
    userOrder,
    currentSentenceGroup?.correctOrder,
    currentSentenceGroup?.id,
    toast,
  ]);

  const handleShowAnswer = useCallback(() => {
    setShowCorrectOrder(true);
    toast({
      title: "Answer revealed",
      description: "Correct order revealed! 📖",
    });
  }, [toast]);

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
    [currentSentenceGroup?.correctOrder, highlightHintsEnabled]
  );

  const toggleHighlightHints = useCallback(() => {
    setHighlightHintsEnabled((prev) => !prev);
  }, []);

  const toggleAudioHints = useCallback(() => {
    setAudioHintsEnabled((prev) => !prev);
  }, []);

  // Play hint audio function - plays sentences in correct order
  const playHintAudio = useCallback(async () => {
    if (
      !currentSentenceGroup?.sentences ||
      isPlayingHintAudio ||
      !audioRef.current
    )
      return;

    setIsPlayingHintAudio(true);
    toast({
      title: "Playing audio",
      description: "Playing sentences in correct order 🔊",
    });

    try {
      const audio = audioRef.current;

      // Get sentences in correct order based on correctOrder array
      const correctOrderSentences = currentSentenceGroup.correctOrder
        .map((correctText: string) =>
          currentSentenceGroup.sentences.find((s) => s.text === correctText)
        )
        .filter(Boolean);

      // Play each sentence sequentially
      for (let i = 0; i < correctOrderSentences.length; i++) {
        const sentence = correctOrderSentences[i];

        if (sentence?.audioUrl && sentence.startTime !== undefined) {
          try {
            await new Promise<void>((resolve) => {
              let timeoutRef: NodeJS.Timeout | null = null;

              const cleanup = () => {
                if (timeoutRef) clearTimeout(timeoutRef);
                audio.removeEventListener("canplaythrough", handleCanPlay);
                audio.removeEventListener("error", handleError);
              };

              const handleCanPlay = () => {
                cleanup();
                audio.currentTime = sentence.startTime!;

                // Calculate max duration for this sentence
                const maxDuration = sentence.endTime
                  ? sentence.endTime - sentence.startTime!
                  : 5;

                const handleTimeUpdate = () => {
                  // Stop at end time or after 5 seconds max
                  if (
                    audio.currentTime >=
                    (sentence.endTime || sentence.startTime! + maxDuration)
                  ) {
                    audio.pause();
                    audio.removeEventListener("timeupdate", handleTimeUpdate);
                    resolve();
                  }
                };

                audio.addEventListener("timeupdate", handleTimeUpdate);

                audio
                  .play()
                  .then(() => {
                    // Set backup timeout
                    timeoutRef = setTimeout(
                      () => {
                        audio.pause();
                        audio.removeEventListener(
                          "timeupdate",
                          handleTimeUpdate
                        );
                        resolve();
                      },
                      maxDuration * 1000 + 500
                    );
                  })
                  .catch(() => resolve());
              };

              const handleError = () => {
                cleanup();
                resolve();
              };

              audio.addEventListener("canplaythrough", handleCanPlay);
              audio.addEventListener("error", handleError);
              audio.src = sentence.audioUrl!;
              audio.load();

              // Fallback timeout
              setTimeout(() => {
                cleanup();
                resolve();
              }, 10000);
            });

            // Delay between sentences
            if (i < correctOrderSentences.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          } catch (error) {
            console.warn(`Failed to play audio for sentence ${i + 1}:`, error);
          }
        }
      }

      toast({
        title: "Audio completed",
        description: "Correct order audio sequence completed! 🎵",
      });
    } catch (error) {
      console.warn("Error playing hint audio:", error);
      toast({
        title: "Error",
        description: "Failed to play hint audio",
        variant: "destructive",
      });
    } finally {
      setIsPlayingHintAudio(false);
    }
  }, [currentSentenceGroup, isPlayingHintAudio, toast]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-2 mt-4">
        <div className="grid w-full gap-10">
          <div className="mx-auto w-full px-16 xl:h-[400px] md:w-[725px] xl:w-[710px] space-y-6 mt-5">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[20px] w-2/3" />
            <Skeleton className="h-[20px] w-full" />
            <Skeleton className="h-[20px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Game complete screen
  if (gameComplete) {
    // Use data from API if available, otherwise use current game data
    const activityData = completedActivityData?.details;
    const finalScore = activityData?.correctAnswers ?? score;
    const totalQuestions =
      activityData?.totalQuestions ?? activeSentences.length;
    const timeTaken = completedActivityData?.timeTaken ?? displayTimer;
    const xpEarned = completedActivityData?.xpEarned ?? 0;
    const accuracy = Math.round((finalScore / totalQuestions) * 100);
    const articleTitle = activityData?.title || "Article";

    return (
      <div className="flex flex-col items-center justify-center space-y-4 mt-4">
        <Card className="w-full max-w-4xl">
          <CardContent className="p-8">
            <div className="text-center space-y-8">
              {/* Title Section */}
              <div className="space-y-4">
                <div className="flex space-x-4 items-center justify-center">
                  <h1 className="pb-6 text-4xl font-bold md:text-6xl bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 bg-clip-text text-transparent animate-pulse">
                    🎉 Outstanding!
                  </h1>
                  <div className="relative">
                    <div className="animate-bounce">
                      <Trophy className="mx-auto h-20 w-20 text-yellow-500 drop-shadow-lg" />
                    </div>
                    <div className="absolute -top-2 -right-2 animate-pulse">
                      <div className="h-6 w-6 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-muted-foreground text-xl md:text-2xl font-medium">
                  {completedActivityData
                    ? "Previously completed"
                    : "Congratulations!"}
                </p>
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-xl p-4 max-w-md mx-auto">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    📖 {articleTitle}
                  </p>
                </div>
              </div>

              {/* Statistics Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                  <Target className="mx-auto mb-3 h-10 w-10 text-blue-600" />
                  <div className="text-3xl font-bold text-blue-700 dark:text-blue-400 mb-1">
                    {finalScore}/{totalQuestions}
                  </div>
                  <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                    Correct Answers
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 rounded-xl p-6 border border-green-200 dark:border-green-800">
                  <Zap className="mx-auto mb-3 h-10 w-10 text-green-600" />
                  <div className="text-3xl font-bold text-green-700 dark:text-green-400 mb-1">
                    {accuracy}%
                  </div>
                  <p className="text-green-600 dark:text-green-400 text-sm font-medium">
                    Accuracy
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                  <Clock className="mx-auto mb-3 h-10 w-10 text-purple-600" />
                  <div className="text-3xl font-bold text-purple-700 dark:text-purple-400 mb-1">
                    {formatTime(timeTaken)}
                  </div>
                  <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">
                    Time Taken
                  </p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50 rounded-xl p-6 border border-orange-200 dark:border-orange-800">
                  <Trophy className="mx-auto mb-3 h-10 w-10 text-orange-600" />
                  <div className="text-3xl font-bold text-orange-700 dark:text-orange-400 mb-1">
                    +{xpEarned}
                  </div>
                  <p className="text-orange-600 dark:text-orange-400 text-sm font-medium">
                    XP Earned
                  </p>
                </div>
              </div>

              {/* Performance Badge */}
              <div className="flex justify-center">
                {accuracy === 100 ? (
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-8 py-4 rounded-full shadow-lg">
                    <div className="flex items-center gap-3">
                      <Trophy className="h-6 w-6" />
                      <span className="font-bold text-lg">
                        Perfect Score! 🏆
                      </span>
                    </div>
                  </div>
                ) : accuracy >= 80 ? (
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-4 rounded-full shadow-lg">
                    <div className="flex items-center gap-3">
                      <Zap className="h-6 w-6" />
                      <span className="font-bold text-lg">
                        Excellent Work! ⭐
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-4 rounded-full shadow-lg">
                    <div className="flex items-center gap-3">
                      <Target className="h-6 w-6" />
                      <span className="font-bold text-lg">Good Effort! 👍</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Start screen
  if (!isPlaying && activeSentences.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-2 mt-4 ">
        <Card className="w-full">
          <CardHeader className="pb-6 text-center">
            <CardTitle className="text-2xl">Ready to Start?</CardTitle>
            <p className="text-muted-foreground">
              Arrange sentences in the correct chronological order
            </p>
          </CardHeader>

          <CardContent className="space-y-8">
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2 text-center">
                <div className="bg-primary/10 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
                  <span className="text-lg font-bold">
                    {activeSentences.length}
                  </span>
                </div>
                <p className="text-sm font-medium">Sentence Groups</p>
                <p className="text-muted-foreground text-xs">Ready to order</p>
              </div>

              <div className="space-y-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                  <GripVertical className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm font-medium">Drag & Drop</p>
                <p className="text-muted-foreground text-xs">
                  Easy interaction
                </p>
              </div>

              <div className="space-y-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <p className="text-sm font-medium">~5 min</p>
                <p className="text-muted-foreground text-xs">Estimated time</p>
              </div>
            </div>

            <Separator />

            <div className="bg-muted/50 space-y-3 rounded-lg p-6">
              <div className="flex items-center gap-2">
                <div className="bg-primary h-2 w-2 rounded-full" />
                <p className="text-sm font-medium">Instructions</p>
              </div>
              <ul className="text-muted-foreground ml-4 space-y-2 text-sm">
                <li>
                  • Drag and drop sentences to arrange them in chronological
                  order
                </li>
                <li>• Use hint features if you need help</li>
                <li>• Complete all sentence groups to finish this phase</li>
              </ul>
            </div>

            <Button onClick={handleStartGame} size="lg" className="h-12 w-full">
              <Play className="mr-2 h-5 w-5" />
              Start Game!
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No sentences loaded but not loading
  if (!isLoading && activeSentences.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 mt-4">
        <Card className="mx-auto max-w-2xl">
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-semibold mb-2">
              No sentences available
            </h3>
            <p className="text-muted-foreground mb-4">
              Unable to load sentences for this article. Please try again.
            </p>
            <Button onClick={() => loadSentencesFromArticle()}>
              Try Again
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
          <p className="text-muted-foreground">Loading next challenge...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-4 mt-4">
      {/* Hidden audio element for playback */}
      <audio ref={audioRef} style={{ display: "none" }} />

      {/* Progress Bar */}
      <div className="w-full max-w-4xl space-y-2">
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
              {formatTime(displayTimer)}
            </span>
          </div>
        </div>
        <Progress value={progress} className="h-1" />
      </div>

      {/* Game Card */}
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-3">
              <CardTitle className="text-xl">
                📖 {currentSentenceGroup?.articleTitle}
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Arrange these 5 sentences in chronological order
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

            <div className="flex items-center gap-2">
              <Button
                onClick={toggleHighlightHints}
                variant={highlightHintsEnabled ? "default" : "outline"}
                size="sm"
                className="h-8"
              >
                <Target className="mr-1 h-3 w-3" />
                Highlight
              </Button>
            </div>

            <div className="flex items-center gap-2">
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

            {/* Audio Play Button - Only show when audio hints are enabled */}
            {audioHintsEnabled && (
              <>
                <Separator orientation="vertical" className="h-6" />
                <Button
                  onClick={playHintAudio}
                  disabled={isPlayingHintAudio}
                  size="sm"
                  className="h-8"
                  variant="secondary"
                >
                  {isPlayingHintAudio ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Play className="mr-1 h-3 w-3" />
                  )}
                  {isPlayingHintAudio ? "Playing..." : "Play Order"}
                </Button>
              </>
            )}
          </div>

          {/* Drag and Drop Area */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <GripVertical className="text-muted-foreground h-4 w-4" />
              <p className="text-sm font-medium">
                Drag to reorder sentences
                {hasUserInteracted &&
                  !isCompleted &&
                  " - Order and click Check Answer"}
              </p>
            </div>

            <div className="border-muted-foreground/25 bg-muted/30 min-h-[400px] rounded-lg border-2 border-dashed p-4">
              {userOrder.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {userOrder.map((sentence, index) => (
                    <div
                      key={sentence.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, sentence)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "group relative cursor-move rounded-lg border-2 border-dashed p-4 transition-all duration-200",
                        "hover:border-primary/50 hover:bg-primary/5",
                        dragOverIndex === index &&
                          "border-primary bg-primary/10",
                        isInCorrectPosition(sentence, index) &&
                          "border-green-500 bg-green-50 dark:bg-green-950/20",
                        showCorrectOrder &&
                          currentSentenceGroup.correctOrder[index] ===
                            sentence.text &&
                          "border-green-500 bg-green-100 dark:bg-green-900/30"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                          {index + 1}
                        </div>
                        <GripVertical className="text-muted-foreground h-4 w-4 shrink-0 opacity-50 group-hover:opacity-100" />
                        <p className="flex-1 text-sm leading-relaxed">
                          {sentence.text}
                        </p>
                      </div>
                    </div>
                  ))}
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
                  : "border-red-500 bg-red-50 dark:bg-red-950/20"
              )}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  {isCorrect ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-600" />
                  )}
                  <div>
                    <h3 className="font-semibold">
                      {isCorrect ? "Perfect! 🎉" : "Not quite right"}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {isCorrect
                        ? "You got the correct sentence order!"
                        : "The sentences are not in the right order. Try again!"}
                    </p>
                  </div>
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
              disabled={score === activeSentences.length && !showCorrectOrder}
            >
              {showCorrectOrder || isCompleted ? (
                <RotateCcw className="mr-2 h-4 w-4" />
              ) : (
                <Shuffle className="mr-2 h-4 w-4" />
              )}
              {showCorrectOrder || isCompleted ? "Play Again" : "Shuffle Again"}
            </Button>

            {!isCompleted && (
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
                {currentIndex < activeSentences.length - 1
                  ? "Next Sentence Order"
                  : "Complete Practice"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
