"use client";

import React from "react";
import LessonSentenceFlashcardGame from "../lesson-sentence-flashcard-game";
import { Book } from "lucide-react";
import { useScopedI18n } from "@/locales/client";

interface Phase11SentenceFlashcardsProps {
  userId: string;
  articleId: string;
  showSentenseButton: boolean;
  setShowSentenseButton: (show: boolean) => void;
  onCompleteChange: (complete: boolean) => void;
}

const Phase11SentenceFlashcards: React.FC<Phase11SentenceFlashcardsProps> = ({
  userId,
  articleId,
  showSentenseButton,
  setShowSentenseButton,
  onCompleteChange,
}) => {
  const t = useScopedI18n("pages.student.lessonPage");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="text-center space-y-4 bg-gradient-to-br from-teal-300 via-cyan-300 to-blue-300 dark:from-teal-950 dark:via-cyan-950 dark:to-blue-950 p-8 rounded-2xl border border-teal-200 dark:border-teal-800">
        <div className="inline-flex items-center justify-center p-3 bg-teal-100 dark:bg-teal-900 rounded-full mb-4">
          <Book className="h-8 w-8 text-teal-600 dark:text-teal-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("phase11Title")}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          {t("phase11Description")}
        </p>
      </div>

      {/* Sentence Flashcard Component */}
      <LessonSentenceFlashcardGame
        userId={userId}
        articleId={articleId}
        onCompleteChange={onCompleteChange}
      />
    </div>
  );
};

Phase11SentenceFlashcards.displayName = "Phase11SentenceFlashcards";
export default Phase11SentenceFlashcards;
