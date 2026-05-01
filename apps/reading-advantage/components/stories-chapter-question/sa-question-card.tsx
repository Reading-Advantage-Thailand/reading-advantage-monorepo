"use client";
import React, { useContext, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import TextareaAutosize from "react-textarea-autosize";
import QuestionHeader from "./question-header";
import { QuizContext, QuizContextProvider } from "@/contexts/quiz-context";
import { Skeleton } from "../ui/skeleton";
import { Badge } from "../ui/badge";
import { useScopedI18n } from "@/locales/client";
import { Button } from "../ui/button";
import { ShortAnswerQuestion } from "../models/questions-model";
import { Icons } from "../icons";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import Rating from "@mui/material/Rating";
import { toast } from "../ui/use-toast";
import { useQuestionStore } from "@/store/question-store";
import { useRouter } from "next/navigation";
import {
  ActivityStatus,
  ActivityType,
} from "../models/user-activity-log-model";
import { title } from "process";
import { levelCalculation } from "@/lib/utils";

type Props = {
  userId: string;
  storyId: string;
  chapterNumber: string;
  articleTitle: string;
  articleLevel: number;
};

export type QuestionResponse = {
  result: {
    id: string;
    question: string;
  };
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

export default function StorySAQuestionCard({
  userId,
  storyId,
  chapterNumber,
  articleTitle,
  articleLevel,
}: Props) {
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
    fetch(`/api/v1/stories/${storyId}/${chapterNumber}/question/sa`)
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
  }, [state, storyId]);

  const handleCompleted = () => {
    setState(QuestionState.LOADING);
  };

  switch (state) {
    case QuestionState.LOADING:
      return <QuestionCardLoading />;
    case QuestionState.INCOMPLETE:
      return (
        <QuestionCardIncomplete
          storyId={storyId}
          userId={userId}
          chapterNumber={chapterNumber}
          resp={data}
          articleId={storyId}
          handleCompleted={handleCompleted}
          articleTitle={articleTitle}
          articleLevel={articleLevel}
        />
      );
    case QuestionState.COMPLETED:
      return <QuestionCardComplete resp={data} />;
    default:
      return <QuestionCardError data={data} />;
  }
}

function QuestionCardError(data: any) {
  const t = useScopedI18n("components.saq");
  return (
    <Card className="mt-3">
      <CardHeader>
        <CardTitle className="font-bold text-3xl md:text-3xl text-muted-foreground">
          {t("title")}
        </CardTitle>
        <CardDescription className="text-red-500 dark:text-red-400">
          {t("descriptionFailure", { error: data.error })}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function QuestionCardComplete({ resp }: { resp: QuestionResponse }) {
  const t = useScopedI18n("components.saq");
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="font-bold text-3xl md:text-3xl text-muted-foreground">
          {t("title")}
        </CardTitle>
        <CardDescription>
          {t("descriptionSuccess")}
          <p className="font-bold text-lg mt-4">{t("question")}</p>
          <p>{resp.result.question}</p>
          <p className="font-bold text-lg mt-4">{t("suggestedAnswer")}</p>
          <p>{resp.suggested_answer}</p>
          <p className="font-bold text-lg mt-4">{t("yourAnswer")}</p>
          <p className="text-green-500 dark:text-green-400 inline font-bold mt-2">
            {resp.answer}
          </p>
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function QuestionCardLoading() {
  const t = useScopedI18n("components.saq");
  return (
    <Card className="mt-3">
      <CardHeader>
        <CardTitle className="font-bold text-3xl md:text-3xl text-muted-foreground">
          {t("title")}
        </CardTitle>
        <CardDescription>{t("descriptionLoading")}</CardDescription>
        <Skeleton className={"h-10 w-full mt-2"} />
        <Skeleton className={"h-40 w-full mt-2"} />
        <Skeleton className={"h-8 w-full mt-2"} />
        <Skeleton className={"h-20 w-full mt-2"} />
      </CardHeader>
    </Card>
  );
}

function QuestionCardIncomplete({
  userId,
  resp,
  storyId,
  handleCompleted,
  articleTitle,
  articleLevel,
  chapterNumber,
}: {
  userId: string;
  storyId: string;
  resp: QuestionResponse;
  articleId: string;
  handleCompleted: () => void;
  articleTitle: string;
  articleLevel: number;
  chapterNumber: string;
}) {
  const t = useScopedI18n("components.saq");
  return (
    <Card id="onborda-saq" className="mt-3">
      <QuestionHeader
        heading={t("title")}
        description={t("description")}
        buttonLabel={t("practiceButton")}
        userId={userId}
        storyId={storyId}
        disabled={false}
        activityType="sa_question"
      >
        <QuizContextProvider>
          <SAQuestion
            resp={resp}
            storyId={storyId}
            chapterNumber={chapterNumber}
            handleCompleted={handleCompleted}
            userId={userId}
            articleTitle={articleTitle}
            articleLevel={articleLevel}
          />
        </QuizContextProvider>
      </QuestionHeader>
    </Card>
  );
}

function SAQuestion({
  resp,
  storyId,
  userId,
  handleCompleted,
  articleTitle,
  articleLevel,
  chapterNumber,
}: {
  resp: QuestionResponse;
  storyId: string;
  userId: string;
  handleCompleted: () => void;
  articleTitle: string;
  articleLevel: number;
  chapterNumber: string;
}) {
  const shortAnswerSchema = z.object({
    answer: z
      .string()
      .min(1, {
        message: "Answer is required",
      })
      .max(1000, {
        message: "Answer must be less than 1000 characters",
      }),
  });

  type FormData = z.infer<typeof shortAnswerSchema>;

  const t = useScopedI18n("components.saq");
  const tf = useScopedI18n("components.rate");
  const { timer, setPaused } = useContext(QuizContext);
  const [isCompleted, setIsCompleted] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [rating, setRating] = React.useState<number>(3);
  const [data, setData] = useState<AnswerResponse>({
    state: QuestionState.LOADING,
    answer: "",
    suggested_answer: "",
  });
  const { register, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(shortAnswerSchema),
  });

  const router = useRouter();
  async function onSubmitted(formData: FormData) {
    setIsLoading(true);
    setPaused(true);
    const qId = (resp.result as any).questionId || resp.result.id;
    try {
      const res = await fetch(`/api/v1/stories/${storyId}/${chapterNumber}/question/sa/${qId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: formData.answer, timeRecorded: timer, createActivity: false }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("SA submit failed", { status: res.status, text });
        toast({ title: "An error occurred.", description: "Unable to submit answer." });
        return;
      }

  const responseData = await res.json();
  setData(responseData);
    } catch (err) {
      console.error("Error submitting SA answer:", err);
      toast({ title: "An error occurred.", description: "Unable to submit answer." });
    } finally {
      setIsLoading(false);
      setPaused(false);
    }
  }

  async function onRating() {
    const qId = (resp.result as any).questionId || resp.result.id;
    const xpToAward = 5;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/users/${userId}/activitylog`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: storyId,
          activityType: ActivityType.SA_Question,
          activityStatus: ActivityStatus.Completed,
          timeTaken: timer,
          xpEarned: xpToAward,
          details: {
            // flatten answer fields (remove nested `data` wrapper)
            answer: data?.answer ?? "",
            suggested_answer: data?.suggested_answer ?? "",
            questionId: qId,
            chapter_number: chapterNumber,
            // optional progress omitted if not available
            rate: rating,
            level: articleLevel,
            title: articleTitle,
            cefr_level: levelCalculation(rating).cefrLevel,
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Activity log failed", { status: res.status, text });
        toast({ title: "Error", description: "Unable to save activity." });
        return;
      }

      toast({
        title: tf("toast.success"),
        imgSrc: true,
        description: `Congratulations!, You received ${xpToAward} XP for completing this activity.`,
      });

      handleCompleted();
      router.refresh();
    } catch (err) {
      console.error("Error creating activity log:", err);
      toast({ title: "Error", description: "Unable to save activity." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <CardContent>
      <form onSubmit={handleSubmit(onSubmitted)}>
        <div className="flex gap-2 items-end mt-6">
          <Badge className="flex-1" variant="destructive">
            {t("elapsedTime", {
              time: timer,
            })}
          </Badge>
        </div>
        <CardTitle className="flex font-bold text-3xl md:text-3xl mt-3">
          {t("title")}
        </CardTitle>
        <CardDescription className="text-2xl md:text-2xl mt-3">
          {resp.result.question}
        </CardDescription>
        <TextareaAutosize
          autoFocus
          disabled={isCompleted}
          id="short-answer"
          placeholder="Type your answer here..."
          className="w-full my-3 p-3 rounded-sm resize-none appearance-none overflow-hidden bg-gray-100 dark:bg-gray-900 focus:outline-none"
          {...register("answer")}
        />
        <Dialog>
          <DialogTrigger asChild>
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={isLoading}
            >
              {isLoading && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("submitButton")}
            </Button>
          </DialogTrigger>
          {!isLoading && (
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader className="text-left">
                <DialogTitle className="font-bold text-2xl">
                  {t("scorerate")}
                </DialogTitle>
                <DialogDescription>
                  <p className="font-bold text-lg mt-4">{t("question")}</p>
                  <p>{resp.result.question}</p>
                  <p className="font-bold text-lg mt-4">
                    {t("suggestedAnswer")}
                  </p>
                  <p>{data.suggested_answer}</p>
                  <p className="font-bold text-lg mt-4">{t("yourAnswer")}</p>
                  <p className="text-green-500 dark:text-green-400 inline font-bold mt-2">
                    {data.answer}
                  </p>
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-center">
                <Rating
                  sx={{
                    // change unselected color
                    "& .MuiRating-iconEmpty": {
                      color: "#f6a904",
                    },
                  }}
                  name="simple-controlled"
                  value={rating}
                  onChange={(event, newValue) => {
                    setRating(newValue ? newValue : 0);
                  }}
                  size="large"
                />
              </div>
              <DialogFooter>
                <Button
                  disabled={isLoading}
                  onClick={() => {
                    setIsCompleted(true);
                    onRating();
                  }}
                >
                  {t("rateButton")}
                </Button>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      </form>
    </CardContent>
  );
}
