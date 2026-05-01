"use client";

import React, { useState, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import { Sentence } from "./lesson-sentense-flash-card";
import { useScopedI18n } from "@/locales/client";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";

interface LessonSummaryProps {
  articleId: string;
  userId: string;
  elapsedTime: string;
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
  index: number;
  startTime: number;
  endTime: number;
  audioUrl: string;
}

interface QuizeScores {
  mcqScore: number;
  saqScore: number;
}

const LessonSummary: React.FC<LessonSummaryProps> = ({
  articleId,
  userId,
  elapsedTime,
}) => {
  const [loading, setLoading] = useState(false);
  const [wordList, setWordList] = useState<WordList[]>([]);
  const [sentenceList, setSentenceList] = useState<Sentence[]>([]);
  const [totalXp, setTotalXp] = useState(0);
  const [quizeScores, setQuizScores] = useState<QuizeScores>();
  const t = useScopedI18n("pages.student.lessonPage");
  const router = useRouter();

  const mcqFeedback = {
    1: t("MCQ1point"),
    2: t("MCQ2points"),
    3: t("MCQ3points"),
    4: t("MCQ4points"),
    5: t("MCQ5points"),
  };

  const saqFeedback = {
    1: t("SAQ1point"),
    2: t("SAQ2points"),
    3: t("SAQ3points"),
    4: t("SAQ4points"),
    5: t("SAQ5points"),
  };

  const fetchWordList = async () => {
    try {
      const res = await fetch(
        `/api/v1/users/wordlist/${userId}?articleId=${articleId}`
      );
      const data = await res.json();
      if (!Array.isArray(data.word)) throw new Error("Invalid word list");
      const extractedWords = data.word.map((entry: any) => entry.word);
      setWordList(extractedWords);
    } catch (error: any) {
      console.error(error);
      toast({
        title: t("somethingWentWrong"),
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  const fetchSentence = async () => {
    try {
      const res = await fetch(
        `/api/v1/users/sentences/${userId}?articleId=${articleId}`
      );
      const data = await res.json();
      setSentenceList(data.sentences);
    } catch (error: any) {
      console.error(error);
      toast({
        title: t("somethingWentWrong"),
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  const fetchXp = async () => {
    try {
      const res = await fetch(`/api/v1/xp/${userId}?articleId=${articleId}`);
      const data = await res.json();
      setTotalXp(data.total_xp);
    } catch (error: any) {
      console.error(error);
      toast({
        title: t("somethingWentWrong"),
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  const backToReadPage = () => {
    router.push("/student/read");
  };

  const fetchQuizScores = async () => {
    try {
      const res = await fetch(
        `/api/v1/lesson/${userId}/quize-performance?articleId=${articleId}`
      );
      const data = await res.json();
      setQuizScores(data);
    } catch (error: any) {
      console.error(error);
      toast({
        title: t("somethingWentWrong"),
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const fetchAllData = async () => {
      if (!userId || !articleId) return;
      try {
        setLoading(true);
        await Promise.all([
          fetchWordList(),
          fetchSentence(),
          fetchXp(),
          fetchQuizScores(),
        ]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [articleId, userId]);

  return (
    <div className="lesson-summary max-w-screen-xl mx-auto   w-full md:w-[700px] lg:w-[550px] xl:w-[660px] p-5">
      {loading ? (
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mx-auto animate-pulse"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mx-auto animate-pulse"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto animate-pulse"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto animate-pulse"></div>
        </div>
      ) : (
        <>
          <h1 className="text-3xl font-bold text-center text-green-600 dark:text-green-400 mb-4">
            🎉 {t("congratulations")} 🎉
          </h1>
          <p className="text-lg text-center mb-6 text-gray-800 dark:text-gray-200">
            {t("summaryDescription")}:
          </p>

          <ul className="space-y-3 text-gray-800 dark:text-gray-100">
            <li>
              <strong className="text-green-500 dark:text-green-300">
                🌟 {t("wordSaved")}:
              </strong>{" "}
              {wordList.length}
              <ul className="mt-3">
                <div className="flex flex-wrap gap-4 justify-center">
                  {wordList.map((word, index) => (
                    <div
                      key={index}
                      className="shadow-md rounded-lg py-2 px-4 text-center bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <strong className="text-green-600 dark:text-green-300">
                        {word.vocabulary}
                      </strong>
                    </div>
                  ))}
                </div>
              </ul>
            </li>
            <li>
              <strong className="text-blue-500 dark:text-blue-300">
                📘 {t("sentencesSaved")}:
              </strong>{" "}
              {sentenceList.length}
              <ul className="mt-3 space-y-2">
                {sentenceList.map((sentence, index) => (
                  <li
                    key={index}
                    className="bg-white dark:bg-gray-800 shadow-md rounded-lg py-2 px-4 text-center"
                  >
                    <strong className="text-blue-600 dark:text-blue-300">
                      {sentence.sentence}
                    </strong>
                  </li>
                ))}
              </ul>
            </li>
            <li className="mb-6">
              <strong className="block text-purple-500 dark:text-purple-300 mb-3 text-lg">
                📊 {t("quizPerformance")}:
              </strong>
              <div className="space-y-4 ml-2">
                <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg shadow">
                  <h4 className="text-md font-semibold text-purple-700 dark:text-purple-200 mb-1">
                    Multiple Choice (MCQ)
                  </h4>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">Score:</span>
                    <span className="font-bold text-purple-800 dark:text-purple-100">
                      {quizeScores?.mcqScore ?? "-"}
                    </span>
                  </div>
                  <div className="w-full bg-purple-200 dark:bg-purple-700 rounded-full h-2 mb-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: `${(quizeScores?.mcqScore ?? 0) * 20}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-purple-600 dark:text-purple-300">
                    {quizeScores?.mcqScore !== undefined &&
                      mcqFeedback[
                        quizeScores.mcqScore as keyof typeof mcqFeedback
                      ]}
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg shadow">
                  <h4 className="text-md font-semibold text-purple-700 dark:text-purple-200 mb-1">
                    Short Answer (SAQ)
                  </h4>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">Score:</span>
                    <span className="font-bold text-purple-800 dark:text-purple-100">
                      {quizeScores?.saqScore ?? "-"}
                    </span>
                  </div>
                  <div className="w-full bg-purple-200 dark:bg-purple-700 rounded-full h-2 mb-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: `${(quizeScores?.saqScore ?? 0) * 20}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-purple-600 dark:text-purple-300">
                    {quizeScores?.saqScore !== undefined &&
                      saqFeedback[
                        quizeScores.saqScore as keyof typeof saqFeedback
                      ]}
                  </p>
                </div>
              </div>
            </li>
            <li>
              <strong className="text-orange-500 dark:text-orange-300">
                ⏱️ {t("timeTaken")}:
              </strong>{" "}
              {elapsedTime}
            </li>
            <li>
              <strong className="text-yellow-500 dark:text-yellow-300">
                🏆 {t("xpEarned")}:
              </strong>{" "}
              {totalXp}
            </li>
          </ul>
          <div
            className="flex items-end justify-end w-full mt-4"
            onClick={backToReadPage}
          >
            <Button className="w-full md:w-1/4">{t("readPageButton")}</Button>
          </div>
        </>
      )}
    </div>
  );
};

export default LessonSummary;
