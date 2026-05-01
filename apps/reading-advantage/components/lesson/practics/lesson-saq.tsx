"use client";

import React, { useContext, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Icons } from "@/components/icons";
import TextareaAutosize from "react-textarea-autosize";
import { Rating } from "@mui/material";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useScopedI18n } from "@/locales/client";
import { QuizContext, QuizContextProvider } from "@/contexts/quiz-context";
import { toast } from "@/components/ui/use-toast";
import { useQuestionStore } from "@/store/question-store";
import { CheckCircle, AlertCircle, Clock, MessageSquare } from "lucide-react";
import { ShortAnswerQuestion } from "@/components/models/questions-model";

interface LessonSAQProps {
  userId: string;
  articleId: string;
  articleTitle: string;
  articleLevel: number;
  onCompleteChange: (complete: boolean) => void;
}

export type QuestionResponse = {
  result: ShortAnswerQuestion;
  suggested_answer: string;
  state: QuestionState;
  answer: string;
};

type AnswerResponse = {
  state: QuestionState;
  answer: string;
  suggested_answer: string;
};

enum QuestionState {
  LOADING = 0,
  INCOMPLETE = 1,
  COMPLETED = 2,
  ERROR = 3,
}

const LessonSAQ: React.FC<LessonSAQProps> = ({
  userId,
  articleId,
  articleTitle,
  articleLevel,
  onCompleteChange,
}) => {
  const [state, setState] = useState(QuestionState.LOADING);
  const [data, setData] = useState<QuestionResponse>({
    result: {
      id: "",
      question: "",
    },
    suggested_answer: "",
    answer: "",
    state: QuestionState.LOADING,
  });

  useEffect(() => {
    fetch(`/api/v1/articles/${articleId}/questions/sa`)
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setState(data.state);
        useQuestionStore.setState({ saQuestion: data });
      })
      .catch((error) => {
        console.error("error: ", error);
        setState(QuestionState.ERROR);
      });
  }, [articleId]);

  const handleCompleted = () => {
    fetch(`/api/v1/articles/${articleId}/questions/sa`)
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setState(data.state);
        useQuestionStore.setState({ saQuestion: data });
      })
      .catch((error) => {
        console.error("error: ", error);
        setState(QuestionState.ERROR);
      });
  };

  useEffect(() => {
    if (state === QuestionState.COMPLETED) {
      onCompleteChange(true);
    }
  }, [state, onCompleteChange]);

  switch (state) {
    case QuestionState.LOADING:
      return <LessonSAQLoading />;
    case QuestionState.INCOMPLETE:
      return (
        <QuizContextProvider>
          <LessonSAQForm
            userId={userId}
            resp={data}
            articleId={articleId}
            handleCompleted={handleCompleted}
            articleTitle={articleTitle}
            articleLevel={articleLevel}
          />
        </QuizContextProvider>
      );
    case QuestionState.COMPLETED:
      return <LessonSAQComplete resp={data} />;
    default:
      return <LessonSAQError />;
  }
};

function LessonSAQLoading() {
  const t = useScopedI18n("pages.student.lessonPage");

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
          <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
        <CardContent className="p-8">
          <div className="space-y-6">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-32 w-full" />
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LessonSAQError() {
  const t = useScopedI18n("pages.student.lessonPage");

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
            {t("title")}
          </h3>
          <p className="text-red-600 dark:text-red-400">
            {t("descriptionFailure", { error: "Failed to load question" })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function LessonSAQComplete({ resp }: { resp: QuestionResponse }) {
  const t = useScopedI18n("pages.student.lessonPage");
  const question = resp.result?.question || "";
  const suggestedAnswer = resp.suggested_answer || "";
  const userAnswer = resp.answer || "";

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <p className="text-green-600 dark:text-green-400 font-medium">
            {t("descriptionSuccess")}
          </p>
        </div>
      </div>

      <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
        <CardContent className="p-8 space-y-6">
          {question && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t("question")}
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {question}
              </p>
            </div>
          )}

          {userAnswer && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t("yourAnswer")}
              </h3>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border-l-4 border-green-500">
                <p className="text-green-700 dark:text-green-300 font-medium">
                  {userAnswer}
                </p>
              </div>
            </div>
          )}

          {suggestedAnswer && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t("suggestedAnswer")}
              </h3>
              <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-blue-700 dark:text-blue-300">
                  {suggestedAnswer}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

function LessonSAQForm({
  resp,
  articleId,
  userId,
  handleCompleted,
  articleTitle,
  articleLevel,
}: {
  resp: QuestionResponse;
  articleId: string;
  userId: string;
  handleCompleted: () => void;
  articleTitle: string;
  articleLevel: number;
}) {
  const t = useScopedI18n("pages.student.lessonPage");
  const tf = useScopedI18n("components.rate");

  const shortAnswerSchema = z.object({
    answer: z
      .string()
      .min(1, {
        message: t("answerRequired"),
      })
      .max(1000, {
        message: t("answerTooLong"),
      }),
  });

  type FormData = z.infer<typeof shortAnswerSchema>;
  const { timer, setPaused } = useContext(QuizContext);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [rating, setRating] = useState<number>(3);
  const [data, setData] = useState<AnswerResponse>({
    state: QuestionState.LOADING,
    answer: "",
    suggested_answer: "",
  });
  const { register, handleSubmit, watch } = useForm<FormData>({
    resolver: zodResolver(shortAnswerSchema),
  });
  const [wordCount, setWordCount] = useState<number>(0);
  const router = useRouter();

  const watchedAnswer = watch("answer", "");

  useEffect(() => {
    setWordCount(countWords(watchedAnswer));
  }, [watchedAnswer]);

  async function onSubmitted(formData: FormData) {
    setIsLoading(true);
    setPaused(true);

    try {
      const submitResponse = await fetch(
        `/api/v1/articles/${articleId}/questions/sa/${resp.result.id}`,
        {
          method: "POST",
          body: JSON.stringify({
            answer: formData.answer,
            timeRecorded: timer,
          }),
        },
      );

      const submitData = await submitResponse.json();
      setData(submitData);
    } catch (error) {
      console.error("Error getting feedback:", error);
      // Retry logic
      try {
        const submitResponse = await fetch(
          `/api/v1/articles/${articleId}/questions/sa/${resp.result.id}`,
          {
            method: "POST",
            body: JSON.stringify({
              answer: formData.answer,
              timeRecorded: timer,
            }),
          },
        );

        const submitData = await submitResponse.json();
        setData(submitData);
      } catch (retryError) {
        console.error("Retry failed:", retryError);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function onRating() {
    setIsLoading(true);

    try {
      await fetch(
        `/api/v1/articles/${articleId}/questions/sa/${resp.result.id}/rate`,
        {
          method: "POST",
          body: JSON.stringify({
            rating,
          }),
        },
      );

      toast({
        title: tf("toast.success"),
        description: t("congratulationsXpEarned", { rating }),
      });

      handleCompleted();
      router.refresh();
    } catch (error) {
      console.error("Error submitting rating:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
        <CardContent className="p-8">
          <form onSubmit={handleSubmit(onSubmitted)} className="space-y-6">
            {/* Timer Badge */}
            <div className="flex items-center justify-between">
              <Badge variant="destructive" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t("elapsedTime", { time: timer })}
              </Badge>
            </div>

            {/* Question */}
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {resp.result.question}
              </h3>
            </div>

            {/* Answer Textarea */}
            <div className="space-y-2">
              <TextareaAutosize
                autoFocus
                disabled={isCompleted}
                id="short-answer"
                placeholder={t("answerPlaceholder")}
                className="w-full p-4 rounded-xl resize-none appearance-none overflow-hidden 
                         bg-white dark:bg-gray-800 
                         border-2 border-gray-200 dark:border-gray-700
                         focus:border-blue-500 dark:focus:border-blue-400
                         focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800
                         text-gray-900 dark:text-gray-100
                         placeholder:text-gray-500 dark:placeholder:text-gray-400
                         transition-all duration-200
                         min-h-[120px]"
                {...register("answer")}
              />

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  {t("answerDescription")}
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  {t("wordCount", { count: wordCount })}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    type="submit"
                    size="lg"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 
                             text-white font-medium px-8 py-3 rounded-xl
                             transform transition-all duration-200 hover:scale-105
                             shadow-lg hover:shadow-xl"
                    disabled={isLoading || !watchedAnswer.trim()}
                  >
                    {isLoading && (
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {t("submitButton")}
                  </Button>
                </DialogTrigger>

                {!isLoading && data.suggested_answer && (
                  <DialogContent
                    className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DialogHeader className="text-left space-y-4">
                      <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {t("scorerate")}
                      </DialogTitle>
                      <DialogDescription className="space-y-6" asChild>
                        <div className="space-y-6 text-sm text-muted-foreground">
                          <div className="space-y-3">
                            <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                              {t("question")}
                            </h4>
                            <p className="text-gray-700 dark:text-gray-300">
                              {resp.result.question}
                            </p>
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                              {t("yourAnswer")}
                            </h4>
                            <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg border-l-4 border-green-500">
                              <p className="text-green-700 dark:text-green-300 font-medium">
                                {data.answer}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                              {t("suggestedAnswer")}
                            </h4>
                            <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg border-l-4 border-blue-500">
                              <p className="text-blue-700 dark:text-blue-300">
                                {data.suggested_answer}
                              </p>
                            </div>
                          </div>
                        </div>
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {t("rateLearningExperience")}
                        </p>
                        <Rating
                          sx={{
                            "& .MuiRating-iconEmpty": {
                              color: "#f6a904",
                            },
                          }}
                          name="simple-controlled"
                          value={rating}
                          onChange={(event, newValue) => {
                            setRating(newValue || 0);
                          }}
                          size="large"
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        disabled={isLoading}
                        onClick={() => {
                          setIsCompleted(true);
                          onRating();
                        }}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 
                                 text-white font-medium px-6 py-2 rounded-lg
                                 transform transition-all duration-200 hover:scale-105"
                      >
                        {isLoading && (
                          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {t("rateButton")}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                )}
              </Dialog>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default LessonSAQ;
