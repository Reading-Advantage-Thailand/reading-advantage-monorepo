"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Article } from "./models/article-model";
import { cn, splitTextIntoSentences } from "@/lib/utils";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { createEmptyCard, Card } from "ts-fsrs";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./ui/context-menu";

import { toast } from "./ui/use-toast";
import {
  PlayIcon,
  ResumeIcon,
  PauseIcon,
  TrackNextIcon,
  TrackPreviousIcon,
  ChevronDownIcon,
} from "@radix-ui/react-icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import useAudio from "@/hooks/article-content/useAudio";

type Props = {
  article: Article;
  articleId: string;
  userId: string;
  className?: string;
};

type Sentence = {
  sentence: string;
  index: number;
  startTime: number;
  endTime: number;
  audioUrl: string;
};

async function getTranslateSentence(
  articleId: string,
  targetLanguage: string,
): Promise<{ message: string; translated_sentences: string[] }> {
  try {
    const res = await fetch(`/api/v1/assistant/translate/${articleId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: "passage", targetLanguage }),
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error translating sentences:", error);
    return { message: "error", translated_sentences: [] };
  }
}

export default function ArticleContent({
  article,
  className = "",
  userId,
}: Props) {
  const t = useScopedI18n("components.articleContent");
  // Always split passage into sentences
  const sentences = splitTextIntoSentences(article.passage, true);
  const [selectedSentence, setSelectedSentence] = React.useState<Number>(-1);
  const [loading, setLoading] = React.useState(false);
  const [translate, setTranslate] = React.useState<string[]>([]);
  const [isTranslate, setIsTranslate] = React.useState(false);
  const [isTranslateOpen, setIsTranslateOpen] = React.useState(false);
  const locale = useCurrentLocale();

  // Use article.id as cache key to ensure consistency between server and client renders
  const cacheKey = useMemo(() => article.id, [article.id]);

  const sentenceList: Sentence[] = useMemo(
    () =>
      Array.isArray(article.timepoints) && article.timepoints.length > 0
        ? article.timepoints.map((timepoint, index) => {
            const endTime =
              index < article.timepoints!.length - 1
                ? article.timepoints![index + 1].timeSeconds - 0.3
                : timepoint.timeSeconds + 10;

            // Generate the correct audio URL with cache busting
            const audioUrl = timepoint.file
              ? `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/tts/${timepoint.file}?v=${cacheKey}`
              : `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/tts/${article.id}.mp3?v=${cacheKey}`;

            // Use timepoint.sentences if available (new format), otherwise use split sentences (old format)
            const sentenceText = timepoint.sentences || sentences[index] || "";

            return {
              sentence: sentenceText,
              index: index,
              startTime: timepoint.timeSeconds,
              endTime,
              audioUrl,
            };
          })
        : sentences.map((sentence, index) => ({
            sentence,
            index,
            startTime: index * 2,
            endTime: (index + 1) * 2,
            audioUrl: `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/tts/${article.id}.mp3?v=${cacheKey}`,
          })),
    [article.timepoints, article.id, sentences, cacheKey],
  );
  const {
    handleAudioEnded,
    handleNextTrack,
    handlePreviousTrack,
    handlePlayPause,
    handleSentenceClick,
    handleSpeedTime,
    handleTimeUpdate,
    handleTogglePlayer,
    audioRef,
    currentAudioIndex,
    isPlaying,
    selectedIndex,
    speed,
    togglePlayer,
    setCurrentAudioIndex,
    setIsPlaying,
    setSelectedIndex,
  } = useAudio(sentenceList);

  const getHighlightedClass = (index: number) =>
    cn(
      "cursor-pointer text-muted-foreground hover:bg-blue-200 hover:dark:bg-blue-900 hover:text-primary rounded-md",
      currentAudioIndex === index &&
        isPlaying &&
        "bg-red-200 dark:bg-red-900 text-primary",
    );

  const renderSentence = (sentence: string, i: number) => {
    if (!sentence) {
      return "";
    }

    return sentence.split("~~").map((line, index, array) => (
      <span
        key={index}
        onClick={() => {
          setSelectedSentence(i);
          setSelectedIndex(i);
        }}
      >
        {line}
        {(index !== array.length - 1 || /[.!?]$/.test(line)) && " "}
        {index !== array.length - 1 && <div className="mt-3" />}
      </span>
    ));
  };

  const saveToFlashcard = async () => {
    try {
      let targetIndex = selectedSentence as number;
      // Fall back to currently highlighted sentence
      if (targetIndex === -1) {
        if (selectedIndex !== -1) {
          targetIndex = selectedIndex;
        } else if (isPlaying && currentAudioIndex !== -1) {
          targetIndex = currentAudioIndex;
        }
      }

      if (targetIndex === -1) {
        toast({
          title: "No sentence selected",
          description: "Please select a sentence first.",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);
      let card: Card = createEmptyCard();
      let endTimepoint = sentenceList[targetIndex].endTime;

      // Get translations for all supported languages
      const supportedLanguages = ["th", "zh-CN", "zh-TW", "vi"];
      const translationObj: Record<string, string> = {};

      // Check if we already have cached translations
      const translatedPassage = article.translatedPassage as Record<
        string,
        string[]
      > | null;

      // Fetch translations for languages that aren't cached
      const translationPromises = supportedLanguages.map(async (lang) => {
        // Check cache first
        if (translatedPassage && translatedPassage[lang]) {
          translationObj[lang] =
            translatedPassage[lang][targetIndex];
          return;
        }

        // Fetch translation if not cached
        try {
          const response = await getTranslateSentence(article.id, lang);
          if (response.message !== "error" && response.translated_sentences) {
            translationObj[lang] =
              response.translated_sentences[targetIndex];
          }
        } catch (error) {
          console.warn(`Failed to translate to ${lang}:`, error);
        }
      });

      await Promise.all(translationPromises);

      // Ensure we have at least one translation
      if (Object.keys(translationObj).length === 0) {
        toast({
          title: "Translation failed",
          description: "Could not translate the sentence. Please try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const resSaveSentences = await fetch(
        `/api/v1/users/sentences/${userId}`,
        {
          method: "POST",
          body: JSON.stringify({
            sentence: sentenceList[targetIndex].sentence.replace(
              "~~",
              "",
            ),
            sn: targetIndex,
            articleId: article.id,
            translation: translationObj,
            audioUrl: sentenceList[targetIndex].audioUrl,
            timepoint: sentenceList[targetIndex].startTime,
            endTimepoint: endTimepoint,
            saveToFlashcard: true,
            ...card,
          }),
        },
      );

      if (resSaveSentences.status === 200) {
        toast({
          title: "Success",
          description: `You have saved "${sentenceList[
            targetIndex
          ].sentence.replace("~~", "")}" to flashcard`,
        });
      } else if (resSaveSentences.status === 400) {
        toast({
          title: "Sentence already saved",
          description: "You have already saved this sentence.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Something went wrong.",
        description: "Your sentence was not saved. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  async function handleTranslateSentence() {
    setLoading(true);
    type ExtendedLocale = "th" | "cn" | "tw" | "vi" | "zh-CN" | "zh-TW";
    let targetLanguage: ExtendedLocale = locale as ExtendedLocale;
    switch (locale) {
      case "cn":
        targetLanguage = "zh-CN";
        break;
      case "tw":
        targetLanguage = "zh-TW";
        break;
    }

    const translatedPassage = article.translatedPassage as Record<
      string,
      string[]
    > | null;

    if (translatedPassage && translatedPassage[targetLanguage]) {
      setTranslate(translatedPassage[targetLanguage]);
      setIsTranslateOpen(!isTranslateOpen);
      setIsTranslate(true);
      setLoading(false);
      return;
    }
    const response = await getTranslateSentence(article.id, targetLanguage);
    if (response.message === "error") {
      setIsTranslate(false);
      setIsTranslateOpen(false);
      setLoading(false);
      toast({
        title: "Something went wrong.",
        description: "Your sentence was not translated. Please try again.",
        variant: "destructive",
      });
      return;
    } else {
      setTranslate(response.translated_sentences);
      setIsTranslateOpen(!isTranslateOpen);
      setIsTranslate(true);
      setLoading(false);
    }
  }

  const handleTranslate = async () => {
    if (isTranslate === false) {
      await handleTranslateSentence();
    } else {
      setIsTranslateOpen(!isTranslateOpen);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    setSelectedIndex(-1);
    if (audio && sentenceList[currentAudioIndex]) {
      // Use the URL from sentenceList (already has cache busting)
      audio.src = sentenceList[currentAudioIndex].audioUrl;
      audio.load();

      const handleLoadedMetadata = () => {
        audio.currentTime = sentenceList[currentAudioIndex].startTime;
        audio.playbackRate = Number(speed);

        if (isPlaying) {
          audio.play().catch((error) => {
            console.error("Playback error:", error);
          });
        }
      };

      audio.addEventListener("loadedmetadata", handleLoadedMetadata);

      return () => {
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.pause();
      };
    }
  }, [currentAudioIndex, speed]);

  // Reset audio player when article changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentAudioIndex(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
    }
  }, [article.id]);

  return (
    <div>
      <div className="flex justify-center items-center my-2 gap-4">
        <div id="onborda-audio" className="flex flex-grow items-center">
          <Button
            variant="default"
            className="w-full"
            onClick={handleTogglePlayer}
          >
            {t("openvoicebutton")}
          </Button>
        </div>
        <div id="onborda-translate">
          <Button
            variant="default"
            onClick={handleTranslate}
            disabled={loading}
          >
            {loading
              ? "Loading"
              : isTranslate && isTranslateOpen
                ? t("translateButton.close")
                : t("translateButton.open")}
          </Button>
        </div>
      </div>
      {togglePlayer && (
        <div
          id="audioPlayer"
          className="p-4 rounded my-2 bg-primary text-primary-foreground"
        >
          <div className="flex justify-between items-center gap-2">
            <Button
              variant="secondary"
              className="rounded-full w-10 h-10 p-0"
              onClick={handlePreviousTrack}
            >
              <TrackPreviousIcon />
            </Button>
            <Button
              id="playPauseButton"
              variant="secondary"
              className="rounded-full w-10 h-10 p-0"
              onClick={handlePlayPause}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </Button>
            <Button
              variant="secondary"
              className="rounded-full w-10 h-10 p-0"
              onClick={handleNextTrack}
            >
              <TrackNextIcon />
            </Button>
            <div>
              <Select defaultValue="1" onValueChange={handleSpeedTime}>
                <SelectTrigger className="w-20">
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

      {/* show ที่แปลภาษาทีละประโยค */}
      {isTranslate && isTranslateOpen && (
        <div className="h-32 md:h-24 flex flex-col justify-between items-center">
          <Separator />
          {/* กรณีกดเล่นเสียง และกดแปล */}
          {isPlaying === true ? (
            <p className="text-center text-green-500">
              {translate[currentAudioIndex]}
            </p>
          ) : (
            <p className="text-center text-green-500">
              {translate[selectedIndex]}
            </p>
          )}
          <Separator />
        </div>
      )}
      <ContextMenu>
        <ContextMenuTrigger className="no-select">
          {sentenceList.map((sentence, index) => (
            <span
              id="onborda-savesentences"
              key={`sentence-${index}`}
              className={cn(
                selectedIndex === index && "bg-blue-200 dark:bg-blue-900",
                `${getHighlightedClass(index)}`,
              )}
              onClick={() => {
                handleSentenceClick(sentence.startTime, index);
              }}
            >
              {renderSentence(sentence.sentence, index)}
            </span>
          ))}
          <audio
            ref={audioRef}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleAudioEnded}
          >
            <source src={sentenceList[currentAudioIndex].audioUrl} />
          </audio>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          {loading ? (
            <ContextMenuItem inset disabled>
              Loading
            </ContextMenuItem>
          ) : (
            <>
              <ContextMenuItem
                inset
                onClick={() => {
                  saveToFlashcard();
                }}
                disabled={loading}
              >
                Save to flashcard
              </ContextMenuItem>
              <ContextMenuItem
                inset
                onClick={handleTranslate}
                disabled={loading}
              >
                Translate
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

    </div>
  );
}
