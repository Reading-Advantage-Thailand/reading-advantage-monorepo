"use client";

import { usePreviewSave } from "@/components/student/student-view-provider";
import { Article, QuestionResponse, SAQuestion } from "@/types";
import { Clock, Loader2, MessageSquare } from "lucide-react";
import React, { useContext, useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ActivityType, QuestionState } from "@/types/enum";
import { QuizContext, QuizContextProvider } from "@/contexts/question-context";
import TextareaAutosize from "react-textarea-autosize";
import { finishQuiz, getFeedback } from "@/actions/question";
import { Skeleton } from "@reading-advantage/ui";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useTranslations } from "next-intl";
import { useAuth } from "@reading-advantage/auth-client";
import { Panel, Plaque, RpgButton, Sign } from "@/components/rpg/chrome";
import { ART } from "@/lib/rpg/places";

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
  const { user, refresh } = useAuth();
  const { isPreview, notSaved } = usePreviewSave();
  useEffect(() => {
    let isMounted = true;

    const initializeQuestion = async () => {
      // A saved answer comes back first, so a student who returns to this task sees it again.
      try {
        const params = new URLSearchParams({
          articleId: article.id,
          questionType: ActivityType.SA_QUESTION,
        });
        const response = await fetch(
          `/api/articles/questions/${article.id}?${params.toString()}`,
          { cache: "no-store" },
        );
        if (response.ok) {
          const questionResponse = (await response.json()) as QuestionResponse;
          if (
            questionResponse.questionStatus === QuestionState.COMPLETED &&
            questionResponse.result?.completed
          ) {
            if (!isMounted) return;
            setFeedback({ ...questionResponse.result.details });
            setState(QuestionState.COMPLETED);
            setPaused(true);
            return;
          }
        }
      } catch {
        // A failed read shows the empty form, as legacy does.
      }

      if (!isMounted || !article.shortAnswerQuestions?.length) return;
      // The server already picked the student question (the first one, in bank order).
      setQuestions({ ...article.shortAnswerQuestions[0] });
      setState(QuestionState.INCOMPLETE);
    };

    void initializeQuestion();

    return () => {
      isMounted = false;
    };
  }, [article, setPaused]);

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
          const score = (res as { score?: number }).score;
          const data = {
            ...res,
            question: questions.question,
            suggestedAnswer: questions.answer,
            yourAnswer: form.getValues("answer"),
            timer: timer,
            // Evidence keys: the lesson step is teacher-led; the grader scores 1-5.
            questions: [{ questionId: questions.id, questionType: "saq" as const, scoreRatio: typeof score === "number" ? Math.max(0, Math.min(1, score / 5)) : undefined }],
            mode: "teacher_led" as const,
          };

          setFeedback(data);

          if (isPreview) notSaved();
          else await finishQuiz(article.id, data, ActivityType.SA_QUESTION);
        })
        .finally(async () => {
          setState(QuestionState.COMPLETED);
          await refresh();
        });
    });
  };

  if (state === QuestionState.LOADING) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="lf-medal p-2">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <Skeleton className="mb-2 h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>

        <div className="cq-panel p-8">
          <div className="space-y-6">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-32 w-full" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state === QuestionState.COMPLETED) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <Sign>{t("completed.title")}</Sign>
        <Panel>
          {feedback && (
            <>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{t("labels.question")}</h3>
                <p className="leading-relaxed">{feedback?.question}</p>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{t("labels.yourAnswer")}</h3>
                <div className="lf-well border-l-6 border-l-[#2f6b35] p-4">
                  <p className="font-medium">{feedback?.yourAnswer}</p>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{t("labels.suggestedAnswer")}</h3>
                <div className="lf-well border-l-6 border-l-[var(--cq-wood)] p-4">
                  <p>{feedback?.suggestedAnswer}</p>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{t("labels.feedback")}</h3>
                <p>{feedback?.feedback}</p>
              </div>
              <Plaque icon={ART.gem} label={t("labels.score")}>
                {feedback?.score}
              </Plaque>
            </>
          )}
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="cq-panel p-6 sm:p-8">
        <div>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmitted)}
              className="space-y-6"
            >
              {/* Timer Badge */}
              <div className="flex items-center justify-between">
                <span className="lg-chip inline-flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t("timer.elapsed", { time: timer })}
                </span>
              </div>

              {/* Question */}
              <div className="space-y-3">
                <h3 className="text-xl font-semibold">
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
                          className="min-h-[120px] w-full resize-none appearance-none overflow-hidden rounded-xl border-2 border-[var(--cq-parchment-edge)] bg-[#fffaf0] p-4 text-[var(--cq-ink)] transition-all duration-200 placeholder:text-[var(--cq-ink-soft)] focus:border-[var(--cq-gold-dark)] focus:ring-2 focus:ring-[rgba(232,181,52,0.45)] focus:outline-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-between text-sm">
                  <span className="cq-muted">
                    {t("form.help.detailedResponse")}
                  </span>
                  <span className="lf-text-gold font-medium">
                    {/* {t("wordCount", { count: wordCount })} */}
                  </span>
                </div>
              </div>

              <div className="flex justify-end">
                <RpgButton
                  type="submit"
                  tone="gold"
                  className="px-8"
                >
                  {isPanding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("actions.submit")}
                    </>
                  ) : (
                    t("actions.submit")
                  )}
                </RpgButton>
              </div>
            </form>
          </Form>
        </div>
      </div>
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
