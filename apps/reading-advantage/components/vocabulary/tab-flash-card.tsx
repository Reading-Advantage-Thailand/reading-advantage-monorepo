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
import FlashCardVocabularyPracticeButton from "./flash-card-vocabulary-practice-button";
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

type Props = {
  userId: string;
  showButton: boolean;
  setShowButton: Function;
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

export default function FlashCard({
  userId,
  showButton,
  setShowButton,
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

  const currentLocale = useCurrentLocale() as "en" | "th" | "cn" | "tw" | "vi";
  const getUserSentenceSaved = async () => {
    try {
      const res = await fetch(`/api/v1/users/wordlist/${userId}`);
      const data = await res.json();

      const startOfDay = dayjs().startOf('day').toDate();
      const filteredData = await data?.word
        .filter((record: Word) => {
          const dueDate = new Date(record.due);
          return record.state === 0 || dueDate < startOfDay;
        })
        .sort((a: Word, b: Word) => {
          return dayjs(a.due).isAfter(dayjs(b.due)) ? 1 : -1;
        });
      setWords(filteredData);
      if (filteredData.length === 0) {
        setShowButton(false);
      }

      // updateScore
      let filterDataUpdateScore = filter(data.sentences, (param) => {
        const dueDate = new Date(param.due);
        const state = param.state || 0; // Assign a default value of 0 if param.state is undefined or falsy
        return (state === 2 || state === 3) && dueDate < startOfDay;
      });
      if (filterDataUpdateScore?.length > 0) {
        for (let i = 0; i < filterDataUpdateScore.length; i++) {
          try {
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
            console.error(`Failed to update data`);
          }
        }
      }
    } catch (error) {
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

  return (
    <>
      <div className="mt-5">
        <Header
          heading={tWordList("tab.flashcard")}
          text={tWordList("flashcard.description")}
        />
      </div>
      <div className="flex flex-col items-center justify-center space-y-2 mt-4">
        {words.length != 0 && (
          <>
            <FlashcardArray
              cards={cards}
              controls={false}
              showCount={false}
              onCardChange={(index) => {
                setCurrentCardIndex(index);
              }}
              forwardRef={controlRef}
              currentCardFlipRef={currentCardFlipRef}
            />
            <div className="flex flex-row justify-center items-center">
              <p className="mx-4 my-4 font-medium">
                {currentCardIndex + 1} / {cards.length}
              </p>
            </div>
            {words.map((data, index) => {
              if (index === currentCardIndex) {
                return (
                  <div
                    className="flex flex-col justify-center items-center space-x-3 gap-2"
                    key={uuidv4()}
                  >
                    <div className="flex space-x-3 justify-center items-center">
                      {data.word.audioUrl && (
                        <AudioButton
                          key={index}
                          audioUrl={
                            data.word.audioUrl
                              ? data.word.audioUrl
                              : `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/${AUDIO_WORDS_URL}/${data.articleId}.mp3`
                          }
                          startTimestamp={data?.word?.startTime}
                          endTimestamp={data?.word?.endTime}
                        />
                      )}

                      <FlipCardPracticeButton
                        currentCard={() => currentCardFlipRef.current()}
                      />
                    </div>
                    {words.length != 0 && (
                      <div className="flex flex-col gap-2 justify-center items-center">
                        <FlashCardVocabularyPracticeButton
                          index={currentCardIndex}
                          nextCard={() => controlRef.current.nextCard()}
                          words={words}
                          showButton={showButton}
                          setShowButton={setShowButton}
                        />
                        <div>
                          {loading ? (
                            <Button className="ml-auto font-medium" disabled>
                              <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                              {tWordList("flashcard.neverPracticeButton")}
                            </Button>
                          ) : (
                            <Button
                              className="ml-auto font-medium"
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(data?.id)}
                            >
                              {tWordList("flashcard.neverPracticeButton")}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
            })}
          </>
        )}
      </div>
    </>
  );
}
