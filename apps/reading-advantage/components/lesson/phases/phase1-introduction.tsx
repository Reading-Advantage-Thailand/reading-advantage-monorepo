"use client";

import React, { useEffect } from "react";
import { Article } from "../../models/article-model";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import {
  BookOpenIcon,
  ClockIcon,
  GlobeIcon,
  LightbulbIcon,
} from "lucide-react";
import { useScopedI18n } from "@/locales/client";
import { useCurrentLocale } from "@/locales/client";

interface Phase1IntroductionProps {
  article: Article;
  articleId: string;
  userId: string;
  onCompleteChange: (complete: boolean) => void;
}

const Phase1Introduction: React.FC<Phase1IntroductionProps> = ({
  article,
  articleId,
  userId,
  onCompleteChange,
}) => {
  const t = useScopedI18n("pages.student.lessonPage");
  const tc = useScopedI18n("components.articleCard");

  useEffect(() => {
    onCompleteChange(true);
  }, [onCompleteChange]);

  type Locale = "en" | "th" | "vn" | "cn" | "tw" | "vi";
  const locale: Locale = useCurrentLocale();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="text-center space-y-4 bg-gradient-to-br from-blue-300 via-indigo-300 to-purple-300 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950 p-8 rounded-2xl border border-blue-200 dark:border-blue-800">
        <div className="inline-flex items-center justify-center p-3 bg-blue-200 dark:bg-blue-900 rounded-full mb-4">
          <BookOpenIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("phase1Title")}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          {t("phase1Description", { topic: article.title })}
        </p>
      </div>

      {/* Article Preview Card */}
      <div className="bg-zinc-200 dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Article Image */}
        <div className="relative h-64 md:h-80 overflow-hidden bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700">
          <Image
            src={`https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/images/${articleId}.png`}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-300 hover:scale-105"
            priority
          />
          <div className="absolute inset-0 bg-black/10" />
        </div>

        {/* Article Info */}
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
              {article.title}
            </h2>

            {/* Article Stats */}
            <div className="flex flex-wrap gap-3">
              <Badge className="bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-300">
                <GlobeIcon className="w-4 h-4 mr-1" />
                {tc("cefrLevel", { cefrLevel: article.cefr_level })}
              </Badge>
              <Badge className="bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-300">
                <LightbulbIcon className="w-4 h-4 mr-1" />
                {tc("raLevel", { raLevel: article.ra_level })}
              </Badge>
              <Badge className="bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200 hover:bg-purple-300">
                <ClockIcon className="w-4 h-4 mr-1" />
                {t("estimatedReadTime", {
                  time: Math.ceil(article.passage.split(" ").length / 20),
                })}
              </Badge>
            </div>

            {/* Article Summary */}
            {article.translatedSummary && (
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-xl border-l-4 border-blue-500">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {t("articleSummary")}
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {article.translatedSummary[locale]}
                </p>
              </div>
            )}
          </div>

          {/* Learning Objectives */}
          <div className="bg-gradient-to-r from-green-300 to-emerald-300 dark:from-green-950 dark:to-emerald-950 p-4 rounded-xl border border-green-200 dark:border-green-800">
            <h3 className="font-semibold text-green-800 dark:text-green-200 mb-3 flex items-center">
              <LightbulbIcon className="w-5 h-5 mr-2" />
              {t("learningObjectives")}
            </h3>
            <ul className="space-y-2 text-sm text-green-700 dark:text-green-300">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                {t("understandMainIdeas")}
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                {t("learnVocabulary")}
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                {t("improveComprehension")}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

Phase1Introduction.displayName = "Phase1Introduction";
export default Phase1Introduction;
