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
import { Word } from "./lesson-vocabulary-flash-card";
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
  articleId: string;
  onCompleteChange: (complete: boolean) => void;
};

type Matching = {
  text: string;
  match: string;
};

export default function LessonMatchingWords({
  userId,
  articleId,
  onCompleteChange,
}: Props) {
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
  const [isAlreadyCompleted, setIsAlreadyCompleted] = useState<boolean>(false);
  const [isScoreSaved, setIsScoreSaved] = useState<boolean>(false);

  const getUserSentenceSaved = async () => {
    try {
      const res = await fetch(
        `/api/v1/users/wordlist/${userId}?articleId=${articleId}`
      );
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

  const checkActivityCompletion = async () => {
    try {
      const res = await fetch(
        `/api/v1/users/${userId}/activitylog?articleId=${articleId}&activityType=vocabulary_matching`
      );
      if (res.ok) {
        const data = await res.json();
        console.log("Activity log response:", data); // Debug log
        if (data.activityLogs && data.activityLogs.length > 0) {
          const completedActivity = data.activityLogs.find(
            (log: any) => log.completed === true
          );
          if (completedActivity) {
            console.log("Found completed activity:", completedActivity); // Debug log
            setIsAlreadyCompleted(true);
            setIsScoreSaved(true);
            onCompleteChange(true);
          }
        }
      }
    } catch (error) {
      console.error("Error checking activity completion:", error);
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
    if (correctMatches.includes(word.text)) {
      return {
        opacity: 0,
        transform: "scale(0.8)",
        transition: "all 0.5s ease-out",
      };
    }

    return {
      transition: "all 0.3s ease-in-out",
    };
  };

  const handleCardClick = async (word: Matching) => {
    if (correctMatches.includes(word.text)) return;

    if (selectedCard === null) {
      setSelectedCard(word);
    } else if (selectedCard.text === word.match) {
      // Correct match
      setCorrectMatches([...correctMatches, selectedCard.text, word.text]);
      setSelectedCard(null);
      setAnimateShake("animate__animated animate__pulse");
      setTimeout(() => setAnimateShake(""), 800);
    } else {
      // Wrong match
      setAnimateShake("animate__animated animate__shakeX");
      setTimeout(() => {
        setAnimateShake("");
        setSelectedCard(null);
      }, 600);
    }
  };

  useEffect(() => {
    getUserSentenceSaved();
    checkActivityCompletion();
  }, []);

  useEffect(() => {
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
      if (
        correctMatches.length === 10 &&
        !isScoreSaved &&
        !isAlreadyCompleted
      ) {
        try {
          setIsScoreSaved(true);

          const updateScrore = await fetch(
            `/api/v1/users/${userId}/activitylog`,
            {
              method: "POST",
              body: JSON.stringify({
                activityType: ActivityType.VocabularyMatching,
                activityStatus: ActivityStatus.Completed,
                xpEarned: UserXpEarned.Vocabulary_Matching,
                articleId: articleId,
                details: {
                  articleId: articleId,
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
          console.error("Error saving score:", error);
          setIsScoreSaved(false);
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
  }, [correctMatches, isScoreSaved, isAlreadyCompleted]);

  useEffect(() => {
    if (correctMatches.length === 10 || isAlreadyCompleted) {
      onCompleteChange(true);
    }
  }, [correctMatches.length, isAlreadyCompleted]);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Word Matching Practice
          </h1>

          {/* Progress Section */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Progress: {isAlreadyCompleted || correctMatches.length === 10 ? "5" : correctMatches.length / 2} / 5
              </span>
            </div>
            <div className="w-48 sm:w-64 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${isAlreadyCompleted || correctMatches.length === 10 ? 100 : (correctMatches.length / 10) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="mb-8">
          {articleMatching.length === 0 ? (
            // Loading State
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex space-x-4">
                    <Skeleton className="h-4 w-1/3 rounded" />
                    <Skeleton className="h-4 w-1/2 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : articleMatching.length >= 5 ? (
            correctMatches.length < 10 &&
            !isAlreadyCompleted && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8">
                <div className="text-center mb-6">
                  <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                    Match the words with their definitions
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {words.map((word, index) => (
                    <div
                      key={index}
                      className={`
                        group relative cursor-pointer 
                        bg-white dark:bg-gray-700
                        border-2 border-gray-200 dark:border-gray-600
                        rounded-lg sm:rounded-xl
                        p-3 sm:p-4 lg:p-5
                        min-h-[80px] sm:min-h-[90px] lg:min-h-[100px]
                        flex items-center justify-center
                        text-center text-sm sm:text-base
                        font-medium text-gray-800 dark:text-gray-200
                        transition-all duration-300 ease-in-out
                        hover:shadow-md hover:-translate-y-1
                        hover:border-blue-300 dark:hover:border-blue-400
                        active:scale-95
                        ${correctMatches.includes(word.text) ? "opacity-0 pointer-events-none scale-95" : ""}
                        ${
                          selectedCard?.text === word.text
                            ? "border-blue-500 dark:border-blue-400 shadow-lg bg-blue-50 dark:bg-blue-900/30 scale-105"
                            : "hover:bg-gray-50 dark:hover:bg-gray-600"
                        }
                        ${animateShake && selectedCard?.text === word.text ? animateShake : ""}
                      `}
                      style={getCardStyle(word)}
                      onClick={() => handleCardClick(word)}
                    >
                      <span className="break-words leading-tight">
                        {word.text}
                      </span>

                      {/* Selection indicator */}
                      {selectedCard?.text === word.text && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : (
            // Not Enough Words
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-orange-200 dark:border-orange-700 p-6 sm:p-8">
              <div className="text-center">
                <div className="text-4xl sm:text-5xl mb-4">📚</div>
                <h3 className="text-lg sm:text-xl font-semibold text-orange-700 dark:text-orange-300 mb-2">
                  Need More Words
                </h3>
                <p className="text-orange-600 dark:text-orange-400 text-sm sm:text-base">
                  {t("matchingPractice.minSentencesAlert")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Success State */}
        {(correctMatches.length === 10 || isAlreadyCompleted) && (
          <div className="text-center">
            <div
              className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 
                          rounded-2xl border border-green-200 dark:border-green-700 p-6 sm:p-8 lg:p-10 mb-6"
            >
              <div className="text-5xl sm:text-6xl lg:text-7xl mb-6 animate__animated animate__bounceIn">
                🎉
              </div>
              <div className="flex flex-row items-center justify-center mb-4">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-700 dark:text-green-300 mb-4">
                  {isAlreadyCompleted ? "Already Completed!" : "Perfect Score!"}
                </h2>
                <Image
                  src="/winners.svg"
                  alt="Success illustration"
                  width={50}
                  height={50}
                  className="animate__animated animate__jackInTheBox w-8 sm:w-19 lg:w-19 h-auto mb-2 ml-2"
                />
              </div>

              <p className="text-green-600 dark:text-green-400 text-base sm:text-lg lg:text-xl">
                {isAlreadyCompleted
                  ? "You have already completed this activity!"
                  : "You've matched all words correctly!"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
