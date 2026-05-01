"use client";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { buttonVariants } from "./ui/button";
import { useScopedI18n } from "@/locales/client";
import { Sentence } from "@/components/flash-card";
import { fsrs, generatorParameters, Rating, Card, FSRS, State } from "ts-fsrs";
import { ColumnDef } from "@tanstack/react-table";

type Props = {
  index: number;
  nextCard: Function;
  sentences: Sentence[];
  showButton: boolean;
  setShowButton: Function;
};

type Logs = {
  rating: Rating;
  state: State;
  due: Date;
  elapsed_days: number;
  scheduled_days: number;
  review: Date;
};

export default function FlashCardPracticeButton({
  index,
  nextCard,
  sentences,
  showButton,
  setShowButton,
}: Props) {
  const t = useScopedI18n("pages.student.practicePage");
  const [cards, setCards] = useState<Sentence[]>(sentences);
  const [logs, setLogs] = useState<Logs[]>([]);
  const params = generatorParameters();
  const fnFsrs: FSRS = fsrs(params);

  const truncateText = (text: string, maxLength: number) => {
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + "...";
    } else {
      return text;
    }
  };

  const columnsCards: ColumnDef<Card>[] = [
    {
      accessorKey: "index",
      header: () => <div className="font-bold text-black">Index</div>,
      cell: ({ row }: any) => {
        return <div className="text-center">{row.index + 1}</div>;
      },
    },
    {
      accessorKey: "sentence",
      header: () => <div className="font-bold text-black">Sentence</div>,
      cell: ({ row }: any) => {
        return truncateText(row.getValue("sentence"), 20);
      },
    },
    {
      accessorKey: "due",
      header: () => <div className="font-bold text-black">Due</div>,
      cell: ({ row }: any) => {
        return typeof row.getValue("due") === "string"
          ? new Date(row.getValue("due"))?.toLocaleString()
          : row.getValue("due")?.toLocaleString();
      },
    },
    {
      accessorKey: "state",
      header: () => <div className="font-bold text-black">State</div>,
      cell: ({ row }: any) => {
        return `${row.getValue("state")} (${State[row.getValue("state")]})`;
      },
    },
    {
      accessorKey: "last_review",
      header: () => <div className="font-bold text-black">Last Review</div>,
      cell: ({ row }: any) => {
        return typeof row.getValue("last_review") === "string"
          ? new Date(row.getValue("last_review"))?.toLocaleString()
          : row.getValue("last_review")?.toLocaleString();
      },
    },
    {
      accessorKey: "stability",
      header: () => <div className="font-bold text-black">Stability</div>,
      cell: ({ row }: any) => {
        return (
          <div className="text-center">
            {row.getValue("stability")?.toFixed(2)}
          </div>
        );
      },
    },
    {
      accessorKey: "difficulty",
      header: () => <div className="font-bold text-black">Difficulty</div>,
      cell: ({ row }: any) => {
        return (
          <div className="text-center">
            {row.getValue("difficulty").toFixed(2)}
          </div>
        );
      },
    },
    {
      accessorKey: "elapsed_days",
      header: () => <div className="font-bold text-black">Elapsed Days</div>,
      cell: ({ row }: any) => {
        return (
          <div className="text-center">{row.getValue("elapsed_days")}</div>
        );
      },
    },
    {
      accessorKey: "scheduled_days",
      header: () => <div className="font-bold text-black">Scheduled Days</div>,
      cell: ({ row }: any) => {
        return (
          <div className="text-center">{row.getValue("scheduled_days")}</div>
        );
      },
    },
    {
      accessorKey: "reps",
      header: () => <div className="font-bold text-black">Reps</div>,
      cell: ({ row }: any) => {
        return <div className="text-center">{row.getValue("reps")}</div>;
      },
    },
    {
      accessorKey: "lapses",
      header: () => <div className="font-bold text-black">Lapses</div>,
      cell: ({ row }: any) => {
        return <div className="text-center">{row.getValue("lapses")}</div>;
      },
    },
  ];

  const handleClickFsrs = async (index: number, rating: Rating) => {
    const preCard = cards[index];
    const scheduling_cards: any = fnFsrs.repeat(preCard, preCard.due);

    // set cards by index
    const newCards = [...cards];
    newCards[index] = scheduling_cards[rating].card;
    setCards(newCards);

    // set logs by index
    const newLogs = [...logs];
    newLogs[index] = scheduling_cards[rating].log;
    setLogs(newLogs);

    await fetch(
      `/api/v1/assistant/ts-fsrs-test/flash-card/${newCards[index].id}`,
      {
        method: "POST",
        body: JSON.stringify({
          ...newCards[index],
        }),
      }
    );

    if (index + 1 === sentences.length) {
      setShowButton(false);
    }
  };

  return (
    <>
      {showButton ? (
        sentences[index].state === 0 ||
        sentences[index].state === 1 ||
        sentences[index].state === 2 ||
        sentences[index].state === 3 ? (
          <div className="flex space-x-2">
            <button
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-red-500",
                "hover:bg-red-600"
              )}
              onClick={() => {
                handleClickFsrs(index, Rating.Again);
                nextCard();
              }}
            >
              {t("flashcardPractice.buttonAgain")}
            </button>
            <button
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-amber-500",
                "hover:bg-amber-600"
              )}
              onClick={() => {
                handleClickFsrs(index, Rating.Hard);
                nextCard();
              }}
            >
              {t("flashcardPractice.buttonHard")}
            </button>
            <button
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-emerald-500",
                "hover:bg-emerald-600"
              )}
              onClick={() => {
                handleClickFsrs(index, Rating.Good);
                nextCard();
              }}
            >
              {t("flashcardPractice.buttonGood")}
            </button>
            <button
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-blue-500",
                "hover:bg-blue-600"
              )}
              onClick={() => {
                handleClickFsrs(index, Rating.Easy);
                nextCard();
              }}
            >
              {t("flashcardPractice.buttonEasy")}
            </button>
          </div>
        ) : (
          <button
            className={cn(buttonVariants({ size: "sm" }))}
            onClick={() => {
              if (index + 1 === sentences.length) {
                setShowButton(false);
              } else {
                nextCard();
              }
            }}
          >
            {t("flashcardPractice.nextButton")}
          </button>
        )
      ) : (
        <></>
      )}

      {/* <div className="pt-4 font-bold">Cards :</div>
      <DataTable data={cards} columns={columnsCards} /> */}
    </>
  );
}
