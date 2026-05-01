"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LessonOrderSentences from "../lesson-order-sentence";
import LessonClozeTest from "../lesson-cloze-test";
import LessonOrderWords from "../lesson-order-word";
import LessonMatching from "../lesson-matching-word";
import {
  Book,
  ListOrdered,
  FileText,
  Shuffle,
  GitBranch,
  ArrowRight,
} from "lucide-react";
import { useScopedI18n } from "@/locales/client";
import { UserActivityLog } from "@/components/models/user-activity-log-model";

interface Phase12SentenceActivitiesProps {
  userId: string;
  articleId: string;
  sentenceActivity: string;
  setSentenceActivity: (activity: string) => void;
  onCompleteChange: (complete: boolean) => void;
}

const Phase12SentenceActivities: React.FC<Phase12SentenceActivitiesProps> = ({
  userId,
  articleId,
  sentenceActivity,
  setSentenceActivity,
  onCompleteChange,
}) => {
  const t = useScopedI18n("pages.student.lessonPage");
  const tb = useScopedI18n("pages.student.practicePage");
  const [completedActivities, setCompletedActivities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  // Check and ensure translations exist
  useEffect(() => {
    const checkAndTranslate = async () => {
      try {
        setIsLoading(true);
        setTranslationError(null);

        // Check if sentences have translations
        const sentencesResponse = await fetch(
          `/api/v1/users/sentences/${userId}?articleId=${articleId}`
        );

        if (sentencesResponse.ok) {
          const sentencesData = await sentencesResponse.json();
          const sentences = sentencesData.sentences || [];

          // Check if any sentence is missing translation
          const missingTranslation = sentences.some(
            (sentence: any) =>
              !sentence.translation ||
              Object.keys(sentence.translation).length === 0 ||
              !sentence.translation.th
          );

          if (missingTranslation && sentences.length > 0) {
            console.log("Missing translations detected, generating translations...");
            setIsTranslating(true);

            // Call the translation API for the article passage
            const translateResponse = await fetch(
              `/api/v1/assistant/translate/${articleId}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  type: "passage",
                  targetLanguage: "th", // Start with Thai, the API will handle all languages
                }),
              }
            );

            if (!translateResponse.ok) {
              const errorData = await translateResponse.json();
              throw new Error(errorData.message || "Translation failed");
            }

            console.log("Translation completed successfully");
            setIsTranslating(false);
          }
        }
      } catch (error) {
        console.error("Error checking/translating:", error);
        setTranslationError(
          error instanceof Error ? error.message : "Translation failed"
        );
        setIsTranslating(false);
      }
    };

    checkAndTranslate();
  }, [userId, articleId]);

  // Check for completed activities
  useEffect(() => {
    const checkCompletedActivities = async () => {
      try {
        const response = await fetch(`/api/v1/users/${userId}/activity-data`);
        if (response.ok) {
          const data = await response.json();
          const activities: UserActivityLog[] = data.results || [];
          
          // Filter activities for this article and Phase 12 activity types
          const phase12Activities = activities.filter((activity) => 
            activity.details?.articleId === articleId && 
            activity.completed &&
            ['SENTENCE_ORDERING', 'SENTENCE_CLOZE_TEST', 'SENTENCE_WORD_ORDERING', 'SENTENCE_MATCHING'].includes(activity.activityType.toUpperCase())
          );
          
          // Map activity types to our component names
          const completed = phase12Activities.map((activity) => {
            switch (activity.activityType.toUpperCase()) {
              case 'SENTENCE_ORDERING':
                return 'order-sentences';
              case 'SENTENCE_CLOZE_TEST':
                return 'cloze-test';
              case 'SENTENCE_WORD_ORDERING':
                return 'order-words';
              case 'SENTENCE_MATCHING':
                return 'matching';
              default:
                return '';
            }
          }).filter(Boolean);
          
          setCompletedActivities(completed);
          
          // If there's only one completed activity and no current selection, show it
          if (completed.length === 1 && sentenceActivity === "none") {
            setSentenceActivity(completed[0]);
          }
        }
      } catch (error) {
        console.error('Error checking completed activities:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkCompletedActivities();
  }, [userId, articleId, sentenceActivity, setSentenceActivity]);

  // Activity Selection Screen
  if (sentenceActivity === "none") {
    // Show loading state while checking activities or translating
    if (isLoading || isTranslating) {
      return (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-4 bg-gradient-to-br from-orange-300 via-amber-300 to-yellow-300 dark:from-orange-950 dark:via-amber-950 dark:to-yellow-950 p-8 rounded-2xl border border-orange-200 dark:border-orange-800">
            <div className="inline-flex items-center justify-center p-3 bg-orange-100 dark:bg-orange-900 rounded-full mb-4">
              <Book className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t("phase12Title")}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {isTranslating ? t("translatingContent") || "กำลังแปลเนื้อหา..." : t("loadingActivities")}
            </p>
            {isTranslating && (
              <div className="flex items-center justify-center mt-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 dark:border-orange-400" />
              </div>
            )}
          </div>
        </div>
      );
    }

    // Show error if translation failed
    if (translationError) {
      return (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-4 bg-gradient-to-br from-red-300 via-rose-300 to-pink-300 dark:from-red-950 dark:via-rose-950 dark:to-pink-950 p-8 rounded-2xl border border-red-200 dark:border-red-800">
            <div className="inline-flex items-center justify-center p-3 bg-red-100 dark:bg-red-900 rounded-full mb-4">
              <Book className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t("translationError") || "เกิดข้อผิดพลาดในการแปล"}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {translationError}
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white"
            >
              {t("retry") || "ลองอีกครั้ง"}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="text-center space-y-4 bg-gradient-to-br from-orange-300 via-amber-300 to-yellow-300 dark:from-orange-950 dark:via-amber-950 dark:to-yellow-950 p-8 rounded-2xl border border-orange-200 dark:border-orange-800">
          <div className="inline-flex items-center justify-center p-3 bg-orange-100 dark:bg-orange-900 rounded-full mb-4">
            <Book className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("phase12Title")}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {t("phase12Description")}
          </p>
        </div>

        {/* Activities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Order Sentences */}
          <div className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-300 to-indigo-200 dark:from-blue-950 dark:to-indigo-950 border border-blue-200 dark:border-blue-800 transition-all duration-300 hover:scale-105 hover:shadow-xl ${
            completedActivities.includes('order-sentences') ? 'ring-2 ring-green-500 dark:ring-green-400' : ''
          }`}>
            <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
              <ListOrdered className="h-16 w-16" />
            </div>
            {completedActivities.includes('order-sentences') && (
              <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                ✓
              </div>
            )}
            <div className="relative p-6 h-full flex flex-col">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full mr-4">
                  <ListOrdered className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {tb("orderSentences")}
                  {completedActivities.includes('order-sentences') && (
                    <span className="ml-2 text-sm text-green-600 dark:text-green-400">{t("completed")}</span>
                  )}
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-6 flex-grow">
                {tb("orderSentencesPractice.orderSentencesDescription")}
              </p>
              <Button
                onClick={() => setSentenceActivity("order-sentences")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white group-hover:bg-blue-700 transition-all duration-300"
              >
                <span className="flex items-center justify-center">
                  {completedActivities.includes('order-sentences') ? t("review") : tb("orderSentencesPractice.orderSentences")}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
              </Button>
            </div>
          </div>

          {/* Cloze Test */}
          <div className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-300 to-emerald-200 dark:from-green-950 dark:to-emerald-950 border border-green-200 dark:border-green-800 transition-all duration-300 hover:scale-105 hover:shadow-xl ${
            completedActivities.includes('cloze-test') ? 'ring-2 ring-green-500 dark:ring-green-400' : ''
          }`}>
            <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
              <FileText className="h-16 w-16" />
            </div>
            {completedActivities.includes('cloze-test') && (
              <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                ✓
              </div>
            )}
            <div className="relative p-6 h-full flex flex-col">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full mr-4">
                  <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {tb("clozeTest")}
                  {completedActivities.includes('cloze-test') && (
                    <span className="ml-2 text-sm text-green-600 dark:text-green-400">{t("completed")}</span>
                  )}
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-6 flex-grow">
                {tb("clozeTestPractice.clozeTestDescription")}
              </p>
              <Button
                onClick={() => setSentenceActivity("cloze-test")}
                className="w-full bg-green-600 hover:bg-green-700 text-white group-hover:bg-green-700 transition-all duration-300"
              >
                <span className="flex items-center justify-center">
                  {completedActivities.includes('cloze-test') ? t("review") : tb("clozeTestPractice.clozeTest")}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
              </Button>
            </div>
          </div>

          {/* Order Words */}
          <div className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-300 to-violet-200 dark:from-purple-950 dark:to-violet-950 border border-purple-200 dark:border-purple-800 transition-all duration-300 hover:scale-105 hover:shadow-xl ${
            completedActivities.includes('order-words') ? 'ring-2 ring-green-500 dark:ring-green-400' : ''
          }`}>
            <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
              <Shuffle className="h-16 w-16" />
            </div>
            {completedActivities.includes('order-words') && (
              <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                ✓
              </div>
            )}
            <div className="relative p-6 h-full flex flex-col">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full mr-4">
                  <Shuffle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {tb("orderWords")}
                  {completedActivities.includes('order-words') && (
                    <span className="ml-2 text-sm text-green-600 dark:text-green-400">{t("completed")}</span>
                  )}
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-6 flex-grow">
                {tb("orderWordsPractice.orderWordsDescription")}
              </p>
              <Button
                onClick={() => setSentenceActivity("order-words")}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white group-hover:bg-purple-700 transition-all duration-300"
              >
                <span className="flex items-center justify-center">
                  {completedActivities.includes('order-words') ? t("review") : tb("orderWordsPractice.orderWords")}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
              </Button>
            </div>
          </div>

          {/* Matching */}
          <div className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-300 to-pink-200 dark:from-rose-950 dark:to-pink-950 border border-rose-200 dark:border-rose-800 transition-all duration-300 hover:scale-105 hover:shadow-xl ${
            completedActivities.includes('matching') ? 'ring-2 ring-green-500 dark:ring-green-400' : ''
          }`}>
            <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
              <GitBranch className="h-16 w-16" />
            </div>
            {completedActivities.includes('matching') && (
              <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                ✓
              </div>
            )}
            <div className="relative p-6 h-full flex flex-col">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-rose-100 dark:bg-rose-900 rounded-full mr-4">
                  <GitBranch className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {tb("matching")}
                  {completedActivities.includes('matching') && (
                    <span className="ml-2 text-sm text-green-600 dark:text-green-400">{t("completed")}</span>
                  )}
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-6 flex-grow">
                {tb("matchingPractice.matchingDescription")}
              </p>
              <Button
                onClick={() => setSentenceActivity("matching")}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white group-hover:bg-rose-700 transition-all duration-300"
              >
                <span className="flex items-center justify-center">
                  {completedActivities.includes('matching') ? t("review") : tb("matchingPractice.matching")}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Order Sentences Activity
  if (sentenceActivity === "order-sentences") {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="text-center space-y-4 bg-gradient-to-br from-orange-300 via-amber-300 to-yellow-300 dark:from-orange-950 dark:via-amber-950 dark:to-yellow-950 p-8 rounded-2xl border border-orange-200 dark:border-orange-800">
          <div className="inline-flex items-center justify-center p-3 bg-orange-100 dark:bg-orange-900 rounded-full mb-4">
            <Book className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {tb("orderSentencesPractice.orderSentences")}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {tb("orderSentencesPractice.orderSentencesDescription")}
          </p>
        </div>

        {/* Order Sentences Component */}

        <LessonOrderSentences
          articleId={articleId}
          userId={userId}
          onCompleteChange={onCompleteChange}
        />
      </div>
    );
  }

  // Cloze Test Activity
  if (sentenceActivity === "cloze-test") {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="text-center space-y-4 bg-gradient-to-br from-orange-300 via-amber-300 to-yellow-300 dark:from-orange-950 dark:via-amber-950 dark:to-yellow-950 p-8 rounded-2xl border border-orange-200 dark:border-orange-800">
          <div className="inline-flex items-center justify-center p-3 bg-orange-100 dark:bg-orange-900 rounded-full mb-4">
            <Book className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {tb("clozeTest")}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {tb("clozeTestPractice.clozeTestDescription")}
          </p>
        </div>

        {/* Cloze Test Component */}
        <LessonClozeTest
          articleId={articleId}
          userId={userId}
          onCompleteChange={onCompleteChange}
        />
      </div>
    );
  }

  // Order Words Activity
  if (sentenceActivity === "order-words") {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="text-center space-y-4 bg-gradient-to-br from-orange-300 via-amber-300 to-yellow-300 dark:from-orange-950 dark:via-amber-950 dark:to-yellow-950 p-8 rounded-2xl border border-orange-200 dark:border-orange-800">
          <div className="inline-flex items-center justify-center p-3 bg-orange-100 dark:bg-orange-900 rounded-full mb-4">
            <Book className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {tb("orderWords")}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {tb("orderWordsPractice.orderWordsDescription")}
          </p>
        </div>

        {/* Order Words Component */}

        <LessonOrderWords
          articleId={articleId}
          userId={userId}
          onCompleteChange={onCompleteChange}
        />
      </div>
    );
  }

  // Matching Activity
  if (sentenceActivity === "matching") {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="text-center space-y-4 bg-gradient-to-br from-orange-300 via-amber-300 to-yellow-300 dark:from-orange-950 dark:via-amber-950 dark:to-yellow-950 p-8 rounded-2xl border border-orange-200 dark:border-orange-800">
          <div className="inline-flex items-center justify-center p-3 bg-orange-100 dark:bg-orange-900 rounded-full mb-4">
            <Book className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {tb("matching")}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {tb("matchingPractice.matchingDescription")}
          </p>
        </div>

        {/* Matching Component */}
        <div className="bg-zinc-200 dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6">
            <LessonMatching
              articleId={articleId}
              userId={userId}
              onCompleteChange={onCompleteChange}
            />
          </div>
        </div>
      </div>
    );
  }

  return null;
};

Phase12SentenceActivities.displayName = "Phase12SentenceActivities";
export default Phase12SentenceActivities;
