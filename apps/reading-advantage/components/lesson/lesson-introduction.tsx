"use client";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Book } from "lucide-react";
import { useScopedI18n } from "@/locales/client";
import { Article } from "@/components/models/article-model";
import { Badge } from "../ui/badge";
import Image from "next/image";
import CollapsibleNotice from "./lesson-collapsible-notice";
import { ArticleSummary } from "../article-summary";
import { useEffect } from "react";

interface Props {
  article: Article;
  articleId: string;
  userId: string;
  onCompleteChange: (complete: boolean) => void;
}

export default function LessonIntroduction({
  article,
  articleId,
  userId,
  onCompleteChange,
}: Props) {
  const t = useScopedI18n("pages.student.lessonPage");
  const tc = useScopedI18n("components.articleCard");

  useEffect(() => {
    onCompleteChange(true);
  }, []);

  return (
    <Card className="pb-6">
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center">
          <Book />
          <div className="ml-2">{t("phase1Title")}</div>
        </CardTitle>
        <div>
          <span className="font-bold">
            {t("phase1Description", { topic: article.title })}
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          <Badge>{tc("raLevel", { raLevel: article.ra_level })}</Badge>
          <Badge>{tc("cefrLevel", { cefrLevel: article.cefr_level })}</Badge>
        </div>
        <CardDescription>
          <ArticleSummary article={article} articleId={articleId} />
        </CardDescription>
        <div className="flex justify-center h-[350px] overflow-hidden">
          <Image
            src={`https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/images/${articleId}.png`}
            alt="Malcolm X"
            width={840}
            height={250}
            className="object-cover"
          />
        </div>
      </CardHeader>
      <CollapsibleNotice />
    </Card>
  );
}
