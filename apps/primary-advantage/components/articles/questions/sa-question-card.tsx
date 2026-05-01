import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getQuestionsByArticleId } from "@/server/models/articleModel";
import { ActivityType, QuestionState } from "@/types/enum";
import SAQuestionContent from "./sa-question-content";
import QuestionHeader from "./question-header";
import { QuizContextProvider } from "@/contexts/question-context";
import { QuestionResponse, SAQuestion } from "@/types";
import { getTranslations } from "next-intl/server";

export default async function SAQuestionCard({
  articleId,
}: {
  articleId: string;
}) {
  const questionsData: QuestionResponse = await getQuestionsByArticleId(
    articleId,
    ActivityType.SA_QUESTION,
  );

  const t = await getTranslations("Question");
  const tc = await getTranslations("Components");

  if (questionsData.questionStatus === QuestionState.ERROR) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-muted-foreground text-3xl font-bold md:text-3xl">
            {t("SAQuestion.title")}
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
            {t("SAQuestion.title")}
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
          heading={t("SAQuestion.title")}
          description={t("SAQuestion.description")}
          buttonLabel={tc("startQuiz")}
          disabled={false}
        >
          <QuizContextProvider>
            <SAQuestionContent
              articleId={articleId}
              questions={questionsData.questions as SAQuestion}
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
            {t("SAQuestion.title")}
          </CardTitle>
          <CardDescription>
            <p className="mt-4 text-lg font-bold">{t("SAQuestion.question")}</p>
            <p>{questionsData.result?.details.question}</p>
            <p className="mt-4 text-lg font-bold">
              {t("SAQuestion.suggestedAnswer")}
            </p>
            <p>{questionsData.result?.details.suggestedAnswer}</p>
            <p className="mt-4 text-lg font-bold">{t("SAQuestion.feedback")}</p>
            <p>{questionsData.result?.details.feedback}</p>
            <p className="mt-4 text-lg font-bold">
              {t("SAQuestion.yourAnswer")}
            </p>
            <p className="mt-2 inline font-bold text-green-500 dark:text-green-400">
              {questionsData.result?.details.yourAnswer}
            </p>
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
}
