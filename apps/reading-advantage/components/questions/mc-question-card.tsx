"use client";
import React, { useContext, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import QuestionHeader from "./question-header";
import { QuizContext, QuizContextProvider } from "@/contexts/quiz-context";
import { Skeleton } from "../ui/skeleton";
import { Badge } from "../ui/badge";
import { useScopedI18n } from "@/locales/client";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import {
  AnswerStatus,
  MultipleChoiceQuestion,
  QuestionState,
} from "../models/questions-model";
import { Icons } from "../icons";
import { useQuestionStore } from "@/store/question-store";
import { toast } from "../ui/use-toast";
import { useArticleCompletion } from "@/lib/use-article-completion";
import { useStoryCompletion } from "@/lib/use-story-completion";
import { useQuizProgress } from "@/lib/use-quiz-progress";

type Props = {
  userId: string;
  articleId: string;
  articleTitle: string;
  articleLevel: number;
  page?: "lesson" | "article";
  onCompleteChange?: (complete: boolean) => void;
  variant?: "article" | "story";
  chapterNumber?: string;
};

export type QuestionResponse = {
  results: MultipleChoiceQuestion[];
  progress: AnswerStatus[];
  total: number;
  state: QuestionState;
};

type StoryQuestionResult = MultipleChoiceQuestion & {
  question_number: number;
  chapter_number: string;
};

type StoryQuestionResponse = Omit<QuestionResponse, "results"> & {
  results: StoryQuestionResult[];
};

const UNANSWERED_PROGRESS: AnswerStatus[] = [
  AnswerStatus.UNANSWERED,
  AnswerStatus.UNANSWERED,
  AnswerStatus.UNANSWERED,
  AnswerStatus.UNANSWERED,
  AnswerStatus.UNANSWERED,
];

export default function MCQuestionCard({
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
  const storageKey = isStory ? `${articleId}_${chapterNumber}` : articleId;
  const endpointBase = isStory
    ? `/api/v1/stories/${articleId}/${chapterNumber}/question`
    : `/api/v1/articles/${articleId}/questions`;
  const [state, setState] = useState(QuestionState.LOADING);
  const [data, setData] = useState<QuestionResponse>({
    results: [],
    progress: [],
    total: 0,
    state: QuestionState.LOADING,
  });

  const { hasStarted, markStarted, clear, saveProgress, loadProgress } =
    useQuizProgress(storageKey);
  const { checkAndNotifyCompletion: checkArticleCompletion } =
    useArticleCompletion();
  const { checkAndNotifyCompletion: checkStoryCompletion } =
    useStoryCompletion();

  // Listen to global store changes to sync between lesson and article
  useEffect(() => {
    const unsubscribe = useQuestionStore.subscribe((state) => {
      const { mcQuestion } = state;
      if (mcQuestion.state === QuestionState.COMPLETED) {
        setState(QuestionState.COMPLETED);
        setData(mcQuestion);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const timestamp = new Date().getTime();
    fetch(`${endpointBase}/mcq?_t=${timestamp}`)
      .then((res) => res.json())
      .then((data) => {
        // Server state is the source of truth; drop any cached progress.
        clear();

        setData(data);
        setState(data.state);
        useQuestionStore.setState({ mcQuestion: data });

        // If the quiz is completed server-side, make sure to update local state
        if (data.state === QuestionState.COMPLETED) {
          markStarted();
        }
      })
      .catch((error) => {
        console.error("Error fetching MCQ:", error);
        setState(isStory ? QuestionState.LOADING : QuestionState.ERROR);
      });
  }, [endpointBase]);

  const handleCompleted = (
    currentProgress?: AnswerStatus[],
    newResp?: QuestionResponse
  ) => {
    const progressToCheck = currentProgress || data.progress || [];
    const completedAnswers = progressToCheck.filter(
      (p) => p === AnswerStatus.CORRECT || p === AnswerStatus.INCORRECT
    ).length;

    if (currentProgress) {
      const updatedData = { ...data, progress: currentProgress };
      if (newResp) {
        updatedData.results = newResp.results;
        updatedData.total = newResp.total;
        updatedData.state =
          newResp.state ||
          (completedAnswers >= 5
            ? QuestionState.COMPLETED
            : QuestionState.INCOMPLETE);
      }
      setData(updatedData);

      // Update global store with the updated data
      useQuestionStore.setState({ mcQuestion: updatedData });

      if (completedAnswers >= 5) {
        setState(QuestionState.COMPLETED);
        clear();
      } else {
        setState(QuestionState.INCOMPLETE);
      }
    } else if (completedAnswers >= 5) {
      setState(QuestionState.COMPLETED);
      clear();
    } else {
      setState(isStory ? QuestionState.LOADING : QuestionState.INCOMPLETE);
    }

    markStarted();
  };

  const onRetake = () => {
    setState(QuestionState.LOADING);

    clear();

    fetch(`${endpointBase}/mcq`, {
      method: "DELETE",
    })
      .then((res) => res.json())
      .then(() => {
        const timestamp = new Date().getTime();
        return fetch(`${endpointBase}/mcq?_t=${timestamp}`).then((res) =>
          res.json()
        );
      })
      .then((data) => {
        const newData = {
          progress: [...UNANSWERED_PROGRESS],
          results: data.results || [],
          total: data.total || 5,
          state: QuestionState.INCOMPLETE,
        };

        setData(newData);
        useQuestionStore.setState({
          mcQuestion: { ...data, state: QuestionState.INCOMPLETE },
        });

        setState(QuestionState.INCOMPLETE);
      })
      .catch((error) => {
        console.error("Error during retake:", error);
        setState(QuestionState.INCOMPLETE);
      });
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
          await checkArticleCompletion(userId, articleId);
        } catch (error) {
          console.error("Error checking article completion:", error);
        }
      };

      checkCompletion();
    }
  }, [state, userId, articleId, page, checkArticleCompletion]);

  useEffect(() => {
    if (state === QuestionState.COMPLETED && isStory) {
      const checkCompletion = async () => {
        try {
          await checkStoryCompletion(userId, articleId, chapterNumber ?? "");
        } catch (error) {
          console.error("Error checking story completion:", error);
        }
      };

      checkCompletion();
    }
  }, [state, isStory, userId, articleId, chapterNumber, checkStoryCompletion]);

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
          page={page}
          layoutPage={layoutPage}
          isStory={isStory}
          hasStarted={hasStarted}
          endpointBase={endpointBase}
          saveProgress={saveProgress}
          loadProgress={loadProgress}
          markStarted={markStarted}
          clear={clear}
        />
      );
    case QuestionState.COMPLETED:
      return (
        <QuestionCardComplete resp={data} onRetake={onRetake} page={layoutPage} />
      );
    case QuestionState.ERROR:
      return <QuestionCardError page={layoutPage} />;
    default:
      return <QuestionCardLoading page={layoutPage} />;
  }
}

function QuestionCardComplete({
  resp,
  page,
  onRetake,
}: {
  resp: QuestionResponse;
  onRetake: () => void;
  page?: "lesson" | "article";
}) {
  const t = useScopedI18n("components.mcq");
  return (
    <>
      {page === "article" && (
        <Card>
          <CardHeader>
            <CardTitle className="font-bold text-3xl md:text-3xl text-muted-foreground">
              {t("title")}
            </CardTitle>
            <CardDescription>
              {t("descriptionSuccess")}{" "}
              <p className="text-green-500 dark:text-green-400 inline font-bold">
                {t("descriptionSuccess2", {
                  score: (resp.progress || []).filter(
                    (status) => status === AnswerStatus.CORRECT
                  ).length,
                  total: resp.total,
                })}
              </p>
            </CardDescription>
            <Button size={"sm"} variant={"outline"} onClick={onRetake}>
              {t("retakeButton")}
            </Button>
          </CardHeader>
        </Card>
      )}

      {page === "lesson" && (
        <>
          <div className="flex flex-col gap-6 xl:h-[350px] h-full w-full md:w-[725px] xl:w-[710px] mt-4 items-center justify-center">
            {t("descriptionSuccess")}
            <p className="text-green-500 dark:text-green-400 inline font-bold">
              {t("descriptionSuccess2", {
                score: (resp.progress || []).filter(
                  (status) => status === AnswerStatus.CORRECT
                ).length,
                total: resp.total,
              })}
            </p>
          </div>
          <div className="flex items-center justify-end mt-6">
            <Button
              className="w-full lg:w-1/4"
              size={"sm"}
              variant={"outline"}
              onClick={onRetake}
            >
              {t("retakeButton")}
            </Button>
          </div>
        </>
      )}
    </>
  );
}

function QuestionCardError({ page }: { page?: "lesson" | "article" }) {
  const t = useScopedI18n("components.mcq");
  return (
    <>
      {page === "article" && (
        <Card>
          <CardHeader>
            <CardTitle className="font-bold text-3xl md:text-3xl text-muted-foreground">
              {t("title")}
            </CardTitle>
            <CardDescription className="text-red-500 dark:text-red-400">
              {t("descriptionFailure")}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
      {page === "lesson" && (
        <div className="flex items-start xl:h-[400px] w-full md:w-[725px] xl:w-[710px] space-x-4 mt-5">
          <div className="space-y-4 w-full">
            <p className="font-bold text-3xl text-muted-foreground">{t("title")}</p>
            <p className="text-red-500 dark:text-red-400">{t("descriptionFailure")}</p>
          </div>
        </div>
      )}
    </>
  );
}

function QuestionCardLoading({ page }: { page?: "lesson" | "article" }) {
  const t = useScopedI18n("components.mcq");
  return (
    <>
      {page === "article" && (
        <Card>
          <CardHeader>
            <CardTitle className="font-bold text-3xl md:text-3xl text-muted-foreground">
              {t("title")}
            </CardTitle>
            <CardDescription>{t("descriptionLoading")}</CardDescription>
            <Skeleton className="h-8 w-full mt-2" />
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
  layoutPage,
  isStory,
  hasStarted,
  endpointBase,
  saveProgress,
  loadProgress,
  markStarted,
  clear,
}: {
  userId: string;
  resp: QuestionResponse;
  articleId: string;
  chapterNumber?: string;
  handleCompleted: (
    currentProgress?: AnswerStatus[],
    newResp?: QuestionResponse
  ) => void;
  articleTitle: string;
  articleLevel: number;
  page?: "lesson" | "article";
  layoutPage?: "lesson" | "article";
  isStory: boolean;
  hasStarted: boolean;
  endpointBase: string;
  saveProgress: (progress: unknown) => void;
  loadProgress: () => unknown | null;
  markStarted: () => void;
  clear: () => void;
}) {
  const t = useScopedI18n("components.mcq");

  const hasAnswered =
    resp.progress &&
    resp.progress.length === 5 &&
    resp.progress.some(
      (status) =>
        status === AnswerStatus.CORRECT || status === AnswerStatus.INCORRECT
    );
  const hasStartedQuiz = Boolean(hasAnswered || hasStarted);

  const storyQuestion = (
    <QuizContextProvider>
      <StoryMCQeustion
        articleId={articleId}
        chapterNumber={chapterNumber ?? ""}
        resp={resp as StoryQuestionResponse}
        handleCompleted={handleCompleted}
        userId={userId}
        articleTitle={articleTitle}
        articleLevel={articleLevel}
        endpointBase={endpointBase}
        saveProgress={saveProgress}
        markStarted={markStarted}
      />
    </QuizContextProvider>
  );

  return (
    <>
      {layoutPage === "article" && !hasStartedQuiz && (
        <Card id="onborda-mcq">
          <QuestionHeader
            heading={t("title")}
            description={t("description")}
            buttonLabel={t("startButton")}
            userId={userId}
            articleId={articleId}
            disabled={false}
            activityType="mc_question"
          >
            {isStory ? (
              storyQuestion
            ) : (
              <QuizContextProvider>
                <MCQeustion
                  articleId={articleId}
                  resp={resp}
                  handleCompleted={handleCompleted}
                  userId={userId}
                  articleTitle={articleTitle}
                  articleLevel={articleLevel}
                  page={page}
                  saveProgress={saveProgress}
                  loadProgress={loadProgress}
                  markStarted={markStarted}
                  clear={clear}
                />
              </QuizContextProvider>
            )}
          </QuestionHeader>
        </Card>
      )}

      {layoutPage === "article" && hasStartedQuiz && !isStory && (
        <Card id="onborda-mcq">
          <CardHeader>
            <CardTitle className="font-bold text-3xl md:text-3xl text-muted-foreground">
              {t("title")}
            </CardTitle>
          </CardHeader>
          <QuizContextProvider>
            <MCQeustion
              articleId={articleId}
              resp={resp}
              handleCompleted={handleCompleted}
              userId={userId}
              articleTitle={articleTitle}
              articleLevel={articleLevel}
              saveProgress={saveProgress}
              loadProgress={loadProgress}
              markStarted={markStarted}
              clear={clear}
            />
          </QuizContextProvider>
        </Card>
      )}

      {isStory && hasStartedQuiz && (
        <Card id="onborda-mcq">
          <CardHeader>
            <CardTitle className="font-bold text-3xl md:text-3xl text-muted-foreground">
              {t("title")}
            </CardTitle>
          </CardHeader>
          {storyQuestion}
        </Card>
      )}

      {layoutPage === "lesson" && (
        <QuizContextProvider>
          <MCQeustion
            articleId={articleId}
            resp={resp}
            handleCompleted={handleCompleted}
            userId={userId}
            articleTitle={articleTitle}
            articleLevel={articleLevel}
            page="lesson"
            saveProgress={saveProgress}
            loadProgress={loadProgress}
            markStarted={markStarted}
            clear={clear}
          />
        </QuizContextProvider>
      )}
    </>
  );
}

function MCQeustion({
  articleId,
  resp,
  handleCompleted,
  userId,
  articleTitle,
  articleLevel,
  page,
  saveProgress,
  loadProgress,
  markStarted,
  clear,
}: {
  articleId: string;
  resp: QuestionResponse;
  handleCompleted: (
    currentProgress?: AnswerStatus[],
    newResp?: QuestionResponse
  ) => void;
  userId: string;
  articleTitle: string;
  articleLevel: number;
  page?: "lesson" | "article";
  saveProgress: (progress: unknown) => void;
  loadProgress: () => unknown | null;
  markStarted: () => void;
  clear: () => void;
}) {
  const [progress, setProgress] = useState(resp.progress || []);
  const [isLoadingAnswer, setLoadingAnswer] = useState(false);
  const [selectedOption, setSelectedOption] = useState(-1);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const { timer, setPaused } = useContext(QuizContext);
  const t = useScopedI18n("components.mcq");
  const [fullResults, setFullResults] = useState(resp.results || []);
  const [currentResp, setCurrentResp] = useState(resp);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Initialize currentIndex to the first unanswered question when data loads
  useEffect(() => {
    if (progress && progress.length > 0) {
      const firstUnanswered = progress.findIndex(p => p === AnswerStatus.UNANSWERED);
      if (firstUnanswered !== -1) {
        setCurrentIndex(firstUnanswered);
      }
    }
  }, [fullResults, progress]);

  React.useEffect(() => {
    setFullResults(resp.results || []);
    setCurrentResp(resp);

    if (resp.results && resp.results[0]) {
      const options = resp.results[0].options || [];
      if (
        options.some(
          (opt) => !opt || typeof opt !== "string" || opt.trim() === ""
        )
      ) {
        console.warn("Warning: Some options may be empty or invalid:", options);
      }
    }

    // Server state is the source of truth; cached progress only fills in
    // answers given since the last server response.
    const initialProgress = resp.progress || [];
    try {
      const savedProgress = loadProgress();
      if (
        Array.isArray(savedProgress) &&
        savedProgress.length === 5 &&
        savedProgress.every(
          (status) =>
            status === AnswerStatus.CORRECT ||
            status === AnswerStatus.INCORRECT ||
            status === AnswerStatus.UNANSWERED
        )
      ) {
        setProgress(savedProgress);
      } else {
        setProgress(initialProgress);
      }
    } catch (e) {
      console.error("Failed to load progress from sessionStorage:", e);
      setProgress(initialProgress);
    }

    setSelectedOption(-1);
    setCorrectAnswer("");

    if (resp.results && resp.results[0]) {
      if (resp.results[0].question) {
        markStarted();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resp, articleId]);

  const activeQuestion = fullResults[currentIndex];
  const isAnswered = progress[currentIndex] !== AnswerStatus.UNANSWERED;

  const onSubmitted = async (questionId: string, option: string, i: number) => {
    setPaused(true);
    setLoadingAnswer(true);

    if (!option) {
      console.error("Attempted to submit an empty option");
      option = `Option ${i + 1}`;
    }

    const cleanOption = option.replace(/^\d+\.\s*/, "");

    const originalOptions = currentResp.results[0]?.options || [];

    const validOptions = originalOptions.filter(
      (opt) => opt && typeof opt === "string" && opt.trim() !== ""
    );

    setSelectedOption(i);

    fetch(`/api/v1/articles/${articleId}/questions/mcq/${questionId}`, {
      method: "POST",
      body: JSON.stringify({
        selectedAnswer: cleanOption,
        timeRecorded: timer,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          const isCorrect = cleanOption === data.correctAnswer;

          setCorrectAnswer(data.correctAnswer || "");
          setSelectedOption(i);
          const newProgress = [...progress];
          if (currentIndex !== -1) {
            const actuallyCorrect = isCorrect;
            newProgress[currentIndex] = actuallyCorrect
              ? AnswerStatus.CORRECT
              : AnswerStatus.INCORRECT;
            setProgress(newProgress);

            saveProgress(newProgress);
          }
        }
      })
      .catch((error) => {
        console.error("Error submitting answer:", error);
        setSelectedOption(i);
      })
      .finally(() => {
        setLoadingAnswer(false);
      });
  };

  useEffect(() => {
    if (page === "lesson") {
      setPaused(false);
    }

    let completedCount = 0;
    let correctCount = 0;
    (progress || []).forEach((status) => {
      if (
        status === AnswerStatus.CORRECT ||
        status === AnswerStatus.INCORRECT
      ) {
        completedCount++;
      }
      if (status === AnswerStatus.CORRECT) {
        correctCount++;
      }
    });

    if (completedCount === 5) {
      setLoadingAnswer(false);

      const updatedResp = { ...currentResp, progress: progress, state: QuestionState.COMPLETED };
      handleCompleted(progress, updatedResp);

      // Update global state to mark MCQ as completed
      useQuestionStore.setState({
        mcQuestion: { ...updatedResp, state: QuestionState.COMPLETED }
      });

      // The quiz is completed; server state wins over cached progress.
      clear();

      const totalXpEarned = correctCount * 2;
      toast({
        title: "Quiz Completed!",
        imgSrc: true,
        description: `Congratulations! You got ${correctCount} out of 5 questions correct and earned ${totalXpEarned} XP.`,
      });
    }
  }, [progress, page, setPaused, handleCompleted, currentResp, clear]);

  const handleNext = () => {
    setSelectedOption(-1);
    setCorrectAnswer("");
    setPaused(false);

    // Find the next unanswered question to advance the index
    const nextUnanswered = progress.findIndex((p) => p === AnswerStatus.UNANSWERED);
    if (nextUnanswered !== -1) {
      setCurrentIndex(nextUnanswered);
    }
  };

  const effectiveResults = [activeQuestion];

  return (
    <CardContent>
      <div className="flex gap-2 items-end mt-6">
        <Badge className="flex-1" variant="destructive">
          {t("elapsedTime", {
            time: timer,
          })}
        </Badge>
        {(progress || []).map((status, idx) => {
          if (status === AnswerStatus.CORRECT) {
            return (
              <Icons.correctChecked
                key={idx}
                className="text-green-500"
                size={22}
              />
            );
          } else if (status === AnswerStatus.INCORRECT) {
            return (
              <Icons.incorrectChecked
                key={idx}
                className="text-red-500"
                size={22}
              />
            );
          }
          return (
            <Icons.unChecked key={idx} className="text-gray-500" size={22} />
          );
        })}
      </div>
      <CardTitle className="font-bold text-3xl md:text-3xl mt-3">
        {t("questionHeading", {
          number: currentIndex + 1,
          total: currentResp.total,
        })}
      </CardTitle>
      <CardDescription className="text-2xl md:text-2xl mt-3">
        {effectiveResults[0]?.question || "Question not available"}
        <span className="hidden">
          Question ID: {effectiveResults[0]?.id}
        </span>
      </CardDescription>

      {selectedOption >= 0 && (
        <div className="mt-4 space-y-3">
          <div className="p-3 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg">
            <p className="font-bold text-green-800 dark:text-green-200">
              Correct Answer: {correctAnswer}
            </p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
            <p className="font-bold text-blue-800 dark:text-blue-200">
              Your Answer:{" "}
              {(effectiveResults[0]?.options || [])[selectedOption]}
            </p>
          </div>
        </div>
      )}

      {(effectiveResults[0]?.options || [])
        .filter(
          (option) =>
            option && typeof option === "string" && option.trim() !== ""
        )
        .map((option, i) => {
          const optionText = option || "";
          return (
            <Button
              key={`${effectiveResults[0]?.id}-${i}`}
              className={cn(
                "mt-2 h-auto w-full",
                selectedOption === i && "bg-red-500 hover:bg-red-600",
                correctAnswer === optionText &&
                  "bg-green-500 hover:bg-green-600"
              )}
              disabled={isLoadingAnswer || selectedOption !== -1}
              onClick={() => {
                if (selectedOption === -1) {
                  onSubmitted(effectiveResults[0].id, optionText, i);
                }
              }}
            >
              <p className="w-full text-left">
                {i + 1}. {optionText}
              </p>
            </Button>
          );
        })}

      {selectedOption >= 0 && (
        <>
          {page === "article" && (
            <Button
              variant={"outline"}
              size={"sm"}
              className="mt-2"
              onClick={handleNext}
              disabled={isLoadingAnswer}
            >
              {isLoadingAnswer ? (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              ) : progress.filter((p) => p !== AnswerStatus.UNANSWERED).length <
                currentResp.total ? (
                <>{t("nextQuestionButton")}</>
              ) : (
                <>{t("submitButton")}</>
              )}
            </Button>
          )}
          {page === "lesson" && (
            <div className="flex items-center justify-end">
              <Button
                variant={"outline"}
                size={"sm"}
                className="mt-4 w-full lg:w-1/4"
                onClick={handleNext}
                disabled={isLoadingAnswer}
              >
                {isLoadingAnswer ? (
                  <div className="flex items-center">
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                ) : progress.filter((p) => p !== AnswerStatus.UNANSWERED)
                    .length < currentResp.total ? (
                  <>{t("nextQuestionButton")}</>
                ) : (
                  <>{t("submitButton")}</>
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {!page && (
        <Button
          variant={"outline"}
          size={"sm"}
          className="mt-2"
          onClick={handleNext}
          disabled={isLoadingAnswer}
        >
          {isLoadingAnswer ? (
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          ) : progress.filter((p) => p !== AnswerStatus.UNANSWERED).length <
            currentResp.total ? (
            <>{t("nextQuestionButton")}</>
          ) : (
            <>{t("submitButton")}</>
          )}
        </Button>
      )}
    </CardContent>
  );
}

function StoryMCQeustion({
  articleId,
  chapterNumber,
  resp,
  handleCompleted,
  userId,
  articleTitle,
  articleLevel,
  endpointBase,
  saveProgress,
  markStarted,
}: {
  articleId: string;
  chapterNumber: string;
  resp: StoryQuestionResponse;
  handleCompleted: (
    currentProgress?: AnswerStatus[],
    newResp?: QuestionResponse
  ) => void;
  userId: string;
  articleTitle: string;
  articleLevel: number;
  endpointBase: string;
  saveProgress: (progress: unknown) => void;
  markStarted: () => void;
}) {
  const [progress, setProgress] = useState(resp.progress);
  const [isLoadingAnswer, setLoadingAnswer] = useState(false);
  const [index, setIndex] = useState(0);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState(-1);
  const { timer, setPaused } = useContext(QuizContext);
  const [textualEvidence, setTextualEvidence] = useState("");

  useEffect(() => {
    setProgress(resp.progress);
  }, [resp.progress]);

  useEffect(() => {
    if (resp.results && resp.results[0] && resp.results[0].question) {
      markStarted();
    }
  }, [resp.results, markStarted]);

  // Whenever the visible question index changes, hide any textual feedback
  // and reset selection so feedback only appears after a new submission.
  useEffect(() => {
    // Clear feedback and selection when user moves to another question
    setTextualEvidence("");
    setSelectedOption(-1);
    setCorrectAnswer("");
  }, [index]);

  // If parent/server updates the resp.results (for example server returns
  // a single-item results array), ensure our index is valid and clear
  // feedback so we don't show previous question's feedback for the new data.
  useEffect(() => {
    try {
      const resultsLen = resp?.results?.length || 0;
      if (resultsLen === 0) return;
      if (index >= resultsLen) {
        setIndex(0);
        setSelectedOption(-1);
        setCorrectAnswer("");
        setTextualEvidence("");
        setPaused(false);
      }
    } catch (e) {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resp.results]);

  const onSubmitted = async (
    storyId: string,
    questionNumber: number,
    chapterNumber: string,
    option: string,
    i: number
  ) => {
    setPaused(true);
    setLoadingAnswer(true);

    if (!option) {
      console.error("Attempted to submit an empty option");
      option = `Option ${i + 1}`;
    }

    const cleanOption = option.replace(/^\d+\.\s*/, "");

    setSelectedOption(i);

    try {
      const response = await fetch(
        `${endpointBase}/mcq/${questionNumber}`,
        {
          method: "POST",
          body: JSON.stringify({
            selectedAnswer: cleanOption,
            timeRecorded: timer,
          }),
        }
      );

      const data = await response.json();
      if (data) {
        const isCorrect = cleanOption === data.correctAnswer;

        setCorrectAnswer(data.correctAnswer || "");
        setSelectedOption(i);
        // Show textual feedback returned by the server (support camelCase and snake_case)
        try {
          setTextualEvidence(
            data.textualEvidence || data.textual_evidence || ""
          );
        } catch (e) {
          // ignore
        }
        const newProgress = [...(progress || [])];

        const currentQuestionIndex = newProgress.findIndex(
          (p) => p === AnswerStatus.UNANSWERED
        );

        if (currentQuestionIndex !== -1) {
          const actuallyCorrect = isCorrect;
          newProgress[currentQuestionIndex] = actuallyCorrect
            ? AnswerStatus.CORRECT
            : AnswerStatus.INCORRECT;
          setProgress(newProgress);

          saveProgress(newProgress);
        }
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      setSelectedOption(i);
    } finally {
      setLoadingAnswer(false);
    }
  };

  return (
    <CardContent>
      <div className="flex gap-2 items-end mt-6">
        <Badge className="flex-1" variant="destructive">
          Time Elapsed: {timer} seconds
        </Badge>
        {progress.map((status, idx) =>
          status === AnswerStatus.CORRECT ? (
            <Icons.correctChecked
              key={idx}
              className="text-green-500"
              size={22}
            />
          ) : status === AnswerStatus.INCORRECT ? (
            <Icons.incorrectChecked
              key={idx}
              className="text-red-500"
              size={22}
            />
          ) : (
            <Icons.unChecked key={idx} className="text-gray-500" size={22} />
          )
        )}
      </div>

      <CardTitle className="font-bold text-3xl md:text-3xl mt-3">
        Question {resp.results[0]?.question_number || 1} of {resp.total}
      </CardTitle>
      <CardDescription className="text-2xl md:text-2xl mt-3">
        {resp.results[index]?.question}
      </CardDescription>

      {textualEvidence && (
        <div className="mt-4 p-4 font-semibold bg-gray-100 text-gray-700 rounded">
          <p>
            <span className="font-bold text-lg text-gray-800">Feedback: </span>
            {`"${textualEvidence}"`}
          </p>
        </div>
      )}

      {resp.results[index]?.options.map((option, i) => (
        <Button
          key={i}
          className={`mt-2 h-auto w-full ${
            selectedOption === i ? "bg-red-500 hover:bg-red-600" : ""
          } ${
            correctAnswer === option ? "bg-green-500 hover:bg-green-600" : ""
          }`}
          disabled={isLoadingAnswer}
          onClick={() => {
            // Clear any visible feedback immediately when user clicks Continue
            // so previous question's textual evidence doesn't persist.
            try {
              setTextualEvidence("");
            } catch (e) {
              // ignore
            }
            if (selectedOption === -1) {
              onSubmitted(
                articleId,
                resp.results[index].question_number,
                chapterNumber,
                option,
                i
              );
            }
          }}
        >
          <p className="w-full text-left">
            {i + 1}. {option}
          </p>
        </Button>
      ))}

      <Button
        variant="outline"
        size="sm"
        className="mt-2"
        disabled={isLoadingAnswer || selectedOption === -1}
        onClick={() => {
          // Build a local updatedProgress that includes the most-recent answer
          const updated = Array.isArray(progress) ? [...progress] : [];
          while (updated.length < (resp.total || 5))
            updated.push(AnswerStatus.UNANSWERED);

          // If a selection was made, mark this question's progress locally
          if (selectedOption !== -1) {
            const selectedOptionText =
              resp.results[index]?.options?.[selectedOption] || "";
            // Only update if this slot wasn't already answered
            if (updated[index] === AnswerStatus.UNANSWERED) {
              updated[index] =
                correctAnswer === selectedOptionText
                  ? AnswerStatus.CORRECT
                  : AnswerStatus.INCORRECT;
            }
          }

          // Persist and set local progress immediately so UI reflects the answer
          saveProgress(updated);
          markStarted();

          setProgress(updated);

          const nowAnsweredCount = updated.filter(
            (p) => p === AnswerStatus.CORRECT || p === AnswerStatus.INCORRECT
          ).length;

          if (nowAnsweredCount >= (resp.total || 5)) {
            // All answered — notify parent to finalize (don't force a reload)
            handleCompleted(updated, {
              ...resp,
              progress: updated,
              state: QuestionState.COMPLETED,
            });
            return;
          }

          // Advance to next unanswered question (if any)
          let nextUnanswered = updated.findIndex(
            (p) => p === AnswerStatus.UNANSWERED
          );
          if (nextUnanswered === -1) {
            // fallback: move to next index
            nextUnanswered = Math.min(index + 1, (resp.total || 5) - 1);
          }

          // If we don't have the next question in resp.results, fetch updated questions from server
          if (!resp.results || !resp.results[nextUnanswered]) {
            const ts = new Date().getTime();
            fetch(`${endpointBase}/mcq?_t=${ts}`)
              .then((res) => res.json())
              .then((newData) => {
                const merged = {
                  ...newData,
                  progress: updated,
                  state: QuestionState.INCOMPLETE,
                } as QuestionResponse;
                // Ask parent to update its data/store
                try {
                  handleCompleted(updated, merged);
                } catch (e) {
                  console.error("[StoryMCQ] handleCompleted failed", e);
                  // fallback to using global store directly
                  useQuestionStore.setState({ mcQuestion: merged });
                }

                // Determine a safe index into the merged results.
                // Prefer server-provided summary.currentQuestion if present, else prefer nextUnanswered, else clamp to 0.
                let resolvedIndex = 0;
                try {
                  const serverIndex = (newData as any)?.summary
                    ?.currentQuestion;
                  if (typeof serverIndex === "number") {
                    // serverIndex is 1-based
                    resolvedIndex = Math.max(
                      0,
                      Math.min(
                        (merged.results?.length || 1) - 1,
                        serverIndex - 1
                      )
                    );
                  } else if (merged.results && merged.results[nextUnanswered]) {
                    resolvedIndex = nextUnanswered;
                  } else if (merged.results && merged.results.length > 0) {
                    // show first available result
                    resolvedIndex = 0;
                  } else {
                    // nothing available, keep previous index
                    resolvedIndex = Math.min(
                      nextUnanswered,
                      (resp.total || 5) - 1
                    );
                  }
                } catch (e) {
                  resolvedIndex = Math.min(
                    nextUnanswered,
                    (resp.total || 5) - 1
                  );
                }
                // Always clear textualEvidence when advancing questions (or replacing results)
                setIndex(resolvedIndex);
                setSelectedOption(-1);
                setCorrectAnswer("");
                setTextualEvidence("");
                setPaused(false);
              })
              .catch((err) => {
                console.error(
                  "[StoryMCQ] failed to fetch updated questions",
                  err
                );
                // fallback to local index advance
                setIndex(nextUnanswered);
                setSelectedOption(-1);
                setCorrectAnswer("");
                setTextualEvidence("");
                setPaused(false);
              });
          } else {
            setIndex(nextUnanswered);
            setSelectedOption(-1);
            setCorrectAnswer("");
            setTextualEvidence("");
            setPaused(false);
          }
        }}
      >
        {isLoadingAnswer ? (
          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          ""
        )}
        Continue
      </Button>
    </CardContent>
  );
}
