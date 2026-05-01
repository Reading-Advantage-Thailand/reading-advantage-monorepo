import React from "react";
import { MCQuestion, QuestionResponse } from "@/types";
import { AnswerStatus, QuestionState } from "@/types/enum";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { QuizContextProvider } from "@/contexts/question-context";
import { Skeleton } from "@/components/ui/skeleton";
import { getQuestionsByArticleId } from "@/server/models/articleModel";
import { ActivityType } from "@/types/enum";
import MCQuestionContent from "./mc-question-content";
import QuestionHeader from "./question-header";
import { $Enums } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { retakeQuiz } from "@/actions/question";
import RetakeButton from "./retake-button";
import { getTranslations } from "next-intl/server";

export default async function MCQuestionCard({
  articleId,
}: {
  articleId: string;
}) {
  const questionsData: QuestionResponse = await getQuestionsByArticleId(
    articleId,
    ActivityType.MC_QUESTION,
  );

  let correct;

  if (questionsData.result) {
    correct = questionsData.result?.details?.score ?? 0;
  }

  const t = await getTranslations("Question");
  const tc = await getTranslations("Components");

  if (questionsData.questionStatus === QuestionState.ERROR) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-muted-foreground text-3xl font-bold md:text-3xl">
            {t("MCQuestion.title")}
          </CardTitle>
          <CardDescription className="text-red-500 dark:text-red-400">
            {t("descriptionError")}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (questionsData.questionStatus === QuestionState.LOADING) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-muted-foreground text-3xl font-bold md:text-3xl">
            {t("MCQuestion.title")}
          </CardTitle>
          <CardDescription>{t("descriptionLoading")}</CardDescription>
          <Skeleton className="mt-2 h-8 w-full" />
        </CardHeader>
      </Card>
    );
  }

  if (questionsData.questionStatus === QuestionState.INCOMPLETE) {
    return (
      <Card className="w-full">
        <QuestionHeader
          heading={t("MCQuestion.title")}
          description={t("MCQuestion.description")}
          buttonLabel={tc("startQuiz")}
          disabled={false}
        >
          <QuizContextProvider>
            <MCQuestionContent
              articleId={articleId}
              questions={questionsData.questions as MCQuestion[]}
            />
          </QuizContextProvider>
        </QuestionHeader>
      </Card>
    );
  }

  if (questionsData.questionStatus === QuestionState.COMPLETED) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-muted-foreground text-3xl font-bold md:text-3xl">
            {t("MCQuestion.title")}
          </CardTitle>
          <CardDescription>
            <p>{t("descriptionSuccess")}</p>
            <p className="inline font-bold text-green-500 dark:text-green-400">
              {t("descriptionSuccess2", {
                score: correct ?? 0,
                total: 5,
              })}
            </p>
          </CardDescription>

          <RetakeButton articleId={articleId} type={ActivityType.MC_QUESTION} />
        </CardHeader>
      </Card>
    );
  }
}
