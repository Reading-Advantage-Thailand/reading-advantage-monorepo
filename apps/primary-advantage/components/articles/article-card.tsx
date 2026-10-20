import React from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { StatusChip } from "@reading-advantage/ui";
import { Article } from "@/types";
import { AlertCircle, BookCheck, BookX } from "lucide-react";
import ArticleContent from "./article-content";
import { getLocale, getTranslations } from "next-intl/server";
import { getArticleImageUrl } from "@/lib/storage-config";

// import RatingPopup from "./rating-popup";

type Props = {
  article: Article & { articleActivityLog: any[] };
  userId?: string;
  /** The saved state of the signed-in student (`getArticleCardState`); false when not given. */
  saved?: boolean;
};

/**
 * The article page card: title, level, the student's own "saved" chip, summary, and text.
 * @param props.article The article with the logs of the signed-in user only.
 * @param props.saved Whether this student saved the cards of the article.
 * @returns The card.
 */
export default async function ArticleCard({ article, saved = false }: Props) {
  const locale = await getLocale();
  const t = await getTranslations();
  const getLocalizedSummary = () => {
    if (!locale || locale === "en") {
      return article.summary;
    }

    return (
      article.translatedSummary?.[locale as "th" | "cn" | "tw" | "vi"] ||
      article.summary
    );
  };

  const imageUrl = getArticleImageUrl(article, 1);
  // const imageUrl = `/nopic.png`;

  return (
    <div className="min-w-0 xl:basis-3/5">
      <Card className="rounded-2xl">
        <CardHeader className="flex flex-col gap-4">
          <h1 data-slot="card-title" className="font-article text-3xl leading-none font-bold md:text-5xl">
            {article.title}
          </h1>
          <div className="flex flex-wrap gap-2">
            {/* One level system for students: CEFR (the read list cards show the same). */}
            {article.cefrLevel ? <StatusChip tone="success">{article.cefrLevel}</StatusChip> : null}
            {/* Ink on parchment with fixed colors: the StatusChip tones do not read at night (plan-review L-1). */}
            <span
              data-testid="saved-chip"
              data-saved={saved ? "true" : "false"}
              className={
                saved
                  ? "inline-flex items-center gap-1 rounded-full border-2 border-[#2f5d9e] bg-[#dbe8fa] px-3 py-1 text-xs font-bold text-[#17365f]"
                  : "inline-flex items-center gap-1 rounded-full border-2 border-[#9a7a3c] bg-[#f3e6c4] px-3 py-1 text-xs font-bold text-[#4a3515]"
              }
            >
              {saved ? (
                <BookCheck className="size-3.5" aria-hidden="true" />
              ) : (
                <BookX className="size-3.5" aria-hidden="true" />
              )}
              {saved ? t("Article.saveToFlashcard") : t("Article.notSaved")}
            </span>
          </div>
          <CardDescription className="font-article text-lg md:text-xl">
            {getLocalizedSummary()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ArticleContent article={article} />
        </CardContent>
        <CardFooter>
          <p className="text-muted-foreground flex items-start gap-2 text-xs">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {t("ReadList.disclaimer")}
          </p>
        </CardFooter>
      </Card>
      {/* <RatingPopup
        userId={userId}
        averageRating={article.average_rating}
        articleId={articleId}
        article={article}
      /> */}
    </div>
  );
}
