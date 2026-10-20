"use client";
import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Book,
  ListOrdered,
  FileText,
  Shuffle,
  GitBranch,
  ArrowRight,
} from "lucide-react";
import { RpgButton } from "@/components/rpg/chrome";
import { TaskHeader } from "./task-header";
import OrderSentenceGame from "../games/lesson-sentence-order";
import SentenceClozeGame from "../games/lesson-sentence-cloze-test";
import OrderWordGame from "../games/lesson-sentence-order-word";
import LessonMatchingGame from "../games/lesson-matching-game";
import { FlashcardType } from "@/types/enum";
import { useLocale, useTranslations } from "next-intl";
import type { LaunchAvatar, PracticeInput } from "@reading-advantage/game-contracts";
import type { LessonGameResult } from "@reading-advantage/domain/games";
import { getLessonGameInputAction, getLessonGameResultsAction } from "@/actions/lesson-games";
import { GameHost, type CompletionSummary, type RunResult } from "@/components/games/game-host";
import { LessonGamePicker } from "@/components/lesson/games/lesson-game-picker";
import { practiceLocaleOf } from "@/lib/games/catalog";
import { LESSON_SENTENCE_GAMES } from "@/lib/games/lesson-games";

interface AssignmentActivity {
  isSentenceMatchingCompleted: boolean;
  isSentenceOrderingCompleted: boolean;
  isSentenceWordOrderingCompleted: boolean;
  isSentenceClozeTestCompleted: boolean;
}

/**
 * Task 12 of the lesson: the sentence step. It shows the Chibi Quest sentence games first, with
 * the last result of each (a game with fewer than 3 sentences shows locked), and below them the
 * four sentence activities. The activities stay open when a game is locked or fails to load.
 * @param props.articleId The lesson article.
 * @param props.save False runs the games as a demo that saves nothing (rehearsal and preview).
 * @returns The step.
 */
export default function TaskSentenceActivities({
  articleId,
  save = true,
}: {
  articleId: string;
  save?: boolean;
}) {
  const t = useTranslations("Lesson.SentenceActivities");
  const tg = useTranslations("LessonGames");
  const locale = useLocale();
  const [input, setInput] = useState<PracticeInput | null>(null);
  const [results, setResults] = useState<LessonGameResult[]>([]);
  const [identity, setIdentity] = useState<{ ownerKey?: string; avatar?: LaunchAvatar | null }>({});
  const [lastRun, setLastRun] = useState<{ correct: number; total: number; xp?: number } | null>(null);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [playing, setPlaying] = useState<string | null>(null);
  const [gameNotice, setGameNotice] = useState<"sentenceInputFailed" | "sentenceLoadFailed" | null>(null);
  const [completedActivities, setCompletedActivities] =
    useState<AssignmentActivity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);

  // Check for completed activities
  useEffect(() => {
    const fetchCompletedActivities = async () => {
      setLoadError(false);
      try {
        const response = await fetch(`/api/assignments/activity/${articleId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch activity progress");
        }
        const data = await response.json();

        setCompletedActivities(data.assignmentActivity);
      } catch (error) {
        console.error("Error fetching completed activities:", error);
        setLoadError(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCompletedActivities();
  }, [articleId, reloadToken]);

  const refreshResults = useCallback(async () => {
    const res = await getLessonGameResultsAction({ articleId });
    if (res.success) setResults(res.results.latest);
  }, [articleId]);

  // The sentences of the lesson and the last result of each game.
  useEffect(() => {
    let live = true;
    Promise.all([
      getLessonGameInputAction({ articleId, locale: practiceLocaleOf(locale) as "th" }),
      getLessonGameResultsAction({ articleId }),
    ])
      .then(([lesson, saved]) => {
        if (!live) return;
        if (saved.success) setResults(saved.results.latest);
        if (lesson.success) {
          setInput(lesson.input);
          setIdentity({ ownerKey: lesson.ownerKey, avatar: lesson.avatar });
        } else setGameNotice("sentenceInputFailed");
      })
      .catch(() => live && setGameNotice("sentenceInputFailed"))
      .finally(() => live && setGamesLoading(false));
    return () => {
      live = false;
    };
  }, [articleId, locale]);

  if (playing && input) {
    // A portal on the body, as in task 10: the transform of the lesson task wrapper would hold the fixed run.
    return createPortal(
      <div className="cq-world lg-run" data-testid="lesson-game-run">
        <GameHost
          gameId={playing}
          locale={locale}
          input={input}
          articleId={articleId}
          save={save}
          ownerKey={identity.ownerKey}
          avatar={identity.avatar}
          className="flex h-full w-full flex-col"
          onResult={(r: RunResult) => setLastRun({ correct: r.correctAnswers, total: r.totalAttempts })}
          onCompleted={(c: CompletionSummary) => setLastRun((prev) => (prev ? { ...prev, xp: c.xpEarned } : prev))}
          onLoadError={() => {
            setGameNotice("sentenceLoadFailed");
            setPlaying(null);
          }}
          onExit={() => {
            setPlaying(null);
            void refreshResults();
          }}
        />
      </div>,
      document.body,
    );
  }

  // The sentence games above the activities, in every state of the step.
  const cartridges = (
    <div className="mx-auto max-w-4xl space-y-3">
      {gameNotice ? (
        <p role="status" data-testid="lesson-game-notice" className="cq-panel py-2 text-sm">
          {tg(gameNotice)}
        </p>
      ) : null}
      {lastRun ? (
        <p role="status" data-testid="lesson-game-last-run" className="cq-panel py-2 text-base font-semibold">
          {lastRun.xp === undefined ? tg("runLine", { correct: lastRun.correct, total: lastRun.total }) : tg("runLineXp", { correct: lastRun.correct, total: lastRun.total, xp: lastRun.xp })}
        </p>
      ) : null}
      {gamesLoading ? <div data-testid="lesson-games-placeholder" aria-hidden="true" className="min-h-72" /> : null}
      {!gamesLoading && input ? (
        <LessonGamePicker
          title={tg("sentenceTitle")}
          gameIds={LESSON_SENTENCE_GAMES}
          input={input}
          results={results}
          onPlay={(id) => {
            setGameNotice(null);
            setPlaying(id);
          }}
        />
      ) : null}
    </div>
  );

  // // Order Sentences Activity
  if (selectedActivity === "order-sentences") {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <TaskHeader icon={<Book />} title={t("orderSentences.title")} subtitle={t("orderSentences.description")} />

        {/* Order Sentences Component */}

        <OrderSentenceGame source="lesson" articleId={articleId} />
      </div>
    );
  }

  // // Cloze Test Activity
  if (selectedActivity === "cloze-test") {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <TaskHeader icon={<Book />} title={t("clozeTest.title")} subtitle={t("clozeTest.description")} />

        {/* Cloze Test Component */}
        <SentenceClozeGame source="lesson" articleId={articleId} />
      </div>
    );
  }

  // // Order Words Activity
  if (selectedActivity === "order-words") {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <TaskHeader icon={<Book />} title={t("orderWords.title")} subtitle={t("orderWords.description")} />

        {/* Order Words Component */}

        <OrderWordGame source="lesson" articleId={articleId} />
      </div>
    );
  }

  // // Matching Activity
  if (selectedActivity === "matching") {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <TaskHeader icon={<Book />} title={t("matching.title")} subtitle={t("matching.description")} />

        {/* Matching Component */}
        <LessonMatchingGame articleId={articleId} cardKind={FlashcardType.SENTENCE} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <>
        {cartridges}
      <div className="mx-auto max-w-4xl space-y-6">
        <TaskHeader icon={<Book />} title={t("title")} subtitle={t("loading")} />
      </div>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        {cartridges}
      <div className="mx-auto max-w-4xl space-y-6">
        <div
          role="alert"
          className="cq-panel flex flex-col items-center gap-4 p-8 text-center"
        >
          <h1 className="cq-sign text-2xl">
            {t("title")}
          </h1>
          <p className="lf-text-bad mx-auto max-w-2xl text-lg font-semibold">
            {t("loadError")}
          </p>
          <RpgButton
            onClick={() => {
              setIsLoading(true);
              setReloadToken((token) => token + 1);
            }}
          >
            {t("retry")}
          </RpgButton>
        </div>
      </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
    {cartridges}
    <div className="mx-auto max-w-4xl space-y-6">
      <TaskHeader icon={<Book />} title={t("title")} subtitle={t("description")} />

      {/* Activities Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Order Sentences */}
        <div
          className={`cq-panel group relative overflow-hidden p-0 transition-transform duration-300 hover:-translate-y-1 ${
            completedActivities?.isSentenceOrderingCompleted
              ? "ring-3 ring-[#2f6b35]"
              : ""
          }`}
        >
          <div className="absolute top-4 right-4 opacity-10 transition-opacity duration-300 group-hover:opacity-20">
            <ListOrdered className="h-16 w-16" />
          </div>
          {completedActivities?.isSentenceOrderingCompleted && (
            <div className="lf-good absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-sm font-bold">
              ✓
            </div>
          )}
          <div className="relative flex h-full flex-col p-6">
            <div className="mb-4 flex items-center">
              <div className="lf-medal mr-4 p-3">
                <ListOrdered className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-bold">
                {t("orderSentences.title")}
                {completedActivities?.isSentenceOrderingCompleted && (
                  <span className="lf-text-good ml-2 text-sm">
                    {t("completed")}
                  </span>
                )}
              </h3>
            </div>
            <p className="cq-muted mb-6 flex-grow">
              {t("orderSentences.description")}
            </p>
            <RpgButton
              onClick={() => setSelectedActivity("order-sentences")}
              className="w-full"
            >
              <span className="flex items-center justify-center">
                {completedActivities?.isSentenceOrderingCompleted
                  ? t("review")
                  : t("orderSentences.button")}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </RpgButton>
          </div>
        </div>

        {/* Cloze Test */}
        <div
          className={`cq-panel group relative overflow-hidden p-0 transition-transform duration-300 hover:-translate-y-1 ${
            completedActivities?.isSentenceClozeTestCompleted
              ? "ring-3 ring-[#2f6b35]"
              : ""
          }`}
        >
          <div className="absolute top-4 right-4 opacity-10 transition-opacity duration-300 group-hover:opacity-20">
            <FileText className="h-16 w-16" />
          </div>
          {completedActivities?.isSentenceClozeTestCompleted && (
            <div className="lf-good absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-sm font-bold">
              ✓
            </div>
          )}
          <div className="relative flex h-full flex-col p-6">
            <div className="mb-4 flex items-center">
              <div className="lf-medal mr-4 p-3">
                <FileText className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-bold">
                {t("clozeTest.title")}
                {completedActivities?.isSentenceClozeTestCompleted && (
                  <span className="lf-text-good ml-2 text-sm">
                    {t("completed")}
                  </span>
                )}
              </h3>
            </div>
            <p className="cq-muted mb-6 flex-grow">
              {t("clozeTest.description")}
            </p>
            <RpgButton
              onClick={() => setSelectedActivity("cloze-test")}
              className="w-full"
            >
              <span className="flex items-center justify-center">
                {completedActivities?.isSentenceClozeTestCompleted
                  ? t("review")
                  : t("clozeTest.button")}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </RpgButton>
          </div>
        </div>

        {/* Order Words */}
        <div
          className={`cq-panel group relative overflow-hidden p-0 transition-transform duration-300 hover:-translate-y-1 ${
            completedActivities?.isSentenceWordOrderingCompleted
              ? "ring-3 ring-[#2f6b35]"
              : ""
          }`}
        >
          <div className="absolute top-4 right-4 opacity-10 transition-opacity duration-300 group-hover:opacity-20">
            <Shuffle className="h-16 w-16" />
          </div>
          {completedActivities?.isSentenceWordOrderingCompleted && (
            <div className="lf-good absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-sm font-bold">
              ✓
            </div>
          )}
          <div className="relative flex h-full flex-col p-6">
            <div className="mb-4 flex items-center">
              <div className="lf-medal mr-4 p-3">
                <Shuffle className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-bold">
                {t("orderWords.title")}
                {completedActivities?.isSentenceWordOrderingCompleted && (
                  <span className="lf-text-good ml-2 text-sm">
                    {t("completed")}
                  </span>
                )}
              </h3>
            </div>
            <p className="cq-muted mb-6 flex-grow">
              {t("orderWords.description")}
            </p>
            <RpgButton
              onClick={() => setSelectedActivity("order-words")}
              className="w-full"
            >
              <span className="flex items-center justify-center">
                {completedActivities?.isSentenceWordOrderingCompleted
                  ? t("review")
                  : t("orderWords.button")}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </RpgButton>
          </div>
        </div>

        {/* Matching */}
        <div
          className={`cq-panel group relative overflow-hidden p-0 transition-transform duration-300 hover:-translate-y-1 ${
            completedActivities?.isSentenceMatchingCompleted
              ? "ring-3 ring-[#2f6b35]"
              : ""
          }`}
        >
          <div className="absolute top-4 right-4 opacity-10 transition-opacity duration-300 group-hover:opacity-20">
            <GitBranch className="h-16 w-16" />
          </div>
          {completedActivities?.isSentenceMatchingCompleted && (
            <div className="lf-good absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-sm font-bold">
              ✓
            </div>
          )}
          <div className="relative flex h-full flex-col p-6">
            <div className="mb-4 flex items-center">
              <div className="lf-medal mr-4 p-3">
                <GitBranch className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-bold">
                {t("matching.title")}
                {completedActivities?.isSentenceMatchingCompleted && (
                  <span className="lf-text-good ml-2 text-sm">
                    {t("completed")}
                  </span>
                )}
              </h3>
            </div>
            <p className="cq-muted mb-6 flex-grow">
              {t("matching.description")}
            </p>
            <RpgButton
              onClick={() => setSelectedActivity("matching")}
              className="w-full"
            >
              <span className="flex items-center justify-center">
                {completedActivities?.isSentenceMatchingCompleted
                  ? t("review")
                  : t("matching.button")}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </RpgButton>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
