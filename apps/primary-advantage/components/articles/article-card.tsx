import React from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "../ui/badge";
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
    <div className="md:basis-3/5">
      <Card>
        <CardHeader className="flex flex-col gap-4">
          <CardTitle className="font-article text-3xl font-bold md:text-5xl">
            {article.title}
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge>{t("Article.raLevel", { level: article.raLevel })}</Badge>
            <Badge>
              {t("Article.cefrLevel", { level: article.cefrLevel })}
            </Badge>
            <Badge>
              <BookCheck className="h-4 w-4" />
              {isSaved ? t("Article.saveToFlashcard") : t("Article.notSaved")}
            </Badge>
          </div>
          <CardDescription className="font-article text-lg md:text-xl">
            {getLocalizedSummary()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ArticleContent article={article} />
        </CardContent>
        <CardFooter>
          <div className="flex items-center gap-4 px-8">
            <AlertCircle width={64} height={64} />
            <p className="text-sm leading-loose">
              For language learners: This reading passage and its supporting
              visuals are designed for educational purposes. The
              computer-generated audio helps with pronunciation and listening
              practice. As with any learning resource, consider
              cross-referencing any facts used in academic work.
            </p>
          </div>
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
