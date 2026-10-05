import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@reading-advantage/ui";
import { ErrorState } from "@reading-advantage/ui";
import { RetryButton } from "@/components/shared/retry-button";
import { loadQuestions } from "./load-questions";
import { ActivityType, QuestionState } from "@/types/enum";
import { WrittenQuestionContent } from "./written-question-content";
import QuestionHeader from "./question-header";
import { QuizContextProvider } from "@/contexts/question-context";
import { QuestionResponse, SAQuestion } from "@/types";
import { getTranslations } from "next-intl/server";

export default async function SAQuestionCard({
  articleId,
}: {
  articleId: string;
}) {
  const questionsData: QuestionResponse = await loadQuestions(articleId, ActivityType.SA_QUESTION);

  const t = await getTranslations("Question");
  const tc = await getTranslations("Components");

  if (questionsData.questionStatus === QuestionState.ERROR) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-muted-foreground text-2xl font-bold">
            {t("SAQuestion.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState className="py-2" title={t("descriptionError")} action={<RetryButton />} />
        </CardContent>
      </Card>
    );
  }

  if (questionsData.questionStatus === QuestionState.EMPTY) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-muted-foreground text-2xl font-bold">
            {t("SAQuestion.title")}
          </CardTitle>
          <CardDescription>{t("descriptionEmpty")}</CardDescription>
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
            <WrittenQuestionContent
              kind="sa"
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
