"use client";
import React, { useState, useEffect } from "react";
import { Separator } from "@reading-advantage/ui";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Clock,
  Target,
  Sparkles,
  TrendingUp,
  Brain,
  Star,
  CheckCircle,
  Trophy,
  RotateCcw,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Article, WordListTimestamp } from "@/types";
import { getLessonSummaryData } from "@/actions/article";
import { useAuth } from "@reading-advantage/auth-client";
import { restartLessonAction } from "@/actions/lesson-attempts";
import { isPreviewResult } from "@/lib/student-view";
import { usePreviewSave } from "@/components/student/student-view-provider";
import { Banner, Panel, RpgButton } from "@/components/rpg/chrome";
import { ART } from "@/lib/rpg/places";
import { cn } from "@/lib/utils";

interface WordList {
  vocabulary: string;
  definition: Record<string, string>;
}

interface Sentence {
  sentence: string;
  translation: Record<string, string>;
}

interface QuizScores {
  mcqScore: number;
  saqScore: number;
}

/**
 * The lesson summary (task 14): the score cards, "Back to Read Page", and "Start again".
 * @param article The lesson article.
 * @param timerSpent The seconds that the student spent in the lesson.
 * @param assignmentId The assignment of the lesson, when it runs from one.
 * @param attemptNumber The number of the current attempt; the banner shows from 2.
 * @param onRestarted Called after a restart with the new attempt number (null when nothing closed).
 * @returns The summary.
 */
export default function TaskLessonSummary({
  article,
  timerSpent,
  assignmentId = null,
  attemptNumber: sessionAttempt = 1,
  onRestarted,
}: {
  article: Article;
  timerSpent: number;
  assignmentId?: string | null;
  attemptNumber?: number;
  onRestarted?: (attemptNumber: number | null) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [restartFailed, setRestartFailed] = useState(false);
  const { isPreview, notSaved } = usePreviewSave();
  const [loading, setLoading] = useState(true);
  const [totalXp, setTotalXp] = useState(0);
  // The attempt number from the server: it survives a page reload (the prop covers only this session).
  const [fetchedAttempt, setFetchedAttempt] = useState(1);
  const attemptNumber = Math.max(sessionAttempt, fetchedAttempt);
  const [quizScores, setQuizScores] = useState<QuizScores>({
    mcqScore: 0,
    saqScore: 0,
  });
  const [showCelebration, setShowCelebration] = useState(false);
  const wordList = (article?.sentencsAndWordsForFlashcard?.[0]
    ?.words as WordList[] | undefined) ?? [];
  const sentenceList = (article?.sentencsAndWordsForFlashcard?.[0]
    ?.sentence as Sentence[] | undefined) ?? [];
  const router = useRouter();
  const t = useTranslations("Lesson.Summary");
  const { user, refresh } = useAuth();

  // Fetch lesson summary data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getLessonSummaryData(article.id);

        if (result.error) {
          toast.error(t("toast.failed"));
          return;
        }

        if (result.data) {
          setTotalXp(result.data.totalXp);
          setFetchedAttempt(result.data.attemptNumber ?? 1);
          setQuizScores(result.data.quizScores);
          setShowCelebration(true);
          await refresh();
        }
      } catch (error) {
        console.error("Error fetching lesson summary data:", error);
        toast.error(t("toast.failed"));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [article.id]);

  // Format timer display (convert seconds to mm:ss)
  const formatTimer = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const mcqFeedback = {
    1: t("feedback.mcq.1"),
    2: t("feedback.mcq.2"),
    3: t("feedback.mcq.3"),
    4: t("feedback.mcq.4"),
    5: t("feedback.mcq.5"),
  } as const;

  const saqFeedback = {
    1: t("feedback.saq.1"),
    2: t("feedback.saq.2"),
    3: t("feedback.saq.3"),
    4: t("feedback.saq.4"),
    5: t("feedback.saq.5"),
  } as const;

  const backToReadPage = () => {
    router.push("/student/read");
  };

  const askRestart = () => {
    setRestartFailed(false);
    if (isPreview) return notSaved();
    setConfirming(true);
  };

  const confirmRestart = async () => {
    setRestarting(true);
    setRestartFailed(false);
    try {
      const result = await restartLessonAction({ articleId: article.id, assignmentId });
      if (isPreviewResult(result)) {
        setConfirming(false);
        notSaved();
      } else if (result.success) {
        setConfirming(false);
        onRestarted?.(result.attemptNumber);
      } else {
        setConfirming(false);
        setRestartFailed(true);
      }
    } catch {
      setConfirming(false);
      setRestartFailed(true);
    } finally {
      setRestarting(false);
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 4) return "lf-text-good";
    if (score >= 3) return "lf-text-gold";
    return "lf-text-bad";
  };

  const getPerformanceBadge = (score: number) => {
    if (score >= 4)
      return {
        label: "Excellent",
        variant: "default" as const,
        color: "lf-good",
      };
    if (score >= 3)
      return {
        label: "Good",
        variant: "secondary" as const,
        color: "lf-well lf-well--gold",
      };
    return {
      label: "Needs Practice",
      variant: "destructive" as const,
      color: "lf-bad",
    };
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="cq-panel p-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-[rgba(107,84,56,0.18)]"></div>
            <div className="mx-auto h-8 w-1/2 rounded bg-[rgba(107,84,56,0.18)]"></div>
            <div className="mx-auto h-4 w-3/4 rounded bg-[rgba(107,84,56,0.18)]"></div>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="cq-panel animate-pulse p-6">
              <div className="space-y-3">
                <div className="h-4 w-1/4 rounded bg-[rgba(107,84,56,0.18)]"></div>
                <div className="h-6 w-1/2 rounded bg-[rgba(107,84,56,0.18)]"></div>
                <div className="h-3 w-3/4 rounded bg-[rgba(107,84,56,0.18)]"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      {/* Celebration Header */}
      <div
        className={`cq-panel space-y-6 overflow-hidden p-8 text-center ${showCelebration ? "animate-in slide-in-from-top duration-700" : ""}`}
      >
        {/* Animated Background Elements */}
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
          <img src={ART.coin} alt="" className="cq-shadowed absolute top-5 left-5 size-9" />
          <img src={ART.gem} alt="" className="cq-shadowed absolute top-6 right-6 size-9" />
          <img src={ART.scroll} alt="" className="cq-shadowed absolute bottom-5 left-6 size-10" />
          <img src={ART.chest} alt="" className="cq-shadowed absolute right-5 bottom-5 size-12" />
        </div>

        <div className="relative z-10">
          <div className="lf-medal mb-6 p-4">
            <Trophy className="h-12 w-12" aria-hidden="true" />
          </div>

          <h1 className="cq-sign mb-6 text-3xl md:text-4xl">
            {t("title")}
          </h1>

          {attemptNumber >= 2 ? (
            <div className="mb-8">
              <Banner>{t("attempt", { number: attemptNumber })}</Banner>
            </div>
          ) : null}

          <p className="mx-auto max-w-2xl text-xl leading-relaxed">
            {t("completed")}
          </p>

          {/* XP Highlight */}
          <div className="cq-coins mt-4 max-w-full px-6 py-3 whitespace-normal">
            <img src={ART.gem} alt="" aria-hidden="true" className="size-6" />
            <span className="text-lg font-bold">
              {attemptNumber >= 2 ? `${t("attemptXp", { number: attemptNumber })}: ${totalXp}` : t("xpEarned", { xp: totalXp })}
            </span>
          </div>
          {attemptNumber >= 2 ? (
            <p className="cq-muted mt-3 text-sm">{t("historyNote")}</p>
          ) : null}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Time Card */}
        <div className="cq-plaque gap-1 px-3 py-4">
          <span className="lf-medal p-2">
            <Clock className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold">
            {t("stats.timeSpent")}
          </p>
          <p className="text-2xl font-bold">
            {formatTimer(timerSpent)}
          </p>
        </div>

        {/* Words Card */}
        <div className="cq-plaque gap-1 px-3 py-4">
          <span className="lf-medal p-2">
            <BookOpen className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold">
            {t("stats.wordsSaved")}
          </p>
          <p className="text-2xl font-bold">
            {wordList.length}
          </p>
        </div>

        {/* Sentences Card */}
        <div className="cq-plaque gap-1 px-3 py-4">
          <span className="lf-medal p-2">
            <Brain className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold">
            {t("stats.sentences")}
          </p>
          <p className="text-2xl font-bold">
            {sentenceList.length}
          </p>
        </div>

        {/* XP Card */}
        <div className="cq-plaque gap-1 px-3 py-4">
          <span className="lf-medal p-2">
            <Star className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold">
            {t("stats.totalXp")}
          </p>
          <p className="text-2xl font-bold text-[#ffe08a]">
            {totalXp}
          </p>
        </div>
      </div>

      {/* Quiz Performance */}
      {quizScores && (
        <div className="cq-panel overflow-hidden p-0">
          <div className="p-6 pb-0">
            <div className="cq-sign">
              <Target className="h-6 w-6" aria-hidden="true" />
              <div className="leading-none font-semibold">
                {t("quiz.title")}
              </div>
            </div>
          </div>
          <div className="space-y-6 p-6">
            {/* MCQ Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-lg font-semibold">
                  <CheckCircle className="lf-text-good h-5 w-5" />
                  {t("quiz.mcq")}
                </h4>
                <span className={cn("rounded-full border-2 px-3 py-0.5 text-xs font-bold", getPerformanceBadge(quizScores.mcqScore || 0).color)}>
                  {getPerformanceBadge(quizScores.mcqScore || 0).label}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="mb-2 flex justify-between text-sm">
                    <span>
                      {t("quiz.score", { score: quizScores.mcqScore || 0 })}
                    </span>
                    <span
                      className={getPerformanceColor(quizScores.mcqScore || 0)}
                    >
                      {t("quiz.percent", {
                        percent: Math.round((quizScores.mcqScore || 0) * 20),
                      })}
                    </span>
                  </div>
                  <Progress
                    value={(quizScores.mcqScore || 0) * 20}
                    className="h-3 border-2 border-[var(--cq-wood-dark)] bg-[#2a1d12] [&>[data-slot=progress-indicator]]:bg-[var(--cq-gold)]"
                  />
                </div>
              </div>

              {quizScores.mcqScore !== undefined && (
                <p className="cq-muted text-sm italic">
                  {mcqFeedback[quizScores.mcqScore as keyof typeof mcqFeedback]}
                </p>
              )}
            </div>

            <Separator className="bg-[var(--cq-parchment-edge)]" />

            {/* SAQ Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-lg font-semibold">
                  <Brain className="h-5 w-5 text-[var(--cq-wood-dark)]" />
                  {t("quiz.saq")}
                </h4>
                <span className={cn("rounded-full border-2 px-3 py-0.5 text-xs font-bold", getPerformanceBadge(quizScores.saqScore || 0).color)}>
                  {getPerformanceBadge(quizScores.saqScore || 0).label}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="mb-2 flex justify-between text-sm">
                    <span>
                      {t("quiz.score", { score: quizScores.saqScore || 0 })}
                    </span>
                    <span
                      className={getPerformanceColor(quizScores.saqScore || 0)}
                    >
                      {t("quiz.percent", {
                        percent: Math.round((quizScores.saqScore || 0) * 20),
                      })}
                    </span>
                  </div>
                  <Progress
                    value={(quizScores.saqScore || 0) * 20}
                    className="h-3 border-2 border-[var(--cq-wood-dark)] bg-[#2a1d12] [&>[data-slot=progress-indicator]]:bg-[var(--cq-gold)]"
                  />
                </div>
              </div>

              {quizScores.saqScore !== undefined && (
                <p className="cq-muted text-sm italic">
                  {saqFeedback[quizScores.saqScore as keyof typeof saqFeedback]}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Learning Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Saved Words */}
        {wordList.length > 0 && (
          <div className="cq-panel overflow-hidden p-0">
            <div className="p-6 pb-0">
              <div className="cq-sign">
                <Sparkles className="h-6 w-6" aria-hidden="true" />
                <div className="leading-none font-semibold">
                  {t("vocabulary.title", { count: wordList.length })}
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {wordList.slice(0, 8).map((word, index) => (
                  <div
                    key={index}
                    className="lf-well p-3"
                  >
                    <span className="font-semibold">
                      {word.vocabulary}
                    </span>
                  </div>
                ))}
              </div>
              {wordList.length > 8 && (
                <p className="cq-muted mt-4 text-center text-sm">
                  {t("vocabulary.more", { count: wordList.length - 8 })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Saved Sentences */}
        {sentenceList.length > 0 && (
          <div className="cq-panel overflow-hidden p-0">
            <div className="p-6 pb-0">
              <div className="cq-sign">
                <TrendingUp className="h-6 w-6" aria-hidden="true" />
                <div className="leading-none font-semibold">
                  {t("sentences.title", { count: sentenceList.length })}
                </div>
              </div>
            </div>
            <div className="space-y-3 p-6">
              {sentenceList.slice(0, 3).map((sentence, index) => (
                <div
                  key={index}
                  className="lf-well p-4"
                >
                  <p className="text-sm leading-relaxed">
                    &ldquo;{sentence.sentence}&rdquo;
                  </p>
                </div>
              ))}
              {sentenceList.length > 3 && (
                <p className="cq-muted text-center text-sm">
                  {t("sentences.more", { count: sentenceList.length - 3 })}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {isPreview ? (
        <p role="status" className="cq-panel flex min-h-12 flex-row items-center justify-center gap-2 py-2 text-base font-bold">
          <Eye className="size-5" aria-hidden="true" />
          {t("previewNote")}
        </p>
      ) : null}
      <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
        <RpgButton tone="gold" className="w-full sm:w-auto" onClick={backToReadPage} disabled={restarting}>
          <BookOpen className="size-5" aria-hidden="true" />
          {t("actions.backToRead")}
        </RpgButton>
        <RpgButton tone="iron" className="w-full sm:w-auto" onClick={askRestart} disabled={restarting} aria-haspopup="dialog">
          <RotateCcw className="size-5" aria-hidden="true" />
          {restarting ? t("actions.restarting") : t("actions.startAgain")}
        </RpgButton>
      </div>
      {restartFailed ? (
        <p role="alert" className="cq-panel lf-text-bad py-2 text-center text-base font-bold">
          {t("restart.error")}
        </p>
      ) : null}
      {confirming ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(10,8,20,0.6)" }}>
          <Panel role="alertdialog" aria-modal="true" aria-labelledby="restart-title" className="w-full max-w-md">
            <h2 id="restart-title" className="text-2xl font-bold">
              {t("restart.title")}
            </h2>
            <p className="text-base">{t("restart.body1")}</p>
            <p className="text-base">{t("restart.body2")}</p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <RpgButton tone="iron" className="w-full sm:w-auto" onClick={() => setConfirming(false)} disabled={restarting} autoFocus>
                {t("restart.cancel")}
              </RpgButton>
              <RpgButton tone="gold" className="w-full sm:w-auto" onClick={confirmRestart} disabled={restarting}>
                {restarting ? t("actions.restarting") : t("actions.startAgain")}
              </RpgButton>
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
