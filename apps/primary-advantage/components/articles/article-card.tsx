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
import { AlertCircle, BookCheck } from "lucide-react";
import ArticleContent from "./article-content";
import { getLocale, getTranslations } from "next-intl/server";
import { getArticleImageUrl } from "@/lib/storage-config";

// import RatingPopup from "./rating-popup";

type Props = {
  article: Article & { articleActivityLog: any[] };
  userId?: string;
};

export default async function ArticleCard({ article }: Props) {
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

  const imageUrl = getArticleImageUrl(article.id, 1);
  // const imageUrl = `/nopic.png`;

  const isSaved = article.articleActivityLog.some(
    (activity) => activity.isSentenceAndWordsSaved === true,
  );

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
            {isSaved ? (
              <StatusChip tone="info">
                <BookCheck className="size-3.5" aria-hidden="true" />
                {t("Article.saveToFlashcard")}
              </StatusChip>
            ) : null}
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
