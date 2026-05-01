"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Header } from "@/components/header";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { getLessonClozeTestSentences } from "@/actions/flashcard";
import { ActivityType, UserXpEarned } from "@/types/enum";
import { updateUserActivity } from "@/actions/user";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";

interface ClozeTestData {
  id: string;
  articleId: string;
  articleTitle: string;
  sentence: string;
  blanks: Array<{
    id: string;
    position: number; // Character position in sentence
    correctAnswer: string;
    options: string[]; // Multiple choice options
    hint?: string;
  }>;
  translation?: string; // JSON string of translations
  audioUrl?: string;
  startTime?: number;
  endTime?: number;
  difficulty: "easy" | "medium" | "hard";
}

interface ClozeTestGameProps {
  deckId?: string;
  sentences?: ClozeTestData[];
}

interface UserAnswer {
  blankId: string;
  selectedAnswer: string;
  isCorrect: boolean;
}

const AVAILABLE_LANGUAGES = {
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
} as const;

export default function LessonSentenceClozeTest({
  articleId,
}: {
  articleId: string;
}) {
  const t = useTranslations("LessonCloze");
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<
    "easy" | "medium" | "hard"
  >("medium");

  // Add flag to track if user has made any selections
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [hintsEnabled, setHintsEnabled] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [rawSentenceData, setRawSentenceData] = useState<ClozeTestData[]>([]);
  const [activeSentences, setActiveSentences] = useState<ClozeTestData[]>([]);

  const [audioHintsEnabled, setAudioHintsEnabled] = useState(false);
  const { data: session, update } = useSession();
  // Client-side blank generation function
  const generateBlanksForSentence = useCallback(
    (
      sentenceData: ClozeTestData,
      difficulty: "easy" | "medium" | "hard",
    ): ClozeTestData => {
      const blankCount =
        difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3;

      // Parse the sentence into words
      const words = sentenceData.sentence
        .split(/\s+/)
        .map((word) => word.replace(/[^\w]/g, "")) // Remove punctuation
        .filter((word) => word.length > 0);

      // Common words to avoid blanking
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
        "a",
        "an",
        "is",
        "be",
        "to",
        "of",
        "in",
        "it",
        "on",
        "as",
        "at",
        "by",
        "or",
        "up",
        "so",
        "no",
        "if",
        "my",
        "me",
        "we",
        "he",
        "do",
        "go",
        "us",
      ];

      // Filter candidate words for blanking
      const candidateWords = words.filter((word) => {
        const lowerWord = word.toLowerCase();
        return (
          word.length > 2 &&
          !commonWords.includes(lowerWord) &&
          /^[a-zA-Z]+$/.test(word)
        );
      });

      // Select words to blank out
      const selectedWords = candidateWords
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(blankCount, candidateWords.length));

      // Generate blanks
      const blanks = selectedWords.map((word, index) => {
        // Find the position of the word in the original sentence
        const regex = new RegExp(`\\b${word}\\b`, "i");
        const match = sentenceData.sentence.match(regex);
        const wordPosition = match
          ? sentenceData.sentence.indexOf(match[0])
          : -1;

        // Generate distractor options
        const options = [word];

        // Create simple distractors based on word characteristics
        const distractors = words
          .filter(
            (w) =>
              w !== word &&
              w.length >= word.length - 2 &&
              w.length <= word.length + 2 &&
              !commonWords.includes(w.toLowerCase()),
          )
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);

        // If we don't have enough distractors from the sentence, generate some
        if (distractors.length < 3) {
          const additionalDistractors = generateDistractors(
            word,
            3 - distractors.length,
          );
          distractors.push(...additionalDistractors);
        }

        options.push(...distractors);

        // Shuffle options
        const shuffledOptions = options.sort(() => Math.random() - 0.5);

        return {
          id: `blank-${index}`,
          position: wordPosition,
          correctAnswer: word,
          options: shuffledOptions.slice(0, 4), // Ensure max 4 options
          hint: `A word that fits in this context`,
        };
      });

      return {
        ...sentenceData,
        blanks: blanks.sort((a, b) => a.position - b.position),
        difficulty,
      };
    },
    [],
  );

  // Helper function to generate distractor words
  const generateDistractors = (targetWord: string, count: number): string[] => {
    const distractors: string[] = [];
    const wordLength = targetWord.length;

    // Simple distractor generation based on common patterns
    const commonEndings = ["ing", "ed", "er", "ly", "tion", "ness", "ment"];
    const commonPrefixes = ["un", "re", "pre", "dis", "over", "under"];

    // Generate variations
    for (let i = 0; i < count && distractors.length < count; i++) {
      let distractor = "";

      if (wordLength > 4) {
        // Try adding/removing common endings
        if (Math.random() > 0.5 && !targetWord.endsWith("ing")) {
          distractor = targetWord.slice(0, -1) + "ing";
        } else if (!targetWord.endsWith("ed")) {
          distractor = targetWord + "ed";
        } else {
          distractor = targetWord.slice(0, -2) + "er";
        }
      } else {
        // For shorter words, create simple variations
        const chars = "abcdefghijklmnopqrstuvwxyz";
        distractor =
          targetWord.slice(0, -1) +
          chars[Math.floor(Math.random() * chars.length)];
      }

      if (distractor !== targetWord && !distractors.includes(distractor)) {
        distractors.push(distractor);
      }
    }

    // Fill remaining slots with generic words if needed
    const fallbackWords = [
      "word",
      "text",
      "item",
      "part",
      "thing",
      "place",
      "time",
      "way",
    ];
    while (distractors.length < count) {
      const fallback =
        fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
      if (!distractors.includes(fallback) && fallback !== targetWord) {
        distractors.push(fallback);
      }
    }

    return distractors;
  };

  // Generate active sentences based on difficulty
  const activeSentencesWithBlanks = useMemo(() => {
    if (rawSentenceData.length === 0) return [];

    return rawSentenceData.map((sentence) =>
      generateBlanksForSentence(sentence, selectedDifficulty),
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

  useEffect(() => {
    if (articleId) {
      loadSentencesFromDeck();
    }
  }, [articleId]);

  const loadSentencesFromDeck = async () => {
    setIsLoading(true);
    try {
      const response = (await getLessonClozeTestSentences(
        articleId,
        selectedDifficulty,
      )) as {
        clozeTests: ClozeTestData[];
        totalTests: number;
      };
      setRawSentenceData(response.clozeTests || []);
    } catch (error) {
      console.error("Error loading sentences:", error);
      toast.error("Failed to load sentences");
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
        (answer) => answer.isCorrect,
      ).length;
      const isAllCorrect = correctCount === currentSentence.blanks.length;

      setIsCompleted(true);
      setShowResult(true);

      if (isAllCorrect) {
        setScore((prev) => prev + 1);
        // toast.success("Perfect! All blanks filled correctly! 🎉");
      } else {
        toast.error(
          `${correctCount}/${currentSentence.blanks.length} correct. Try again! 💪`,
        );
      }
    }
  }, [
    userAnswers,
    currentSentence?.blanks.length,
    isCompleted,
    hasUserInteracted,
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
    [currentSentence?.blanks, isCompleted],
  );

  const handleStartGame = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handleNext = useCallback(async () => {
    if (currentIndex < activeSentences.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      toggleAudioHints();
    } else {
      setGameComplete(true);
      await updateUserActivity(
        articleId,
        ActivityType.SENTENCE_CLOZE_TEST,
        UserXpEarned.SENTENCE_CLOZE_TEST,
        timer,
        {
          score: UserXpEarned.SENTENCE_CLOZE_TEST,
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
    setUserAnswers([]);
    setShowResult(false);
    setIsCompleted(false);
    setHasUserInteracted(false);
    setShowCorrectAnswers(false);
    setHintsEnabled(false);
  }, []);

  const handleCheckAnswer = useCallback(() => {
    if (!currentSentence || userAnswers.length === 0) return;

    const correctCount = userAnswers.filter(
      (answer) => answer.isCorrect,
    ).length;
    const isAllCorrect = correctCount === currentSentence.blanks.length;

    setIsCompleted(true);
    setShowResult(true);
    setHasUserInteracted(true);

    if (isAllCorrect) {
      setScore((prev) => prev + 1);
      // toast.success("Perfect! All blanks filled correctly! 🎉");
    } else {
      toast.error(
        `${correctCount}/${currentSentence.blanks.length} correct. Try again! 💪`,
      );
    }
  }, [userAnswers, currentSentence]);

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
    toast.info("Correct answers revealed! 📖");
  }, []);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

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

  const playAudio = useCallback(async () => {
    if (!currentSentence?.audioUrl || isPlayingAudio) return;

    setIsPlayingAudio(true);
    // toast.success("Playing sentence audio 🔊");

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
          if (currentSentence.startTime !== undefined) {
            audio.currentTime = currentSentence.startTime;
          } else {
            audio.play().catch(handleError);
          }
        };

        const handleSeeked = () => {
          audio.removeEventListener("seeked", handleSeeked);
          audio
            .play()
            .then(() => {
              if (currentSentence.endTime !== undefined) {
                audio.addEventListener("timeupdate", handleTimeUpdate);
              }
            })
            .catch(handleError);
        };

        const handleTimeUpdate = () => {
          const tolerance = 0.5;
          if (
            currentSentence.endTime !== undefined &&
            audio.currentTime + tolerance >= currentSentence.endTime
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
        if (currentSentence.startTime !== undefined) {
          audio.addEventListener("seeked", handleSeeked);
        }
        audio.addEventListener("ended", handleEnded);
        audio.addEventListener("error", handleError);

        timeoutId = setTimeout(() => {
          cleanup();
          resolve(void 0);
        }, 10000);

        audio.preload = "auto";
        audio.src = currentSentence.audioUrl!;
        audio.load();
      });

      // toast.success("Audio completed! 🎵");
    } catch (error) {
      console.error("Error playing audio:", error);
      toast.error("Failed to play audio");
    } finally {
      setIsPlayingAudio(false);
    }
  }, [currentSentence, isPlayingAudio]);

  const toggleHints = useCallback(() => {
    setHintsEnabled((prev) => {
      const newState = !prev;
      if (newState) {
        toast.success(
          "Hints enabled! 💡\n• Incorrect answers will be highlighted\n• Use audio button to hear pronunciation",
        );
      } else {
        toast.info("Hints disabled");
      }
      return newState;
    });
  }, []);

  const toggleAudioHints = useCallback(() => {
    setAudioHintsEnabled((prev) => {
      const newState = !prev;

      return newState;
    });
  }, []);

  // Render sentence with blanks
  const renderSentenceWithBlanks = useCallback(() => {
    if (!currentSentence) return null;

    let sentence = currentSentence.sentence;
    const blanks = [...currentSentence.blanks].sort(
      (a, b) => b.position - a.position,
    );

    // Replace each blank with a placeholder
    blanks.forEach((blank) => {
      const userAnswer = userAnswers.find((a) => a.blankId === blank.id);
      const isAnswered = !!userAnswer;
      const isCorrect = userAnswer?.isCorrect ?? false;

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
                    className={cn("inline-flex h-8 min-w-[120px]", {
                      "border-green-500 bg-green-50 dark:bg-green-950/20":
                        userAnswer?.isCorrect && (isCompleted || hintsEnabled),
                      "border-red-500 bg-red-50 dark:bg-red-950/20":
                        userAnswer &&
                        !userAnswer.isCorrect &&
                        (isCompleted || hintsEnabled),
                      "border-muted-foreground/50": !userAnswer,
                    })}
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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{t("loading.title")}</h3>
            <p className="text-muted-foreground text-sm">
              {t("loading.subtitle")}
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
          </div>

          {/* Stats Grid */}
          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-6 md:grid-cols-3">
            <Card className="relative overflow-hidden">
              <CardContent className="p-6 text-center">
                <Target className="mx-auto mb-3 h-8 w-8 text-blue-500" />
                <div className="text-3xl font-bold text-blue-600">{score}</div>
                <p className="text-muted-foreground text-sm">
                  {t("complete.stats.perfect")}
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
                  {t("complete.stats.time")}
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
              {t("buttons.back")}
            </Button>
            <Button onClick={handleRestartGame} size="lg" className="flex-1">
              <RotateCcw className="mr-2 h-4 w-4" />
              {t("buttons.playAgain")}
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
            <CardTitle className="text-2xl">{t("start.title")}</CardTitle>
            <p className="text-muted-foreground">{t("start.subtitle")}</p>
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
                <p className="text-sm font-medium">{t("start.stats.tests")}</p>
                <p className="text-muted-foreground text-xs">
                  {t("common.ready")}
                </p>
              </div>

              <div className="space-y-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm font-medium">
                  {t("start.stats.fillBlanks")}
                </p>
                <p className="text-muted-foreground text-xs">
                  {selectedDifficulty === "easy" && t("start.stats.oneBlank")}
                  {selectedDifficulty === "medium" &&
                    t("start.stats.twoBlanks")}
                  {selectedDifficulty === "hard" &&
                    t("start.stats.threeBlanks")}
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
                  {t("common.min")}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("start.stats.estimated")}
                </p>
              </div>
            </div>

            <Separator />

            {/* Game Instructions */}
            <div className="bg-muted/50 space-y-3 rounded-lg p-6">
              <div className="flex items-center gap-2">
                <div className="bg-primary h-2 w-2 rounded-full" />
                <p className="text-sm font-medium">{t("instructions.title")}</p>
              </div>
              <ul className="text-muted-foreground ml-4 space-y-2 text-sm">
                <li>• {t("instructions.item1")}</li>
                <li>• {t("instructions.item2")}</li>
                <li>• {t("instructions.item3")}</li>
              </ul>
            </div>

            <Separator />

            {/* Difficulty Selector */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="difficulty" className="text-sm font-medium">
                  {t("difficulty.choose")}
                </Label>
                <Select
                  value={selectedDifficulty}
                  onValueChange={(value: "easy" | "medium" | "hard") => {
                    setSelectedDifficulty(value);
                    setActiveSentences([]);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={t("difficulty.select") as string}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">🟢</span>
                        <span>{t("difficulty.easy")}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-600">🟡</span>
                        <span>{t("difficulty.medium")}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="hard">
                      <div className="flex items-center gap-2">
                        <span className="text-red-600">🔴</span>
                        <span>{t("difficulty.hard")}</span>
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
                  {selectedDifficulty === "easy" && t("difficulty.desc.easy")}
                  {selectedDifficulty === "medium" &&
                    t("difficulty.desc.medium")}
                  {selectedDifficulty === "hard" && t("difficulty.desc.hard")}
                </p>
              </div>
            </div>

            {/* <Button
              onClick={handleStartGame}
              size="lg"
              className="h-12 w-full"
              disabled={activeSentences.length === 0}
            >
              <Play className="mr-2 h-5 w-5" />
              {activeSentences.length === 0
                ? "No sentences available"
                : "Start Game"}
            </Button> */}
            <Button
              onClick={() => {
                if (activeSentences.length === 0) {
                  loadSentencesFromDeck();
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
                  {t("buttons.loading", { difficulty: selectedDifficulty })}
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  {t("buttons.startGame")}
                </>
              )}
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
          <p className="text-muted-foreground">{t("loading.nextChallenge")}</p>
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
              {t("progress.perfect", { score, total: activeSentences.length })}
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
                {t("game.subtitle")}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Hint Controls */}

          <div className="bg-muted/30 flex flex-wrap items-center gap-3 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">{t("hints.label")}</span>
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
                  onClick={playAudio}
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={isPlayingAudio}
                >
                  {isPlayingAudio ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Playing...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-3 w-3" />
                      {t("hints.play")}
                    </>
                  )}
                </Button>
              </>
            )}
          </div>

          {/* Sentence with Blanks */}
          <Card className="border-muted-foreground/25 bg-muted/10 border-2">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Target className="text-primary h-5 w-5" />
                  <p className="text-sm font-medium">
                    {t("sentence.instructions")}
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
              {t("progress.sentence", {
                answered: userAnswers.length,
                total: currentSentence.blanks.length,
              })}
            </span>
            {userAnswers.length > 0 && (
              <span className="text-muted-foreground">
                {t("progress.correct", {
                  correct: userAnswers.filter((a) => a.isCorrect).length,
                  answered: userAnswers.length,
                })}
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
                  : "border-red-500 bg-red-50 dark:bg-red-950/20",
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
                        ? t("result.perfect")
                        : t("result.tryAgain", {
                            correct: userAnswers.filter((a) => a.isCorrect)
                              .length,
                            total: currentSentence.blanks.length,
                          })}
                    </h3>
                  </div>

                  {!userAnswers.every((a) => a.isCorrect) &&
                    showCorrectAnswers && (
                      <div className="space-y-3">
                        <Separator />
                        <div>
                          <h4 className="mb-3 font-medium">
                            {t("result.correctAnswers")}
                          </h4>
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
              {t("buttons.reset")}
            </Button>

            {!isCompleted && userAnswers.length > 0 && (
              <Button
                onClick={handleCheckAnswer}
                variant="outline"
                size="sm"
                className="sm:w-auto"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {t("buttons.check")}
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
                  {t("buttons.showAnswers")}
                </Button>
              )}

            {isCompleted && (
              <Button onClick={handleNext} className="flex-1">
                {currentIndex < activeSentences.length - 1
                  ? t("buttons.next")
                  : t("buttons.finish")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
