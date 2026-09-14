"use client";
import {
  ActivityType,
  FlashcardType,
  GameState,
  UserXpEarned,
} from "@/types/enum";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  GraduationCap,
  Languages,
  Trophy,
  Sparkles,
  Star,
  CheckCircle,
  XCircle,
  RotateCcw,
  Eye,
  Lightbulb,
  Volume2,
  Play,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SENTENCE_LANGUAGES,
  VOCABULARY_LANGUAGES,
} from "../../flashcards/deck-view";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { getLessonFlashcards } from "@/actions/flashcard";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toTranslationLanguage } from "@/lib/translation-language";
import { toast } from "sonner";
import { updateUserActivity } from "@/actions/user";
import { useAuth } from "@reading-advantage/auth-client";
import { shuffle } from "@/lib/shuffle";
import type { UserMatch } from "@/types";

// Type definitions
interface MatchingSourceCard {
  id: string;
  sentence: string;
  word: string;
  translation: Record<string, string>;
  definition: Record<string, string>;
  audioUrl?: string;
  startTime?: number;
  endTime?: number;
}

interface MatchingPair {
  id: string;
  front: string;
  back: string;
  audioUrl?: string;
  startTime?: number;
  endTime?: number;
}

/**
 * Static per-variant configuration for the matching game.
 */
export interface MatchingVariantConfig {
  /** Card kind requested from the lesson flashcards action. */
  requestKind: FlashcardType;
  /** Activity type reported when the round auto-completes. */
  activityType: ActivityType;
  /** XP score reported when the round auto-completes. */
  activityScore: UserXpEarned;
  /** Language choices offered on the start screen. */
  languageOptions: typeof SENTENCE_LANGUAGES | typeof VOCABULARY_LANGUAGES;
  /** Whether the initial language comes from the locale. */
  languageFromLocale: boolean;
  /** Reads the left-column text from a raw flashcard. */
  readFront: (card: MatchingSourceCard) => string;
  /** Reads the right-column text from a raw flashcard. */
  readBack: (card: MatchingSourceCard, language: string) => string;
}

/** Sentence-matching variant configuration. */
export const SENTENCE_MATCHING_CONFIG: MatchingVariantConfig = {
  requestKind: FlashcardType.SENTENCE,
  activityType: ActivityType.SENTENCE_MATCHING,
  activityScore: UserXpEarned.SENTENCE_MATCHING,
  languageOptions: SENTENCE_LANGUAGES,
  languageFromLocale: true,
  readFront: (card) => card.sentence,
  readBack: (card, language) => card.translation[language],
};

/** Vocabulary-matching variant configuration. */
export const VOCABULARY_MATCHING_CONFIG: MatchingVariantConfig = {
  requestKind: FlashcardType.VOCABULARY,
  activityType: ActivityType.VOCABULARY_MATCHING,
  activityScore: UserXpEarned.VOCABULARY_MATCHING,
  languageOptions: VOCABULARY_LANGUAGES,
  languageFromLocale: false,
  readFront: (card) => card.word,
  readBack: (card, language) => card.definition[language],
};

function MatchingGameBody({
  articleId,
  cardKind,
}: {
  articleId: string;
  cardKind: FlashcardType;
}) {
  const isVocabulary = cardKind === FlashcardType.VOCABULARY;
  const config: MatchingVariantConfig = isVocabulary
    ? VOCABULARY_MATCHING_CONFIG
    : SENTENCE_MATCHING_CONFIG;
  const t = useTranslations(
    isVocabulary ? "Lesson.VocabularyMatching" : "SentencesPage.matchingGame",
  );
  const tCards = useTranslations("SentencesPage.sentencesCard");
  const locale = useLocale();
  /**
   * Resolved per-variant strings. Static text comes from the variant
   * namespaces; counters render live values.
   */
  const labels = isVocabulary
    ? {
        loadErrorToast: t("toast.failedToLoad"),
        errorTitle: t("error.title"),
        errorDescription: t("error.description"),
        noCardsTitle: t("noCards.title"),
        noCardsDescription: t("noCards.description"),
        startTitle: t("start.title"),
        startSubtitle: t("start.subtitle"),
        languageTitle: t("start.languageLabel"),
        translationsHint: t("start.languageHint"),
        startButton: t("start.startButton"),
        completeTitle: t("completed.title"),
        completeSubtitle: t("completed.subtitle"),
        xpEarned: t("completed.xpEarned"),
        completedLabel: t("completed.completed"),
        gameTitle: t("game.title"),
        gameInstruction: t("game.instruction"),
        leftColumn: t("game.columns.words"),
        rightColumn: t("game.columns.definitions"),
        resultAllCorrect: t("results.perfect"),
        finishButton: t("buttons.completeActivity"),
        pairsProgress: (matched: number, total: number) =>
          `${matched}/${total} matched`,
        correctCount: (correct: number, total: number) =>
          `${correct}/${total} correct`,
      }
    : {
        loadErrorToast: t("toast.failedToLoadData"),
        errorTitle: t("toast.failedToLoadData"),
        errorDescription: t("toast.failedToLoad"),
        noCardsTitle: t("noDeck.error"),
        noCardsDescription: t("noDeck.message"),
        startTitle: t("startScreen.title"),
        startSubtitle: t("startScreen.subtitle"),
        languageTitle: t("startScreen.language.title"),
        translationsHint: t("gameplay.translations", { language: "" }),
        startButton: t("startScreen.startButton"),
        completeTitle: t("complete.title"),
        completeSubtitle: t("complete.subtitle", { count: 1 }),
        xpEarned: tCards("xpEarned"),
        completedLabel: tCards("completed"),
        gameTitle: `📚 ${t("gameplay.title")}`,
        gameInstruction: t("gameplay.instruction"),
        leftColumn: t("itemTypes.sentence"),
        rightColumn: t("itemTypes.translation"),
        resultAllCorrect: t("results.allCorrect"),
        finishButton: t("buttons.finishGame"),
        pairsProgress: (matched: number, total: number) =>
          t("gameplay.pairsProgress", { matched, total }),
        correctCount: (correct: number, total: number) =>
          t("gameplay.correctCount", { correct, total }),
      };
  // Game state
  const [gameState, setGameState] = useState<GameState>(GameState.Starting);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    config.languageFromLocale ? toTranslationLanguage(locale) : "en",
  );
  const [vocabularyPairs, setVocabularyPairs] = useState<MatchingPair[]>([]);
  const [shuffledDefinitions, setShuffledDefinitions] = useState<MatchingPair[]>([]);

  // Matching state
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [userMatches, setUserMatches] = useState<UserMatch[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const { user, refresh } = useAuth();

  // Helper states
  const [score, setScore] = useState(0);

  const languageOptions = config.languageOptions;

  // Callback functions
  const handlePairSelect = useCallback(
    (leftId: string, rightId: string) => {
      if (isCompleted) return;

      const correctPair = vocabularyPairs.find((pair) => pair.id === leftId);
      if (!correctPair) return;

      const isCorrect = rightId === correctPair.id;

      const newMatch: UserMatch = {
        leftId,
        rightId,
        isCorrect,
      };

      setUserMatches((prev) => {
        const existing = prev.find((m) => m.leftId === leftId);
        if (existing) {
          return prev.map((m) => (m.leftId === leftId ? newMatch : m));
        } else {
          return [...prev, newMatch];
        }
      });

      setHasUserInteracted(true);
      setSelectedLeft(null);

      if (isCorrect) {
        toast.success(t("results.correctMatch"));
      } else {
        toast.error(t("results.incorrectMatch"));
      }
    },
    [vocabularyPairs, isCompleted, t],
  );

  const handleLeftItemClick = useCallback(
    (leftId: string) => {
      if (isCompleted) return;
      setSelectedLeft((prev) => (prev === leftId ? null : leftId));
    },
    [isCompleted],
  );

  const handleRightItemClick = useCallback(
    (rightId: string) => {
      if (isCompleted || !selectedLeft) return;
      handlePairSelect(selectedLeft, rightId);
    },
    [selectedLeft, isCompleted, handlePairSelect],
  );

  const handleShowAnswers = useCallback(() => {
    setShowCorrectAnswers(true);
    toast.info(t("results.showAnswers"));
  }, [t]);

  const handleComplete = useCallback(async () => {
    setGameState(GameState.Completed);
  }, []);

  // Computed values
  const progress = useMemo(
    () => (userMatches.length / vocabularyPairs.length) * 100 || 0,
    [userMatches.length, vocabularyPairs.length],
  );

  // Load game data
  useEffect(() => {
    const fetchGameData = async () => {
      setGameState(GameState.Loading);
      try {
        const response = await getLessonFlashcards(
          articleId,
          config.requestKind,
        );

        if (response.success && response.cards && response.cards.length > 0) {
          // Transform flashcards to vocabulary pairs
          const pairs: MatchingPair[] = response.cards.map((card: any) => ({
            id: card.id,
            front: config.readFront(card),
            back: config.readBack(card, selectedLanguage),
            audioUrl: card.audioUrl,
            startTime: card.startTime,
            endTime: card.endTime,
          }));

          setVocabularyPairs(pairs);

          // Shuffle definitions for the right column
          const shuffled = shuffle(pairs);
          setShuffledDefinitions(shuffled);

          setGameState(GameState.Starting);
        } else {
          setGameState(GameState.NoCards);
        }
      } catch (error) {
        console.error("Error loading flashcards:", error);
        setGameState(GameState.Error);
        toast.error(labels.loadErrorToast);
      }
    };

    if (gameState === GameState.Playing && vocabularyPairs.length === 0) {
      fetchGameData();
    } else if (
      gameState === GameState.Starting &&
      vocabularyPairs.length === 0
    ) {
      fetchGameData();
    }
  }, [articleId, gameState, selectedLanguage]);

  // Auto-complete check
  useEffect(() => {
    const handleComplete = async () => {
      await updateUserActivity(articleId, config.activityType, 0, {
        score: config.activityScore,
      });
      await refresh();
    };
    if (
      vocabularyPairs.length > 0 &&
      userMatches.length === vocabularyPairs.length &&
      !isCompleted &&
      hasUserInteracted
    ) {
      const correctCount = userMatches.filter(
        (match) => match.isCorrect,
      ).length;
      const isAllCorrect = correctCount === vocabularyPairs.length;

      setIsCompleted(true);
      setShowResult(true);
      handleComplete();

      if (isAllCorrect) {
        setScore((prev) => prev + 1);
        toast.success(t("results.perfect"));
      } else {
        toast.error(
          t("results.tryAgain", {
            correct: correctCount,
            total: vocabularyPairs.length,
          }),
        );
      }
    }
  }, [userMatches, vocabularyPairs.length, isCompleted, hasUserInteracted]);

  // Loading state
  if (gameState === GameState.Loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8">
            <div className="flex min-h-[400px] flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600 dark:border-emerald-800 dark:border-t-emerald-400"></div>
                <GraduationCap className="absolute inset-0 m-auto h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="space-y-2 text-center">
                <h3 className="text-lg font-semibold">{t("loading.title")}</h3>
                <p className="text-muted-foreground">
                  {t("loading.description")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No cards state
  if (gameState === GameState.NoCards) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8">
            <div className="flex min-h-[400px] flex-col items-center justify-center space-y-6">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                <GraduationCap className="h-12 w-12 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="space-y-2 text-center">
                <h3 className="text-lg font-semibold">{labels.noCardsTitle}</h3>
                <p className="text-muted-foreground">{labels.noCardsDescription}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (gameState === GameState.Error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8">
            <div className="flex min-h-[400px] flex-col items-center justify-center space-y-6">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
              <div className="space-y-2 text-center">
                <h3 className="text-lg font-semibold">
                  {labels.errorTitle}
                </h3>
                <p className="text-muted-foreground">
                  {labels.errorDescription}
                </p>
              </div>
              <Button
                onClick={() => {
                  setGameState(GameState.Starting);
                  setVocabularyPairs([]);
                }}
                variant="outline"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {t("buttons.tryAgain")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState === GameState.Starting) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="space-y-6">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/20">
                <GraduationCap className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">
                  {labels.startTitle}
                </h3>
                <p className="text-muted-foreground">
                  {labels.startSubtitle}
                </p>
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="w-full max-w-md space-y-4">
                    <div className="flex items-center justify-center gap-2">
                      <Languages className="h-5 w-5 text-indigo-500" />
                      <Label className="text-base font-semibold">
                        {labels.languageTitle}
                      </Label>
                    </div>
                    <Select
                      value={selectedLanguage}
                      onValueChange={(value) => {
                        setSelectedLanguage(value);
                        // Reset vocabulary to force re-fetch with new language
                        setVocabularyPairs([]);
                        setShuffledDefinitions([]);
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
                    <p className="text-muted-foreground text-center text-xs">
                      {labels.translationsHint}
                    </p>
                  </div>
                  <Button
                    onClick={() => setGameState(GameState.Playing)}
                    size="lg"
                    className="w-full max-w-md"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    {labels.startButton}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState === GameState.Completed) {
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
                    {labels.completeTitle}
                  </h2>
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    {labels.completeSubtitle}
                  </p>
                </div>
              </div>

              <Separator className="bg-emerald-200 dark:bg-emerald-800" />

              {/* Stats Grid */}
              <div className="flex items-center justify-center gap-4">
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    20
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {labels.xpEarned}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    5/5
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {labels.completedLabel}
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

  // Playing state - Main game UI
  return (
    <div className="container mx-auto max-w-6xl space-y-4 px-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <span>
            {labels.pairsProgress(
              userMatches.length,
              vocabularyPairs.length,
            )}
          </span>
          <span>
            {labels.correctCount(
              userMatches.filter((m) => m.isCorrect).length,
              vocabularyPairs.length,
            )}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-3">
              <CardTitle className="text-xl">{labels.gameTitle}</CardTitle>
              <p className="text-muted-foreground text-sm">
                {labels.gameInstruction}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Matching game grid */}
          <div className="bg-muted/10 border-muted-foreground/25 rounded-lg border-2">
            <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
              {/* Left column - Words */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <h3 className="font-medium">{labels.leftColumn}</h3>
                </div>
                <div className="space-y-2">
                  {vocabularyPairs.map((pair) => {
                    const isSelected = selectedLeft === pair.id;
                    const userMatch = userMatches.find(
                      (m) => m.leftId === pair.id,
                    );
                    const isMatched = !!userMatch;
                    const isCorrect = userMatch?.isCorrect;

                    return (
                      <Button
                        key={pair.id}
                        onClick={() => handleLeftItemClick(pair.id)}
                        variant="outline"
                        className={cn(
                          "h-auto min-h-[3rem] w-full justify-start p-4 text-left whitespace-normal transition-all",
                          isSelected && "ring-primary border-primary ring-2",
                          isMatched &&
                            isCorrect &&
                            isCompleted &&
                            "border-green-500 bg-green-50 dark:bg-green-950/20",
                          isMatched &&
                            !isCorrect &&
                            isCompleted &&
                            "border-red-500 bg-red-50 dark:bg-red-950/20",
                          isCompleted && "cursor-default",
                        )}
                        disabled={isCompleted}
                      >
                        <div className="flex w-full items-start gap-2">
                          {isMatched && isCorrect && (
                            <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" />
                          )}
                          {isMatched && !isCorrect && (
                            <XCircle className="h-4 w-4 flex-shrink-0 text-red-600" />
                          )}
                          <span className="text-base leading-relaxed font-semibold break-words">
                            {pair.front}
                          </span>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Right column - Definitions */}
              <div className="space-y-3 lg:col-start-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 flex-shrink-0 rounded-full bg-green-500" />
                    <h3 className="font-medium">
                      {labels.rightColumn}
                    </h3>
                  </div>
                  {selectedLanguage &&
                    languageOptions[
                      selectedLanguage as keyof typeof languageOptions
                    ] && (
                      <span className="text-muted-foreground text-xs font-normal">
                        (
                        {
                          languageOptions[
                            selectedLanguage as keyof typeof languageOptions
                          ].flag
                        }{" "}
                        {
                          languageOptions[
                            selectedLanguage as keyof typeof languageOptions
                          ].name
                        }
                        )
                      </span>
                    )}
                </div>
                <div className="space-y-2">
                  {shuffledDefinitions.map((pair) => {
                    const userMatch = userMatches.find(
                      (m) => m.rightId === pair.id,
                    );
                    const isMatched = !!userMatch;
                    const isCorrect = userMatch?.isCorrect;

                    return (
                      <Button
                        key={pair.id}
                        onClick={() => handleRightItemClick(pair.id)}
                        variant="outline"
                        className={cn(
                          "h-auto min-h-[3rem] w-full justify-start p-4 text-left whitespace-normal transition-all",
                          !selectedLeft && "cursor-not-allowed opacity-50",
                          isMatched &&
                            isCorrect &&
                            isCompleted &&
                            "border-green-500 bg-green-50 dark:bg-green-950/20",
                          isMatched &&
                            !isCorrect &&
                            isCompleted &&
                            "border-red-500 bg-red-50 dark:bg-red-950/20",
                          isCompleted && "cursor-default",
                        )}
                        disabled={!selectedLeft || isCompleted}
                      >
                        <div className="flex w-full items-start gap-2">
                          {isMatched && isCorrect && (
                            <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" />
                          )}
                          {isMatched && !isCorrect && (
                            <XCircle className="h-4 w-4 flex-shrink-0 text-red-600" />
                          )}
                          <span className="text-sm leading-relaxed break-words">
                            {pair.back}
                          </span>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Result card */}
          {showResult && (
            <Card
              aria-live="polite"
              className={cn(
                "border-2",
                userMatches.every((m) => m.isCorrect)
                  ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                  : "border-red-500 bg-red-50 dark:bg-red-950/20",
              )}
            >
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    {userMatches.every((m) => m.isCorrect) ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600" />
                    )}
                    <h3 className="text-lg font-semibold">
                      {userMatches.every((m) => m.isCorrect)
                        ? labels.resultAllCorrect
                        : t("results.partialCorrect", {
                            correct: userMatches.filter((m) => m.isCorrect)
                              .length,
                            total: vocabularyPairs.length,
                          })}
                    </h3>
                  </div>

                  {!userMatches.every((m) => m.isCorrect) &&
                    showCorrectAnswers && (
                      <div className="space-y-3">
                        <Separator />
                        <div>
                          <h4 className="mb-3 font-medium">
                            {t("results.correctMatches")}
                          </h4>
                          <div className="space-y-2">
                            {vocabularyPairs.map((pair, index) => (
                              <div key={pair.id} className="flex gap-3 text-sm">
                                <span className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold">
                                  {index + 1}
                                </span>
                                <p className="flex-1">
                                  <span className="font-semibold">
                                    {pair.front}
                                  </span>
                                  <span className="text-muted-foreground mx-2">
                                    →
                                  </span>
                                  <span>{pair.back}</span>
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

          {/* Action buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            {isCompleted &&
              !userMatches.every((m) => m.isCorrect) &&
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

            {isCompleted && userMatches.every((m) => m.isCorrect) && (
              <Button onClick={handleComplete} className="flex-1">
                {labels.finishButton}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Renders the lesson sentence or vocabulary matching game.
 * @param articleId Article the pairs belong to.
 * @param cardKind Whether to match sentences or vocabulary.
 * @returns The lesson matching game.
 */
export function LessonMatchingGame({
  articleId,
  cardKind,
}: {
  articleId: string;
  cardKind: FlashcardType;
}) {
  return <MatchingGameBody articleId={articleId} cardKind={cardKind} />;
}

export default LessonMatchingGame;
