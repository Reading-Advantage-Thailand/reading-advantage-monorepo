"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Timer, ArrowLeft } from "lucide-react";
import { Article } from "../models/article-model";
import { useScopedI18n, useCurrentLocale } from "@/locales/client";
import { useTimer } from "@/contexts/timer-context";
import {
  ActivityType,
  ActivityStatus,
} from "../models/user-activity-log-model";
import {
  Phase1Introduction,
  Phase2VocabularyPreview,
  Phase3FirstReading,
  Phase4VocabularyCollection,
  Phase5DeepReading,
  Phase6SentenceCollection,
  Phase7MultipleChoice,
  Phase8ShortAnswer,
  Phase9VocabularyFlashcards,
  Phase10VocabularyMatching,
  Phase11SentenceFlashcards,
  Phase12SentenceActivities,
  Phase13LanguageQuestions,
  Phase14LessonSummary,
} from "./phases";

interface LessonProgressBarProps {
  phases: string[];
  article: Article;
  articleId: string;
  userId: string;
  classroomId?: string;
}

const LessonProgressBar: React.FC<LessonProgressBarProps> = ({
  phases,
  article,
  articleId,
  userId,
  classroomId,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [maxHeight, setMaxHeight] = useState("0px");
  const contentRef = useRef<HTMLDivElement>(null);
  const [currentPhase, setCurrentPhase] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [nextPhaseContent, setNextPhaseContent] = useState<number | null>(null);

  // Use refs to access current values in useEffect without causing re-runs
  const currentPhaseRef = useRef(currentPhase);
  const isTransitioningRef = useRef(isTransitioning);

  // Update refs when state changes
  useEffect(() => {
    currentPhaseRef.current = currentPhase;
  }, [currentPhase]);

  useEffect(() => {
    isTransitioningRef.current = isTransitioning;
  }, [isTransitioning]);

  const t = useScopedI18n("pages.student.lessonPage");
  const locale = useCurrentLocale() as "en" | "th" | "cn" | "tw" | "vi";
  const [showVocabularyButton, setShowVocabularyButton] = useState(true);
  const [showSentenseButton, setShowSentenseButton] = useState(true);
  const [sentenceActivity, setSentenceActivity] = useState("none");
  const [phaseCompletion, setPhaseCompletion] = useState<boolean[]>(
    Array(phases.length).fill(false)
  );
  const [shakeButton, setShakeButton] = useState(false);
  const { elapsedTime, startTimer, stopTimer, setTimer } = useTimer();
  const [phaseLoading, setPhaseLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;

    const fetchCurrentPhase = async () => {
      try {
        if (!isMounted) return;

        setPhaseLoading(true);
        const response = await fetch(
          `/api/v1/lesson/${userId}?articleId=${articleId}`
        );

        if (!isMounted) return;

        if (response.ok) {
          const phase = await response.json();
          // Ensure we get a valid phase number
          const phaseNumber = parseInt(phase.currentPhase) || 1;
          const validPhase = Math.max(1, Math.min(phaseNumber, phases.length));

          // Update phase on initial load
          if (isMounted) {
            setCurrentPhase(validPhase);
          }
          setTimer(phase.elapsedTime || 0);
          setInitialLoadComplete(true);
        } else {
          console.error("Failed to fetch current phase on initial load");
          if (isMounted) {
            setCurrentPhase(1);
            setInitialLoadComplete(true);
          }
        }
      } catch (error) {
        console.error("Error fetching current phase on initial load:", error);
        if (isMounted) {
          setCurrentPhase(1);
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
  }, [userId, articleId, setTimer, phases.length, initialLoadComplete]); // Add initialLoadComplete to dependencies

  const LessonTimer = React.memo(() => {
    const { elapsedTime } = useTimer();

    return (
      <div className="text-sm font-medium">
        {`${Math.floor(elapsedTime / 60)}m ${elapsedTime % 60}s`}
      </div>
    );
  });
  LessonTimer.displayName = "LessonTimer";

  const updatePhaseCompletion = useCallback(
    (phaseIndex: number, isComplete: boolean) => {
      setPhaseCompletion((prev) => {
        const updated = [...prev];
        if (updated[phaseIndex] !== isComplete) {
          updated[phaseIndex] = isComplete;
          return updated;
        }
        return prev;
      });
    },
    []
  );

  // Memoize stable callbacks for each phase to prevent re-renders from timer updates 
  // from recreating these functions and triggering infinite fetch loops in child components.
  const phaseCallbacks = useMemo(() => {
    return Array.from({ length: phases.length + 1 }, (_, i) => (complete: boolean) => 
      updatePhaseCompletion(i, complete)
    );
  }, [phases.length, updatePhaseCompletion]);

  useEffect(() => {
    if (currentPhase >= 2 && currentPhase < 14) {
      startTimer();
    } else {
      stopTimer();
    }
  }, [currentPhase, startTimer, stopTimer]);

  useEffect(() => {
    const logActivity = async () => {
      if (currentPhase === 14) {
        await fetch(`/api/v1/users/${userId}/activitylog`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            articleId: article.id,
            activityType: ActivityType.LessonRead,
            activityStatus: ActivityStatus.Completed,
            timeTaken: elapsedTime,
            details: {
              title: article.title,
              level: article.ra_level,
              cefr_level: article.cefr_level,
              type: article.type,
              genre: article.genre,
              subgenre: article.subgenre,
            },
          }),
        });
      }
    };

    logActivity();
  }, [currentPhase, userId, article, elapsedTime]);

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
      const newPhase = 2; // Always go to phase 2 from phase 1

      // Call API to update server state
      const url = classroomId
        ? `/api/v1/lesson/${userId}?articleId=${articleId}&classroomId=${classroomId}`
        : `/api/v1/lesson/${userId}?articleId=${articleId}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phase: 1, // Starting from phase 1
          status: 2, // Completed status
          elapsedTime: 0,
        }),
      });

      // Only update local state if API call succeeds
      if (response.ok) {
        const responseData = await response.json();

        // Update to new phase
        setCurrentPhase(newPhase);

        // Start fade in animation
        setPhaseLoading(false);
        await new Promise((resolve) => setTimeout(resolve, 50));
        setFadeOut(false);
        setNextPhaseContent(null);
      } else {
        console.error(
          "Failed to start lesson, response not ok:",
          response.status,
          response.statusText
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

  const nextPhase = async (Phase: number, elapsedTime: number) => {
    // Check if current phase is completed before proceeding
    if (!phaseCompletion[Phase - 1]) {
      setShakeButton(true);
      setTimeout(() => setShakeButton(false), 500);
      return;
    }

    // Prevent multiple clicks and transitions
    if (phaseLoading || isTransitioning) {
      return;
    }

    try {
      setIsTransitioning(true);
      const newPhase = Phase + 1;

      // Start fade out animation
      setFadeOut(true);
      setNextPhaseContent(newPhase);

      // Wait for fade out animation
      await new Promise((resolve) => setTimeout(resolve, 200));

      setPhaseLoading(true);

      // Handle final phase logging
      if (Phase === 13) {
        await fetch(`/api/v1/users/${userId}/activitylog`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            articleId: article.id,
            activityType: ActivityType.LessonRead,
            activityStatus: ActivityStatus.Completed,
            timeTaken: elapsedTime,
            details: {
              title: article.title,
              level: article.ra_level,
              cefr_level: article.cefr_level,
              type: article.type,
              genre: article.genre,
              subgenre: article.subgenre,
            },
          }),
        });
      }

      // Update server state
      const url = classroomId
        ? `/api/v1/lesson/${userId}?articleId=${articleId}&classroomId=${classroomId}`
        : `/api/v1/lesson/${userId}?articleId=${articleId}`;

      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phase: Phase,
          status: 2,
          elapsedTime: elapsedTime,
        }),
      });

      // Only update local state if API call succeeds
      if (response.ok) {
        const responseData = await response.json();

        // Update to new phase
        setCurrentPhase(newPhase);

        // Start fade in animation
        setPhaseLoading(false);
        await new Promise((resolve) => setTimeout(resolve, 50));
        setFadeOut(false);
        setNextPhaseContent(null);
      } else {
        console.error(
          "Failed to update phase, API response not ok:",
          response.status,
          response.statusText
        );
        // Reset fade state on error
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
    }
  };

  const previousPhase = async () => {
    // Prevent going back from phase 1 or 2 
    if (currentPhase <= 2 || phaseLoading || isTransitioning) {
      return;
    }

    try {
      setIsTransitioning(true);
      const newPhase = currentPhase - 1;

      // Start fade out animation
      setFadeOut(true);
      setNextPhaseContent(newPhase);

      // Wait for fade out animation
      await new Promise((resolve) => setTimeout(resolve, 200));

      setPhaseLoading(true);

      const url = classroomId
        ? `/api/v1/lesson/${userId}?articleId=${articleId}&classroomId=${classroomId}`
        : `/api/v1/lesson/${userId}?articleId=${articleId}`;

      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phase: newPhase,
          status: 1, // In progress status for going back
          elapsedTime: elapsedTime,
        }),
      });

      if (response.ok) {
        setCurrentPhase(newPhase);
        // Reset phase completion for the current phase since we're going back
        const updatedCompletion = [...phaseCompletion];
        updatedCompletion[currentPhase - 1] = false;
        setPhaseCompletion(updatedCompletion);
        
        setPhaseLoading(false);

        // Start fade in animation
        await new Promise((resolve) => setTimeout(resolve, 50));
        setFadeOut(false);
        setNextPhaseContent(null);
      } else {
        console.error("Failed to go back to previous phase");
        setFadeOut(false);
        setNextPhaseContent(null);
        setPhaseLoading(false);
      }
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
  const getPhaseComponent = (phaseNum: number) => {
    switch (phaseNum) {
      case 1:
        return (
          <Phase1Introduction
            article={article}
            articleId={articleId}
            userId={userId}
            onCompleteChange={phaseCallbacks[0]}
          />
        );
      case 2:
        return (
          <Phase2VocabularyPreview
            article={article}
            articleId={articleId}
            userId={userId}
            onCompleteChange={phaseCallbacks[1]}
          />
        );
      case 3:
        return (
          <Phase3FirstReading
            article={article}
            articleId={articleId}
            userId={userId}
            locale={locale}
            onCompleteChange={phaseCallbacks[2]}
          />
        );
      case 4:
        return (
          <Phase4VocabularyCollection
            article={article}
            articleId={articleId}
            userId={userId}
            onCompleteChange={phaseCallbacks[3]}
          />
        );
      case 5:
        return (
          <Phase5DeepReading
            article={article}
            articleId={articleId}
            userId={userId}
            locale={locale}
            onCompleteChange={phaseCallbacks[4]}
          />
        );
      case 6:
        return (
          <Phase6SentenceCollection
            article={article}
            articleId={articleId}
            userId={userId}
            locale={locale}
            onCompleteChange={phaseCallbacks[5]}
          />
        );
      case 7:
        return (
          <Phase7MultipleChoice
            article={article}
            articleId={articleId}
            userId={userId}
            onCompleteChange={phaseCallbacks[6]}
          />
        );
      case 8:
        return (
          <Phase8ShortAnswer
            article={article}
            articleId={articleId}
            userId={userId}
            onCompleteChange={phaseCallbacks[7]}
          />
        );
      case 9:
        return showVocabularyButton ? (
          <Phase9VocabularyFlashcards
            articleId={articleId}
            userId={userId}
            showVocabularyButton={showVocabularyButton}
            setShowVocabularyButton={setShowVocabularyButton}
            onCompleteChange={phaseCallbacks[8]}
          />
        ) : null;
      case 10:
        return (
          <Phase10VocabularyMatching
            articleId={articleId}
            userId={userId}
            onCompleteChange={phaseCallbacks[9]}
          />
        );
      case 11:
        return (
          <Phase11SentenceFlashcards
            articleId={articleId}
            userId={userId}
            showSentenseButton={showSentenseButton}
            setShowSentenseButton={setShowSentenseButton}
            onCompleteChange={phaseCallbacks[10]}
          />
        );
      case 12:
        return (
          <Phase12SentenceActivities
            articleId={articleId}
            userId={userId}
            sentenceActivity={sentenceActivity}
            setSentenceActivity={setSentenceActivity}
            onCompleteChange={phaseCallbacks[11]}
          />
        );
      case 13:
        return (
          <Phase13LanguageQuestions
            article={article}
            onCompleteChange={phaseCallbacks[12]}
            skipPhase={() => skipPhase(currentPhase)}
          />
        );
      case 14:
        return (
          <Phase14LessonSummary
            articleId={articleId}
            userId={userId}
            elapsedTime={`${Math.floor(elapsedTime / 60)}m ${elapsedTime % 60}s`}
          />
        );
      default:
        return null;
    }
  };

  const skipPhase = async (Phase: number) => {
    if (Phase === 13) {
      await fetch(`/api/v1/users/${userId}/activitylog`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: article.id,
          activityType: ActivityType.LessonRead,
          activityStatus: ActivityStatus.Completed,
          timeTaken: elapsedTime,
          details: {
            title: article.title,
            level: article.ra_level,
            cefr_level: article.cefr_level,
            type: article.type,
            genre: article.genre,
            subgenre: article.subgenre,
          },
        }),
      });
    }
    setCurrentPhase(Phase + 1);

    const url = classroomId
      ? `/api/v1/lesson/${userId}?articleId=${articleId}&classroomId=${classroomId}`
      : `/api/v1/lesson/${userId}?articleId=${articleId}`;

    await fetch(url, {
      method: "PUT",
      body: JSON.stringify({
        phase: Phase,
        status: 2,
        elapsedTime: elapsedTime,
      }),
    });
  };

  useEffect(() => {
    if (contentRef.current) {
      setMaxHeight(isExpanded ? `${contentRef.current.scrollHeight}px` : "0px");
    }
  }, [isExpanded]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      {/* Main Content Area */}
      <div className="xl:col-span-3">
        {phaseLoading && !fadeOut ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-lg w-1/2"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Phase Content */}
            <div
              className={`transition-all duration-300 ease-in-out transform ${
                fadeOut
                  ? "opacity-0 translate-y-4 scale-95"
                  : "opacity-100 translate-y-0 scale-100"
              }`}
            >
              {getPhaseComponent(currentPhase)}
            </div>

            {/* Navigation Buttons */}
            <div
              className={`mt-6 transition-all duration-300 ease-in-out ${
                fadeOut ? "opacity-50 pointer-events-none" : "opacity-100"
              }`}
            >
              {currentPhase === 1 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                  <Button
                    size="lg"
                    className="w-full group relative overflow-hidden bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 text-white py-4 px-6 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    onClick={startLesson}
                    disabled={phaseLoading || isTransitioning}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative flex items-center justify-center">
                      {phaseLoading || isTransitioning ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" />
                          <span>Starting...</span>
                        </>
                      ) : (
                        <>
                          <span>{t("startLesson")}</span>
                          <ArrowLeft className="h-5 w-5 ml-3 rotate-180 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </div>
                  </Button>
                </div>
              )}

              {currentPhase < phases.length && currentPhase > 1 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex gap-4">
                    {/* Back Button - Only show if phase > 2 */}
                    {currentPhase > 2 && (
                      <Button
                        variant="outline"
                        size="lg"
                        className="flex-1 group relative overflow-hidden border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-800 dark:hover:text-slate-200 py-4 px-6 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                        onClick={previousPhase}
                        disabled={phaseLoading || isTransitioning}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="relative flex items-center justify-center">
                          {phaseLoading || isTransitioning ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-400 border-t-transparent mr-3" />
                              <span>Processing...</span>
                            </>
                          ) : (
                            <>
                              <ArrowLeft className="h-5 w-5 mr-3 transition-transform group-hover:-translate-x-1" />
                              <span>{t("previousPhase")}</span>
                            </>
                          )}
                        </div>
                      </Button>
                    )}
                    
                    {/* Next Button */}
                    <Button
                      size="lg"
                      className={`${currentPhase > 2 ? 'flex-1' : 'w-full'} group relative overflow-hidden bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 text-white py-4 px-6 text-base font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                        shakeButton ? "animate-shake" : ""
                      }`}
                      onClick={() => nextPhase(currentPhase, elapsedTime)}
                      disabled={phaseLoading || isTransitioning}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative flex items-center justify-center">
                        {phaseLoading || isTransitioning ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <span>{t("nextPhase")}</span>
                            <ArrowLeft className="h-5 w-5 ml-3 rotate-180 transition-transform group-hover:translate-x-1" />
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
          <div className="bg-gray-200 dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-300 dark:border-gray-700 overflow-hidden">
            {/* Progress Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6">
              <div className="flex items-center justify-between text-white">
                <div>
                  <h3 className="font-semibold">Progress</h3>
                  <p className="text-sm opacity-90">
                    Phase {currentPhase} of {phases.length}
                  </p>
                </div>
                {currentPhase >= 2 && currentPhase < 14 && (
                  <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1">
                    <Timer className="h-4 w-4" />
                    <LessonTimer />
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mt-4 bg-white/20 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-white h-2 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${(currentPhase / phases.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Phase List */}
            <div className="p-6">
              {/* Mobile Accordion */}
              <div className="xl:hidden">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Current: {phases[currentPhase - 1]}
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
                  className="transition-all duration-500 ease-in-out overflow-hidden"
                >
                  <div className="space-y-3">
                    {phases.map((phase, index) => {
                      const isActive = index + 1 === currentPhase;
                      const isCompleted = index + 1 < currentPhase;

                      return (
                        <div
                          key={index}
                          className="flex items-center space-x-3"
                        >
                          <div
                            className={`w-3 h-3 rounded-full flex-shrink-0 transition-all duration-300 ${
                              isActive
                                ? "bg-blue-500 ring-4 ring-blue-100 dark:ring-blue-900 scale-110"
                                : isCompleted
                                  ? "bg-green-500 scale-100"
                                  : "bg-gray-300 dark:bg-gray-600 scale-90"
                            }`}
                          />
                          <span
                            className={`text-sm transition-all duration-200 ${
                              isCompleted
                                ? "text-gray-400 line-through"
                                : isActive
                                  ? "text-blue-600 dark:text-blue-400 font-medium"
                                  : "text-gray-600 dark:text-gray-400"
                            }`}
                          >
                            {index + 1}. {phase}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Desktop List */}
              <div className="hidden xl:block space-y-3">
                {phases.map((phase, index) => {
                  const isActive = index + 1 === currentPhase;
                  const isCompleted = index + 1 < currentPhase;

                  return (
                    <div key={index} className="flex items-center space-x-3">
                      <div
                        className={`w-3 h-3 rounded-full flex-shrink-0 transition-all duration-300 ${
                          isActive
                            ? "bg-blue-500 ring-4 ring-blue-100 dark:ring-blue-900 scale-110"
                            : isCompleted
                              ? "bg-green-500 scale-100"
                              : "bg-gray-300 dark:bg-gray-600 scale-90"
                        }`}
                      />
                      <span
                        className={`text-sm leading-tight transition-all duration-200 ${
                          isCompleted
                            ? "text-gray-400 line-through"
                            : isActive
                              ? "text-blue-600 dark:text-blue-400 font-medium"
                              : "text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {index + 1}. {phase}
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
};

LessonProgressBar.displayName = "LessonProgressBar";
export default LessonProgressBar;
