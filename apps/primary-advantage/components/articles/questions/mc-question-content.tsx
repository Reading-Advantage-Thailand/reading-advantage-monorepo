"use client";
import { QuizContext } from "@/contexts/question-context";
import React, { useContext, useEffect, useState, useTransition } from "react";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MCQuestion } from "@/types";
import { ActivityType, AnswerStatus } from "@/types/enum";
import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { finishQuiz } from "@/actions/question";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";

export default function MCQuestionContent({
  articleId,
  questions,
}: {
  articleId: string;
  questions: MCQuestion[];
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { timer, setPaused } = useContext(QuizContext);
  const [correctAnswer, setCorrectAnswer] = useState<boolean>(false);
  const [activeQuestion, setActiveQuestion] = useState(null) as any;
  const [responses, setResponses] = useState<any[]>([]);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [progress, setProgress] = useState<AnswerStatus[]>(
    Array(5).fill(AnswerStatus.UNANSWERED),
  );
  const [textualEvidence, setTextualEvidence] = useState("");
  const router = useRouter();
  const [isPanding, startTransition] = useTransition();

  const { data: session, update } = useSession();
  const t = useTranslations("Question");
  const tc = useTranslations("Components");

  useEffect(() => {
    if (questions[currentIndex]) {
      // shuffle options for the current question

      setShuffledOptions(
        shuffleArray([...(questions[currentIndex].options ?? [])]),
      );
    }
  }, [questions, currentIndex]);

  const shuffleArray = (array: any[]) => {
    for (let i = array.length - 1; i > 0; --i) {
      // generate a random index between 0 and i
      const j = Math.floor(Math.random() * (i + 1));

      // swap elements --> destructuring assignment
      [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
  };

  const handleActiveQuestion = (option: string) => {
    if (!questions[currentIndex]) return;

    const response = {
      question: questions[currentIndex].question,
      answer: option,
      isCorrect: questions[currentIndex].answer,
    };

    setResponses((prev) => {
      // check if the response already exists
      const existingIndex = prev.findIndex((res) => {
        return res.question === response.question;
      });

      // update the response if it exists

      if (existingIndex !== -1) {
        // update the response
        const updatedResponses = [...prev];
        updatedResponses[existingIndex] = response;

        return updatedResponses;
      } else {
        return [...prev, response];
      }
    });

    if (option === questions[currentIndex].answer) {
      setCorrectAnswer(true);
      setProgress((prev) => {
        const newProgress = [...prev];
        newProgress[currentIndex] = AnswerStatus.CORRECT;
        return newProgress;
      });
    } else {
      setCorrectAnswer(false);
      setProgress((prev) => {
        const newProgress = [...prev];
        newProgress[currentIndex] = AnswerStatus.INCORRECT;
        return newProgress;
      });
    }

    setTextualEvidence(questions[currentIndex].textualEvidence || "");

    // set the active question
    setActiveQuestion(option);
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);

      // reset the active question
      setActiveQuestion(null);
    }
  };

  const handleFinishQuiz = async () => {
    setPaused(true);
    // handle finish quiz logic here
    const data = {
      responses,
      score: progress.filter((status) => status === AnswerStatus.CORRECT)
        .length,
      timer,
    };

    startTransition(async () => {
      await finishQuiz(articleId, data, ActivityType.MC_QUESTION).then(
        (res) => {
          if (res.success) {
            toast("Quiz finished successfully", {
              style: {
                background: `var(--success)`,
              },
            });
            update({
              user: {
                ...session?.user,
              },
            });
            router.refresh();
          } else {
            toast("Failed to finish quiz", {
              style: {
                background: `var(--destructive)`,
              },
            });
          }
        },
      );
    });
  };

  return (
    <CardContent>
      <div className="flex items-end gap-2">
        <Badge className="flex-1 justify-start" variant="destructive">
          {tc("timer", { elapsed: timer })}
        </Badge>
        {progress.map((status, index) => {
          if (status === AnswerStatus.CORRECT) {
            return (
              <CheckCircle2 key={index} className="text-green-500" size={22} />
            );
          } else if (status === AnswerStatus.INCORRECT) {
            return <XCircle key={index} className="text-red-500" size={22} />;
          }
          return (
            <MinusCircle key={index} className="text-gray-500" size={22} />
          );
        })}
      </div>
      <CardTitle className="mt-3 text-3xl font-bold md:text-3xl">
        {t("MCQuestion.questionOf", {
          index: currentIndex + 1,
          total: questions.length,
        })}
      </CardTitle>
      <CardDescription className="mt-3 text-2xl md:text-2xl">
        {questions[currentIndex].question}
      </CardDescription>

      {textualEvidence && (
        <div className="mt-4 rounded bg-gray-100 p-4 font-semibold text-gray-700">
          <p>
            <span className="text-lg font-bold text-gray-800">Feedback: </span>
            {`"${textualEvidence}"`}
          </p>
        </div>
      )}

      {shuffledOptions.map((option, i) => (
        <Button
          key={i}
          className={cn(
            "mt-2 h-auto w-full cursor-pointer",
            activeQuestion === option &&
              (correctAnswer
                ? "bg-green-500 hover:bg-green-600"
                : "bg-red-500 hover:bg-red-600"),
          )}
          onClick={() => {
            if (!activeQuestion) {
              handleActiveQuestion(option);
            }
          }}
        >
          <p className="w-full text-left">
            {i + 1}. {option}
          </p>
        </Button>
      ))}

      <Button
        variant={"outline"}
        size={"sm"}
        className="mt-2"
        disabled={isPanding}
        onClick={() => {
          if (currentIndex < questions.length - 1) {
            if (activeQuestion) {
              handleNextQuestion();
            } else {
              toast("Please select an option to continue", {
                style: {
                  background: `var(--destructive)`,
                },
              });
            }
          } else {
            if (activeQuestion) {
              handleFinishQuiz();
            } else {
              toast("Please select an option to continue", {
                style: {
                  background: `var(--destructive)`,
                },
              });
            }
          }
        }}
      >
        {currentIndex < questions.length - 1 ? (
          <span className="flex items-center gap-2">{tc("nextButton")}</span>
        ) : (
          <span className="flex items-center gap-2">{tc("finishButton")}</span>
        )}
      </Button>
    </CardContent>
  );
}
