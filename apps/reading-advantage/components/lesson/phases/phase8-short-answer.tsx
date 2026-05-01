"use client";

import React from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import LessonSAQ from "../practics/lesson-saq";
import { Article } from "../../models/article-model";
import { Book } from "lucide-react";
import { useScopedI18n } from "@/locales/client";

interface Phase8ShortAnswerProps {
  article: Article;
  articleId: string;
  userId: string;
  onCompleteChange: (complete: boolean) => void;
}

const Phase8ShortAnswer: React.FC<Phase8ShortAnswerProps> = ({
  article,
  articleId,
  userId,
  onCompleteChange,
}) => {
  const t = useScopedI18n("pages.student.lessonPage");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="text-center space-y-4 bg-gradient-to-br from-blue-300 via-cyan-300 to-teal-300 dark:from-blue-950 dark:via-cyan-950 dark:to-teal-950 p-8 rounded-2xl border border-blue-200 dark:border-blue-800">
        <div className="inline-flex items-center justify-center p-3 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
          <Book className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("phase8Title")}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          {t("phase8Description")}
        </p>
      </div>
      
      {/* SAQ Component */}
      <div className="bg-zinc-200 dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          <LessonSAQ
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

Phase8ShortAnswer.displayName = "Phase8ShortAnswer";
export default Phase8ShortAnswer;
