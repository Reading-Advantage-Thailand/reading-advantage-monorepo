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
import { SAQuestion } from "@/types";
import { Button } from "@/components/ui/button";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { ActivityType } from "@/types/enum";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Icons } from "@/components/icons";
import { finishQuiz, getFeedback } from "@/actions/question";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "next-auth/react";

interface SAQFeedback {
  score: number;
  feedback: string;
}

export default function SAQuestionContent({
  articleId,
  questions,
}: {
  articleId: string;
  questions: SAQuestion;
}) {
  const { timer, setPaused } = useContext(QuizContext);
  const [feedback, setFeedback] = useState<SAQFeedback | null>(null);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isPanding, startTransition] = useTransition();
  const t = useTranslations("Question");
  const tc = useTranslations("Components");
  const router = useRouter();
  const { data: session, update } = useSession();

  const formSchema = z.object({
    answer: z
      .string()
      .trim()
      .min(1, { message: t("SAQuestion.anwserError") }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      answer: "",
    },
  });

  const handleGetFeedback = async (value: z.infer<typeof formSchema>) => {
    setPaused(true);
    startTransition(async () => {
      await getFeedback({
        data: {
          articleId: questions.articleId,
          question: questions.question,
          suggestedResponse: questions.answer,
          answer: value.answer,
          preferredLanguage: "en",
        },
        activityType: ActivityType.SA_QUESTION,
      }).then((res) => {
        setFeedback(res as SAQFeedback);
        setIsOpenModal(true);
      });
    });
  };

  const handleFinishQuiz = async () => {
    setPaused(true);
    const data = {
      ...feedback,
      question: questions.question,
      suggestedAnswer: questions.answer,
      yourAnswer: form.getValues("answer"),
      timer: timer,
    };
    startTransition(async () => {
      await finishQuiz(articleId, data, ActivityType.SA_QUESTION).then(
        (res) => {
          if (res.success) {
            toast.success(t("descriptionSuccess"), {
              richColors: true,
            });
            setIsOpenModal(false);
            update({
              user: {
                ...session?.user,
              },
            });
            router.refresh();
          } else {
            toast.error(res.error, { richColors: true });
          }
        },
      );
    });
  };

  return (
    <CardContent>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleGetFeedback)}
          className="flex flex-col gap-4"
        >
          <div className="flex items-end gap-2">
            <Badge className="flex-1 justify-start" variant="destructive">
              {tc("timer", { elapsed: timer })}
            </Badge>
          </div>
          <CardTitle className="text-3xl font-bold md:text-2xl">
            {t("SAQuestion.title")}
          </CardTitle>
          <CardDescription className="md:text-1xl text-2xl">
            {questions?.question}
          </CardDescription>
          <FormField
            control={form.control}
            name="answer"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div>
            <Button
              type="submit"
              disabled={isPanding}
              variant={"outline"}
              size={"sm"}
            >
              {isPanding && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              {tc("submitButton")}
            </Button>
          </div>
          <AlertDialog open={isOpenModal} onOpenChange={setIsOpenModal}>
            <AlertDialogContent className="sm:max-w-[425px]">
              <AlertDialogHeader className="text-left">
                <AlertDialogTitle className="text-2xl font-bold">
                  {t("SAQuestion.feedbackAndYourScore")}
                </AlertDialogTitle>
                <div className="flex flex-col gap-2">
                  <p className="text-muted-foreground mt-4 text-lg font-bold">
                    {t("SAQuestion.question")}
                  </p>
                  <p className="text-muted-foreground">{questions.question}</p>
                  <p className="text-muted-foreground mt-4 text-lg font-bold">
                    {t("SAQuestion.suggestedAnswer")}
                  </p>
                  <p className="text-muted-foreground">{questions.answer}</p>
                  <p className="text-muted-foreground mt-4 text-lg font-bold">
                    {t("SAQuestion.feedback")}
                  </p>
                  <p className="text-muted-foreground">{feedback?.feedback}</p>
                  <p className="text-muted-foreground mt-4 text-lg font-bold">
                    {t("SAQuestion.yourAnswer")}
                  </p>
                  <p className="mt-2 inline font-bold text-green-500 dark:text-green-400">
                    {form.getValues("answer")}
                  </p>
                </div>
              </AlertDialogHeader>
              <div className="flex items-center">
                <p className="mt-4 text-lg font-bold">
                  {t("SAQuestion.score", { score: feedback?.score ?? 0 })}
                </p>
              </div>
              <AlertDialogFooter>
                <Button onClick={handleFinishQuiz}>{tc("closeButton")}</Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </form>
      </Form>
    </CardContent>
  );
}
