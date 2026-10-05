"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useContext,
} from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ArrowLeft, MicIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ErrorState, ShimmerSkeleton } from "@reading-advantage/ui";
import { cn } from "@/lib/utils";
import { LessonStepRail } from "./lesson-step-rail";
import { QuizContext } from "@/contexts/question-context";
import { useTranslations } from "next-intl";
import {
  TaskIntroduction,
  TaskCollection,
  TaskVocabularyCollection,
  TaskReading,
  TaskMultipleChoice,
  TaskShortAnswer,
  TaskVocabularyFlashcards,
  TaskVocabularyMatching,
  TaskSentenceFlashcards,
  TaskSentenceActivities,
  TaskLanguageQuestions,
  TaskLessonSummary,
} from "./task";

import { Article, AssignmentStudent, Classroom } from "@/types";
import { saveArticleToFlashcard } from "@/actions/flashcard";

export interface LessonAssignmentProps {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  classroomId: string;
  articleId: string;
  teacherId: string;
  teacherName: string;
  dueDate: Date;
  AssignmentStudent?: AssignmentStudent[] | null;
  article?: Article | null;
  classroom?: Classroom | null;
}

/**
 * Renders the lesson elapsed time without remounting on parent renders.
 * @param props Elapsed seconds.
 * @returns The formatted timer label.
 */
function LessonTimer({ seconds }: { seconds: number }) {
  return (
    <div className="text-sm font-medium">
      {`${Math.floor(seconds / 60)}m ${seconds % 60}s`}
    </div>
  );
}

/**
 * Data source for the lesson progress bar.
 */
export type LessonProgressSource = "assignment" | "article";

export interface LessonProgressBarProps {
  source: LessonProgressSource;
  assignment?: LessonAssignmentProps | null;
  article?: Article | null;
  /**
   * The last app step the class has opened (the workbook-first lock of a teacher-led class
   * book). Null or undefined: no lock.
   */
  maxUnlockedStep?: number | null;
}

export interface StandaloneLessonProps {
  article: Article;
}

/**
 * Renders the lesson task sequence with progress tracking.
 * @param source Whether the lesson runs from an assignment or a standalone article.
 * @param assignment Assignment carrying the article for assignment lessons.
 * @param articleProp Standalone article for article lessons.
 * @param maxUnlockedStep The last step the class has opened; later steps stay locked.
 * @returns The lesson progress bar.
 */
export default function LessonProgressBar({
  source,
  assignment,
  article: articleProp,
  maxUnlockedStep = null,
}: LessonProgressBarProps) {
  const t = useTranslations("Lesson");
  const tReedy = useTranslations("Reedy");
  const tError = useTranslations("Error");
  const article = (
    source === "assignment" ? assignment?.article : articleProp
  ) as Article | null;
  const resolvedArticleId =
    source === "assignment" ? assignment?.articleId : articleProp?.id;
  const progressBase =
    source === "assignment"
      ? `/api/assignments/${assignment?.id}`
      : `/api/lessons/${articleProp?.id}`;
  const [currentTask, setCurrentTask] = useState(1);
  // The step whose save failed ("start" for the first save), shown with a retry.
  const [saveError, setSaveError] = useState<"start" | number | null>(null);
  // The step the student tried to open while the class had not reached it yet.
  const [lockedStep, setLockedStep] = useState<number | null>(null);
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
        const response = await fetch(
          `${progressBase}/progress`,
        );

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
            setCurrentTask(
              source === "article" && taskNumber === 0 ? 1 : taskNumber,
            );
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
  }, [initialLoadComplete, progressBase, setTimer, setPaused, source]);

  const startLesson = async () => {
    try {
      // Prevent multiple clicks and transitions
      if (phaseLoading || isTransitioning) return;

      setSaveError(null);
      setIsTransitioning(true);

      // Start fade out animation
      setFadeOut(true);
      setNextPhaseContent(2);

      // Wait for fade out animation
      await new Promise((resolve) => setTimeout(resolve, 200));

      setPhaseLoading(true);

      const response = await fetch(`${progressBase}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: resolvedArticleId,
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
        setSaveError("start");
        // Reset fade state on error
        setFadeOut(false);
        setNextPhaseContent(null);
        setPhaseLoading(false);
      }
    } catch (error) {
      console.error("Error starting lesson:", error);
      setSaveError("start");
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
    // Check if current phase is completed before proceeding
    // if (!phaseCompletion[Phase - 1]) {
    //   setShakeButton(true);
    //   setTimeout(() => setShakeButton(false), 500);
    //   return;
    // }

    // Prevent multiple clicks and transitions
    if (phaseLoading || isTransitioning) {
      return;
    }

    // Workbook first: a teacher-led class opens app steps as the class does the workbook steps.
    if (maxUnlockedStep !== null && Task + 1 > maxUnlockedStep) {
      setLockedStep(Task + 1);
      return;
    }

    try {
      setSaveError(null);
      setLockedStep(null);
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
        await saveArticleToFlashcard(resolvedArticleId as string);
      }

      if (newTask === 14) {
        setPaused(true);
      }

      const response = await fetch(`${progressBase}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: resolvedArticleId,
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
        setSaveError(Task);
        setFadeOut(false);
        setNextPhaseContent(null);
        setPhaseLoading(false);
      }
    } catch (error) {
      console.error("Error updating phase:", error);
      setSaveError(Task);
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
          <TaskIntroduction
            article={article as Article}
            onCompleteChange={() => {}}
          />
        );
      case 2:
        return (
          <TaskCollection article={article as Article} kind="vocabulary" />
        );
      case 3:
        return <TaskReading article={article as Article} enableTranslation={false} />;
      case 4:
        return (
          <TaskVocabularyCollection article={article as Article} />
        );
      case 5:
        return <TaskReading article={article as Article} enableTranslation />;
      case 6:
        return (
          <TaskCollection article={article as Article} kind="sentence" />
        );
      case 7:
        return <TaskMultipleChoice article={article as Article} />;
      case 8:
        return <TaskShortAnswer article={article as Article} />;
      case 9:
        return (
          <TaskVocabularyFlashcards
            articleId={resolvedArticleId as string}
          />
        );
      case 10:
        return (
          <TaskVocabularyMatching articleId={resolvedArticleId as string} />
        );
      case 11:
        return (
          <TaskSentenceFlashcards articleId={resolvedArticleId as string} />
        );
      case 12:
        return (
          <TaskSentenceActivities articleId={resolvedArticleId as string} />
        );
      case 13:
        return (
          <TaskLanguageQuestions article={article as Article} />
        );
      case 14:
        return (
          <>
            <TaskLessonSummary
              article={article as Article}
              timerSpent={timer}
            />
            {/* Reedy entry at the end of the flow (reedy FR-4). */}
            <Link
              href={`/student/reedy?articleId=${resolvedArticleId}`}
              data-testid="reedy-entry"
              className={cn(buttonVariants({ variant: "outline" }), "mt-4 min-h-12 w-full rounded-xl text-base")}
            >
              <MicIcon aria-hidden="true" className="size-5" />
              {tReedy("lessonEntry")}
            </Link>
          </>
        );
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

  const skipTask = async (Task: number) => {
    setCurrentTask(Task + 1);
  };

  const retrySave = () => {
    if (saveError === "start") void startLesson();
    else if (saveError !== null) void nextTask(saveError, timer);
  };
  const busy = phaseLoading || isTransitioning;
  const spinner = (
    <span
      aria-hidden="true"
      className="size-5 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin"
    />
  );

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-4 xl:gap-6">
      {/* Step rail: first in the DOM, so phones see it above the task (audit S3); sidebar from 1280 px. */}
      <div className="min-w-0 xl:order-last xl:col-span-1">
        <LessonStepRail
          steps={Array.from({ length: 14 }, (_, index) => getTaskDisplayName(index + 1))}
          current={currentTask}
          timer={currentTask >= 2 && currentTask < 14 ? <LessonTimer seconds={timer} /> : undefined}
        />
      </div>

      {/* Main Content Area */}
      <div className="min-w-0 xl:col-span-3">
        {phaseLoading && !fadeOut ? (
          <div aria-busy="true" className="bg-card flex flex-col gap-4 rounded-2xl border p-6 shadow-sm">
            <ShimmerSkeleton className="h-8 w-1/2" />
            <ShimmerSkeleton className="h-4 w-full" />
            <ShimmerSkeleton className="h-4 w-3/4" />
            <ShimmerSkeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Phase Content */}
            <div
              className={cn(
                "transition-[opacity,translate,scale] duration-300 ease-in-out",
                fadeOut ? "translate-y-4 scale-95 opacity-0" : "translate-y-0 scale-100 opacity-100",
              )}
            >
              {getTaskComponent(currentTask)}
            </div>

            {lockedStep !== null ? (
              <p role="status" className="bg-muted text-muted-foreground rounded-xl border px-4 py-3 text-sm">
                {t("lockedStep", { step: lockedStep })}
              </p>
            ) : null}
            {saveError !== null ? (
              <ErrorState
                className="bg-card border"
                title={t("saveError")}
                description={t("saveErrorHint")}
                action={
                  <Button type="button" className="min-h-12 px-6" onClick={retrySave}>
                    {tError("retry")}
                  </Button>
                }
              />
            ) : null}

            {/* Navigation Buttons */}
            <div className={cn("transition-opacity duration-300", fadeOut ? "pointer-events-none opacity-50" : "opacity-100")}>
              {currentTask === 1 && (
                <div className="bg-card rounded-2xl border p-4 shadow-sm">
                  <Button
                    size="lg"
                    className="min-h-12 w-full rounded-xl text-base font-semibold"
                    onClick={startLesson}
                    disabled={busy}
                  >
                    {busy ? (
                      <>
                        {spinner}
                        {t("actions.starting")}
                      </>
                    ) : (
                      <>
                        {t("actions.startLesson")}
                        <ArrowLeft className="size-5 rotate-180" aria-hidden="true" />
                      </>
                    )}
                  </Button>
                </div>
              )}

              {currentTask < 14 && currentTask > 1 && (
                <div className="bg-card flex gap-3 rounded-2xl border p-4 shadow-sm">
                  {/* Back Button - Only show if phase > 2 */}
                  {currentTask > 2 && (
                    <Button
                      variant="outline"
                      size="lg"
                      className="min-h-12 flex-1 rounded-xl text-base font-semibold"
                      onClick={previousTask}
                      disabled={busy}
                    >
                      <ArrowLeft className="size-5" aria-hidden="true" />
                      {t("actions.previousTask")}
                    </Button>
                  )}

                  {/* Next Button */}
                  <Button
                    size="lg"
                    className={cn(
                      "min-h-12 rounded-xl text-base font-semibold",
                      currentTask > 2 ? "flex-1" : "w-full",
                      shakeButton && "animate-shake",
                    )}
                    onClick={() => nextTask(currentTask, timer)}
                    disabled={busy}
                  >
                    {busy ? (
                      <>
                        {spinner}
                        {t("actions.processing")}
                      </>
                    ) : (
                      <>
                        {t("actions.nextTask")}
                        <ArrowLeft className="size-5 rotate-180" aria-hidden="true" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
