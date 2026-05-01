"use client";
import React from "react";
import { useCurrentLocale } from "@/locales/client";
import { Article } from "./models/article-model";

type Props = {
  article: Article;
  articleId: string;
};

async function getTranslate(
  articleId: string,
  targetLanguage: string
): Promise<{ message: string; translated_sentences: string[] }> {
  try {
    const res = await fetch(`/api/v1/assistant/translate/${articleId}`, {
      method: "POST",
      body: JSON.stringify({ type: "summary", targetLanguage }),
    });
    const data = await res.json();
    return data;
  } catch (error) {
    return { message: "error", translated_sentences: [] };
  }
}

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
    const localeTarget =
      locale === "cn" ? "zh-CN" : locale === "tw" ? "zh-TW" : locale;

    // ตรวจ cache จาก article payload ก่อน — ถ้ามีแล้วไม่ต้องเรียก API
    const cachedSummary = (
      article.translatedSummary as Record<string, string[]> | null
    )?.[localeTarget];

    if (cachedSummary && cachedSummary.length > 0) {
      setSummarySentence(cachedSummary);
      return;
    }

    // เรียก API เฉพาะตอนที่ locale นั้นยังไม่มีใน cache
    const res = await getTranslate(articleId, localeTarget);
    if (res.message !== "error") {
      setSummarySentence(res.translated_sentences);
    }
  }

  return <>{locale == "en" ? article.summary : summarySentence}</>;
}
