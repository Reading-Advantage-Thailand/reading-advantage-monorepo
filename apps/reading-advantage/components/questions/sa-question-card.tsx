"use client";
import React, { use, useContext, useEffect, useState } from "react";
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
import { levelCalculation } from "@/lib/utils";
import { useCurrentLocale } from "@/locales/client";
import { useArticleCompletion } from "@/lib/use-article-completion";

type Props = {
  userId: string;
  articleId: string;
  articleTitle: string;
  articleLevel: number;
  page: "article" | "lesson";
  onCompleteChange?: (complete: boolean) => void;
};

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

export default function SAQuestionCard({
  userId,
  articleId,
  articleTitle,
  articleLevel,
  page,
  onCompleteChange,
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

  const { checkAndNotifyCompletion } = useArticleCompletion();

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

  const handleCompleted = (answerData?: Partial<QuestionResponse>) => {
    // Merge ผลลัพธ์ที่ได้จาก submit โดยตรง ไม่ต้อง re-fetch จาก server
    const updatedData = { ...data, ...answerData, state: QuestionState.COMPLETED };
    setData(updatedData);
    setState(QuestionState.COMPLETED);
    useQuestionStore.setState({ saQuestion: updatedData });
  };

  useEffect(() => {
    if (state === QuestionState.COMPLETED && page === "lesson") {
      onCompleteChange?.(true);
    }
  }, [state, onCompleteChange, page]);

  useEffect(() => {
    if (state === QuestionState.COMPLETED && page === "article") {
      const checkCompletion = async () => {
        try {
          await checkAndNotifyCompletion(userId, articleId);
        } catch (error) {
          console.error("Error checking article completion:", error);
        }
      };

      checkCompletion();
    }
  }, [state, userId, articleId, page, checkAndNotifyCompletion]);

  switch (state) {
    case QuestionState.LOADING:
      return <QuestionCardLoading page={page} />;
    case QuestionState.INCOMPLETE:
      return (
        <QuestionCardIncomplete
          userId={userId}
          resp={data}
          articleId={articleId}
          handleCompleted={handleCompleted}
          articleTitle={articleTitle}
          articleLevel={articleLevel}
          page={page}
        />
      );
    case QuestionState.COMPLETED:
      return <QuestionCardComplete resp={data} page={page} />;
    default:
      return <QuestionCardError error="Failed to load question. Please refresh the page." />;
  }
}

function QuestionCardError({ error }: { error?: string }) {
  const t = useScopedI18n("components.saq");
  return (
    <Card className="mt-3">
      <CardHeader>
        <CardTitle className="font-bold text-3xl md:text-3xl text-muted-foreground">
          {t("title")}
        </CardTitle>
        <CardDescription className="text-red-500 dark:text-red-400">
          {t("descriptionFailure", { error: error ?? "" })}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function QuestionCardComplete({
  resp,
  page,
}: {
  resp: QuestionResponse;
  page: "article" | "lesson";
}) {
  const t = useScopedI18n("components.saq");
  const question = resp.result?.question || "";
  const suggestedAnswer = resp.suggested_answer || "";
  const userAnswer = resp.answer || "";

  return (
    <>
      {page === "article" && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="font-bold text-3xl md:text-3xl text-muted-foreground">
              {t("title")}
            </CardTitle>
            <CardDescription>
              {t("descriptionSuccess")}
              {question && (
                <>
                  <p className="font-bold text-lg mt-4">{t("question")}</p>
                  <p>{question}</p>
                </>
              )}
              {suggestedAnswer && (
                <>
                  <p className="font-bold text-lg mt-4">
                    {t("suggestedAnswer")}
                  </p>
                  <p>{suggestedAnswer}</p>
                </>
              )}
              {userAnswer && (
                <>
                  <p className="font-bold text-lg mt-4">{t("yourAnswer")}</p>
                  <p className="text-green-500 dark:text-green-400 inline font-bold mt-2">
                    {userAnswer}
                  </p>
                </>
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {page === "lesson" && (
        <div className="flex items-start w-full md:w-[725px] xl:w-[710px] space-x-4 mt-5">
          <div className="space-y-8 w-full">
            <CardTitle className="font-bold text-3xl md:text-3xl text-muted-foreground">
              {t("title")}
            </CardTitle>
            <CardDescription className="text-green-500 dark:text-green-400 inline font-bold mt-2">
              {t("descriptionSuccess")}
            </CardDescription>
            {question && (
              <>
                <p className="font-bold text-lg mt-2">{t("question")}</p>
                <p>{question}</p>
              </>
            )}
            {suggestedAnswer && (
              <>
                <p className="font-bold text-lg mt-2">{t("suggestedAnswer")}</p>
                <p>{suggestedAnswer}</p>
              </>
            )}
            {userAnswer && (
              <>
                <p className="font-bold text-lg mt-2">{t("yourAnswer")}</p>
                <p className="text-green-500 dark:text-green-400 inline font-bold mt-2">
                  {userAnswer}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function QuestionCardLoading({ page }: { page: "article" | "lesson" }) {
  const t = useScopedI18n("components.saq");
  return (
    <>
      {page === "article" && (
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
      )}
      {page === "lesson" && (
        <div className="flex items-start xl:h-[400px] w-full md:w-[725px] xl:w-[710px] space-x-4 mt-5">
          <div className="space-y-8 w-full">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      )}
    </>
  );
}

function QuestionCardIncomplete({
  userId,
  resp,
  articleId,
  handleCompleted,
  articleTitle,
  articleLevel,
  page,
}: {
  userId: string;
  resp: QuestionResponse;
  articleId: string;
  handleCompleted: (answerData?: Partial<QuestionResponse>) => void;
  articleTitle: string;
  articleLevel: number;
  page: "article" | "lesson";
}) {
  const t = useScopedI18n("components.saq");
  return (
    <>
      {page === "article" && (
        <Card id="onborda-saq" className="mt-3">
          <QuestionHeader
            heading={t("title")}
            description={t("description")}
            buttonLabel={t("practiceButton")}
            userId={userId}
            articleId={articleId}
            disabled={false}
            activityType="sa_question"
          >
            <QuizContextProvider>
              <SAQuestion
                resp={resp}
                articleId={articleId}
                handleCompleted={handleCompleted}
                userId={userId}
                articleTitle={articleTitle}
                articleLevel={articleLevel}
                page={page}
              />
            </QuizContextProvider>
          </QuestionHeader>
        </Card>
      )}
      {page === "lesson" && (
        <QuizContextProvider>
          <SAQuestion
            articleId={articleId}
            resp={resp}
            handleCompleted={handleCompleted}
            userId={userId}
            articleTitle={articleTitle}
            articleLevel={articleLevel}
            page="lesson"
          />
        </QuizContextProvider>
      )}
    </>
  );
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

function SAQuestion({
  resp,
  articleId,
  userId,
  handleCompleted,
  articleTitle,
  articleLevel,
  page,
}: {
  resp: QuestionResponse;
  articleId: string;
  userId: string;
  handleCompleted: (answerData?: Partial<QuestionResponse>) => void;
  articleTitle: string;
  articleLevel: number;
  page: "article" | "lesson";
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
  const [wordCount, setWordCount] = React.useState<number>(0);
  const router = useRouter();
  const currentLocale = useCurrentLocale();

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = event.target.value;
    setWordCount(countWords(text));
  };

  async function onSubmitted(data: FormData) {
    setIsLoading(true);
    setPaused(true);

    try {
      const submitResponse = await fetch(
        `/api/v1/articles/${articleId}/questions/sa/${resp.result.id}`,
        {
          method: "POST",
          body: JSON.stringify({
            answer: data.answer,
            timeRecorded: timer,
          }),
        }
      );

      const submitData = await submitResponse.json();
      setData(submitData);
    } catch (error) {
      console.error("Error getting feedback:", error);
      const submitResponse = await fetch(
        `/api/v1/articles/${articleId}/questions/sa/${resp.result.id}`,
        {
          method: "POST",
          body: JSON.stringify({
            answer: data.answer,
            timeRecorded: timer,
          }),
        }
      );

      const submitData = await submitResponse.json();
      setData(submitData);
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
        }
      );

      toast({
        title: tf("toast.success"),
        imgSrc: true,
        description: `Congratulations!, You received ${rating} XP for completing this activity.`,
      });

      // ส่ง submitData ที่มีอยู่แล้วเข้า handleCompleted แทนการ re-fetch
      handleCompleted({
        state: QuestionState.COMPLETED,
        suggested_answer: data.suggested_answer,
        answer: data.answer,
        result: resp.result,
      });
      router.refresh();
    } catch (error) {
      console.error("Error submitting rating:", error);
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
          onChange={(e) => {
            handleTextChange(e);
            register("answer").onChange(e);
          }}
        />
        {page === "lesson" && (
          <p className="text-sm text-gray-500 mt-2 flex items-center justify-end mb-4">
            {t("wordCount", { count: wordCount })}
          </p>
        )}
        {page === "article" && (
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
        )}
        {page === "lesson" && (
          <div className="flex items-center lg:justify-end">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  className="w-full lg:w-1/4"
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
                <DialogContent
                  className="sm:max-w-[425px]"
                  onClick={(e) => e.stopPropagation()}
                >
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
                      <p className="font-bold text-lg mt-4">
                        {t("yourAnswer")}
                      </p>
                      <p className="text-green-500 dark:text-green-400 inline font-bold mt-2">
                        {data.answer}
                      </p>
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex items-center justify-center">
                    <Rating
                      sx={{
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
          </div>
        )}
      </form>
    </CardContent>
  );
}
