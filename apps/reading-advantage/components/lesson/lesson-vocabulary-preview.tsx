"use client";

import { useState, useEffect } from "react";
import { useScopedI18n } from "@/locales/client";
import { Book } from "lucide-react";
import { useCurrentLocale } from "@/locales/client";
import { Article } from "@/components/models/article-model";
import { Skeleton } from "@/components/ui/skeleton";
import { AUDIO_WORDS_URL } from "@/server/constants";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { toast } from "@/components/ui/use-toast";
import AudioImg from "../audio-img";

interface Props {
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
  endTime?: number | undefined; // Allow undefined for last word (play to end)
  timeSeconds?: number;
  markName?: string;
  audioUrl?: string;
}

interface ApiResponse {
  timepoints?: { timeSeconds: number }[];
  word_list?: WordList[];
  wordlist?: WordList[];
}

export default function LessonWordList({
  article,
  articleId,
  userId,
  onCompleteChange,
}: Props) {
  const t = useScopedI18n("pages.student.lessonPage");
  const lt = useScopedI18n("lesson");
  const [loading, setLoading] = useState<boolean>(false);
  const [wordList, setWordList] = useState<WordList[]>([]);

  // Get the current locale
  const currentLocale = useCurrentLocale() as "en" | "th" | "cn" | "tw" | "vi";

  useEffect(() => {
    onCompleteChange(true);
  }, []);

  useEffect(() => {
    const fetchWordList = async () => {
      try {
        setLoading(true); // Start loading
        console.log("Fetching wordlist for article:", articleId); // Debug log
        
        const resWordlist = await fetch(`/api/v1/assistant/wordlist`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ article, articleId }),
        });

        if (!resWordlist.ok) {
          throw new Error(`API request failed with status: ${resWordlist.status}`);
        }

        const data = await resWordlist.json();

        console.log("Raw API response:", data); // Debug log

        let processedWordList = [];

        // Handle different response structures
        if (Array.isArray(data)) {
          // Direct array response (most common case from the API)
          processedWordList = data.map((word: any, index: number) => {
            const startTime = word.timeSeconds || word.startTime || index * 2;
            // Use next word's startTime as current word's endTime
            const nextWord = data[index + 1];
            const endTime = nextWord ? (nextWord.timeSeconds || nextWord.startTime || ((index + 1) * 2)) : undefined; // undefined means play to end
            
            return {
              ...word,
              index,
              startTime,
              endTime,
              audioUrl: word.audioUrl || `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/${AUDIO_WORDS_URL}/${articleId}.mp3`,
            };
          });
          console.log("Direct array - processed with endTime logic:", processedWordList); // Debug log
        } else if (data?.timepoints && Array.isArray(data.timepoints)) {
          // Structure with timepoints and word_list arrays (legacy format)
          processedWordList = data.timepoints.map(
            (timepoint: { timeSeconds: number }, index: number) => {
              const startTime = timepoint.timeSeconds;
              const nextTimepoint = data.timepoints[index + 1];
              const endTime = nextTimepoint ? nextTimepoint.timeSeconds : undefined; // undefined means play to end
              
              return {
                vocabulary: data?.word_list[index]?.vocabulary,
                definition: data?.word_list[index]?.definition,
                index,
                startTime,
                endTime,
                audioUrl: `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/${AUDIO_WORDS_URL}/${articleId}.mp3`,
              };
            }
          );
        } else if (Array.isArray(data?.word_list)) {
          // Structure with word_list array only
          processedWordList = data.word_list.map((word: any, index: number) => {
            const startTime = word.timeSeconds || word.startTime || index * 2;
            const nextWord = data.word_list[index + 1];
            const endTime = nextWord ? (nextWord.timeSeconds || nextWord.startTime || ((index + 1) * 2)) : undefined;
            
            return {
              ...word,
              index,
              startTime,
              endTime,
              audioUrl: word.audioUrl || `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/${AUDIO_WORDS_URL}/${articleId}.mp3`,
            };
          });
        } else if (data?.wordlist && Array.isArray(data.wordlist)) {
          // Another possible structure
          processedWordList = data.wordlist.map((word: any, index: number) => {
            const startTime = word.timeSeconds || word.startTime || index * 2;
            const nextWord = data.wordlist[index + 1];
            const endTime = nextWord ? (nextWord.timeSeconds || nextWord.startTime || ((index + 1) * 2)) : undefined;
            
            return {
              ...word,
              index,
              startTime,
              endTime,
              audioUrl: word.audioUrl || `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/${AUDIO_WORDS_URL}/${articleId}.mp3`,
            };
          });
        } else {
          console.warn("Unexpected data structure:", data);
          processedWordList = [];
        }

        console.log("Processed word list:", processedWordList); // Debug log
        setWordList(processedWordList);
      } catch (error: any) {
        console.error("error: ", error);
        toast({
          title: "Something went wrong.",
          description: `${error?.response?.data?.message || error?.message}`,
          variant: "destructive",
        });
        setWordList([]); // Set empty array on error
      } finally {
        setLoading(false); // Stop loading
      }
    };

    if (articleId && article) {
      fetchWordList();
    } else {
      console.warn("Missing required data:", { articleId, article });
    }
  }, [article, articleId]);

  const playAudioSegment = (audioUrl: string, start: number, end: number) => {
    const audio = new Audio(audioUrl);
    audio.currentTime = start;

    const onTimeUpdate = () => {
      if (audio.currentTime >= end) {
        audio.pause();
        audio.removeEventListener("timeupdate", onTimeUpdate);
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.play();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Book />
          <div className="ml-2">{t("phase2Title")}</div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-start xl:h-[400px] w-full md:w-[725px] xl:w-[710px] space-x-4 mt-5">
            <div className="space-y-8 w-full">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ) : wordList && wordList.length > 0 ? (
          <>
            <div>
              <span className="font-bold">{t("phase2Description")}</span>
            </div>
            <div className="mt-2 space-y-4 max-h-[400px] w-full md:w-[725px] xl:w-[710px] overflow-auto">
              {wordList.map((word, index) => (
                <div
                  key={index}
                  className="p-4 border-b-2 flex flex-row items-start"
                >
                  <span className="font-bold text-cyan-500 mr-2">
                    {word.vocabulary}:
                  </span>
                  {word?.startTime !== undefined && (
                    <AudioImg
                      key={word.vocabulary}
                      audioUrl={
                        word.audioUrl
                          ? word.audioUrl
                          : `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/${AUDIO_WORDS_URL}/${articleId}.mp3`
                      }
                      startTimestamp={word?.startTime}
                      endTimestamp={word?.endTime}
                    />
                  )}
                  <span>{word.definition?.[currentLocale] || word.definition?.en || lt("translationNotAvailable")}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <span className="text-gray-500">{lt("noVocabularyWords")}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
