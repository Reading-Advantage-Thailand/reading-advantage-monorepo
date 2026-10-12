"use client";
import React, { useState, useEffect, useMemo, useRef, useTransition } from "react";
import { cn } from "@/lib/utils";
// import { createEmptyCard, Card } from "ts-fsrs";
import { Article } from "@/types";
import { Button } from "../ui/button";
import { Separator } from "@reading-advantage/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
  Languages,
  Loader2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { saveFlashcard } from "@/actions/flashcard";
import { toast } from "sonner";
import { fetchArticleActivity } from "@/actions/article";
import Image from "next/image";
import { getArticleImageUrl, getAudioUrl } from "@/lib/storage-config";
import { SEEK_EPSILON } from "@/lib/audio-highlight";
import { parseSentences } from "@/lib/read-along/align";
import { ReadAlongPassage } from "@/components/read-along/read-along-passage";
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
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [togglePlayer, setTogglePlayer] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [speed, setSpeed] = useState<string>("1");
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
  const [isControlsVisible, setIsControlsVisible] = useState<boolean>(true);
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState<boolean>(false);

  useEffect(() => {
    if (article.id) {
      fetchArticleActivity(article.id).catch(console.error);
    }
  }, [article.id]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (
      isPlaying &&
      currentSentenceIndex !== -1 &&
      currentSentenceRef.current &&
      !isAutoScrollPaused
    ) {
      const timeoutId = setTimeout(() => {
        currentSentenceRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [currentSentenceIndex, position.wordIndex, isPlaying, isAutoScrollPaused]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsControlsVisible(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: "-10px 0px -10px 0px",
      },
    );

    if (controlsRef.current) {
      observer.observe(controlsRef.current);
    }

    return () => {
      if (controlsRef.current) {
        observer.unobserve(controlsRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isScrolling = false;

    const handleScroll = () => {
      if (!isScrolling && isPlaying) {
        isScrolling = true;
        setIsAutoScrollPaused(true);

        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }

        scrollTimeoutRef.current = setTimeout(() => {
          setIsAutoScrollPaused(false);
          isScrolling = false;
        }, 3000);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      setIsAutoScrollPaused(false);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    }
  }, [isPlaying]);

  const shouldShowFixedControls =
    togglePlayer && isPlaying && !isControlsVisible;

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
      setSpeed("1");
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    } else {
      setTogglePlayer(true);
    }
  };

  const handleSpeedTime = (value: string) => {
    setSpeed(value);
    if (audioRef.current) {
      audioRef.current.playbackRate = Number(value);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !article) return;

    const handleLoadedMetadata = () => {
      audio.playbackRate = Number(speed);
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
    const audio = audioRef.current;
    const word = sentences[sentenceIndex]?.words[audioWordIndex];
    if (!audio || !word) return;
    audio.currentTime = Math.max(0, word.start - SEEK_EPSILON);
    select({ sentenceIndex, wordIndex: audioWordIndex });
    // Play at once to give the student feedback.
    if (togglePlayer) audio.play().catch(() => undefined);
  };

  const handleSaveToFlashcard = () => {
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
      <div ref={controlsRef} className="flex flex-col gap-2 md:flex-row">
        <div id="onborda-audio" className="w-full">
          <audio
            ref={audioRef}
            src={getAudioUrl(article.audioUrl || "")}
          />
          <Button
            variant="default"
            className="w-full"
            onClick={handleTogglePlayer}
          >
            {t("audioButton")}
          </Button>
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

      {shouldShowFixedControls && (
        <div className="bg-primary dark:bg-primary-foreground fixed right-0 bottom-(--bottom-nav-h) left-0 z-50 border-t p-4 shadow-lg transition-[background-color,box-shadow] duration-300 lg:bottom-0">
          <div className="mx-auto max-w-4xl space-y-3">
            {isTranslateOpen && (
              <div className="flex flex-col items-center justify-center border-b pb-3">
                <p aria-live="polite" className="text-primary-foreground dark:text-primary text-center">
                  {translate}
                </p>
              </div>
            )}

            {/* Main Controls */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-center md:gap-4">
              <div className="flex w-full items-center md:flex-grow">
                <Button
                  variant="default"
                  className="w-full"
                  onClick={handleTogglePlayer}
                >
                  {t("audioButton")}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedLanguage}
                  onValueChange={setSelectedLanguage}
                  disabled={loading}
                >
                  <SelectTrigger className="h-10 w-[70px] md:w-auto" aria-label={t("translationLanguage")}>
                    <div className="flex items-center gap-1 md:gap-2">
                      <Languages className="h-4 w-4 shrink-0" />
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
                  className="flex flex-1 items-center gap-2"
                >
                  <>
                    <Languages className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {isTranslateOpen ? t("closeButton") : t("translate")}
                    </span>
                  </>
                </Button>
              </div>
            </div>

            {/* Audio Player Controls */}
            {togglePlayer && (
              <div className="bg-primary text-primary-foreground rounded p-4">
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="secondary"
                    className="h-10 w-10 rounded-full p-0"
                    aria-label={t("seekBack")}
                  >
                    <SkipBackIcon />
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-10 w-10 rounded-full p-0"
                    onClick={handlePlayPause}
                    aria-label={isPlaying ? t("stopAudio") : t("playAudio")}
                  >
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-10 w-10 rounded-full p-0"
                    aria-label={t("seekForward")}
                  >
                    <SkipForwardIcon />
                  </Button>
                  <div>
                    <Select value={speed} onValueChange={handleSpeedTime}>
                      <SelectTrigger
                        className="border-muted-foreground w-20 border"
                        aria-label={t("playbackSpeed")}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        <SelectItem value="0.5">0.5x</SelectItem>
                        <SelectItem value="0.75">0.75x</SelectItem>
                        <SelectItem value="1">1x</SelectItem>
                        <SelectItem value="1.25">1.25x</SelectItem>
                        <SelectItem value="1.5">1.5x</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add padding when fixed controls are shown */}
      {shouldShowFixedControls && (
        <div
          className={cn(
            "pb-4",
            togglePlayer && isTranslateOpen
              ? "h-52"
              : togglePlayer
                ? "h-36"
                : isTranslateOpen
                  ? "h-32"
                  : "h-20",
          )}
        ></div>
      )}

      {/* Keep normal audio player when not fixed */}
      {togglePlayer && !shouldShowFixedControls && (
        <div
          id="audioPlayer"
          className="bg-primary text-primary-foreground my-2 rounded p-4 transition-all duration-300"
        >
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="secondary"
              className="h-10 w-10 rounded-full p-0"
              aria-label={t("seekBack")}
            >
              <SkipBackIcon />
            </Button>
            <Button
              id="playPauseButton"
              variant="secondary"
              className="h-10 w-10 rounded-full p-0"
              onClick={handlePlayPause}
              aria-label={isPlaying ? t("stopAudio") : t("playAudio")}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </Button>
            <Button
              variant="secondary"
              className="h-10 w-10 rounded-full p-0"
              aria-label={t("seekForward")}
            >
              <SkipForwardIcon />
            </Button>
            <div>
              <Select value={speed} onValueChange={handleSpeedTime}>
                <SelectTrigger
                  className="border-muted-foreground w-20 border"
                  aria-label={t("playbackSpeed")}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="0.5">0.5x</SelectItem>
                  <SelectItem value="0.75">0.75x</SelectItem>
                  <SelectItem value="1">1x</SelectItem>
                  <SelectItem value="1.25">1.25x</SelectItem>
                  <SelectItem value="1.5">1.5x</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Keep normal translate when not fixed */}
      {isTranslateOpen && !shouldShowFixedControls && (
        <div className="flex h-32 flex-col items-center justify-between transition-all duration-300 md:h-24">
          <Separator />
          <p className="text-center text-green-500">{translate}</p>
          <Separator />
        </div>
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
            unoptimized
          />
        )}
        onWordTap={handleWordTap}
        onTranslate={handleTranslateClick}
        translateLabel={t("translate")}
        translateDisabled={loading || currentSentenceIndex === -1}
      />
    </div>
  );
}
