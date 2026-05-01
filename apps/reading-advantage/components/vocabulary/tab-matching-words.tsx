/* eslint-disable react-hooks/exhaustive-deps */
// "use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import dayjs_plugin_isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import dayjs_plugin_isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import Image from "next/image";
import "animate.css";
import { Header } from "../header";
import { toast } from "../ui/use-toast";
import { Skeleton } from "../ui/skeleton";
import { Word } from "./tab-flash-card";
import {
  UserXpEarned,
  ActivityStatus,
  ActivityType,
} from "../models/user-activity-log-model";
import { levelCalculation } from "@/lib/utils";
dayjs.extend(utc);
dayjs.extend(dayjs_plugin_isSameOrBefore);
dayjs.extend(dayjs_plugin_isSameOrAfter);

type Props = {
  userId: string;
};

type Matching = {
  text: string;
  match: string;
};

export default function MatchingWords({ userId }: Props) {
  const t = useScopedI18n("pages.student.practicePage");
  const tUpdateScore = useScopedI18n(
    "pages.student.practicePage.flashcardPractice"
  );
  const tWordList = useScopedI18n("components.wordList");
  const currentLocale = useCurrentLocale() as "en" | "th" | "cn" | "tw" | "vi";

  const router = useRouter();

  const [animateShake, setAnimateShake] = useState<string>("");
  const [articleMatching, setArticleMatching] = useState<Matching[]>([]);
  const [selectedCard, setSelectedCard] = useState<Matching | null>(null);
  const [correctMatches, setCorrectMatches] = useState<string[]>([]);
  const [words, setWords] = useState<Matching[]>([]);

  const getUserSentenceSaved = async () => {
    try {
      const res = await fetch(`/api/v1/users/wordlist/${userId}`);
      const data = await res.json();

      // step 1 : sort Article sentence: ID and SN due date expired
      const matching = data.word.sort((a: Word, b: Word) => {
        return dayjs(a.due).isAfter(dayjs(b.due)) ? 1 : -1;
      });

      const initialWords: Matching[] = [];

      for (const article of matching) {
        initialWords.push({
          text: article?.word?.vocabulary,
          match: article?.word?.definition[currentLocale],
        });
      }
      setArticleMatching(
        initialWords.length > 5 ? initialWords.slice(0, 5) : initialWords
      );
    } catch (error) {
      console.error(error);
    }
  };

  const shuffleWords = (words: Matching[]): Matching[] => {
    const rawData: Matching[] = JSON.parse(JSON.stringify(words));
    return rawData
      .map((word) => ({ ...word, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ text, match }) => ({
        text,
        match,
      }));
  };

  const getCardStyle = (word: Matching) => {
    let styles = {
      backgroundColor: selectedCard?.text === word.text ? "#edefff" : "", // Change to a light yellow on wrong select
      border:
        selectedCard?.text === word.text
          ? "2px solid #425fff"
          : "1px solid #ced4da", // Change to orange on wrong select
    };

    return styles;
  };

  const handleCardClick = async (word: Matching) => {
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

  useEffect(() => {
    getUserSentenceSaved();
  }, []);

  useEffect(() => {
    // ผสมคำและคำแปลเข้าด้วยกันและสุ่ม
    setWords(
      shuffleWords([
        ...articleMatching,
        ...articleMatching.map((word) => ({
          text: word.match,
          match: word.text,
        })),
      ])
    );
  }, [articleMatching]);

  useEffect(() => {
    const updateScoreCorrectMatches = async () => {
      if (correctMatches.length === 10) {
        try {
          // const result = await updateScore(5, userId);
          const updateScrore = await fetch(
            `/api/v1/users/${userId}/activitylog`,
            {
              method: "POST",
              body: JSON.stringify({
                activityType: ActivityType.VocabularyMatching,
                activityStatus: ActivityStatus.Completed,
                xpEarned: UserXpEarned.Vocabulary_Matching,
                details: {
                  cefr_level: levelCalculation(UserXpEarned.Vocabulary_Matching)
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
                xp: UserXpEarned.Vocabulary_Matching,
              }),
            });
          }
        } catch (error) {
          toast({
            title: t("toast.error"),
            imgSrc: true,
            description: t("toast.errorDescription"),
            variant: "destructive",
          });
        }
      }
    };
    updateScoreCorrectMatches();
  }, [correctMatches]);

  return (
    <>
      <div className="mt-5">
        <Header
          heading={t("matchingPractice.matching")}
          text={tWordList("matching.description")}
        />
      </div>
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
