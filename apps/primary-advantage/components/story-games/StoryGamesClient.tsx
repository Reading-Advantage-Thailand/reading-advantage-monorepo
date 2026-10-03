"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  parseStoryIndex,
  parseStoryInput,
  type GameResults,
  type StoryGameEvidence,
  type StoryIndexEntry,
  type StoryInput,
} from "@reading-advantage/game-contracts";
import { isCompatible } from "@reading-advantage/advantage-play-kit-3d/contracts";
import type { Cartridge } from "@reading-advantage/advantage-play-kit-3d/factory";
import { StoryGameHost } from "@reading-advantage/advantage-play-kit-3d/react";
import { GAMES, hostStrings, type GameEntry } from "@reading-advantage/game-cartridges-3d";

import { storyCompletionInput } from "@/lib/story-games/completion";

type Playing = { game: GameEntry; cartridge: Cartridge; story: StoryInput; startedAt: number };
type SaveState = "idle" | "saving" | "saved" | "error";

/** The rule of the story picker: the games a story fits, by its level and item counts. */
export const gamesFor = (story: StoryInput | null): GameEntry[] =>
  GAMES.filter((g) => g.manifest && g.load && (!story || isCompatible(g.manifest, story)));

/**
 * Story adventures: pick a story, pick a game it fits, then play it in 3D (or 2D on older phones).
 * The finished run is saved through the same completion route as the catalog games.
 */
export function StoryGamesClient() {
  const t = useTranslations("StoryGames");
  const [index, setIndex] = useState<StoryIndexEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [story, setStory] = useState<StoryInput | null>(null);
  const [playing, setPlaying] = useState<Playing | null>(null);
  const [save, setSave] = useState<SaveState>("idle");
  const [flat, setFlat] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/stories/index.json")
      .then(async (res) => parseStoryIndex(await res.json()))
      .then((entries) => live && setIndex(entries))
      .catch((err: unknown) => live && setError(String(err)));
    return () => {
      live = false;
    };
  }, []);

  const pickStory = useCallback(async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/stories/${id}/story.json`);
      if (!res.ok) throw new Error(`story ${id}: HTTP ${res.status}`);
      setStory(parseStoryInput(await res.json(), id));
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const play = useCallback(
    async (game: GameEntry) => {
      if (!story || !game.load) return;
      try {
        const cartridge = await game.load();
        setSave("idle");
        setPlaying({ game, cartridge, story, startedAt: Date.now() });
      } catch (err) {
        setError(String(err));
      }
    },
    [story],
  );

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

  const games = useMemo(() => gamesFor(story), [story]);

  if (playing) {
    return (
      <div className="fixed inset-0 z-50 bg-background" data-testid="story-game-player">
        <StoryGameHost
          cartridge={playing.cartridge}
          story={playing.story}
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

  return (
    <div className="space-y-8">
      {error ? <p role="alert" className="text-destructive">{error}</p> : null}
      <section aria-labelledby="story-heading">
        <h2 id="story-heading" className="mb-3 text-xl font-semibold">{t("chooseStory")}</h2>
        {!index ? <p className="text-muted-foreground">{t("loading")}</p> : null}
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {index?.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => void pickStory(entry.id)}
                aria-pressed={story?.id === entry.id}
                className={`w-full rounded-lg border p-3 text-left hover:border-primary ${story?.id === entry.id ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <span className="block font-semibold">{entry.title}</span>
                <span className="text-sm text-muted-foreground">{entry.series} · {entry.level}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      {story ? (
        <section aria-labelledby="game-heading">
          <h2 id="game-heading" className="mb-3 text-xl font-semibold">{t("chooseGame")}</h2>
          <label className="mb-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={flat} onChange={(e) => setFlat(e.target.checked)} />
            {t("flat")}
          </label>
          {games.length === 0 ? <p className="text-muted-foreground">{t("noGame")}</p> : null}
          <ul className="grid gap-3 sm:grid-cols-2">
            {games.map((game) => (
              <li key={game.id}>
                <button
                  type="button"
                  onClick={() => void play(game)}
                  className="w-full rounded-lg border border-border p-4 text-left hover:border-primary"
                >
                  <span className="block text-lg font-semibold">{game.icon} {game.manifest?.title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{game.manifest?.description}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
