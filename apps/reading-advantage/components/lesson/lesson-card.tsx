import React from "react";
import { getScopedI18n } from "@/locales/server";
import { Article } from "../models/article-model";
import { TimerProvider } from "@/contexts/timer-context";
import LessonProgressBar from "./lesson-progress-bar";
import { BookOpenIcon, GraduationCapIcon } from "lucide-react";

type Props = {
  article: Article;
  articleId: string;
  userId: string;
  classroomId?: string;
};

export default async function LessonCard({
  article,
  articleId,
  userId,
  classroomId,
}: Props) {
  const tb = await getScopedI18n("pages.student.lessonPage");
  const phaseKeys = [
    "phases.0",
    "phases.1",
    "phases.2",
    "phases.3",
    "phases.4",
    "phases.5",
    "phases.6",
    "phases.7",
    "phases.8",
    "phases.9",
    "phases.10",
    "phases.11",
    "phases.12",
    "phases.13",
  ] as const;

  const phases = phaseKeys.map((key) => tb(key));

  return (
    <div className="w-full">
      {/* Header Section */}
      <div className="mb-8">
        <div className="bg-indigo-400 dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full">
                <BookOpenIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {tb("lesson")}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {tb("interactiveReadingExperience")}
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-200 to-pink-200 dark:from-purple-950 dark:to-pink-950 rounded-full">
              <GraduationCapIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                {tb("learningMode")}
              </span>
            </div>
          </div>

          {/* Article Title */}
          <div className="p-4 bg-gradient-to-r from-gray-300 to-blue-300 dark:from-gray-800 dark:to-blue-950 rounded-xl border-l-4 border-blue-500">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight">
              {article.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              {tb("beginReadingJourney")}
            </p>
          </div>
        </div>
      </div>

      {/* Main Lesson Content */}
      <TimerProvider>
        <LessonProgressBar
          classroomId={classroomId}
          phases={phases}
          article={article}
          articleId={articleId}
          userId={userId}
        />
      </TimerProvider>
    </div>
  );
}
