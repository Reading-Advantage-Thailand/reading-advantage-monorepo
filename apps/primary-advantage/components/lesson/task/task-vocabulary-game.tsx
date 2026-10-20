"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import type { LaunchAvatar, PracticeInput } from "@reading-advantage/game-contracts";
import { missingFor } from "@reading-advantage/advantage-play-kit-3d/contracts";
import type { LessonGameResult } from "@reading-advantage/domain/games";

import { getLessonGameInputAction, getLessonGameResultsAction } from "@/actions/lesson-games";
import { GameHost, type CompletionSummary, type RunResult } from "@/components/games/game-host";
import { LessonGamePicker } from "@/components/lesson/games/lesson-game-picker";
import LessonMatchingGame from "@/components/lesson/games/lesson-matching-game";
import { RpgButton, Sign } from "@/components/rpg/chrome";
import { Scene } from "@/components/rpg/scene";
import { gameFor, practiceLocaleOf } from "@/lib/games/catalog";
import { LESSON_VOCABULARY_GAMES } from "@/lib/games/lesson-games";
import { FlashcardType } from "@/types/enum";

type View = "pick" | "play" | "simple";
type Notice = "inputFailed" | "noGames" | "loadFailed" | null;
interface LastRun { gameId: string; correct: number; total: number; xp?: number }

/**
 * Task 10 of the lesson: the vocabulary game step. The student chooses one of four Chibi Quest
 * games with the words of this lesson, sees the last result of each, and plays it in the lesson
 * page. A "Simple game" choice opens the 2D matching game, and so does a game that fails to load
 * or a lesson with too few words for every game.
 * @param props.articleId The lesson article.
 * @param props.save False runs the games as a demo that saves nothing (rehearsal and preview).
 * @returns The step.
 */
export default function TaskVocabularyGame({ articleId, save = true }: { articleId: string; save?: boolean }) {
  const t = useTranslations("LessonGames");
  const locale = useLocale();
  const [input, setInput] = useState<PracticeInput | null>(null);
  const [results, setResults] = useState<LessonGameResult[]>([]);
  const [identity, setIdentity] = useState<{ ownerKey?: string; avatar?: LaunchAvatar | null }>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("pick");
  const [notice, setNotice] = useState<Notice>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<LastRun | null>(null);

  const refreshResults = useCallback(async () => {
    const res = await getLessonGameResultsAction({ articleId });
    if (res.success) setResults(res.results.latest);
  }, [articleId]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    Promise.all([getLessonGameInputAction({ articleId, locale: practiceLocaleOf(locale) as "th" }), getLessonGameResultsAction({ articleId })])
      .then(([lesson, saved]) => {
        if (!live) return;
        if (saved.success) setResults(saved.results.latest);
        if (lesson.success) {
          setInput(lesson.input);
          setIdentity({ ownerKey: lesson.ownerKey, avatar: lesson.avatar });
        } else {
          setNotice("inputFailed");
          setView("simple");
        }
      })
      .catch(() => {
        if (!live) return;
        setNotice("inputFailed");
        setView("simple");
      })
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [articleId, locale]);

  const anyOpen = useMemo(
    () => Boolean(input) && LESSON_VOCABULARY_GAMES.some((id) => {
      const game = gameFor(id);
      if (!game || !input) return false;
      const missing = missingFor(game.manifest, input);
      return missing.vocabulary === 0 && missing.sentences === 0;
    }),
    [input],
  );

  const onResult = useCallback((r: RunResult) => {
    setLastRun((prev) => ({ gameId: playing ?? prev?.gameId ?? "", correct: r.correctAnswers, total: r.totalAttempts }));
  }, [playing]);
  const onCompleted = useCallback((s: CompletionSummary) => {
    setLastRun((prev) => (prev ? { ...prev, xp: s.xpEarned } : prev));
  }, []);
  const leaveGame = useCallback(() => {
    setView("pick");
    setPlaying(null);
    void refreshResults();
  }, [refreshResults]);
  const loadFailed = useCallback(() => {
    setNotice("loadFailed");
    setView("simple");
    setPlaying(null);
  }, []);

  if (view === "play" && playing && input) {
    // A portal on the body: the task wrapper of the lesson page has a transform (its fade), and a
    // transform is the frame of a fixed child, so `.lg-run` would stay inside the lesson card.
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
          onResult={onResult}
          onCompleted={onCompleted}
          onLoadError={loadFailed}
          onExit={leaveGame}
        />
      </div>,
      document.body,
    );
  }

  const simple = view === "simple" || (!loading && !anyOpen);
  const noticeKey: Notice = notice ?? (!loading && !anyOpen ? "noGames" : null);

  return (
    <Scene place="arena" contained className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center gap-3">
        <Sign>{t("title")}</Sign>
      </div>
      <p className="cq-on-scene text-base">{t("subtitle")}</p>
      {noticeKey ? <p role="status" data-testid="lesson-game-notice" className="cq-on-scene text-sm">{t(noticeKey)}</p> : null}
      {lastRun && lastRun.gameId && view === "pick" ? (
        <p role="status" data-testid="lesson-game-last-run" className="cq-on-scene text-base font-semibold">
          {lastRun.xp === undefined ? t("runLine", { correct: lastRun.correct, total: lastRun.total }) : t("runLineXp", { correct: lastRun.correct, total: lastRun.total, xp: lastRun.xp })}
        </p>
      ) : null}
      {loading ? <p className="cq-on-scene text-sm">{t("loading")}</p> : null}
      {!loading && simple ? (
        <div className="flex flex-col gap-3">
          {anyOpen ? (
            <div><RpgButton tone="iron" onClick={() => { setNotice(null); setView("pick"); }}>{t("backToGames")}</RpgButton></div>
          ) : null}
          <div data-testid="lesson-simple-game">
            <LessonMatchingGame articleId={articleId} cardKind={FlashcardType.VOCABULARY} />
          </div>
        </div>
      ) : null}
      {!loading && !simple ? (
        <LessonGamePicker
          title={t("choose")}
          gameIds={LESSON_VOCABULARY_GAMES}
          input={input}
          results={results}
          onPlay={(id) => { setPlaying(id); setView("play"); }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="cq-muted text-sm">{t("simpleHint")}</span>
            <RpgButton tone="iron" onClick={() => { setNotice(null); setView("simple"); }}>{t("simpleGame")}</RpgButton>
          </div>
        </LessonGamePicker>
      ) : null}
    </Scene>
  );
}
