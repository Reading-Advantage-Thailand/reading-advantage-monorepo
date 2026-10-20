import { Article, WordListTimestamp } from "@/types";
import React, { useEffect, useState } from "react";
import { BookmarkIcon, VolumeXIcon } from "lucide-react";
import { Skeleton } from "@reading-advantage/ui";
import AudioButton from "@/components/audio-button";
import { useLocale, useTranslations } from "next-intl";
import { TaskHeader } from "./task-header";

interface WordList {
  vocabulary: string;
  definition: {
    en: string;
    th: string;
    cn: string;
    tw: string;
    vi: string;
  };
  startTime: number;
  endTime: number;
  audioUrl: string;
}

export default function TaskVocabularyCollection({
  article,
}: {
  article: Article;
}) {
  const t = useTranslations("Lesson.PreviewVocabulary");
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [wordList, setWordList] = useState<WordList[]>([]);
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
  const words = article?.sentencsAndWordsForFlashcard?.[0]
    ?.words as WordListTimestamp[];
  const wordsUrl = article?.sentencsAndWordsForFlashcard?.[0]?.wordsUrl;

  useEffect(() => {
    if (words) {
      let wordList: WordList[] = [];

      wordList = words.map((word: WordListTimestamp, index: number) => {
        const startTime = word?.timeSeconds as number;
        const endTime =
          index === words.length - 1
            ? (word?.timeSeconds as number) + 10
            : (words[index + 1].timeSeconds as number);

        return {
          vocabulary: word?.vocabulary,
          definition: word?.definition,
          index,
          startTime,
          endTime,
          audioUrl: wordsUrl as string,
        };
      });
      setWordList(wordList);
    }
    setLoading(false);
  }, [words]);

  const handleWordClick = (index: number) => {
    setActiveWordIndex(activeWordIndex === index ? null : index);
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
          ) : wordList && wordList.length > 0 ? (
            <div className="grid max-h-[500px] gap-4 overflow-y-auto pr-2">
              {wordList.map((word, index) => (
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
                  aria-label={word.vocabulary}
                >
                  <div className="flex items-start gap-4">
                    {/* Word */}
                    <div className="flex-shrink-0">
                      <span className="cq-sign cq-sign--small text-sm">
                        {word.vocabulary}
                      </span>
                    </div>

                    {/* Audio Button */}
                    <div className="mt-1 flex-shrink-0">
                      {word?.startTime !== undefined && word?.audioUrl ? (
                        <AudioButton
                          audioUrl={word.audioUrl}
                          startTimestamp={word.startTime}
                          endTimestamp={word.endTime}
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
                          {(
                            word.definition as unknown as Record<string, string>
                          )[locale] || word.definition?.en}
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
      {wordList.length > 0 && (
        <div className="cq-panel p-4">
          <div className="cq-muted flex items-center justify-between text-sm">
            <span>{t("progress")}</span>
            <span>{t("wordsToLearn", { count: wordList.length })}</span>
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
