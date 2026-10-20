"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import {
  BookOpenIcon,
  ClockIcon,
  GlobeIcon,
  LightbulbIcon,
} from "lucide-react";
import { getArticleImageUrl } from "@/lib/storage-config";
import { useTranslations, useLocale } from "next-intl";
import { TaskHeader } from "./task-header";

interface Article {
  id: string;
  title: string;
  summary: string;
  cefrLevel: string;
  raLevel: number;
  passage: string | null;
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
      <TaskHeader icon={<BookOpenIcon />} title={t("phase1Title")} subtitle={t("phase1Description", { title: article.title })} />

      {/* Article Preview Card */}
      <div className="cq-panel overflow-hidden p-0">
        {/* Article Image */}
        <div className="relative h-64 overflow-hidden border-b-3 border-[var(--cq-parchment-edge)] bg-[var(--cq-parchment-2)] md:h-80">
          <Image
            src={getArticleImageUrl(article, 1) || `/nopic.png`}
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
            <h2 className="text-2xl leading-tight font-bold">
              {article.title}
            </h2>

            {/* Article Stats */}
            <div className="flex flex-wrap gap-2">
              <span className="lg-chip inline-flex items-center gap-1">
                <GlobeIcon className="size-4" aria-hidden="true" />
                {t("cefrLevel", { level: article.cefrLevel })}
              </span>
              <span className="lg-chip inline-flex items-center gap-1">
                <LightbulbIcon className="size-4" aria-hidden="true" />
                {t("raLevel", { level: article.raLevel })}
              </span>
              <span className="lg-chip inline-flex items-center gap-1">
                <ClockIcon className="size-4" aria-hidden="true" />
                {t("estimatedReadTime", {
                  time: Math.ceil((article.passage ?? "").split(" ").length / 20),
                })}
              </span>
            </div>

            {/* Article Summary */}
            {article.translatedSummary && (
              <div className="lf-well border-l-6 border-l-[var(--cq-wood)] p-4">
                <h3 className="mb-2 font-semibold">
                  {t("articleSummary")}
                </h3>
                <p className="leading-relaxed">
                  {article.translatedSummary?.[
                    locale as "th" | "vi" | "cn" | "tw"
                  ] ?? article.summary}
                </p>
              </div>
            )}
          </div>

          {/* Learning Objectives */}
          <div className="lf-well p-4">
            <h3 className="mb-3 flex items-center font-semibold">
              <LightbulbIcon className="lf-text-gold mr-2 h-5 w-5" aria-hidden="true" />
              {t("learningObjectives")}
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <span className="lf-stud mr-3"></span>
                {t("understandMainIdeas")}
              </li>
              <li className="flex items-center">
                <span className="lf-stud mr-3"></span>
                {t("learnVocabulary")}
              </li>
              <li className="flex items-center">
                <span className="lf-stud mr-3"></span>
                {t("improveComprehension")}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
