"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  mapGameResultsToCompletionInput,
  sentenceInputSchema,
  vocabularyInputSchema,
  type GameResults,
} from "@reading-advantage/game-contracts";
import type { StandardExperienceCartridge } from "@reading-advantage/advantage-play-kit/presentation";
import {
  APK_RUNTIME_API_VERSION,
  type GameInput,
  type GameTerminalOutcome,
  type RuntimeEdition,
  type SemanticAssetBinding,
} from "@reading-advantage/advantage-play-kit/runtime";
import { cartridgeLoaders } from "@reading-advantage/game-cartridges";

import { useLeaderboard } from "@/hooks/useLeaderboard";
import {
  isGameMusicId,
  resolveGameMusicId,
  useBackgroundMusic,
} from "@/hooks/useBackgroundMusic";
import { withBasePath } from "@/lib/games-runtime";

import { APK_HOST_LAYOUT_CLASS, APK_HOST_RESPONSIVE_OPTIONS } from "./apk-host-layout";

/** App route locale used for student navigation. */
export type AppRouteLocale = "en" | "th" | "zh";

/** Persisted flashcard locale requested from the content API. */
export type ContentLocale = "en" | "th" | "cn" | "tw" | "vi";

/** Browser navigation used by the authenticated host Exit control. */
export const authenticatedHostNavigation = {
  /**
   * Assigns the current window location to an in-app path.
   * @param path Absolute in-app path.
   * @returns Nothing. The browser navigates to the path.
   */
  assign(path: string): void {
    window.location.assign(path);
  },
};

/**
 * Builds the sign-in href that returns the student to this APK session.
 * @param locale App route locale used in the current game path.
 * @param cartridgeId Public catalog identifier for the cartridge.
 * @returns A same-app login path with an encoded post-login redirect.
 */
export function buildAuthenticatedApkLoginHref(
  locale: AppRouteLocale,
  cartridgeId: string,
): string {
  const gamePath = `/${locale}/student/games/apk/${cartridgeId}`;
  return withBasePath(`/login?redirect=${encodeURIComponent(gamePath)}`);
}

const APKGameHost = dynamic(
  () => import("@reading-advantage/advantage-play-kit/react").then(
    (module) => module.APKGameHost,
  ),
  {
    ssr: false,
    loading: () => <p className="p-6 text-sm text-muted-foreground">Loading game...</p>,
  },
);

const STUDENT_EDITION_ASSET = {
  id: "student-session",
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

/** Props for an authenticated APK session backed by student flashcards. */
export interface AuthenticatedCartridgeHostProps {
  /** Public catalog identifier for the cartridge. */
  readonly cartridgeId: string;
  /** Product-facing cartridge title. */
  readonly title: string;
  /** Product-facing cartridge description. */
  readonly description: string;
  /** Learning-content mode required by the cartridge. */
  readonly inputMode: "vocabulary" | "sentence";
  /** App route locale used for catalog Exit and the login return path. */
  readonly locale: AppRouteLocale;
  /** Translation locale requested for student flashcards. */
  readonly contentLocale: ContentLocale;
}

type CartridgeLoader = () => Promise<StandardExperienceCartridge>;

/**
 * Resolves one validated catalog cartridge loader.
 * @param cartridgeId Public cartridge identifier.
 * @returns The standard-experience cartridge loader.
 * @throws When the catalog has no matching loader.
 */
function getCartridgeLoader(cartridgeId: string): CartridgeLoader {
  const loader = (cartridgeLoaders as Readonly<Record<string, unknown>>)[cartridgeId];
  if (typeof loader !== "function") {
    throw new Error(`Cartridge ${cartridgeId} has no public loader.`);
  }
  return loader as CartridgeLoader;
}

/**
 * Creates the current image-backed edition for an authenticated session.
 * @param cartridge Loaded standard-experience cartridge.
 * @returns A valid edition for every declared semantic binding.
 */
function createStudentEdition(cartridge: StandardExperienceCartridge): RuntimeEdition {
  const bindings: Record<string, SemanticAssetBinding> = {};
  for (const key of cartridge.manifest.requiredAssetBindings) {
    bindings[key] = {
      key,
      file: STUDENT_EDITION_ASSET.id,
      usage: "image",
      view: STUDENT_EDITION_ASSET.view,
    };
  }
  return {
    id: "student-session",
    title: "Student session",
    runtimeApiVersion: APK_RUNTIME_API_VERSION,
    pack: {
      id: "standard-pack-qc",
      version: "1.0.0",
      root: withBasePath("/assets/apk/standard-pack-qc/"),
      files: { [STUDENT_EDITION_ASSET.id]: STUDENT_EDITION_ASSET },
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
 * Reads a safe message from an untrusted JSON error response.
 * @param payload Untrusted response payload.
 * @param fallback Message used when the response has no safe message.
 * @returns A user-facing error message.
 */
function readErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload !== "object" || payload === null) return fallback;
  const error = "error" in payload ? payload.error : undefined;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = error.message;
    if (typeof message === "string" && message.trim()) return message;
  }
  if ("message" in payload && typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }
  return fallback;
}

type HostLoadError = {
  message: string;
  unauthenticated: boolean;
};

/**
 * Loads student-owned content and persists validated game completion.
 * @param props Cartridge catalog fields plus route and content locales.
 * @returns An authenticated standard APK game surface.
 */
export function AuthenticatedCartridgeHost({
  cartridgeId,
  title,
  description,
  inputMode,
  locale,
  contentLocale,
}: AuthenticatedCartridgeHostProps) {
  const { recordSession } = useLeaderboard();
  const { start: startMusic, stop: stopMusic } = useBackgroundMusic(
    resolveGameMusicId(cartridgeId),
  );
  const [cartridge, setCartridge] = useState<StandardExperienceCartridge>();
  const [input, setInput] = useState<GameInput>();
  const [loadError, setLoadError] = useState<HostLoadError>();
  const startedAtRef = useRef(Date.now());
  const idempotencyKeyRef = useRef("");
  if (!idempotencyKeyRef.current) {
    idempotencyKeyRef.current = globalThis.crypto.randomUUID();
  }

  const edition = useMemo(
    () => (cartridge ? createStudentEdition(cartridge) : undefined),
    [cartridge],
  );

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
    setInput(undefined);
    setLoadError(undefined);

    const load = async (): Promise<void> => {
      try {
        const [loadedCartridge, response] = await Promise.all([
          getCartridgeLoader(cartridgeId)(),
          fetch(`/api/v1/apk/content?mode=${inputMode}&locale=${contentLocale}`, {
            cache: "no-store",
            credentials: "same-origin",
          }),
        ]);
        const payload: unknown = await response.json();
        if (!response.ok) {
          const message = readErrorMessage(payload, "Learning content could not be loaded.");
          throw Object.assign(new Error(message), {
            unauthenticated:
              response.status === 401 || message === "Authentication required",
          });
        }
        if (typeof payload !== "object" || payload === null || !("content" in payload)) {
          throw new Error("The learning-content response is invalid.");
        }
        const schema = inputMode === "sentence" ? sentenceInputSchema : vocabularyInputSchema;
        const parsedInput = schema.safeParse(payload.content);
        if (!parsedInput.success) {
          throw new Error("The learning-content response is invalid.");
        }
        if (parsedInput.data.length === 0) {
          throw new Error("Save at least one flashcard before starting this game.");
        }
        if (loadedCartridge.manifest.inputMode !== inputMode) {
          throw new Error("The cartridge content mode does not match this route.");
        }
        if (!active) return;
        setCartridge(loadedCartridge);
        setInput(parsedInput.data);
      } catch (error) {
        if (active) {
          const message = error instanceof Error ? error.message : "The game failed to load.";
          const unauthenticated =
            typeof error === "object" &&
            error !== null &&
            "unauthenticated" in error &&
            error.unauthenticated === true;
          setLoadError({ message, unauthenticated });
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [cartridgeId, inputMode, contentLocale]);

  /**
   * Persists one server-authoritative completion for an explicit terminal outcome.
   * @param result Validated five-field display result from the cartridge.
   * @param outcome Validated terminal outcome supplied by the runtime.
   * @returns A promise that resolves after the server accepts the completion.
   * @throws When a legacy complete outcome cannot identify victory or defeat, or when persistence fails.
   */
  const handleComplete = async (
    result: GameResults,
    outcome: GameTerminalOutcome,
  ): Promise<void> => {
    if (outcome === "complete") {
      throw new Error("Authenticated completion requires a victory or defeat outcome.");
    }
    const completionInput = mapGameResultsToCompletionInput(result, {
      gameType: cartridgeId,
      difficulty: "medium",
      duration: Math.max(0, Math.round(Date.now() - startedAtRef.current)),
      victory: outcome === "victory",
      idempotencyKey: idempotencyKeyRef.current,
      clientTimestamp: Date.now(),
      metadata: { contentSource: "student-flashcards", inputMode },
    });
    const response = await fetch("/api/v1/apk/complete", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(completionInput),
    });
    const payload: unknown = await response.json();
    if (!response.ok) {
      throw new Error(readErrorMessage(payload, "Game progress could not be saved."));
    }
    recordSession(cartridgeId, title, result.score, result.xp, result.accuracy);
  };

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <header className="border-b border-border pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Advantage Play Kit
          </p>
          <h1 className="mt-2 text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-muted-foreground">{description}</p>
          <p className="mt-4 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            Student content
          </p>
        </header>

        <section
          aria-label={`${title} play surface`}
          className="-mx-4 mt-6 min-h-[320px] overflow-hidden border-y border-border bg-black p-0 sm:mx-0 sm:rounded-lg sm:border sm:p-4"
        >
          {loadError ? (
            <p role="alert" className="p-4 text-red-300">
              {loadError.unauthenticated ? (
                <a
                  className="underline text-sky-300"
                  href={buildAuthenticatedApkLoginHref(locale, cartridgeId)}
                >
                  Sign in to play this game
                </a>
              ) : (
                loadError.message
              )}
            </p>
          ) : null}
          {!loadError && (!cartridge || !input) ? (
            <p className="p-4 text-slate-100">Loading student content...</p>
          ) : null}
          {cartridge && input && edition ? (
            <APKGameHost
              aria-label={`${title} game`}
              cartridge={cartridge}
              edition={edition}
              input={input}
              seed={29}
              responsive={APK_HOST_RESPONSIVE_OPTIONS}
              standardExperience={cartridge.standardExperience}
              className={APK_HOST_LAYOUT_CLASS}
              instructions="Use the controls displayed in the game."
              onComplete={handleComplete}
              onLifecycleTransition={(transition) => {
                if (transition.to === "playing") startedAtRef.current = Date.now();
                if (transition.event === "start" || transition.to === "playing") {
                  void startMusic();
                }
                if (transition.from === "results" && transition.event === "replay") {
                  idempotencyKeyRef.current = globalThis.crypto.randomUUID();
                }
              }}
              onNavigate={(destination) => {
                if (destination === "catalog") {
                  authenticatedHostNavigation.assign(`/${locale}/student/games`);
                }
              }}
            />
          ) : null}
        </section>
      </div>
    </main>
  );
}
