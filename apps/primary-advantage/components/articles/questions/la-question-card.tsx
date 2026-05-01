import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getQuestionsByArticleId } from "@/server/models/articleModel";
import { ActivityType, QuestionState } from "@/types/enum";
import QuestionHeader from "./question-header";
import { QuizContextProvider } from "@/contexts/question-context";
import LAQuestionContent from "./la-question-content";
import { LAQuestion, QuestionResponse } from "@/types";
import { getTranslations } from "next-intl/server";

export default async function LAQuestionCard({
  articleId,
}: {
  articleId: string;
}) {
  const questionsData: QuestionResponse = await getQuestionsByArticleId(
    articleId,
    ActivityType.LA_QUESTION,
  );

  const t = await getTranslations("Question");
  const tc = await getTranslations("Components");

  if (questionsData.questionStatus === QuestionState.ERROR) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-muted-foreground text-3xl font-bold md:text-3xl">
            {t("LAQuestion.title")}
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
            {t("LAQuestion.title")}
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
          heading={t("LAQuestion.title")}
          description={t("LAQuestion.description")}
          buttonLabel={tc("startQuiz")}
          disabled={false}
        >
          <QuizContextProvider>
            <LAQuestionContent
              articleId={articleId}
              questions={questionsData.questions as LAQuestion}
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
            {t("LAQuestion.title")}
          </CardTitle>
          <CardDescription>{t("descriptionSuccess")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }
}
