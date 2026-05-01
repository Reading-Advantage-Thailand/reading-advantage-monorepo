import ArticleCard from "@/components/articles/article-card";
import LAQuestionCard from "@/components/articles/questions/la-question-card";
import MCQuestionCard from "@/components/articles/questions/mc-question-card";
import SAQuestionCard from "@/components/articles/questions/sa-question-card";
import WordList from "@/components/articles/word-list";
import { getArticleById } from "@/server/models/articleModel";
import React from "react";
import { Article, WordListTimestamp } from "@/types";
import Sentence, {
  Sentence as SentenceType,
} from "@/components/articles/sentence";
import { currentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { saveArticleToFlashcard } from "@/actions/flashcard";
import AssignButton from "@/components/teacher/assign-button";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { FileTextIcon } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; articleId: string }>;
}) {
  const { locale, articleId } = await params;
  const t = await getTranslations({ locale, namespace: "Article" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

type Params = Promise<{ articleId: string }>;

export default async function ArticleQuizPage({ params }: { params: Params }) {
  const user = await currentUser();

  if (!user) {
    return redirect("/auth/signin");
  }

  const { articleId } = await params;
  const t = await getTranslations("Article");
  const { article } = await getArticleById(articleId);

  const isAtLeastTeacher = (role: string) =>
    role.includes("teacher") ||
    role.includes("admin") ||
    role.includes("system");

  const isSaved = article.articleActivityLog.some(
    (activity) =>
      activity.userId === user.id && activity.isSentenceAndWordsSaved === true,
  );

  if (!isSaved) {
    if (
      article.articleActivityLog.some(
        (activity) =>
          activity.userId === user.id &&
          activity.isLongAnswerQuestionCompleted === true &&
          activity.isShortAnswerQuestionCompleted === true &&
          activity.isMultipleChoiceQuestionCompleted === true,
      )
    ) {
      await saveArticleToFlashcard(articleId, article.articleActivityLog[0].id);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4 xl:flex-row">
        <ArticleCard
          article={
            article as unknown as Article & { articleActivityLog: any[] }
          }
        />
        <div className="flex flex-col gap-4 xl:basis-2/5">
          <div className="flex flex-wrap gap-2">
            {isAtLeastTeacher(user.role as string) && (
              <>
                {/* <PrintArticle
                  articleId={params.articleId}
                  article={articleResponse.article}
                /> */}
                <AssignButton article={article} />
              </>
            )}
            {/* {isAboveTeacher(user.role) && (
              <ArticleActions
                article={articleResponse.article}
                articleId={params.articleId}
              />
            )} */}

            <WordList
              articleId={articleId}
              words={article.sentencsAndWordsForFlashcard.flatMap(
                (word) => word.words as unknown as WordListTimestamp[],
              )}
              audioUrl={
                article.sentencsAndWordsForFlashcard[0].wordsUrl as string
              }
            />
            <Sentence
              sentences={article.sentencsAndWordsForFlashcard.flatMap(
                (sentence) => sentence.sentence as unknown as SentenceType[],
              )}
              audioUrl={
                article.sentencsAndWordsForFlashcard[0]
                  .audioSentencesUrl as string
              }
            />
            <Link href={`/student/lesson/${articleId}?type=article`}>
              <Button variant="default">
                <FileTextIcon className="h-4 w-4" />
                {t("studyAsLesson", { default: "Study as 45-min Lesson" })}
              </Button>
            </Link>
          </div>

          <MCQuestionCard articleId={articleId} />
          <SAQuestionCard articleId={articleId} />
          <LAQuestionCard articleId={articleId} />
        </div>
      </div>
      {/* <ChatBotFloatingChatButton
        article={articleResponse?.article as Article}
      /> */}
    </>
  );
}
