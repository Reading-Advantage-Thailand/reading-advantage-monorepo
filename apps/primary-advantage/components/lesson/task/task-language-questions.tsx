"use client";

import React from "react";
import { MessageCircle, Brain, Sparkles, HelpCircle } from "lucide-react";
import LessonLanguageQuestion from "../lesson-language-question";
import { Article } from "@/types";
import { useTranslations } from "next-intl";

export default function TaskLanguageQuestions({
  article,
}: {
  article: Article;
}) {
  const t = useTranslations("TaskLanguageQuestions");
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header Section */}
      <div className="space-y-4 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-300 via-purple-300 to-pink-300 p-8 text-center dark:border-indigo-800 dark:from-indigo-950 dark:via-purple-950 dark:to-pink-950">
        <div className="mb-4 inline-flex items-center justify-center rounded-full bg-indigo-100 p-3 dark:bg-indigo-900">
          <MessageCircle className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("title")}
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
          {t("subtitle")}
        </p>

        {/* Feature highlights */}
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <div className="flex items-center gap-2 rounded-full border border-indigo-200 bg-zinc-200/50 px-4 py-2 dark:border-indigo-700 dark:bg-gray-800/50">
            <Brain className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
              {t("badges.aiPowered")}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-purple-200 bg-zinc-200/50 px-4 py-2 dark:border-purple-700 dark:bg-gray-800/50">
            <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
              {t("badges.interactive")}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-pink-200 bg-zinc-200/50 px-4 py-2 dark:border-pink-700 dark:bg-gray-800/50">
            <HelpCircle className="h-4 w-4 text-pink-600 dark:text-pink-400" />
            <span className="text-sm font-medium text-pink-700 dark:text-pink-300">
              {t("badges.askQuestions")}
            </span>
          </div>
        </div>
      </div>

      {/* Language Question Component - Enhanced Container */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-zinc-200 to-gray-100 shadow-2xl backdrop-blur-sm dark:border-gray-700 dark:from-gray-900 dark:to-gray-800">
        <div className="relative">
          {/* Decorative top bar */}
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

          <div className="p-6">
            <LessonLanguageQuestion article={article} />
          </div>
        </div>
      </div>
    </div>
  );
}
