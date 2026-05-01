/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import React, { useEffect, useState, useRef } from "react";
import { FlashcardArray } from "react-quizlet-flashcard";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import dayjs_plugin_isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import dayjs_plugin_isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { v4 as uuidv4 } from "uuid";
import { date_scheduler, State } from "ts-fsrs";
import { filter, method } from "lodash";
import { useRouter } from "next/navigation";
import { ReloadIcon } from "@radix-ui/react-icons";
import { Button } from "../ui/button";
import { Header } from "../header";
import { toast } from "../ui/use-toast";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { AUDIO_WORDS_URL } from "@/server/constants";
import LessonFlashCardVocabularyPracticeButton from "./lesson-vocabulary-flash-card-button";
import FlipCardPracticeButton from "../flip-card-button";
import {
  UserXpEarned,
  ActivityStatus,
  ActivityType,
} from "../models/user-activity-log-model";
import AudioButton from "../audio-button";
import { levelCalculation } from "@/lib/utils";
dayjs.extend(utc);
dayjs.extend(dayjs_plugin_isSameOrBefore);
dayjs.extend(dayjs_plugin_isSameOrAfter);
import Image from "next/image";

type Props = {
  userId: string;
  articleId: string;
  showButton: boolean;
  setShowButton: (value: boolean) => void;
  onCompleteChange: (complete: boolean) => void;
};

export type Word = {
  articleId: string;
  createdAt?: { _seconds: number; _nanoseconds: number };
  difficulty: number; // Reflects the inherent difficulty of the card content
  due: Date; // Date when the card is next due for review
  elapsed_days: number; // Days since the card was last reviewed
  lapses: number; // Times the card was forgotten or remembered incorrectly
  reps: number; // Total number of times the card has been reviewed
  scheduled_days: number; // The interval at which the card is next scheduled
  stability: number; // A measure of how well the information is retained
  state: State; // The current state of the card (New, Learning, Review, Relearning)
  userId: string;
  word: {
    vocabulary: string;
    definition: {
      en: string;
      th: string;
      cn: string;
      tw: string;
      vi: string;
    };
    sn: number;
    timepoint: number;
    startTime: number;
    endTime: number;
    audioUrl: string;
  };
  id?: string;
  last_review?: Date; // The most recent review date, if applicable
};

export default function LessonVocabularyFlashCard({
  userId,
  showButton,
  setShowButton,
  articleId,
  onCompleteChange,
}: Props) {
  const t = useScopedI18n("pages.student.practicePage");
  const tUpdateScore = useScopedI18n(
    "pages.student.practicePage.flashcardPractice"
  );
  const tWordList = useScopedI18n("components.wordList");
  const router = useRouter();
  const controlRef = useRef<any>({});
  const currentCardFlipRef = useRef<any>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [words, setWords] = useState<Word[]>([]);
  const [isLoadingWords, setIsLoadingWords] = useState(true);

  const currentLocale = useCurrentLocale() as "en" | "th" | "cn" | "tw" | "vi";
  const getUserSentenceSaved = async () => {
    setIsLoadingWords(true);
    try {
      console.log("Fetching user word list...");
      const res = await fetch(
        `/api/v1/users/wordlist/${userId}?articleId=${articleId}`
      );
      const data = await res.json();
      console.log("Fetched data:", data);

      const startOfDay = dayjs().startOf('day').toDate();
      console.log("Start of day:", startOfDay);

      const filteredData = await data?.word
        .filter((record: Word) => {
          const dueDate = new Date(record.due);
          console.log("Checking record:", record, "Due date:", dueDate);
          return record.state === 0 || dueDate < startOfDay;
        })
        .sort((a: Word, b: Word) => {
          return dayjs(a.due).isAfter(dayjs(b.due)) ? 1 : -1;
        });
      console.log("Filtered data:", filteredData);

      setWords(filteredData);
      if (filteredData.length === 0) {
        console.log("No words to show, hiding button.");
        setShowButton(false);
      }

      let filterDataUpdateScore = filter(data.sentences, (param) => {
        const dueDate = new Date(param.due);
        const state = param.state || 0;
        console.log(
          "Checking sentence for update score:",
          param,
          "Due date:",
          dueDate,
          "State:",
          state
        );
        return (state === 2 || state === 3) && dueDate < startOfDay;
      });
      console.log("Filtered data for update score:", filterDataUpdateScore);

      if (filterDataUpdateScore?.length > 0) {
        for (let i = 0; i < filterDataUpdateScore.length; i++) {
          try {
            console.log("Updating score for:", filterDataUpdateScore[i]);
            if (!filterDataUpdateScore[i]?.update_score) {
              await fetch(
                `/api/v1/assistant/ts-fsrs-test/flash-card/${filterDataUpdateScore[i]?.id}`,
                {
                  method: "POST",
                  body: JSON.stringify({
                    ...filterDataUpdateScore[i],
                    update_score: true,
                    page: "vocabulary",
                  }),
                }
              );
              const updateScrore = await fetch(
                `/api/v1/users/${userId}/activitylog`,
                {
                  method: "POST",
                  body: JSON.stringify({
                    articleId: articleId,
                    activityType: ActivityType.VocabularyFlashcards,
                    activityStatus: ActivityStatus.Completed,
                    xpEarned: UserXpEarned.Vocabulary_Flashcards,
                    details: {
                      ...filterDataUpdateScore[i],
                      cefr_level: levelCalculation(
                        UserXpEarned.Vocabulary_Flashcards
                      ).cefrLevel,
                    },
                  }),
                }
              );
              console.log("Update score response:", updateScrore);
              if (updateScrore?.status === 200) {
                toast({
                  title: t("toast.success"),
                  imgSrc: true,
                  description: tUpdateScore("yourXp", {
                    xp: UserXpEarned.Vocabulary_Flashcards,
                  }),
                });
                router.refresh();
              }
            }
          } catch (error) {
            console.error(
              `Failed to update data for:`,
              filterDataUpdateScore[i],
              "Error:",
              error
            );
          }
        }
      }
      setIsLoadingWords(false);
    } catch (error) {
      console.error("Error fetching user sentence saved:", error);
      toast({
        title: "Something went wrong.",
        description: "Your word was not saved. Please try again.",
        variant: "destructive",
      });
    }
  };

  const cards = words.map((word, index) => {
    return {
      id: index,
      frontHTML: (
        <div className="flex p-4 text-2xl font-bold text-center justify-center items-center h-full dark:bg-accent dark:rounded-lg dark:text-muted-foreground">
          {word.word.vocabulary}
        </div>
      ),
      backHTML: (
        <div className="flex p-4 text-2xl font-bold text-center justify-center items-center h-full dark:bg-accent dark:rounded-lg dark:text-muted-foreground">
          {word.word.definition[currentLocale]}
        </div>
      ),
    };
  });

  const handleDelete = async (id: string | undefined) => {
    try {
      setLoading(true);
      // loop for delete all words

      const res = await fetch(`/api/v1/users/wordlist/${id}`, {
        method: "DELETE",
        body: JSON.stringify({
          id,
        }),
      });

      const resData = await res.json();

      if (resData.status === 200) {
        const newWords = words.filter((word) => word.id !== id);
        setWords(newWords);
        setLoading(false);
        toast({
          title: t("toast.success"),
          description: t("toast.successDescription"),
        });
      } else {
        setLoading(false);
        toast({
          title: t("toast.error"),
          description: t("toast.errorDescription"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      setLoading(false);
      toast({
        title: t("toast.error"),
        description: t("toast.errorDescription"),
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    getUserSentenceSaved();
  }, []);

  useEffect(() => {
    if (words.length === 0 || !showButton) {
      onCompleteChange(true);
    }
  }, [showButton, words.length]);

  return (
    <div className="flex flex-col items-center justify-center space-y-2 mt-4">
      {isLoadingWords ? (
        <div className="flex h-[490px] xl:h-[500px] flex-col w-full md:w-[725px] xl:w-[710px] space-x-4 space-y-20 mt-5">
          <div className="h-40 bg-muted rounded-lg" />
          <div className="flex justify-center">
            <div className="w-24 h-6 bg-muted rounded" />
          </div>
          <div className="flex justify-center space-x-3">
            <div className="w-10 h-10 bg-muted rounded-full" />
            <div className="w-10 h-10 bg-muted rounded-full" />
          </div>
          <div className="w-full h-10 bg-muted rounded" />
        </div>
      ) : (
        <div className="flex h-[490px] xl:h-[500px] flex-col items-center w-full md:w-[725px] xl:w-[710px] space-x-4 mt-5">
          {words.length === 0 || !showButton ? (
            <div className="text-center h-full flex flex-col items-center justify-center mt-4">
              <p className="text-lg font-medium text-green-500 dark:text-green-400">
                {t("flashcardPractice.completedMessage")}
              </p>
              <div className="flex flex-wrap justify-center mt-10">
                <Image
                  src="/man-mage-light.svg"
                  alt="winners"
                  width={250}
                  height={100}
                  className="animate__animated animate__jackInTheBox"
                />
              </div>
            </div>
          ) : (
            <>
              <FlashcardArray
                cards={cards}
                controls={false}
                showCount={false}
                onCardChange={setCurrentCardIndex}
                forwardRef={controlRef}
                currentCardFlipRef={currentCardFlipRef}
              />
              <div className="flex flex-row justify-center items-center">
                <p className="mx-4 my-4 font-medium">
                  {currentCardIndex + 1} / {cards.length}
                </p>
              </div>
              {words[currentCardIndex] && (
                <div className="flex flex-col justify-center items-center space-x-3 gap-2">
                  <div className="flex space-x-3 justify-center items-center">
                    {words[currentCardIndex].word.audioUrl && showButton && (
                      <AudioButton
                        audioUrl={
                          words[currentCardIndex].word.audioUrl ||
                          `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/${AUDIO_WORDS_URL}/${words[currentCardIndex].articleId}.mp3`
                        }
                        startTimestamp={
                          words[currentCardIndex]?.word?.startTime
                        }
                        endTimestamp={words[currentCardIndex]?.word?.endTime}
                      />
                    )}
                    {showButton && (
                      <FlipCardPracticeButton
                        currentCard={() => currentCardFlipRef.current()}
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-2 justify-center items-center">
                    {showButton && (
                      <LessonFlashCardVocabularyPracticeButton
                        index={currentCardIndex}
                        nextCard={() => controlRef.current.nextCard()}
                        words={words}
                        showButton={showButton}
                        setShowButton={setShowButton}
                        articleId={articleId}
                      />
                    )}
                    <div>
                      <Button
                        className="ml-auto font-medium"
                        size="sm"
                        variant={loading ? "default" : "destructive"}
                        onClick={() =>
                          !loading && handleDelete(words[currentCardIndex]?.id)
                        }
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                            {tWordList("flashcard.neverPracticeButton")}
                          </>
                        ) : (
                          tWordList("flashcard.neverPracticeButton")
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
