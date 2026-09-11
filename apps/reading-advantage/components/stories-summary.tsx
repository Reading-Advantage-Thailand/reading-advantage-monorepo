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
};

export function StoriesSummary({ story, storyId }: Props) {
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

    const res = await getTranslateSentence(
      `/api/v1/assistant/stories-translate/${storyId}`,
      localeTarget,
      { body: { type: "summary" } },
    );

    setSummarySentence(res.translated_sentences);
  }

  return <>{locale == "en" ? story.storyBible.summary : summarySentence}</>;
}
