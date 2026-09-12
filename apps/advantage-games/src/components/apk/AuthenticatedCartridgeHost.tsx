"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { createBrowserAudioClipPorts, createAnswerChoiceAudioController } from "@reading-advantage/advantage-play-kit";
import { useStudentChallengeRun, useStudentRpg } from "@reading-advantage/advantage-play-kit/react";
import {
  mapGameResultsToCompletionInput,
  preparedReadToSelectAudioVocabularyResponseSchema,
  sentenceInputSchema,
  vocabularyInputSchema,
  type GameResults,
  type LearningEvidence,
  type PreparedReadToSelectAudioVocabularyResponse,
} from "@reading-advantage/game-contracts";
import {
  RpgRewardDisclosure,
  RpgUnlockNotice,
  resolveRpgRewardAssetUrls,
  type StandardExperienceCartridge,
} from "@reading-advantage/advantage-play-kit/presentation";
import {
  type GameInput,
  type GameTerminalOutcome,
} from "@reading-advantage/advantage-play-kit/runtime";
import {
  cartridgeLoaders,
  CARTRIDGE_CHALLENGE_CAPABILITIES,
  createCatalogStandardEdition,
} from "@reading-advantage/game-cartridges";

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
 * @param challengeId Optional selected challenge identifier.
 * @returns A same-app login path with an encoded post-login redirect.
 */
export function buildAuthenticatedApkLoginHref(
  locale: AppRouteLocale,
  cartridgeId: string,
  challengeId?: string,
): string {
  const gamePath = `/${locale}/student/games/apk/${cartridgeId}${challengeId ? `?challengeId=${encodeURIComponent(challengeId)}` : ""}`;
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

const completionResponseSchema = z.object({
  xpEarned: z.number().int().min(0),
  activityId: z.string().min(1),
  duplicate: z.boolean(),
  status: z.literal(200),
}).strict();

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
  /** Validated server-side identity for the current student. */
  readonly ownerKey?: string;
  /** Optional server-owned class challenge to launch. */
  readonly challengeId?: string;
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
 * @returns A selected-union edition for declared bindings plus player and enemy art.
 */
function createStudentEdition(cartridge: StandardExperienceCartridge) {
  return createCatalogStandardEdition(
    cartridge.manifest.requiredAssetBindings,
    withBasePath("/assets/apk/standard-pack-qc/"),
    cartridge.manifest.id,
  );
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
  contentLocale: requestedContentLocale,
  ownerKey,
  challengeId,
}: AuthenticatedCartridgeHostProps) {
  const requiresThaiTargets = [
    "wizard-vs-zombie", "dragon-flight", "dragon-rider", "magic-defense", "castle-defense", "griffin-sky-joust", "rune-match", "enchanted-library", "alchemists-synthesis", "potion-rush", "rpg-battle", "archers-revenge", "paladins-twin-soul", "spellweavers-run", "shadow-gate-dungeon", "labyrinth-goblin-king", "dungeon-liberator", "rune-forge-chamber", "realm-carver", "storm-castle-tower", "abyssal-well", "devourer-slime",
  ].includes(cartridgeId);
  const contentLocale = requiresThaiTargets
    ? "th"
    : requestedContentLocale;
  const { recordSession } = useLeaderboard();
  const { start: startMusic, stop: stopMusic, duck: duckMusic, setMuted: muteMusic } = useBackgroundMusic(
    resolveGameMusicId(cartridgeId),
  );
  const [cartridge, setCartridge] = useState<StandardExperienceCartridge>();
  const [input, setInput] = useState<GameInput>();
  const [answerAudioResponse, setAnswerAudioResponse] = useState<PreparedReadToSelectAudioVocabularyResponse>();
  const [loadedLearningMode, setLoadedLearningMode] = useState<"reading" | "answer-audio">();
  const [loadedChallengeRunId, setLoadedChallengeRunId] = useState<string>();
  const [learningMode, setLearningMode] = useState<"reading" | "answer-audio">("reading");
  const [loadError, setLoadError] = useState<HostLoadError>();
  const challengeRun = useStudentChallengeRun({
    ownerKey: ownerKey ?? "",
    challengeId,
    endpoint: withBasePath("/api/v1/apk/challenges/runs"),
    enabled: Boolean(ownerKey && challengeId),
  });
  const challengeLaunch = challengeId ? challengeRun.launch : null;
  const [, setCompletionSessionRevision] = useState(0);
  const startedAtRef = useRef(Date.now());
  const rpg = useStudentRpg({
    endpoint: withBasePath("/api/v1/apk/rpg"),
    ownerKey: ownerKey ?? "",
    enabled: Boolean(ownerKey),
  });
  const rpgAssetUrls = useMemo(
    () => resolveRpgRewardAssetUrls(withBasePath("/")),
    [],
  );
  const supportsAnswerAudio = !challengeId && ["wizard-vs-zombie", "dragon-flight", "dragon-rider"].includes(cartridgeId)
    && inputMode === "vocabulary" && contentLocale === "th";
  const effectiveLearningMode = supportsAnswerAudio ? learningMode : "reading";
  const completionConfigKey = `${cartridgeId}\u0000${inputMode}\u0000${locale}\u0000${contentLocale}\u0000${title}\u0000${description}\u0000${effectiveLearningMode}\u0000${ownerKey ?? ""}\u0000${challengeId ?? ""}\u0000${challengeLaunch?.runId ?? ""}`;
  const completionSessionRef = useRef<{
    configKey: string;
    input: GameInput | undefined;
    idempotencyKey?: string;
    request?: ReturnType<typeof mapGameResultsToCompletionInput> & { readonly challengeRunId?: string };
    challengeRunId?: string;
    difficulty: "easy" | "medium" | "hard" | "extreme";
    challengeModality?: unknown;
    leaderboardRecorded?: boolean;
  } | undefined>(undefined);
  if (!completionSessionRef.current
    || completionSessionRef.current.configKey !== completionConfigKey
    || completionSessionRef.current.input !== input) {
    completionSessionRef.current = {
      configKey: completionConfigKey,
      input,
      challengeRunId: challengeLaunch?.runId,
      difficulty: challengeLaunch?.challenge.difficulty ?? "medium",
      challengeModality: challengeLaunch?.challenge.modality,
    };
  }
  const completionSession = completionSessionRef.current;

  const edition = useMemo(
    () => (cartridge ? createStudentEdition(cartridge) : undefined),
    [cartridge],
  );
  const createAnswerAudioSession = useCallback(() => {
    if (!answerAudioResponse) throw new Error("English answer audio is unavailable.");
    return createAnswerChoiceAudioController({
      session: answerAudioResponse.answerAudioSession,
      clips: answerAudioResponse.preparedAnswerAudio.clips.map(({ itemPosition, url, mediaType }) => ({
        itemPosition, url, mediaType: mediaType as `audio/${string}`,
      })),
        preparationTimeoutMs: 10_000,
      ...createBrowserAudioClipPorts(),
      ducking: { duck: duckMusic },
    });
  }, [duckMusic, answerAudioResponse]);

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
    const contentRequest = new AbortController();
    setCartridge(undefined);
    setInput(undefined);
    setAnswerAudioResponse(undefined);
    setLoadedLearningMode(undefined);
    setLoadedChallengeRunId(undefined);
    setLoadError(undefined);

    const load = async (): Promise<void> => {
      try {
        if (challengeId) {
          if (!challengeLaunch) return;
          const loadedCartridge = await getCartridgeLoader(cartridgeId)();
          const capability = CARTRIDGE_CHALLENGE_CAPABILITIES[cartridgeId];
          const challenge = challengeLaunch.challenge;
          if (!capability
            || challenge.gameId !== cartridgeId
            || challenge.contentMode !== inputMode
            || challenge.gameVersion !== capability.version
            || !capability.modalities.includes("reading")
            || challenge.modality.modality !== "reading"
            || challenge.modality.promptField !== "translation"
            || challenge.modality.answerField !== "term") {
            throw new Error("This installed game cannot run the selected challenge.");
          }
          if (challenge.difficulty !== "medium") {
            throw new Error("This game host currently supports medium challenge difficulty only.");
          }
          if (loadedCartridge.manifest.inputMode !== inputMode) {
            throw new Error("The challenge content mode does not match this game.");
          }
          const schema = inputMode === "sentence" ? sentenceInputSchema : vocabularyInputSchema;
          const parsedInput = schema.safeParse(challengeLaunch.content.items);
          if (!parsedInput.success || parsedInput.data.length === 0) {
            throw new Error("The challenge content is invalid.");
          }
          if (!active) return;
          setCartridge(loadedCartridge);
          setInput(parsedInput.data);
          setLoadedLearningMode("reading");
          setLoadedChallengeRunId(challengeLaunch.runId);
          return;
        }
        const [loadedCartridge, response] = await Promise.all([
          getCartridgeLoader(cartridgeId)(),
          fetch(`/api/v1/apk/content?mode=${inputMode}&locale=${contentLocale}${effectiveLearningMode === "answer-audio" ? `&learningMode=answer-audio&cartridgeId=${cartridgeId}` : ""}`, {
            cache: "no-store",
            credentials: "same-origin",
            signal: contentRequest.signal,
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
        const prepared = effectiveLearningMode === "answer-audio"
          ? preparedReadToSelectAudioVocabularyResponseSchema.safeParse(payload)
          : undefined;
        if (prepared && !prepared.success) {
          throw new Error("The English answer audio response is invalid.");
        }
        const schema = inputMode === "sentence" ? sentenceInputSchema : vocabularyInputSchema;
        const parsedInput = schema.safeParse(prepared?.data.content ?? payload.content);
        if (!parsedInput.success) {
          throw new Error("The learning-content response is invalid.");
        }
        if (requiresThaiTargets) {
          const targets = z.object({
            requestedTargetLocale: z.literal("th"),
            selectedTargetLocales: z.array(z.literal("th")),
          }).safeParse(payload);
          if (!targets.success || targets.data.selectedTargetLocales.length !== parsedInput.data.length) {
            throw new Error("Thai translations are unavailable for this game.");
          }
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
        setAnswerAudioResponse(prepared?.data);
        setLoadedLearningMode(effectiveLearningMode);
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
      contentRequest.abort();
    };
  }, [cartridgeId, inputMode, contentLocale, effectiveLearningMode, ownerKey, challengeId, challengeLaunch]);

  /**
   * Persists one server-authoritative completion for an explicit terminal outcome.
   * @param result Validated five-field display result from the cartridge.
   * @param outcome Validated terminal outcome supplied by the runtime.
   * @param evidence Optional validated listening evidence.
   * @returns The server-confirmed XP and duplicate state.
   * @throws When a legacy complete outcome cannot identify victory or defeat, or when persistence fails.
   */
  const handleComplete = async (
    result: GameResults,
    outcome: GameTerminalOutcome,
    evidence?: LearningEvidence,
  ) => {
    if (outcome === "complete") {
      throw new Error("Authenticated completion requires a victory or defeat outcome.");
    }
    if (completionSessionRef.current !== completionSession) {
      throw new Error("The game session changed before progress was saved.");
    }
    const requestIdempotencyKey = completionSession.idempotencyKey ?? globalThis.crypto.randomUUID();
    completionSession.idempotencyKey = requestIdempotencyKey;
    const mappedCompletion = mapGameResultsToCompletionInput(result, {
      gameType: cartridgeId,
      difficulty: completionSession.difficulty,
      duration: Math.max(0, Math.round(Date.now() - startedAtRef.current)),
      victory: outcome === "victory",
      idempotencyKey: requestIdempotencyKey,
      clientTimestamp: Date.now(),
      metadata: {
        contentSource: completionSession.challengeRunId ? "class-challenge" : "student-flashcards",
        inputMode,
        ...(evidence ? { learningEvidence: evidence } : {}),
        ...(completionSession.challengeModality ? { challengeModality: completionSession.challengeModality } : {}),
      },
    });
    const completionInput = completionSession.request ?? {
      ...mappedCompletion,
      ...(completionSession.challengeRunId ? { challengeRunId: completionSession.challengeRunId } : {}),
    };
    completionSession.request = completionInput;
    const response = await fetch("/api/v1/apk/complete", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(completionInput),
    });
    const payload: unknown = await response.json();
    if (completionSessionRef.current !== completionSession) {
      throw new Error("The game session changed before progress was saved.");
    }
    if (!response.ok) {
      throw new Error(readErrorMessage(payload, "Game progress could not be saved."));
    }
    const parsedResponse = completionResponseSchema.safeParse(payload);
    if (!parsedResponse.success) {
      throw new Error("The game-progress response is invalid.");
    }
    if (completionSessionRef.current === completionSession) {
      void rpg.refreshAfterSavedCompletion();
    }
    if (!parsedResponse.data.duplicate
      && !completionSession.leaderboardRecorded
      && completionSessionRef.current === completionSession) {
      completionSession.leaderboardRecorded = true;
      recordSession(
        cartridgeId,
        title,
        completionInput.score,
        parsedResponse.data.xpEarned,
        completionInput.accuracy,
      );
    }
    return {
      xpEarned: parsedResponse.data.xpEarned,
      duplicate: parsedResponse.data.duplicate,
    };
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
          {supportsAnswerAudio ? (
            <div className="mt-4 flex gap-2" aria-label="Learning mode">
              <button className={`min-h-12 rounded-lg border px-4 py-2 font-semibold ${effectiveLearningMode === "reading" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground"}`} type="button" aria-pressed={effectiveLearningMode === "reading"} onClick={() => setLearningMode("reading")}>Read Thai</button>
              <button className={`min-h-12 rounded-lg border px-4 py-2 font-semibold ${effectiveLearningMode === "answer-audio" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground"}`} type="button" aria-pressed={effectiveLearningMode === "answer-audio"} onClick={() => setLearningMode("answer-audio")}>Listen to English</button>
            </div>
          ) : null}
        </header>

        <section
          aria-label={`${title} play surface`}
          className="-mx-4 mt-6 min-h-[320px] overflow-hidden border-y border-border bg-black p-0 sm:mx-0 sm:rounded-lg sm:border sm:p-4"
        >
          {challengeId && !ownerKey ? (
            <p role="alert" className="p-4 text-red-300">
              <a className="underline text-sky-300" href={buildAuthenticatedApkLoginHref(locale, cartridgeId, challengeId)}>
                Sign in to play this challenge
              </a>
            </p>
          ) : null}
          {challengeId && ownerKey && challengeRun.failureMessage ? (
            <div role="alert" className="p-4 text-red-300">
              <p>{challengeRun.failureMessage}</p>
              <button type="button" className="min-h-12" onClick={() => void challengeRun.retry()}>Try again</button>
            </div>
          ) : null}
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
                <>
                  <span>{loadError.message}</span>
                  {effectiveLearningMode === "answer-audio" ? <button type="button" onClick={() => setLearningMode("reading")}>Read instead</button> : null}
                </>
              )}
            </p>
          ) : null}
          {!loadError && !(challengeId && (!ownerKey || challengeRun.failureMessage)) && (!cartridge || !input) ? (
            <p className="p-4 text-slate-100">{challengeId ? "Loading challenge..." : "Loading student content..."}</p>
          ) : null}
          {cartridge && input && edition && loadedLearningMode === effectiveLearningMode
            && (challengeId
              ? Boolean(challengeLaunch && loadedChallengeRunId === challengeLaunch.runId)
              : loadedChallengeRunId === undefined) ? (
            <APKGameHost
              aria-label={`${title} game`}
              createAnswerAudioSession={effectiveLearningMode === "answer-audio" ? createAnswerAudioSession : undefined}
              cartridge={cartridge}
              edition={edition}
              input={input}
              launchPhase={
                !challengeId && typeof window !== "undefined"
                && new URLSearchParams(window.location.search).get("mode") === "demo"
                  ? "demo"
                  : "briefing"
              }
              seed={challengeLaunch?.challenge.seed ?? 29}
              responsive={APK_HOST_RESPONSIVE_OPTIONS}
              standardExperience={cartridge.standardExperience}
              className={APK_HOST_LAYOUT_CLASS}
              briefingExtension={rpg.state ? (
                <RpgRewardDisclosure
                  state={rpg.state}
                  assetUrls={rpgAssetUrls}
                  pendingCosmeticId={rpg.pendingCosmeticId}
                  failureMessage={rpg.failureMessage}
                  onRetry={() => void rpg.retry()}
                  onEquip={(cosmeticId) => void rpg.equip(cosmeticId)}
                />
              ) : rpg.failureMessage ? (
                <div role="alert">
                  <p>{rpg.failureMessage}</p>
                  <button type="button" className="min-h-12" onClick={() => void rpg.retry()}>Try again</button>
                </div>
              ) : null}
              resultExtension={rpg.failureMessage || (rpg.state && rpg.newlyUnlockedCosmetics.length > 0) ? (
                <RpgUnlockNotice
                  cosmetics={(rpg.state ? rpg.newlyUnlockedCosmetics : []).map((unlocked) => (
                    rpg.state?.cosmetics.find(({ id }) => id === unlocked.id) ?? unlocked
                  ))}
                  assetUrls={rpgAssetUrls}
                  pendingCosmeticId={rpg.pendingCosmeticId}
                  failureMessage={rpg.failureMessage}
                  onRetry={() => void rpg.retry()}
                  onEquip={(cosmeticId) => void rpg.equip(cosmeticId)}
                />
              ) : null}
              onComplete={handleComplete}
              onMutedChange={muteMusic}
              onLifecycleTransition={(transition) => {
                if (transition.to === "playing") startedAtRef.current = Date.now();
                if (transition.event === "replay"
                  || (transition.to === "playing" && transition.from !== "paused")) {
                  rpg.beginSession();
                }
                if (transition.event === "start" || transition.to === "playing") {
                  void startMusic();
                }
                if (transition.from === "results" && transition.event === "replay") {
                  completionSessionRef.current = { configKey: completionConfigKey, input: undefined, difficulty: "medium" };
                  if (challengeId) {
                    setInput(undefined);
                    setCartridge(undefined);
                    void challengeRun.retry();
                  } else {
                    completionSessionRef.current = { configKey: completionConfigKey, input, difficulty: "medium" };
                  }
                  setCompletionSessionRevision((revision) => revision + 1);
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
