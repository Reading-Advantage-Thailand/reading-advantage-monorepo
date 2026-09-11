"use client";
import React from "react";
import { useCurrentLocale } from "@/locales/client";
import { StoryChapter } from "./models/article-model";
import {
  getTranslateSentence,
  normalizeTranslateLocale,
} from "@/lib/translate-sentence";

type Props = {
  story: StoryChapter;
  storyId: string;
  chapterNumber: string;
};

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
    const localeTarget = normalizeTranslateLocale(locale);

    const existingTranslationData = (story.chapter as any).translatedSummary;
    if (existingTranslationData && existingTranslationData[localeTarget] && existingTranslationData[localeTarget].length > 0) {
      setSummarySentence(existingTranslationData[localeTarget]);
      return;
    }

    const res = await getTranslateSentence(
      `/api/v1/assistant/stories-translate/${storyId}/${chapterNumber}`,
      localeTarget,
      { body: { type: "summary" } },
    );

    setSummarySentence(res.translated_sentences);
  }

  return <>{locale == "en" ? story.chapter.summary : summarySentence}</>;
}
