"use client";

import React from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import LessonMCQ from "../practics/lesson-mcq";
import { Article } from "../../models/article-model";
import { Book } from "lucide-react";
import { useScopedI18n } from "@/locales/client";

interface Phase7MultipleChoiceProps {
  article: Article;
  articleId: string;
  userId: string;
  onCompleteChange: (complete: boolean) => void;
}

const Phase7MultipleChoice: React.FC<Phase7MultipleChoiceProps> = ({
  article,
  articleId,
  userId,
  onCompleteChange,
}) => {
  const t = useScopedI18n("pages.student.lessonPage");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="text-center space-y-4 bg-gradient-to-br from-purple-300 via-blue-300 to-indigo-300 dark:from-purple-950 dark:via-blue-950 dark:to-indigo-950 p-8 rounded-2xl border border-purple-200 dark:border-purple-800">
        <div className="inline-flex items-center justify-center p-3 bg-purple-100 dark:bg-purple-900 rounded-full mb-4">
          <Book className="h-8 w-8 text-purple-600 dark:text-purple-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("phase7Title")}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          {t("phase7Description")}
        </p>
      </div>

      {/* MCQ Component */}
      <div className="bg-zinc-200 dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          <LessonMCQ
            userId={userId}
            articleId={articleId}
            articleTitle={article.title}
            articleLevel={article.ra_level}
            onCompleteChange={onCompleteChange}
          />
        </div>
      </div>
    </div>
  );
};

Phase7MultipleChoice.displayName = "Phase7MultipleChoice";
export default Phase7MultipleChoice;
