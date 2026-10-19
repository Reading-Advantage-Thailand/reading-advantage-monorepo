"use client";
import { usePreviewSave } from "@/components/student/student-view-provider";
import {
  ActivityType,
  FlashcardType,
  GameState,
  UserXpEarned,
} from "@/types/enum";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
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
import { RpgButton } from "@/components/rpg/chrome";
import {
  SENTENCE_LANGUAGES,
  VOCABULARY_LANGUAGES,
} from "../../flashcards/deck-view";
import { Label, Separator } from "@reading-advantage/ui";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
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
  const { isPreview, notSaved } = usePreviewSave();

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
      if (isPreview) {
        notSaved();
        return;
      }
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
        <div className="cq-panel p-8">
          <div className="flex min-h-[400px] flex-col items-center justify-center space-y-6">
            <div className="relative">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-[var(--cq-parchment-edge)] border-t-[var(--cq-wood-dark)]"></div>
              <GraduationCap className="absolute inset-0 m-auto h-8 w-8 text-[var(--cq-wood-dark)]" />
            </div>
            <div className="space-y-2 text-center">
              <h3 className="text-lg font-semibold">{t("loading.title")}</h3>
              <p className="cq-muted">
                {t("loading.description")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No cards state
  if (gameState === GameState.NoCards) {
    return (
      <div className="space-y-6">
        <div className="cq-panel p-8">
          <div className="flex min-h-[400px] flex-col items-center justify-center space-y-6">
            <span className="lf-medal mx-auto grid size-24">
              <GraduationCap className="h-12 w-12 text-[var(--cq-wood-dark)]" />
            </span>
            <div className="space-y-2 text-center">
              <h3 className="text-lg font-semibold">{labels.noCardsTitle}</h3>
              <p className="cq-muted">{labels.noCardsDescription}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (gameState === GameState.Error) {
    return (
      <div className="space-y-6">
        <div className="cq-panel p-8">
          <div className="flex min-h-[400px] flex-col items-center justify-center space-y-6">
            <span className="lf-bad mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2">
              <XCircle className="h-12 w-12" />
            </span>
            <div className="space-y-2 text-center">
              <h3 className="text-lg font-semibold">
                {labels.errorTitle}
              </h3>
              <p className="cq-muted">
                {labels.errorDescription}
              </p>
            </div>
            <RpgButton
              onClick={() => {
                setGameState(GameState.Starting);
                setVocabularyPairs([]);
              }}
            >
              <RotateCcw className="h-4 w-4" />
              {t("buttons.tryAgain")}
            </RpgButton>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === GameState.Starting) {
    return (
      <div className="space-y-6">
        <div className="cq-panel p-8 text-center">
          <div className="space-y-6">
            <span className="lf-medal mx-auto grid size-24">
              <GraduationCap className="h-12 w-12 text-[var(--cq-wood-dark)]" />
            </span>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">
                {labels.startTitle}
              </h3>
              <p className="cq-muted">
                {labels.startSubtitle}
              </p>
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="w-full max-w-md space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <Languages className="h-5 w-5 text-[var(--cq-wood-dark)]" />
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
                    <SelectTrigger className="h-12 w-full border-2 border-[var(--cq-parchment-edge)] bg-white/40 dark:bg-white/40 dark:hover:bg-white/50">
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
                  <p className="cq-muted text-center text-xs">
                    {labels.translationsHint}
                  </p>
                </div>
                <RpgButton
                  tone="gold"
                  onClick={() => setGameState(GameState.Playing)}
                  className="w-full max-w-md"
                >
                  <Play className="h-4 w-4" />
                  {labels.startButton}
                </RpgButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === GameState.Completed) {
    return (
      <div className="space-y-6">
        <div className="cq-panel overflow-hidden p-8 pb-14 text-center">
          <div className="space-y-6">
            {/* Trophy and celebration */}
            <div className="space-y-4">
              <div className="relative mx-auto w-fit">
                <span className="lf-medal grid size-24">
                  <Trophy className="h-12 w-12 text-[var(--cq-wood-dark)]" />
                </span>
                <div className="absolute -top-2 -right-2">
                  <Sparkles className="h-8 w-8 animate-pulse text-[var(--cq-gold-dark)]" />
                </div>
                <div className="absolute -bottom-2 -left-2">
                  <Star className="h-6 w-6 animate-pulse text-[var(--cq-gold-dark)]" />
                </div>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <h2 className="cq-sign text-2xl md:text-3xl">
                  {labels.completeTitle}
                </h2>
                <p className="cq-muted text-lg">
                  {labels.completeSubtitle}
                </p>
              </div>
            </div>

            <Separator className="bg-[var(--cq-parchment-edge)]" />

            {/* Stats Grid */}
            <div className="flex items-center justify-center gap-4">
              <div className="space-y-2">
                <div className="lf-text-gold text-2xl font-bold">
                  {config.activityScore}
                </div>
                <div className="cq-muted text-sm">
                  {labels.xpEarned}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {userMatches.filter((match) => match.isCorrect).length}/{vocabularyPairs.length}
                </div>
                <div className="cq-muted text-sm">
                  {labels.completedLabel}
                </div>
              </div>
            </div>

            <Separator className="bg-[var(--cq-parchment-edge)]" />
          </div>
        </div>
      </div>
    );
  }

  // The look of a matching choice: a parchment well, gold when chosen, deep green or red with an icon after the round.
  const choiceClass = "lf-well flex h-auto min-h-[3rem] w-full items-start justify-start p-4 text-left whitespace-normal transition-all hover:brightness-105 focus-visible:ring-2 focus-visible:ring-[var(--cq-gold-dark)] focus-visible:outline-none";

  // Playing state - Main game UI
  return (
    <div className="container mx-auto max-w-6xl space-y-4 px-4">
      {/* Progress bar */}
      <div className="cq-panel space-y-2 py-3">
        <div className="cq-muted flex items-center justify-between text-sm">
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
        <Progress value={progress} className="h-3 border-2 border-[var(--cq-wood-dark)] bg-[#2a1d12] [&>[data-slot=progress-indicator]]:bg-[var(--cq-green)]" />
      </div>

      <div className="cq-panel p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-3">
            <p className="text-xl font-semibold">{labels.gameTitle}</p>
            <p className="cq-muted text-sm">
              {labels.gameInstruction}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {/* Matching game grid */}
          <div className="rounded-lg border-2 border-dashed border-[var(--cq-parchment-edge)]">
            <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
              {/* Left column - Words */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="lf-stud" />
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
                      <button
                        type="button"
                        key={pair.id}
                        onClick={() => handleLeftItemClick(pair.id)}
                        className={cn(
                          choiceClass,
                          isSelected && "lf-well--gold",
                          isMatched &&
                            isCorrect &&
                            isCompleted &&
                            "lf-good",
                          isMatched &&
                            !isCorrect &&
                            isCompleted &&
                            "lf-bad",
                          isCompleted && "cursor-default",
                        )}
                        disabled={isCompleted}
                      >
                        <div className="flex w-full items-start gap-2">
                          {isMatched && isCorrect && (
                            <CheckCircle className="lf-text-good h-4 w-4 flex-shrink-0" />
                          )}
                          {isMatched && !isCorrect && (
                            <XCircle className="lf-text-bad h-4 w-4 flex-shrink-0" />
                          )}
                          <span className="text-base leading-relaxed font-semibold break-words">
                            {pair.front}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right column - Definitions */}
              <div className="space-y-3 lg:col-start-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div className="lf-stud" />
                    <h3 className="font-medium">
                      {labels.rightColumn}
                    </h3>
                  </div>
                  {selectedLanguage &&
                    languageOptions[
                      selectedLanguage as keyof typeof languageOptions
                    ] && (
                      <span className="cq-muted text-xs font-normal">
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
                      <button
                        type="button"
                        key={pair.id}
                        onClick={() => handleRightItemClick(pair.id)}
                        className={cn(
                          choiceClass,
                          !selectedLeft && !isCompleted && "cursor-not-allowed opacity-50",
                          isMatched &&
                            isCorrect &&
                            isCompleted &&
                            "lf-good",
                          isMatched &&
                            !isCorrect &&
                            isCompleted &&
                            "lf-bad",
                          isCompleted && "cursor-default",
                        )}
                        disabled={!selectedLeft || isCompleted}
                      >
                        <div className="flex w-full items-start gap-2">
                          {isMatched && isCorrect && (
                            <CheckCircle className="lf-text-good h-4 w-4 flex-shrink-0" />
                          )}
                          {isMatched && !isCorrect && (
                            <XCircle className="lf-text-bad h-4 w-4 flex-shrink-0" />
                          )}
                          <span className="text-sm leading-relaxed break-words">
                            {pair.back}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Result card */}
          {showResult && (
            <div
              aria-live="polite"
              className={cn(
                "rounded-xl border-2 p-6",
                userMatches.every((m) => m.isCorrect)
                  ? "lf-good"
                  : "lf-bad",
              )}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                  {userMatches.every((m) => m.isCorrect) ? (
                    <CheckCircle className="lf-text-good h-6 w-6" />
                  ) : (
                    <XCircle className="lf-text-bad h-6 w-6" />
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
                      <Separator className="bg-[var(--cq-parchment-edge)]" />
                      <div>
                        <h4 className="mb-3 font-medium">
                          {t("results.correctMatches")}
                        </h4>
                        <div className="space-y-2">
                          {vocabularyPairs.map((pair, index) => (
                            <div key={pair.id} className="flex gap-3 text-sm">
                              <span className="lf-medal size-6 shrink-0 text-xs font-bold">
                                {index + 1}
                              </span>
                              <p className="flex-1">
                                <span className="font-semibold">
                                  {pair.front}
                                </span>
                                <span className="mx-2 opacity-70">
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
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            {isCompleted &&
              !userMatches.every((m) => m.isCorrect) &&
              !showCorrectAnswers && (
                <RpgButton
                  tone="iron"
                  small
                  onClick={handleShowAnswers}
                  className="sm:w-auto"
                >
                  <Eye className="h-4 w-4" />
                  {t("buttons.showAnswers")}
                </RpgButton>
              )}

            {isCompleted && userMatches.every((m) => m.isCorrect) && (
              <RpgButton tone="gold" onClick={handleComplete} className="flex-1">
                {labels.finishButton}
              </RpgButton>
            )}
          </div>
        </div>
      </div>
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
