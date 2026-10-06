"use client";
import React from "react";
import { BookOpenIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { StatusChip, cardHoverClassName } from "@reading-advantage/ui";
import { Link, usePathname } from "@/i18n/navigation";
import { ArticleShowcase } from "@/types";
import { getArticleImageUrl } from "@/lib/storage-config";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  article: ArticleShowcase;
  userId?: string;
};

const SYSTEM_PATH = /\/(?:[a-z]{2}\/)?system\/.*\/?$/i;

/**
 * One story in the read list: the picture (with a book fallback when it fails to load), the
 * CEFR level, a started or finished chip, the title as the link to the story, the summary in
 * the UI language, and a second link that opens the story as a lesson.
 * @param props.article The story.
 * @returns The card.
 */
function ArticleShowcaseCard({ article }: Props) {
  const locale = useLocale();
  const pathName = usePathname();
  const t = useTranslations("ReadList");
  const [imageFailed, setImageFailed] = React.useState(false);
  const approvedOnSystemPage = Boolean(article.is_approved && SYSTEM_PATH.test(pathName));

  const summary =
    !locale || locale === "en"
      ? article.summary
      : article.translatedSummary?.[locale as "th" | "cn" | "tw" | "vi"] || article.summary;
  const status = article.is_read
    ? article.is_completed
      ? { label: t("completed"), tone: "success" as const }
      : { label: t("started"), tone: "info" as const }
    : approvedOnSystemPage
      ? { label: t("approved"), tone: "neutral" as const }
      : null;

  return (
    <article
      className={cn(
        "bg-card text-card-foreground relative flex h-full flex-col overflow-hidden rounded-2xl border shadow-sm",
        cardHoverClassName,
        (article.is_completed || approvedOnSystemPage) && "opacity-75",
      )}
    >
      <div
        data-slot="article-image-fallback"
        className="bg-brand-50 text-brand-700 dark:text-brand-300 relative flex aspect-video items-center justify-center"
      >
        <BookOpenIcon className="size-10" aria-hidden="true" />
        {!imageFailed && (
          // A plain img: onError swaps in the book fallback when the picture fails.
          <img
            src={getArticleImageUrl(article, 1)}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="absolute inset-0 size-full object-cover"
          />
        )}
        {status && (
          <StatusChip tone={status.tone} className="absolute top-2 left-2 shadow-sm">
            {status.label}
          </StatusChip>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {article.cefrLevel ? <StatusChip tone="success">{article.cefrLevel}</StatusChip> : null}
        <h3 className="text-lg leading-snug font-bold">
          {/* The title link covers the whole card (after:inset-0); the lesson link sits above it. */}
          <Link href={`/student/read/${article.id}`} className="after:absolute after:inset-0 after:content-['']">
            {article.title}
          </Link>
        </h3>
        {summary ? <p className="text-muted-foreground line-clamp-3 text-sm">{summary}</p> : null}
        <Link
          href={`/student/lesson/${article.id}?type=article`}
          aria-label={t("lessonLabel", { title: article.title })}
          className={cn(buttonVariants({ variant: "outline" }), "relative z-10 mt-auto min-h-12 self-start rounded-xl")}
        >
          {t("lesson")}
        </Link>
      </div>
    </article>
  );
}

export default React.memo(ArticleShowcaseCard);
