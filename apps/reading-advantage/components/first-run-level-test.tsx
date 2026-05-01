"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import React, { useState, useEffect, useCallback } from "react";
import { toast } from "./ui/use-toast";
import { useRouter, redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import Confetti from "react-confetti";
import { useScopedI18n } from "../locales/client";
import { levelCalculation } from "../lib/utils";
import { ActivityStatus, ActivityType } from "./models/user-activity-log-model";

type Props = {
  userId: string;
  language_placement_test: levelTest[];
};

type levelTest = {
  level: string;
  questions: {
    prompt: string;
    options: Record<string, string>;
  }[];
  points: number;
};

type Option = {
  id: number;
  text: string;
};

type Question = {
  prompt: string;
  options: Record<string, Option>;
};

export default function FirstRunLevelTest({
  userId,
  language_placement_test,
}: Props) {
  const t = useScopedI18n("components.firstRunLevelTest");
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [testFinished, setTestFinished] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[][]>([]);
  const [xp, setXp] = useState(0);
  const [correctAnswer, setCorrectAnswer] = React.useState<string[]>([]);
  const [formkey, setFormKey] = useState(0);
  const [countOfRightAnswers, setCountOfRightAnswers] = useState(0);
  const [isQuestionAnswered, setIsQuestionAnswered] = useState(
    new Array(
      language_placement_test[currentSectionIndex].questions.length
    ).fill(false)
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<{
    [key: string]: string;
  }>({});
  const [processedSections, setProcessedSections] = useState<Set<number>>(
    new Set()
  );

  const getCorrectAnswer = useCallback(async () => {
    let allCorrectAnswers: string[] = [];
    for (let i = language_placement_test.length - 1; i >= 0; i--) {
      for (
        let j = language_placement_test[i].questions.length - 1;
        j >= 0;
        j--
      ) {
        const answerA = language_placement_test[i].questions[j].options["A"];
        allCorrectAnswers.push(answerA);
      }
      setCorrectAnswer(allCorrectAnswers);
    }
  }, [language_placement_test]);

  const onAnswerSelected = (
    optionId: number,
    answer: string,
    index: number
  ) => {
    const questionKey = `${currentSectionIndex}-${index}`;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionKey]: answer,
    }));
  };

  function shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  const handleQuestions = useCallback(async () => {
    let optionId = 0;

    let initialShuffledQuestions = [...language_placement_test];

    let updatedShuffledQuestions = initialShuffledQuestions.map((section) => {
      let shuffledSection = shuffleArray(section.questions).slice(0, 3);

      return shuffledSection.map((question) => {
        let choices = Object.entries(question.options);
        for (let i = choices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [choices[i], choices[j]] = [choices[j], choices[i]];
        }

        let updatedOptions = Object.fromEntries(
          choices.map(([key, value]) => [key, { id: optionId++, text: value }])
        );

        return { ...question, options: updatedOptions };
      });
    });

    setShuffledQuestions(updatedShuffledQuestions);
  }, [language_placement_test]);

  const handleNext = () => {
    const currentQuestionCount = shuffledQuestions[currentPage]?.length || 0;
    const answeredQuestions = Object.keys(selectedAnswers).filter((key) =>
      key.startsWith(`${currentSectionIndex}-`)
    );

    if (answeredQuestions.length < currentQuestionCount) {
      toast({
        title: t("toast.attention"),
        description: t("toast.attentionDescription"),
        variant: "destructive",
      });
    } else {
      let correctAnswersInSection = 0;

      answeredQuestions.forEach((questionKey) => {
        const selectedAnswer = selectedAnswers[questionKey];
        if (correctAnswer.includes(selectedAnswer)) {
          correctAnswersInSection++;
        }
      });

      if (!processedSections.has(currentSectionIndex)) {
        const sectionXP =
          correctAnswersInSection *
          language_placement_test[currentSectionIndex].points;
        setXp((prevXP) => prevXP + sectionXP);
        setProcessedSections((prev) => new Set([...prev, currentSectionIndex]));

        console.log(
          `Section ${currentSectionIndex}: ${correctAnswersInSection} correct answers, +${sectionXP} XP`
        );
      }

      if (correctAnswersInSection >= 2) {
        if (currentPage < shuffledQuestions.length - 1) {
          setCurrentPage(currentPage + 1);
          setCurrentSectionIndex(currentSectionIndex + 1);
          setFormKey(formkey + 1);
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setCountOfRightAnswers(0);
          const newSelectedAnswers = { ...selectedAnswers };
          answeredQuestions.forEach((key) => delete newSelectedAnswers[key]);
          setSelectedAnswers(newSelectedAnswers);
        } else {
          onFinishTest();
        }
      } else {
        onFinishTest();
      }
    }
  };

  const onFinishTest = async () => {
    setTestFinished(true);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        setXp(0);
        setSelectedAnswers({});
        setProcessedSections(new Set());
        setCurrentPage(0);
        setCurrentSectionIndex(0);
        setTestFinished(false);

        await handleQuestions();
        await getCorrectAnswer();
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [getCorrectAnswer, handleQuestions]);

  if (testFinished) {
    return (
      <div>
        <Confetti width={window.innerWidth} height={window.innerHeight} />
        <Card>
          <CardHeader>
            <CardTitle className="font-bold text-2xl md:text-2xl">
              {t("congratulations")}
            </CardTitle>
            <CardDescription>{t("congratulationsDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{t("yourScore", { xp })}</p>
            <p>
              {t("yourCefrLevel", {
                cefrLevel: levelCalculation(xp).cefrLevel,
              })}
            </p>
            <p>{t("yourRaLevel", { raLevel: levelCalculation(xp).raLevel })}</p>
            <br />

            <Button
              size="lg"
              onClick={async () => {
                try {
                  console.log(`Sending XP to API: ${xp}`);

                  const updateResult = await fetch(
                    `/api/v1/users/${userId}/activitylog`,
                    {
                      method: "POST",
                      body: JSON.stringify({
                        activityType: ActivityType.LevelTest,
                        activityStatus: ActivityStatus.Completed,
                        xpEarned: xp,
                        isInitialLevelTest: true,
                        details: {
                          questionsAnswered:
                            Object.keys(selectedAnswers).length,
                          totalQuestions: shuffledQuestions.flat().length,
                          selectedAnswers: selectedAnswers,
                          cefr_level: levelCalculation(xp).cefrLevel,
                        },
                      }),
                    }
                  );
                  if (updateResult.status == 200) {
                    toast({
                      title: t("toast.successUpdate"),
                      description: t("toast.successUpdateDescription"),
                    });

                    router.refresh();
                  } else {
                    console.log("Update Failed");
                  }
                  router.push("/student/read");
                } catch (error) {
                  console.error(error);
                  toast({
                    title: t("toast.errorTitle"),
                    description: t("toast.errorDescription"),
                    variant: "destructive",
                  });
                }
              }}
            >
              {t("getStartedButton")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  } else {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="font-bold text-2xl md:text-2xl">
              {t("heading")}
            </CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              {loading ? (
                <h1>Please wait...</h1>
              ) : (
                <div>
                  <h1 className="font-bold text-xl mb-4">
                    {t("section", {
                      currentSectionIndex: currentSectionIndex + 1,
                    })}
                  </h1>
                  {shuffledQuestions[currentPage] &&
                    shuffledQuestions[currentPage].map(
                      (
                        question: {
                          prompt: string;
                          options: Record<string, { id: number; text: string }>;
                        },
                        questionIndex: number
                      ) => (
                        <div key={questionIndex}>
                          <p className="font-bold text-xl mt-4">
                            {questionIndex + 1}. {question.prompt}
                          </p>
                          <form key={formkey + 1}>
                            {Object.entries(question.options).map(
                              ([key, { id, text }]) => (
                                <label
                                  key={id}
                                  htmlFor={`${currentSectionIndex}-${questionIndex}-${key}`}
                                  className="flex items-center text-sm cursor-pointer border md:w-1/4 mt-2 p-3 rounded-lg transition-all"
                                  style={{ fontSize: "1.1rem" }}
                                >
                                  <input
                                    type="radio"
                                    name={`option-${currentSectionIndex}-${questionIndex}`}
                                    value={text}
                                    id={`${currentSectionIndex}-${questionIndex}-${key}`}
                                    className="mr-3 w-5 h-5 accent-blue-600"
                                    onChange={(e) =>
                                      onAnswerSelected(
                                        id,
                                        e.target.value,
                                        questionIndex
                                      )
                                    }
                                    style={{ accentColor: "#2563eb" }}
                                  />
                                  {text}
                                </label>
                              )
                            )}
                          </form>
                        </div>
                      )
                    )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <div className="flex items-center pt-4">
          <Button
            size="lg"
            onClick={
              currentPage === shuffledQuestions.length - 1
                ? onFinishTest
                : handleNext
            }
          >
            {currentPage === shuffledQuestions.length - 1
              ? "Next"
              : t("nextButton")}
          </Button>
        </div>
      </>
    );
  }
}
