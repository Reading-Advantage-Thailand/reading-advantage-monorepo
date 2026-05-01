"use client";
import { cn } from "@/lib/utils";
import React from "react";
import { buttonVariants } from "./ui/button";
import { useScopedI18n } from "@/locales/client";

type Props = {
  currentCard: Function;
};

export default function FlipCardPracticeButton({ currentCard }: Props) {
  const t = useScopedI18n("pages.student.practicePage");

  return (
    <div className="flex space-x-2">
      <button
        className={cn(buttonVariants({ size: "sm" }))}
        onClick={() => {        
          currentCard();
        }}
      >
        {t("flashcardPractice.flipCard")}
      </button>
    </div>
  );
}