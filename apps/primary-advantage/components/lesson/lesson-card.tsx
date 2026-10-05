import React from "react";
import LessonProgressBar, {
  LessonAssignmentProps,
} from "./lesson-progress-bar";
import { BookOpenIcon, BookXIcon } from "lucide-react";
import { EmptyState } from "@reading-advantage/ui";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import getAssignmentById from "@/server/models/assignmentModel";
import { getArticleForLesson } from "@/server/models/lessonModel";
import { QuizContextProvider } from "@/contexts/question-context";
import { getTranslations } from "next-intl/server";
import { Article } from "@/types";

/**
 * Data source for the lesson card.
 */
export type LessonCardSource = "assignment" | "article";

/**
 * Renders the lesson header (the article title is the page heading) and the task sequence for
 * an assignment or article. A lesson without an article shows a not-found state.
 * @param source Whether the lesson runs from an assignment or a standalone article.
 * @param id Assignment id for assignment lessons.
 * @param articleId Article id for article lessons.
 * @returns The lesson card.
 */
export default async function LessonCard({
  source,
  id,
  articleId,
}: {
  source: LessonCardSource;
  id?: string;
  articleId?: string;
}) {
  const t = await getTranslations("Lesson");
  const assignment =
    source === "assignment" && id ? await getAssignmentById(id) : null;
  const standaloneArticle =
    source === "article" && articleId
      ? await getArticleForLesson(articleId)
      : null;
  const title =
    source === "assignment"
      ? (assignment as unknown as { article?: { title?: string } } | null)
          ?.article?.title
      : (standaloneArticle as unknown as Article | null)?.title;

  if (!title) {
    const tRead = await getTranslations("ReadList");
    return (
      <EmptyState
        className="bg-card border"
        titleAs="h1"
        icon={<BookXIcon />}
        title={t("notFound")}
        description={t("notFoundHint")}
        action={
          <Link href="/student/read" className={cn(buttonVariants({ variant: "default" }), "min-h-12 rounded-xl px-6")}>
            {tRead("backToStories")}
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <header className="bg-brand-50 flex flex-col gap-2 rounded-2xl border p-5 md:p-6">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="bg-primary text-primary-foreground rounded-full p-2.5">
            <BookOpenIcon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-primary text-sm font-semibold">{t("header.title")}</p>
            <h1 className="text-xl leading-tight font-bold md:text-2xl">{title}</h1>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">{t("header.cta")}</p>
      </header>

      <QuizContextProvider>
        <LessonProgressBar
          source={source}
          assignment={assignment as unknown as LessonAssignmentProps}
          article={standaloneArticle as unknown as Article}
        />
      </QuizContextProvider>
    </div>
  );
}
