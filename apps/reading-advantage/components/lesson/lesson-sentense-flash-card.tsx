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
import { Button } from "../ui/button";
import { toast } from "../ui/use-toast";
import { useScopedI18n } from "@/locales/client";
import {
  UserXpEarned,
  ActivityStatus,
  ActivityType,
} from "../models/user-activity-log-model";
import { levelCalculation } from "@/lib/utils";
dayjs.extend(utc);
dayjs.extend(dayjs_plugin_isSameOrBefore);
dayjs.extend(dayjs_plugin_isSameOrAfter);
import Image from "next/image";
import AudioButton from "../audio-button";
import FlipCardPracticeButton from "../flip-card-button";
import FlashCardPracticeButton from "../flash-card-practice-button";

type Props = {
  userId: string;
  articleId: string;
  showButton: boolean;
  setShowButton: (value: boolean) => void;
  onCompleteChange: (complete: boolean) => void;
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
  due: Date;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: State;
  last_review?: Date;
  audioUrl?: string;
  updateScore?: boolean;
};

export default function LessonSentenseFlashCard({
  userId,
  articleId,
  showButton,
  setShowButton,
  onCompleteChange,
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
  const [isLoadingSentences, setIsLoadingSentences] = useState(true);

  const getUserSentenceSaved = async () => {
    console.log("Fetching user sentences...");
    setIsLoadingSentences(true);
    try {
      const res = await fetch(
        `/api/v1/users/sentences/${userId}?articleId=${articleId}`
      );
      const data = await res.json();
      console.log("Fetched sentences data:", data);

      const startOfDay = dayjs().startOf('day').toDate();
      console.log("Start of day:", startOfDay);

      const filteredData = data.sentences
        .filter((record: Sentence) => {
          const dueDate = new Date(record.due);
          const isDue = record.state === 0 || dueDate < startOfDay;
          console.log("Filtering record:", record, "Is due:", isDue);
          return isDue;
        })
        .sort((a: Sentence, b: Sentence) => {
          const comparison = dayjs(a.due).isAfter(dayjs(b.due)) ? 1 : -1;
          console.log(
            "Sorting records:",
            a,
            b,
            "Comparison result:",
            comparison
          );
          return comparison;
        });

      console.log("Filtered and sorted data:", filteredData);

      setSentences(filteredData);
      setIsLoadingSentences(false);
    } catch (error) {
      console.error("Error fetching sentences:", error);
      toast({
        title: "Something went wrong.",
        description: "Your sentences were not saved. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/users/sentences/${id}`, {
        method: "DELETE",
        body: JSON.stringify({
          id,
        }),
      });

      const resData = await res.json();

      if (resData.status === 200) {
        const newSentences = sentences.filter((sentence) => sentence.id !== id);
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

  const handleCardCompletion = async () => {
    if (currentCardIndex === sentences.length - 1) {
      console.log("Last card completed. Awarding XP...");
      try {
        const res = await fetch(`/api/v1/users/${userId}/activitylog`, {
          method: "POST",
          body: JSON.stringify({
            articleId: articleId,
            activityType: ActivityType.SentenceFlashcards,
            activityStatus: ActivityStatus.Completed,
            xpEarned: UserXpEarned.Sentence_Flashcards,
            details: {
              completedCards: sentences.length,
              cefr_level: levelCalculation(UserXpEarned.Sentence_Flashcards)
                .cefrLevel,
            },
          }),
        });

        if (res.status === 200) {
          toast({
            title: t("toast.success"),
            description: tUpdateScore("yourXp", {
              xp: UserXpEarned.Sentence_Flashcards,
            }),
          });
          router.refresh();
        } else {
          console.error("Failed to award XP.");
        }
      } catch (error) {
        console.error("Error awarding XP:", error);
      }
    }
  };

  useEffect(() => {
    getUserSentenceSaved();
  }, []);

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

  useEffect(() => {
    if (sentences.length === 0 || !showButton) {
      onCompleteChange(true);
    }
  }, [showButton, sentences.length]);

  return (
    <div className="flex flex-col items-center justify-center space-y-2 mt-4">
      {isLoadingSentences ? (
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
          {sentences.length === 0 || !showButton ? (
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
                onCardChange={(index) => {
                  setCurrentCardIndex(index);
                  if (index === sentences.length - 1) {
                    handleCardCompletion();
                  }
                }}
                forwardRef={controlRef}
                currentCardFlipRef={currentCardFlipRef}
              />
              <div className="flex flex-row justify-center items-center">
                <p className="mx-4 my-4 font-medium">
                  {currentCardIndex + 1} / {cards.length}
                </p>
              </div>
              {sentences[currentCardIndex] && (
                <div className="flex flex-col justify-center items-center space-x-3 gap-2">
                  <div className="flex space-x-3 justify-center items-center">
                    {sentences[currentCardIndex].audioUrl && showButton && (
                      <AudioButton
                        audioUrl={
                          sentences[currentCardIndex].audioUrl ||
                          `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/tts/${sentences[currentCardIndex].articleId}.mp3`
                        }
                        startTimestamp={sentences[currentCardIndex]?.timepoint}
                        endTimestamp={sentences[currentCardIndex]?.endTimepoint}
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
                      <FlashCardPracticeButton
                        index={currentCardIndex}
                        nextCard={() => {
                          controlRef.current.nextCard();
                          handleCardCompletion();
                        }}
                        sentences={sentences}
                        showButton={showButton}
                        setShowButton={setShowButton}
                      />
                    )}
                    <div>
                      <Button
                        className="ml-auto font-medium"
                        size="sm"
                        variant={loading ? "default" : "destructive"}
                        onClick={() =>
                          !loading &&
                          handleDelete(sentences[currentCardIndex]?.id)
                        }
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                            {t("neverPracticeButton")}
                          </>
                        ) : (
                          t("neverPracticeButton")
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
