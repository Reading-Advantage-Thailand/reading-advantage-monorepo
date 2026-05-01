"use client";
import React from "react";
import { useCurrentLocale } from "@/locales/client";
import { StoryChapter } from "./models/article-model";

type Props = {
  story: StoryChapter;
  storyId: string;
  chapterNumber: string;
};

async function getTranslate(
  storyId: string,
  chapterNumber: string,
  targetLanguage: string
): Promise<{ message: string; translated_sentences: string[] }> {
  try {
    const res = await fetch(`/api/v1/assistant/stories-translate/${storyId}/${chapterNumber}`, {
      method: "POST",
      body: JSON.stringify({ type: "summary", targetLanguage }),
    });
    const data = await res.json();
    return data;
  } catch (error) {
    return { message: "error", translated_sentences: [] };
  }
}

export function ChapterSummary({ story, storyId, chapterNumber }: Props) {
  const [summarySentence, setSummarySentence] = React.useState<string[]>([]);
  const locale = useCurrentLocale();

  React.useEffect(() => {
    handleTranslateSummary();
  }, [story, locale]);

  async function handleTranslateSummary() {
    if (!locale || locale === "en") {
      return;
    }
    type ExtendedLocale = "th" | "cn" | "tw" | "vi" | "zh-CN" | "zh-TW";
    let localeTarget: ExtendedLocale = locale as ExtendedLocale;
    switch (locale) {
      case "cn":
        localeTarget = "zh-CN";
        break;
      case "tw":
        localeTarget = "zh-TW";
        break;
    }

    const existingTranslationData = (story.chapter as any).translatedSummary;
    if (existingTranslationData && existingTranslationData[localeTarget] && existingTranslationData[localeTarget].length > 0) {
      setSummarySentence(existingTranslationData[localeTarget]);
      return;
    }

    const res = await getTranslate(storyId, chapterNumber, localeTarget);

    setSummarySentence(res.translated_sentences);
  }

  return <>{locale == "en" ? story.chapter.summary : summarySentence}</>;
}
