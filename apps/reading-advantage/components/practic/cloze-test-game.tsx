"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Header } from "../header";
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
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

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
    position: number; // Character position in sentence
    correctAnswer: string;
    options: string[]; // Multiple choice options
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

export function ClozeTestGame({ deckId, sentences = [] }: ClozeTestGameProps) {
  const router = useRouter();
  const { toast: showToast } = useToast(); // Renamed to avoid conflict
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

  // Track game results across all sentences
  const [gameResults, setGameResults] = useState<Array<{
    sentenceId: string;
    results: Array<{
      blankId: string;
      correct: boolean;
      selectedAnswer: string;
      correctAnswer: string;
    }>;
  }>>([]);

  // Add flag to track if user has made any selections
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [hintsEnabled, setHintsEnabled] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [rawSentenceData, setRawSentenceData] = useState<ClozeTestData[]>([]);
  const [activeSentences, setActiveSentences] =
    useState<ClozeTestData[]>(sentences);

  const [audioHintsEnabled, setAudioHintsEnabled] = useState(false);

  // Client-side blank generation function
  const generateBlanksForSentence = useCallback(
    (
      sentenceData: ClozeTestData,
      difficulty: "easy" | "medium" | "hard",
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
              w.length <= wordObj.word.length + 2,
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
    [],
  );

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
    console.log("ClozeTestGame mounted with deckId:", deckId); // Debug
    if (deckId && sentences.length === 0 && rawSentenceData.length === 0) {
      console.log("Loading sentences from deck..."); // Debug
      loadSentencesFromDeck();
    }
  }, [deckId]);

  const loadSentencesFromDeck = async () => {
    console.log("loadSentencesFromDeck called for deckId:", deckId); // Debug
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/v1/flashcard/decks/${deckId}/sentences-for-cloze`,
      );
      console.log("Sentences API response status:", response.status); // Debug
      if (response.ok) {
        const data = await response.json();
        console.log("Loaded sentences data:", data); // Debug
        setRawSentenceData(data.clozeTests || []);
      } else {
        showToast({
          title: "Error",
          description: "Failed to load sentences from flashcard deck",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading sentences:", error);
      showToast({
        title: "Error",
        description: "Failed to load sentences",
        variant: "destructive",
      });
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
        showToast({
          title: "Success!",
          description: "Perfect! All blanks filled correctly! 🎉",
        });
      } else {
        showToast({
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

      setGameResults(prev => [
        ...prev,
        {
          sentenceId: currentSentence.id,
          results: sentenceResults,
        }
      ]);
    } catch (error) {
      console.error("Error preparing sentence result:", error);
    }
  }, [currentSentence, userAnswers]);

  const saveGameResults = useCallback(async () => {
    console.log("saveGameResults called with gameResults:", gameResults); // Debug
    try {
      // Calculate final results from accumulated game results
      const allResults = gameResults.flatMap((sentenceResult) => 
        sentenceResult.results.map((result) => ({
          sentenceId: sentenceResult.sentenceId,
          correct: result.correct,
          selectedAnswer: result.selectedAnswer,
          correctAnswer: result.correctAnswer,
          timeTaken: timer / Math.max(gameResults.length, 1), // Average time per sentence
        }))
      );

      const totalCorrect = allResults.filter(r => r.correct).length;
      
      const finalGameResults = {
        results: allResults,
        totalScore: totalCorrect,
        totalQuestions: allResults.length,
        timeTaken: timer,
        difficulty: selectedDifficulty,
      };

      console.log("Sending cloze test results:", finalGameResults); // Debug
      const response = await fetch('/api/v1/flashcard/cloze-test/results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalGameResults),
      });

      console.log("Response status:", response.status); // Debug
      if (response.ok) {
        const data = await response.json();
        console.log("Cloze test API response:", data); // Debug logging
        const xpEarned = data.xpEarned || 0;
        
        // Force show toast regardless
        showToast({
          title: "Game Completed!",
          description: `Earned ${xpEarned} XP! 🎉`,
        });
        console.log("Toast should be shown with XP:", xpEarned); // Debug
      } else {
        const errorText = await response.text();
        console.error("Failed to save game results:", response.status, response.statusText, errorText);
        showToast({
          title: "Error",
          description: "Failed to save game results",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving game results:", error);
      showToast({
        title: "Error",
        description: "Failed to save game results",
        variant: "destructive",
      });
    }
  }, [gameResults, timer, selectedDifficulty]);

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
  }, [saveSentenceResult, saveGameResults]);

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
      showToast({
        title: "Success!",
        description: "Perfect! All blanks filled correctly! 🎉",
      });
    } else {
      showToast({
        title: "Try Again",
        description: `${correctCount}/${currentSentence.blanks.length} correct. Try again! 💪`,
        variant: "destructive",
      });
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
    showToast({
      title: "Answer Revealed",
      description: "Correct answers revealed! 📖",
    });
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
    showToast({
      title: "Playing Audio",
      description: "Playing sentence audio 🔊",
    });

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
          if (
            currentSentence.endTime !== undefined &&
            audio.currentTime >= currentSentence.endTime
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

      showToast({
        title: "Success!",
        description: "Audio completed! 🎵",
      });
    } catch (error) {
      console.error("Error playing audio:", error);
      showToast({
        title: "Error",
        description: "Failed to play audio",
        variant: "destructive",
      });
    } finally {
      setIsPlayingAudio(false);
    }
  }, [currentSentence, isPlayingAudio]);

  const toggleHints = useCallback(() => {
    setHintsEnabled((prev) => {
      const newState = !prev;
      if (newState) {
        showToast({
          title: "Hints Enabled",
          description: "💡 Incorrect answers will be highlighted. Use audio button to hear pronunciation.",
        });
      } else {
        showToast({
          title: "Hints Disabled",
          description: "Hints disabled",
        });
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
            <h3 className="text-lg font-semibold">Loading your sentences...</h3>
            <p className="text-muted-foreground text-sm">
              Fetching sentences from your flashcard deck
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
              🎉 Fantastic Work!
            </h1>
            <p className="text-muted-foreground text-xl">
              You completed {activeSentences.length} cloze test challenges
            </p>
          </div>

          {/* Stats Grid */}
          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-6 md:grid-cols-3">
            <Card className="relative overflow-hidden">
              <CardContent className="p-6 text-center">
                <Target className="mx-auto mb-3 h-8 w-8 text-blue-500" />
                <div className="text-3xl font-bold text-blue-600">{score}</div>
                <p className="text-muted-foreground text-sm">Perfect Scores</p>
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
                  {formatTime(timer)}
                </div>
                <p className="text-muted-foreground text-sm">Total Time</p>
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
              Back to Menu
            </Button>
            <Button onClick={handleRestartGame} size="lg" className="flex-1">
              <RotateCcw className="mr-2 h-4 w-4" />
              Play Again
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
        <Header
          heading="Cloze Test Game"
          text="Test your vocabulary and comprehension by filling in the missing words"
        />

        <Card className="mx-auto max-w-2xl">
          <CardHeader className="pb-6 text-center">
            <CardTitle className="text-2xl">Ready to Start?</CardTitle>
            <p className="text-muted-foreground">
              Fill in the blanks in sentences from your flashcard deck
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
                <p className="text-sm font-medium">Cloze Tests</p>
                <p className="text-muted-foreground text-xs">Ready to play</p>
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

            {/* Game Instructions */}
            <div className="bg-muted/50 space-y-3 rounded-lg p-6">
              <div className="flex items-center gap-2">
                <div className="bg-primary h-2 w-2 rounded-full" />
                <p className="text-sm font-medium">How to Play</p>
              </div>
              <ul className="text-muted-foreground ml-4 space-y-2 text-sm">
                <li>
                  • Each sentence has missing words that you need to fill in
                </li>
                <li>• Select the correct option from the dropdown menus</li>
                <li>• Complete all blanks to finish each sentence</li>
              </ul>
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
                    setActiveSentences([]);
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
                  Loading {selectedDifficulty} sentences...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Start{" "}
                  {selectedDifficulty.charAt(0).toUpperCase() +
                    selectedDifficulty.slice(1)}{" "}
                  Game
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
          <p className="text-muted-foreground">Loading next challenge...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-4 px-4">
      <Header
        heading="Cloze Test Game"
        text="Fill in the missing words in each sentence"
      />

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

            {/* Audio Toggle */}
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
                      Play Order
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
                  : "Finish Game"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
