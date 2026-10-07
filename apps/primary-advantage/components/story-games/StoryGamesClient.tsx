"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { parsePracticeInput, type LaunchAvatar, type PracticeInput } from "@reading-advantage/game-contracts";
import { GAMES, missingItems, playable } from "@reading-advantage/game-cartridges-3d";

import { GameHost } from "@/components/games/game-host";
import { Link } from "@/i18n/navigation";
import { practiceLocaleOf, type PlayableGame } from "@/lib/games/catalog";

export { practiceLocaleOf };

/** A game card: the game and the saved items it still needs (0 and 0 when it is open). */
export type GameCard = { game: PlayableGame; missing: { vocabulary: number; sentences: number } };

/** The student games with the saved items each one still needs. */
export const gameCardsFor = (input: Pick<PracticeInput, "vocabulary" | "sentences">): GameCard[] =>
  GAMES.filter((g): g is PlayableGame => playable(g)).map((game) => ({ game, missing: missingItems(game, input) }));

const isOpen = (card: GameCard): boolean => card.missing.vocabulary === 0 && card.missing.sentences === 0;

/**
 * Word adventures: 3D games (2D on older phones) with the words and sentences the student saved
 * from reading, chosen by the server in FSRS order. A game without enough saved items is locked
 * and links to the reading page. The shared game host plays the chosen game and saves the run.
 * @param props.avatar The student's avatar from the server (null when the student has none); the host passes it to every game.
 * @param props.ownerKey The student's identity for the RPG rewards; absent for a guest.
 * @returns The game list, or the player while a game runs.
 */
export function StoryGamesClient({ avatar = null, ownerKey }: { avatar?: LaunchAvatar | null; ownerKey?: string }) {
  const t = useTranslations("StoryGames");
  const locale = useLocale();
  const [input, setInput] = useState<PracticeInput | null>(null);
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState<PlayableGame | null>(null);
  const [flat, setFlat] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`/api/v1/apk/practice?locale=${practiceLocaleOf(locale)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`practice: HTTP ${res.status}`);
        return parsePracticeInput(await res.json());
      })
      .then((saved) => live && setInput(saved))
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, [locale]);

  const cards = useMemo(() => (input ? gameCardsFor(input) : []), [input]);

  if (playing && input) {
    // A portal on the body: the scene content (`.cq-content`, z-index 1) is a stacking context, so a
    // player inside it stays under the desktop side menu and the sticky header. The wrapper keeps the
    // skin classes, because the play-kit frame variables live on `.cq-world` (styles/rpg.css).
    return createPortal(
      <div className="cq-world cq" data-testid="story-game-skin">
        <div className="fixed inset-0 z-50 bg-background" data-testid="story-game-player">
          <GameHost
            gameId={playing.id}
            locale={locale}
            ownerKey={ownerKey}
            input={input}
            avatar={avatar}
            setting={flat ? "phaser" : "auto"}
            className="flex h-full w-full flex-col"
            onExit={() => setPlaying(null)}
          />
        </div>
      </div>,
      document.body,
    );
  }

  if (error) return <p role="alert" className="text-destructive">{t("loadError")}</p>;
  if (!input) return <p className="text-muted-foreground">{t("loading")}</p>;

  return (
    <section aria-labelledby="game-heading" className="space-y-4">
      <p className="cq-on-scene text-sm">
        {t("saved", { words: input.vocabulary.length, sentences: input.sentences.length })}
      </p>
      <h2 id="game-heading" className="cq-on-scene text-xl font-bold">{t("chooseGame")}</h2>
      <label className="cq-on-scene flex min-h-12 items-center gap-2 text-sm">
        <input type="checkbox" checked={flat} onChange={(e) => setFlat(e.target.checked)} />
        {t("flat")}
      </label>
      <ul className="grid gap-3 sm:grid-cols-2">
        {cards.map((card) => (
          <li key={card.game.id}>
            {isOpen(card) ? (
              <button
                type="button"
                onClick={() => setPlaying(card.game)}
                className="cq-panel cq-pin w-full text-left transition-transform hover:-translate-y-0.5"
              >
                <span className="block text-lg font-semibold">{card.game.icon} {card.game.manifest.title}</span>
                <span className="cq-muted mt-1 block text-sm">{card.game.manifest.description}</span>
              </button>
            ) : (
              <div className="cq-panel opacity-80" data-testid={`locked-${card.game.id}`}>
                <span className="block text-lg font-semibold">🔒 {card.game.manifest.title}</span>
                <span className="cq-muted mt-1 block text-sm">
                  {card.missing.vocabulary > 0
                    ? t("needWords", { count: card.missing.vocabulary })
                    : t("needSentences", { count: card.missing.sentences })}
                </span>
                <Link href="/student/read" className="mt-2 inline-block min-h-12 text-sm font-semibold underline">
                  {t("readMore")}
                </Link>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
