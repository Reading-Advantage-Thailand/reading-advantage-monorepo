"use client";

import { Article, SAQuestion } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Loader2, MessageSquare, CheckCircle } from "lucide-react";
import React, { useContext, useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ActivityType, QuestionState } from "@/types/enum";
import { QuizContext, QuizContextProvider } from "@/contexts/question-context";
import TextareaAutosize from "react-textarea-autosize";
import { Button } from "@/components/ui/button";
import { finishQuiz, getFeedback } from "@/actions/question";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";

interface SAQFeedback {
  score: number;
  feedback: string;
}

interface LessonSAQProps {
  article: Article;
}

function LessonSAQContent({ article }: { article: Article }) {
  const t = useTranslations("LessonSAQ");
  const [state, setState] = useState(QuestionState.LOADING);
  const { timer, setPaused } = useContext(QuizContext);
  const [isPanding, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<any>(null);
  const [questions, setQuestions] = useState<SAQuestion | null>(null);
  const { data: session, update } = useSession();
  useEffect(() => {
    if (article.shortAnswerQuestions) {
      const randomQuestions = article.shortAnswerQuestions
        .sort(() => Math.random() - 0.5)
        .slice(0, 1);

      setQuestions({ ...randomQuestions[0] });
      setState(QuestionState.INCOMPLETE);
    }
  }, [article]);

  const formSchema = z.object({
    answer: z
      .string()
      .trim()
      .min(1, { message: t("form.validation.answerRequired") }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      answer: "",
    },
  });

  const onSubmitted = (data: z.infer<typeof formSchema>) => {
    setPaused(true);

    if (!questions) return;

    startTransition(async () => {
      await getFeedback({
        data: {
          articleId: article.id,
          question: questions.question,
          suggestedResponse: questions.answer,
          answer: data.answer,
          preferredLanguage: "en",
        },
        activityType: ActivityType.SA_QUESTION,
      })
        .then(async (res) => {
          const data = {
            ...res,
            question: questions.question,
            suggestedAnswer: questions.answer,
            yourAnswer: form.getValues("answer"),
            timer: timer,
          };

          setFeedback(data);

          await finishQuiz(article.id, data, ActivityType.SA_QUESTION);
        })
        .finally(() => {
          setState(QuestionState.COMPLETED);
          update({
            user: {
              ...session?.user,
            },
          });
        });
    });
  };

  if (state === QuestionState.LOADING) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
            <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <Skeleton className="mb-2 h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>

        <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg dark:from-blue-950 dark:to-indigo-950">
          <CardContent className="p-8">
            <div className="space-y-6">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-32 w-full" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === QuestionState.COMPLETED) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-medium text-green-600 dark:text-green-400">
              {t("completed.title")}
            </p>
          </div>
        </div>

        <Card className="border-0 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg dark:from-green-950 dark:to-emerald-950">
          <CardContent className="space-y-6 p-8">
            {feedback && (
              <>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {t("labels.question")}
                  </h3>
                  <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                    {feedback?.question}
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {t("labels.yourAnswer")}
                  </h3>
                  <div className="rounded-lg border-l-4 border-green-500 bg-white p-4 dark:bg-gray-800">
                    <p className="font-medium text-green-700 dark:text-green-300">
                      {feedback?.yourAnswer}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {t("labels.suggestedAnswer")}
                  </h3>
                  <div className="rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4 dark:bg-blue-900">
                    <p className="text-blue-700 dark:text-blue-300">
                      {feedback?.suggestedAnswer}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {t("labels.feedback")}
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    {feedback?.feedback}
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {t("labels.score")}
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    {feedback?.score}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg dark:from-blue-950 dark:to-indigo-950">
        <CardContent className="p-8">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmitted)}
              className="space-y-6"
            >
              {/* Timer Badge */}
              <div className="flex items-center justify-between">
                <Badge
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <Clock className="h-4 w-4" />
                  {t("timer.elapsed", { time: timer })}
                </Badge>
              </div>

              {/* Question */}
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {questions?.question}
                </h3>
              </div>

              {/* Answer Textarea */}
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="answer"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <TextareaAutosize
                          autoFocus
                          id="short-answer"
                          placeholder={t("form.placeholder.answer")}
                          className="min-h-[120px] w-full resize-none appearance-none overflow-hidden rounded-xl border-2 border-gray-200 bg-white p-4 text-gray-900 transition-all duration-200 placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-800"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    {t("form.help.detailedResponse")}
                  </span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {/* {t("wordCount", { count: wordCount })} */}
                  </span>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="lg"
                  className="transform rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:scale-105 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl"
                >
                  {isPanding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("actions.submit")}
                    </>
                  ) : (
                    t("actions.submit")
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LessonSAQ(props: LessonSAQProps) {
  return (
    <QuizContextProvider>
      <LessonSAQContent {...props} />
    </QuizContextProvider>
  );
}
