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
import QuestionHeader from "./question-header";
import { QuizContextProvider } from "@/contexts/question-context";
import { WrittenQuestionContent } from "./written-question-content";
import { LAQuestion, QuestionResponse } from "@/types";
import { getTranslations } from "next-intl/server";

export default async function LAQuestionCard({
  articleId,
}: {
  articleId: string;
}) {
  const questionsData: QuestionResponse = await loadQuestions(articleId, ActivityType.LA_QUESTION);

  const t = await getTranslations("Question");
  const tc = await getTranslations("Components");

  if (questionsData.questionStatus === QuestionState.ERROR) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-muted-foreground text-2xl font-bold">
            {t("LAQuestion.title")}
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
            {t("LAQuestion.title")}
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
            <WrittenQuestionContent
              kind="la"
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
