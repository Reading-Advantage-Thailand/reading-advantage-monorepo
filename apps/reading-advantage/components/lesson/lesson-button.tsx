"use client";
import React, { useState } from "react";
import { Button } from "../ui/button";
import { Article } from "@/components/models/article-model";
import { useScopedI18n } from "@/locales/client";
import Link from "next/link";
import { ActivityType, ActivityStatus } from "../models/user-activity-log-model";

type Props = {
  article: Article;
  articleId: string;
  userId: string;
};

export default function ArticleLesson({ article, articleId, userId }: Props) {
  const t = useScopedI18n("pages.student.readPage.article");
  return (
    <div className="flex gap-2">
      <Link
        href={`/student/lesson/${articleId}`}
        onClick={() =>
          fetch(`/api/v1/users/${userId}/activitylog`, {
            method: "POST",
            body: JSON.stringify({
              articleId: articleId,
              activityType: ActivityType.LessonRead,
              activityStatus: ActivityStatus.InProgress,
              details: {
                title: article.title,
                level: article.ra_level,
                cefr_level: article.cefr_level,
                type: article.type,
                genre: article.genre,
                subgenre: article.subgenre,
              },
            }),
          })
        }
      >
        <Button>{t("lessonButton")}</Button>
      </Link>
    </div>
  );
}
