"use client";

import { QuizContext } from "@/contexts/question-context";
import React, { useContext, useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LAQuestion, LAQFeedback } from "@/types";
import { Button } from "@/components/ui/button";
import TextareaAutosize from "react-textarea-autosize";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ActivityType } from "@/types/enum";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useRouter } from "@/i18n/navigation";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Icons } from "@/components/icons";
import { finishQuiz, getFeedback } from "@/actions/question";
import { useLocale, useTranslations } from "next-intl";
import { convertLocaleFull } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface FeedbackData {
  detailedFeedback: {
    [key: string]: {
      areasForImprovement: string;
      examples: string;
      strengths: string;
      suggestions: string;
    };
  };
  scores: {
    [key: string]: number;
  };
  overallImpression: string;
  exampleRevisions: string;
  nextSteps?: string[];
  answer?: string;
}

export default function LAQuestionContent({
  articleId,
  questions,
}: {
  articleId: string;
  questions: LAQuestion;
}) {
  const { timer, setPaused } = useContext(QuizContext);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const { data: session, update } = useSession();
  const user = useCurrentUser();
  const router = useRouter();
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [isPanding, startTransition] = useTransition();
  const locale = useLocale();
  const t = useTranslations("Question");
  const tc = useTranslations("Components");
  const tfq = useTranslations("Question.LAQuestion.feedbackModal");

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(selectedCategory === category ? "" : category);
  };

  const longAnswerSchema = z.object({
    answer: z
      .string()
      .trim()
      .min((user?.level as number) * 30, {
        message: `Please Enter minimum ${
          (user?.level as number) * 30
        } character...`,
      })
      .max(2000, { message: "Answer must be less than 2000 characters..." }),
    method: z.string(),
  });

  const form = useForm<z.infer<typeof longAnswerSchema>>({
    resolver: zodResolver(longAnswerSchema),
    defaultValues: {
      answer: "",
      method: "feedback",
    },
  });

  const handleSubmit = (value: z.infer<typeof longAnswerSchema>) => {
    startTransition(async () => {
      await getFeedback({
        data: {
          articleId: questions.articleId,
          question: questions.question,
          answer: value.answer,
          preferredLanguage: convertLocaleFull(locale),
        },
        activityType: ActivityType.LA_QUESTION,
      }).then((res) => {
        setFeedback(res as unknown as FeedbackData);
        setOpenModal(true);
      });
    });
  };

  const handleFinishQuiz = async () => {
    setPaused(true);
    const score = Object.values(feedback?.scores ?? {}).reduce(
      (acc, curr) => acc + curr,
      0,
    );
    const data = {
      feedback: JSON.stringify(feedback),
      score,
      question: questions.question,
      yourAnswer: form.getValues("answer"),
      timer: timer,
    };

    startTransition(async () => {
      await finishQuiz(articleId, data, ActivityType.LA_QUESTION).then(
        (res) => {
          if (res.success) {
            toast.success("Quiz finished");
            setOpenModal(false);
            update({
              user: {
                ...session?.user,
              },
            });
            router.refresh();
          } else {
            toast.error(res.error);
          }
        },
      );
    });
  };

  return (
    <CardContent>
      <Form {...form}>
        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <div className="flex items-end gap-2">
            <Badge className="flex-1 justify-start" variant="destructive">
              {tc("timer", { elapsed: timer })}
            </Badge>
          </div>
          <CardTitle className="text-3xl font-bold md:text-3xl">
            {t("LAQuestion.title")}
          </CardTitle>
          <CardDescription className="text-2xl md:text-2xl">
            {questions?.question}
          </CardDescription>
          <FormField
            control={form.control}
            name="answer"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <TextareaAutosize
                    {...field}
                    placeholder="Type your answer here..."
                    className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full resize-none rounded-md border bg-transparent px-3 py-2 shadow-xs transition-[color,box-shadow] outline-none focus:outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex space-x-2">
            <Button
              type="submit"
              disabled={isPanding || form.getValues("method") === "submit"}
              size={"sm"}
            >
              {isPanding && form.getValues("method") === "feedback" && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              {tc("getFeedback")}
            </Button>
            <Button
              type="submit"
              size={"sm"}
              disabled={isPanding || form.getValues("method") === "feedback"}
            >
              {isPanding && form.getValues("method") === "submit" && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              {tc("submitButton")}
            </Button>
          </div>

          <AlertDialog open={openModal} onOpenChange={setOpenModal}>
            <AlertDialogContent className="sm:max-w-[425px]">
              <AlertDialogHeader className="text-left">
                <AlertDialogTitle className="text-2xl font-bold">
                  {form.getValues("method") === "feedback"
                    ? "Feedback and your score"
                    : "Final Feedback and your score"}
                </AlertDialogTitle>
              </AlertDialogHeader>
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  className="rounded-full"
                  size="sm"
                  onClick={() => handleCategoryChange("vocabularyUse")}
                  variant={
                    selectedCategory === "vocabularyUse" ? "default" : "outline"
                  }
                >
                  {tfq("vocabulary")}
                </Button>
                <Button
                  className="rounded-full"
                  size="sm"
                  onClick={() => handleCategoryChange("grammarAccuracy")}
                  variant={
                    selectedCategory === "grammarAccuracy"
                      ? "default"
                      : "outline"
                  }
                >
                  {tfq("grammar")}
                </Button>
                <Button
                  className="rounded-full"
                  size="sm"
                  onClick={() => handleCategoryChange("clarityAndCoherence")}
                  variant={
                    selectedCategory === "clarityAndCoherence"
                      ? "default"
                      : "outline"
                  }
                >
                  {tfq("clarityandcoherence")}
                </Button>
                <Button
                  className="rounded-full"
                  size="sm"
                  onClick={() => handleCategoryChange("complexityAndStructure")}
                  variant={
                    selectedCategory === "complexityAndStructure"
                      ? "default"
                      : "outline"
                  }
                >
                  {tfq("complexityandstructure")}
                </Button>
                <Button
                  className="rounded-full"
                  size="sm"
                  onClick={() => handleCategoryChange("contentAndDevelopment")}
                  variant={
                    selectedCategory === "contentAndDevelopment"
                      ? "default"
                      : "outline"
                  }
                >
                  {tfq("contentanddevelopment")}
                </Button>
              </div>
              {selectedCategory && feedback?.detailedFeedback && (
                <>
                  <div className="text-muted-foreground flex flex-col gap-2 text-sm">
                    <div>
                      <h1 className="text-lg">{tfq("areaforimpovement")}</h1>

                      {
                        feedback?.detailedFeedback[selectedCategory]
                          ?.areasForImprovement
                      }
                    </div>
                    <div>
                      <h1 className="text-lg">{tfq("examples")}</h1>
                      {feedback?.detailedFeedback[selectedCategory]?.examples}
                    </div>
                    <div>
                      <h1 className="text-lg">{tfq("strength")}</h1>

                      {feedback?.detailedFeedback[selectedCategory]?.strengths}
                    </div>
                    <div>
                      <h1 className="text-lg">{tfq("suggestions")}</h1>

                      {
                        feedback?.detailedFeedback[selectedCategory]
                          ?.suggestions
                      }
                    </div>
                    <div>
                      <p className="inline font-bold text-green-500 dark:text-green-400">
                        {tfq("score")} : {feedback?.scores[selectedCategory]}
                      </p>
                    </div>
                  </div>
                </>
              )}
              {!selectedCategory && (
                <div className="flex flex-grow flex-col gap-2 overflow-y-auto pr-4">
                  <p className="text-bold text-xl">{tfq("feedbackoverall")}</p>
                  <p className="text-sm">{feedback?.overallImpression}</p>

                  {form.getValues("method") === "feedback" ? (
                    <>
                      <p className="text-bold text-xl">
                        {tfq("examplerevisions")}
                      </p>
                      <p className="text-sm">{feedback?.exampleRevisions}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-bold text-xl">{tfq("nextStep")}</p>
                      <div className="text-sm">
                        {feedback?.nextSteps?.map((item, index) => (
                          <p key={index}>
                            {index + 1}.{item}
                          </p>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              <AlertDialogFooter className="flex-shrink-0">
                {form.getValues("method") === "feedback" ? (
                  <Button
                    onClick={() => {
                      form.setValue("method", "submit");
                      setOpenModal(false);
                      setSelectedCategory("");
                    }}
                  >
                    {tfq("reviseResponse")}
                  </Button>
                ) : (
                  <Button
                    disabled={isPanding}
                    onClick={() => handleFinishQuiz()}
                  >
                    {tfq("getXP")}
                  </Button>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </form>
      </Form>
    </CardContent>
  );
}
