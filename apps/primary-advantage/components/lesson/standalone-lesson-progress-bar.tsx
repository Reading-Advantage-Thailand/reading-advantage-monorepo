"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useContext,
} from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Timer, ArrowLeft } from "lucide-react";
import { QuizContext } from "@/contexts/question-context";
import { useTranslations } from "next-intl";
import {
  TaskIntroduction,
  TaskPreviewVocabulary,
  TaskFirstReading,
  TaskVocabularyCollection,
  TaskDeepReading,
  TaskSentenceCollection,
  TaskMultipleChoice,
  TaskShortAnswer,
  TaskVocabularyFlashcards,
  TaskVocabularyMatching,
  TaskSentenceFlashcards,
  TaskSentenceActivities,
  TaskLanguageQuestions,
  TaskLessonSummary,
} from "./task";

import { Article } from "@/types";
import { saveArticleToFlashcard } from "@/actions/flashcard";

export interface StandaloneLessonProps {
  article: Article;
}

export default function StandaloneLessonProgressBar({
  article,
}: StandaloneLessonProps) {
  const t = useTranslations("Lesson");
  const [isExpanded, setIsExpanded] = useState(false);
  const [maxHeight, setMaxHeight] = useState("0px");
  const contentRef = useRef<HTMLDivElement>(null);
  const [currentTask, setCurrentTask] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [nextPhaseContent, setNextPhaseContent] = useState<number | null>(null);
  const { timer, setPaused, setTimer } = useContext(QuizContext);

  // Use refs to access current values in useEffect without causing re-runs
  const currentTaskRef = useRef(currentTask);
  const isTransitioningRef = useRef(isTransitioning);

  // Update refs when state changes
  useEffect(() => {
    currentTaskRef.current = currentTask;
  }, [currentTask]);

  useEffect(() => {
    isTransitioningRef.current = isTransitioning;
  }, [isTransitioning]);

  const [shakeButton, setShakeButton] = useState(false);
  const [phaseLoading, setPhaseLoading] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;

    const fetchCurrentPhase = async () => {
      try {
        if (!isMounted) return;

        setPhaseLoading(true);
        const response = await fetch(`/api/lessons/${article?.id}/progress`);

        if (!isMounted) return;

        if (response.ok) {
          const data = await response.json();

          // Ensure we get a valid phase number
          const taskWidth = 100 / 14;
          const taskNumber = Math.ceil(
            data.userLessonProgress.progress / taskWidth,
          );

          // Update phase on initial load
          if (isMounted) {
            setCurrentTask(taskNumber === 0 ? 1 : taskNumber);
            setTimer(data.userLessonProgress.timeSpent as number);
            // Pause timer if on lesson summary
            if (taskNumber === 14) {
              setPaused(true);
            }
          }

          setInitialLoadComplete(true);
        } else {
          if (isMounted) {
            setCurrentTask(1);
            setInitialLoadComplete(true);
          }
        }
      } catch (error) {
        console.error("Error fetching current phase on initial load:", error);
        if (isMounted) {
          setCurrentTask(1);
          setInitialLoadComplete(true);
        }
      } finally {
        if (isMounted) {
          setPhaseLoading(false);
        }
      }
    };

    // Only fetch on initial load - don't refetch after transitions
    if (!initialLoadComplete) {
      timeoutId = setTimeout(() => {
        fetchCurrentPhase();
      }, 100); // Quick initial load
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [initialLoadComplete, article?.id, setTimer, setPaused]);

  const startLesson = async () => {
    try {
      // Prevent multiple clicks and transitions
      if (phaseLoading || isTransitioning) return;

      setIsTransitioning(true);

      // Start fade out animation
      setFadeOut(true);
      setNextPhaseContent(2);

      // Wait for fade out animation
      await new Promise((resolve) => setTimeout(resolve, 200));

      setPhaseLoading(true);

      const response = await fetch(`/api/lessons/${article?.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progress: Math.round((1 / 14) * 100),
          timeSpent: 0,
        }),
      });

      // Only update local state if API call succeeds
      if (response.ok) {
        // Update to new phase
        setCurrentTask(2);

        // Start fade in animation
        setPhaseLoading(false);
        await new Promise((resolve) => setTimeout(resolve, 50));
        setFadeOut(false);
        setNextPhaseContent(null);
      } else {
        console.error(
          "Failed to start lesson, response not ok:",
          response.status,
          response.statusText,
        );
        // Reset fade state on error
        setFadeOut(false);
        setNextPhaseContent(null);
        setPhaseLoading(false);
      }
    } catch (error) {
      console.error("Error starting lesson:", error);
      // Reset fade state on error
      setFadeOut(false);
      setNextPhaseContent(null);
      setPhaseLoading(false);
    } finally {
      // Keep transition state for a bit longer to prevent rapid changes and fetching
      setTimeout(() => setIsTransitioning(false), 500);
    }
  };

  const nextTask = async (Task: number, elapsedTime: number) => {
    // Prevent multiple clicks and transitions
    if (phaseLoading || isTransitioning) {
      return;
    }

    try {
      setIsTransitioning(true);
      setPaused(true);
      const newTask = Task + 1;

      // Start fade out animation
      setFadeOut(true);
      setNextPhaseContent(newTask);

      // Wait for fade out animation
      await new Promise((resolve) => setTimeout(resolve, 200));

      setPhaseLoading(true);

      if (newTask === 7) {
        await saveArticleToFlashcard(article?.id as string);
      }

      if (newTask === 14) {
        setPaused(true);
      }

      const response = await fetch(`/api/lessons/${article?.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progress: Math.round((newTask / 14) * 100),
          timeSpent: timer,
        }),
      });

      if (response.ok) {
        setCurrentTask(newTask);
        setPhaseLoading(false);
        await new Promise((resolve) => setTimeout(resolve, 50));
        setFadeOut(false);
        setNextPhaseContent(null);
      } else {
        console.error(
          "Failed to update phase:",
          response.status,
          response.statusText,
        );
        setFadeOut(false);
        setNextPhaseContent(null);
        setPhaseLoading(false);
      }
    } catch (error) {
      console.error("Error updating phase:", error);
      // Reset fade state on error
      setFadeOut(false);
      setNextPhaseContent(null);
      setPhaseLoading(false);
    } finally {
      // Keep transition state for a bit longer to prevent rapid changes and fetching
      setTimeout(() => setIsTransitioning(false), 500);
      // Only unpause if not on the lesson summary (task 14)
      if (Task + 1 !== 14) {
        setPaused(false);
      }
    }
  };

  const previousTask = async () => {
    // Prevent going back from phase 1 or 2
    if (currentTask <= 2 || phaseLoading || isTransitioning) {
      return;
    }

    try {
      setIsTransitioning(true);
      const newPhase = currentTask - 1;

      // Start fade out animation
      setFadeOut(true);
      setNextPhaseContent(newPhase);

      // Wait for fade out animation
      await new Promise((resolve) => setTimeout(resolve, 200));

      setPhaseLoading(true);
      setCurrentTask(newPhase);
      setPhaseLoading(false);
      await new Promise((resolve) => setTimeout(resolve, 50));
      setFadeOut(false);
      setNextPhaseContent(null);
    } catch (error) {
      console.error("Error going back to previous phase:", error);
      setFadeOut(false);
      setNextPhaseContent(null);
      setPhaseLoading(false);
    } finally {
      setTimeout(() => setIsTransitioning(false), 500);
    }
  };

  // Helper function for smooth phase transitions
  const getTaskComponent = (taskNum: number) => {
    switch (taskNum) {
      case 1:
        return (
          <TaskIntroduction article={article} onCompleteChange={() => {}} />
        );
      case 2:
        return <TaskPreviewVocabulary article={article} />;
      case 3:
        return <TaskFirstReading article={article} />;
      case 4:
        return <TaskVocabularyCollection article={article} />;
      case 5:
        return <TaskDeepReading article={article} />;
      case 6:
        return <TaskSentenceCollection article={article} />;
      case 7:
        return <TaskMultipleChoice article={article} />;
      case 8:
        return <TaskShortAnswer article={article} />;
      case 9:
        return <TaskVocabularyFlashcards articleId={article?.id} />;
      case 10:
        return <TaskVocabularyMatching articleId={article?.id} />;
      case 11:
        return <TaskSentenceFlashcards articleId={article?.id} />;
      case 12:
        return <TaskSentenceActivities articleId={article?.id} />;
      case 13:
        return <TaskLanguageQuestions article={article} />;
      case 14:
        return <TaskLessonSummary article={article} timerSpent={timer} />;
      default:
        return null;
    }
  };

  const getTaskDisplayName = (taskNum: number) => {
    switch (taskNum) {
      case 1:
        return t("tasks.introduction", { default: "Introduction" });
      case 2:
        return t("tasks.previewVocabulary", { default: "Preview Vocabulary" });
      case 3:
        return t("tasks.firstReading", { default: "First Reading" });
      case 4:
        return t("tasks.vocabularyCollection", {
          default: "Vocabulary Collection",
        });
      case 5:
        return t("tasks.deepReading", { default: "Deep Reading" });
      case 6:
        return t("tasks.sentenceCollection", {
          default: "Sentence Collection",
        });
      case 7:
        return t("tasks.multipleChoice", { default: "Multiple Choice" });
      case 8:
        return t("tasks.shortAnswer", { default: "Short Answer" });
      case 9:
        return t("tasks.vocabularyFlashcards", {
          default: "Vocabulary Flashcards",
        });
      case 10:
        return t("tasks.vocabularyMatching", {
          default: "Vocabulary Matching",
        });
      case 11:
        return t("tasks.sentenceFlashcards", {
          default: "Sentence Flashcards",
        });
      case 12:
        return t("tasks.sentenceActivities", {
          default: "Sentence Activities",
        });
      case 13:
        return t("tasks.languageQuestions", { default: "Language Questions" });
      case 14:
        return t("tasks.lessonSummary", { default: "Lesson Summary" });
      default:
        return "";
    }
  };

  useEffect(() => {
    if (contentRef.current) {
      setMaxHeight(isExpanded ? `${contentRef.current.scrollHeight}px` : "0px");
    }
  }, [isExpanded]);

  const LessonTimer = React.memo(() => {
    return (
      <div className="text-sm font-medium">
        {`${Math.floor(timer / 60)}m ${timer % 60}s`}
      </div>
    );
  });

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
      {/* Main Content Area */}
      <div className="xl:col-span-3">
        {phaseLoading && !fadeOut ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-900">
            <div className="animate-pulse space-y-6">
              <div className="h-8 w-1/2 rounded-lg bg-gray-200 dark:bg-gray-800"></div>
              <div className="space-y-4">
                <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-800"></div>
                <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800"></div>
                <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-800"></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Phase Content */}
            <div
              className={`transform transition-all duration-300 ease-in-out ${
                fadeOut
                  ? "translate-y-4 scale-95 opacity-0"
                  : "translate-y-0 scale-100 opacity-100"
              }`}
            >
              {getTaskComponent(currentTask)}
            </div>

            {/* Navigation Buttons */}
            <div
              className={`mt-6 transition-all duration-300 ease-in-out ${
                fadeOut ? "pointer-events-none opacity-50" : "opacity-100"
              }`}
            >
              {currentTask === 1 && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                  <Button
                    size="lg"
                    className="group relative w-full transform overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-6 py-4 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={startLesson}
                    disabled={phaseLoading || isTransitioning}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="relative flex items-center justify-center">
                      {phaseLoading || isTransitioning ? (
                        <>
                          <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>
                            {t("actions.starting", { default: "Starting..." })}
                          </span>
                        </>
                      ) : (
                        <>
                          {t("actions.startLesson", {
                            default: "Start Lesson",
                          })}
                          <ArrowLeft className="ml-3 h-5 w-5 rotate-180 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </div>
                  </Button>
                </div>
              )}

              {currentTask < 14 && currentTask > 1 && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                  <div className="flex gap-4">
                    {/* Back Button - Only show if phase > 2 */}
                    {currentTask > 2 && (
                      <Button
                        variant="outline"
                        size="lg"
                        className="group relative flex-1 transform overflow-hidden rounded-xl border-2 border-slate-300 px-6 py-4 text-base font-semibold text-slate-700 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-400 hover:text-slate-800 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-200"
                        onClick={previousTask}
                        disabled={phaseLoading || isTransitioning}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-50 to-slate-100 opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-slate-800 dark:to-slate-700" />
                        <div className="relative flex items-center justify-center">
                          {phaseLoading || isTransitioning ? (
                            <>
                              <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                              <span>
                                {t("actions.processing", {
                                  default: "Processing...",
                                })}
                              </span>
                            </>
                          ) : (
                            <>
                              <ArrowLeft className="mr-3 h-5 w-5 transition-transform group-hover:-translate-x-1" />
                              {t("actions.previousTask", {
                                default: "Previous Task",
                              })}
                            </>
                          )}
                        </div>
                      </Button>
                    )}

                    {/* Next Button */}
                    <Button
                      size="lg"
                      className={`${currentTask > 2 ? "flex-1" : "w-full"} group relative transform overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 px-6 py-4 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 ${
                        shakeButton ? "animate-shake" : ""
                      }`}
                      onClick={() => nextTask(currentTask, timer)}
                      disabled={phaseLoading || isTransitioning}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      <div className="relative flex items-center justify-center">
                        {phaseLoading || isTransitioning ? (
                          <>
                            <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            <span>
                              {t("actions.processing", {
                                default: "Processing...",
                              })}
                            </span>
                          </>
                        ) : (
                          <>
                            {t("actions.nextTask", { default: "Next Task" })}
                            <ArrowLeft className="ml-3 h-5 w-5 rotate-180 transition-transform group-hover:translate-x-1" />
                          </>
                        )}
                      </div>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar - Progress Tracker */}
      <div className="xl:col-span-1">
        <div className="sticky top-6">
          <div className="overflow-hidden rounded-2xl border border-gray-300 bg-gray-200 shadow-lg dark:border-gray-700 dark:bg-gray-900">
            {/* Progress Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4">
              <div className="flex items-center justify-between text-white">
                <div>
                  <h3 className="font-semibold">
                    {t("progress.title", { default: "Progress" })}
                  </h3>
                  <p className="text-sm opacity-90">
                    {t("progress.taskOfTotal", {
                      task: currentTask,
                      total: 14,
                      default: `Task ${currentTask} of 14`,
                    })}
                  </p>
                </div>
                {currentTask >= 2 && currentTask < 14 && (
                  <div className="flex items-center gap-2 rounded-lg bg-white/20 px-3 py-1">
                    <Timer className="h-4 w-4" />
                    <LessonTimer />
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-2 rounded-full bg-white transition-all duration-700 ease-out"
                  style={{ width: `${(currentTask / 14) * 100}%` }}
                />
              </div>
            </div>

            {/* Phase List */}
            <div className="p-6">
              {/* Mobile Accordion */}
              <div className="xl:hidden">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {t("progress.currentTask", {
                      task: currentTask,
                      default: `Current: Task ${currentTask}`,
                    })}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <div
                  ref={contentRef}
                  style={{ maxHeight }}
                  className="overflow-hidden transition-all duration-500 ease-in-out"
                >
                  <div className="space-y-3">
                    {Array.from({ length: 14 }, (_, index) => {
                      const isActive = index + 1 === currentTask;
                      const isCompleted = index + 1 < currentTask;

                      return (
                        <div
                          key={index}
                          className="flex items-center space-x-3"
                        >
                          <div
                            className={`h-3 w-3 flex-shrink-0 rounded-full transition-all duration-300 ${
                              isActive
                                ? "scale-110 bg-blue-500 ring-4 ring-blue-100 dark:ring-blue-900"
                                : isCompleted
                                  ? "scale-100 bg-green-500"
                                  : "scale-90 bg-gray-300 dark:bg-gray-600"
                            }`}
                          />
                          <span
                            className={`text-sm transition-all duration-200 ${
                              isCompleted
                                ? "text-gray-400 line-through"
                                : isActive
                                  ? "font-medium text-blue-600 dark:text-blue-400"
                                  : "text-gray-600 dark:text-gray-400"
                            }`}
                          >
                            {index + 1}. {getTaskDisplayName(index + 1)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Desktop List */}
              <div className="hidden space-y-3 xl:block">
                {Array.from({ length: 14 }, (_, index) => {
                  const isActive = index + 1 === currentTask;
                  const isCompleted = index + 1 < currentTask;

                  return (
                    <div key={index} className="flex items-center space-x-3">
                      <div
                        className={`h-3 w-3 flex-shrink-0 rounded-full transition-all duration-300 ${
                          isActive
                            ? "scale-110 bg-blue-500 ring-4 ring-blue-100 dark:ring-blue-900"
                            : isCompleted
                              ? "scale-100 bg-green-500"
                              : "scale-90 bg-gray-300 dark:bg-gray-600"
                        }`}
                      />
                      <span
                        className={`text-sm leading-tight transition-all duration-200 ${
                          isCompleted
                            ? "text-gray-400 line-through"
                            : isActive
                              ? "font-medium text-blue-600 dark:text-blue-400"
                              : "text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {index + 1}. {getTaskDisplayName(index + 1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
