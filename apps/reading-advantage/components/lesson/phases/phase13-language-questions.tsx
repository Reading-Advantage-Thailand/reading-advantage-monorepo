"use client";

import React from "react";
import LessonLanguageQuestion from "../lesson-language-question";
import { Article } from "../../models/article-model";
import { MessageCircle, Sparkles, Brain, HelpCircle } from "lucide-react";
import { useScopedI18n } from "@/locales/client";

interface Phase13LanguageQuestionsProps {
  article: Article;
  onCompleteChange: (complete: boolean) => void;
  skipPhase: () => void;
}

const Phase13LanguageQuestions: React.FC<Phase13LanguageQuestionsProps> = ({
  article,
  onCompleteChange,
  skipPhase,
}) => {
  const t = useScopedI18n("pages.student.lessonPage");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="text-center space-y-4 bg-gradient-to-br from-indigo-300 via-purple-300 to-pink-300 dark:from-indigo-950 dark:via-purple-950 dark:to-pink-950 p-8 rounded-2xl border border-indigo-200 dark:border-indigo-800">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-100 dark:bg-indigo-900 rounded-full mb-4">
          <MessageCircle className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("phase13Title")}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          {t("phase13Description")}
        </p>
        
        {/* Feature highlights */}
        <div className="flex flex-wrap justify-center gap-4 mt-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-200/50 dark:bg-gray-800/50 rounded-full border border-indigo-200 dark:border-indigo-700">
            <Brain className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">{t("aiPowered")}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-200/50 dark:bg-gray-800/50 rounded-full border border-purple-200 dark:border-purple-700">
            <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">{t("interactive")}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-200/50 dark:bg-gray-800/50 rounded-full border border-pink-200 dark:border-pink-700">
            <HelpCircle className="h-4 w-4 text-pink-600 dark:text-pink-400" />
            <span className="text-sm font-medium text-pink-700 dark:text-pink-300">{t("askQuestions")}</span>
          </div>
        </div>
      </div>

      {/* Language Question Component - Enhanced Container */}
      <div className="bg-gradient-to-br from-zinc-200 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden backdrop-blur-sm">
        <div className="relative">
          {/* Decorative top bar */}
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
          
          <div className="p-6">
            <LessonLanguageQuestion
              article={article}
              onCompleteChange={onCompleteChange}
              skipPhase={skipPhase}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

Phase13LanguageQuestions.displayName = "Phase13LanguageQuestions";
export default Phase13LanguageQuestions;
