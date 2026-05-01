"use client";

import React, { useEffect, useState, useContext, useTransition } from "react";
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
import { QuizContext, QuizContextProvider } from "@/contexts/question-context";
import { cn } from "@/lib/utils";
import { ActivityType, AnswerStatus, QuestionState } from "@/types/enum";
import { Article, MCQuestion } from "@/types";
import { finishQuiz, retakeQuiz } from "@/actions/question";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";

interface LessonMCQProps {
  article: Article;
}

function LessonMCQContent({ article }: { article: Article }) {
  const t = useTranslations("LessonMCQ");
  const [state, setState] = useState(QuestionState.LOADING);
  //     results: [],
  //     progress: [],
  //     total: 5,
  //     state: QuestionState.LOADING,
  //     summary: undefined,
  //   });
  const [progress, setProgress] = useState<AnswerStatus[]>(
    Array(5).fill(AnswerStatus.UNANSWERED),
  );
  const [correctAnswer, setCorrectAnswer] = useState<boolean>(false);
  const [questions, setQuestions] = useState<MCQuestion[]>([]);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<any[]>([]);
  const [activeQuestion, setActiveQuestion] = useState(null) as any;
  const [isPanding, startTransition] = useTransition();
  const { timer, setPaused } = useContext(QuizContext);
  const { data: session, update } = useSession();

  useEffect(() => {
    if (article.multipleChoiceQuestions) {
      const randomQuestions = article.multipleChoiceQuestions
        .sort(() => Math.random() - 0.5)
        .slice(0, 5);

      setQuestions(randomQuestions);
      setState(QuestionState.INCOMPLETE);
    }
  }, [article]);

  useEffect(() => {
    if (questions[currentIndex]) {
      // shuffle options for the current question

      setShuffledOptions(
        shuffleArray([...(questions[currentIndex].options ?? [])]),
      );
    }
  }, [questions, currentIndex]);

  const shuffleArray = (array: any[]) => {
    for (let i = array.length - 1; i > 0; --i) {
      // generate a random index between 0 and i
      const j = Math.floor(Math.random() * (i + 1));

      // swap elements --> destructuring assignment
      [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
  };

  // Initialize quiz data
  //   useEffect(() => {
  //     const fetchQuizData = async () => {
  //       try {
  //         const timestamp = new Date().getTime();
  //         const response = await fetch(
  //           `/api/articles/questions/${articleId}?questionType=${ActivityType.MC_QUESTION}`,
  //         );
  //         const quizData = await response.json();

  //         setData(quizData);
  //         setState(quizData.state as QuestionState);
  //         setProgress(
  //           quizData.progress ||
  //             Array(quizData.total || 5).fill(AnswerStatus.UNANSWERED),
  //         );

  //         // If API returns completed state (2), set component state to completed
  //         if (quizData.state === QuestionState.COMPLETED) {
  //           setState(QuestionState.COMPLETED);
  //           onCompleteChange(true);
  //           return;
  //         }

  //         // Find current question index
  //         const currentIndex = (quizData.progress || []).findIndex(
  //           (p: AnswerStatus) => p === AnswerStatus.UNANSWERED,
  //         );
  //         setCurrentQuestionIndex(currentIndex !== -1 ? currentIndex : 0);
  //       } catch (error) {
  //         console.error("Failed to fetch quiz data:", error);
  //         setState(QuestionState.INCOMPLETE);
  //       }
  //     };

  //     fetchQuizData();
  //   }, [articleId]);

  const handleActiveQuestion = (option: string) => {
    if (!questions[currentIndex]) return;

    const response = {
      question: questions[currentIndex].question,
      answer: option,
      isCorrect: questions[currentIndex].answer,
    };

    setResponses((prev) => {
      // check if the response already exists
      const existingIndex = prev.findIndex((res) => {
        return res.question === response.question;
      });

      // update the response if it exists

      if (existingIndex !== -1) {
        // update the response
        const updatedResponses = [...prev];
        updatedResponses[existingIndex] = response;

        return updatedResponses;
      } else {
        return [...prev, response];
      }
    });

    if (option === questions[currentIndex].answer) {
      setCorrectAnswer(true);
      setProgress((prev) => {
        const newProgress = [...prev];
        newProgress[currentIndex] = AnswerStatus.CORRECT;
        return newProgress;
      });
    } else {
      setCorrectAnswer(false);
      setProgress((prev) => {
        const newProgress = [...prev];
        newProgress[currentIndex] = AnswerStatus.INCORRECT;
        return newProgress;
      });
    }

    setActiveQuestion(option);
  };

  // Handle next question
  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);

      // reset the active question
      setActiveQuestion(null);
    }
  };

  // Handle retake
  const handleRetake = async () => {
    setState(QuestionState.LOADING);

    await retakeQuiz(article.id, ActivityType.MC_QUESTION);
    setState(QuestionState.INCOMPLETE);
    setProgress(Array(5).fill(AnswerStatus.UNANSWERED));
    setCurrentIndex(0);
    setActiveQuestion(null);
    setResponses([]);
    setCorrectAnswer(false);
  };

  const handleFinishQuiz = async () => {
    setPaused(true);
    // handle finish quiz logic here
    const data = {
      responses,
      score: progress.filter((status) => status === AnswerStatus.CORRECT)
        .length,
      timer,
    };

    startTransition(async () => {
      await finishQuiz(article.id, data, ActivityType.MC_QUESTION).then(
        (res) => {
          if (res.success) {
            setState(QuestionState.COMPLETED);
            update({
              user: {
                ...session?.user,
              },
            });
          }
        },
      );
    });
  };

  // Loading state
  if (state === QuestionState.LOADING) {
    return (
      <div className="w-full space-y-4">
        <Card className="animate-pulse border-0 shadow-sm">
          <CardHeader className="space-y-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="bg-muted h-8 w-8 rounded-full"></div>
                <div className="bg-muted h-5 w-32 rounded"></div>
              </div>
              <div className="bg-muted h-6 w-16 rounded"></div>
            </div>
            <div className="space-y-2">
              <div className="bg-muted h-4 w-24 rounded"></div>
              <div className="bg-muted h-2 w-full rounded"></div>
            </div>
            <div className="flex justify-center space-x-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-muted h-5 w-5 rounded-full"></div>
              ))}
            </div>
          </CardHeader>
        </Card>

        <Card className="animate-pulse border-0 shadow-sm">
          <CardHeader>
            <div className="bg-muted h-6 w-3/4 rounded"></div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-muted h-16 rounded-xl"></div>
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
        <Card className="border-0 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 shadow-lg dark:from-green-950/50 dark:via-emerald-950/50 dark:to-teal-950/50">
          <CardHeader className="space-y-6 pb-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-100 to-emerald-100 shadow-lg dark:from-green-900 dark:to-emerald-900">
              <Trophy className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>

            <div className="space-y-2">
              <CardTitle className="flex items-center justify-center gap-2 text-2xl font-bold text-green-800 dark:text-green-200">
                <span>🎉</span>
                {t("completed.title")}
                <span>🎉</span>
              </CardTitle>
              <div className="text-green-700 dark:text-green-300">
                {t("completed.description")}
              </div>
            </div>

            {/* Score Display */}
            <div className="rounded-xl border border-green-200 bg-white/60 p-6 backdrop-blur-sm dark:border-green-800 dark:bg-gray-900/60">
              <div className="grid grid-cols-1 gap-4 text-center md:grid-cols-4">
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {
                      progress.filter(
                        (status) => status === AnswerStatus.CORRECT,
                      ).length
                    }
                    /{questions.length}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    {t("completed.correctAnswers")}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {Math.round(
                      (progress.filter(
                        (status) => status === AnswerStatus.CORRECT,
                      ).length /
                        questions.length) *
                        100,
                    )}
                    %
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    {t("completed.accuracy")}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    +
                    {progress.filter(
                      (status) => status === AnswerStatus.CORRECT,
                    ).length * 2}
                  </div>
                  <div className="text-sm text-purple-700 dark:text-purple-300">
                    {t("completed.xpEarned")}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {Math.floor(timer / 60)}:
                    {String(timer % 60).padStart(2, "0")}
                  </div>
                  <div className="text-sm text-orange-700 dark:text-orange-300">
                    {t("completed.totalTime")}
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Indicators */}
            <div className="flex justify-center space-x-3">
              {progress.map((status, idx) => {
                if (status === AnswerStatus.CORRECT) {
                  return (
                    <CheckCircle key={idx} className="h-8 w-8 text-green-500" />
                  );
                } else if (status === AnswerStatus.INCORRECT) {
                  return <XCircle key={idx} className="h-8 w-8 text-red-500" />;
                }
                return <Circle key={idx} className="h-8 w-8 text-gray-300" />;
              })}
            </div>

            <div className="justify-end space-y-4">
              <Button
                onClick={handleRetake}
                variant="outline"
                className="flex min-w-32 items-center space-x-2 border-green-300 bg-white/80 hover:bg-white dark:border-green-700 dark:bg-gray-800/80 dark:hover:bg-gray-800"
              >
                <RefreshCw className="h-4 w-4" />
                <span>{t("actions.retake")}</span>
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Quiz in progress - only show question card if not completed
  const currentQuestion = questions[currentIndex];

  return (
    <div className="w-full space-y-4">
      {/* Progress Header */}
      <div className="rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 dark:border-blue-800 dark:from-blue-950/50 dark:to-indigo-950/50">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="font-semibold text-blue-900 dark:text-blue-100">
              {t("header.title")}
            </span>
          </div>
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{t("timer.seconds", { seconds: timer })}</span>
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-blue-700 dark:text-blue-300">
            <span>
              {t("header.questionOf", {
                current: currentIndex + 1,
                total: questions.length,
              })}
            </span>
            <span>
              {t("header.completePercent", {
                percent: Math.round(
                  (progress.filter((p) => p !== AnswerStatus.UNANSWERED)
                    .length /
                    questions.length) *
                    100,
                ),
              })}
            </span>
          </div>
          <Progress
            value={
              (progress.filter((p) => p !== AnswerStatus.UNANSWERED).length /
                questions.length) *
              100
            }
            className="h-2 bg-blue-100 dark:bg-blue-900"
          />
        </div>

        {/* Progress Indicators */}
        <div className="mt-3 flex justify-center space-x-2">
          {progress.map((status, idx) => {
            if (status === AnswerStatus.CORRECT) {
              return (
                <CheckCircle key={idx} className="h-5 w-5 text-green-500" />
              );
            } else if (status === AnswerStatus.INCORRECT) {
              return <XCircle key={idx} className="h-5 w-5 text-red-500" />;
            }
            return (
              <Circle
                key={idx}
                className="h-5 w-5 text-gray-300 dark:text-gray-600"
              />
            );
          })}
        </div>
      </div>

      {/* Question Card - Only show if there's a current question */}
      {currentQuestion && (
        <Card className="border-0 bg-white shadow-sm dark:bg-gray-900">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg leading-relaxed font-bold text-gray-900 dark:text-gray-100">
              {currentQuestion.question}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Options */}
            <div className="space-y-3">
              {shuffledOptions.map((option, i) => {
                const isSelectedOption = activeQuestion === option;
                const isCorrectOption =
                  currentQuestion && option === currentQuestion.answer;
                const shouldShowAsCorrect = isSelectedOption && correctAnswer;
                const shouldShowAsIncorrect =
                  isSelectedOption && !correctAnswer;
                const shouldHighlightCorrect =
                  !correctAnswer && activeQuestion && isCorrectOption;

                return (
                  <Button
                    key={i}
                    variant="outline"
                    className={cn(
                      "h-auto w-full justify-start border-2 p-4 text-left transition-all duration-200",
                      !activeQuestion &&
                        "border-gray-200 hover:border-blue-300 dark:border-gray-700 dark:hover:border-blue-600",
                      shouldShowAsCorrect &&
                        "border-green-300 bg-green-50 text-green-900 dark:border-green-700 dark:bg-green-950/30 dark:text-green-100",
                      shouldShowAsIncorrect &&
                        "border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950/30 dark:text-red-100",
                      shouldHighlightCorrect &&
                        "border-green-300 bg-green-50 text-green-900 dark:border-green-700 dark:bg-green-950/30 dark:text-green-100",
                    )}
                    onClick={() => {
                      if (!activeQuestion) {
                        handleActiveQuestion(option);
                      }
                    }}
                  >
                    <p className="flex w-full items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <div
                          className={cn(
                            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors",
                            shouldShowAsCorrect ||
                              (shouldHighlightCorrect &&
                                "border-green-500 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"),
                            shouldShowAsIncorrect &&
                              "border-red-500 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
                          )}
                        >
                          {String.fromCharCode(65 + i)}
                        </div>
                        <span className="flex-1 text-left">{option}</span>
                        {isSelectedOption &&
                          (correctAnswer ? (
                            <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
                          ))}
                        {shouldHighlightCorrect && (
                          <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
                        )}
                      </div>
                    </p>
                  </Button>
                );
              })}
            </div>

            {/* Next Button */}
            {activeQuestion && (
              <div className="flex justify-end pt-4">
                <Button
                  size={"lg"}
                  className="min-w-32 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                  disabled={isPanding}
                  onClick={() => {
                    if (currentIndex < questions.length - 1) {
                      handleNext();
                    } else {
                      handleFinishQuiz();
                    }
                  }}
                >
                  {currentIndex < questions.length - 1 ? (
                    <span className="flex items-center gap-2">
                      {t("actions.nextQuestion")}
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Trophy className="mr-2 h-4 w-4" />
                      {t("actions.finishQuiz")}
                    </span>
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
