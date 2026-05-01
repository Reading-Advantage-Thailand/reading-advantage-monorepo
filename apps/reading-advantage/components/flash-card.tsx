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
import { filter } from "lodash";
import { useRouter } from "next/navigation";
import { ReloadIcon } from "@radix-ui/react-icons";
import AudioButton from "./audio-button";
import FlashCardPracticeButton from "./flash-card-practice-button";
import FlipCardPracticeButton from "./flip-card-button";
import { Button } from "./ui/button";
import { Header } from "./header";
import { toast } from "./ui/use-toast";
import { useScopedI18n } from "@/locales/client";
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
  showButton: boolean;
  setShowButton: Function;
};

export type Sentence = {
  articleId: string;
  createdAt: { _seconds: number; _nanoseconds: number };
  endTimepoint: number;
  sentence: string;
  sn: number;
  timepoint: number;
  translation: { th: string };
  userId: string;
  id: string;
  due: Date; // Date when the card is next due for review
  stability: number; // A measure of how well the information is retained
  difficulty: number; // Reflects the inherent difficulty of the card content
  elapsed_days: number; // Days since the card was last reviewed
  scheduled_days: number; // The interval at which the card is next scheduled
  reps: number; // Total number of times the card has been reviewed
  lapses: number; // Times the card was forgotten or remembered incorrectly
  state: State; // The current state of the card (New, Learning, Review, Relearning)
  last_review?: Date; // The most recent review date, if applicable
  audioUrl?: string;
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
  const router = useRouter();
  const controlRef = useRef<any>({});
  const currentCardFlipRef = useRef<any>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sentences, setSentences] = useState<Sentence[]>([]);

  const getUserSentenceSaved = async () => {
    try {
      const res = await fetch(`/api/v1/users/sentences/${userId}`);
      const data = await res.json();

      const startOfDay = dayjs().startOf('day').toDate();
      const filteredData = await data.sentences
        .filter((record: Sentence) => {
          const dueDate = new Date(record.due);
          return record.state === 0 || dueDate < startOfDay;
        })
        .sort((a: Sentence, b: Sentence) => {
          return dayjs(a.due).isAfter(dayjs(b.due)) ? 1 : -1;
        });

      setSentences(filteredData);

      if (filteredData.length === 0) {
        setShowButton(false);
      }

      //updateScore
      let filterDataUpdateScore = filter(data.sentences, (param) => {
        const dueDate = new Date(param.due);
        return (param.state === 2 || param.state === 3) && dueDate < startOfDay;
      });

      if (filterDataUpdateScore.length > 0) {
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
                  }),
                }
              );

              const updateScrore = await fetch(
                `/api/v1/users/${userId}/activitylog`,
                {
                  method: "POST",
                  body: JSON.stringify({
                    articleId: filterDataUpdateScore[i]?.articleId,
                    activityType: ActivityType.SentenceFlashcards,
                    activityStatus: ActivityStatus.Completed,
                    xpEarned: UserXpEarned.Sentence_Flashcards,
                    details: {
                      ...filterDataUpdateScore[i],
                      cefr_level: levelCalculation(
                        UserXpEarned.Sentence_Flashcards
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
                    xp: UserXpEarned.Sentence_Flashcards,
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
      console.log(error);
    }
  };

  useEffect(() => {
    getUserSentenceSaved();
  }, [currentCardIndex]);

  const cards = sentences.map((sentence, index) => {
    return {
      id: index,
      frontHTML: (
        <div className="flex p-4 text-2xl font-bold text-center justify-center items-center h-full dark:bg-accent dark:rounded-lg dark:text-muted-foreground">
          {sentence.sentence}
        </div>
      ),
      backHTML: (
        <div className="flex p-4 text-2xl font-bold text-center justify-center items-center h-full dark:bg-accent dark:rounded-lg dark:text-muted-foreground">
          {sentence.translation.th}
        </div>
      ),
    };
  });

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      // loop for delete all sentences
      const res = await fetch(`/api/v1/users/sentences/${id}`, {
        method: "DELETE",
        body: JSON.stringify({
          id,
        }),
      });

      const resData = await res.json();

      if (resData.status === 200) {
        const newSentences = sentences.filter(
          (sentences) => sentences.id !== id
        );
        setSentences(newSentences);
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

  return (
    <>
      <Header heading={t("flashcard")} text={t("flashcardDescription")} />
      <div className="flex flex-col items-center justify-center space-y-2 mt-4">
        {sentences.length != 0 && (
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
            {sentences.map((sentence, index) => {
              if (index === currentCardIndex) {
                return (
                  <div
                    className="flex flex-col justify-center items-center space-x-3 gap-2"
                    key={uuidv4()}
                  >
                    <div className="flex space-x-3 justify-center items-center">
                      {sentence.audioUrl && (
                        <AudioButton
                          key={sentence.id}
                          audioUrl={
                            sentence.audioUrl
                              ? sentence.audioUrl
                              : `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/tts/${sentence.articleId}.mp3`
                          }
                          startTimestamp={sentence.timepoint}
                          endTimestamp={sentence.endTimepoint}
                        />
                      )}
                      <FlipCardPracticeButton
                        currentCard={() => currentCardFlipRef.current()}
                      />
                    </div>
                    {sentences.length != 0 && (
                      <div className="flex flex-col gap-2 justify-center items-center">
                        <FlashCardPracticeButton
                          index={currentCardIndex}
                          nextCard={() => controlRef.current.nextCard()}
                          sentences={sentences}
                          showButton={showButton}
                          setShowButton={setShowButton}
                        />
                        <div>
                          {loading ? (
                            <Button className="ml-auto font-medium" disabled>
                              <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                              {t("neverPracticeButton")}
                            </Button>
                          ) : (
                            <Button
                              className="ml-auto font-medium"
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(sentence.id)}
                            >
                              {t("neverPracticeButton")}
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
