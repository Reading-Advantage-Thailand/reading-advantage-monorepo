"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { PracticeInput } from "@reading-advantage/game-contracts";

import { getLessonGameInputAction } from "@/actions/lesson-games";
import { GameHost } from "@/components/games/game-host";
import { LessonGamePicker } from "@/components/lesson/games/lesson-game-picker";
import { practiceLocaleOf } from "@/lib/games/catalog";
import { LESSON_SENTENCE_GAMES, LESSON_VOCABULARY_GAMES } from "@/lib/games/lesson-games";

/** Props of the projector game panel. */
export interface ProjectorGamePanelProps {
  /** The lesson article. */
  readonly articleId: string;
  /** The class book of the lesson: the server checks that the teacher manages it. */
  readonly classBookId: string;
  /** The lesson number in the class book. */
  readonly lessonNumber: number;
}

/**
 * The game panel of the teacher's projector page (story S4): the vocabulary games and the sentence
 * games of the lesson. A choice runs full screen with the answer hint on. The run is a demo: the
 * host gets `save={false}`, so nothing posts and no XP or class progress changes.
 * @param props The lesson article, the class book, and the lesson number.
 * @returns The panel, or the full-screen run.
 */
export function ProjectorGamePanel({ articleId, classBookId, lessonNumber }: ProjectorGamePanelProps) {
  const t = useTranslations("TeacherUi.classBook.lesson.projectorGames");
  const tg = useTranslations("LessonGames");
  const locale = useLocale();
  const [input, setInput] = useState<PracticeInput | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setState("loading");
    getLessonGameInputAction({ articleId, locale: practiceLocaleOf(locale) as "th", classBookId, lessonNumber })
      .then((res) => {
        if (!live) return;
        if (res.success) setInput(res.input);
        setState(res.success ? "ready" : "failed");
      })
      .catch(() => live && setState("failed"));
    return () => {
      live = false;
    };
  }, [articleId, classBookId, lessonNumber, locale]);

  if (playing && input) {
    return (
      <div className="cq-world lg-run" data-testid="projector-game-run">
        <GameHost
          gameId={playing}
          locale={locale}
          input={input}
          articleId={articleId}
          save={false}
          helper
          className="flex h-full w-full flex-col"
          onLoadError={() => setPlaying(null)}
          onExit={() => setPlaying(null)}
        />
      </div>
    );
  }

  return (
    <section id="projector-games" aria-labelledby="projector-games-title" className="flex scroll-mt-4 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="projector-games-title" className="text-2xl font-bold">{t("title")}</h2>
        <p className="text-muted-foreground text-lg">{t("hint")}</p>
      </div>
      {state === "loading" ? <p role="status" className="text-lg">{t("loading")}</p> : null}
      {state === "failed" ? <p role="status" className="text-destructive text-lg">{t("inputFailed")}</p> : null}
      {state === "ready" ? (
        <>
          <LessonGamePicker title={tg("title")} gameIds={LESSON_VOCABULARY_GAMES} input={input} results={[]} hideResults onPlay={setPlaying} />
          <LessonGamePicker title={tg("sentenceTitle")} gameIds={LESSON_SENTENCE_GAMES} input={input} results={[]} hideResults onPlay={setPlaying} />
        </>
      ) : null}
    </section>
  );
}
