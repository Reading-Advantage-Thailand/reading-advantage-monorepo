"use client";

import React, { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import {
  BookOpenIcon,
  ClockIcon,
  GlobeIcon,
  LightbulbIcon,
} from "lucide-react";
import { getArticleImageUrl } from "@/lib/storage-config";
import { useTranslations, useLocale } from "next-intl";

interface Article {
  id: string;
  title: string;
  summary: string;
  cefrLevel: string;
  raLevel: number;
  passage: string;
  translatedSummary: {
    th?: string;
    vi?: string;
    cn?: string;
    tw?: string;
  } | null;
}

interface TaskIntroductionProps {
  article: Article;
  onCompleteChange: (complete: boolean) => void;
}

export default function TaskIntroduction({
  article,
  onCompleteChange,
}: TaskIntroductionProps) {
  const t = useTranslations("Lesson.Introduction");
  const locale = useLocale();
  useEffect(() => {
    onCompleteChange(true);
  }, [onCompleteChange]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header Section */}
      <div className="space-y-4 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-300 via-indigo-300 to-purple-300 p-8 text-center dark:border-blue-800 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950">
        <div className="mb-4 inline-flex items-center justify-center rounded-full bg-blue-200 p-3 dark:bg-blue-900">
          <BookOpenIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("phase1Title")}
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
          {t("phase1Description", { title: article.title })}
        </p>
      </div>

      {/* Article Preview Card */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-zinc-200 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        {/* Article Image */}
        <div className="relative h-64 overflow-hidden bg-gradient-to-r from-gray-200 to-gray-300 md:h-80 dark:from-gray-800 dark:to-gray-700">
          <Image
            src={getArticleImageUrl(article.id, 1) || `/nopic.png`}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-300 hover:scale-105"
            priority
          />
          <div className="absolute inset-0 bg-black/10" />
        </div>

        {/* Article Info */}
        <div className="space-y-6 p-6">
          <div className="space-y-4">
            <h2 className="text-2xl leading-tight font-bold text-gray-900 dark:text-white">
              {article.title}
            </h2>

            {/* Article Stats */}
            <div className="flex flex-wrap gap-3">
              <Badge className="bg-blue-200 text-blue-800 hover:bg-blue-300 dark:bg-blue-900 dark:text-blue-200">
                <GlobeIcon className="mr-1 h-4 w-4" />
                {t("cefrLevel", { level: article.cefrLevel })}
              </Badge>
              <Badge className="bg-green-200 text-green-800 hover:bg-green-300 dark:bg-green-900 dark:text-green-200">
                <LightbulbIcon className="mr-1 h-4 w-4" />
                {t("raLevel", { level: article.raLevel })}
              </Badge>
              <Badge className="bg-purple-200 text-purple-800 hover:bg-purple-300 dark:bg-purple-900 dark:text-purple-200">
                <ClockIcon className="mr-1 h-4 w-4" />
                {t("estimatedReadTime", {
                  time: Math.ceil(article.passage.split(" ").length / 20),
                })}
              </Badge>
            </div>

            {/* Article Summary */}
            {article.translatedSummary && (
              <div className="rounded-xl border-l-4 border-blue-500 bg-gray-100 p-4 dark:bg-gray-800">
                <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
                  {t("articleSummary")}
                </h3>
                <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                  {article.translatedSummary?.[
                    locale as "th" | "vi" | "cn" | "tw"
                  ] ?? article.summary}
                </p>
              </div>
            )}
          </div>

          {/* Learning Objectives */}
          <div className="rounded-xl border border-green-200 bg-gradient-to-r from-green-300 to-emerald-300 p-4 dark:border-green-800 dark:from-green-950 dark:to-emerald-950">
            <h3 className="mb-3 flex items-center font-semibold text-green-800 dark:text-green-200">
              <LightbulbIcon className="mr-2 h-5 w-5" />
              {t("learningObjectives")}
            </h3>
            <ul className="space-y-2 text-sm text-green-700 dark:text-green-300">
              <li className="flex items-center">
                <span className="mr-3 h-2 w-2 rounded-full bg-green-500"></span>
                {t("understandMainIdeas")}
              </li>
              <li className="flex items-center">
                <span className="mr-3 h-2 w-2 rounded-full bg-green-500"></span>
                {t("learnVocabulary")}
              </li>
              <li className="flex items-center">
                <span className="mr-3 h-2 w-2 rounded-full bg-green-500"></span>
                {t("improveComprehension")}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
