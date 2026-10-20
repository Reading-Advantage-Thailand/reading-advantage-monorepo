"use client";

import { isPreviewResult } from "@/lib/student-view";
import { usePreviewSave } from "@/components/student/student-view-provider";
import { useState, useEffect, useTransition, useContext } from "react";
import { Meter, RpgButton } from "@/components/rpg/chrome";
import { Separator, Label } from "@reading-advantage/ui";
import {
  Trophy,
  Clock,
  RotateCcw,
  Eye,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Zap,
  Target,
  Brain,
  Lightbulb,
  GraduationCap,
  Sparkles,
  Star,
  Languages,
  RefreshCcwIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Rating } from "ts-fsrs";
import { toast } from "sonner";
import AudioButton from "@/components/audio-button";
import { getLessonFlashcards, reviewCard } from "@/actions/flashcard";
import { ActivityType, FlashcardType, UserXpEarned } from "@/types/enum";
import {
  Select,
  SelectValue,
  SelectItem,
  SelectContent,
  SelectTrigger,
} from "@/components/ui/select";
import {
  SENTENCE_LANGUAGES,
  VOCABULARY_LANGUAGES,
} from "../../flashcards/deck-view";
import { toTranslationLanguage } from "@/lib/translation-language";
import { QuizContext, QuizContextProvider } from "@/contexts/question-context";
import { updateUserActivity } from "@/actions/user";
import { useAuth } from "@reading-advantage/auth-client";
import { formatTimePadded } from "@/lib/format-time";

enum GameState {
  LOADING = "LOADING",
  PLAYING = "PLAYING",
  COMPLETED = "COMPLETED",
  NO_CARDS = "NO_CARDS",
  START_GAME = "START_GAME",
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

/**
 * Single lesson flashcard shape covering both variants.
 * Sentence cards fill sentence/translation; vocabulary cards fill word/definition.
 */
export interface LessonFlashcard {
  id: string;
  state: string;
  startTime?: number;
  endTime?: number;
  audioUrl?: string;
  sentence?: string;
  word?: string;
  translation?: Record<string, string>;
  definition?: Record<string, string>;
}

/**
 * Translation keys for every divergent label slot in the flashcard flow.
 * Each kind keeps its own namespace and key strings exactly as before.
 */
export interface LessonFlashcardLabels {
  completeTitle: string;
  completeSubtitle: string;
  completeXp: string;
  completeTime: string;
  completeCount: string;
  loadingTitle: string;
  loadingSubtitle: string;
  errorTitle: string;
  errorDescription: string;
  errorRetry: string;
  emptyTitle: string;
  emptyDescription: string;
  startTitle: string;
  startSubtitle: string;
  startLanguageLabel: string;
  startLanguageNote: string;
  startButton: string;
  headerTitle: string;
  headerProgress: string;
  headerProgressLabel: string;
  headerPercent: string;
  badgeType: string;
  badgeNew: string;
  badgeLearning: string;
  badgeReview: string;
  badgeRelearning: string;
  ratingPrompt: string;
  ratingAgain: string;
  ratingHard: string;
  ratingGood: string;
  ratingEasy: string;
  thinkPrompt: string;
  showAnswer: string;
  statsCompleted: string;
  statsRemaining: string;
  statsTotal: string;
}

/**
 * Per-kind configuration driving the parameterized flashcard game.
 * Holds the fetch kind, card field accessors, language options,
 * label namespace keys, and finish payload for one card kind.
 */
export interface LessonFlashcardConfig {
  /** Card kind passed to getLessonFlashcards. */
  flashcardType: FlashcardType;
  /** Activity reported to updateUserActivity on round end. */
  activityType: ActivityType;
  /** XP shown and reported on round end. */
  xp: UserXpEarned;
  /** next-intl namespace holding this kind's keys. */
  namespace: string;
  /** Initial translation language for the given locale. */
  initialLanguage: (locale: string) => string;
  /** Language options for the start-screen selector. */
  languages: Record<
    string,
    { code: string; name: string; flag: string; nativeName: string }
  >;
  /** Front (prompt) text of a card. */
  getFront: (card: LessonFlashcard) => string;
  /** Back (answer) text of a card in the selected language. */
  getBack: (card: LessonFlashcard, language: string) => string;
  /** Divergent label keys for this kind. */
  labels: LessonFlashcardLabels;
}

/**
 * Per-kind configs for the lesson flashcard game.
 * Sentence keeps the SentenceFlashcards namespace with a locale-derived
 * initial language; vocabulary keeps Lesson.VocabularyFlashcards with "en".
 */
export const LESSON_FLASHCARD_CONFIGS: Record<
  FlashcardType,
  LessonFlashcardConfig
> = {
  [FlashcardType.SENTENCE]: {
    flashcardType: FlashcardType.SENTENCE,
    activityType: ActivityType.SENTENCE_FLASHCARDS,
    xp: UserXpEarned.SENTENCE_FLASHCARDS,
    namespace: "SentenceFlashcards",
    initialLanguage: (locale) => toTranslationLanguage(locale),
    languages: SENTENCE_LANGUAGES,
    getFront: (card) => card.sentence ?? "",
    getBack: (card, language) => card.translation?.[language] ?? "",
    labels: {
      completeTitle: "complete.title",
      completeSubtitle: "complete.subtitle",
      completeXp: "complete.xpEarned",
      completeTime: "complete.timeTaken",
      completeCount: "complete.completedLabel",
      loadingTitle: "loading.title",
      loadingSubtitle: "loading.subtitle",
      errorTitle: "error.title",
      errorDescription: "error.description",
      errorRetry: "error.retry",
      emptyTitle: "empty.title",
      emptyDescription: "empty.description",
      startTitle: "start.title",
      startSubtitle: "start.subtitle",
      startLanguageLabel: "start.language",
      startLanguageNote: "start.languageNote",
      startButton: "start.startButton",
      headerTitle: "header.title",
      headerProgress: "header.progress",
      headerProgressLabel: "header.progressLabel",
      headerPercent: "header.percentComplete",
      badgeType: "badge.typeSentence",
      badgeNew: "badge.new",
      badgeLearning: "badge.learning",
      badgeReview: "badge.review",
      badgeRelearning: "badge.relearning",
      ratingPrompt: "rating.prompt",
      ratingAgain: "rating.again",
      ratingHard: "rating.hard",
      ratingGood: "rating.good",
      ratingEasy: "rating.easy",
      thinkPrompt: "prompt.thinkAndReveal",
      showAnswer: "buttons.showAnswer",
      statsCompleted: "stats.completed",
      statsRemaining: "stats.remaining",
      statsTotal: "stats.total",
    },
  },
  [FlashcardType.VOCABULARY]: {
    flashcardType: FlashcardType.VOCABULARY,
    activityType: ActivityType.VOCABULARY_FLASHCARDS,
    xp: UserXpEarned.VOCABULARY_FLASHCARDS,
    namespace: "Lesson.VocabularyFlashcards",
    initialLanguage: () => "en",
    languages: VOCABULARY_LANGUAGES,
    getFront: (card) => card.word ?? "",
    getBack: (card, language) => card.definition?.[language] ?? "",
    labels: {
      completeTitle: "completion.title",
      completeSubtitle: "completion.subtitle",
      completeXp: "completion.xpEarned",
      completeTime: "completion.timeTaken",
      completeCount: "completion.completed",
      loadingTitle: "loading.title",
      loadingSubtitle: "loading.description",
      errorTitle: "error.title",
      errorDescription: "error.description",
      errorRetry: "common.tryAgain",
      emptyTitle: "empty.title",
      emptyDescription: "empty.description",
      startTitle: "start.title",
      startSubtitle: "start.description",
      startLanguageLabel: "start.translationLanguage",
      startLanguageNote: "start.translationHint",
      startButton: "start.startButton",
      headerTitle: "playing.header",
      headerProgress: "playing.cardOf",
      headerProgressLabel: "playing.progress",
      headerPercent: "playing.percentComplete",
      badgeType: "playing.badgeVocabulary",
      badgeNew: "playing.state.new",
      badgeLearning: "playing.state.learning",
      badgeReview: "playing.state.review",
      badgeRelearning: "playing.state.relearning",
      ratingPrompt: "playing.rating.prompt",
      ratingAgain: "playing.rating.again",
      ratingHard: "playing.rating.hard",
      ratingGood: "playing.rating.good",
      ratingEasy: "playing.rating.easy",
      thinkPrompt: "playing.thinkPrompt",
      showAnswer: "playing.showAnswer",
      statsCompleted: "stats.completed",
      statsRemaining: "stats.remaining",
      statsTotal: "stats.total",
    },
  },
};

function LessonFlashcardView({
  articleId,
  cardKind,
}: {
  articleId: string;
  cardKind: FlashcardType;
}) {
  const config = LESSON_FLASHCARD_CONFIGS[cardKind];
  const labels = config.labels;
  const t = useTranslations(config.namespace);
  const locale = useLocale();
  // State management
  const [gameState, setGameState] = useState<GameState>(GameState.LOADING);
  const [words, setWords] = useState<LessonFlashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [completedCards, setCompletedCards] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() =>
    config.initialLanguage(locale),
  );
  const [isPending, startTransition] = useTransition();
  const [completionData] = useState<CompletionData | null>(null);
  const [cardRating, setCardRating] = useState<{ [cardId: string]: Rating }>(
    {},
  );
  const { timer, setPaused } = useContext(QuizContext);
  const { refresh } = useAuth();
  const { isPreview, notSaved } = usePreviewSave();

  // Computed values
  const currentCard = words[currentCardIndex];

  const loadGameData = async () => {
    try {
      setGameState(GameState.LOADING);

      // Check for existing completion first
      //   await checkExistingCompletion();

      // If already completed, don't load cards
      if (gameState === GameState.COMPLETED) return;

      const response = await getLessonFlashcards(
        articleId,
        config.flashcardType,
      );

      setWords(response.cards as LessonFlashcard[]);
      setGameState(GameState.START_GAME);
      //   setCurrentCardIndex(0);
      //   setStartTime(Date.now());
      //   setIsTimerRunning(true);
    } catch (error) {
      console.error("Error loading game data:", error);
      setGameState(GameState.ERROR);
    }
  };

  // Game logic
  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleCardRating = async (rating: Rating) => {
    if (isPending) return;

    setCardRating((prev) => ({ ...prev, [currentCard.id]: rating }));

    if (currentCardIndex < words.length - 1) {
      setCurrentCardIndex((prev) => prev + 1);
      setCompletedCards((prev) => prev + 1);

      setWords((prev) =>
        prev.map((card, index) =>
          index === currentCardIndex + 1 ? { ...card, flipped: false } : card,
        ),
      );
      setShowAnswer(false);
    } else {
      const finalCompleted = completedCards + 1;
      setCompletedCards(finalCompleted);
      setPaused(true);
      startTransition(async () => {
        try {
          if (isPreview) {
            notSaved();
            return;
          }
          const reviewPromises = Object.entries({
            ...cardRating,
            [currentCard.id]: rating,
          }).map(([cardId, cardRating]) =>
            reviewCard(cardId, cardRating as Rating),
          );

          const results = await Promise.all(reviewPromises);

          const allSuccess = results.every((r) => !isPreviewResult(r) && r.success);

          if (allSuccess) {
            await updateUserActivity(
              articleId,
              config.activityType,
              timer,
              {
                // Pinned quirk: reports the pre-rating state, so the final
                // card's rating is excluded here while reviewCard above still
                // saves every rating. Preserved exactly as characterized.
                details: {
                  cardRating,
                },
                score: config.xp,
              },
            );
            await refresh();
          } else {
            toast.error("Failed to save ratings");
          }
        } catch (error) {
          console.error("Error rating cards:", error);
          toast.error("Failed to save ratings");
        }
      });

      setGameState(GameState.COMPLETED);
    }
  };

  // Initialize game on mount
  useEffect(() => {
    loadGameData();
  }, []);

  // Force render completion if we have completion data (for debugging)
  const shouldShowCompletion =
    gameState === GameState.COMPLETED ||
    (completionData && completionData.isExistingCompletion);

  if (shouldShowCompletion) {
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
                  {t(labels.completeTitle)}
                </h2>
                <p className="cq-muted text-lg">
                  {t(labels.completeSubtitle)}
                </p>
              </div>
            </div>

            <Separator className="bg-[var(--cq-parchment-edge)]" />

            {/* Stats Grid */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="lf-text-gold text-2xl font-bold">
                  {config.xp}
                </div>
                <div className="cq-muted text-sm">
                  {t(labels.completeXp)}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold tabular-nums">
                  {formatTimePadded(timer)}
                </div>
                <div className="cq-muted text-sm">
                  {t(labels.completeTime)}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {completedCards}/{words.length}
                </div>
                <div className="cq-muted text-sm">
                  {t(labels.completeCount)}
                </div>
              </div>
            </div>

            <Separator className="bg-[var(--cq-parchment-edge)]" />
          </div>
        </div>
      </div>
    );
  }

  // Render loading state
  if (gameState === GameState.LOADING) {
    return (
      <div className="space-y-6">
        <div className="cq-panel overflow-hidden p-8">
          <div className="flex min-h-[400px] flex-col items-center justify-center space-y-6">
            <div className="relative">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-[var(--cq-parchment-edge)] border-t-[var(--cq-wood-dark)]"></div>
              <GraduationCap className="absolute inset-0 m-auto h-8 w-8 text-[var(--cq-wood-dark)]" />
            </div>
            <div className="space-y-2 text-center">
              <h3 className="text-lg font-semibold">
                {t(labels.loadingTitle)}
              </h3>
              <p className="cq-muted">
                {t(labels.loadingSubtitle)}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (gameState === GameState.ERROR) {
    return (
      <div className="space-y-6">
        <div className="cq-panel p-8 text-center">
          <div className="space-y-6">
            <AlertTriangle className="lf-text-bad mx-auto h-16 w-16" />
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">
                {t(labels.errorTitle)}
              </h3>
              <p className="cq-muted">
                {t(labels.errorDescription)}
              </p>
            </div>
            <RpgButton onClick={loadGameData}>
              <RotateCcw className="h-4 w-4" />
              {t(labels.errorRetry)}
            </RpgButton>
          </div>
        </div>
      </div>
    );
  }

  // Render no current card state
  if (!currentCard) {
    return (
      <div className="space-y-6">
        <div className="cq-panel p-8 text-center">
          <div className="space-y-6">
            <AlertTriangle className="mx-auto h-12 w-12 text-[var(--cq-gold-dark)]" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">
                {t(labels.emptyTitle)}
              </h3>
              <p className="cq-muted">
                {t(labels.emptyDescription)}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate progress
  const progress = (currentCardIndex / words.length) * 100;

  const languageOptions = config.languages;

  if (gameState === GameState.START_GAME) {
    return (
      <div className="space-y-6">
        <div className="cq-panel p-8 text-center">
          <div className="space-y-6">
            <span className="lf-medal mx-auto grid size-24">
              <GraduationCap className="h-12 w-12 text-[var(--cq-wood-dark)]" />
            </span>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">{t(labels.startTitle)}</h3>
              <p>{t(labels.startSubtitle)}</p>
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="w-full max-w-md space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <Languages className="h-5 w-5 text-[var(--cq-wood-dark)]" />
                    <Label className="text-base font-semibold">
                      {t(labels.startLanguageLabel)}
                    </Label>
                  </div>
                  <Select
                    value={selectedLanguage}
                    onValueChange={(value) => {
                      setSelectedLanguage(value);
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
                  <p className="cq-muted text-xs">
                    {t(labels.startLanguageNote)}
                  </p>
                </div>
                <RpgButton tone="gold" onClick={() => setGameState(GameState.PLAYING)}>
                  {t(labels.startButton)}
                </RpgButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render playing state
  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="cq-panel p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xl font-bold">
              {t(labels.headerTitle)}
            </p>
            <p className="cq-muted text-sm">
              {t(labels.headerProgress, {
                current: currentCardIndex + 1,
                total: words.length,
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="lg-chip inline-flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--cq-wood-dark)]" />
              <span className="tabular-nums">
                {formatTimePadded(timer)}
              </span>
            </span>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <Meter
            value={currentCardIndex}
            max={words.length}
            tone="gold"
            thin
            label={t(labels.headerProgressLabel)}
          />
          <div className="flex items-center justify-between text-sm">
            <span className="cq-muted">
              {t(labels.headerProgressLabel)}
            </span>
            <span className="font-medium">
              {t(labels.headerPercent, { percent: Math.round(progress) })}
            </span>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="cq-panel min-h-[500px] p-8">
        <div className="space-y-8">
          {/* Card Type Indicators */}
          <div className="flex items-center justify-between">
            <span className="lg-chip inline-flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-[var(--cq-wood-dark)]" />
              {t(labels.badgeType)}
            </span>
            <span className="lg-chip inline-flex items-center gap-2">
              {currentCard.state === "NEW" && (
                <>
                  <Lightbulb className="lf-text-gold h-4 w-4" />
                  {t(labels.badgeNew)}
                </>
              )}

              {currentCard.state === "LEARNING" && (
                <>
                  <Brain className="h-4 w-4 text-[var(--cq-wood-dark)]" />
                  {t(labels.badgeLearning)}
                </>
              )}
              {currentCard.state === "REVIEW" && (
                <>
                  <Target className="lf-text-good h-4 w-4" />
                  {t(labels.badgeReview)}
                </>
              )}
              {currentCard.state === "RELEARNING" && (
                <>
                  <RefreshCcwIcon className="lf-text-good h-4 w-4" />
                  {t(labels.badgeRelearning)}
                </>
              )}
            </span>
          </div>

          {/* Question Side */}
          <div className="lf-well space-y-6 p-6 text-center">
            <div className="space-y-4">
              <h2 className="text-5xl font-bold text-[var(--cq-wood-dark)]">
                {config.getFront(currentCard)}
              </h2>
              <div className="flex justify-center gap-3">
                {currentCard.audioUrl && (
                  <AudioButton
                    audioUrl={currentCard.audioUrl}
                    startTimestamp={currentCard.startTime || 0}
                    endTimestamp={currentCard.endTime || 0}
                  />
                )}
              </div>
            </div>
          </div>

          <Separator className="my-8 bg-[var(--cq-parchment-edge)]" />

          {/* Answer Side */}
          {showAnswer ? (
            <div className="space-y-8">
              <div className="space-y-6 text-center">
                <h3 className="text-3xl font-medium">
                  {config.getBack(currentCard, selectedLanguage)}
                </h3>
              </div>

              {/* Rating Buttons */}
              <div className="space-y-6">
                <div className="text-center">
                  <p className="cq-muted text-lg">
                    {t(labels.ratingPrompt)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <RpgButton
                    onClick={() => handleCardRating(Rating.Again)}
                    disabled={isPending}
                    className="h-20 flex-col gap-1"
                  >
                    <ThumbsDown className="h-6 w-6" />
                    <span className="text-sm font-medium">
                      {t(labels.ratingAgain)}
                    </span>
                  </RpgButton>
                  <RpgButton
                    onClick={() => handleCardRating(Rating.Hard)}
                    disabled={isPending}
                    className="h-20 flex-col gap-1"
                  >
                    <AlertTriangle className="h-6 w-6" />
                    <span className="text-sm font-medium">
                      {t(labels.ratingHard)}
                    </span>
                  </RpgButton>
                  <RpgButton
                    onClick={() => handleCardRating(Rating.Good)}
                    disabled={isPending}
                    className="h-20 flex-col gap-1"
                  >
                    <ThumbsUp className="h-6 w-6" />
                    <span className="text-sm font-medium">
                      {t(labels.ratingGood)}
                    </span>
                  </RpgButton>
                  <RpgButton
                    onClick={() => handleCardRating(Rating.Easy)}
                    disabled={isPending}
                    className="h-20 flex-col gap-1"
                  >
                    <Zap className="h-6 w-6" />
                    <span className="text-sm font-medium">
                      {t(labels.ratingEasy)}
                    </span>
                  </RpgButton>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8 text-center">
              <div className="space-y-6">
                <p className="cq-muted text-lg">
                  {t(labels.thinkPrompt)}
                </p>
                <RpgButton
                  tone="gold"
                  onClick={handleShowAnswer}
                  className="h-16 px-12 text-lg"
                >
                  <Eye className="h-6 w-6" />
                  {t(labels.showAnswer)}
                </RpgButton>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Session Statistics */}
      <div className="cq-panel p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[var(--cq-green)]"></div>
              <span className="text-sm font-medium">
                {t(labels.statsCompleted, { count: completedCards })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[var(--cq-parchment-edge)]"></div>
              <span className="text-sm font-medium">
                {t(labels.statsRemaining, {
                  count: words.length - completedCards - 1,
                })}
              </span>
            </div>
          </div>
          <div className="cq-muted text-sm font-medium">
            {t(labels.statsTotal, { count: words.length })}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Card kind served by the lesson flashcard game.
 */
export type LessonFlashcardKind = FlashcardType;

/**
 * Renders the lesson sentence or vocabulary flashcard game.
 * @param articleId Article the cards belong to.
 * @param cardKind Whether to show sentence or vocabulary cards.
 * @returns The lesson flashcard game.
 */
export function LessonFlashcardGame({
  articleId,
  cardKind,
}: {
  articleId: string;
  cardKind: FlashcardType;
}) {
  return (
    <QuizContextProvider>
      <LessonFlashcardView articleId={articleId} cardKind={cardKind} />
    </QuizContextProvider>
  );
}

export default LessonFlashcardGame;
