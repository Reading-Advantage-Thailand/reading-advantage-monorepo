"use client";
import React from "react";
import { useCurrentLocale } from "@/locales/client";
import { Article } from "./models/article-model";
import {
  getTranslateSentence,
  normalizeTranslateLocale,
} from "@/lib/translate-sentence";

type Props = {
  article: Article;
  articleId: string;
};

export function ArticleSummary({ article, articleId }: Props) {
  const [summarySentence, setSummarySentence] = React.useState<string[]>([]);
  const locale = useCurrentLocale();

  React.useEffect(() => {
    handleTranslateSummary();
  }, [article, locale]);

  async function handleTranslateSummary() {
    if (!locale || locale === "en") {
      return;
    }

    // Normalize locale key ให้ตรงกับ key ที่บันทึกใน DB
    const localeTarget = normalizeTranslateLocale(locale);

    // ตรวจ cache จาก article payload ก่อน — ถ้ามีแล้วไม่ต้องเรียก API
    const cachedSummary = (
      article.translatedSummary as Record<string, string[]> | null
    )?.[localeTarget];

    if (cachedSummary && cachedSummary.length > 0) {
      setSummarySentence(cachedSummary);
      return;
    }

    // เรียก API เฉพาะตอนที่ locale นั้นยังไม่มีใน cache
    const res = await getTranslateSentence(
      `/api/v1/assistant/translate/${articleId}`,
      localeTarget,
      { body: { type: "summary" } },
    );
    if (res.message !== "error") {
      setSummarySentence(res.translated_sentences);
    }
  }

  return <>{locale == "en" ? article.summary : summarySentence}</>;
}
