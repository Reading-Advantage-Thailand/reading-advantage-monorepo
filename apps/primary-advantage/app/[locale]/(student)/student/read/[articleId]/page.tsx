import ArticleCard from "@/components/articles/article-card";
import LAQuestionCard from "@/components/articles/questions/la-question-card";
import MCQuestionCard from "@/components/articles/questions/mc-question-card";
import SAQuestionCard from "@/components/articles/questions/sa-question-card";
import WordList from "@/components/articles/word-list";
import { ArticleNotFoundError, getArticleById } from "@/server/models/articleModel";
import React from "react";
import { Article, WordListTimestamp } from "@/types";
import Sentence, {
  Sentence as SentenceType,
} from "@/components/articles/sentence";
import { currentUser } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { saveArticleToFlashcard } from "@/actions/flashcard";
import AssignButton from "@/components/teacher/assign-button";
import { getTranslations } from "next-intl/server";
import { BookXIcon, FileTextIcon } from "lucide-react";
import { EmptyState } from "@reading-advantage/ui";
import { Panel, RpgLink } from "@/components/rpg/chrome";
import { Scene } from "@/components/rpg/scene";
import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import { resolveLegacyArticleId } from "@reading-advantage/domain/articles";
import { z } from "zod";

/**
 * Page title for the article view.
 * @param props.params The locale and the article id.
 * @returns The metadata.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; articleId: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Article" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

type Params = Promise<{ locale: string; articleId: string }>;

/**
 * Loads an article, or null when it does not exist. Other errors go to `error.tsx` (retry).
 * @param articleId The article.
 * @returns The article, or null.
 */
async function loadArticle(articleId: string) {
  try {
    return (await getArticleById(articleId)).article;
  } catch (error) {
    if (error instanceof ArticleNotFoundError) return null;
    throw error;
  }
}

/**
 * Article view: the article with audio and translation, and beside it (below on phones) the
 * word list, the sentences, the lesson link, and the question cards. The question cards show
 * their own empty and error states, so the article always renders (audit S2). A missing
 * article shows a not-found state with a link back to the read list.
 * @param props.params The locale and the article id.
 * @returns The page.
 */
export default async function ArticleQuizPage({ params }: { params: Params }) {
  const user = await currentUser();

  if (!user) {
    const { locale } = await params;
    return redirect({ href: "/auth/signin", locale });
  }

  const { articleId, locale } = await params;
  // A printed Origins 2 or 3.1 QR code carries the legacy article id: open the migrated article (FR-4).
  const isUuid = z.string().uuid().safeParse(articleId).success;
  if (!isUuid) {
    const tenant = { schoolId: user.schoolId };
    const migratedId = await resolveLegacyArticleId({ db: createTenantDB(db, tenant), user, tenant, input: { legacyId: articleId } });
    if (migratedId) return redirect({ href: `/student/read/${migratedId}`, locale });
  }
  const t = await getTranslations("Article");
  const tRead = await getTranslations("ReadList");
  const article = isUuid ? await loadArticle(articleId) : null;

  if (!article) {
    return (
      <Scene place="library" dim>
        <EmptyState
          className="cq-panel"
          titleAs="h1"
          icon={<BookXIcon />}
          title={tRead("notFound")}
          description={tRead("notFoundHint")}
          action={
            <RpgLink href="/student/read" tone="gold">
              {tRead("backToStories")}
            </RpgLink>
          }
        />
      </Scene>
    );
  }

  const flashcardContent = article.sentencsAndWordsForFlashcard;

  const isAtLeastTeacher = (role: string) =>
    role === "TEACHER" || role === "ADMIN" || role === "SYSTEM";

  const isSaved = article.articleActivityLog.some(
    (activity) =>
      activity.userId === user.id && activity.isSentenceAndWordsSaved === true,
  );

  if (!isSaved) {
    const completedActivity = article.articleActivityLog.find(
      (activity) =>
        activity.userId === user.id &&
        activity.isLongAnswerQuestionCompleted === true &&
        activity.isShortAnswerQuestionCompleted === true &&
        activity.isMultipleChoiceQuestionCompleted === true,
    );
    if (completedActivity) {
      await saveArticleToFlashcard(articleId, completedActivity.id);
    }
  }

  // The reading moment: the library, blurred, with the desk objects on parchment (docs/primary-rpg-skin.md §4).
  return (
    <Scene place="library" dim className="xl:flex-row xl:items-start">
      <ArticleCard
        article={article as unknown as Article & { articleActivityLog: any[] }}
      />
      <div className="flex min-w-0 flex-col gap-4 xl:basis-2/5">
        <Panel className="flex-row flex-wrap gap-2">
          {isAtLeastTeacher(user.role as string) && (
            <AssignButton article={{ ...article, summary: article.summary ?? "" }} />
          )}
          <WordList
            articleId={articleId}
            words={(flashcardContent?.words as WordListTimestamp[] | null) ?? []}
            audioUrl={flashcardContent?.wordsUrl ?? ""}
          />
          <Sentence
            sentences={(flashcardContent?.sentence as SentenceType[] | null) ?? []}
            audioUrl={flashcardContent?.audioSentencesUrl ?? ""}
          />
          <RpgLink href={`/student/lesson/${articleId}?type=article`} tone="gold">
            <FileTextIcon className="h-4 w-4" aria-hidden="true" />
            {t("studyAsLesson")}
          </RpgLink>
        </Panel>

        <MCQuestionCard articleId={articleId} />
        <SAQuestionCard articleId={articleId} />
        <LAQuestionCard articleId={articleId} />
      </div>
    </Scene>
  );
}
