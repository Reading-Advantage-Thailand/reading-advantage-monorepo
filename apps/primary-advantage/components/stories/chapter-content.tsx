"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import { ReadAlongPassage } from "@/components/read-along/read-along-passage";
import { ReadAlongPlayer } from "@/components/read-along/read-along-player";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFollowScroll } from "@/hooks/use-follow-scroll";
import { useReadAlong } from "@/hooks/use-read-along";
import { parseSentences } from "@/lib/read-along/align";
import { seekTimeForWord } from "@/lib/read-along/position";
import { getAudioUrl } from "@/lib/storage-config";
import { toTranslationLanguage } from "@/lib/translation-language";
import { cn } from "@/lib/utils";
import { rpgButton } from "@/components/rpg/chrome";

type ChapterContentProps = {
  /** The chapter title, used for the picture alt text. */
  title: string;
  /** The plain passage, shown when the chapter has no sentence timings. */
  passage: string;
  /** Raw sentence timings from `getChapterForStudent`; the parser validates them. */
  sentences: unknown;
  /** Sentence translations by language code (`th`, `cn`, `tw`, `vi`), or null. */
  translatedPassage: Record<string, string[]> | null;
  /** The audio key in the bucket, or null when the chapter has no audio. */
  audioKey: string | null;
  /** The chapter picture URL. */
  imageUrl: string;
  /** The picture alt text. */
  imageAlt: string;
};

const SUPPORTED_LANGUAGES = {
  th: "🇹🇭 Thai",
  vi: "🇻🇳 Vietnamese",
  cn: "🇨🇳 Chinese (Simplified)",
  tw: "🇹🇼 Chinese (Traditional)",
};

/**
 * The read-along body of a story chapter: the chapter picture, the listen-and-read-along
 * player, the translation picker, and the passage. The host owns the audio element and the
 * player and drives the shared `ReadAlongPassage`, the same integration the article page
 * uses (spec D7 deviation: the shared component takes host-owned audio props
 * `{ sentences, passage, position, active, ... }`, not `{ audioUrl, translations }`).
 * @param props The chapter text, timings, translations, audio key, and picture.
 * @returns The chapter reading panel.
 */
export function ChapterContent({
  title,
  passage,
  sentences: rawSentences,
  translatedPassage,
  audioKey,
  imageUrl,
  imageAlt,
}: ChapterContentProps) {
  const locale = useLocale();
  const t = useTranslations("Components");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentSentenceRef = useRef<HTMLSpanElement | null>(null);
  const [togglePlayer, setTogglePlayer] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const sentences = useMemo(() => parseSentences(rawSentences), [rawSentences]);
  const { position, isPlaying, select, reset } = useReadAlong({ audioRef, sentences });
  const currentSentenceIndex = position.sentenceIndex;
  const [translate, setTranslate] = useState<string>("");
  const [isTranslateOpen, setIsTranslateOpen] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    toTranslationLanguage(locale),
  );
  const { resume: resumeFollow } = useFollowScroll({
    targetRef: currentSentenceRef,
    enabled: isPlaying,
    sentenceIndex: currentSentenceIndex,
  });

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const handlePlayPause = async () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        try {
          await audioRef.current.play();
        } catch {
          /* The player bar already shows the state. */
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
    if (!audio) return;
    const handleLoadedMetadata = () => {
      audio.playbackRate = speed;
    };
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [audioKey, speed]);

  const handleTranslate = (sentenceIndex: number) => {
    if (selectedLanguage) {
      setTranslate(translatedPassage?.[selectedLanguage]?.[sentenceIndex] || "");
    } else if (sentenceIndex !== -1) {
      setTranslate(sentences[sentenceIndex]?.sentence || "");
    } else {
      setTranslate("");
    }
  };

  const handleTranslateClick = (sentenceIndex: number) => {
    select({ sentenceIndex, wordIndex: -1 });
    setIsTranslateOpen(true);
    handleTranslate(sentenceIndex);
  };

  useEffect(() => {
    handleTranslate(currentSentenceIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSentenceIndex, selectedLanguage]);

  const handleWordTap = (sentenceIndex: number, audioWordIndex: number) => {
    const audio = audioRef.current;
    const sentence = sentences[sentenceIndex];
    if (!audio || !sentence) return;
    resumeFollow();
    audio.currentTime = seekTimeForWord(sentence, audioWordIndex);
    select({ sentenceIndex, wordIndex: sentence.words[audioWordIndex] ? audioWordIndex : -1 });
    if (togglePlayer) audio.play().catch(() => undefined);
  };

  /** Plays from the start of a sentence entry; the player buttons use it. */
  const handlePlaySentence = (sentenceIndex: number) => handleWordTap(sentenceIndex, -1);

  return (
    <div className="flex flex-col gap-4">
      <Image
        className="mx-auto rounded-lg shadow-xl"
        src={imageUrl}
        alt={imageAlt || title}
        width={1024}
        height={1024}
        unoptimized
      />
      <div className="flex flex-col gap-2 md:flex-row">
        <div className="w-full">
          <audio ref={audioRef} src={audioKey ? getAudioUrl(audioKey) : undefined} />
          <button
            type="button"
            className={cn(rpgButton(togglePlayer ? "iron" : "gold"), "w-full")}
            disabled={!audioKey}
            onClick={handleTogglePlayer}
          >
            {togglePlayer ? t("closeAudio") : t("audioButton")}
          </button>
        </div>
        <div className="flex gap-2">
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
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
            disabled={currentSentenceIndex === -1}
            onClick={() => {
              isTranslateOpen ? setIsTranslateOpen(false) : setIsTranslateOpen(true);
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
        passage={passage}
        position={position}
        active={togglePlayer}
        currentSentenceRef={currentSentenceRef}
        onWordTap={handleWordTap}
        onTranslate={handleTranslateClick}
        translateLabel={t("translate")}
        translateDisabled={currentSentenceIndex === -1}
      />

      {togglePlayer && (
        <>
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
