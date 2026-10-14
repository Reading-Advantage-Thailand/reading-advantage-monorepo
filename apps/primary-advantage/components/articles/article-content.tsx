"use client";
import React, { useState, useEffect, useMemo, useRef, useTransition } from "react";
import { cn } from "@/lib/utils";
// import { createEmptyCard, Card } from "ts-fsrs";
import { Article } from "@/types";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { saveFlashcard } from "@/actions/flashcard";
import { toast } from "sonner";
import { fetchArticleActivity } from "@/actions/article";
import { usePreviewSave } from "@/components/student/student-view-provider";
import Image from "next/image";
import { getArticleImageUrl, getAudioUrl } from "@/lib/storage-config";
import { seekTimeForWord } from "@/lib/read-along/position";
import { seekOrWait } from "@/lib/read-along/seek";
import { parseSentences } from "@/lib/read-along/align";
import { ReadAlongPassage } from "@/components/read-along/read-along-passage";
import { ReadAlongPlayer } from "@/components/read-along/read-along-player";
import { rpgButton } from "@/components/rpg/chrome";
import { useFollowScroll } from "@/hooks/use-follow-scroll";
import { useReadAlong } from "@/hooks/use-read-along";
import { toTranslationLanguage } from "@/lib/translation-language";

type Props = {
  article: Article;
};

const SUPPORTED_LANGUAGES = {
  th: "🇹🇭 Thai",
  vi: "🇻🇳 Vietnamese",
  cn: "🇨🇳 Chinese (Simplified)",
  tw: "🇹🇼 Chinese (Traditional)",
};

export default function ArticleContent({ article }: Props) {
  const locale = useLocale();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentSentenceRef = useRef<HTMLSpanElement | null>(null);
  const [togglePlayer, setTogglePlayer] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const sentences = useMemo(() => parseSentences(article.sentences), [article.sentences]);
  const { position, isPlaying, select, reset } = useReadAlong({ audioRef, sentences });
  const currentSentenceIndex = position.sentenceIndex;
  const [translate, setTranslate] = useState<string>("");
  const [isTranslateOpen, setIsTranslateOpen] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    toTranslationLanguage(locale),
  );
  const [isPanding, startTransition] = useTransition();
  const t = useTranslations("Components");
  const { resume: resumeFollow } = useFollowScroll({
    targetRef: currentSentenceRef,
    enabled: isPlaying,
    sentenceIndex: currentSentenceIndex,
  });

  const { isPreview, notSaved } = usePreviewSave();

  useEffect(() => {
    // Preview mode tracks no article access.
    if (article.id && !isPreview) {
      fetchArticleActivity(article.id).catch(console.error);
    }
  }, [article.id, isPreview]);

  useEffect(() => {
    // Keep the element: React clears the ref before this cleanup runs.
    const audio = audioRef.current;
    return () => audio?.pause();
  }, []);

  const handlePlayPause = async () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        try {
          await audioRef.current.play();
        } catch (error) {
        }
      }
    }
  };

  const handleTogglePlayer = () => {
    if (togglePlayer) {
      setTogglePlayer(false);
      reset();
      setSpeed(1);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        // A fresh open must start at normal speed (review fix 2026-10-12).
        audioRef.current.playbackRate = 1;
      }
    } else {
      setTogglePlayer(true);
    }
  };

  const handleSpeedTime = (value: number) => {
    setSpeed(value);
    if (audioRef.current) {
      audioRef.current.playbackRate = value;
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !article) return;

    const handleLoadedMetadata = () => {
      audio.playbackRate = speed;
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [article, speed]);

  const handleTranslate = (sentenceIndex: number) => {
    if (selectedLanguage) {
      setTranslate(
        article.translatedPassage?.[
          selectedLanguage as "th" | "cn" | "tw" | "vi"
        ]?.[sentenceIndex] || "",
      );
    } else {
      if (currentSentenceIndex !== -1) {
        setTranslate(article.sentences?.[sentenceIndex]?.sentence || "");
      } else {
        setTranslate("");
      }
    }
  };

  const handleTranslateClick = (sentenceIndex: number) => {
    select({ sentenceIndex, wordIndex: -1 });
    setIsTranslateOpen(true);
    handleTranslate(sentenceIndex);
  };

  useEffect(() => {
    handleTranslate(currentSentenceIndex);
  }, [currentSentenceIndex, selectedLanguage]);

  const handleWordTap = (sentenceIndex: number, audioWordIndex: number) => {
    // A word tap only works while the player is open (review fix 2026-10-12).
    if (!togglePlayer) return;
    const audio = audioRef.current;
    const sentence = sentences[sentenceIndex];
    if (!audio || !sentence) return;
    resumeFollow();
    // Wait for the first metadata when the element has none (review fix 2026-10-12).
    seekOrWait(audio, seekTimeForWord(sentence, audioWordIndex));
    select({ sentenceIndex, wordIndex: sentence.words[audioWordIndex] ? audioWordIndex : -1 });
    // Play at once to give the student feedback.
    audio.play().catch(() => undefined);
  };

  /** Plays from the start of a sentence entry; the player buttons use it. */
  const handlePlaySentence = (sentenceIndex: number) => handleWordTap(sentenceIndex, -1);

  const handleSaveToFlashcard = () => {
    if (isPreview) {
      notSaved();
      return;
    }
    if (currentSentenceIndex !== -1) {
      const sentence = article.sentences?.[currentSentenceIndex];
      if (sentence) {
        // Build a `SentenceEntry` that matches the contract exported by
        // `actions/flashcard.ts` (cardSentence/cardTranslation/... rather
        // than the raw `sentence`/`translation` keys used by the article
        // shape). This is what `saveFlashcard` expects at the boundary.
        const sentences: import("@/actions/flashcard").SentenceEntry = {
          cardSentence: sentence.sentence,
          cardStartTime: sentence.startTime,
          cardEndTime: sentence.endTime,
          cardTranslation: {
            th: article.translatedPassage?.th?.[currentSentenceIndex] as string,
            cn: article.translatedPassage?.cn?.[currentSentenceIndex] as string,
            tw: article.translatedPassage?.tw?.[currentSentenceIndex] as string,
            vi: article.translatedPassage?.vi?.[currentSentenceIndex] as string,
          },
          cardAudioUrl: article.audioUrl as string,
        };

        if (sentences) {
          startTransition(async () => {
            try {
              const res = await saveFlashcard(article.id, [], [sentences]);
              if (res.status === 200) {
                toast.success("Success", {
                  description: `You have saved sentences to flashcard`,
                  richColors: true,
                });
              } else if (res.status === 400) {
                toast.info("Sentence already saved", {
                  description: `${res?.message}`,
                  richColors: true,
                });
              }
            } catch (error: any) {
              toast.error("Something went wrong.", {
                description: "Your sentence was not saved. Please try again.",
                richColors: true,
              });
            }
          });
        }
      } else {
        toast.error("Something went wrong.", {
          description: "Your sentence was not saved. Please try again.",
          richColors: true,
        });
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 md:flex-row">
        <div id="onborda-audio" className="w-full">
          <audio
            ref={audioRef}
            src={getAudioUrl(article.audioUrl || "")}
          />
          <button
            type="button"
            className={cn(rpgButton(togglePlayer ? "iron" : "gold"), "w-full")}
            onClick={handleTogglePlayer}
          >
            {togglePlayer ? t("closeAudio") : t("audioButton")}
          </button>
        </div>
        <div id="onborda-translate" className="flex gap-2">
          <Select
            value={selectedLanguage}
            onValueChange={setSelectedLanguage}
            disabled={loading}
          >
            <SelectTrigger className="h-10 w-full" aria-label={t("translationLanguage")}>
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4" />
                <SelectValue>
                  <span className="text-lg">
                    {selectedLanguage === "th" && "🇹🇭"}
                    {selectedLanguage === "vi" && "🇻🇳"}
                    {selectedLanguage === "cn" && "🇨🇳"}
                    {selectedLanguage === "tw" && "🇹🇼"}
                  </span>
                </SelectValue>
              </div>
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-60 w-48">
              {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                <SelectItem key={code} value={code} className="w-full">
                  <span className="truncate">{name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="default"
            disabled={loading || currentSentenceIndex === -1}
            onClick={() => {
              isTranslateOpen
                ? setIsTranslateOpen(false)
                : setIsTranslateOpen(true);
              handleTranslate(currentSentenceIndex);
            }}
            className="flex items-center gap-2"
          >
            <>
              <Languages className="h-4 w-4" />
              {isTranslateOpen ? t("closeButton") : t("translate")}
            </>
          </Button>
        </div>
      </div>

      {togglePlayer && (
        <p
          role="note"
          className="rounded-lg border-2 border-dashed border-amber-500 bg-amber-50 px-3 py-2 text-center text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100"
        >
          {t("readAlongHint")}
        </p>
      )}

      {isTranslateOpen && translate && !togglePlayer && (
        <p aria-live="polite" className="text-center text-green-500">
          {translate}
        </p>
      )}

      <ReadAlongPassage
        sentences={sentences}
        passage={article.passage ?? ""}
        position={position}
        active={togglePlayer}
        currentSentenceRef={currentSentenceRef}
        renderBlockMedia={(blockIndex) => (
          <Image
            className="rounded-lg shadow-xl"
            src={getArticleImageUrl(article, blockIndex + 1) || `/nopic.png`}
            alt="Article Image"
            width={1024}
            height={1024}
          />
        )}
        onWordTap={handleWordTap}
        onTranslate={handleTranslateClick}
        translateLabel={t("translate")}
        translateDisabled={loading || currentSentenceIndex === -1}
      />

      {togglePlayer && (
        <>
          {/* Room for the fixed player bar on a phone. */}
          <div aria-hidden className="h-24 lg:hidden" />
          <ReadAlongPlayer
            playing={isPlaying}
            speed={speed}
            sentenceIndex={currentSentenceIndex}
            sentenceCount={sentences.length}
            onPlayPause={handlePlayPause}
            onPlaySentence={handlePlaySentence}
            onSpeedChange={handleSpeedTime}
          >
            {isTranslateOpen && translate && (
              <p aria-live="polite" className="text-center text-sm text-[#fff4dc]">
                {translate}
              </p>
            )}
          </ReadAlongPlayer>
        </>
      )}
    </div>
  );
}
