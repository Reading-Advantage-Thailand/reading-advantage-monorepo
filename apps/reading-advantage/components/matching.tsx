/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import dayjs_plugin_isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import dayjs_plugin_isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { useScopedI18n, useCurrentLocale } from "@/locales/client";
import "animate.css";
import Image from "next/image";
import { Header } from "./header";
import { toast } from "./ui/use-toast";
import { Skeleton } from "./ui/skeleton";
import { Sentence } from "./practic/types";
import { Word } from "./vocabulary/types";
import AudioButton from "./audio-button";
import {
  UserXpEarned,
  ActivityStatus,
  ActivityType,
} from "./models/user-activity-log-model";
import { levelCalculation } from "@/lib/utils";
import { normalizeTranslateLocale } from "@/lib/translate-sentence";
dayjs.extend(utc);
dayjs.extend(dayjs_plugin_isSameOrBefore);
dayjs.extend(dayjs_plugin_isSameOrAfter);

export type MatchingWord = {
  text: string;
  match: string;
  timepoint?: number;
  endTimepoint?: number;
  articleId?: string;
  audioUrl?: string;
};

type MatchingProps = {
  userId: string;
  fetchWords?: (
    userId: string,
    currentLocale: string
  ) => Promise<MatchingWord[]>;
  description?: string;
  headerClassName?: string;
  activityType?: ActivityType;
  xpEarned?: UserXpEarned;
  showAudio?: boolean;
  showHeroImages?: boolean;
};

/**
 * Fetches saved sentences and maps them to matching cards.
 * @param userId The student user id.
 * @param currentLocale The locale used to pick the sentence translation.
 * @returns The sentence matching cards sorted by due date.
 */
export async function fetchSentenceMatchingWords(
  userId: string,
  currentLocale: string
): Promise<MatchingWord[]> {
  const res = await fetch(`/api/v1/users/sentences/${userId}`);
  const data = await res.json();

  const matching = data.sentences.sort((a: Sentence, b: Sentence) => {
    return dayjs(a.due).isAfter(dayjs(b.due)) ? 1 : -1;
  });

  const words: MatchingWord[] = [];
  for (const article of matching) {
    words.push({
      text: article?.sentence,
      match:
        article?.translation?.[normalizeTranslateLocale(currentLocale)] ??
        article?.translation?.["th"],
      timepoint: article?.timepoint,
      endTimepoint: article?.endTimepoint,
      articleId: article?.articleId,
      audioUrl: article?.audioUrl,
    });
  }
  return words;
}

/**
 * Fetches saved vocabulary words and maps them to matching cards.
 * @param userId The student user id.
 * @param currentLocale The locale used to pick the word definition.
 * @returns The vocabulary matching cards sorted by due date.
 */
export async function fetchVocabularyMatchingWords(
  userId: string,
  currentLocale: string
): Promise<MatchingWord[]> {
  const res = await fetch(`/api/v1/users/wordlist/${userId}`);
  const data = await res.json();

  const matching = data.word.sort((a: Word, b: Word) => {
    return dayjs(a.due).isAfter(dayjs(b.due)) ? 1 : -1;
  });

  const words: MatchingWord[] = [];
  for (const item of matching) {
    const text = item?.word?.vocabulary ?? item?.word?.word;
    const match =
      item?.word?.definition?.[currentLocale] ?? item?.word?.translation;
    if (!text || !match) continue;
    words.push({
      text,
      match,
    });
  }
  return words;
}

export default function Matching({
  userId,
  fetchWords = fetchSentenceMatchingWords,
  description,
  headerClassName,
  activityType = ActivityType.SentenceMatching,
  xpEarned = UserXpEarned.Sentence_Matching,
  showAudio = true,
  showHeroImages = true,
}: MatchingProps) {
  const t = useScopedI18n("pages.student.practicePage");
  const tUpdateScore = useScopedI18n(
    "pages.student.practicePage.flashcardPractice"
  );
  const currentLocale = useCurrentLocale();
  const router = useRouter();
  const [articleMatching, setArticleMatching] = useState<MatchingWord[]>([]);
  const [selectedCard, setSelectedCard] = useState<MatchingWord | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "error" | "done">(
    "loading"
  );

  const [correctMatches, setCorrectMatches] = useState<string[]>([]);
  const [words, setWords] = useState<MatchingWord[]>([]);
  const [animateShake, setAnimateShake] = useState<string>("");

  useEffect(() => {
    getUserWordsSaved();
  }, []);

  useEffect(() => {
    // ผสมคำและคำแปลเข้าด้วยกันและสุ่ม
    setWords(
      shuffleWords([
        ...articleMatching,
        ...articleMatching.map((word) => ({
          articleId: word.articleId,
          timepoint: word.timepoint,
          endTimepoint: word.endTimepoint,
          text: word.match,
          match: word.text,
          audioUrl: word.audioUrl,
        })),
      ])
    );
  }, [articleMatching]);

  useEffect(() => {
    const updateScoreCorrectMatches = async () => {
      if (correctMatches.length === 10) {
        try {
          const updateScrore = await fetch(
            `/api/v1/users/${userId}/activitylog`,
            {
              method: "POST",
              body: JSON.stringify({
                activityType,
                activityStatus: ActivityStatus.Completed,
                xpEarned,
                details: {
                  cefr_level: levelCalculation(xpEarned).cefrLevel,
                },
              }),
            }
          );
          if (updateScrore?.status === 200) {
            router.refresh();
            toast({
              title: t("toast.success"),
              imgSrc: true,
              description: tUpdateScore("yourXp", {
                xp: xpEarned,
              }),
            });
          }
        } catch (error) {
          toast({
            title: t("toast.error"),
            description: t("toast.errorDescription"),
            variant: "destructive",
          });
        }
      }
    };
    updateScoreCorrectMatches();
  }, [correctMatches]);

  const getUserWordsSaved = async () => {
    try {
      setLoadState("loading");
      const initialWords = await fetchWords(userId, currentLocale);
      setArticleMatching(
        initialWords.length > 5 ? initialWords.slice(0, 5) : initialWords
      );
      setLoadState("done");
    } catch (error) {
      console.error(error);
      setLoadState("error");
    }
  };

  const shuffleWords = (words: MatchingWord[]): MatchingWord[] => {
    const rawData: MatchingWord[] = JSON.parse(JSON.stringify(words));
    return rawData
      .map((word) => ({ ...word, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ text, match, timepoint, endTimepoint, articleId, audioUrl }) => ({
        articleId,
        timepoint,
        endTimepoint,
        text,
        match,
        audioUrl,
      }));
  };

  const handleCardClick = async (word: MatchingWord) => {
    if (selectedCard === null) {
      setSelectedCard(word);
    } else if (selectedCard.text === word.match) {
      setCorrectMatches([...correctMatches, selectedCard.text, word.text]);
      setSelectedCard(null);
      setAnimateShake(""); // Clear any previous shakes
    } else {
      setAnimateShake("animate__animated animate__wobble"); // Trigger shake
      setTimeout(() => setAnimateShake(""), 2000); // Clear shake effect after 1 second
      setSelectedCard(null);
    }
  };

  const getCardStyle = (word: MatchingWord) => {
    const styles = {
      backgroundColor: selectedCard?.text === word.text ? "#edefff" : "", // Change to a light yellow on wrong select
      border:
        selectedCard?.text === word.text
          ? "2px solid #425fff"
          : "1px solid #ced4da", // Change to orange on wrong select
    };

    return styles;
  };

  return (
    <>
      <div className={headerClassName}>
        <Header
          heading={t("matchingPractice.matching")}
          text={description ?? t("matchingPractice.matchingDescription")}
        />
      </div>
      {showHeroImages && correctMatches.length !== 10 && (
        <div className="flex">
          <div className="w-1/2">
            <Image
              src={"/ninja.svg"}
              alt="Man"
              width={92}
              height={115}
              className="animate__animated animate__fadeInTopLeft animate__fast"
            />
          </div>
          <div className="w-1/2 flex justify-end">
            <Image
              src={"/knight.svg"}
              alt="Man"
              width={92}
              height={115}
              className="animate__animated animate__fadeInTopRight animate__fast"
            />
          </div>
        </div>
      )}

      <div className="mt-10">
        {loadState === "loading" ? (
          <>
            <div className="grid w-full gap-10">
              <div className="mx-auto w-[800px] space-y-6">
                <Skeleton className="h-[200px] w-full" />
                <Skeleton className="h-[20px] w-2/3" />
                <Skeleton className="h-[20px] w-full" />
                <Skeleton className="h-[20px] w-full" />
              </div>
            </div>
          </>
        ) : loadState === "error" ? (
          <div className="flex flex-wrap justify-center rounded-2xl border-2 border-gray-200 p-4 mt-20">
            <div className="text-rose-600 dark:text-rose-300 font-bold">
              {t("toast.error")}
            </div>
          </div>
        ) : (
          <>
            {articleMatching.length == 5 ? (
              <>
                <div className="flex flex-wrap justify-center">
                  {words.map((word, index) => (
                    <div
                      key={index}
                      className={`cursor-pointer rounded-xl p-5 m-5 w-64 text-center dark:bg-[#020817] border-solid border border-[#282e3e14] bg-slate-50 hover:bg-slate-200 shadow-lg 
              ${correctMatches.includes(word.text) && "hidden"}
              ${animateShake}  
              ${
                selectedCard?.text === word.text && "dark:text-black"
              }            
              `}
                      style={getCardStyle(word)}
                    >
                      <div className="mb-5">
                        {showAudio &&
                          word.audioUrl &&
                          new RegExp(/^[a-zA-Z\s,.']+$/).test(word.text) && (
                            <AudioButton
                              key={word?.text}
                              audioUrl={word?.audioUrl}
                              startTimestamp={word?.timepoint ?? 0}
                              endTimestamp={word?.endTimepoint}
                            />
                          )}
                      </div>
                      <button
                        type="button"
                        className="w-full"
                        onClick={() => handleCardClick(word)}
                      >
                        {word.text}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-wrap justify-center rounded-2xl border-2 border-gray-200 p-4 mt-20">
                  <div className="text-rose-600 dark:text-rose-300 font-bold">
                    {t("matchingPractice.minSentencesAlert")}
                  </div>
                </div>
              </>
            )}
          </>
        )}
        {correctMatches.length === 10 && (
          <div className="flex flex-wrap justify-center mt-10 ">
            <Image
              src={"/winners.svg"}
              alt="winners"
              width={250}
              height={100}
              className="animate__animated animate__jackInTheBox"
            />
          </div>
        )}
      </div>
    </>
  );
}
