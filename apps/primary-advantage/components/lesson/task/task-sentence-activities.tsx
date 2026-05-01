"use client";
import React, { useState, useEffect } from "react";
import {
  Book,
  ListOrdered,
  FileText,
  Shuffle,
  GitBranch,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LessonSentenceOrder from "../games/lesson-sentence-order";
import LessonSentenceClozeTest from "../games/lesson-sentence-cloze-test";
import LessonSentenceOrderWord from "../games/lesson-sentence-order-word";
import LessonSentenceMatching from "../games/lesson-sentence-matching";
import { useTranslations } from "next-intl";

interface AssignmentActivity {
  isSentenceMatchingCompleted: boolean;
  isSentenceOrderingCompleted: boolean;
  isSentenceWordOrderingCompleted: boolean;
  isSentenceClozeTestCompleted: boolean;
}

export default function TaskSentenceActivities({
  articleId,
}: {
  articleId: string;
}) {
  const t = useTranslations("Lesson.SentenceActivities");
  const [completedActivities, setCompletedActivities] =
    useState<AssignmentActivity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);

  // Check for completed activities
  useEffect(() => {
    const fetchCompletedActivities = async () => {
      const response = await fetch(`/api/assignments/activity/${articleId}`);
      const data = await response.json();

      setCompletedActivities(data.assignmentActivity);
      setIsLoading(false);
    };
    fetchCompletedActivities();
  }, [articleId]);

  // // Order Sentences Activity
  if (selectedActivity === "order-sentences") {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header Section */}
        <div className="space-y-4 rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-300 via-amber-300 to-yellow-300 p-8 text-center dark:border-orange-800 dark:from-orange-950 dark:via-amber-950 dark:to-yellow-950">
          <div className="mb-4 inline-flex items-center justify-center rounded-full bg-orange-100 p-3 dark:bg-orange-900">
            <Book className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("orderSentences.title")}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
            {t("orderSentences.description")}
          </p>
        </div>

        {/* Order Sentences Component */}

        <LessonSentenceOrder articleId={articleId} />
      </div>
    );
  }

  // // Cloze Test Activity
  if (selectedActivity === "cloze-test") {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header Section */}
        <div className="space-y-4 rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-300 via-amber-300 to-yellow-300 p-8 text-center dark:border-orange-800 dark:from-orange-950 dark:via-amber-950 dark:to-yellow-950">
          <div className="mb-4 inline-flex items-center justify-center rounded-full bg-orange-100 p-3 dark:bg-orange-900">
            <Book className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("clozeTest.title")}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
            {t("clozeTest.description")}
          </p>
        </div>

        {/* Cloze Test Component */}
        <LessonSentenceClozeTest articleId={articleId} />
      </div>
    );
  }

  // // Order Words Activity
  if (selectedActivity === "order-words") {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header Section */}
        <div className="space-y-4 rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-300 via-amber-300 to-yellow-300 p-8 text-center dark:border-orange-800 dark:from-orange-950 dark:via-amber-950 dark:to-yellow-950">
          <div className="mb-4 inline-flex items-center justify-center rounded-full bg-orange-100 p-3 dark:bg-orange-900">
            <Book className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("orderWords.title")}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
            {t("orderWords.description")}
          </p>
        </div>

        {/* Order Words Component */}

        <LessonSentenceOrderWord articleId={articleId} />
      </div>
    );
  }

  // // Matching Activity
  if (selectedActivity === "matching") {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header Section */}
        <div className="space-y-4 rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-300 via-amber-300 to-yellow-300 p-8 text-center dark:border-orange-800 dark:from-orange-950 dark:via-amber-950 dark:to-yellow-950">
          <div className="mb-4 inline-flex items-center justify-center rounded-full bg-orange-100 p-3 dark:bg-orange-900">
            <Book className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("matching.title")}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
            {t("matching.description")}
          </p>
        </div>

        {/* Matching Component */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-zinc-200 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <div className="p-6">
            <LessonSentenceMatching articleId={articleId} />
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-4 rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-300 via-amber-300 to-yellow-300 p-8 text-center dark:border-orange-800 dark:from-orange-950 dark:via-amber-950 dark:to-yellow-950">
          <div className="mb-4 inline-flex items-center justify-center rounded-full bg-orange-100 p-3 dark:bg-orange-900">
            <Book className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("title")}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
            {t("loading")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header Section */}
      <div className="space-y-4 rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-300 via-amber-300 to-yellow-300 p-8 text-center dark:border-orange-800 dark:from-orange-950 dark:via-amber-950 dark:to-yellow-950">
        <div className="mb-4 inline-flex items-center justify-center rounded-full bg-orange-100 p-3 dark:bg-orange-900">
          <Book className="h-8 w-8 text-orange-600 dark:text-orange-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("title")}
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
          {t("description")}
        </p>
      </div>

      {/* Activities Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Order Sentences */}
        <div
          className={`group relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-300 to-indigo-200 transition-all duration-300 hover:scale-105 hover:shadow-xl dark:border-blue-800 dark:from-blue-950 dark:to-indigo-950 ${
            completedActivities?.isSentenceOrderingCompleted
              ? "ring-2 ring-green-500 dark:ring-green-400"
              : ""
          }`}
        >
          <div className="absolute top-4 right-4 opacity-10 transition-opacity duration-300 group-hover:opacity-20">
            <ListOrdered className="h-16 w-16" />
          </div>
          {completedActivities?.isSentenceOrderingCompleted && (
            <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-sm text-white">
              ✓
            </div>
          )}
          <div className="relative flex h-full flex-col p-6">
            <div className="mb-4 flex items-center">
              <div className="mr-4 rounded-full bg-blue-100 p-3 dark:bg-blue-900">
                <ListOrdered className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {t("orderSentences.title")}
                {completedActivities?.isSentenceOrderingCompleted && (
                  <span className="ml-2 text-sm text-green-600 dark:text-green-400">
                    {t("completed")}
                  </span>
                )}
              </h3>
            </div>
            <p className="mb-6 flex-grow text-gray-600 dark:text-gray-300">
              {t("orderSentences.description")}
            </p>
            <Button
              onClick={() => setSelectedActivity("order-sentences")}
              className="w-full bg-blue-600 text-white transition-all duration-300 group-hover:bg-blue-700 hover:bg-blue-700"
            >
              <span className="flex items-center justify-center">
                {completedActivities?.isSentenceOrderingCompleted
                  ? t("review")
                  : t("orderSentences.button")}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </Button>
          </div>
        </div>

        {/* Cloze Test */}
        <div
          className={`group relative overflow-hidden rounded-2xl border border-green-200 bg-gradient-to-br from-green-300 to-emerald-200 transition-all duration-300 hover:scale-105 hover:shadow-xl dark:border-green-800 dark:from-green-950 dark:to-emerald-950 ${
            completedActivities?.isSentenceClozeTestCompleted
              ? "ring-2 ring-green-500 dark:ring-green-400"
              : ""
          }`}
        >
          <div className="absolute top-4 right-4 opacity-10 transition-opacity duration-300 group-hover:opacity-20">
            <FileText className="h-16 w-16" />
          </div>
          {completedActivities?.isSentenceClozeTestCompleted && (
            <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-sm text-white">
              ✓
            </div>
          )}
          <div className="relative flex h-full flex-col p-6">
            <div className="mb-4 flex items-center">
              <div className="mr-4 rounded-full bg-green-100 p-3 dark:bg-green-900">
                <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {t("clozeTest.title")}
                {completedActivities?.isSentenceClozeTestCompleted && (
                  <span className="ml-2 text-sm text-green-600 dark:text-green-400">
                    {t("completed")}
                  </span>
                )}
              </h3>
            </div>
            <p className="mb-6 flex-grow text-gray-600 dark:text-gray-300">
              {t("clozeTest.description")}
            </p>
            <Button
              onClick={() => setSelectedActivity("cloze-test")}
              className="w-full bg-green-600 text-white transition-all duration-300 group-hover:bg-green-700 hover:bg-green-700"
            >
              <span className="flex items-center justify-center">
                {completedActivities?.isSentenceClozeTestCompleted
                  ? t("review")
                  : t("clozeTest.button")}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </Button>
          </div>
        </div>

        {/* Order Words */}
        <div
          className={`group relative overflow-hidden rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-300 to-violet-200 transition-all duration-300 hover:scale-105 hover:shadow-xl dark:border-purple-800 dark:from-purple-950 dark:to-violet-950 ${
            completedActivities?.isSentenceWordOrderingCompleted
              ? "ring-2 ring-green-500 dark:ring-green-400"
              : ""
          }`}
        >
          <div className="absolute top-4 right-4 opacity-10 transition-opacity duration-300 group-hover:opacity-20">
            <Shuffle className="h-16 w-16" />
          </div>
          {completedActivities?.isSentenceWordOrderingCompleted && (
            <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-sm text-white">
              ✓
            </div>
          )}
          <div className="relative flex h-full flex-col p-6">
            <div className="mb-4 flex items-center">
              <div className="mr-4 rounded-full bg-purple-100 p-3 dark:bg-purple-900">
                <Shuffle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {t("orderWords.title")}
                {completedActivities?.isSentenceWordOrderingCompleted && (
                  <span className="ml-2 text-sm text-green-600 dark:text-green-400">
                    {t("completed")}
                  </span>
                )}
              </h3>
            </div>
            <p className="mb-6 flex-grow text-gray-600 dark:text-gray-300">
              {t("orderWords.description")}
            </p>
            <Button
              onClick={() => setSelectedActivity("order-words")}
              className="w-full bg-purple-600 text-white transition-all duration-300 group-hover:bg-purple-700 hover:bg-purple-700"
            >
              <span className="flex items-center justify-center">
                {completedActivities?.isSentenceWordOrderingCompleted
                  ? t("review")
                  : t("orderWords.button")}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </Button>
          </div>
        </div>

        {/* Matching */}
        <div
          className={`group relative overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-300 to-pink-200 transition-all duration-300 hover:scale-105 hover:shadow-xl dark:border-rose-800 dark:from-rose-950 dark:to-pink-950 ${
            completedActivities?.isSentenceMatchingCompleted
              ? "ring-2 ring-green-500 dark:ring-green-400"
              : ""
          }`}
        >
          <div className="absolute top-4 right-4 opacity-10 transition-opacity duration-300 group-hover:opacity-20">
            <GitBranch className="h-16 w-16" />
          </div>
          {completedActivities?.isSentenceMatchingCompleted && (
            <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-sm text-white">
              ✓
            </div>
          )}
          <div className="relative flex h-full flex-col p-6">
            <div className="mb-4 flex items-center">
              <div className="mr-4 rounded-full bg-rose-100 p-3 dark:bg-rose-900">
                <GitBranch className="h-6 w-6 text-rose-600 dark:text-rose-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {t("matching.title")}
                {completedActivities?.isSentenceMatchingCompleted && (
                  <span className="ml-2 text-sm text-green-600 dark:text-green-400">
                    {t("completed")}
                  </span>
                )}
              </h3>
            </div>
            <p className="mb-6 flex-grow text-gray-600 dark:text-gray-300">
              {t("matching.description")}
            </p>
            <Button
              onClick={() => setSelectedActivity("matching")}
              className="w-full bg-rose-600 text-white transition-all duration-300 group-hover:bg-rose-700 hover:bg-rose-700"
            >
              <span className="flex items-center justify-center">
                {completedActivities?.isSentenceMatchingCompleted
                  ? t("review")
                  : t("matching.button")}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
