"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import {
  mapGameResultsToCompletionInput,
  sentenceInputSchema,
  vocabularyInputSchema,
  type GameResults,
} from "@reading-advantage/game-contracts";
import type { StandardExperienceCartridge } from "@reading-advantage/advantage-play-kit/presentation";
import type { GameInput, GameTerminalOutcome } from "@reading-advantage/advantage-play-kit/runtime";
import {
  cartridgeLoaders,
  createCatalogStandardEdition,
} from "@reading-advantage/game-cartridges";

import { APK_HOST_LAYOUT_CLASS, APK_HOST_RESPONSIVE_OPTIONS } from "./apk-host-layout";

const APKGameHost = dynamic(
  () => import("@reading-advantage/advantage-play-kit/react").then((module) => module.APKGameHost),
  {
    ssr: false,
    loading: () => <p className="p-6 text-sm text-muted-foreground">Loading game...</p>,
  },
);

/** Props for the Reading student APK route. */
export interface StudentCartridgeHostProps {
  /** Public cartridge identifier. */
  readonly cartridgeId: string;
  /** Product-facing title. */
  readonly title: string;
  /** Product-facing description. */
  readonly description: string;
  /** Learning-content mode. */
  readonly inputMode: "vocabulary" | "sentence";
  /** App locale used for Exit and content selection. */
  readonly locale: string;
}

type HostLoadError = {
  message: string;
  unauthenticated: boolean;
};

const completionResponseSchema = z.object({
  xpEarned: z.number().int().min(0),
  activityId: z.string().min(1),
  duplicate: z.boolean(),
  status: z.literal(200),
}).strict();

/**
 * Reads a safe message from an untrusted JSON error payload.
 * @param payload Untrusted response body.
 * @param fallback Message used when the payload has no safe message.
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

/**
 * Maps an app locale to a flashcard translation locale.
 * @param locale Route locale segment.
 * @returns A supported content locale.
 */
function contentLocaleFor(locale: string): "en" | "th" | "cn" {
  if (locale === "th") return "th";
  if (locale === "zh") return "cn";
  return "en";
}

/**
 * Loads student-owned content and mounts one APK cartridge on the real catalog route.
 * @param props Catalog fields and locale.
 * @returns The authenticated student game surface.
 */
export function StudentCartridgeHost({
  cartridgeId,
  title,
  description,
  inputMode,
  locale,
}: StudentCartridgeHostProps) {
  const [cartridge, setCartridge] = useState<StandardExperienceCartridge>();
  const [input, setInput] = useState<GameInput>();
  const [loadError, setLoadError] = useState<HostLoadError>();
  const [loadAttempt, setLoadAttempt] = useState(0);
  const startedAtRef = useRef(Date.now());
  const idempotencyKeyRef = useRef("");
  if (!idempotencyKeyRef.current) {
    idempotencyKeyRef.current = globalThis.crypto.randomUUID();
  }
  const edition = useMemo(
    () => (cartridge
      ? createCatalogStandardEdition(
        cartridge.manifest.requiredAssetBindings,
        "/assets/apk/standard-pack-qc/",
        cartridge.manifest.id,
      )
      : undefined),
    [cartridge],
  );

  useEffect(() => {
    let active = true;
    setCartridge(undefined);
    setInput(undefined);
    setLoadError(undefined);

    const load = async (): Promise<void> => {
      try {
        const loader = (cartridgeLoaders as Readonly<Record<string, unknown>>)[cartridgeId];
        if (typeof loader !== "function") {
          throw new Error(`Cartridge ${cartridgeId} has no public loader.`);
        }
        const contentLocale = contentLocaleFor(locale);
        const [loadedCartridge, response] = await Promise.all([
          (loader as () => Promise<StandardExperienceCartridge>)(),
          fetch(`/api/v1/apk/content?mode=${inputMode}&locale=${contentLocale}`, {
            cache: "no-store",
            credentials: "same-origin",
          }),
        ]);
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw Object.assign(new Error(readErrorMessage(payload, "Learning content could not be loaded.")), {
            unauthenticated: response.status === 401,
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
        if (!active) return;
        setCartridge(loadedCartridge);
        setInput(parsedInput.data);
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : "The game failed to load.";
        const unauthenticated =
          typeof error === "object" && error !== null && "unauthenticated" in error
          && error.unauthenticated === true;
        setLoadError({ message, unauthenticated });
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [cartridgeId, inputMode, loadAttempt, locale]);

  /**
   * Persists one server-authoritative completion.
   * @param result Validated display result.
   * @param outcome Terminal outcome from the runtime.
   * @returns A promise that resolves after the server accepts the completion.
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
      metadata: { contentSource: "student-flashcards", inputMode, host: "reading-advantage" },
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
    if (!completionResponseSchema.safeParse(payload).success) {
      throw new Error("The game-progress response is invalid.");
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <header className="border-b border-border pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Student game
          </p>
          <h1 className="mt-2 text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-muted-foreground">{description}</p>
        </header>
        <section
          aria-label={`${title} play surface`}
          className="-mx-4 mt-6 min-h-[320px] overflow-hidden border-y border-border bg-black p-0 sm:mx-0 sm:rounded-lg sm:border sm:p-4"
        >
          {loadError ? (
            <div role="alert" className="space-y-3 p-4 text-red-300">
              {loadError.unauthenticated ? (
                <a className="underline text-sky-300" href={`/auth/signin?redirect=${encodeURIComponent(`/${locale}/student/games/apk/${cartridgeId}`)}`}>
                  Sign in to play this game
                </a>
              ) : (
                <>
                  <p>{loadError.message}</p>
                  <button
                    type="button"
                    className="min-h-11 rounded border border-red-200 px-4 py-2 font-semibold text-red-100"
                    onClick={() => setLoadAttempt((attempt) => attempt + 1)}
                  >
                    Retry
                  </button>
                </>
              )}
            </div>
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
              launchPhase={
                typeof window !== "undefined"
                && new URLSearchParams(window.location.search).get("mode") === "demo"
                  ? "demo"
                  : "briefing"
              }
              seed={29}
              responsive={APK_HOST_RESPONSIVE_OPTIONS}
              standardExperience={cartridge.standardExperience}
              className={APK_HOST_LAYOUT_CLASS}
              instructions="Use the controls displayed in the game."
              onComplete={handleComplete}
              onLifecycleTransition={(transition) => {
                if (transition.to === "playing") startedAtRef.current = Date.now();
                if (transition.from === "results" && transition.event === "replay") {
                  idempotencyKeyRef.current = globalThis.crypto.randomUUID();
                }
              }}
              onNavigate={(destination) => {
                if (destination === "catalog") {
                  window.location.assign(`/${locale}/student/games`);
                }
              }}
            />
          ) : null}
        </section>
      </div>
    </main>
  );
}
