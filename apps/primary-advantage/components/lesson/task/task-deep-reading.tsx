import { Article, SentenceTimepoint } from "@/types";
import React, { useEffect, useRef, useState } from "react";
import {
  Book,
  PauseIcon,
  PlayIcon,
  Settings,
  RotateCcwIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { getArticleImageUrl, getAudioUrl } from "@/lib/storage-config";
import { useTranslations } from "next-intl";

export default function TaskFirstReading({ article }: { article: Article }) {
  const t = useTranslations("Lesson.Reading");
  const [readingSpeed, setReadingSpeed] = useState("1");
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(-1);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(-1);
  const currentSentenceRef = useRef<HTMLSpanElement | null>(null);
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [selectedSentence, setSelectedSentence] = useState<number | null>(null);
  const sentenceRefs = useRef<{ [key: number]: HTMLElement | null }>({});

  const paragraphs = article.passage
    .split("\n\n")
    .filter((p) => p.trim() !== "");

  // useEffect(() => {
  //   // Initialize audio
  //   if (article.audioUrl) {
  //     // ใช้ URL แบบเดียวกันกับ phase2-vocabulary-preview
  //     let fullAudioUrl = getAudioUrl(article.audioUrl);

  //     console.log("fullAudioUrl", fullAudioUrl);

  //     // เพิ่มการตรวจสอบ URL format
  //     // if (!fullAudioUrl.startsWith("http")) {
  //     //   fullAudioUrl = `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/${AUDIO_URL}/${audioUrl}`;
  //     // }

  //     const audio = new Audio(fullAudioUrl);
  //     audio.preload = "metadata";
  //     audio.onloadeddata = () => {
  //       setIsAudioLoaded(true);
  //     };
  //     audio.onerror = () => {
  //       console.error(`Audio failed to load: ${fullAudioUrl}`);
  //       setIsAudioLoaded(false);
  //     };
  //     audioRef.current = audio;
  //   }

  //   return () => {
  //     if (audioRef.current) {
  //       audioRef.current.pause();
  //     }
  //   };
  // }, [article.audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !article) return;

    const handleLoadedMetadata = () => {
      audio.playbackRate = Number(readingSpeed);
    };

    audio.addEventListener("timeupdate", handleLoadedMetadata);

    return () => {
      audio.removeEventListener("timeupdate", handleLoadedMetadata);
    };
  }, [readingSpeed]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
        handleTimeUpdate();
      }
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;

    const newCurrentTime = audio.currentTime;

    const sentences = article.sentences as SentenceTimepoint[];

    let foundSentenceIndex = -1;
    let foundWordIndex = -1;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];

      if (
        newCurrentTime >= sentence.startTime &&
        newCurrentTime <= sentence.endTime
      ) {
        foundSentenceIndex = i;

        const isNewSentence = foundSentenceIndex !== currentSentenceIndex;

        if (isNewSentence) {
          foundWordIndex = 0;
        } else {
          for (let j = 0; j < sentence.words.length; j++) {
            const word = sentence.words[j];

            if (newCurrentTime >= word.start && newCurrentTime < word.end) {
              foundWordIndex = j;
              break;
            }
          }
        }
        break;
      }
    }

    if (foundSentenceIndex !== -1) {
      setCurrentSentenceIndex(foundSentenceIndex);
    }

    if (
      newCurrentTime === 0 ||
      (audioRef.current && newCurrentTime >= audioRef.current.duration)
    ) {
      foundWordIndex = -1;
    }

    if (foundWordIndex !== -1 && foundWordIndex !== currentWordIndex) {
      const wordDifference = foundWordIndex - currentWordIndex;

      if (wordDifference > 1 && currentWordIndex >= 0) {
        let intermediateIndex = currentWordIndex + 1;

        const highlightIntermediateWords = () => {
          if (intermediateIndex < foundWordIndex) {
            setCurrentWordIndex(intermediateIndex);
            intermediateIndex++;

            setTimeout(highlightIntermediateWords, 100);
          } else {
            setCurrentWordIndex(foundWordIndex);
          }
        };

        highlightIntermediateWords();
      } else {
        setCurrentWordIndex(foundWordIndex);
      }
    }
  };

  const handleWordClick = async (
    sentenceIndex: number,
    wordIndex: number,
    sentence: SentenceTimepoint,
  ) => {
    if (wordIndex !== -1 && audioRef.current && sentence.words[wordIndex]) {
      // Set the audio time
      const startTime = sentence.words[wordIndex].start - 0.1;
      audioRef.current.currentTime = startTime;

      setCurrentSentenceIndex(sentenceIndex);
      setCurrentWordIndex(wordIndex);
    }
  };

  // Handle translation toggle
  const handleTranslationToggle = () => {
    const newShowTranslation = !showTranslation;
    setShowTranslation(newShowTranslation);
  };

  console.log(article);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* ลบ modal overlay ออก */}
      {/* Header Section */}
      <div className="space-y-4 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-300 via-teal-300 to-cyan-300 p-8 text-center dark:border-emerald-800 dark:from-emerald-950 dark:via-teal-950 dark:to-cyan-950">
        <div className="mb-4 inline-flex items-center justify-center rounded-full bg-emerald-100 p-3 dark:bg-emerald-900">
          <Book className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("deepTitle")}
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
          {t("subtitle")}
        </p>
      </div>

      {/* Reading Controls */}
      <div className="rounded-2xl border border-gray-200 bg-zinc-200 p-6 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-wrap items-center gap-6">
          {/* Play/Pause Button */}
          <audio
            ref={audioRef}
            src={getAudioUrl(article.audioUrl || "")}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => {
              setIsPlaying(false);
              setCurrentWordIndex(-1);
              setCurrentSentenceIndex(-1);
            }}
          />
          <Button
            onClick={handlePlayPause}
            size="lg"
            className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 text-white hover:from-emerald-600 hover:to-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPlaying ? (
              <PauseIcon className="mr-2 h-5 w-5" />
            ) : (
              <PlayIcon className="mr-2 h-5 w-5" />
            )}
            {isPlaying
              ? t("controls.pause")
              : isAudioLoaded
                ? t("controls.play")
                : t("controls.loading")}
          </Button>

          {/* Reading Speed Control */}
          <div className="flex items-center gap-3">
            <Settings className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t("controls.speed")}
            </span>
            <Select value={readingSpeed} onValueChange={setReadingSpeed}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">0.5x</SelectItem>
                <SelectItem value="0.75">0.75x</SelectItem>
                <SelectItem value="1">1x</SelectItem>
                <SelectItem value="1.25">1.25x</SelectItem>
                <SelectItem value="1.5">1.5x</SelectItem>
                <SelectItem value="2">2x</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Translation Toggle */}
          <Button
            variant={showTranslation ? "default" : "outline"}
            size="sm"
            onClick={handleTranslationToggle}
            className={showTranslation ? "bg-blue-500 hover:bg-blue-600" : ""}
          >
            {showTranslation ? "🌐 " : "🌍 "}
            {showTranslation ? t("translation.on") : t("translation.off")}
          </Button>

          {/* Highlight Toggle */}
          {/* <Button
            variant={highlightMode ? "default" : "outline"}
            size="sm"
            onClick={() => setHighlightMode(!highlightMode)}
            className={highlightMode ? "bg-yellow-500 hover:bg-yellow-600" : ""}
          >
            {highlightMode ? "🔆" : "🔅"} {t("highlight")}{" "}
            {highlightMode ? t("on") : t("off")}
          </Button> */}

          {/* Reset Progress Button (only show when completed) */}
          {/* {hasCompletedReading && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetReadingProgress}
              className="border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800"
            >
              <RotateCcwIcon className="mr-1 h-4 w-4" />
              {t("listenAgain")}
            </Button>
          )} */}
        </div>
      </div>

      {/* Reading Content */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-zinc-200 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <div className="max-w-none p-4 sm:p-8 lg:p-12">
          {/* Translation overlay inside content */}
          {showTranslation &&
            selectedSentence !== null &&
            article.sentences?.[selectedSentence] && (
              <div className="pointer-events-none absolute inset-0 z-[100]">
                <div
                  className="pointer-events-auto absolute rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 text-sm text-white shadow-2xl dark:border-gray-300 dark:bg-gray-200 dark:text-gray-800"
                  style={(() => {
                    const sentenceElement =
                      sentenceRefs.current[selectedSentence];
                    if (!sentenceElement) return { display: "none" };

                    const rect = sentenceElement.getBoundingClientRect();
                    const containerElement = sentenceElement.closest(
                      ".bg-white, .dark\\:bg-gray-900",
                    );
                    const containerRect =
                      containerElement?.getBoundingClientRect();

                    if (!containerRect) return { display: "none" };

                    // คำนวณตำแหน่งสัมพันธ์กับ container
                    const relativeTop = rect.top - containerRect.top;
                    const relativeLeft =
                      rect.left - containerRect.left + rect.width / 2;

                    return {
                      top: `${Math.max(10, relativeTop - 120)}px`, // ลอยบนประโยค 120px
                      left: `${relativeLeft}px`,
                      transform: "translateX(-50%)",
                      width: "min(calc(100% - 40px), 350px)",
                      maxHeight: "calc(100% - 40px)",
                      overflow: "auto",
                    };
                  })()}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="font-medium text-yellow-300 dark:text-blue-600">
                      {t("translation.title")}
                    </div>
                    <button
                      className="ml-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white transition-colors hover:bg-red-600"
                      onClick={() => setSelectedSentence(null)}
                    >
                      ×
                    </button>
                  </div>
                  <div className="leading-relaxed text-wrap">
                    {article.translatedPassage?.th?.[selectedSentence]}
                  </div>
                </div>
              </div>
            )}
          {/* Article Title - Book style with responsive sizing */}
          <h2 className="mb-6 text-center font-serif text-2xl leading-tight font-bold tracking-normal text-gray-900 sm:mb-8 sm:text-3xl sm:tracking-wide lg:mb-12 lg:text-4xl dark:text-white">
            {article.title}
          </h2>

          {/* Reading Text - Book-like layout following the design example */}
          <div className="text-gray-800 dark:text-gray-200">
            {(() => {
              if (!Array.isArray(article.sentences)) {
                // Fallback to original paragraphs if no sentences
                return paragraphs.map((p, index) => (
                  <p
                    key={index}
                    className="font-article mb-2 indent-4 text-lg hyphens-auto whitespace-pre-wrap"
                  >
                    {p}
                  </p>
                ));
              }

              // Group sentences back into original paragraphs
              const groupSentencesIntoParagraphs = () => {
                const paragraphGroups: {
                  paragraph: string;
                  sentences: number[];
                }[] = [];
                let currentParagraphText = "";
                let currentSentenceIndices: number[] = [];

                // Reconstruct paragraph structure by checking which sentences belong to which paragraph
                paragraphs.forEach((paragraph) => {
                  const paragraphSentences: number[] = [];

                  article.sentences?.forEach((sentence, sentenceIndex) => {
                    if (paragraph.includes(sentence.sentence.trim())) {
                      paragraphSentences.push(sentenceIndex);
                    }
                  });

                  if (paragraphSentences.length > 0) {
                    paragraphGroups.push({
                      paragraph,
                      sentences: paragraphSentences,
                    });
                  }
                });

                return paragraphGroups;
              };

              const paragraphGroups = groupSentencesIntoParagraphs();

              return paragraphGroups.map((group, groupIndex) => {
                return (
                  <div key={groupIndex} className="flex flex-col gap-4">
                    <Image
                      className="rounded-lg shadow-xl"
                      src={
                        getArticleImageUrl(article.id, groupIndex + 1) ||
                        `/nopic.png`
                      }
                      alt="Article Image"
                      width={640}
                      height={640}
                      unoptimized
                    />
                    <p className="mb-4 indent-8 whitespace-pre-wrap">
                      {group.sentences.map((sentenceIndex) => {
                        const sentence = article.sentences?.[sentenceIndex];
                        const isCurrentSentence =
                          sentenceIndex === currentSentenceIndex;

                        return (
                          <span
                            key={sentenceIndex}
                            ref={(el) => {
                              sentenceRefs.current[sentenceIndex] = el;
                              if (isCurrentSentence) {
                                currentSentenceRef.current = el;
                              }
                            }}
                            className={`font-article rounded px-0.5 text-lg transition-all duration-200 md:text-xl ${
                              sentenceIndex === currentSentenceIndex
                                ? "bg-blue-300 dark:bg-blue-900/70"
                                : ""
                            } ${showTranslation ? "cursor-pointer hover:bg-yellow-200 dark:hover:bg-yellow-900/30" : ""}`}
                            onClick={(e) => {
                              if (showTranslation) {
                                e.stopPropagation();
                                setSelectedSentence(sentenceIndex);
                              }
                            }}
                          >
                            {(() => {
                              // ... existing word rendering logic ...
                              const parts = sentence?.sentence.split(
                                /(\s+|[.!?;:,"""''`()[\]{}—–\u2013\u2014\u2026]+)/,
                              );
                              let wordIndex = 0;

                              const mergedParts = [];
                              for (let i = 0; i < (parts?.length ?? 0); i++) {
                                const current = parts?.[i];
                                const next = parts?.[i + 1];
                                const after = parts?.[i + 2];

                                if (
                                  current &&
                                  /^\w+$/.test(current) &&
                                  (next === "'" || next === "'") &&
                                  after &&
                                  /^[a-z]+$/i.test(after) &&
                                  (after.toLowerCase() === "t" ||
                                    after.toLowerCase() === "s" ||
                                    after.toLowerCase() === "re" ||
                                    after.toLowerCase() === "ll" ||
                                    after.toLowerCase() === "ve" ||
                                    after.toLowerCase() === "d" ||
                                    after.toLowerCase() === "m")
                                ) {
                                  mergedParts.push(current + next + after);
                                  i += 2;
                                } else {
                                  mergedParts.push(current);
                                }
                              }

                              return mergedParts.map((part, partIndex) => {
                                const isActualWord =
                                  /[\w]/.test(part ?? "") &&
                                  /^[\w'-]+$/.test(part ?? "") &&
                                  part?.trim() !== "";

                                const currentPartWordIndex = isActualWord
                                  ? wordIndex
                                  : -1;

                                if (isActualWord) {
                                  wordIndex++;
                                }

                                const isCurrentWord =
                                  sentenceIndex === currentSentenceIndex &&
                                  currentPartWordIndex !== -1 &&
                                  currentPartWordIndex === currentWordIndex &&
                                  isActualWord;

                                return (
                                  <span
                                    key={partIndex}
                                    className={cn(
                                      isActualWord && !showTranslation
                                        ? "cursor-pointer rounded transition-colors duration-150"
                                        : "",
                                      isCurrentWord
                                        ? "bg-blue-500 text-white"
                                        : isActualWord && !showTranslation
                                          ? "hover:bg-blue-200 dark:hover:bg-blue-900/50"
                                          : "",
                                    )}
                                    onClick={(e) => {
                                      if (!showTranslation && isActualWord) {
                                        e.stopPropagation();
                                        handleWordClick(
                                          sentenceIndex,
                                          currentPartWordIndex,
                                          sentence as SentenceTimepoint,
                                        );
                                      }
                                    }}
                                  >
                                    {part}
                                  </span>
                                );
                              });
                            })()}
                          </span>
                        );
                      })}
                    </p>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Progress Bar - maintains progress and doesn't decrease */}
        {/* <div className="px-4 pb-4 sm:px-8 sm:pb-6">
          <div className="h-3 rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                hasCompletedReading
                  ? "bg-gradient-to-r from-green-500 to-emerald-600"
                  : "bg-gradient-to-r from-emerald-500 to-teal-600"
              }`}
              style={{
                width: `${
                  sentences.length > 0
                    ? hasCompletedReading
                      ? 100
                      : ((currentSentence + 1) / sentences.length) * 100
                    : 0
                }%`,
              }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-gray-600 sm:text-sm dark:text-gray-400">
            <span
              className={`font-medium ${hasCompletedReading ? "text-green-600 dark:text-green-400" : ""}`}
            >
              {t("sentenceProgress", {
                current: hasCompletedReading
                  ? sentences.length
                  : Math.min(currentSentence + 1, sentences.length),
                total: sentences.length,
              })}
            </span>
            <span
              className={`flex items-center gap-1 font-medium ${hasCompletedReading ? "text-green-600 dark:text-green-400" : ""}`}
            >
              {sentences.length > 0
                ? hasCompletedReading
                  ? 100
                  : Math.round(((currentSentence + 1) / sentences.length) * 100)
                : 0}
              {t("percentComplete")}
              {hasCompletedReading && (
                <span className="text-green-500">🎉</span>
              )}
            </span>
          </div>
        </div> */}
      </div>

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

      {/* Completion Status */}
      {/* {sentences.length > 0 && (
        <div
          className={`rounded-xl border p-4 transition-all duration-500 ${
            hasCompletedReading
              ? "border-green-200 bg-gradient-to-r from-green-300 to-emerald-300 dark:border-green-800 dark:from-green-950 dark:to-emerald-950"
              : "border-orange-200 bg-gradient-to-r from-orange-300 to-yellow-300 dark:border-orange-800 dark:from-orange-950 dark:to-yellow-950"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`h-3 w-3 rounded-full ${
                hasCompletedReading
                  ? "animate-pulse bg-green-500"
                  : "bg-orange-500"
              }`}
            ></div>
            <span
              className={`font-medium ${
                hasCompletedReading
                  ? "text-green-800 dark:text-green-200"
                  : "text-orange-800 dark:text-orange-200"
              }`}
            >
              {hasCompletedReading
                ? t("readingCompleted")
                : t("listenToUnlock")}
            </span>
          </div>
          {hasCompletedReading && (
            <div className="mt-2 text-xs text-green-600 dark:text-green-400">
              {t("progressAutoSaved")}
            </div>
          )}
        </div>
      )} */}
    </div>
  );
}
