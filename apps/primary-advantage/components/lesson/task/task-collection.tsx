"use client";
import { Article, WordListTimestamp } from "@/types";
import React, { useEffect, useState } from "react";
import { BookmarkIcon, VolumeXIcon } from "lucide-react";
import { Skeleton } from "@reading-advantage/ui";
import AudioButton from "@/components/audio-button";
import { Sentence } from "@/components/articles/sentence";
import { useLocale, useTranslations } from "next-intl";
import { TaskHeader } from "./task-header";

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
      <TaskHeader icon={<BookmarkIcon />} title={t("title")} subtitle={t("subtitle")} />

      {/* Vocabulary Cards */}
      <div className="cq-panel overflow-hidden p-4 sm:p-6">
        <div>
          {loading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="lf-well p-4"
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
                  className={`group lf-well cursor-pointer p-4 transition-all duration-300 hover:shadow-md ${
                    activeWordIndex === index
                      ? "lf-well--gold"
                      : "hover:border-[var(--cq-wood)]"
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
                      <span className="cq-sign cq-sign--small text-sm">
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
                          className="rounded-full bg-[rgba(107,84,56,0.15)] p-2 opacity-60"
                          title={t("audioNotAvailable")}
                        >
                          <VolumeXIcon className="cq-muted h-5 w-5" />
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
                        <p className="leading-relaxed">
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
              <VolumeXIcon className="cq-muted mx-auto mb-4 h-12 w-12" />
              <p className="cq-muted">{t("empty")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Progress Indicator */}
      {items.length > 0 && (
        <div className="cq-panel p-4">
          <div className="cq-muted flex items-center justify-between text-sm">
            <span>{t("progress")}</span>
            <span>{t("wordsToLearn", { count: items.length })}</span>
          </div>
          <div className="lf-steps mt-2">
            <span
              data-state="done"
              className="transition-all duration-300"
              style={{ width: "100%" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskCollection;
