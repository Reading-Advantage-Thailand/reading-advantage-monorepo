"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  APK_RUNTIME_API_VERSION,
  type RuntimeCartridge,
  type RuntimeEdition,
  type SemanticAssetBinding,
} from "@reading-advantage/advantage-play-kit/runtime";
import type { StandardExperienceCartridge } from "@reading-advantage/advantage-play-kit/presentation";
import { cartridgeLoaders } from "@reading-advantage/game-cartridges";

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

const DEVELOPER_PREVIEW_ASSET = {
  id: "developer-preview",
  path: "asset-6aeab3f50c0f6be4.png",
  kind: "image",
  view: "screen",
  width: 192,
  height: 384,
  format: "png",
  alpha: true,
  byteSize: 3670,
  sha256: "6aeab3f50c0f6be436eeb5594e7d9c1ae31f8f19ac3bdfa04d7fbcbf856ba5e4",
  provenance: {
    source: "Advantage Games standard-pack QC preview",
    license: "LicenseRef-Reading-Advantage-Original",
  },
} as const;

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
 * Creates the local developer edition required by the current APK host.
 * @param cartridge Loaded public cartridge.
 * @returns A valid image-backed edition for every declared cartridge asset binding.
 */
function createDeveloperEdition(cartridge: RuntimeCartridge): RuntimeEdition {
  const bindings: Record<string, SemanticAssetBinding> = {};
  for (const key of cartridge.manifest.requiredAssetBindings) {
    bindings[key] = {
      key,
      file: DEVELOPER_PREVIEW_ASSET.id,
      usage: "image",
      view: DEVELOPER_PREVIEW_ASSET.view,
    };
  }

  return {
    id: "public-developer",
    title: "Public developer preview",
    runtimeApiVersion: APK_RUNTIME_API_VERSION,
    pack: {
      id: "standard-pack-qc",
      version: "1.0.0",
      root: withBasePath("/assets/apk/standard-pack-qc/"),
      files: { [DEVELOPER_PREVIEW_ASSET.id]: DEVELOPER_PREVIEW_ASSET },
    },
    bindings,
    tuning: {
      speed: 1,
      targetScale: 1,
      collisionScale: 1,
      intensity: 0.5,
    },
  };
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
  const { start: startMusic, stop: stopMusic } = useBackgroundMusic(
    resolveGameMusicId(cartridgeId),
  );
  const [cartridge, setCartridge] = useState<StandardExperienceCartridge>();
  const [loadError, setLoadError] = useState<string>();
  const edition = useMemo(
    () => (cartridge ? createDeveloperEdition(cartridge) : undefined),
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
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6">
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
        </header>

        <section
          aria-label={`${title} play surface`}
          className="-mx-4 mt-6 min-h-[320px] overflow-hidden border-y border-border bg-black p-0 sm:mx-0 sm:rounded-lg sm:border sm:p-4"
        >
          {loadError ? <p role="alert" className="p-4 text-red-300">{loadError}</p> : null}
          {!loadError && !cartridge ? <p className="p-4 text-slate-100">Loading game...</p> : null}
          {cartridge && edition ? (
            <APKGameHost
              aria-label={`${title} game`}
              cartridge={cartridge}
              edition={edition}
              input={input}
              launchPhase={searchParams?.get("mode") === "demo" ? "demo" : undefined}
              seed={29}
              responsive={APK_HOST_RESPONSIVE_OPTIONS}
              standardExperience={cartridge.standardExperience}
              className={APK_HOST_LAYOUT_CLASS}
              instructions="Use the controls displayed in the game."
              onLifecycleTransition={(transition) => {
                if (transition.event === "start" || transition.to === "playing") {
                  void startMusic();
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
