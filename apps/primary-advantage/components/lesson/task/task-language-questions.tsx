"use client";

import React from "react";
import { MessageCircle, Brain, Sparkles, HelpCircle } from "lucide-react";
import LessonLanguageQuestion from "../lesson-language-question";
import { Article } from "@/types";
import { useTranslations } from "next-intl";
import { TaskHeader } from "./task-header";

export default function TaskLanguageQuestions({
  article,
}: {
  article: Article;
}) {
  const t = useTranslations("TaskLanguageQuestions");
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <TaskHeader icon={<MessageCircle />} title={t("title")} subtitle={t("subtitle")}>
        {/* Feature highlights */}
        <div className="flex flex-wrap justify-center gap-2">
          <span className="lg-chip inline-flex items-center gap-2">
            <Brain className="size-4" aria-hidden="true" />
            {t("badges.aiPowered")}
          </span>
          <span className="lg-chip inline-flex items-center gap-2">
            <Sparkles className="size-4" aria-hidden="true" />
            {t("badges.interactive")}
          </span>
          <span className="lg-chip inline-flex items-center gap-2">
            <HelpCircle className="size-4" aria-hidden="true" />
            {t("badges.askQuestions")}
          </span>
        </div>
      </TaskHeader>

      {/* Language Question Component */}
      <div className="cq-panel p-4 sm:p-6">
        <LessonLanguageQuestion article={article} />
      </div>
    </div>
  );
}
