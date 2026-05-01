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
import { cn, levelCalculation } from "@/lib/utils";
import {
  AnswerStatus,
  MultipleChoiceQuestion,
  QuestionState,
} from "../models/questions-model";
import { Icons } from "../icons";
import { useQuestionStore } from "@/store/question-store";
import { set } from "lodash";
import { toast } from "../ui/use-toast";
// (no direct imports from user-activity-log-model needed here)
import { useRouter } from "next/navigation";
import { useStoryCompletion } from "@/lib/use-story-completion";

type Props = {
  userId: string;
  storyId: string;
  articleTitle: string;
  articleLevel: number;
  chapterNumber: string;
};

export type QuestionResponse = {
  results: {
    id: string;
    question: string;
    options: string[];
    textual_evidence: string;
    question_number: number;
    chapter_number: string;
  }[];
  progress: AnswerStatus[];
  total: number;
  state: QuestionState;
};

interface MCQQuestionProps {
  storyId: string;
  resp: QuestionResponse;
  handleCompleted: (
    currentProgress?: AnswerStatus[],
    newResp?: QuestionResponse
  ) => void;
  userId: string;
  articleTitle: string;
  articleLevel: number;
  chapterNumber: string;
}

export default function StoryMCQuestionCard({
  userId,
  storyId,
  articleTitle,
  articleLevel,
  chapterNumber,
}: Props) {
  const [state, setState] = useState(QuestionState.LOADING);
  const [data, setData] = useState<QuestionResponse>({
    results: [],
    progress: [],
    total: 0,
    state: QuestionState.LOADING,
  });

  const [hasStarted, setHasStarted] = useState(false);

  // Keep in sync with global store (so lesson and story components stay consistent)
  useEffect(() => {
    const unsubscribe = useQuestionStore.subscribe((s) => {
      const { mcQuestion } = s;
      if (mcQuestion && mcQuestion.state === QuestionState.COMPLETED) {
        setState(QuestionState.COMPLETED);
        setData(mcQuestion as QuestionResponse);
      }
    });

    return unsubscribe;
  }, []);

  // Clear suspicious/ corrupted session storage entries for this story chapter
  useEffect(() => {
    const checkAndClear = async () => {
      try {
        const savedProgress = sessionStorage.getItem(
          `quiz_progress_${storyId}_${chapterNumber}`
        );
        const savedStarted = sessionStorage.getItem(
          `quiz_started_${storyId}_${chapterNumber}`
        );

        if (savedProgress) {
          const parsed = JSON.parse(savedProgress);
          if (
            Array.isArray(parsed) &&
            parsed.length === 5 &&
            parsed.every((s: number) => s === AnswerStatus.CORRECT)
          ) {
            sessionStorage.removeItem(
              `quiz_progress_${storyId}_${chapterNumber}`
            );
            sessionStorage.removeItem(
              `quiz_started_${storyId}_${chapterNumber}`
            );
            setHasStarted(false);
          }
        }

        if (savedStarted === "true" && !savedProgress) {
          sessionStorage.removeItem(`quiz_started_${storyId}_${chapterNumber}`);
          setHasStarted(false);
        }
      } catch (e) {
        console.error("Error checking cached data:", e);
        try {
          sessionStorage.removeItem(
            `quiz_progress_${storyId}_${chapterNumber}`
          );
          sessionStorage.removeItem(`quiz_started_${storyId}_${chapterNumber}`);
          setHasStarted(false);
        } catch (clearErr) {
          console.error("Error clearing corrupted data:", clearErr);
        }
      }
    };

    checkAndClear();
  }, [storyId, chapterNumber]);

  // Read started flag
  useEffect(() => {
    try {
      const quizStarted = sessionStorage.getItem(
        `quiz_started_${storyId}_${chapterNumber}`
      );
      setHasStarted(quizStarted === "true");
    } catch (e) {
      console.error("Failed to read from sessionStorage:", e);
      setHasStarted(false);
    }
  }, [storyId, chapterNumber]);

  // Initial fetch (timestamped to avoid caching)
  useEffect(() => {
    const timestamp = new Date().getTime();
    fetch(
      `/api/v1/stories/${storyId}/${chapterNumber}/question/mcq?_t=${timestamp}`
    )
      .then((res) => res.json())
      .then((d) => {
        // If server returns suspicious progress (all correct but marked incomplete), reset
        if (
          d.progress &&
          Array.isArray(d.progress) &&
          d.progress.length === 5 &&
          d.progress.every((s: number) => s === AnswerStatus.CORRECT) &&
          d.state === QuestionState.INCOMPLETE
        ) {
          d.progress = [
            AnswerStatus.UNANSWERED,
            AnswerStatus.UNANSWERED,
            AnswerStatus.UNANSWERED,
            AnswerStatus.UNANSWERED,
            AnswerStatus.UNANSWERED,
          ];
          setHasStarted(false);
          try {
            sessionStorage.removeItem(
              `quiz_progress_${storyId}_${chapterNumber}`
            );
            sessionStorage.removeItem(
              `quiz_started_${storyId}_${chapterNumber}`
            );
          } catch (clearError) {}
        }

        setData(d);
        setState(d.state);
        useQuestionStore.setState({ mcQuestion: d });

        if (d.state === QuestionState.COMPLETED) {
          setHasStarted(true);
        }
      })
      .catch((err) => {
        console.error("Error fetching story mcq:", err);
        setState(QuestionState.LOADING);
      });
    // only on mount / when story/chapter changes
  }, [storyId, chapterNumber]);

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
      useQuestionStore.setState({ mcQuestion: updatedData });

      // When we're updating parent with currentProgress, set state to INCOMPLETE unless fully completed.
      if (completedAnswers >= 5) {
        setState(QuestionState.COMPLETED);
        try {
          sessionStorage.removeItem(
            `quiz_progress_${storyId}_${chapterNumber}`
          );
          sessionStorage.removeItem(`quiz_started_${storyId}_${chapterNumber}`);
        } catch (e) {
          console.error("Error clearing session storage:", e);
        }
      } else {
        setState(QuestionState.INCOMPLETE);
      }
    } else {
      // If no currentProgress provided, use previous behavior (trigger a reload)
      if (completedAnswers >= 5) {
        setState(QuestionState.COMPLETED);
        try {
          sessionStorage.removeItem(
            `quiz_progress_${storyId}_${chapterNumber}`
          );
          sessionStorage.removeItem(`quiz_started_${storyId}_${chapterNumber}`);
        } catch (e) {
          console.error("Error clearing session storage:", e);
        }
      } else {
        setState(QuestionState.LOADING);
      }
    }

    setHasStarted(true);
    try {
      sessionStorage.setItem(
        `quiz_started_${storyId}_${chapterNumber}`,
        "true"
      );
    } catch (e) {}
  };

  const onRetake = () => {
    setState(QuestionState.LOADING);

    try {
      sessionStorage.removeItem(`quiz_progress_${storyId}_${chapterNumber}`);
      sessionStorage.removeItem(`quiz_started_${storyId}_${chapterNumber}`);
    } catch (e) {}

    setHasStarted(false);

    fetch(`/api/v1/stories/${storyId}/${chapterNumber}/question/mcq`, {
      method: "DELETE",
    })
      .then((res) => res.json())
      .then(() => {
        const timestamp = new Date().getTime();
        return fetch(
          `/api/v1/stories/${storyId}/${chapterNumber}/question/mcq?_t=${timestamp}`
        ).then((res) => res.json());
      })
      .then((d) => {
        const newData = {
          progress: [
            AnswerStatus.UNANSWERED,
            AnswerStatus.UNANSWERED,
            AnswerStatus.UNANSWERED,
            AnswerStatus.UNANSWERED,
            AnswerStatus.UNANSWERED,
          ],
          results: d.results || [],
          total: d.total || 5,
          state: QuestionState.INCOMPLETE,
        } as QuestionResponse;

        setData(newData);
        useQuestionStore.setState({
          mcQuestion: { ...d, state: QuestionState.INCOMPLETE },
        });

        setTimeout(() => {
          setState(QuestionState.INCOMPLETE);
        }, 10);
      })
      .catch((error) => {
        console.error("❌ Error during retake:", error);
        setState(QuestionState.INCOMPLETE);
      });
  };

  switch (state) {
    case QuestionState.LOADING:
      return <QuestionCardLoading />;
    case QuestionState.INCOMPLETE:
      return (
        <QuestionCardIncomplete
          userId={userId}
          chapterNumber={chapterNumber}
          resp={data}
          storyId={storyId}
          handleCompleted={handleCompleted}
          articleTitle={articleTitle}
          articleLevel={articleLevel}
        />
      );
    case QuestionState.COMPLETED:
      return <QuestionCardComplete resp={data} onRetake={onRetake} />;
    default:
      return <QuestionCardLoading />;
  }
}

function QuestionCardComplete({
  resp,
  onRetake,
}: {
  resp: QuestionResponse;
  onRetake: () => void;
}) {
  const t = useScopedI18n("components.mcq");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-bold text-3xl md:text-3xl text-muted-foreground">
          {t("title")}
        </CardTitle>
        <CardDescription>
          {t("descriptionSuccess")}{" "}
          <p className="text-green-500 dark:text-green-400 inline font-bold">
            {t("descriptionSuccess2", {
              score: resp.progress.filter(
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
  );
}

function QuestionCardLoading() {
  const t = useScopedI18n("components.mcq");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-bold text-3xl md:text-3xl text-muted-foreground">
          {t("title")}
        </CardTitle>
        <CardDescription>{t("descriptionLoading")}</CardDescription>
        <Skeleton className="h-8 w-full mt-2" />
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
  resp: QuestionResponse;
  storyId: string;
  handleCompleted: (
    currentProgress?: AnswerStatus[],
    newResp?: QuestionResponse
  ) => void;
  articleTitle: string;
  articleLevel: number;
  chapterNumber: string;
}) {
  const t = useScopedI18n("components.mcq");
  return (
    <Card id="onborda-mcq">
      <QuestionHeader
        heading={t("title")}
        description={t("description")}
        buttonLabel={t("startButton")}
        userId={userId}
        storyId={storyId}
        disabled={false}
        activityType="mc_question"
      >
        <QuizContextProvider>
          <MCQeustion
            chapterNumber={chapterNumber}
            storyId={storyId}
            resp={resp}
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

function MCQeustion({
  storyId,
  resp,
  handleCompleted,
  userId,
  articleTitle,
  articleLevel,
  chapterNumber,
}: MCQQuestionProps) {
  const [progress, setProgress] = useState(resp.progress);
  const [isLoadingAnswer, setLoadingAnswer] = useState(false);
  const [index, setIndex] = useState(0);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState(-1);
  const { timer, setPaused } = useContext(QuizContext);
  const router = useRouter();
  const [textualEvidence, setTextualEvidence] = useState("");
  const { checkAndNotifyCompletion } = useStoryCompletion();

  useEffect(() => {
    setProgress(resp.progress);
  }, [resp.progress]);

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

    const originalOptions = resp.results[index]?.options || [];

    const validOptions = originalOptions.filter(
      (opt) => opt && typeof opt === "string" && opt.trim() !== ""
    );

    setSelectedOption(i);

    try {
      const response = await fetch(
        `/api/v1/stories/${storyId}/${chapterNumber}/question/mcq/${questionNumber}`,
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

          try {
            sessionStorage.setItem(
              `quiz_progress_${storyId}_${chapterNumber}`,
              JSON.stringify(newProgress)
            );
          } catch (e) {
            console.error("Failed to save progress to sessionStorage:", e);
          }
        }
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      setSelectedOption(i);
    } finally {
      setLoadingAnswer(false);
    }
  };

  useEffect(() => {
    const isCompleted =
      progress &&
      Array.isArray(progress) &&
      progress.filter(
        (p) => p === AnswerStatus.CORRECT || p === AnswerStatus.INCORRECT
      ).length >= (resp.total || 5);

    if (isCompleted) {
      (async () => {
        try {
          await checkAndNotifyCompletion(userId, storyId, chapterNumber);
        } catch (e) {
          console.error("Error checking story completion:", e);
        }
      })();
    }
  }, [
    progress,
    userId,
    storyId,
    chapterNumber,
    checkAndNotifyCompletion,
    resp.total,
  ]);

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
                storyId,
                resp.results[index].question_number,
                resp.results[index].chapter_number,
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
          try {
            sessionStorage.setItem(
              `quiz_progress_${storyId}_${chapterNumber}`,
              JSON.stringify(updated)
            );
            sessionStorage.setItem(
              `quiz_started_${storyId}_${chapterNumber}`,
              "true"
            );
          } catch (e) {}

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
            fetch(
              `/api/v1/stories/${storyId}/${chapterNumber}/question/mcq?_t=${ts}`
            )
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
                const advanced = resolvedIndex !== index;
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
