"use client";

import { Book } from "lucide-react";
import React from "react";
import LessonMatchingGame from "../games/lesson-matching-game";
import { FlashcardType } from "@/types/enum";
import { useTranslations } from "next-intl";
import { TaskHeader } from "./task-header";

export default function TaskVocabularyMatching({
  articleId,
}: {
  articleId: string;
}) {
  const t = useTranslations("Lesson.tasks");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <TaskHeader icon={<Book />} title={t("vocabularyMatchingTitle")} subtitle={t("vocabularyMatchingDescription")} />

      {/* Matching Component */}
      <LessonMatchingGame articleId={articleId} cardKind={FlashcardType.VOCABULARY} />
    </div>
  );
}
