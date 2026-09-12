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
import {
  QuestionState,
  ShortAnswerQuestion,
} from "../models/questions-model";
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
  variant?: "article" | "story";
  chapterNumber?: string;
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

export default function SAQuestionCard({
  userId,
  articleId,
  articleTitle,
  articleLevel,
  page,
  onCompleteChange,
  variant = "article",
  chapterNumber,
}: Props) {
  const isStory = variant === "story";
  const endpointBase = isStory
    ? `/api/v1/stories/${articleId}/${chapterNumber}/question`
    : `/api/v1/articles/${articleId}/questions`;
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
    fetch(`${endpointBase}/sa`)
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
    // Story cards refetch after completion to load the saved answer; article
    // cards resolve completion locally and must not fetch in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, isStory ? [state, endpointBase] : [endpointBase]);

  const handleCompleted = (answerData?: Partial<QuestionResponse>) => {
    if (isStory) {
      // Refetch from the server so the completed card shows the saved answer.
      setState(QuestionState.LOADING);
      return;
    }

    // Merge the submitted result directly instead of re-fetching.
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
    if (state === QuestionState.COMPLETED && page === "article" && !isStory) {
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

  const layoutPage = isStory ? ("article" as const) : page;

  switch (state) {
    case QuestionState.LOADING:
      return <QuestionCardLoading page={layoutPage} />;
    case QuestionState.INCOMPLETE:
      return (
        <QuestionCardIncomplete
          userId={userId}
          resp={data}
          articleId={articleId}
          chapterNumber={chapterNumber}
          handleCompleted={handleCompleted}
          articleTitle={articleTitle}
          articleLevel={articleLevel}
          page={layoutPage}
          isStory={isStory}
          endpointBase={endpointBase}
        />
      );
    case QuestionState.COMPLETED:
      return <QuestionCardComplete resp={data} page={layoutPage} />;
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
  chapterNumber,
  handleCompleted,
  articleTitle,
  articleLevel,
  page,
  isStory,
  endpointBase,
}: {
  userId: string;
  resp: QuestionResponse;
  articleId: string;
  chapterNumber?: string;
  handleCompleted: (answerData?: Partial<QuestionResponse>) => void;
  articleTitle: string;
  articleLevel: number;
  page: "article" | "lesson";
  isStory: boolean;
  endpointBase: string;
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
                chapterNumber={chapterNumber}
                handleCompleted={handleCompleted}
                userId={userId}
                articleTitle={articleTitle}
                articleLevel={articleLevel}
                page={page}
                isStory={isStory}
                endpointBase={endpointBase}
              />
            </QuizContextProvider>
          </QuestionHeader>
        </Card>
      )}
      {page === "lesson" && (
        <QuizContextProvider>
          <SAQuestion
            articleId={articleId}
            chapterNumber={chapterNumber}
            resp={resp}
            handleCompleted={handleCompleted}
            userId={userId}
            articleTitle={articleTitle}
            articleLevel={articleLevel}
            page="lesson"
            isStory={isStory}
            endpointBase={endpointBase}
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
  chapterNumber,
  userId,
  handleCompleted,
  articleTitle,
  articleLevel,
  page,
  isStory,
  endpointBase,
}: {
  resp: QuestionResponse;
  articleId: string;
  chapterNumber?: string;
  userId: string;
  handleCompleted: (answerData?: Partial<QuestionResponse>) => void;
  articleTitle: string;
  articleLevel: number;
  page: "article" | "lesson";
  isStory: boolean;
  endpointBase: string;
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

  const questionId = isStory
    ? (resp.result as { questionId?: string }).questionId || resp.result.id
    : resp.result.id;

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = event.target.value;
    setWordCount(countWords(text));
  };

  async function onSubmitted(formData: FormData) {
    setIsLoading(true);
    setPaused(true);

    if (isStory) {
      try {
        const res = await fetch(`${endpointBase}/sa/${questionId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answer: formData.answer,
            timeRecorded: timer,
            createActivity: false,
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("SA submit failed", { status: res.status, text });
          toast({
            title: "An error occurred.",
            description: "Unable to submit answer.",
          });
          return;
        }

        const responseData = await res.json();
        setData(responseData);
      } catch (err) {
        console.error("Error submitting SA answer:", err);
        toast({
          title: "An error occurred.",
          description: "Unable to submit answer.",
        });
      } finally {
        setIsLoading(false);
        setPaused(false);
      }
      return;
    }

    try {
      const submitResponse = await fetch(
        `${endpointBase}/sa/${questionId}`,
        {
          method: "POST",
          body: JSON.stringify({
            answer: formData.answer,
            timeRecorded: timer,
          }),
        }
      );

      const submitData = await submitResponse.json();
      setData(submitData);
    } catch (error) {
      console.error("Error getting feedback:", error);
      const submitResponse = await fetch(
        `${endpointBase}/sa/${questionId}`,
        {
          method: "POST",
          body: JSON.stringify({
            answer: formData.answer,
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

    if (isStory) {
      const xpToAward = 5;
      try {
        const res = await fetch(`/api/v1/users/${userId}/activitylog`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            articleId,
            activityType: ActivityType.SA_Question,
            activityStatus: ActivityStatus.Completed,
            timeTaken: timer,
            xpEarned: xpToAward,
            details: {
              answer: data?.answer ?? "",
              suggested_answer: data?.suggested_answer ?? "",
              questionId,
              chapter_number: chapterNumber,
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
      return;
    }

    try {
      await fetch(`${endpointBase}/sa/${questionId}/rate`, {
        method: "POST",
        body: JSON.stringify({
          rating,
        }),
      });

      toast({
        title: tf("toast.success"),
        imgSrc: true,
        description: `Congratulations!, You received ${rating} XP for completing this activity.`,
      });

      // Send the submitted result into handleCompleted instead of re-fetching.
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
          </div>
        )}
      </form>
    </CardContent>
  );
}
