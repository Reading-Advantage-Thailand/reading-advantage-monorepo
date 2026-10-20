"use client";

import { Book } from "lucide-react";
import LessonSAQ from "../practice/lesson-task-saq";
import { Article } from "@/types";
import { useTranslations } from "next-intl";
import { TaskHeader } from "./task-header";

export default function TaskShortAnswer({ article }: { article: Article }) {
  const t = useTranslations("Lesson.tasks");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <TaskHeader icon={<Book />} title={t("shortAnswerTitle")} subtitle={t("shortAnswerDescription", { title: article.title })} />

      {/* SAQ Component */}
      <LessonSAQ article={article} />
    </div>
  );
}
