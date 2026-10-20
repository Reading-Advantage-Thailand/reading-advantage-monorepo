"use client";
import { usePreviewSave } from "@/components/student/student-view-provider";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Header } from "@/components/header";
import { RpgButton, Sign } from "@/components/rpg/chrome";
import { Progress } from "@/components/ui/progress";
import { Separator, Label } from "@reading-advantage/ui";
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
  Play,
  Clock,
  Target,
  Zap,
  Loader2,
  Volume2,
  Lightbulb,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { getLessonClozeTestSentences } from "@/actions/flashcard";
import { ActivityType, UserXpEarned } from "@/types/enum";
import { updateUserActivity } from "@/actions/user";
import { needsSeek } from "@/lib/audio-highlight";
import { useTranslations } from "next-intl";
import { useAuth } from "@reading-advantage/auth-client";
import { formatTime } from "@/lib/format-time";
import { shuffle } from "@/lib/shuffle";

type Difficulty = "easy" | "medium" | "hard";

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
  difficulty: Difficulty;
}

interface UserAnswer {
  blankId: string;
  selectedAnswer: string;
  isCorrect: boolean;
}

type ClozeTranslator = ReturnType<typeof useTranslations>;

/**
 * Per-source label and chrome configuration for the cloze game. Each entry is
 * either an i18n key (rendered through the namespace translator) or a render
 * function for spots where the two variants differ structurally.
 */
interface ClozeLabels {
  loadingTitle: string;
  loadingSubtitle: string;
  loadingNextChallenge: string;
  completeTitle: string;
  completeSubtitle: string;
  completeStatsPerfect: string;
  completeStatsAccuracy: string;
  completeStatsTime: string;
  completeBack: string;
  completePlayAgain: string;
  startTitle: string;
  startSubtitle: string;
  startStatsTests: string;
  startStatsReady: string;
  startStatsFillBlanks: string;
  startStatsBlankCount: (
    t: ClozeTranslator,
    difficulty: Difficulty,
  ) => React.ReactNode;
  renderEstimatedTime: (
    t: ClozeTranslator,
    difficulty: Difficulty,
  ) => React.ReactNode;
  startStatsEstimatedLabel: string;
  instructionsTitle: string;
  instructionsItem1: string;
  instructionsItem2: string;
  instructionsItem3: string;
  difficultyChoose: string;
  difficultySelect: string;
  difficultyEasy: string;
  difficultyMedium: string;
  difficultyHard: string;
  difficultyDescEasy: string;
  difficultyDescMedium: string;
  difficultyDescHard: string;
  renderDifficultyMode: (
    t: ClozeTranslator,
    difficulty: Difficulty,
  ) => React.ReactNode;
  startButtonLoading: (
    t: ClozeTranslator,
    difficulty: Difficulty,
  ) => React.ReactNode;
  startButton: (t: ClozeTranslator, difficulty: Difficulty) => React.ReactNode;
  progressPosition: (
    t: ClozeTranslator,
    current: number,
    total: number,
  ) => React.ReactNode;
  progressScore: string;
  renderArticleTitle: (t: ClozeTranslator, title: string) => React.ReactNode;
  gameSubtitle: string;
  hintsLabel: string;
  hintsAudio: string;
  hintsPlay: string;
  hintsPlaying: string;
  sentenceInstructions: string;
  progressSentence: (
    t: ClozeTranslator,
    answered: number,
    total: number,
  ) => React.ReactNode;
  progressCorrect: (
    t: ClozeTranslator,
    correct: number,
    answered: number,
  ) => React.ReactNode;
  resultPerfect: string;
  resultTryAgain: string;
  resultCorrectAnswers: string;
  buttonsReset: string;
  buttonsCheck: string;
  buttonsShowAnswers: string;
  buttonsNext: string;
  buttonsFinish: string;
  placeholder: string;
  toastTryAgain: (t: ClozeTranslator, correct: number, total: number) => string;
  toastShowAnswers: (t: ClozeTranslator) => string;
  toastHintsEnabled: (t: ClozeTranslator) => string;
  toastHintsDisabled: (t: ClozeTranslator) => string;
}

/**
 * Per-source behavior for the cloze game: data loading, finish reporting,
 * page chrome, and labels.
 */
interface ClozeGameConfig {
  source: "lesson" | "deck";
  namespace: "LessonCloze" | "SentencesPage.clozeTestGame";
  loadSentences: (ctx: {
    t: ClozeTranslator;
    articleId?: string;
    deckId?: string;
    difficulty: Difficulty;
  }) => Promise<ClozeTestData[]>;
  finishGame: (ctx: {
    t: ClozeTranslator;
    articleId?: string;
    deckId?: string;
    score: number;
    timer: number;
  }) => Promise<void>;
  chrome: {
    headerOnStart: boolean;
    headerOnPlaying: boolean;
    headerTitle: string;
    headerDescriptionLong: string;
    headerDescriptionShort: string;
  };
  labels: ClozeLabels;
}

const lessonConfig: ClozeGameConfig = {
  source: "lesson",
  namespace: "LessonCloze",
  loadSentences: async ({ articleId, difficulty }) => {
    try {
      const response = (await getLessonClozeTestSentences(
        articleId as string,
        difficulty,
      )) as {
        clozeTests: ClozeTestData[];
        totalTests: number;
      };
      return response.clozeTests || [];
    } catch (error) {
      console.error("Error loading sentences:", error);
      toast.error("Failed to load sentences");
      return [];
    }
  },
  finishGame: async ({ articleId, timer }) => {
    await updateUserActivity(
      articleId as string,
      ActivityType.SENTENCE_CLOZE_TEST,
      timer,
      {
        score: UserXpEarned.SENTENCE_CLOZE_TEST,
      },
    );
  },
  chrome: {
    headerOnStart: false,
    headerOnPlaying: false,
    headerTitle: "",
    headerDescriptionLong: "",
    headerDescriptionShort: "",
  },
  labels: {
    loadingTitle: "loading.title",
    loadingSubtitle: "loading.subtitle",
    loadingNextChallenge: "loading.nextChallenge",
    completeTitle: "complete.title",
    completeSubtitle: "complete.subtitle",
    completeStatsPerfect: "complete.stats.perfect",
    completeStatsAccuracy: "complete.stats.accuracy",
    completeStatsTime: "complete.stats.time",
    completeBack: "buttons.back",
    completePlayAgain: "buttons.playAgain",
    startTitle: "start.title",
    startSubtitle: "start.subtitle",
    startStatsTests: "start.stats.tests",
    startStatsReady: "common.ready",
    startStatsFillBlanks: "start.stats.fillBlanks",
    startStatsBlankCount: (t, difficulty) =>
      t(
        difficulty === "easy"
          ? "start.stats.oneBlank"
          : difficulty === "medium"
            ? "start.stats.twoBlanks"
            : "start.stats.threeBlanks",
      ),
    renderEstimatedTime: (t, difficulty) => (
      <>
        ~
        {difficulty === "easy" ? "5" : difficulty === "medium" ? "10" : "15"}{" "}
        {t("common.min")}
      </>
    ),
    startStatsEstimatedLabel: "start.stats.estimated",
    instructionsTitle: "instructions.title",
    instructionsItem1: "instructions.item1",
    instructionsItem2: "instructions.item2",
    instructionsItem3: "instructions.item3",
    difficultyChoose: "difficulty.choose",
    difficultySelect: "difficulty.select",
    difficultyEasy: "difficulty.easy",
    difficultyMedium: "difficulty.medium",
    difficultyHard: "difficulty.hard",
    difficultyDescEasy: "difficulty.desc.easy",
    difficultyDescMedium: "difficulty.desc.medium",
    difficultyDescHard: "difficulty.desc.hard",
    renderDifficultyMode: (_t, difficulty) => (
      <span className="font-medium capitalize">{difficulty} Mode</span>
    ),
    startButtonLoading: (t, difficulty) =>
      t("buttons.loading", { difficulty }),
    startButton: (t) => t("buttons.startGame"),
    progressPosition: (_t, current, total) => (
      <>
        {current} of {total}
      </>
    ),
    progressScore: "progress.perfect",
    renderArticleTitle: (_t, title) => <>📖 {title}</>,
    gameSubtitle: "game.subtitle",
    hintsLabel: "hints.label",
    hintsAudio: "hints.audio",
    hintsPlay: "hints.play",
    hintsPlaying: "Playing...",
    sentenceInstructions: "sentence.instructions",
    progressSentence: (t, answered, total) =>
      t("progress.sentence", { answered, total }),
    progressCorrect: (t, correct, answered) =>
      t("progress.correct", { correct, answered }),
    resultPerfect: "result.perfect",
    resultTryAgain: "result.tryAgain",
    resultCorrectAnswers: "result.correctAnswers",
    buttonsReset: "buttons.reset",
    buttonsCheck: "buttons.check",
    buttonsShowAnswers: "buttons.showAnswers",
    buttonsNext: "buttons.next",
    buttonsFinish: "buttons.finish",
    placeholder: "___",
    toastTryAgain: (_t, correct, total) =>
      `${correct}/${total} correct. Try again! 💪`,
    toastShowAnswers: () => "Correct answers revealed! 📖",
    toastHintsEnabled: () =>
      "Hints enabled! 💡\n• Incorrect answers will be highlighted\n• Use audio button to hear pronunciation",
    toastHintsDisabled: () => "Hints disabled",
  },
};

const deckConfig: ClozeGameConfig = {
  source: "deck",
  namespace: "SentencesPage.clozeTestGame",
  loadSentences: async ({ t, deckId }) => {
    try {
      const response = await fetch(
        `/api/flashcard/decks/${deckId}/sentences-for-cloze`,
      );
      if (response.ok) {
        const data = await response.json();
        return data.clozeTests || [];
      }
      toast.error(t("toast.failedToLoad"));
      return [];
    } catch (error) {
      console.error("Error loading sentences:", error);
      toast.error(t("toast.failedToLoadSentences"));
      return [];
    }
  },
  finishGame: async ({ deckId, score, timer }) => {
    await fetch(`/api/flashcard/decks/${deckId}/sentences-for-cloze`, {
      method: "POST",
      body: JSON.stringify({
        score,
        timer,
      }),
    });
  },
  chrome: {
    headerOnStart: true,
    headerOnPlaying: true,
    headerTitle: "title",
    headerDescriptionLong: "descriptionLong",
    headerDescriptionShort: "descriptionShort",
  },
  labels: {
    loadingTitle: "loading.title",
    loadingSubtitle: "loading.description",
    loadingNextChallenge: "loading.nextChallenge",
    completeTitle: "complete.title",
    completeSubtitle: "complete.subtitle",
    completeStatsPerfect: "complete.stats.perfectScores",
    completeStatsAccuracy: "complete.stats.accuracy",
    completeStatsTime: "complete.stats.totalTime",
    completeBack: "complete.backToMenu",
    completePlayAgain: "complete.playAgain",
    startTitle: "startScreen.title",
    startSubtitle: "startScreen.subtitle",
    startStatsTests: "startScreen.stats.clozeTests",
    startStatsReady: "startScreen.stats.readyToPlay",
    startStatsFillBlanks: "startScreen.stats.fillBlanks",
    startStatsBlankCount: (t, difficulty) =>
      t("startScreen.stats.blanksEach", {
        count: difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3,
      }),
    renderEstimatedTime: (t, difficulty) =>
      t("startScreen.stats.estimatedTime", {
        time: difficulty === "easy" ? "5" : difficulty === "medium" ? "10" : "15",
      }),
    startStatsEstimatedLabel: "startScreen.stats.estimatedTimeLabel",
    instructionsTitle: "startScreen.howToPlay",
    instructionsItem1: "startScreen.instructions.step1",
    instructionsItem2: "startScreen.instructions.step2",
    instructionsItem3: "startScreen.instructions.step3",
    difficultyChoose: "startScreen.difficulty.title",
    difficultySelect: "Select difficulty",
    difficultyEasy: "startScreen.difficulty.easy",
    difficultyMedium: "startScreen.difficulty.medium",
    difficultyHard: "startScreen.difficulty.hard",
    difficultyDescEasy: "startScreen.difficulty.easyDescription",
    difficultyDescMedium: "startScreen.difficulty.mediumDescription",
    difficultyDescHard: "startScreen.difficulty.hardDescription",
    renderDifficultyMode: (t, difficulty) =>
      t(`startScreen.difficulty.${difficulty}`),
    startButtonLoading: (t, difficulty) =>
      t("startScreen.loadingButton", {
        difficulty: t(`startScreen.difficulty.${difficulty}`),
      }),
    startButton: (t, difficulty) =>
      t("startScreen.startButton", {
        difficulty: t(`startScreen.difficulty.${difficulty}`),
      }),
    progressPosition: (t, current, total) =>
      t("gameplay.progress", { current, total }),
    progressScore: "gameplay.score",
    renderArticleTitle: (t, title) => t("gameplay.articleTitle", { title }),
    gameSubtitle: "gameplay.instruction",
    hintsLabel: "hints.title",
    hintsAudio: "hints.audio",
    hintsPlay: "hints.playOrder",
    hintsPlaying: "hints.playing",
    sentenceInstructions: "gameplay.completeSentence",
    progressSentence: (t, answered, total) =>
      t("gameplay.blanksProgress", { filled: answered, total }),
    progressCorrect: (t, correct, answered) =>
      t("gameplay.correctCount", { correct, total: answered }),
    resultPerfect: "results.allCorrect",
    resultTryAgain: "results.partialCorrect",
    resultCorrectAnswers: "results.correctAnswers",
    buttonsReset: "buttons.resetAnswers",
    buttonsCheck: "buttons.checkAnswers",
    buttonsShowAnswers: "buttons.showAnswers",
    buttonsNext: "buttons.nextSentence",
    buttonsFinish: "buttons.finishGame",
    placeholder: "gameplay.placeholder",
    toastTryAgain: (t, correct, total) =>
      t("results.tryAgain", { correct, total }),
    toastShowAnswers: (t) => t("results.showAnswers"),
    toastHintsEnabled: (t) => t("hints.enabled"),
    toastHintsDisabled: (t) => t("hints.disabled"),
  },
};

/**
 * Data source for the sentence cloze game.
 */
export type SentenceClozeGameSource = "lesson" | "deck";

/**
 * Renders the lesson or deck sentence cloze game. Both variants share one
 * implementation; the source prop selects the data loading, finish reporting,
 * page chrome, and i18n labels.
 * @param source Whether to load sentences from a lesson article or a flashcard deck.
 * @param articleId Article id for lesson games.
 * @param deckId Deck id for deck games.
 * @param sentences Prefetched deck sentences.
 * @returns The sentence cloze game.
 */
export function SentenceClozeGame({
  source,
  articleId,
  deckId,
  sentences = [],
}: {
  source: SentenceClozeGameSource;
  articleId?: string;
  deckId?: string;
  sentences?: ClozeTestData[];
}) {
  const config = source === "deck" ? deckConfig : lessonConfig;
  const labels = config.labels;
  const t = useTranslations(config.namespace);
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
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<Difficulty>("medium");

  // Add flag to track if user has made any selections
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [hintsEnabled, setHintsEnabled] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [rawSentenceData, setRawSentenceData] = useState<ClozeTestData[]>([]);
  const [activeSentences, setActiveSentences] = useState<ClozeTestData[]>(
    source === "deck" ? sentences : [],
  );

  const [audioHintsEnabled, setAudioHintsEnabled] = useState(false);
  const { refresh } = useAuth();
  const { isPreview, notSaved } = usePreviewSave();

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const hintAudioStopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      hintAudioStopRef.current?.();
      hintAudioStopRef.current = null;
      activeAudioRef.current?.pause();
      activeAudioRef.current = null;
    };
  }, []);

  // Client-side blank generation function
  const generateBlanksForSentence = useCallback(
    (sentenceData: ClozeTestData, difficulty: Difficulty): ClozeTestData => {
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
      const selectedWords = shuffle(candidateWords).slice(
        0,
        Math.min(blankCount, candidateWords.length),
      );

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
        const distractors = shuffle(
          words.filter(
            (w) =>
              w !== word &&
              w.length >= word.length - 2 &&
              w.length <= word.length + 2 &&
              !commonWords.includes(w.toLowerCase()),
          ),
        ).slice(0, 3);

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
        const shuffledOptions = shuffle(options);

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

  // Update active sentences when blanks are regenerated. Skips the empty
  // memo while raw data is still loading so a prefetched deck `sentences`
  // prop seeded into state is not wiped on mount.
  useEffect(() => {
    if (activeSentencesWithBlanks.length === 0) return;
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

  const loadSentences = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await config.loadSentences({
        t,
        articleId,
        deckId,
        difficulty: selectedDifficulty,
      });
      setRawSentenceData(data);
    } finally {
      setIsLoading(false);
    }
  }, [config, t, articleId, deckId, selectedDifficulty]);

  useEffect(() => {
    if (source === "lesson") {
      if (articleId) {
        loadSentences();
      }
    } else if (deckId && sentences.length === 0 && rawSentenceData.length === 0) {
      loadSentences();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId, deckId, source]);

  const currentSentence = useMemo(
    () => activeSentences[currentIndex],
    [activeSentences, currentIndex],
  );

  // Game clock (setTimeout chain; no polling interval)
  useEffect(() => {
    if (!isPlaying || gameComplete) return;
    let cancelled = false;
    let timeout: NodeJS.Timeout;
    const schedule = () => {
      timeout = setTimeout(() => {
        if (cancelled) return;
        setTimer((prev) => prev + 1);
        schedule();
      }, 1000);
    };
    schedule();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
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
      } else {
        toast.error(
          labels.toastTryAgain(t, correctCount, currentSentence.blanks.length),
        );
      }
    }
  }, [
    userAnswers,
    currentSentence?.blanks.length,
    isCompleted,
    hasUserInteracted,
    labels,
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
    [currentSentence?.blanks, isCompleted],
  );

  const handleStartGame = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const toggleAudioHints = useCallback(() => {
    setAudioHintsEnabled((prev) => {
      const newState = !prev;

      return newState;
    });
  }, []);

  const handleNext = useCallback(async () => {
    if (currentIndex < activeSentences.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      toggleAudioHints();
    } else {
      setGameComplete(true);
      if (isPreview) notSaved();
      else await config.finishGame({ t, articleId, deckId, score, timer });
      setIsPlaying(false);
      await refresh();
    }
  }, [
    currentIndex,
    activeSentences.length,
    config,
    t,
    articleId,
    deckId,
    score,
    timer,
    refresh,
    toggleAudioHints,
    isPreview,
    notSaved,
  ]);

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
    } else {
      toast.error(
        labels.toastTryAgain(t, correctCount, currentSentence.blanks.length),
      );
    }
  }, [userAnswers, currentSentence, labels, t]);

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
    toast.info(labels.toastShowAnswers(t));
  }, [labels, t]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const progress = useMemo(
    () =>
      ((currentIndex + (isCompleted ? 1 : 0)) / activeSentences.length) * 100,
    [currentIndex, isCompleted, activeSentences.length],
  );

  const playAudio = useCallback(async () => {
    if (!currentSentence?.audioUrl || isPlayingAudio) return;

    setIsPlayingAudio(true);

    try {
      await new Promise<void>((resolve, reject) => {
        const audio = new Audio();
        activeAudioRef.current = audio;
        let timeoutId: NodeJS.Timeout | undefined;
        let settled = false;

        const cleanup = () => {
          audio.pause();
          if (activeAudioRef.current === audio) {
            activeAudioRef.current = null;
          }
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = undefined;
          }
          audio.removeEventListener("loadeddata", handleLoadedData);
          audio.removeEventListener("seeked", handleSeeked);
          audio.removeEventListener("timeupdate", handleTimeUpdate);
          audio.removeEventListener("ended", handleEnded);
          audio.removeEventListener("error", handleError);
          if (hintAudioStopRef.current === finish) {
            hintAudioStopRef.current = null;
          }
        };

        const finish = () => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve();
        };

        const fail = (error: unknown) => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(error);
        };

        const startPlayback = () => {
          audio
            .play()
            .then(() => {
              if (currentSentence.endTime !== undefined) {
                audio.addEventListener("timeupdate", handleTimeUpdate);
              }
            })
            .catch(handleError);
        };

        const handleLoadedData = () => {
          audio.removeEventListener("loadeddata", handleLoadedData);
          const target = currentSentence.startTime ?? 0;
          if (
            currentSentence.startTime !== undefined &&
            needsSeek(target, audio.currentTime)
          ) {
            audio.currentTime = target;
          } else {
            startPlayback();
          }
        };

        const handleSeeked = () => {
          audio.removeEventListener("seeked", handleSeeked);
          startPlayback();
        };

        const handleTimeUpdate = () => {
          const tolerance = 0.5;
          if (
            currentSentence.endTime !== undefined &&
            audio.currentTime + tolerance >= currentSentence.endTime
          ) {
            finish();
          }
        };

        const handleEnded = () => {
          finish();
        };

        const handleError = (error: any) => {
          fail(error);
        };

        hintAudioStopRef.current = finish;

        audio.addEventListener("loadeddata", handleLoadedData);
        if (currentSentence.startTime !== undefined) {
          audio.addEventListener("seeked", handleSeeked);
        }
        audio.addEventListener("ended", handleEnded);
        audio.addEventListener("error", handleError);

        // Fallback timeout held in the same cleanup path
        timeoutId = setTimeout(finish, 10000);

        audio.preload = "auto";
        audio.src = currentSentence.audioUrl!;
        audio.load();
      });
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
        toast.success(labels.toastHintsEnabled(t));
      } else {
        toast.info(labels.toastHintsDisabled(t));
      }
      return newState;
    });
  }, [labels, t]);

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
                    className={cn("inline-flex h-8 min-w-[120px] border-2", {
                      "border-[#2f6b35] bg-[#dfeccd] text-[#1f4a23] dark:bg-[#dfeccd]":
                        userAnswer?.isCorrect && (isCompleted || hintsEnabled),
                      "border-[#8f2424] bg-[#f3d6cc] text-[#6b1717] dark:bg-[#f3d6cc]":
                        userAnswer &&
                        !userAnswer.isCorrect &&
                        (isCompleted || hintsEnabled),
                      "border-[var(--cq-gold-dark)] bg-[rgba(232,181,52,0.25)] dark:bg-[rgba(232,181,52,0.25)]":
                        userAnswer && !(isCompleted || hintsEnabled),
                      "border-[var(--cq-wood-dark)] bg-white/50 dark:bg-white/50": !userAnswer,
                    })}
                  >
                    <SelectValue placeholder={t(labels.placeholder)} />
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
    labels,
    t,
  ]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="cq-panel space-y-4 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--cq-wood-dark)]" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{t(labels.loadingTitle)}</h3>
            <p className="text-muted-foreground text-sm">
              {t(labels.loadingSubtitle)}
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
        <div className="cq-panel space-y-8 text-center">
          {/* Trophy Animation */}
          <div className="relative">
            <div className="animate-bounce">
              <span className="lf-medal mx-auto size-28">
                <Trophy className="h-16 w-16 text-[var(--cq-wood-dark)]" />
              </span>
            </div>
            <div className="absolute -top-2 -right-2 h-6 w-6 animate-ping rounded-full bg-[var(--cq-gold)]" />
          </div>

          {/* Results Header */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-[var(--cq-wood-dark)] md:text-5xl">
              {t(labels.completeTitle)}
            </h1>
            <p className="cq-muted text-xl">
              {t(labels.completeSubtitle, { count: activeSentences.length })}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-6 md:grid-cols-3">
            <div className="cq-plaque relative overflow-hidden p-6">
              <div>
                <Target className="mx-auto mb-3 h-8 w-8 text-[var(--cq-gold)]" />
                <div className="text-3xl font-bold">{score}</div>
                <p className="text-sm">
                  {t(labels.completeStatsPerfect)}
                </p>
              </div>
            </div>

            <div className="cq-plaque relative overflow-hidden p-6">
              <div>
                <Zap className="mx-auto mb-3 h-8 w-8 text-[var(--cq-gold)]" />
                <div className="text-3xl font-bold">
                  {accuracy}%
                </div>
                <p className="text-sm">
                  {t(labels.completeStatsAccuracy)}
                </p>
              </div>
            </div>

            <div className="cq-plaque relative overflow-hidden p-6">
              <div>
                <Clock className="mx-auto mb-3 h-8 w-8 text-[var(--cq-gold)]" />
                <div className="text-3xl font-bold">
                  {formatTime(timer)}
                </div>
                <p className="text-sm">
                  {t(labels.completeStatsTime)}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mx-auto flex max-w-md flex-col gap-4 sm:flex-row">
            <RpgButton
              onClick={handleBack}
              tone="iron"
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4" />
              {t(labels.completeBack)}
            </RpgButton>
            <RpgButton onClick={handleRestartGame} tone="gold" className="flex-1">
              <RotateCcw className="h-4 w-4" />
              {t(labels.completePlayAgain)}
            </RpgButton>
          </div>
        </div>
      </div>
    );
  }

  // Start screen
  if (!isPlaying) {
    return (
      <div className="container mx-auto max-w-4xl space-y-8 px-4">
        {config.chrome.headerOnStart && (
          <div className="cq-panel">
            <Header
              heading={t(config.chrome.headerTitle)}
              text={t(config.chrome.headerDescriptionLong)}
            />
          </div>
        )}

        <div className="cq-panel mx-auto flex max-w-2xl flex-col gap-6 py-6">
          <div className="flex flex-col items-center gap-2 px-6 pb-6 text-center">
            <Sign className="text-2xl">{t(labels.startTitle)}</Sign>
            <p className="cq-muted">{t(labels.startSubtitle)}</p>
          </div>

          <div className="space-y-8 px-6">
            {/* Game Stats */}
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2 text-center">
                <div className="lf-medal mx-auto h-12 w-12">
                  <span className="text-2xl font-bold">
                    {activeSentences.length}
                  </span>
                </div>
                <p className="text-sm font-medium">
                  {t(labels.startStatsTests)}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t(labels.startStatsReady)}
                </p>
              </div>

              <div className="space-y-2 text-center">
                <div className="lf-medal mx-auto h-12 w-12">
                  <Target className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium">
                  {t(labels.startStatsFillBlanks)}
                </p>
                <p className="text-muted-foreground text-xs">
                  {labels.startStatsBlankCount(t, selectedDifficulty)}
                </p>
              </div>

              <div className="space-y-2 text-center">
                <div className="lf-medal mx-auto h-12 w-12">
                  <Clock className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium">
                  {labels.renderEstimatedTime(t, selectedDifficulty)}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t(labels.startStatsEstimatedLabel)}
                </p>
              </div>
            </div>

            <Separator />

            {/* Game Instructions */}
            <div className="lf-well space-y-3 p-6">
              <div className="flex items-center gap-2">
                <div className="lf-stud" />
                <p className="text-sm font-medium">
                  {t(labels.instructionsTitle)}
                </p>
              </div>
              <ul className="cq-muted ml-4 space-y-2 text-sm">
                <li>• {t(labels.instructionsItem1)}</li>
                <li>• {t(labels.instructionsItem2)}</li>
                <li>• {t(labels.instructionsItem3)}</li>
              </ul>
            </div>

            <Separator />

            {/* Difficulty Selector */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="difficulty" className="text-sm font-medium">
                  {t(labels.difficultyChoose)}
                </Label>
                <Select
                  value={selectedDifficulty}
                  onValueChange={(value: Difficulty) => {
                    setSelectedDifficulty(value);
                    setActiveSentences([]);
                  }}
                >
                  <SelectTrigger className="w-full border-2 border-[var(--cq-parchment-edge)] bg-white/40 dark:bg-white/40">
                    <SelectValue
                      placeholder={t(labels.difficultySelect) as string}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">
                      <div className="flex items-center gap-2">
                        <span>🟢</span>
                        <span>{t(labels.difficultyEasy)}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <span>🟡</span>
                        <span>{t(labels.difficultyMedium)}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="hard">
                      <div className="flex items-center gap-2">
                        <span>🔴</span>
                        <span>{t(labels.difficultyHard)}</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Difficulty Description */}
              <div className="lf-well p-4">
                <div className="mb-2 flex items-center gap-2">
                  {selectedDifficulty === "easy" && (
                    <span>🟢</span>
                  )}
                  {selectedDifficulty === "medium" && (
                    <span>🟡</span>
                  )}
                  {selectedDifficulty === "hard" && (
                    <span>🔴</span>
                  )}
                  {labels.renderDifficultyMode(t, selectedDifficulty)}
                </div>
                <p className="cq-muted text-sm">
                  {selectedDifficulty === "easy" &&
                    t(labels.difficultyDescEasy)}
                  {selectedDifficulty === "medium" &&
                    t(labels.difficultyDescMedium)}
                  {selectedDifficulty === "hard" &&
                    t(labels.difficultyDescHard)}
                </p>
              </div>
            </div>

            <RpgButton
              onClick={() => {
                if (activeSentences.length === 0) {
                  loadSentences();
                } else {
                  handleStartGame();
                }
              }}
              tone="gold"
              className="h-12 w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {labels.startButtonLoading(t, selectedDifficulty)}
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  {labels.startButton(t, selectedDifficulty)}
                </>
              )}
            </RpgButton>
          </div>
        </div>
      </div>
    );
  }

  if (!currentSentence) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="cq-panel space-y-4 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--cq-wood-dark)]" />
          <p className="cq-muted">
            {t(labels.loadingNextChallenge)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-4 px-4">
      {config.chrome.headerOnPlaying && (
        <div className="cq-panel">
          <Header
            heading={t(config.chrome.headerTitle)}
            text={t(config.chrome.headerDescriptionShort)}
          />
        </div>
      )}

      {/* Progress Bar */}
      <div className="cq-panel space-y-2">
        <div className="cq-muted flex items-center justify-between text-sm">
          <span>
            {labels.progressPosition(t, currentIndex + 1, activeSentences.length)}
          </span>
          <div className="flex items-center gap-4">
            <span>
              {t(labels.progressScore, {
                score,
                total: activeSentences.length,
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(timer)}
            </span>
          </div>
        </div>
        <Progress value={progress} className="h-3 border-2 border-[var(--cq-wood-dark)] bg-[#2a1d12] [&>[data-slot=progress-indicator]]:bg-[var(--cq-gold)]" />
      </div>

      {/* Game Card */}
      <div className="cq-panel flex flex-col gap-6 py-6">
        <div className="px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-col items-start gap-3">
              <Sign className="text-xl">
                {labels.renderArticleTitle(t, currentSentence.articleTitle)}
              </Sign>
              <p className="cq-muted text-sm">
                {t(labels.gameSubtitle)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6 px-6">
          {/* Hint Controls */}
          <div className="lf-well flex flex-wrap items-center gap-3 p-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-[var(--cq-gold-dark)]" />
              <span className="text-sm font-medium">{t(labels.hintsLabel)}</span>
            </div>

            {/* Audio Toggle */}
            <div className="flex items-center gap-2">
              <RpgButton
                onClick={toggleAudioHints}
                tone={audioHintsEnabled ? "gold" : "wood"}
                small
              >
                <Volume2 className="h-3 w-3" />
                {t(labels.hintsAudio)}
              </RpgButton>
            </div>

            {/* Audio Play Button - Only show when audio hints are enabled */}
            {audioHintsEnabled && (
              <>
                <Separator orientation="vertical" className="h-6" />
                <RpgButton
                  onClick={playAudio}
                  small
                  disabled={isPlayingAudio}
                >
                  {isPlayingAudio ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {t(labels.hintsPlaying)}
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3" />
                      {t(labels.hintsPlay)}
                    </>
                  )}
                </RpgButton>
              </>
            )}
          </div>

          {/* Sentence with Blanks */}
          <div className="lf-well">
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-[var(--cq-wood-dark)]" />
                  <p className="text-sm font-medium">
                    {t(labels.sentenceInstructions)}
                  </p>
                </div>

                <div className="lf-well p-4">
                  {renderSentenceWithBlanks()}
                </div>
              </div>
            </div>
          </div>

          {/* Progress indicator for current sentence */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {labels.progressSentence(
                t,
                userAnswers.length,
                currentSentence.blanks.length,
              )}
            </span>
            {userAnswers.length > 0 && (
              <span className="text-muted-foreground">
                {labels.progressCorrect(
                  t,
                  userAnswers.filter((a) => a.isCorrect).length,
                  userAnswers.length,
                )}
              </span>
            )}
          </div>

          {/* Result Display */}
          {showResult && (
            <div
              aria-live="polite"
              className={cn(
                "rounded-xl border-2",
                userAnswers.every((a) => a.isCorrect)
                  ? "lf-good"
                  : "lf-bad",
              )}
            >
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    {userAnswers.every((a) => a.isCorrect) ? (
                      <CheckCircle className="lf-text-good h-6 w-6" />
                    ) : (
                      <XCircle className="lf-text-bad h-6 w-6" />
                    )}
                    <h3 className="text-lg font-semibold">
                      {userAnswers.every((a) => a.isCorrect)
                        ? t(labels.resultPerfect)
                        : t(labels.resultTryAgain, {
                            correct: userAnswers.filter((a) => a.isCorrect)
                              .length,
                            total: currentSentence.blanks.length,
                          })}
                    </h3>
                  </div>

                  {!userAnswers.every((a) => a.isCorrect) &&
                    showCorrectAnswers && (
                      <div className="space-y-3 text-[var(--cq-ink)]">
                        <Separator />
                        <div>
                          <h4 className="mb-3 font-medium">
                            {t(labels.resultCorrectAnswers)}
                          </h4>
                          <div className="space-y-2">
                            {currentSentence.blanks.map((blank, index) => (
                              <div
                                key={blank.id}
                                className="flex gap-3 text-sm"
                              >
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--cq-wood-dark)] text-xs font-bold text-[#fff4dc]">
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
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <RpgButton
              onClick={handleRestart}
              className="sm:w-auto"
            >
              <RotateCcw className="h-4 w-4" />
              {t(labels.buttonsReset)}
            </RpgButton>

            {!isCompleted && userAnswers.length > 0 && (
              <RpgButton
                onClick={handleCheckAnswer}
                tone="gold"
                className="sm:w-auto"
              >
                <CheckCircle className="h-4 w-4" />
                {t(labels.buttonsCheck)}
              </RpgButton>
            )}

            {isCompleted &&
              !userAnswers.every((a) => a.isCorrect) &&
              !showCorrectAnswers && (
                <RpgButton
                  onClick={handleShowAnswers}
                  tone="iron"
                  className="sm:w-auto"
                >
                  <Eye className="h-4 w-4" />
                  {t(labels.buttonsShowAnswers)}
                </RpgButton>
              )}

            {isCompleted && (
              <RpgButton onClick={handleNext} tone="gold" className="flex-1">
                {currentIndex < activeSentences.length - 1
                  ? t(labels.buttonsNext)
                  : t(labels.buttonsFinish)}
              </RpgButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SentenceClozeGame;