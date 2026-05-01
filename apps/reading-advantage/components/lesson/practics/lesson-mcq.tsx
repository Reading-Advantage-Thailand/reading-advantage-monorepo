"use client";

import React, { useEffect, useState, useContext } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  XCircle,
  Circle,
  Clock,
  Brain,
  Trophy,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { QuizContext, QuizContextProvider } from "@/contexts/quiz-context";
import { useScopedI18n } from "@/locales/client";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import { useQuestionStore } from "@/store/question-store";

// Import necessary types and enums
enum AnswerStatus {
  CORRECT = 0,
  INCORRECT = 1,
  UNANSWERED = 2,
}

enum QuestionState {
  LOADING = 0,
  INCOMPLETE = 1,
  COMPLETED = 2,
}

interface MultipleChoiceQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
}

interface QuizSummary {
  totalXpEarned: number;
  totalTimer: number;
  correctAnswers: number;
  incorrectAnswers: number;
}

interface QuestionResponse {
  results: MultipleChoiceQuestion[];
  progress: AnswerStatus[];
  total: number;
  state: QuestionState;
  summary?: QuizSummary;
}

interface LessonMCQProps {
  articleId: string;
  userId: string;
  articleTitle: string;
  articleLevel: number;
  onCompleteChange: (complete: boolean) => void;
}

function LessonMCQContent({
  articleId,
  userId,
  articleTitle,
  articleLevel,
  onCompleteChange,
}: LessonMCQProps) {
  const [state, setState] = useState(QuestionState.LOADING);
  const [data, setData] = useState<QuestionResponse>({
    results: [],
    progress: [],
    total: 5,
    state: QuestionState.LOADING,
    summary: undefined,
  });
  const [progress, setProgress] = useState<AnswerStatus[]>([]);
  const [isLoadingAnswer, setLoadingAnswer] = useState(false);
  const [selectedOption, setSelectedOption] = useState(-1);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const { timer, setPaused } = useContext(QuizContext);
  const t = useScopedI18n("pages.student.lessonPage");
  const router = useRouter();

  // Initialize quiz data
  useEffect(() => {
    const fetchQuizData = async () => {
      try {
        const timestamp = new Date().getTime();
        const response = await fetch(
          `/api/v1/articles/${articleId}/questions/mcq?_t=${timestamp}`
        );
        const quizData = await response.json();

        setData(quizData);
        setState(quizData.state as QuestionState);
        setProgress(
          quizData.progress ||
            Array(quizData.total || 5).fill(AnswerStatus.UNANSWERED)
        );

        // If API returns completed state (2), set component state to completed
        if (quizData.state === QuestionState.COMPLETED) {
          setState(QuestionState.COMPLETED);
          onCompleteChange(true);
          return;
        }

        // Find current question index
        const currentIndex = (quizData.progress || []).findIndex(
          (p: AnswerStatus) => p === AnswerStatus.UNANSWERED
        );
        setCurrentQuestionIndex(currentIndex !== -1 ? currentIndex : 0);
      } catch (error) {
        console.error("Failed to fetch quiz data:", error);
        setState(QuestionState.INCOMPLETE);
      }
    };

    fetchQuizData();
  }, [articleId]);

  // Handle answer submission
  const handleAnswerSubmit = async (
    questionId: string,
    selectedAnswer: string,
    optionIndex: number
  ) => {
    setPaused(true);
    setLoadingAnswer(true);
    setSelectedOption(optionIndex);

    try {
      const response = await fetch(
        `/api/v1/articles/${articleId}/questions/mcq/${questionId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedAnswer: selectedAnswer.replace(/^\d+\.\s*/, ""),
            timeRecorded: timer,
          }),
        }
      );

      const result = await response.json();

      if (result) {
        const isCorrect =
          selectedAnswer.replace(/^\d+\.\s*/, "") === result.correctAnswer;
        setCorrectAnswer(result.correctAnswer || "");

        // Update progress
        const newProgress = [...progress];
        newProgress[currentQuestionIndex] = isCorrect
          ? AnswerStatus.CORRECT
          : AnswerStatus.INCORRECT;
        setProgress(newProgress);

        // Save to session storage
        try {
          sessionStorage.setItem(
            `quiz_progress_${articleId}`,
            JSON.stringify(newProgress)
          );
        } catch (e) {
          console.error("Failed to save progress:", e);
        }
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
    } finally {
      setLoadingAnswer(false);
    }
  };

  // Handle next question
  const handleNext = async () => {
    setSelectedOption(-1);
    setCorrectAnswer("");
    setPaused(false);

    const answeredCount = progress.filter(
      (p) => p !== AnswerStatus.UNANSWERED
    ).length;

    if (answeredCount >= (data.total || 5)) {
      // Quiz completed
      setState(QuestionState.COMPLETED);
      onCompleteChange(true);

      const correctCount = progress.filter(
        (p) => p === AnswerStatus.CORRECT
      ).length;
      const totalXp = correctCount * 2;

      toast({
        title: t("quizCompleted"),
        description: t("greatJobXpEarned", { correct: correctCount, total: data.total || 5, xp: totalXp }),
      });

      // Clear session storage
      try {
        sessionStorage.removeItem(`quiz_progress_${articleId}`);
        sessionStorage.removeItem(`quiz_started_${articleId}`);
      } catch (e) {
        console.error("Error clearing session storage:", e);
      }

      return;
    }

    // Load next question
    setLoadingAnswer(true);
    try {
      const timestamp = new Date().getTime();
      const response = await fetch(
        `/api/v1/articles/${articleId}/questions/mcq?_t=${timestamp}`
      );
      const nextData = await response.json();

      setData(nextData);
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } catch (error) {
      console.error("Error fetching next question:", error);
    } finally {
      setLoadingAnswer(false);
    }
  };

  // Handle retake
  const handleRetake = async () => {
    setState(QuestionState.LOADING);

    try {
      // Clear session storage
      sessionStorage.removeItem(`quiz_progress_${articleId}`);
      sessionStorage.removeItem(`quiz_started_${articleId}`);

      // Delete existing progress
      await fetch(`/api/v1/articles/${articleId}/questions/mcq`, {
        method: "DELETE",
      });

      // Fetch fresh quiz
      const timestamp = new Date().getTime();
      const response = await fetch(
        `/api/v1/articles/${articleId}/questions/mcq?_t=${timestamp}`
      );
      const freshData = await response.json();

      setData(freshData);
      setProgress(Array(freshData.total || 5).fill(AnswerStatus.UNANSWERED));
      setCurrentQuestionIndex(0);
      setSelectedOption(-1);
      setCorrectAnswer("");
      setState(QuestionState.INCOMPLETE);
      onCompleteChange(false);
    } catch (error) {
      console.error("Error during retake:", error);
    }
  };

  // Calculate progress percentage
  const progressPercentage =
    (progress.filter((p) => p !== AnswerStatus.UNANSWERED).length /
      (data.total || 5)) *
    100;
  const correctCount =
    data.summary?.correctAnswers ??
    progress.filter((p) => p === AnswerStatus.CORRECT).length;
  const totalXpEarned = data.summary?.totalXpEarned ?? correctCount * 2;
  const totalTimer = data.summary?.totalTimer ?? timer;

  // Loading state
  if (state === QuestionState.LOADING) {
    return (
      <div className="w-full space-y-4">
        <Card className="animate-pulse border-0 shadow-sm">
          <CardHeader className="space-y-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-muted rounded-full"></div>
                <div className="h-5 bg-muted rounded w-32"></div>
              </div>
              <div className="h-6 bg-muted rounded w-16"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-24"></div>
              <div className="h-2 bg-muted rounded w-full"></div>
            </div>
            <div className="flex justify-center space-x-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-5 h-5 bg-muted rounded-full"></div>
              ))}
            </div>
          </CardHeader>
        </Card>

        <Card className="animate-pulse border-0 shadow-sm">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-3/4"></div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded-xl"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Completed state
  if (state === QuestionState.COMPLETED) {
    return (
      <div className="w-full space-y-4">
        <Card className="border-0 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/50 dark:via-emerald-950/50 dark:to-teal-950/50 shadow-lg">
          <CardHeader className="text-center space-y-6 pb-8">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-full flex items-center justify-center shadow-lg">
              <Trophy className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>

            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold text-green-800 dark:text-green-200 flex items-center justify-center gap-2">
                <span>🎉</span>
                {t("quizCompleted")}
                <span>🎉</span>
              </CardTitle>
              <div className="text-green-700 dark:text-green-300">
                {t("quizCompletedDescription")}
              </div>
            </div>

            {/* Score Display */}
            <div className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-6 backdrop-blur-sm border border-green-200 dark:border-green-800">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {correctCount}/{data.total || 5}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    {t("correctAnswers")}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {Math.round((correctCount / (data.total || 5)) * 100)}%
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    {t("accuracy")}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    +{totalXpEarned}
                  </div>
                  <div className="text-sm text-purple-700 dark:text-purple-300">
                    {t("mcqXpEarned")}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {Math.floor(totalTimer / 60)}:
                    {String(totalTimer % 60).padStart(2, "0")}
                  </div>
                  <div className="text-sm text-orange-700 dark:text-orange-300">
                    {t("totalTime")}
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Indicators */}
            <div className="flex justify-center space-x-3">
              {progress.map((status, idx) => {
                if (status === AnswerStatus.CORRECT) {
                  return (
                    <CheckCircle key={idx} className="w-8 h-8 text-green-500" />
                  );
                } else if (status === AnswerStatus.INCORRECT) {
                  return <XCircle key={idx} className="w-8 h-8 text-red-500" />;
                }
                return <Circle key={idx} className="w-8 h-8 text-gray-300" />;
              })}
            </div>

            <div className="space-y-4 justify-end">
              <Button
                onClick={handleRetake}
                variant="outline"
                className="flex items-center space-x-2 min-w-32 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 border-green-300 dark:border-green-700"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t("retakeButton")}</span>
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Quiz in progress - only show question card if not completed
  const currentQuestion = data.results?.[0];

  // If quiz is completed but showing incomplete UI, redirect to completed state
  if (
    state === QuestionState.INCOMPLETE &&
    data.state === QuestionState.COMPLETED
  ) {
    setState(QuestionState.COMPLETED);
    onCompleteChange(true);
  }

  return (
    <div className="w-full space-y-4">
      {/* Progress Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="font-semibold text-blue-900 dark:text-blue-100">
              {t("multipleChoiceQuiz")}
            </span>
          </div>
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{timer}s</span>
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-blue-700 dark:text-blue-300">
            <span>
              {t("questionOfTotal", { current: currentQuestionIndex + 1, total: data.total || 5 })}
            </span>
            <span>{t("mcqPercentComplete", { percent: Math.round(progressPercentage) })}</span>
          </div>
          <Progress
            value={progressPercentage}
            className="h-2 bg-blue-100 dark:bg-blue-900"
          />
        </div>

        {/* Progress Indicators */}
        <div className="flex justify-center space-x-2 mt-3">
          {progress.map((status, idx) => {
            if (status === AnswerStatus.CORRECT) {
              return (
                <CheckCircle key={idx} className="w-5 h-5 text-green-500" />
              );
            } else if (status === AnswerStatus.INCORRECT) {
              return <XCircle key={idx} className="w-5 h-5 text-red-500" />;
            }
            return (
              <Circle
                key={idx}
                className="w-5 h-5 text-gray-300 dark:text-gray-600"
              />
            );
          })}
        </div>
      </div>

      {/* Question Card - Only show if there's a current question */}
      {currentQuestion && (
        <Card className="shadow-sm border-0 bg-white dark:bg-gray-900">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-relaxed">
              {currentQuestion.question}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Answer Feedback */}
            {selectedOption >= 0 && (
              <div className="space-y-3 mb-6">
                <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-green-800 dark:text-green-200 mb-1">
                        {t("correctAnswer")}
                      </div>
                      <div className="text-green-700 dark:text-green-300">
                        {correctAnswer}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <div className="flex items-start space-x-3">
                    <Circle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-blue-800 dark:text-blue-200 mb-1">
                        {t("mcqYourAnswer")}
                      </div>
                      <div className="text-blue-700 dark:text-blue-300">
                        {currentQuestion.options?.[selectedOption]}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options
                ?.filter((option) => option && option.trim())
                ?.map((option, index) => {
                  const isSelected = selectedOption === index;
                  const isCorrect = correctAnswer === option;
                  const isIncorrect = isSelected && !isCorrect;

                  return (
                    <Button
                      key={`${currentQuestion.id}-${index}`}
                      variant="outline"
                      className={cn(
                        "w-full h-auto p-4 text-left justify-start transition-all duration-200",
                        "hover:bg-muted/50 border-2",
                        !isSelected &&
                          !isCorrect &&
                          "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600",
                        isIncorrect &&
                          "bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-700 text-red-900 dark:text-red-100",
                        isCorrect &&
                          selectedOption >= 0 &&
                          "bg-green-50 border-green-300 dark:bg-green-950/30 dark:border-green-700 text-green-900 dark:text-green-100"
                      )}
                      disabled={isLoadingAnswer || selectedOption !== -1}
                      onClick={() => {
                        if (selectedOption === -1) {
                          handleAnswerSubmit(currentQuestion.id, option, index);
                        }
                      }}
                    >
                      <div className="flex items-center space-x-3 w-full">
                        <div
                          className={cn(
                            "flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-colors",
                            isCorrect && selectedOption >= 0
                              ? "border-green-500 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                              : isIncorrect
                                ? "border-red-500 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                                : "border-gray-400 dark:border-gray-500 text-gray-600 dark:text-gray-400"
                          )}
                        >
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span className="flex-1 text-left">{option}</span>
                        {isIncorrect && (
                          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        )}
                        {isCorrect && selectedOption >= 0 && (
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                    </Button>
                  );
                })}
            </div>

            {/* Next Button */}
            {selectedOption >= 0 && (
              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleNext}
                  disabled={isLoadingAnswer}
                  size="lg"
                  className="min-w-32 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  {isLoadingAnswer ? (
                    <Icons.spinner className="w-4 h-4 animate-spin" />
                  ) : progress.filter((p) => p !== AnswerStatus.UNANSWERED)
                      .length >= (data.total || 5) ? (
                    <>
                      <Trophy className="w-4 h-4 mr-2" />
                      {t("finishQuiz")}
                    </>
                  ) : (
                    <>
                      {t("nextQuestion")}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function LessonMCQ(props: LessonMCQProps) {
  return (
    <QuizContextProvider>
      <LessonMCQContent {...props} />
    </QuizContextProvider>
  );
}
