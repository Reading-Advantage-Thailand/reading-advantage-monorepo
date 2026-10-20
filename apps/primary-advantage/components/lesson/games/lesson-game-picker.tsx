"use client";

import { useTranslations } from "next-intl";
import type { PracticeInput } from "@reading-advantage/game-contracts";
import { missingFor } from "@reading-advantage/advantage-play-kit-3d/contracts";
import type { LessonGameResult } from "@reading-advantage/domain/games";

import { Meter, Panel, RpgButton } from "@/components/rpg/chrome";
import { Sprite } from "@/components/rpg/sprite";
import { gameFor } from "@/lib/games/catalog";
import { LESSON_GAME_SPRITES } from "@/lib/games/lesson-games";
import { ART } from "@/lib/rpg/places";

/** Props of the lesson game picker. */
export interface LessonGamePickerProps {
  /** The heading of the picker panel. */
  readonly title: string;
  /** The ids of the games to offer, in order. An id with no playable game is skipped. */
  readonly gameIds: readonly string[];
  /** The lesson input; the picker locks a game with too few items. Null locks every game. */
  readonly input: PracticeInput | null;
  /** The latest saved run of each game for this lesson. */
  readonly results: readonly LessonGameResult[];
  /** True when the lesson itself is locked: every game shows locked. */
  readonly locked?: boolean;
  /** True hides the last result and the New tag (the teacher's projector has no student result). */
  readonly hideResults?: boolean;
  /** Called with the game id when the student chooses Play. */
  readonly onPlay: (gameId: string) => void;
  /** Extra content under the games, such as the Simple game choice. */
  readonly children?: React.ReactNode;
}

/**
 * Offers lesson games as objects of the arena place: the name, the pitch, the last result of this
 * lesson, and a Play button. A game whose manifest needs more items than the lesson has shows
 * locked with the reason, and keeps the last result of a game that is locked now. The games come from the 3D registry through `gameFor`.
 * @param props The games, the lesson input, the last results, and the choice callback.
 * @returns The picker panel.
 */
export function LessonGamePicker({ title, gameIds, input, results, locked = false, hideResults = false, onPlay, children }: LessonGamePickerProps) {
  const t = useTranslations("LessonGames");
  const games = gameIds.flatMap((id) => {
    const game = gameFor(id);
    return game ? [game] : [];
  });
  const sentenceGames = games.length > 0 && games.every((g) => g.manifest.needs.sentences > g.manifest.needs.vocabulary);
  return (
    <Panel aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <b className="text-xl">{title}</b>
        {input ? (
          <span className="lg-chip">
            {sentenceGames ? t("sentencesReady", { count: input.sentences.length }) : t("wordsReady", { count: input.vocabulary.length })}
          </span>
        ) : null}
      </div>
      <div className={`lg-games${games.length <= 2 ? " lg-games--two" : ""}`}>
        {games.map((game) => {
          const missing = input ? missingFor(game.manifest, input) : null;
          const lack = locked || !missing || missing.vocabulary > 0 || missing.sentences > 0;
          const result = hideResults ? undefined : results.find((r) => r.gameId === game.id);
          const reason = locked ? t("lockedLesson") : missing && missing.sentences > 0 ? t("needSentences", { count: game.manifest.needs.sentences }) : t("needWords", { count: game.manifest.needs.vocabulary });
          return (
            <div key={game.id} data-testid={`lesson-game-${game.id}`} data-locked={lack ? "true" : "false"} className={`lg-obj${lack ? " lg-obj--locked" : ""}`}>
              {!result && !lack && !hideResults ? <span className="lg-newtag">{t("newTag")}</span> : null}
              <div className="lg-stage">
                <Sprite src={LESSON_GAME_SPRITES[game.id] ?? ART.lockedChest} size={104} label={game.manifest.title} className="cq-shadowed" />
              </div>
              <b>{game.manifest.title}</b>
              <small>{t(`pitch.${game.id}`)}</small>
              {lack ? (
                <span className="lg-lockchip">
                  <img src={ART.lockedChest} alt="" width={16} height={16} />
                  {reason}
                </span>
              ) : null}
              {result ? (
                <div className="lg-res" data-testid={`lesson-game-result-${game.id}`}>
                  <span>{t("last", { correct: result.correctAnswers, total: result.totalAttempts })}</span>
                  <Meter value={result.correctAnswers} max={Math.max(1, result.totalAttempts)} tone="green" label={t("last", { correct: result.correctAnswers, total: result.totalAttempts })} thin />
                  <span style={{ color: "var(--cq-gold-dark)" }}>{t("lastXp", { xp: result.xpEarned })}</span>
                </div>
              ) : lack || hideResults ? null : (
                <div className="lg-res"><span style={{ color: "var(--cq-ink-soft)" }}>{t("notPlayed")}</span></div>
              )}
              <RpgButton tone="gold" disabled={lack} aria-disabled={lack} onClick={() => onPlay(game.id)}>
                {lack ? t("locked") : result ? t("playAgain") : t("play")}
              </RpgButton>
              {lack ? <div className="lg-chain" /> : null}
            </div>
          );
        })}
      </div>
      {children}
    </Panel>
  );
}
