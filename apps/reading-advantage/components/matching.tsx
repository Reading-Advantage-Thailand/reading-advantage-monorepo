/* eslint-disable react-hooks/exhaustive-deps */
// "use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import dayjs_plugin_isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import dayjs_plugin_isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { useScopedI18n } from "@/locales/client";
import "animate.css";
import Image from "next/image";
import { Header } from "./header";
import { toast } from "./ui/use-toast";
import { Skeleton } from "./ui/skeleton";
import { Sentence } from "./practic/types";
import AudioButton from "./audio-button";
import {
  UserXpEarned,
  ActivityStatus,
  ActivityType,
} from "./models/user-activity-log-model";
import { levelCalculation } from "@/lib/utils";
dayjs.extend(utc);
dayjs.extend(dayjs_plugin_isSameOrBefore);
dayjs.extend(dayjs_plugin_isSameOrAfter);

type Props = {
  userId: string;
};

type Word = {
  text: string;
  match: string;
  timepoint: number;
  endTimepoint: number;
  articleId: string;
  audioUrl: string;
};

export default function Matching({ userId }: Props) {
  const t = useScopedI18n("pages.student.practicePage");
  const tUpdateScore = useScopedI18n(
    "pages.student.practicePage.flashcardPractice"
  );
  const router = useRouter();
  const [articleMatching, setArticleMatching] = useState<Word[]>([]);
  const [selectedCard, setSelectedCard] = useState<Word | null>(null);

  const [correctMatches, setCorrectMatches] = useState<string[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [animateShake, setAnimateShake] = useState<string>("");

  useEffect(() => {
    getUserSentenceSaved();
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
                activityType: ActivityType.SentenceMatching,
                activityStatus: ActivityStatus.Completed,
                xpEarned: UserXpEarned.Sentence_Matching,
                details: {
                  cefr_level: levelCalculation(UserXpEarned.Sentence_Matching)
                    .cefrLevel,
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
                xp: UserXpEarned.Sentence_Matching,
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

  const getUserSentenceSaved = async () => {
    try {
      const res = await fetch(`/api/v1/users/sentences/${userId}`);
      const data = await res.json();

      // step 1 : sort Article sentence: ID and SN due date expired
      const matching = data.sentences.sort((a: Sentence, b: Sentence) => {
        return dayjs(a.due).isAfter(dayjs(b.due)) ? 1 : -1;
      });

      const initialWords: Word[] = [];

      for (const article of matching) {
        initialWords.push({
          text: article?.sentence,
          match: article?.translation?.th,
          timepoint: article?.timepoint,
          endTimepoint: article?.endTimepoint,
          articleId: article?.articleId,
          audioUrl: article?.audioUrl,
        });
      }
      setArticleMatching(
        initialWords.length > 5 ? initialWords.slice(0, 5) : initialWords
      );
    } catch (error) {
      console.error(error);
    }
  };

  const shuffleWords = (words: Word[]): Word[] => {
    const rawData: Word[] = JSON.parse(JSON.stringify(words));
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

  const handleCardClick = async (word: Word) => {
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

  const getCardStyle = (word: Word) => {
    let styles = {
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
      <Header
        heading={t("matchingPractice.matching")}
        text={t("matchingPractice.matchingDescription")}
      />
      {correctMatches.length !== 10 && (
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
        {articleMatching.length === 0 ? (
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
                        {new RegExp(/^[a-zA-Z\s,.']+$/).test(word.text) && (
                          <AudioButton
                            key={word?.text}
                            audioUrl={word?.audioUrl}
                            startTimestamp={word?.timepoint}
                            endTimestamp={word?.endTimepoint}
                          />
                        )}
                      </div>
                      <div onClick={() => handleCardClick(word)}>
                        {word.text}
                      </div>
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
