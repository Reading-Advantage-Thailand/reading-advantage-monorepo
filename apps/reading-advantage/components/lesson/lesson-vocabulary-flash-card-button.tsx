"use client";
import { useState } from "react";
import { useScopedI18n } from "@/locales/client";
import { fsrs, generatorParameters, Rating, FSRS, State } from "ts-fsrs";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { levelCalculation } from "@/lib/utils";
import {
  UserXpEarned,
  ActivityStatus,
  ActivityType,
} from "../models/user-activity-log-model";
import { Word } from "./lesson-vocabulary-flash-card";

interface Props {
  index: number;
  nextCard: () => void;
  words: Word[];
  showButton: boolean;
  setShowButton: (value: boolean) => void;
  articleId: string; // Add articleId prop
}

type Logs = {
  rating: Rating;
  state: State;
  due: Date;
  elapsed_days: number;
  scheduled_days: number;
  review: Date;
};

export default function LessonFlashCardVocabularyPracticeButton({
  index,
  nextCard,
  words,
  showButton,
  setShowButton,
  articleId,
}: Props) {
  const t = useScopedI18n("pages.student.practicePage");
  const tUpdateScore = useScopedI18n(
    "pages.student.practicePage.flashcardPractice"
  );
  const [cards, setCards] = useState<Word[]>(words);
  const [logs, setLogs] = useState<Logs[]>([]);
  const params = generatorParameters();
  const fnFsrs: FSRS = fsrs(params);

  const handleClickFsrs = async (index: number, rating: Rating) => {
    const preCard = cards[index];
    const scheduling_cards: any = fnFsrs.repeat(preCard, preCard.due);

    // update card and logs
    const newCards = [...cards];
    newCards[index] = scheduling_cards[rating].card;
    setCards(newCards);

    const newLogs = [...logs];
    newLogs[index] = scheduling_cards[rating].log;
    setLogs(newLogs);

    // update card state in DB
    await fetch(
      `/api/v1/assistant/ts-fsrs-test/flash-card/${newCards[index].id}`,
      {
        method: "POST",
        body: JSON.stringify({
          ...newCards[index],
          page: "vocabulary",
        }),
      }
    );

    // ถ้าเล่นครบทุกใบ
    if (index + 1 === words.length) {
      setShowButton(false);

      // ส่ง XP ไปเก็บ log
      await fetch(`/api/v1/users/${words[0].userId}/activitylog`, {
        method: "POST",
        body: JSON.stringify({
          activityType: ActivityType.VocabularyFlashcards,
          activityStatus: ActivityStatus.Completed,
          xpEarned: UserXpEarned.Vocabulary_Flashcards,
          articleId: articleId, // Add articleId to activity log
          details: {
            articleId: articleId, // Also add to details
            cefr_level: levelCalculation(UserXpEarned.Vocabulary_Flashcards)
              .cefrLevel,
          },
        }),
      });

      // แสดง toast สำเร็จ
      toast({
        title: t("toast.success"),
        imgSrc: true,
        description: tUpdateScore("yourXp", {
          xp: UserXpEarned.Vocabulary_Flashcards,
        }),
      });
    } else {
      nextCard();
    }
  };

  return (
    <>
      {showButton ? (
        words[index].state === 0 ||
        words[index].state === 1 ||
        words[index].state === 2 ||
        words[index].state === 3 ? (
          <div className="flex space-x-2">
            <button
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-red-500 hover:bg-red-600"
              )}
              onClick={() => handleClickFsrs(index, Rating.Again)}
            >
              {t("flashcardPractice.buttonAgain")}
            </button>
            <button
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-amber-500 hover:bg-amber-600"
              )}
              onClick={() => handleClickFsrs(index, Rating.Hard)}
            >
              {t("flashcardPractice.buttonHard")}
            </button>
            <button
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-emerald-500 hover:bg-emerald-600"
              )}
              onClick={() => handleClickFsrs(index, Rating.Good)}
            >
              {t("flashcardPractice.buttonGood")}
            </button>
            <button
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-blue-500 hover:bg-blue-600"
              )}
              onClick={() => handleClickFsrs(index, Rating.Easy)}
            >
              {t("flashcardPractice.buttonEasy")}
            </button>
          </div>
        ) : (
          <button
            className={cn(buttonVariants({ size: "sm" }))}
            onClick={() => {
              if (index + 1 === words.length) {
                setShowButton(false);
              } else {
                nextCard();
              }
            }}
          >
            {t("flashcardPractice.nextButton")}
          </button>
        )
      ) : null}
    </>
  );
}
