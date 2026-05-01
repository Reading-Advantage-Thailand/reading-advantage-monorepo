"use client";

import React from "react";
import LessonVocabularyFlashcardGame from "../lesson-vocabulary-flashcard-game";
import { Book } from "lucide-react";
import { useScopedI18n } from "@/locales/client";

interface Phase9VocabularyFlashcardsProps {
  userId: string;
  articleId: string;
  showVocabularyButton: boolean;
  setShowVocabularyButton: (show: boolean) => void;
  onCompleteChange: (complete: boolean) => void;
}

const Phase9VocabularyFlashcards: React.FC<Phase9VocabularyFlashcardsProps> = ({
  userId,
  articleId,
  showVocabularyButton,
  setShowVocabularyButton,
  onCompleteChange,
}) => {
  const t = useScopedI18n("pages.student.lessonPage");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="text-center space-y-4 bg-gradient-to-br from-emerald-300 via-green-300 to-teal-300 dark:from-emerald-950 dark:via-green-950 dark:to-teal-950 p-8 rounded-2xl border border-emerald-200 dark:border-emerald-800">
        <div className="inline-flex items-center justify-center p-3 bg-emerald-100 dark:bg-emerald-900 rounded-full mb-4">
          <Book className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("phase9Title")}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          {t("phase9Description")}
        </p>
      </div>
      
      {/* Vocabulary Flashcard Component */}
      <div className="bg-zinc-200 dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          <LessonVocabularyFlashcardGame
            userId={userId}
            articleId={articleId}
            onCompleteChange={onCompleteChange}
          />
        </div>
      </div>
    </div>
  );
};

Phase9VocabularyFlashcards.displayName = "Phase9VocabularyFlashcards";
export default Phase9VocabularyFlashcards;
