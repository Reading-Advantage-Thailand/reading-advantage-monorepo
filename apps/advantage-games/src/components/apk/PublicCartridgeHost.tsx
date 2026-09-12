"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserAudioClipPorts, createAnswerChoiceAudioController } from "@reading-advantage/advantage-play-kit";
import type { StandardExperienceCartridge } from "@reading-advantage/advantage-play-kit/presentation";
import { cartridgeLoaders, createCatalogStandardEdition } from "@reading-advantage/game-cartridges";

import {
  isGameMusicId,
  resolveGameMusicId,
  useBackgroundMusic,
} from "@/hooks/useBackgroundMusic";
import { PUBLIC_ARCADE_SENTENCE_FIXTURE } from "@/lib/apk/public-sentence-fixture";
import { PUBLIC_ARCADE_VOCABULARY_FIXTURE } from "@/lib/apk/public-vocabulary-fixture";
import { withBasePath } from "@/lib/games-runtime";

import { APK_HOST_LAYOUT_CLASS, APK_HOST_RESPONSIVE_OPTIONS } from "./apk-host-layout";

/** Browser navigation used by the public arcade Exit control. */
export const publicArcadeNavigation = {
  /**
   * Assigns the current window location to an in-app path.
   * @param path Absolute in-app path.
   * @returns Nothing. The browser navigates to the path.
   */
  assign(path: string): void {
    window.location.assign(path);
  },
};

const APKGameHost = dynamic(
  () =>
    import("@reading-advantage/advantage-play-kit/react").then(
      (module) => module.APKGameHost,
    ),
  {
    ssr: false,
    loading: () => <p className="p-6 text-sm text-muted-foreground">Loading game...</p>,
  },
);

/** Props for a public, local-only cartridge launch surface. */
export interface PublicCartridgeHostProps {
  /** Public catalog identifier for the cartridge. */
  readonly cartridgeId: string;
  /** Product-facing title from the public catalog. */
  readonly title: string;
  /** Product-facing description from the public catalog. */
  readonly description: string;
  /** Educational input mode from the public catalog. */
  readonly inputMode: "vocabulary" | "sentence";
  /** Route locale used to return to the student games catalog. */
  readonly locale?: string;
}

type CartridgeLoader = () => Promise<StandardExperienceCartridge>;

/**
 * Resolves a dynamic public cartridge loader by its validated catalog identifier.
 * @param cartridgeId Public cartridge identifier from the route.
 * @returns The public cartridge loader.
 * @throws When the public catalog has no loader for the identifier.
 */
function getCartridgeLoader(cartridgeId: string): CartridgeLoader {
  const loader = (cartridgeLoaders as Readonly<Record<string, unknown>>)[cartridgeId];
  if (typeof loader !== "function") {
    throw new Error(`Cartridge ${cartridgeId} has no public loader.`);
  }
  return loader as CartridgeLoader;
}

/**
 * Loads one public cartridge and mounts the client-only APK game host.
 * @param props Public catalog fields for the selected cartridge.
 * @returns A public game surface without authentication or persistence.
 */
export function PublicCartridgeHost({
  cartridgeId,
  title,
  description,
  inputMode,
  locale,
}: PublicCartridgeHostProps) {
  const searchParams = useSearchParams();
  const playSurfaceRef = useRef<HTMLElement>(null);
  const { start: startMusic, stop: stopMusic, duck: duckMusic, setMuted: muteMusic } = useBackgroundMusic(
    resolveGameMusicId(cartridgeId),
  );
  const [cartridge, setCartridge] = useState<StandardExperienceCartridge>();
  const [loadError, setLoadError] = useState<string>();
  const [learningMode, setLearningMode] = useState<"reading" | "answer-audio">("reading");
  const supportsAnswerAudioPreview = cartridgeId === "wizard-vs-zombie" && inputMode === "vocabulary";
  const createAnswerAudioSession = useCallback(() => createAnswerChoiceAudioController({
    session: {
      modality: "read-to-select-audio", promptLocale: "th-TH", answerLocale: "en-US",
      promptField: "translation", answerField: "term", scored: false,
    },
    clips: PUBLIC_ARCADE_VOCABULARY_FIXTURE.map((item, itemPosition) => ({
      itemPosition,
      url: withBasePath(`/sounds/listening-preview/${item.term}.mp3`),
      mediaType: "audio/mpeg" as const,
    })),
    preparationTimeoutMs: 10_000,
    ...createBrowserAudioClipPorts(),
    ducking: { duck: duckMusic },
  }), [duckMusic]);
  const edition = useMemo(
    () => (cartridge ? createCatalogStandardEdition(
      cartridge.manifest.requiredAssetBindings,
      withBasePath("/assets/apk/standard-pack-qc/"),
      cartridge.manifest.id,
    ) : undefined),
    [cartridge],
  );
  const input = inputMode === "sentence"
    ? PUBLIC_ARCADE_SENTENCE_FIXTURE
    : PUBLIC_ARCADE_VOCABULARY_FIXTURE;

  useEffect(() => {
    if (!isGameMusicId(cartridgeId)) {
      return;
    }
    void startMusic();
    return () => {
      stopMusic();
    };
  }, [cartridgeId, startMusic, stopMusic]);

  useEffect(() => {
    let active = true;
    setCartridge(undefined);
    setLoadError(undefined);

    void Promise.resolve()
      .then(() => getCartridgeLoader(cartridgeId)())
      .then((loaded) => {
        if (active) setCartridge(loaded);
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(
            error instanceof Error ? error.message : "The game failed to load.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [cartridgeId]);

  return (
    <main className="min-h-screen bg-background px-4 pb-28 pt-6 text-foreground sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <header className="border-b border-border pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Advantage Play Kit
          </p>
          <h1 className="mt-2 text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-muted-foreground">{description}</p>
          <div className="mt-4 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
            <p className="font-semibold text-amber-700 dark:text-amber-300">Preview mode</p>
            <p className="mt-1 text-muted-foreground">
              This public preview uses built-in sample content and does not save progress.
            </p>
          </div>
          {supportsAnswerAudioPreview ? (
            <div className="mt-4" aria-label="Learning mode">
              <div className="flex flex-wrap gap-2">
                <button type="button" aria-pressed={learningMode === "reading"}
                  className="min-h-11 border-2 border-cyan-400 px-4 py-2 aria-pressed:bg-cyan-400 aria-pressed:text-black"
                  onClick={() => setLearningMode("reading")}>Read Thai</button>
                <button type="button" aria-pressed={learningMode === "answer-audio"}
                  className="min-h-11 border-2 border-cyan-400 px-4 py-2 aria-pressed:bg-cyan-400 aria-pressed:text-black"
                  onClick={() => setLearningMode("answer-audio")}>Listen to English</button>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Choose the English meaning.</p>
            </div>
          ) : null}
        </header>

        <section
          ref={playSurfaceRef}
          aria-label={`${title} play surface`}
          className="-mx-4 mt-6 min-h-[320px] overflow-hidden border-y border-border bg-black p-0 sm:mx-0 sm:rounded-lg sm:border sm:p-4"
        >
          {loadError ? <p role="alert" className="p-4 text-red-300">{loadError}</p> : null}
          {!loadError && !cartridge ? <p className="p-4 text-slate-100">Loading game...</p> : null}
          {cartridge && edition ? (
            <APKGameHost
              key={`${cartridgeId}-${learningMode}`}
              createAnswerAudioSession={supportsAnswerAudioPreview && learningMode === "answer-audio" ? createAnswerAudioSession : undefined}
              aria-label={`${title} game`}
              cartridge={cartridge}
              edition={edition}
              input={input}
              launchPhase={searchParams?.get("mode") === "demo" ? "demo" : undefined}
              seed={29}
              responsive={APK_HOST_RESPONSIVE_OPTIONS}
              standardExperience={cartridge.standardExperience}
              className={APK_HOST_LAYOUT_CLASS}
              onMutedChange={muteMusic}
              onLifecycleTransition={(transition) => {
                if (transition.event === "start" || transition.to === "playing" || transition.to === "demo") {
                  void startMusic();
                  requestAnimationFrame(() => playSurfaceRef.current?.scrollIntoView?.({ block: "start", behavior: "instant" }));
                }
              }}
              onNavigate={(destination) => {
                if (destination === "catalog") {
                  publicArcadeNavigation.assign(
                    locale ? `/${locale}/student/games` : "/",
                  );
                }
              }}
            />
          ) : null}
        </section>
      </div>
    </main>
  );
}
