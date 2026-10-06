"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  parsePracticeInput,
  type GameResults,
  type PracticeInput,
  type StoryGameEvidence,
} from "@reading-advantage/game-contracts";
import type { Cartridge3DManifest } from "@reading-advantage/advantage-play-kit-3d/contracts";
import type { Cartridge } from "@reading-advantage/advantage-play-kit-3d/factory";
import { StoryGameHost } from "@reading-advantage/advantage-play-kit-3d/react";
import { GAMES, hostStrings, missingItems, playable, type GameEntry } from "@reading-advantage/game-cartridges-3d";

import { Link } from "@/i18n/navigation";
import { storyCompletionInput } from "@/lib/story-games/completion";

type PlayableGame = GameEntry & { manifest: Cartridge3DManifest; load: () => Promise<Cartridge> };
type Playing = { game: PlayableGame; cartridge: Cartridge; startedAt: number };
type SaveState = "idle" | "saving" | "saved" | "error";

/** A game card: the game and the saved items it still needs (0 and 0 when it is open). */
export type GameCard = { game: PlayableGame; missing: { vocabulary: number; sentences: number } };

/** The translation language of the saved items: the page language, or Thai on an English page. */
export const practiceLocaleOf = (locale: string): string =>
  ["th", "cn", "tw", "vi"].includes(locale) ? locale : "th";

/** The student games with the saved items each one still needs. */
export const gameCardsFor = (input: Pick<PracticeInput, "vocabulary" | "sentences">): GameCard[] =>
  GAMES.filter((g): g is PlayableGame => playable(g)).map((game) => ({ game, missing: missingItems(game, input) }));

const isOpen = (card: GameCard): boolean => card.missing.vocabulary === 0 && card.missing.sentences === 0;

/**
 * Word adventures: 3D games (2D on older phones) with the words and sentences the student saved
 * from reading, chosen by the server in FSRS order. A game without enough saved items is locked
 * and links to the reading page. A finished run is saved through the catalog completion route.
 */
export function StoryGamesClient() {
  const t = useTranslations("StoryGames");
  const locale = useLocale();
  const [input, setInput] = useState<PracticeInput | null>(null);
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState<Playing | null>(null);
  const [save, setSave] = useState<SaveState>("idle");
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

  const play = useCallback(async (game: PlayableGame) => {
    try {
      const cartridge = await game.load();
      setSave("idle");
      setPlaying({ game, cartridge, startedAt: Date.now() });
    } catch {
      setError(true);
    }
  }, []);

  const onComplete = useCallback(
    (result: GameResults, outcome: string, evidence: StoryGameEvidence) => {
      if (!playing) return;
      setSave("saving");
      const body = storyCompletionInput(playing.game.id, result, evidence, {
        startedAt: playing.startedAt,
        now: Date.now(),
        helper: false,
        victory: outcome !== "defeat",
        idempotencyKey: crypto.randomUUID(),
      });
      fetch("/api/v1/apk/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        .then((res) => setSave(res.ok ? "saved" : "error"))
        .catch(() => setSave("error"));
    },
    [playing],
  );

  const cards = useMemo(() => (input ? gameCardsFor(input) : []), [input]);

  if (playing && input) {
    return (
      <div className="fixed inset-0 z-50 bg-background" data-testid="story-game-player">
        <StoryGameHost
          cartridge={playing.cartridge}
          input={input}
          icon={playing.game.icon}
          assetBase="/"
          helper={false}
          setting={flat ? "phaser" : "auto"}
          catalogs={[hostStrings]}
          className="h-full w-full"
          onComplete={onComplete}
          onExit={() => setPlaying(null)}
        />
        {save !== "idle" ? (
          <p role="status" className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-black/70 px-3 py-1 text-sm text-white">
            {t(`save.${save}`)}
          </p>
        ) : null}
      </div>
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
                onClick={() => void play(card.game)}
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
