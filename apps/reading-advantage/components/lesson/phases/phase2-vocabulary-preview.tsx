"use client";

import React, { useState, useEffect, useRef } from "react";
import { Article } from "../../models/article-model";
import { useScopedI18n, useCurrentLocale } from "@/locales/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { BookmarkIcon, VolumeXIcon, PlayIcon, Volume2Icon } from "lucide-react";
import { AUDIO_WORDS_URL } from "@/server/constants";

interface Phase2VocabularyPreviewProps {
  article: Article;
  articleId: string;
  userId: string;
  onCompleteChange: (complete: boolean) => void;
}

interface WordList {
  vocabulary: string;
  definition: {
    en: string;
    th: string;
    cn: string;
    tw: string;
    vi: string;
  };
  index?: number;
  startTime?: number;
  endTime?: number | undefined;
  timeSeconds?: number;
  markName?: string;
  audioUrl?: string;
}

// Audio Button Component สำหรับจัดการการเล่นเสียงที่ดีขึ้น
const AudioButton: React.FC<{
  audioUrl: string;
  startTime: number;
  endTime?: number;
  vocabulary: string;
  onAudioClick: (event: React.MouseEvent) => void;
}> = ({ audioUrl, startTime, endTime, vocabulary, onAudioClick }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // สร้าง audio element ใหม่เมื่อ audioUrl เปลี่ยน
    if (audioUrl) {
      const audio = new Audio();
      audio.preload = "metadata";
      audio.src = audioUrl;

      const handleCanPlay = () => {
        setAudioError(false);
        setIsLoading(false);
      };

      const handleError = () => {
        setAudioError(true);
        setIsLoading(false);
        console.error(`Audio failed to load: ${audioUrl}`);
      };

      const handleLoadStart = () => {
        setIsLoading(true);
      };

      audio.addEventListener("canplay", handleCanPlay);
      audio.addEventListener("error", handleError);
      audio.addEventListener("loadstart", handleLoadStart);

      audioRef.current = audio;

      return () => {
        audio.removeEventListener("canplay", handleCanPlay);
        audio.removeEventListener("error", handleError);
        audio.removeEventListener("loadstart", handleLoadStart);

        // Clear any pending timeout และ timeupdate listener
        if ((audio as any).stopTimeout) {
          clearTimeout((audio as any).stopTimeout);
        }

        if ((audio as any).timeUpdateHandler) {
          audio.removeEventListener(
            "timeupdate",
            (audio as any).timeUpdateHandler,
          );
        }

        audio.pause();
        audio.remove();
      };
    }
  }, [audioUrl]);

  const handlePlayAudio = (event: React.MouseEvent) => {
    event.stopPropagation();
    onAudioClick(event);

    if (!audioRef.current || audioError) {
      console.error("Audio not available or error occurred");
      return;
    }

    const audio = audioRef.current;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);

        // Clear timeout และ timeupdate listener เมื่อหยุดด้วยตนเอง
        if ((audio as any).stopTimeout) {
          clearTimeout((audio as any).stopTimeout);
          delete (audio as any).stopTimeout;
        }

        if ((audio as any).timeUpdateHandler) {
          audio.removeEventListener(
            "timeupdate",
            (audio as any).timeUpdateHandler,
          );
          delete (audio as any).timeUpdateHandler;
        }
        return;
      }

      // Reset to start position
      audio.currentTime = startTime;

      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);

            // จัดการเวลาหยุดเสียงตาม endTime
            if (endTime !== undefined && endTime > startTime) {
              const duration = (endTime - startTime) * 1000; // แปลงเป็น milliseconds

              // ใช้ทั้ง setTimeout และ timeupdate event เพื่อความแม่นยำ
              const timeoutId = setTimeout(
                () => {
                  if (audioRef.current && isPlaying) {
                    audioRef.current.pause();
                    setIsPlaying(false);
                  }
                },
                Math.max(duration, 100),
              ); // อย่างน้อย 100ms

              // เพิ่ม timeupdate listener เพื่อตรวจสอบเวลาแบบ real-time
              const handleTimeUpdate = () => {
                if (audio.currentTime >= endTime) {
                  audio.pause();
                  setIsPlaying(false);
                  clearTimeout(timeoutId);
                  audio.removeEventListener("timeupdate", handleTimeUpdate);
                }
              };

              audio.addEventListener("timeupdate", handleTimeUpdate);

              // เก็บ timeout และ event listener references
              (audio as any).stopTimeout = timeoutId;
              (audio as any).timeUpdateHandler = handleTimeUpdate;
            }

            // Listen for natural audio end (backup)
            const handleEnded = () => {
              setIsPlaying(false);

              // Clear timeout และ timeupdate listener ถ้ามี
              if ((audio as any).stopTimeout) {
                clearTimeout((audio as any).stopTimeout);
                delete (audio as any).stopTimeout;
              }

              if ((audio as any).timeUpdateHandler) {
                audio.removeEventListener(
                  "timeupdate",
                  (audio as any).timeUpdateHandler,
                );
                delete (audio as any).timeUpdateHandler;
              }

              audio.removeEventListener("ended", handleEnded);
            };

            audio.addEventListener("ended", handleEnded);
          })
          .catch((error) => {
            console.error("Audio play failed:", error);
            setIsPlaying(false);
            setAudioError(true);
          });
      }
    } catch (error) {
      console.error("Audio play error:", error);
      setIsPlaying(false);
      setAudioError(true);
    }
  };

  if (audioError) {
    return (
      <div
        className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full opacity-50 cursor-not-allowed"
        title="Audio not available"
      >
        <VolumeXIcon className="w-5 h-5 text-gray-400" />
      </div>
    );
  }

  return (
    <div
      className={`p-2 rounded-full transition-colors cursor-pointer ${
        isPlaying
          ? "bg-blue-100 dark:bg-blue-900"
          : "bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700"
      }`}
      onClick={handlePlayAudio}
      title={`${isPlaying ? "Stop" : "Play"} audio for "${vocabulary}"`}
    >
      {isLoading ? (
        <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      ) : isPlaying ? (
        <Volume2Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      ) : (
        <PlayIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      )}
    </div>
  );
};

const Phase2VocabularyPreview: React.FC<Phase2VocabularyPreviewProps> = ({
  article,
  articleId,
  userId,
  onCompleteChange,
}) => {
  const t = useScopedI18n("pages.student.lessonPage");
  const lt = useScopedI18n("pages.student.lessonPage");
  const [loading, setLoading] = useState<boolean>(false);
  const [wordList, setWordList] = useState<WordList[]>([]);
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
  const [audioError, setAudioError] = useState<boolean>(false);
  const currentLocale = useCurrentLocale() as "en" | "th" | "cn" | "tw" | "vi";

  useEffect(() => {
    onCompleteChange(true);
  }, [onCompleteChange]);

  useEffect(() => {
    const fetchWordList = async () => {
      try {
        setLoading(true);

        const resWordlist = await fetch(`/api/v1/assistant/wordlist`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ article, articleId }),
        });

        if (!resWordlist.ok) {
          throw new Error(
            `API request failed with status: ${resWordlist.status}`,
          );
        }

        const data = await resWordlist.json();

        let processedWordList = [];

        if (Array.isArray(data)) {
          processedWordList = data.map((word: any, index: number) => {
            const startTime = word.timeSeconds || word.startTime || index * 2;

            // endTime คือ startTime ของคำถัดไป ลบ 0.2 วินาที หรือ undefined สำหรับคำสุดท้าย
            const nextWord = data[index + 1];
            const endTime = nextWord
              ? Math.max(
                  (nextWord.timeSeconds ||
                    nextWord.startTime ||
                    (index + 1) * 2) - 0.25,
                  startTime + 0.1,
                )
              : undefined; // คำสุดท้ายไม่มี endTime -> เล่นจนจบไฟล์

            // ปรับปรุง audioUrl ให้มีการ fallback ที่ดีขึ้นและ validate URL
            let audioUrl =
              word.audioUrl ||
              `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/${AUDIO_WORDS_URL}/${articleId}.mp3`;

            // เพิ่มการตรวจสอบ URL format
            if (!audioUrl.startsWith("http")) {
              audioUrl = `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/${AUDIO_WORDS_URL}/${articleId}.mp3`;
            }

            return {
              ...word,
              index,
              startTime,
              endTime, // อาจเป็น undefined สำหรับคำสุดท้าย
              audioUrl,
            };
          });
        } else if (data?.timepoints && Array.isArray(data.timepoints)) {
          processedWordList = data.timepoints.map(
            (timepoint: { timeSeconds: number }, index: number) => {
              const startTime = timepoint.timeSeconds;

              // endTime คือ startTime ของคำถัดไป ลบ 0.2 วินาที หรือ undefined สำหรับคำสุดท้าย
              const nextTimepoint = data.timepoints[index + 1];
              const endTime = nextTimepoint
                ? Math.max(nextTimepoint.timeSeconds - 0.2, startTime + 0.1)
                : undefined; // คำสุดท้ายไม่มี endTime -> เล่นจนจบไฟล์

              // ปรับปรุง audioUrl ให้มีการ fallback ที่ดีขึ้น
              const audioUrl = `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/${AUDIO_WORDS_URL}/${articleId}.mp3`;

              const vocabulary = data?.word_list[index]?.vocabulary;

              return {
                vocabulary,
                definition: data?.word_list[index]?.definition,
                index,
                startTime,
                endTime, // อาจเป็น undefined สำหรับคำสุดท้าย
                audioUrl,
              };
            },
          );
        }

        setWordList(processedWordList);
        setAudioError(false); // Reset audio error on successful fetch
      } catch (error: any) {
        console.error("error: ", error);
        toast({
          title: "Something went wrong.",
          description: `${error?.response?.data?.message || error?.message}`,
          variant: "destructive",
        });
        setWordList([]);
      } finally {
        setLoading(false);
      }
    };

    if (articleId && article) {
      fetchWordList();
    }
  }, [article, articleId]);

  // Preload audio for first 5 words to improve performance on slow connections
  useEffect(() => {
    if (wordList.length > 0) {
      const preloadCount = Math.min(5, wordList.length);
      console.log(`Preloading audio for first ${preloadCount} words`);

      const preloadAudios = wordList
        .slice(0, preloadCount)
        .map((word) => {
          if (word.audioUrl) {
            const audio = new Audio(word.audioUrl);
            audio.preload = "auto";
            audio.load();
            return audio;
          }
          return null;
        })
        .filter(Boolean);

      // Cleanup function
      return () => {
        preloadAudios.forEach((audio) => {
          if (audio) {
            audio.pause();
            audio.src = "";
          }
        });
      };
    }
  }, [wordList]);

  const handleWordClick = (index: number) => {
    setActiveWordIndex(activeWordIndex === index ? null : index);
  };

  const handleAudioClick = (event: React.MouseEvent) => {
    // ป้องกันไม่ให้การคลิกที่ปุ่มเสียงทำให้ expand เปิด
    event.stopPropagation();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="text-center space-y-4 bg-gradient-to-br from-amber-300 via-orange-300 to-red-300 dark:from-amber-950 dark:via-orange-950 dark:to-red-950 p-8 rounded-2xl border border-amber-200 dark:border-amber-800">
        <div className="inline-flex items-center justify-center p-3 bg-amber-100 dark:bg-amber-900 rounded-full mb-4">
          <BookmarkIcon className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("phase2Title")}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          {t("phase2Description")}
        </p>
      </div>

      {/* Vocabulary Cards */}
      <div className="bg-zinc-300 dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="p-4 border border-gray-100 dark:border-gray-800 rounded-xl"
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
            <div className="grid gap-4 max-h-[500px] overflow-y-auto pr-2">
              {wordList.map((word, index) => (
                <div
                  key={index}
                  className={`group p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:shadow-md ${
                    activeWordIndex === index
                      ? "border-blue-400 bg-blue-100 dark:bg-blue-950 dark:border-blue-600"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                  onClick={() => handleWordClick(index)}
                >
                  <div className="flex items-start gap-4">
                    {/* Word */}
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-bold rounded-full">
                        {word.vocabulary}
                      </span>
                    </div>

                    {/* Audio Button */}
                    <div className="flex-shrink-0 mt-1">
                      {word?.startTime !== undefined && word?.audioUrl ? (
                        <AudioButton
                          audioUrl={word.audioUrl}
                          startTime={word.startTime}
                          endTime={word.endTime}
                          vocabulary={word.vocabulary}
                          onAudioClick={handleAudioClick}
                        />
                      ) : (
                        <div
                          className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full opacity-50"
                          title="Audio not available"
                        >
                          <VolumeXIcon className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Definition */}
                    <div className="flex-1 min-w-0">
                      <p>{lt("definition")}</p>
                      {/* Always show basic definition */}
                      <div
                        className={`transition-all duration-300 ${
                          activeWordIndex === index
                            ? "opacity-100"
                            : "opacity-75 group-hover:opacity-90"
                        }`}
                      >
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          {word.definition?.[currentLocale] ||
                            word.definition?.en ||
                            lt("translationNotAvailable")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <VolumeXIcon className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {lt("noVocabularyWords")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Progress Indicator */}
      {wordList.length > 0 && (
        <div className="bg-zinc-200 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>{lt("vocabularyProgress")}</span>
            <span>
              {(lt as any)("wordsToLearn", { count: wordList.length })}
            </span>
          </div>
          <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: "100%" }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

Phase2VocabularyPreview.displayName = "Phase2VocabularyPreview";
export default Phase2VocabularyPreview;
