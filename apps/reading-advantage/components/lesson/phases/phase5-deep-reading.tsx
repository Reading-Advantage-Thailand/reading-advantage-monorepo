"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Article } from "../../models/article-model";
import {
  Book,
  PlayIcon,
  PauseIcon,
  VolumeXIcon,
  Settings,
  RotateCcwIcon,
} from "lucide-react";
import { useScopedI18n } from "@/locales/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AUDIO_URL } from "@/server/constants";

interface Phase3FirstReadingProps {
  article: Article;
  articleId: string;
  userId: string;
  locale: "en" | "th" | "cn" | "tw" | "vi";
  onCompleteChange: (complete: boolean) => void;
}

interface TimePoint {
  file: string;
  index: number;
  markName: string;
  sentences: string;
  timeSeconds: number;
}

interface TranslatedPassage {
  cn?: string[];
  en?: string[];
  th?: string[];
  tw?: string[];
  vi?: string[];
}

const Phase3FirstReading: React.FC<Phase3FirstReadingProps> = ({
  article,
  articleId,
  userId,
  locale,
  onCompleteChange,
}) => {
  const t = useScopedI18n("pages.student.lessonPage");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSentence, setCurrentSentence] = useState(0);
  const [readingSpeed, setReadingSpeed] = useState("1");
  const [highlightMode, setHighlightMode] = useState(true);
  const [showTranslation, setShowTranslation] = useState(false);
  const [selectedSentence, setSelectedSentence] = useState<number | null>(null);
  const [translatedSentences, setTranslatedSentences] = useState<string[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);
  const [audioLoadProgress, setAudioLoadProgress] = useState(0);
  const [audioLoadError, setAudioLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoadingAudio, setIsLoadingAudio] = useState(true);
  const sentenceRefs = useRef<{ [key: number]: HTMLElement | null }>({});
  // Refs to avoid stale closures inside audio event handlers
  const currentSentenceRef = useRef(0);
  const highlightModeRef = useRef(highlightMode);

  // Get data from article
  const timepoints = useMemo(
    () => ((article as any).timepoints as TimePoint[]) || [],
    [article],
  );
  const translatedPassage =
    ((article as any).translatedPassage as TranslatedPassage) || {};
  const audioUrl = (article as any).audio_url || "";

  // Extract sentences from timepoints
  const sentences = timepoints.map((tp: TimePoint) => tp.sentences);
  const paragraphs = article.passage.split("\n").filter((p) => p.trim());

  // Get translation for specific sentence
  const getTranslation = (sentenceIndex: number): string => {
    if (translatedSentences.length > 0 && translatedSentences[sentenceIndex]) {
      return translatedSentences[sentenceIndex];
    }
    const translations = translatedPassage[locale] || [];
    return translations[sentenceIndex] || t("translationNotAvailablePhase5");
  };

  // Fetch translations from API
  const fetchTranslations = async () => {
    if (translatedSentences.length > 0) return; // Already fetched

    setIsTranslating(true);
    setTranslationError(null);

    try {
      const response = await fetch(`/api/v1/assistant/translate/${articleId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "passage",
          targetLanguage: locale,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch translations");
      }

      const data = await response.json();
      setTranslatedSentences(data.translated_sentences || []);
    } catch (error) {
      console.error("Translation error:", error);
      setTranslationError("Failed to load translations");
      // Fallback to existing translations in article data
      const translations = translatedPassage[locale] || [];
      setTranslatedSentences(translations);
    } finally {
      setIsTranslating(false);
    }
  };

  // Handle translation toggle
  const handleTranslationToggle = () => {
    const newShowTranslation = !showTranslation;
    setShowTranslation(newShowTranslation);

    if (newShowTranslation && translatedSentences.length === 0) {
      fetchTranslations();
    }

    if (!newShowTranslation) {
      setSelectedSentence(null);
    }
  };

  useEffect(() => {
    // Initialize audio with improved loading strategy
    const effectiveAudioUrl = audioUrl || `${articleId}.mp3`;

    if (effectiveAudioUrl) {
      setIsLoadingAudio(true);
      setAudioLoadError(null);
      setAudioLoadProgress(0);

      const cacheKey = new Date().getTime();
      let fullAudioUrl = effectiveAudioUrl;

      // เพิ่มการตรวจสอบ URL format
      if (!fullAudioUrl.startsWith("http")) {
        fullAudioUrl = `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/${AUDIO_URL}/${effectiveAudioUrl}`;
      }

      // Add cache buster
      fullAudioUrl = `${fullAudioUrl}?v=${cacheKey}`;

      const audio = new Audio(fullAudioUrl);
      audio.preload = "auto"; // เปลี่ยนจาก metadata เป็น auto เพื่อโหลดทั้งหมด

      // Track loading progress
      const handleProgress = () => {
        if (audio.buffered.length > 0) {
          const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
          const duration = audio.duration;
          if (duration > 0) {
            const progress = (bufferedEnd / duration) * 100;
            setAudioLoadProgress(Math.min(progress, 100));
          }
        }
      };

      const handleCanPlayThrough = () => {
        setIsAudioLoaded(true);
        setIsLoadingAudio(false);
        setAudioLoadProgress(100);
        console.log("Audio loaded successfully and ready to play");
      };

      const handleLoadedData = () => {
        setIsAudioLoaded(true);
        setIsLoadingAudio(false);
        console.log("Audio data loaded");
      };

      const handleError = (e: Event) => {
        console.error(`Audio failed to load: ${fullAudioUrl}`, e);
        setIsAudioLoaded(false);
        setIsLoadingAudio(false);
        setAudioLoadError(
          "Failed to load audio. Please check your internet connection.",
        );
      };

      // Single timing source: ontimeupdate drives sentence highlighting
      const handleTimeUpdate = () => {
        if (!audio || audio.paused) return;
        const currentTime = audio.currentTime;

        let newIndex = 0;
        for (let i = timepoints.length - 1; i >= 0; i--) {
          if (currentTime >= timepoints[i].timeSeconds) {
            newIndex = i;
            break;
          }
        }

        if (newIndex !== currentSentenceRef.current) {
          currentSentenceRef.current = newIndex;
          setCurrentSentence(newIndex);

          // Scroll to current sentence when highlight mode is on
          const el = sentenceRefs.current[newIndex];
          if (el && highlightModeRef.current) {
            el.scrollIntoView({
              behavior: "smooth",
              block: "center",
              inline: "nearest",
            });
          }
        }
      };

      const handleEnded = () => {
        setIsPlaying(false);
      };

      const handleAudioPause = () => {
        setIsPlaying(false);
      };

      // Add event listeners
      audio.addEventListener("progress", handleProgress);
      audio.addEventListener("canplaythrough", handleCanPlayThrough);
      audio.addEventListener("loadeddata", handleLoadedData);
      audio.addEventListener("error", handleError);
      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("ended", handleEnded);
      audio.addEventListener("pause", handleAudioPause);

      audioRef.current = audio;

      // Start loading
      audio.load();

      return () => {
        audio.removeEventListener("progress", handleProgress);
        audio.removeEventListener("canplaythrough", handleCanPlayThrough);
        audio.removeEventListener("loadeddata", handleLoadedData);
        audio.removeEventListener("error", handleError);
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("ended", handleEnded);
        audio.removeEventListener("pause", handleAudioPause);
        audio.pause();
      };
    }
  }, [audioUrl, articleId, retryCount]);

  useEffect(() => {
    onCompleteChange(true);
  }, [onCompleteChange]);

  // Keep refs in sync to avoid stale closures inside audio event handlers
  useEffect(() => {
    currentSentenceRef.current = currentSentence;
  }, [currentSentence]);

  useEffect(() => {
    highlightModeRef.current = highlightMode;
  }, [highlightMode]);

  useEffect(() => {
    // Update playback rate when speed changes
    if (audioRef.current) {
      audioRef.current.playbackRate = parseFloat(readingSpeed);
    }
  }, [readingSpeed]);

  // Sentence tracking is handled by the single ontimeupdate listener
  // registered in the audio init useEffect above.

  const handlePlayPause = () => {
    if (!audioRef.current || !isAudioLoaded) return;

    if (isPlaying) {
      // Pause — the "pause" event listener will set isPlaying(false)
      audioRef.current.pause();
    } else {
      // Play — ontimeupdate drives sentence highlighting automatically
      audioRef.current.play();
      setIsPlaying(true);
    }
  };



  const retryAudioLoad = () => {
    if (retryCount < 3) {
      console.log(`Retrying audio load (attempt ${retryCount + 1}/3)`);
      setRetryCount((prev) => prev + 1);
      setAudioLoadError(null);
    } else {
      setAudioLoadError(
        "Failed to load audio after 3 attempts. Please refresh the page.",
      );
    }
  };

  const handleSentenceClick = (sentenceIndex: number) => {
    console.log(
      `Clicked sentence ${sentenceIndex}: "${sentences[sentenceIndex]}"`,
    );

    // Jump to specific sentence time if audio is available
    if (audioRef.current && timepoints[sentenceIndex]) {
      const targetTime = timepoints[sentenceIndex].timeSeconds;
      console.log(`Jumping to time: ${targetTime}s`);
      audioRef.current.currentTime = targetTime;
      setCurrentSentence(sentenceIndex);
    }

    // Show/hide translation if enabled
    if (showTranslation) {
      const newSelected =
        selectedSentence === sentenceIndex ? null : sentenceIndex;
      console.log(
        `Translation ${newSelected !== null ? "shown" : "hidden"} for sentence ${sentenceIndex}`,
      );
      setSelectedSentence(newSelected);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ลบ modal overlay ออก */}
      {/* Header Section */}
      <div className="text-center space-y-4 bg-gradient-to-br from-emerald-300 via-teal-300 to-cyan-300 dark:from-emerald-950 dark:via-teal-950 dark:to-cyan-950 p-8 rounded-2xl border border-emerald-200 dark:border-emerald-800">
        <div className="inline-flex items-center justify-center p-3 bg-emerald-100 dark:bg-emerald-900 rounded-full mb-4">
          <Book className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("phase5Title")}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          {t("phase5Description")}
        </p>
      </div>

      {/* Audio Loading Status */}
      {isLoadingAudio && !audioLoadError && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
            <span className="text-blue-800 dark:text-blue-200 font-medium">
              Loading audio... {Math.round(audioLoadProgress)}%
            </span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${audioLoadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Audio Loading Error */}
      {audioLoadError && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <VolumeXIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-red-800 dark:text-red-200 font-medium">
                  {audioLoadError}
                </p>
                {retryCount < 3 && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    Attempt {retryCount + 1} of 3
                  </p>
                )}
              </div>
            </div>
            {retryCount < 3 && (
              <Button
                onClick={retryAudioLoad}
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900"
              >
                <RotateCcwIcon className="h-4 w-4 mr-1" />
                Retry
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Reading Controls */}
      <div className="bg-zinc-200 dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-wrap items-center gap-6">
          {/* Play/Pause Button */}
          <Button
            onClick={handlePlayPause}
            size="lg"
            disabled={!isAudioLoaded}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPlaying ? (
              <PauseIcon className="h-5 w-5 mr-2" />
            ) : (
              <PlayIcon className="h-5 w-5 mr-2" />
            )}
            {isPlaying
              ? "Pause Reading"
              : isAudioLoaded
                ? "Start Reading"
                : "Loading Audio..."}
          </Button>

          {/* Reading Speed Control */}
          <div className="flex items-center gap-3">
            <Settings className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t("speed")}
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

          {/* Highlight Toggle */}
          <Button
            variant={highlightMode ? "default" : "outline"}
            size="sm"
            onClick={() => setHighlightMode(!highlightMode)}
            className={highlightMode ? "bg-yellow-500 hover:bg-yellow-600" : ""}
          >
            {highlightMode ? "🔆" : "🔅"} {t("highlight")}{" "}
            {highlightMode ? t("on") : t("off")}
          </Button>

          {/* Translation Toggle */}
          <Button
            variant={showTranslation ? "default" : "outline"}
            size="sm"
            onClick={handleTranslationToggle}
            disabled={isTranslating}
            className={showTranslation ? "bg-blue-500 hover:bg-blue-600" : ""}
          >
            {isTranslating ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
                Loading...
              </>
            ) : (
              <>
                {showTranslation ? "🌐" : "🌍"} {t("translation")}{" "}
                {showTranslation ? t("on") : t("off")}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Reading Content */}
      <div className="bg-zinc-200 dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden relative">
        {/* Translation overlay inside content */}
        {showTranslation &&
          selectedSentence !== null &&
          sentenceRefs.current[selectedSentence] && (
            <div className="absolute inset-0 z-[100] pointer-events-none">
              <div
                className="absolute bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-sm px-4 py-3 rounded-lg shadow-2xl border border-gray-600 dark:border-gray-300 pointer-events-auto"
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
                <div className="flex items-center justify-between mb-3">
                  <div className="font-medium text-yellow-300 dark:text-blue-600">
                    Translation:
                  </div>
                  <button
                    className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs font-bold flex items-center justify-center transition-colors ml-2"
                    onClick={() => setSelectedSentence(null)}
                  >
                    ×
                  </button>
                </div>
                <div className="text-wrap leading-relaxed">
                  {getTranslation(selectedSentence)}
                </div>
              </div>
            </div>
          )}
        <div className="p-4 sm:p-8 lg:p-12 max-w-none">
          {/* Article Title - Book style with responsive sizing */}
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-6 sm:mb-8 lg:mb-12 text-center leading-tight font-serif tracking-normal sm:tracking-wide">
            {article.title}
          </h2>

          {/* Reading Text - Book-like layout following the design example */}
          <div className="text-gray-800 dark:text-gray-200">
            {sentences.length > 0 ? (
              <div className="space-y-4 sm:space-y-6 leading-relaxed">
                {/* Render each sentence with proper paragraph grouping */}
                {(() => {
                  const paragraphGroups: number[][] = [];
                  let currentGroup: number[] = [];

                  // Group sentences into logical paragraphs
                  sentences.forEach((sentence: string, index: number) => {
                    currentGroup.push(index);

                    // Check if this sentence ends with period and next sentence might start new paragraph
                    if (
                      sentence.trim().endsWith(".") ||
                      sentence.trim().endsWith("!") ||
                      sentence.trim().endsWith("?")
                    ) {
                      // Look ahead to see if we should start new paragraph
                      const nextSentence = sentences[index + 1];
                      if (nextSentence) {
                        // Simple heuristic: if sentences are long enough or there's a topic shift indication
                        if (
                          currentGroup.length >= 3 &&
                          sentence.trim().length > 50
                        ) {
                          paragraphGroups.push([...currentGroup]);
                          currentGroup = [];
                        }
                      }
                    }
                  });

                  // Add any remaining sentences
                  if (currentGroup.length > 0) {
                    paragraphGroups.push(currentGroup);
                  }

                  return paragraphGroups.map((sentenceGroup, groupIndex) => (
                    <div
                      key={`paragraph-${groupIndex}`}
                      className="mb-4 sm:mb-6 no-select"
                    >
                      <p
                        className={`text-justify leading-relaxed sm:leading-loose text-base sm:text-lg font-serif tracking-normal sm:tracking-wide ${
                          groupIndex === 0
                            ? "first-letter:text-4xl sm:first-letter:text-6xl lg:first-letter:text-7xl first-letter:font-bold first-letter:float-left first-letter:mr-1 sm:first-letter:mr-2 first-letter:mt-0 first-letter:leading-[0.8] first-letter:text-emerald-600 dark:first-letter:text-emerald-400 pl-2 sm:pl-4"
                            : "indent-4 sm:indent-8"
                        }`}
                      >
                        {sentenceGroup.map(
                          (sentenceIndex, sentenceInGroupIndex) => {
                            const sentence = sentences[sentenceIndex];
                            const isCurrentSentence =
                              isPlaying &&
                              highlightMode &&
                              sentenceIndex === currentSentence;
                            const isSelectedSentence =
                              showTranslation &&
                              selectedSentence === sentenceIndex;

                            return (
                              <span key={`sentence-${sentenceIndex}`}>
                                <span
                                  className={`transition-all duration-300 cursor-pointer relative inline ${
                                    isCurrentSentence
                                      ? "bg-yellow-200 dark:bg-yellow-600 text-yellow-900 dark:text-yellow-100 shadow-md rounded-md px-1.5 py-0.5 font-medium"
                                      : isSelectedSentence
                                        ? "bg-blue-100 dark:bg-blue-800 rounded-md px-1.5 py-0.5"
                                        : "hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm px-1 py-0.5"
                                  }`}
                                  ref={(el) => {
                                    sentenceRefs.current[sentenceIndex] = el;
                                  }}
                                  onClick={() =>
                                    handleSentenceClick(sentenceIndex)
                                  }
                                >
                                  {sentence.trim()}
                                </span>
                                {sentenceInGroupIndex <
                                  sentenceGroup.length - 1 && " "}
                              </span>
                            );
                          },
                        )}
                      </p>
                    </div>
                  ));
                })()}
              </div>
            ) : (
              // Fallback to paragraph rendering if no timepoints data
              <div className="space-y-4 sm:space-y-8">
                {paragraphs.map((paragraph, paragraphIndex) => (
                  <p
                    key={paragraphIndex}
                    className={`text-gray-800 dark:text-gray-200 leading-relaxed sm:leading-loose text-base sm:text-lg font-serif text-justify tracking-normal sm:tracking-wide ${
                      paragraphIndex === 0
                        ? "first-letter:text-4xl sm:first-letter:text-6xl lg:first-letter:text-7xl first-letter:font-bold first-letter:float-left first-letter:mr-1 sm:first-letter:mr-3 first-letter:mt-1 first-letter:leading-none first-letter:text-emerald-600 dark:first-letter:text-emerald-400"
                        : ""
                    }`}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar - maintains progress and doesn't decrease */}
        <div className="px-4 sm:px-8 pb-4 sm:pb-6">
          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-600 h-3 rounded-full transition-all duration-500"
              style={{
                width: `${sentences.length > 0 ? Math.max(((currentSentence + 1) / sentences.length) * 100, isPlaying ? ((currentSentence + 1) / sentences.length) * 100 : 100) : 0}%`,
              }}
            />
          </div>
          <div className="flex justify-between items-center mt-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">
              Sentence {Math.min(currentSentence + 1, sentences.length)} of{" "}
              {sentences.length}
            </span>
            <span className="font-medium">
              {sentences.length > 0
                ? isPlaying
                  ? Math.round(((currentSentence + 1) / sentences.length) * 100)
                  : Math.min(
                      Math.round(
                        ((currentSentence + 1) / sentences.length) * 100,
                      ),
                      100,
                    )
                : 0}
              {t("percentComplete")}
            </span>
          </div>
        </div>
      </div>

      {/* Reading Tips */}
      <div className="bg-gradient-to-r from-blue-300 to-indigo-300 dark:from-blue-950 dark:to-indigo-950 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">
          {t("deepReadingTips")}
        </h3>
        <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
          <li className="flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
            {t("readEntireArticleDeep")}
          </li>
          <li className="flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
            {t("clickStartReadingDeep")}
          </li>
          <li className="flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
            {t("clickSentenceTranslation")}
          </li>
          <li className="flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
            {t("useHighlightModeDeep")}
          </li>
        </ul>
      </div>
    </div>
  );
};

Phase3FirstReading.displayName = "Phase3FirstReading";
export default Phase3FirstReading;
