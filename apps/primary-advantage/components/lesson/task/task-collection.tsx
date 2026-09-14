"use client";
import { Article, WordListTimestamp } from "@/types";
import React, { useEffect, useState } from "react";
import { BookmarkIcon, VolumeXIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import AudioButton from "@/components/audio-button";
import { Sentence } from "@/components/articles/sentence";
import { useLocale, useTranslations } from "next-intl";

/**
 * Collection task kind.
 */
export type CollectionTaskKind = "vocabulary" | "sentence";

interface CollectionItem {
  text: string;
  definition: Record<string, string> | null;
  startTime: number;
  endTime: number;
  audioUrl?: string;
}

/**
 * Renders the vocabulary preview or sentence collection task.
 * @param article Article the collection belongs to.
 * @param kind Whether to collect vocabulary or sentences.
 * @returns The collection task.
 */
export function TaskCollection({
  article,
  kind,
}: {
  article: Article;
  kind: CollectionTaskKind;
}) {
  const tVocabulary = useTranslations("Lesson.PreviewVocabulary");
  const tSentence = useTranslations("Lesson.SentenceCollection");
  const t = kind === "vocabulary" ? tVocabulary : tSentence;
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
  const words = article?.sentencsAndWordsForFlashcard?.[0]
    ?.words as WordListTimestamp[];
  const wordsUrl = article?.sentencsAndWordsForFlashcard?.[0]?.wordsUrl;
  const sentences = article?.sentencsAndWordsForFlashcard?.[0]
    ?.sentence as Sentence[];
  const audioUrl =
    article?.sentencsAndWordsForFlashcard?.[0]?.audioSentencesUrl;

  useEffect(() => {
    if (kind === "vocabulary") {
      if (words) {
        setItems(
          words.map((word: WordListTimestamp, index: number) => {
            const startTime = word?.timeSeconds as number;
            const endTime =
              index === words.length - 1
                ? (word?.timeSeconds as number) + 10
                : (words[index + 1].timeSeconds as number);

            return {
              text: word?.vocabulary,
              definition:
                (word?.definition as unknown as Record<string, string>) ??
                null,
              startTime,
              endTime,
              audioUrl: wordsUrl as string,
            };
          }),
        );
      }
    } else if (sentences) {
      setItems(
        sentences.map((sentence: Sentence, index: number) => {
          const startTime = sentence?.timeSeconds as number;
          const endTime =
            index === sentences.length - 1
              ? (sentence?.timeSeconds as number) + 10
              : (sentences[index + 1].timeSeconds as number);

          return {
            text: sentence?.sentence,
            definition:
              ((sentence as unknown as { translation?: Record<string, string> | null })
                ?.translation ?? null) as Record<string, string> | null,
            startTime,
            endTime,
            audioUrl,
          };
        }),
      );
    }
    setLoading(false);
  }, [kind, words, wordsUrl, sentences, audioUrl]);

  const handleWordClick = (index: number) => {
    setActiveWordIndex(activeWordIndex === index ? null : index);
  };

  const getLocalizedTranslation = (
    translation?: Record<string, string> | null,
    fallback?: string,
  ) => {
    if (!translation) return fallback ?? "";
    if (locale === "en") return fallback ?? "";
    if (translation[locale]) return translation[locale] as string;
    // Fallback chain
    return (
      translation.th ||
      translation.vi ||
      translation.cn ||
      translation.tw ||
      fallback ||
      ""
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header Section */}
      <div className="space-y-4 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-300 via-orange-300 to-red-300 p-8 text-center dark:border-amber-800 dark:from-amber-950 dark:via-orange-950 dark:to-red-950">
        <div className="mb-4 inline-flex items-center justify-center rounded-full bg-amber-100 p-3 dark:bg-amber-900">
          <BookmarkIcon className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("title")}
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
          {t("subtitle")}
        </p>
      </div>

      {/* Vocabulary Cards */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-zinc-300 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <div className="p-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-gray-100 p-4 dark:border-gray-800"
                >
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : items && items.length > 0 ? (
            <div className="grid max-h-[500px] gap-4 overflow-y-auto pr-2">
              {items.map((item, index) => (
                <div
                  key={index}
                  className={`group cursor-pointer rounded-xl border-2 p-4 transition-all duration-300 hover:shadow-md ${
                    activeWordIndex === index
                      ? "border-blue-400 bg-blue-100 dark:border-blue-600 dark:bg-blue-950"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                  }`}
                  onClick={() => handleWordClick(index)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleWordClick(index);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={item.text}
                >
                  <div className="flex items-start gap-4">
                    {/* Word */}
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-3 py-1 text-sm font-bold text-white">
                        {item.text}
                      </span>
                    </div>

                    {/* Audio Button */}
                    <div className="mt-1 flex-shrink-0">
                      {item?.startTime !== undefined && item?.audioUrl ? (
                        <AudioButton
                          audioUrl={item.audioUrl}
                          startTimestamp={item.startTime}
                          endTimestamp={item.endTime}
                        />
                      ) : (
                        <div
                          className="rounded-full bg-gray-200 p-2 opacity-50 dark:bg-gray-700"
                          title={t("audioNotAvailable")}
                        >
                          <VolumeXIcon className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Definition */}
                    <div className="min-w-0 flex-1">
                      <p>{t("definition")}</p>
                      {/* Always show basic definition */}
                      <div
                        className={`transition-all duration-300 ${
                          activeWordIndex === index
                            ? "opacity-100"
                            : "opacity-75 group-hover:opacity-90"
                        }`}
                      >
                        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                          {kind === "vocabulary"
                            ? (item.definition as unknown as Record<string, string>)?.[
                                (locale as string) || "en"
                              ] || (item.definition as unknown as { en?: string })?.en
                            : getLocalizedTranslation(
                                item.definition,
                                item.text,
                              )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <VolumeXIcon className="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400">{t("empty")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Progress Indicator */}
      {items.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-zinc-200 p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>{t("progress")}</span>
            <span>{t("wordsToLearn", { count: items.length })}</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
              style={{ width: "100%" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskCollection;
