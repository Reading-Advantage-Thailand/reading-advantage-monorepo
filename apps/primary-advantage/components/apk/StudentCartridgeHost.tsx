"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
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
import type { GameInput, GameTerminalOutcome } from "@reading-advantage/advantage-play-kit/runtime";
import {
  cartridgeLoaders,
  CARTRIDGE_CHALLENGE_CAPABILITIES,
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

/** Props for the Primary student APK route. */
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
  /** Validated server-side identity for RPG state ownership. */
  readonly ownerKey?: string;
  /** Optional server-owned class challenge to launch. */
  readonly challengeId?: string;
  /** Launch phase requested from the page search params. */
  readonly mode?: "demo" | "briefing";
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
  ownerKey,
  challengeId,
  mode = "briefing",
}: StudentCartridgeHostProps) {
  const t = useTranslations("ApkHost");
  const router = useRouter();
  const [cartridge, setCartridge] = useState<StandardExperienceCartridge>();
  const [input, setInput] = useState<GameInput>();
  const [answerAudioResponse, setAnswerAudioResponse] = useState<PreparedReadToSelectAudioVocabularyResponse>();
  const [loadedLearningMode, setLoadedLearningMode] = useState<"reading" | "answer-audio">();
  const [loadedChallengeRunId, setLoadedChallengeRunId] = useState<string>();
  const [learningMode, setLearningMode] = useState<"reading" | "answer-audio">("reading");
  const [loadError, setLoadError] = useState<HostLoadError>();
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [, setCompletionSessionRevision] = useState(0);
  const startedAtRef = useRef(Date.now());
  const challengeRun = useStudentChallengeRun({
    endpoint: "/api/v1/apk/challenges/runs",
    ownerKey: ownerKey ?? "",
    challengeId,
    enabled: Boolean(ownerKey && challengeId),
  });
  const challengeLaunch = challengeId ? challengeRun.launch : null;
  const rpg = useStudentRpg({
    endpoint: "/api/v1/apk/rpg",
    ownerKey: ownerKey ?? "",
    enabled: Boolean(ownerKey),
  });
  const rpgAssetUrls = useMemo(() => resolveRpgRewardAssetUrls("/"), []);
  const supportsAnswerAudio = !challengeId && ["wizard-vs-zombie", "dragon-flight", "dragon-rider"].includes(cartridgeId)
    && inputMode === "vocabulary";
  const effectiveLearningMode = supportsAnswerAudio ? learningMode : "reading";
  const completionConfigKey = `${cartridgeId}\u0000${inputMode}\u0000${locale}\u0000${title}\u0000${description}\u0000${effectiveLearningMode}\u0000${ownerKey ?? ""}\u0000${challengeId ?? ""}\u0000${challengeLaunch?.runId ?? ""}`;
  const completionSessionRef = useRef<{
    configKey: string;
    input: GameInput | undefined;
    idempotencyKey?: string;
    request?: ReturnType<typeof mapGameResultsToCompletionInput> & { readonly challengeRunId?: string };
    challengeRunId?: string;
    difficulty: "easy" | "medium" | "hard";
    challengeModality?: unknown;
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
    () => (cartridge
      ? createCatalogStandardEdition(
        cartridge.manifest.requiredAssetBindings,
        "/assets/apk/standard-pack-qc/",
        cartridge.manifest.id,
      )
      : undefined),
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
      ducking: { duck: () => () => undefined },
    });
  }, [answerAudioResponse]);

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
        const loader = (cartridgeLoaders as Readonly<Record<string, unknown>>)[cartridgeId];
        if (typeof loader !== "function") {
          throw new Error(`Cartridge ${cartridgeId} has no public loader.`);
        }
        const requiresThaiTargets = [
          "wizard-vs-zombie", "dragon-flight", "dragon-rider", "magic-defense", "castle-defense", "griffin-sky-joust", "rune-match", "enchanted-library", "alchemists-synthesis", "potion-rush", "rpg-battle", "archers-revenge", "paladins-twin-soul", "spellweavers-run", "shadow-gate-dungeon", "labyrinth-goblin-king", "dungeon-liberator", "rune-forge-chamber", "realm-carver", "storm-castle-tower", "abyssal-well", "devourer-slime",
        ].includes(cartridgeId);
        const contentLocale = requiresThaiTargets
          ? "th"
          : contentLocaleFor(locale);
        if (challengeId) {
          if (!challengeLaunch) return;
          const loadedCartridge = await (loader as () => Promise<StandardExperienceCartridge>)();
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
          (loader as () => Promise<StandardExperienceCartridge>)(),
          fetch(`/api/v1/apk/content?mode=${inputMode}&locale=${contentLocale}${effectiveLearningMode === "answer-audio" ? `&learningMode=answer-audio&cartridgeId=${cartridgeId}` : ""}`, {
            cache: "no-store",
            credentials: "same-origin",
            signal: contentRequest.signal,
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
        if (!active) return;
        setCartridge(loadedCartridge);
        setInput(parsedInput.data);
        setAnswerAudioResponse(prepared?.data);
        setLoadedLearningMode(effectiveLearningMode);
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
      contentRequest.abort();
    };
  }, [cartridgeId, effectiveLearningMode, inputMode, loadAttempt, locale, ownerKey, challengeId, challengeLaunch]);

  /**
   * Persists one server-authoritative completion.
   * @param result Validated display result.
   * @param outcome Terminal outcome from the runtime.
   * @param evidence Optional validated listening evidence.
   * @returns The server-confirmed XP and duplicate state.
   * @throws When a legacy complete outcome cannot identify victory or defeat.
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
        host: "primary-advantage",
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
      void rpg.refreshAfterSavedCompletion().catch(() => undefined);
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
            Student game
          </p>
          <h1 className="mt-2 text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-muted-foreground">{description}</p>
          {supportsAnswerAudio ? (
            <div className="mt-4 flex gap-2" aria-label="Learning mode">
              <button className={`min-h-12 rounded-lg border px-4 py-2 font-semibold ${effectiveLearningMode === "reading" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground"}`} type="button" aria-pressed={effectiveLearningMode === "reading"} onClick={() => setLearningMode("reading")}>{t("readMode")}</button>
              <button className={`min-h-12 rounded-lg border px-4 py-2 font-semibold ${effectiveLearningMode === "answer-audio" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground"}`} type="button" aria-pressed={effectiveLearningMode === "answer-audio"} onClick={() => setLearningMode("answer-audio")}>{t("listenMode")}</button>
            </div>
          ) : null}
        </header>
        <section
          aria-label={`${title} play surface`}
          className="-mx-4 mt-6 min-h-[320px] overflow-hidden border-y border-border bg-black p-0 sm:mx-0 sm:rounded-lg sm:border sm:p-4"
        >
          {challengeId && !ownerKey ? (
            <p role="alert" className="p-4 text-red-300">
              <a className="underline text-sky-300" href={`/${locale}/auth/signin?redirect=${encodeURIComponent(`/${locale}/student/games/apk/${cartridgeId}?challengeId=${challengeId}`)}`}>
                {t("signInToPlayChallenge")}
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
            <div role="alert" className="space-y-3 p-4 text-red-300">
              {loadError.unauthenticated ? (
                <a className="underline text-sky-300" href={`/${locale}/auth/signin?redirect=${encodeURIComponent(`/${locale}/student/games/apk/${cartridgeId}${challengeId ? `?challengeId=${challengeId}` : ""}`)}`}>
                  {t("signInToPlayGame")}
                </a>
              ) : (
                <>
                  <p>{loadError.message}</p>
                  {effectiveLearningMode === "answer-audio" ? <button type="button" onClick={() => setLearningMode("reading")}>Read instead</button> : null}
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
                !challengeId && mode === "demo" ? "demo" : "briefing"
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
                  cosmetics={rpg.newlyUnlockedCosmetics}
                  assetUrls={rpgAssetUrls}
                  pendingCosmeticId={rpg.pendingCosmeticId}
                  failureMessage={rpg.failureMessage}
                  onRetry={() => void rpg.retry()}
                  onEquip={(cosmeticId) => void rpg.equip(cosmeticId)}
                />
              ) : null}
              onComplete={handleComplete}
              onLifecycleTransition={(transition) => {
                if (transition.to === "playing") startedAtRef.current = Date.now();
                if (transition.event === "replay"
                  || (transition.to === "playing" && transition.from !== "paused")) {
                  rpg.beginSession();
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
                  router.push("/student/games");
                }
              }}
            />
          ) : null}
        </section>
      </div>
    </main>
  );
}
