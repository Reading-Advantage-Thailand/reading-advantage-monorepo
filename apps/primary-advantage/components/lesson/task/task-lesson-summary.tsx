"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Clock,
  Target,
  Sparkles,
  TrendingUp,
  Brain,
  Star,
  CheckCircle,
  Zap,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Article, WordListTimestamp } from "@/types";
import { getLessonSummaryData } from "@/actions/article";
import { useSession } from "next-auth/react";

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

export default function TaskLessonSummary({
  article,
  timerSpent,
}: {
  article: Article;
  timerSpent: number;
}) {
  const [loading, setLoading] = useState(true);
  const [totalXp, setTotalXp] = useState(0);
  const [quizScores, setQuizScores] = useState<QuizScores>({
    mcqScore: 0,
    saqScore: 0,
  });
  const [showCelebration, setShowCelebration] = useState(false);
  const wordList = article?.sentencsAndWordsForFlashcard?.[0]
    ?.words as WordList[];
  const sentenceList = article?.sentencsAndWordsForFlashcard?.[0]
    ?.sentence as Sentence[];
  const router = useRouter();
  const t = useTranslations("Lesson.Summary");
  const { data: session, update } = useSession();

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
          setQuizScores(result.data.quizScores);
          setShowCelebration(true);
          update({
            user: {
              ...session?.user,
            },
          });
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

  const getPerformanceColor = (score: number) => {
    if (score >= 4) return "text-green-600 dark:text-green-400";
    if (score >= 3) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getPerformanceBadge = (score: number) => {
    if (score >= 4)
      return {
        label: "Excellent",
        variant: "default" as const,
        color: "bg-green-500",
      };
    if (score >= 3)
      return {
        label: "Good",
        variant: "secondary" as const,
        color: "bg-yellow-500",
      };
    return {
      label: "Needs Practice",
      variant: "destructive" as const,
      color: "bg-red-500",
    };
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-4 rounded-2xl border border-green-200 bg-gradient-to-br from-green-300 via-lime-300 to-emerald-300 p-8 text-center dark:border-green-800 dark:from-green-950 dark:via-lime-950 dark:to-emerald-950">
          <div className="animate-pulse space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700"></div>
            <div className="mx-auto h-8 w-1/2 rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="mx-auto h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700"></div>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 w-1/4 rounded bg-gray-200 dark:bg-gray-700"></div>
                  <div className="h-6 w-1/2 rounded bg-gray-200 dark:bg-gray-700"></div>
                  <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-700"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      {/* Celebration Header */}
      <div
        className={`relative space-y-6 overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-300 via-green-300 to-teal-300 p-8 text-center shadow-2xl dark:border-emerald-800 dark:from-emerald-950 dark:via-green-950 dark:to-teal-950 ${showCelebration ? "animate-in slide-in-from-top duration-700" : ""}`}
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-4 left-4 animate-bounce text-2xl text-yellow-400">
            ⭐
          </div>
          <div className="absolute top-8 right-8 animate-bounce text-xl text-yellow-400 delay-300">
            🎉
          </div>
          <div className="absolute bottom-4 left-8 animate-bounce text-xl text-yellow-400 delay-500">
            ✨
          </div>
          <div className="absolute right-4 bottom-8 animate-bounce text-2xl text-yellow-400 delay-700">
            🏆
          </div>
        </div>

        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-100 to-green-100 p-4 shadow-lg dark:from-emerald-900 dark:to-green-900">
            <Trophy className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
          </div>

          <h1 className="mb-4 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-4xl font-bold text-transparent md:text-5xl dark:from-emerald-400 dark:via-green-400 dark:to-teal-400">
            {t("title")}
          </h1>

          <p className="mx-auto max-w-2xl text-xl leading-relaxed text-gray-600 dark:text-gray-300">
            {t("completed")}
          </p>

          {/* XP Highlight */}
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-gradient-to-r from-yellow-100 to-orange-100 px-6 py-3 dark:border-yellow-800 dark:from-yellow-900 dark:to-orange-900">
            <Zap className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <span className="text-lg font-bold text-yellow-700 dark:text-yellow-300">
              {t("xpEarned", { xp: totalXp })}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Time Card */}
        <Card className="group dark:bg-background relative overflow-hidden border-blue-200 bg-blue-400 transition-all duration-300 hover:shadow-lg dark:border-blue-800">
          <CardContent>
            <div className="flex items-center justify-center gap-4">
              <div className="rounded-full bg-blue-100 p-3 transition-transform duration-300 group-hover:scale-110 dark:bg-blue-900">
                <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t("stats.timeSpent")}
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatTimer(timerSpent)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Words Card */}
        <Card className="group dark:bg-background relative overflow-hidden border-purple-200 bg-purple-400 transition-all duration-300 hover:shadow-lg dark:border-purple-800">
          <CardContent>
            <div className="flex items-center justify-center gap-4">
              <div className="rounded-full bg-purple-100 p-3 transition-transform duration-300 group-hover:scale-110 dark:bg-purple-900">
                <BookOpen className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t("stats.wordsSaved")}
                </p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {wordList.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sentences Card */}
        <Card className="group dark:bg-background relative overflow-hidden border-indigo-200 bg-indigo-400 transition-all duration-300 hover:shadow-lg dark:border-indigo-800">
          <CardContent>
            <div className="flex items-center justify-center gap-4">
              <div className="rounded-full bg-indigo-100 p-3 transition-transform duration-300 group-hover:scale-110 dark:bg-indigo-900">
                <Brain className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t("stats.sentences")}
                </p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {sentenceList.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* XP Card */}
        <Card className="group dark:bg-background relative overflow-hidden border-yellow-200 bg-yellow-400 transition-all duration-300 hover:shadow-lg dark:border-yellow-800">
          <CardContent>
            <div className="flex items-center justify-center gap-4">
              <div className="rounded-full bg-yellow-100 p-3 transition-transform duration-300 group-hover:scale-110 dark:bg-yellow-900">
                <Star className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t("stats.totalXp")}
                </p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {totalXp}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quiz Performance */}
      {quizScores && (
        <Card className="border-gradient-to-r dark:bg-background overflow-hidden border-2 bg-violet-200 from-pink-400 to-violet-400 dark:from-pink-800 dark:to-violet-800">
          <CardHeader className="-mt-6 bg-gradient-to-r from-pink-300 to-violet-300 p-6 dark:from-pink-950 dark:to-violet-950">
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6 text-pink-600 dark:text-pink-400" />
              <CardTitle className="text-xl font-bold text-pink-700 dark:text-pink-300">
                {t("quiz.title")}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {/* MCQ Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-200">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  {t("quiz.mcq")}
                </h4>
                <Badge {...getPerformanceBadge(quizScores.mcqScore || 0)}>
                  {getPerformanceBadge(quizScores.mcqScore || 0).label}
                </Badge>
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
                    className="h-3"
                  />
                </div>
              </div>

              {quizScores.mcqScore !== undefined && (
                <p className="text-sm text-gray-600 italic dark:text-gray-400">
                  {mcqFeedback[quizScores.mcqScore as keyof typeof mcqFeedback]}
                </p>
              )}
            </div>

            <Separator />

            {/* SAQ Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-200">
                  <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  {t("quiz.saq")}
                </h4>
                <Badge {...getPerformanceBadge(quizScores.saqScore || 0)}>
                  {getPerformanceBadge(quizScores.saqScore || 0).label}
                </Badge>
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
                    className="h-3"
                  />
                </div>
              </div>

              {quizScores.saqScore !== undefined && (
                <p className="text-sm text-gray-600 italic dark:text-gray-400">
                  {saqFeedback[quizScores.saqScore as keyof typeof saqFeedback]}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Learning Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Saved Words */}
        {wordList.length > 0 && (
          <Card className="dark:bg-background overflow-hidden bg-emerald-100">
            <CardHeader className="-mt-6 flex items-center gap-3 bg-gradient-to-r from-emerald-300 to-green-300 p-6 dark:from-emerald-950 dark:to-green-950">
              <Sparkles className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              <CardTitle className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                {t("vocabulary.title", { count: wordList.length })}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {wordList.slice(0, 8).map((word, index) => (
                  <div
                    key={index}
                    className="group rounded-lg border border-emerald-200 bg-gradient-to-r from-emerald-300 to-green-300 p-3 transition-all duration-300 hover:scale-105 hover:shadow-md dark:border-emerald-700 dark:from-emerald-900 dark:to-green-900"
                  >
                    <span className="font-semibold text-emerald-700 group-hover:text-emerald-800 dark:text-emerald-300 dark:group-hover:text-emerald-200">
                      {word.vocabulary}
                    </span>
                  </div>
                ))}
              </div>
              {wordList.length > 8 && (
                <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  {t("vocabulary.more", { count: wordList.length - 8 })}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Saved Sentences */}
        {sentenceList.length > 0 && (
          <Card className="dark:bg-background overflow-hidden bg-blue-100">
            <CardHeader className="-mt-6 flex items-center gap-3 bg-gradient-to-r from-blue-300 to-indigo-300 p-6 dark:from-blue-950 dark:to-indigo-950">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <CardTitle className="text-xl font-bold text-blue-700 dark:text-blue-300">
                  {t("sentences.title", { count: sentenceList.length })}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-6">
              {sentenceList.slice(0, 3).map((sentence, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-300 to-indigo-300 p-4 transition-all duration-300 hover:shadow-md dark:border-blue-700 dark:from-blue-900 dark:to-indigo-900"
                >
                  <p className="text-sm leading-relaxed text-blue-700 dark:text-blue-300">
                    &ldquo;{sentence.sentence}&rdquo;
                  </p>
                </div>
              ))}
              {sentenceList.length > 3 && (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  {t("sentences.more", { count: sentenceList.length - 3 })}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col items-center justify-center gap-4 pt-6 sm:flex-row">
        <Button
          onClick={backToReadPage}
          size="lg"
          className="w-full transform rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-8 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:from-emerald-700 hover:to-green-700 hover:shadow-xl sm:w-auto"
        >
          <BookOpen className="mr-2 h-5 w-5" />
          {t("actions.backToRead")}
        </Button>
      </div>
    </div>
  );
}
