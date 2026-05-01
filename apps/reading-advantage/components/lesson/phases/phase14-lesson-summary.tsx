"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import {
  Trophy,
  Clock,
  Star,
  BookOpen,
  Brain,
  Target,
  Award,
  Sparkles,
  CheckCircle,
  TrendingUp,
  Zap,
  Users,
} from "lucide-react";
import { useScopedI18n } from "@/locales/client";
import { useRouter } from "next/navigation";

interface Phase14LessonSummaryProps {
  articleId: string;
  userId: string;
  elapsedTime: string;
}

interface WordList {
  vocabulary: string;
  definition: {
    en: string;
    th: string;
    cn: string;
    tw: string;
    vi: string;
  };
  index: number;
  startTime: number;
  endTime: number;
  audioUrl: string;
}

interface Sentence {
  sentence: string;
  sentence_index: number;
  article_id: string;
  created_at: string;
}

interface QuizScores {
  mcqScore: number;
  saqScore: number;
}

const Phase14LessonSummary: React.FC<Phase14LessonSummaryProps> = ({
  articleId,
  userId,
  elapsedTime,
}) => {
  const [loading, setLoading] = useState(false);
  const [wordList, setWordList] = useState<WordList[]>([]);
  const [sentenceList, setSentenceList] = useState<Sentence[]>([]);
  const [totalXp, setTotalXp] = useState(0);
  const [quizScores, setQuizScores] = useState<QuizScores>();
  const [showCelebration, setShowCelebration] = useState(false);

  const t = useScopedI18n("pages.student.lessonPage");
  const router = useRouter();

  const mcqFeedback = {
    1: t("MCQ1point"),
    2: t("MCQ2points"),
    3: t("MCQ3points"),
    4: t("MCQ4points"),
    5: t("MCQ5points"),
  };

  const saqFeedback = {
    1: t("SAQ1point"),
    2: t("SAQ2points"),
    3: t("SAQ3points"),
    4: t("SAQ4points"),
    5: t("SAQ5points"),
  };

  const fetchWordList = React.useCallback(async () => {
    try {
      const res = await fetch(
        `/api/v1/users/wordlist/${userId}?articleId=${articleId}`
      );
      const data = await res.json();
      if (!Array.isArray(data.word)) throw new Error("Invalid word list");
      const extractedWords = data.word.map((entry: any) => entry.word);
      setWordList(extractedWords);
    } catch (error: any) {
      console.error(error);
      toast({
        title: t("somethingWentWrong"),
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    }
  }, [userId, articleId]);

  const fetchSentence = React.useCallback(async () => {
    try {
      const res = await fetch(
        `/api/v1/users/sentences/${userId}?articleId=${articleId}`
      );
      const data = await res.json();
      setSentenceList(data.sentences);
    } catch (error: any) {
      console.error(error);
      toast({
        title: t("somethingWentWrong"),
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    }
  }, [userId, articleId]);

  const fetchXp = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/xp/${userId}?articleId=${articleId}`);
      const data = await res.json();
      setTotalXp(data.total_xp);
    } catch (error: any) {
      console.error(error);
      toast({
        title: t("somethingWentWrong"),
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    }
  }, [userId, articleId]);

  const fetchQuizScores = React.useCallback(async () => {
    try {
      const res = await fetch(
        `/api/v1/lesson/${userId}/quize-performance?articleId=${articleId}`
      );
      const data = await res.json();
      setQuizScores(data);
    } catch (error: any) {
      console.error(error);
      toast({
        title: t("somethingWentWrong"),
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    }
  }, [userId, articleId]);

  const backToReadPage = () => {
    router.push("/student/read");
  };

  useEffect(() => {
    const fetchAllData = async () => {
      if (!userId || !articleId) return;
      try {
        setLoading(true);
        await Promise.all([
          fetchWordList(),
          fetchSentence(),
          fetchXp(),
          fetchQuizScores(),
        ]);
        setShowCelebration(true);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [articleId, userId]);

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
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-4 bg-gradient-to-br from-green-300 via-lime-300 to-emerald-300 dark:from-green-950 dark:via-lime-950 dark:to-emerald-950 p-8 rounded-2xl border border-green-200 dark:border-green-800">
          <div className="space-y-4 animate-pulse">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-full w-12 mx-auto"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6">
      {/* Celebration Header */}
      <div
        className={`text-center space-y-6 relative overflow-hidden bg-gradient-to-br from-emerald-300 via-green-300 to-teal-300 dark:from-emerald-950 dark:via-green-950 dark:to-teal-950 p-8 rounded-3xl border border-emerald-200 dark:border-emerald-800 shadow-2xl ${showCelebration ? "animate-in slide-in-from-top duration-700" : ""}`}
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-4 left-4 text-yellow-400 text-2xl animate-bounce">
            ⭐
          </div>
          <div className="absolute top-8 right-8 text-yellow-400 text-xl animate-bounce delay-300">
            🎉
          </div>
          <div className="absolute bottom-4 left-8 text-yellow-400 text-xl animate-bounce delay-500">
            ✨
          </div>
          <div className="absolute bottom-8 right-4 text-yellow-400 text-2xl animate-bounce delay-700">
            🏆
          </div>
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900 dark:to-green-900 rounded-full mb-6 shadow-lg">
            <Trophy className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
          </div>

          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 dark:from-emerald-400 dark:via-green-400 dark:to-teal-400 bg-clip-text text-transparent mb-4">
            {t("phase14Title")}
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            {t("fantasticWork")}
          </p>

          {/* XP Highlight */}
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900 px-6 py-3 rounded-full mt-4 border border-yellow-200 dark:border-yellow-800">
            <Zap className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <span className="font-bold text-yellow-700 dark:text-yellow-300 text-lg">
              +{totalXp} XP Earned!
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Time Card */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-blue-200 dark:border-blue-800 bg-blue-400 dark:bg-background">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full group-hover:scale-110 transition-transform duration-300">
                <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t("timeSpent")}
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {elapsedTime}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Words Card */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-purple-200 dark:border-purple-800 bg-purple-400 dark:bg-background">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full group-hover:scale-110 transition-transform duration-300">
                <BookOpen className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t("wordsSaved")}
                </p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {wordList.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sentences Card */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-indigo-200 dark:border-indigo-800 bg-indigo-400 dark:bg-background">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900 rounded-full group-hover:scale-110 transition-transform duration-300">
                <Brain className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t("sentences")}
                </p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {sentenceList.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* XP Card */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-yellow-200 dark:border-yellow-800 bg-yellow-400 dark:bg-background">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full group-hover:scale-110 transition-transform duration-300">
                <Star className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t("totalXp")}
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
        <Card className="overflow-hidden border-2 border-gradient-to-r from-pink-400 to-violet-400 dark:from-pink-800 dark:to-violet-800 bg-violet-200 dark:bg-background">
          <CardHeader className="bg-gradient-to-r from-pink-300 to-violet-300 dark:from-pink-950 dark:to-violet-950 pb-4">
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6 text-pink-600 dark:text-pink-400" />
              <CardTitle className="text-xl font-bold text-pink-700 dark:text-pink-300">
                {t("quizPerformance")}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* MCQ Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  {t("multipleChoiceQuestions")}
                </h4>
                <Badge {...getPerformanceBadge(quizScores.mcqScore || 0)}>
                  {getPerformanceBadge(quizScores.mcqScore || 0).label}
                </Badge>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Score: {quizScores.mcqScore || 0}/5</span>
                    <span
                      className={getPerformanceColor(quizScores.mcqScore || 0)}
                    >
                      {Math.round((quizScores.mcqScore || 0) * 20)}%
                    </span>
                  </div>
                  <Progress
                    value={(quizScores.mcqScore || 0) * 20}
                    className="h-3"
                  />
                </div>
              </div>

              {quizScores.mcqScore !== undefined && (
                <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                  {mcqFeedback[quizScores.mcqScore as keyof typeof mcqFeedback]}
                </p>
              )}
            </div>

            <Separator />

            {/* SAQ Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  {t("shortAnswerQuestions")}
                </h4>
                <Badge {...getPerformanceBadge(quizScores.saqScore || 0)}>
                  {getPerformanceBadge(quizScores.saqScore || 0).label}
                </Badge>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Score: {quizScores.saqScore || 0}/5</span>
                    <span
                      className={getPerformanceColor(quizScores.saqScore || 0)}
                    >
                      {Math.round((quizScores.saqScore || 0) * 20)}%
                    </span>
                  </div>
                  <Progress
                    value={(quizScores.saqScore || 0) * 20}
                    className="h-3"
                  />
                </div>
              </div>

              {quizScores.saqScore !== undefined && (
                <p className="text-sm text-gray-600 dark:text-gray-400 italic">
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
          <Card className="overflow-hidden bg-emerald-100 dark:bg-background">
            <CardHeader className="bg-gradient-to-r from-emerald-300 to-green-300 dark:from-emerald-950 dark:to-green-950">
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                <CardTitle className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                  {t("vocabularyLearned", { count: wordList.length })}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {wordList.slice(0, 8).map((word, index) => (
                  <div
                    key={index}
                    className="group p-3 bg-gradient-to-r from-emerald-300 to-green-300 dark:from-emerald-900 dark:to-green-900 rounded-lg border border-emerald-200 dark:border-emerald-700 hover:shadow-md transition-all duration-300 hover:scale-105"
                  >
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300 group-hover:text-emerald-800 dark:group-hover:text-emerald-200">
                      {word.vocabulary}
                    </span>
                  </div>
                ))}
              </div>
              {wordList.length > 8 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
                  +{wordList.length - 8} more words learned
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Saved Sentences */}
        {sentenceList.length > 0 && (
          <Card className="overflow-hidden bg-blue-100 dark:bg-background">
            <CardHeader className="bg-gradient-to-r from-blue-300 to-indigo-300 dark:from-blue-950 dark:to-indigo-950">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <CardTitle className="text-xl font-bold text-blue-700 dark:text-blue-300">
                  {t("keySentences", { count: sentenceList.length })}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {sentenceList.slice(0, 3).map((sentence, index) => (
                <div
                  key={index}
                  className="p-4 bg-gradient-to-r from-blue-300 to-indigo-300 dark:from-blue-900 dark:to-indigo-900 rounded-lg border border-blue-200 dark:border-blue-700 hover:shadow-md transition-all duration-300"
                >
                  <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                    &ldquo;{sentence.sentence}&rdquo;
                  </p>
                </div>
              ))}
              {sentenceList.length > 3 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  +{sentenceList.length - 3} more sentences saved
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
        <Button
          onClick={backToReadPage}
          size="lg"
          className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
        >
          <BookOpen className="h-5 w-5 mr-2" />
          {t("readPageButton") || t("continueReading")}
        </Button>
      </div>
    </div>
  );
};

Phase14LessonSummary.displayName = "Phase14LessonSummary";
export default Phase14LessonSummary;
