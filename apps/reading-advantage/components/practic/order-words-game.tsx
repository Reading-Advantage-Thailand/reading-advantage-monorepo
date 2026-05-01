"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Header } from "@/components/header";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Languages,
  Lightbulb,
  Loader2,
  Plus,
  Play,
  RotateCcw,
  Shuffle,
  Target,
  Trophy,
  Type,
  Volume2,
  XCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderWordData {
  id: string;
  articleId: string;
  articleTitle: string;
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
    partOfSpeech?: string;
  }>;
  difficulty: "easy" | "medium" | "hard";
  context?: string;
  sentenceTranslations?: {
    th?: string;
    cn?: string;
    tw?: string;
    vi?: string;
  };
}

interface OrderWordGameProps {
  deckId?: string;
  sentences?: OrderWordData[];
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
  partOfSpeech?: string;
}

const SUPPORTED_LANGUAGES = {
  th: "🇹🇭 Thai",
  vi: "🇻🇳 Vietnamese",
  cn: "🇨🇳 Chinese (Simplified)",
  tw: "🇹🇼 Chinese (Traditional)",
};

export function OrderWordGame({ deckId, sentences = [] }: OrderWordGameProps) {
  const router = useRouter();
  const { toast } = useToast(); // Add useToast hook
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedWords, setSelectedWords] = useState<ClickableWord[]>([]);
  const [availableWords, setAvailableWords] = useState<ClickableWord[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Add flag to track if user has made any moves
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isPlayingHintAudio, setIsPlayingHintAudio] = useState(false);
  const [showCorrectOrder, setShowCorrectOrder] = useState(false);

  const [highlightHintsEnabled, setHighlightHintsEnabled] = useState(false);
  const [audioHintsEnabled, setAudioHintsEnabled] = useState(false);

  // Translation language (selected before game starts)
  const [selectedLanguage, setSelectedLanguage] = useState<string>("th");

  const [activeSentences, setActiveSentences] =
    useState<OrderWordData[]>(sentences);

  useEffect(() => {
    if (deckId && sentences.length === 0) {
      loadSentencesFromDeck();
    }
  }, [deckId]);

  const loadSentencesFromDeck = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/v1/flashcard/decks/${deckId}/words-for-ordering`,
      );
      if (response.ok) {
        const data = await response.json();
        setActiveSentences(data.sentences || []);
      } else {
        toast({
          title: "Error",
          description: "Failed to load sentences from flashcard deck",
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

  // Shuffle words function
  const shuffleWords = useCallback((words: typeof currentSentence.words) => {
    // Create a copy of the words array
    const wordsToShuffle = [...words];

    // Fisher-Yates shuffle algorithm for better randomization
    for (let i = wordsToShuffle.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [wordsToShuffle[i], wordsToShuffle[j]] = [
        wordsToShuffle[j],
        wordsToShuffle[i],
      ];
    }

    // Map to clickable format with unique IDs
    return wordsToShuffle.map((word, index) => ({
      id: `${word.id}-shuffled-${Date.now()}-${index}`,
      text: word.text,
      originalIndex: words.findIndex((w) => w.id === word.id),
      translation: word.translation,
      audioUrl: word.audioUrl,
      startTime: word.startTime,
      endTime: word.endTime,
      partOfSpeech: word.partOfSpeech,
    }));
  }, []);

  // Initialize shuffled words when sentence changes
  useEffect(() => {
    if (currentSentence?.words) {
      const shuffled = shuffleWords(currentSentence.words);
      setAvailableWords(shuffled);
      setSelectedWords([]);
      setShowResult(false);
      setIsCompleted(false);
      setHasUserInteracted(false);
      setShowCorrectOrder(false);
    }
  }, [currentSentence?.id, shuffleWords]);

  // Check answer when selected words change
  useEffect(() => {
    if (!currentSentence?.correctOrder || selectedWords.length === 0) return;

    // Only auto-complete if:
    // 1. User has selected all words
    // 2. Game is not already completed
    // 3. User has actually interacted with the game
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
          title: "Success!",
          description: "Perfect! Correct word order! 🎉",
        });
      }
    }
  }, [
    selectedWords,
    currentSentence?.correctOrder,
    isCompleted,
    hasUserInteracted,
  ]);

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
    [],
  );

  const handleStartGame = useCallback(() => {
    setIsPlaying(true);
    toast({
      title: "Game Started!",
      description: `Game started with ${SUPPORTED_LANGUAGES[selectedLanguage as keyof typeof SUPPORTED_LANGUAGES]} translations! 🎮`,
    });
  }, [selectedLanguage]);

  const handleNext = useCallback(async () => {
    if (currentIndex < activeSentences.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Game is complete, save results
      try {
        const sentenceResults = activeSentences.map((sentence, index) => ({
          sentenceId: sentence.id,
          isCorrect: index < score, // Simple approximation - could be improved
        }));

        const gameData = {
          totalQuestions: activeSentences.length,
          correctAnswers: score,
          timeTaken: timer,
          difficulty: "medium",
          gameSession: `word-ordering-${Date.now()}`,
          sentenceResults,
        };

        const response = await fetch('/api/v1/flashcard/word-ordering', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(gameData),
        });

        if (response.ok) {
          const result = await response.json();
          console.log("Order words API response:", result); // Debug logging
          const xpEarned = result.xpEarned || 0;
          if (xpEarned > 0) {
            toast({
              title: "Results Saved!",
              description: `You earned ${xpEarned} XP! 🎉`,
            });
          } else {
            toast({
              title: "Results Saved!",
              description: "Game completed!",
            });
          }
        } else {
          console.error('Failed to save game results:', response.status, response.statusText);
          toast({
            title: "Error",
            description: "Failed to save game results",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error saving game results:', error);
      }

      setGameComplete(true);
      setIsPlaying(false);
    }
  }, [currentIndex, activeSentences.length, score, timer]);

  const handleRestart = useCallback(() => {
    if (currentSentence?.words) {
      const shuffled = shuffleWords(currentSentence.words);
      setAvailableWords(shuffled);
      setSelectedWords([]);
      setShowResult(false);
      setIsCompleted(false);
      setHasUserInteracted(false);
      setShowCorrectOrder(false);
      setHighlightHintsEnabled(false);
      setAudioHintsEnabled(false);
    }
  }, [currentSentence?.words, shuffleWords]);

  const handleCheckAnswer = useCallback(() => {
    if (!currentSentence?.correctOrder || selectedWords.length === 0) return;

    const userWordOrder = selectedWords.map((item) => item.text);
    const isCorrect =
      JSON.stringify(userWordOrder) ===
      JSON.stringify(currentSentence.correctOrder);

    setIsCompleted(true);
    setShowResult(true);
    setHasUserInteracted(true);

    if (isCorrect) {
      setScore((prev) => prev + 1);
      toast({
        title: "Success!",
        description: "Perfect! Correct word order! 🎉",
      });
    } else {
      toast({
        title: "Try Again",
        description: "Not quite right. Try again! 💪",
        variant: "destructive",
      });
    }
  }, [selectedWords, currentSentence?.correctOrder]);

  const handleRestartGame = useCallback(() => {
    setCurrentIndex(0);
    setScore(0);
    setTimer(0);
    setGameComplete(false);
    setIsPlaying(false);
    setHasUserInteracted(false);
  }, []);

  const handleShowAnswer = useCallback(() => {
    setShowCorrectOrder(true);
    toast({
      title: "Answer Revealed",
      description: "Correct order revealed! 📖",
    });
  }, []);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleLanguageChange = useCallback((value: string) => {
    setSelectedLanguage(value);
    const language =
      SUPPORTED_LANGUAGES[value as keyof typeof SUPPORTED_LANGUAGES];
    toast({
      title: "Language Changed",
      description: `Translation language set to ${language}`,
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
    [currentIndex, isCompleted, activeSentences.length],
  );

  const isCorrect = useMemo(() => {
    const userWordOrder = selectedWords.map((item) => item.text);
    return (
      JSON.stringify(userWordOrder) ===
      JSON.stringify(currentSentence?.correctOrder || [])
    );
  }, [selectedWords, currentSentence?.correctOrder]);

  const isInCorrectPosition = useCallback(
    (word: ClickableWord, currentIndex: number) => {
      if (!currentSentence?.correctOrder || !highlightHintsEnabled)
        return false;
      return currentSentence.correctOrder[currentIndex] === word.text;
    },
    [currentSentence?.correctOrder, highlightHintsEnabled],
  );

  const shouldHighlightAvailableWord = useCallback(
    (word: ClickableWord) => {
      if (!currentSentence?.correctOrder || !highlightHintsEnabled)
        return false;
      // Highlight if this word should be the next one in the sequence
      const nextPosition = selectedWords.length;
      return currentSentence.correctOrder[nextPosition] === word.text;
    },
    [
      currentSentence?.correctOrder,
      highlightHintsEnabled,
      selectedWords.length,
    ],
  );

  const toggleHighlightHints = useCallback(() => {
    setHighlightHintsEnabled((prev) => !prev);
  }, []);

  const toggleAudioHints = useCallback(() => {
    setAudioHintsEnabled((prev) => !prev);
  }, []);

  const playHintAudio = useCallback(async () => {
    if (!currentSentence?.words || isPlayingHintAudio) return;

    setIsPlayingHintAudio(true);
    toast({
      title: "Playing Audio",
      description: "Playing correct word order audio 🔊",
    });

    try {
      // Get words in correct order
      const correctOrderWords = currentSentence.correctOrder
        .map((wordText) =>
          currentSentence.words.find((w) => w.text === wordText),
        )
        .filter(Boolean);

      // Play audio for each word in correct order with delay
      for (let i = 0; i < correctOrderWords.length; i++) {
        const word = correctOrderWords[i];
        if (
          word?.audioUrl &&
          word.startTime !== undefined &&
          word.endTime !== undefined
        ) {
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
                audio.currentTime = word.startTime!;
              };

              const handleSeeked = () => {
                audio.removeEventListener("seeked", handleSeeked);
                audio
                  .play()
                  .then(() => {
                    // Audio started playing successfully
                  })
                  .catch(handleError);
              };

              const handleTimeUpdate = () => {
                if (audio.currentTime >= word.endTime!) {
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
              audio.addEventListener("seeked", handleSeeked);
              audio.addEventListener("ended", handleEnded);
              audio.addEventListener("error", handleError);

              timeoutId = setTimeout(() => {
                cleanup();
                resolve(void 0);
              }, 5000);

              audio.preload = "auto";
              audio.src = word.audioUrl!;
              audio.load();
            });

            // Add delay between words
            if (i < correctOrderWords.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 300));
            }
          } catch (error) {
            console.warn(`Failed to play audio for word ${i + 1}:`, error);
          }
        }
      }

      toast({
        title: "Audio Complete",
        description: "Audio sequence completed! 🎵",
      });
    } catch (error) {
      console.error("Error playing hint audio:", error);
      toast({
        title: "Audio Error",
        description: "Failed to play hint audio",
        variant: "destructive",
      });
    } finally {
      setIsPlayingHintAudio(false);
    }
  }, [currentSentence, isPlayingHintAudio]);

  const formedSentence = useMemo(() => {
    return selectedWords.map((word) => word.text).join(" ");
  }, [selectedWords]);

  // Helper function to get translation for a word (disabled for word ordering game)
  const getWordTranslation = useCallback(
    (word: ClickableWord) => {
      // For word ordering game, we don't show individual word translations
      // Only show sentence-level translation
      return null;
    },
    [selectedLanguage],
  );

  const getSentenceTranslation = useCallback(() => {
    if (!currentSentence?.sentenceTranslations || !selectedLanguage)
      return null;
    return currentSentence.sentenceTranslations[
      selectedLanguage as keyof typeof currentSentence.sentenceTranslations
    ];
  }, [currentSentence, selectedLanguage]);

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
              🎉 Amazing Work!
            </h1>
            <p className="text-muted-foreground text-xl">
              You completed {activeSentences.length} word ordering challenges
            </p>
            <p className="text-muted-foreground text-sm">
              Using{" "}
              {
                SUPPORTED_LANGUAGES[
                  selectedLanguage as keyof typeof SUPPORTED_LANGUAGES
                ]
              }{" "}
              translations
            </p>
          </div>

          {/* Stats Grid */}
          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-6 md:grid-cols-3">
            <Card className="relative overflow-hidden">
              <CardContent className="p-6 text-center">
                <Target className="mx-auto mb-3 h-8 w-8 text-blue-500" />
                <div className="text-3xl font-bold text-blue-600">{score}</div>
                <p className="text-muted-foreground text-sm">Correct Answers</p>
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
          heading="Order Words Game"
          text="Test your language skills by clicking words to form correct sentences"
        />

        <Card className="mx-auto max-w-2xl">
          <CardHeader className="pb-6 text-center">
            <CardTitle className="text-2xl">Ready to Start?</CardTitle>
            <p className="text-muted-foreground">
              Click words in the correct order to form meaningful sentences
            </p>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Game Stats */}
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2 text-center">
                <div className="bg-primary/10 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
                  <Type className="h-6 w-6 text-blue-600" />
                </div>
                <p className="text-sm font-medium">{activeSentences.length} Sentences</p>
                <p className="text-muted-foreground text-xs">Ready to solve</p>
              </div>

              <div className="space-y-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                  <Type className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm font-medium">Click to Order</p>
                <p className="text-muted-foreground text-xs">
                  With translations
                </p>
              </div>

              <div className="space-y-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <p className="text-sm font-medium">~10 min</p>
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
                  • Click words from the bottom to add them to your sentence
                </li>
                <li>• Click words in your sentence to remove them</li>
                <li>• Translations will be shown below each word</li>
                <li>• Form grammatically correct and meaningful sentences</li>
                <li>• Use hints if you get stuck</li>
              </ul>
            </div>

            <Separator />

            {/* Language Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Languages className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold">Choose Translation Language</h3>
              </div>
              <Select
                value={selectedLanguage}
                onValueChange={handleLanguageChange}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select translation language" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-60">
                  {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                    <SelectItem key={code} value={code}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-sm">
                Word translations will be shown in{" "}
                {
                  SUPPORTED_LANGUAGES[
                    selectedLanguage as keyof typeof SUPPORTED_LANGUAGES
                  ]
                }{" "}
                throughout the game
              </p>
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
                ? "No sentences available"
                : `Start Game with ${SUPPORTED_LANGUAGES[selectedLanguage as keyof typeof SUPPORTED_LANGUAGES]} Translations`}
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
        heading="Order Words Game"
        text={`Click words to form the correct sentence • ${SUPPORTED_LANGUAGES[selectedLanguage as keyof typeof SUPPORTED_LANGUAGES]} translations`}
      />

      {/* Progress Bar */}
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
                📖 {currentSentence.articleTitle}
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Click words below to form the correct sentence
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Sentence Formation Area */}
          <div className="min-h-[120px] rounded-lg border-2 border-dashed border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 p-4 dark:border-blue-800 dark:from-blue-950/20 dark:to-purple-950/20">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-medium">Your sentence:</p>
              </div>

              {selectedWords.length === 0 ? (
                <p className="text-muted-foreground text-center italic">
                  Click words below to start building your sentence...
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedWords.map((word, index) => (
                    <button
                      key={word.id}
                      className={cn(
                        "rounded-lg border-2 border-b-4 border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium transition-colors hover:bg-blue-200 dark:border-blue-600 dark:bg-blue-900 dark:hover:bg-blue-800",
                        isInCorrectPosition(word, index) &&
                          "border-green-400 bg-green-100 dark:border-green-500 dark:bg-green-900"
                      )}
                      onClick={() => handleSelectedWordClick(word, index)}
                      title={`Remove "${word.text}" from sentence`}
                    >
                      <div className="space-y-1">
                        <div>{word.text}</div>
                        {getWordTranslation(word) && (
                          <div className="text-xs opacity-70">
                            {getWordTranslation(word)}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Translation */}
              <div className="rounded-lg border border-green-200 bg-white/50 p-3 dark:border-green-800 dark:bg-gray-800/50">
                <div className="text-xs font-medium text-green-600 dark:text-green-400">
                  Translation:
                </div>
                <div className="text-sm">
                  {getSentenceTranslation() || "No translation available"}
                </div>
              </div>
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
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Play className="mr-1 h-3 w-3" />
                  )}
                  Play Order
                </Button>
              </>
            )}
          </div>

          {/* Available Words Bank */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Plus className="text-muted-foreground h-4 w-4" />
              <p className="text-sm font-medium">
                Click words to add them to your sentence
                {availableWords.length > 0 &&
                  ` (${availableWords.length} remaining)`}
              </p>
            </div>

            <div className="bg-muted/30 min-h-[140px] rounded-lg border-2 border-dashed p-4">
              {availableWords.length === 0 ? (
                <p className="text-muted-foreground flex h-full items-center justify-center text-center italic">
                  All words used! Check your sentence order above.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableWords.map((word) => (
                    <button
                      key={word.id}
                      className={cn(
                        "rounded-lg border-2 border-b-4 border-gray-300 bg-white px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600",
                        shouldHighlightAvailableWord(word) &&
                          "border-yellow-400 bg-yellow-100 dark:border-yellow-500 dark:bg-yellow-900"
                      )}
                      onClick={() => handleWordClick(word)}
                      title={`Add "${word.text}" to sentence`}
                    >
                      <div className="space-y-1">
                        <div>{word.text}</div>
                        {getWordTranslation(word) && (
                          <div className="text-xs opacity-70">
                            {getWordTranslation(word)}
                          </div>
                        )}
                      </div>
                    </button>
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
                  : "border-red-500 bg-red-50 dark:bg-red-950/20",
              )}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  {isCorrect ? (
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  ) : (
                    <XCircle className="h-8 w-8 text-red-600" />
                  )}
                  <div className="space-y-2">
                    <h3 className="font-semibold">
                      {isCorrect ? "Correct!" : "Not quite right"}
                    </h3>
                    <p className="text-sm">
                      {isCorrect
                        ? "Great job! You've arranged the words correctly."
                        : "The word order isn't quite right. Try again!"}
                    </p>
                    {showCorrectOrder && !isCorrect && (
                      <div className="mt-4 rounded border-l-4 border-blue-500 bg-blue-50 p-3 dark:bg-blue-950/30">
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          Correct order:
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          {currentSentence.correctOrder.join(" ")}
                        </p>
                      </div>
                    )}
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
