import { Article } from "@/types";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Book, Languages } from "lucide-react";
import { rpgButton } from "@/components/rpg/chrome";
import { cn } from "@/lib/utils";
import { BucketImage } from "@/components/ui/bucket-image";
import { getArticleImageUrl, getAudioUrl } from "@/lib/storage-config";
import { parseSentences } from "@/lib/read-along/align";
import { seekTimeForWord } from "@/lib/read-along/position";
import { seekOrWait } from "@/lib/read-along/seek";
import { ReadAlongPassage } from "@/components/read-along/read-along-passage";
import { ReadAlongPlayer } from "@/components/read-along/read-along-player";
import { useFollowScroll } from "@/hooks/use-follow-scroll";
import { useReadAlong } from "@/hooks/use-read-along";
import { useLocale, useTranslations } from "next-intl";
import { toTranslationLanguage } from "@/lib/translation-language";
import { TaskHeader } from "./task-header";

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
      <TaskHeader icon={<Book />} title={enableTranslation ? t("deepTitle") : t("firstTitle")} subtitle={t("subtitle")} />

      <audio ref={audioRef} src={getAudioUrl(article.audioUrl || "")} />

      {/* Translation toggle */}
      {enableTranslation && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => {
              setShowTranslation((on) => !on);
              setSelectedSentence(null);
            }}
            className={rpgButton(showTranslation ? "gold" : "wood")}
          >
            <Languages className="size-5" aria-hidden="true" />
            {showTranslation ? t("translation.on") : t("translation.off")}
          </button>
        </div>
      )}

      <p
        role="note"
        className="cq-panel px-3 py-2 text-center text-sm"
      >
        {tComponents("readAlongHint")}
      </p>

      {/* Reading Content */}
      <div className="cq-panel relative overflow-hidden p-0">
        <div className="max-w-none p-4 sm:p-8 lg:p-12">
          {enableTranslation && showTranslation && selectedSentence !== null && (
            <div className="cq-panel cq-panel--dark mb-6 px-4 py-3 text-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-medium text-[var(--cq-gold)]">
                  {t("translation.title")}
                </div>
                <button
                  className={cn(rpgButton("iron", true), "ml-2 min-h-10 min-w-10 px-0 text-lg")}
                  onClick={() => setSelectedSentence(null)}
                  aria-label={tComponents("closeButton")}
                >
                  ×
                </button>
              </div>
              <div className="leading-relaxed text-wrap">
                {(article.translatedPassage as Record<string, string[]> | null)?.[toTranslationLanguage(locale)]?.[selectedSentence]}
              </div>
            </div>
          )}
          <h2 className="mb-6 text-center font-serif text-2xl leading-tight font-bold tracking-normal sm:mb-8 sm:text-3xl sm:tracking-wide lg:mb-12 lg:text-4xl">
            {article.title}
          </h2>

          {/* The panel stays parchment at night, so the night sentence band and word hover of the read-along take their day tones. */}
          <div className="dark:[--color-amber-800:var(--color-amber-200)] dark:[--color-emerald-800:var(--color-emerald-200)]">
            <ReadAlongPassage
              sentences={sentences}
              passage={article.passage ?? ""}
              position={position}
              active
              currentSentenceRef={currentSentenceRef}
              renderBlockMedia={(blockIndex) => (
                <BucketImage
                  className="rounded-lg shadow-xl"
                  src={getArticleImageUrl(article, blockIndex + 1) || `/nopic.png`}
                  alt="Article Image"
                  width={640}
                  height={640}
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
      <div className="cq-panel p-6">
        <h3 className="mb-3 font-semibold">
          {t("tips.firstTitle")}
        </h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center">
            <span className="lf-stud mr-3"></span>
            {t("tips.readEntire")}
          </li>
          <li className="flex items-center">
            <span className="lf-stud mr-3"></span>
            {t("tips.clickStart")}
          </li>
          <li className="flex items-center">
            <span className="lf-stud mr-3"></span>
            {t("tips.sentenceJump")}
          </li>
          <li className="flex items-center">
            <span className="lf-stud mr-3"></span>
            {t("tips.useHighlight")}
          </li>
          <li className="flex items-center">
            <span className="lf-stud mr-3"></span>
            {t("tips.listenComplete")}
          </li>
        </ul>
      </div>
    </div>
  );
}
