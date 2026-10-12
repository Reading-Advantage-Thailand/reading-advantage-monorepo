import { Article } from "@/types";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Book, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { getArticleImageUrl, getAudioUrl } from "@/lib/storage-config";
import { parseSentences } from "@/lib/read-along/align";
import { seekTimeForWord } from "@/lib/read-along/position";
import { seekOrWait } from "@/lib/read-along/seek";
import { ReadAlongPassage } from "@/components/read-along/read-along-passage";
import { ReadAlongPlayer } from "@/components/read-along/read-along-player";
import { useFollowScroll } from "@/hooks/use-follow-scroll";
import { useReadAlong } from "@/hooks/use-read-along";
import { useLocale, useTranslations } from "next-intl";

/**
 * Shared first/deep reading task with optional translation overlay.
 * It uses the same read-along as the article page: the shared hook, passage, and player.
 * @param article Article shown in the reader.
 * @param enableTranslation Whether the translation overlay is available.
 * @returns The reading task.
 */
export function TaskReading({
  article,
  enableTranslation,
}: {
  article: Article;
  enableTranslation: boolean;
}) {
  const t = useTranslations("Lesson.Reading");
  const tComponents = useTranslations("Components");
  const locale = useLocale();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentSentenceRef = useRef<HTMLSpanElement | null>(null);
  const [speed, setSpeed] = useState<number>(1);
  const [showTranslation, setShowTranslation] = useState(false);
  const [selectedSentence, setSelectedSentence] = useState<number | null>(null);
  const sentences = useMemo(() => parseSentences(article.sentences), [article.sentences]);
  const { position, isPlaying, select } = useReadAlong({ audioRef, sentences });
  const { resume: resumeFollow } = useFollowScroll({
    targetRef: currentSentenceRef,
    enabled: isPlaying,
    sentenceIndex: position.sentenceIndex,
  });

  useEffect(() => {
    // Keep the element: React clears the ref before this cleanup runs.
    const audio = audioRef.current;
    return () => audio?.pause();
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const applyPlaybackRate = () => {
      audio.playbackRate = speed;
    };
    // Apply at once on a rate change and again when new metadata loads.
    applyPlaybackRate();
    audio.addEventListener("loadedmetadata", applyPlaybackRate);
    return () => audio.removeEventListener("loadedmetadata", applyPlaybackRate);
  }, [speed]);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play().catch(() => undefined);
  };

  /** Seeks to a word (or to the sentence start when the index is -1) and plays. */
  const handleWordTap = (sentenceIndex: number, audioWordIndex: number) => {
    if (showTranslation) {
      setSelectedSentence(sentenceIndex);
      return;
    }
    const audio = audioRef.current;
    const sentence = sentences[sentenceIndex];
    if (!audio || !sentence) return;
    resumeFollow();
    // Wait for the first metadata when the element has none (review fix 2026-10-12).
    seekOrWait(audio, seekTimeForWord(sentence, audioWordIndex));
    select({ sentenceIndex, wordIndex: sentence.words[audioWordIndex] ? audioWordIndex : -1 });
    audio.play().catch(() => undefined);
  };

  const handlePlaySentence = (sentenceIndex: number) => handleWordTap(sentenceIndex, -1);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header Section */}
      <div className="space-y-4 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-300 via-teal-300 to-cyan-300 p-8 text-center dark:border-emerald-800 dark:from-emerald-950 dark:via-teal-950 dark:to-cyan-950">
        <div className="mb-4 inline-flex items-center justify-center rounded-full bg-emerald-100 p-3 dark:bg-emerald-900">
          <Book className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {enableTranslation ? t("deepTitle") : t("firstTitle")}
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
          {t("subtitle")}
        </p>
      </div>

      <audio ref={audioRef} src={getAudioUrl(article.audioUrl || "")} />

      {/* Translation toggle */}
      {enableTranslation && (
        <div className="flex justify-center">
          <Button
            variant={showTranslation ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setShowTranslation((on) => !on);
              setSelectedSentence(null);
            }}
            className={showTranslation ? "bg-blue-500 hover:bg-blue-600" : ""}
          >
            <Languages className="mr-1 h-4 w-4" />
            {showTranslation ? t("translation.on") : t("translation.off")}
          </Button>
        </div>
      )}

      {/* Reading Content */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-zinc-200 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <div className="max-w-none p-4 sm:p-8 lg:p-12">
          {enableTranslation && showTranslation && selectedSentence !== null && (
            <div className="mb-6 rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 text-sm text-white dark:border-gray-300 dark:bg-gray-200 dark:text-gray-800">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-medium text-yellow-300 dark:text-blue-600">
                  {t("translation.title")}
                </div>
                <button
                  className="ml-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white transition-colors hover:bg-red-600"
                  onClick={() => setSelectedSentence(null)}
                  aria-label={tComponents("closeButton")}
                >
                  ×
                </button>
              </div>
              <div className="leading-relaxed text-wrap">
                {(article.translatedPassage as Record<string, string[]> | null)?.[locale]?.[selectedSentence]}
              </div>
            </div>
          )}
          <h2 className="mb-6 text-center font-serif text-2xl leading-tight font-bold tracking-normal text-gray-900 sm:mb-8 sm:text-3xl sm:tracking-wide lg:mb-12 lg:text-4xl dark:text-white">
            {article.title}
          </h2>

          <div className="text-gray-800 dark:text-gray-200">
            <ReadAlongPassage
              sentences={sentences}
              passage={article.passage ?? ""}
              position={position}
              active
              currentSentenceRef={currentSentenceRef}
              renderBlockMedia={(blockIndex) => (
                <Image
                  className="rounded-lg shadow-xl"
                  src={getArticleImageUrl(article, blockIndex + 1) || `/nopic.png`}
                  alt="Article Image"
                  width={640}
                  height={640}
                  unoptimized
                />
              )}
              onWordTap={handleWordTap}
            />
          </div>
        </div>
      </div>

      {/* Room for the fixed player bar on a phone. */}
      <div aria-hidden className="h-24 lg:hidden" />
      <ReadAlongPlayer
        playing={isPlaying}
        speed={speed}
        sentenceIndex={position.sentenceIndex}
        sentenceCount={sentences.length}
        onPlayPause={handlePlayPause}
        onPlaySentence={handlePlaySentence}
        onSpeedChange={(value) => setSpeed(value)}
      />

      {/* Reading Tips */}
      <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-300 to-indigo-300 p-6 dark:border-blue-800 dark:from-blue-950 dark:to-indigo-950">
        <h3 className="mb-3 font-semibold text-blue-800 dark:text-blue-200">
          {t("tips.firstTitle")}
        </h3>
        <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
          <li className="flex items-center">
            <span className="mr-3 h-2 w-2 rounded-full bg-blue-500"></span>
            {t("tips.readEntire")}
          </li>
          <li className="flex items-center">
            <span className="mr-3 h-2 w-2 rounded-full bg-blue-500"></span>
            {t("tips.clickStart")}
          </li>
          <li className="flex items-center">
            <span className="mr-3 h-2 w-2 rounded-full bg-blue-500"></span>
            {t("tips.sentenceJump")}
          </li>
          <li className="flex items-center">
            <span className="mr-3 h-2 w-2 rounded-full bg-blue-500"></span>
            {t("tips.useHighlight")}
          </li>
          <li className="flex items-center">
            <span className="mr-3 h-2 w-2 rounded-full bg-blue-500"></span>
            {t("tips.listenComplete")}
          </li>
        </ul>
      </div>
    </div>
  );
}
