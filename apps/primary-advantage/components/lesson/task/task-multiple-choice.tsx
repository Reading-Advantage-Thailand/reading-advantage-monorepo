"use client";

import React from "react";
import { Book } from "lucide-react";
import { Article } from "@/types";
import { MCQContent } from "@/components/articles/questions/mc-question-content";
import { useTranslations } from "next-intl";
import { TaskHeader } from "./task-header";

export default function TaskMultipleChoice({ article }: { article: Article }) {
  const t = useTranslations("Lesson.tasks");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <TaskHeader icon={<Book />} title={t("multipleChoiceTitle")} subtitle={t("multipleChoiceDescription", { title: article.title })} />

      {/* MCQ Component */}
      <div className="cq-panel p-4 sm:p-6">
        <MCQContent mode="lesson" article={article} />
      </div>
    </div>
  );
}
