"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { parsePracticeInput, type GameResults, type LaunchAvatar, type PracticeInput, type PreparedReadToSelectAudioVocabularyResponse, type ReadToSelectAudioEvidence, type StoryGameEvidence } from "@reading-advantage/game-contracts";
import type { GameInput } from "@reading-advantage/advantage-play-kit-3d/contracts";
import type { Cartridge, RendererSetting } from "@reading-advantage/advantage-play-kit-3d/factory";
import { StoryGameHost, type StoryGamePhase } from "@reading-advantage/advantage-play-kit-3d/react";
import { hostStrings, missingItems } from "@reading-advantage/game-cartridges-3d";
import { useStudentChallengeRun, useStudentRpg } from "@reading-advantage/advantage-play-kit/react";
import { RpgRewardDisclosure, RpgUnlockNotice } from "@reading-advantage/advantage-play-kit/presentation";

import { Link, useRouter } from "@/i18n/navigation";
import { answerAudioControllerOf, fetchAnswerAudio, offersAnswerAudio } from "@/lib/games/answer-audio";
import { gameFor, practiceLocaleOf } from "@/lib/games/catalog";
import { rewardIconUrls } from "@/lib/rpg/places";
import { canRunChallenge, hostCompletionInput } from "@/lib/games/completion";

/** The saved completion numbers (Class Quest FR-8): the battle page posts them as its heartbeat. */
export interface CompletionSummary {
  challengeRunId?: string;
  correctAnswers: number;
  totalAttempts: number;
  victory: boolean;
}

/** Props of the Primary game host. */
export interface GameHostProps {
  /** A 3D game id, or a legacy 2D catalog id (`LEGACY_GAME_IDS`). */
  readonly gameId: string;
  /** The page locale: picks the translation language of the saved items and the sign-in link. */
  readonly locale: string;
  /** The student's identity for the RPG rewards; absent for a guest (no rewards, no challenge). */
  readonly ownerKey?: string;
  /** A class challenge to run: the server issues the content and the seed. */
  readonly challengeId?: string;
  /** The saved items when the page already has them; absent: the host fetches them. */
  readonly input?: PracticeInput;
  /** The student's avatar; null or absent means the game's hero. */
  readonly avatar?: LaunchAvatar | null;
  /** `'phaser'` forces the 2D view; `'auto'` picks by device; absent: the student's saved choice. */
  readonly setting?: RendererSetting;
  /** Post the completion (default). False is the demo mode: the run saves nothing. */
  readonly save?: boolean;
  readonly className?: string;
  /** Receives the saved completion numbers. */
  readonly onCompleted?: (summary: CompletionSummary) => void;
  /** Back from the briefing or done from the results; absent: the games catalog. */
  readonly onExit?: () => void;
}

type SaveState = "idle" | "saving" | "saved" | "error";
type LearningMode = "reading" | "answer-audio";
type LoadError = "game" | "load" | "unauthenticated";

/**
 * Plays one 3D game (2D on older phones) for a student: the saved items or a class challenge as
 * the input, the RPG reward panels around the briefing and the results, and the completion posted
 * to the catalog route. The game internals never fetch: the host passes the input and the avatar.
 * A game whose manifest lists the answer audio modality also offers English answer audio outside a
 * class challenge: the host fetches the prepared clips, makes a controller per run, and saves its evidence.
 * @param props The game, the identity, the content source, and the callbacks.
 * @returns The game surface with its load, lock, and save states.
 */
export function GameHost({ gameId, locale, ownerKey, challengeId, input, avatar = null, setting, save = true, className, onCompleted, onExit }: GameHostProps) {
  const t = useTranslations("ApkHost");
  const tStory = useTranslations("StoryGames");
  const router = useRouter();
  const game = useMemo(() => gameFor(gameId), [gameId]);
  const [cartridge, setCartridge] = useState<Cartridge | null>(null);
  const [practice, setPractice] = useState<PracticeInput | null>(null);
  const [error, setError] = useState<LoadError | null>(game ? null : "game");
  const [phase, setPhase] = useState<StoryGamePhase>("briefing");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [attempt, setAttempt] = useState(0);
  const [mode, setMode] = useState<LearningMode>("reading");
  const [prepared, setPrepared] = useState<PreparedReadToSelectAudioVocabularyResponse | null>(null);
  const startedAt = useRef(Date.now());
  const challengeRun = useStudentChallengeRun({ endpoint: "/api/v1/apk/challenges/runs", ownerKey: ownerKey ?? "", challengeId, enabled: Boolean(ownerKey && challengeId) });
  const launch = challengeId ? challengeRun.launch : null;
  const rpg = useStudentRpg({ endpoint: "/api/v1/apk/rpg", ownerKey: ownerKey ?? "", enabled: Boolean(ownerKey) });
  const exit = onExit ?? (() => router.push("/student/games"));
  const offersAudio = Boolean(game && !challengeId && offersAnswerAudio(game));
  const audioMode = offersAudio && mode === "answer-audio";

  useEffect(() => {
    if (!game) return undefined;
    let live = true;
    setCartridge(null);
    setPrepared(null);
    setError(null);
    const needsPractice = !challengeId && !input;
    const audio = new AbortController();
    Promise.all([
      game.load(),
      needsPractice
        ? fetch(`/api/v1/apk/practice?locale=${practiceLocaleOf(locale)}`, { cache: "no-store", credentials: "same-origin" }).then(async (res) => {
          if (!res.ok) throw Object.assign(new Error(`practice: HTTP ${res.status}`), { unauthenticated: res.status === 401 });
          return parsePracticeInput(await res.json());
        })
        : Promise.resolve(null),
      audioMode ? fetchAnswerAudio(game.id, audio.signal) : Promise.resolve(null),
    ])
      .then(([loaded, saved, clips]) => {
        if (!live) return;
        setCartridge(loaded);
        setPractice(saved);
        setPrepared(clips);
      })
      .catch((err: unknown) => live && setError(typeof err === "object" && err !== null && "unauthenticated" in err && err.unauthenticated === true ? "unauthenticated" : "load"));
    return () => {
      live = false;
      audio.abort();
    };
  }, [game, challengeId, input, locale, attempt, audioMode]);

  const challengeOk = Boolean(game && launch && canRunChallenge(game, launch, (id) => gameFor(id)?.id));
  const saved = input ?? practice;
  const run = useMemo<{ input: PracticeInput | GameInput; seed?: number } | null>(() => {
    if (challengeId) return launch && challengeOk ? { input: launch.content.items, seed: launch.challenge.seed } : null;
    if (audioMode) return prepared ? { input: prepared.content } : null;
    return saved ? { input: saved } : null;
  }, [challengeId, launch, challengeOk, saved, audioMode, prepared]);
  const answerAudio = useMemo(() => (audioMode && prepared ? () => answerAudioControllerOf(prepared) : undefined), [audioMode, prepared]);
  const missing = game && !challengeId && saved ? missingItems(game, saved) : null;
  const locked = Boolean(missing && (missing.vocabulary > 0 || missing.sentences > 0));

  const onPhase = useCallback((next: StoryGamePhase) => {
    setPhase(next);
    if (next === "playing") {
      startedAt.current = Date.now();
      setSaveState("idle");
      rpg.beginSession();
    }
  }, [rpg]);

  const onComplete = useCallback((result: GameResults, outcome: string, evidence: StoryGameEvidence, answerEvidence?: ReadToSelectAudioEvidence) => {
    if (!game) return;
    const victory = outcome !== "defeat";
    const body = hostCompletionInput(game, launch, result, evidence, { startedAt: startedAt.current, now: Date.now(), victory, idempotencyKey: crypto.randomUUID() }, answerEvidence);
    if (!save) return;
    setSaveState("saving");
    fetch("/api/v1/apk/complete", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then((res) => {
        setSaveState(res.ok ? "saved" : "error");
        if (!res.ok) return;
        if (ownerKey) void rpg.refreshAfterSavedCompletion().catch(() => undefined);
        onCompleted?.({ ...(body.challengeRunId ? { challengeRunId: body.challengeRunId } : {}), correctAnswers: body.correctAnswers, totalAttempts: body.totalAttempts, victory });
      })
      .catch(() => setSaveState("error"));
  }, [game, launch, save, ownerKey, rpg, onCompleted]);

  const signIn = (
    <Link className="underline" href={`/auth/signin?redirect=${encodeURIComponent(`/${locale}/student/games/apk/${gameId}${challengeId ? `?challengeId=${challengeId}` : ""}`)}`}>
      {challengeId ? t("signInToPlayChallenge") : t("signInToPlayGame")}
    </Link>
  );

  let notice: React.ReactNode = null;
  if (error === "game") notice = <p role="alert" className="text-destructive">{t("loadError")}</p>;
  else if (error === "unauthenticated" || (challengeId && !ownerKey)) notice = <p role="alert">{signIn}</p>;
  else if (error === "load" || (challengeId && challengeRun.failureMessage)) {
    notice = (
      <div role="alert" className="space-y-2 text-destructive">
        <p>{challengeRun.failureMessage ?? t("loadError")}</p>
        <button type="button" className="min-h-12 underline" onClick={() => (challengeId ? void challengeRun.retry() : setAttempt((n) => n + 1))}>{t("retry")}</button>
      </div>
    );
  } else if (challengeId && launch && !challengeOk) notice = <p role="alert" className="text-destructive">{t("challengeMismatch")}</p>;
  else if (locked && missing) {
    notice = (
      <div data-testid="locked" className="space-y-2">
        <p>{missing.vocabulary > 0 ? tStory("needWords", { count: missing.vocabulary }) : tStory("needSentences", { count: missing.sentences })}</p>
        <Link href="/student/read" className="inline-block min-h-12 font-semibold underline">{tStory("readMore")}</Link>
      </div>
    );
  }
  const ready = Boolean(game && cartridge && run && !notice);

  return (
    <div className={className ?? "flex h-full min-h-[480px] w-full flex-col"} data-testid="game-host" data-phase={phase}>
      {notice ? <div className="cq-panel m-4">{notice}</div> : null}
      {!notice && !ready ? <p className="cq-on-scene m-4 text-sm">{challengeId ? t("loadingChallenge") : t("loadingGame")}</p> : null}
      {offersAudio && !locked && phase === "briefing" ? (
        <div role="group" className="flex shrink-0 gap-2 p-2">
          {(["reading", "answer-audio"] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={`min-h-12 rounded-lg border px-4 py-2 font-semibold ${mode === m ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground"}`}>
              {t(m === "reading" ? "readMode" : "listenMode")}
            </button>
          ))}
        </div>
      ) : null}
      {ready && phase === "briefing" && ownerKey ? (
        rpg.state ? (
          <div className="shrink-0 overflow-y-auto p-2">
            <RpgRewardDisclosure state={rpg.state} assetUrls={rewardIconUrls} credit={null} pendingCosmeticId={rpg.pendingCosmeticId} failureMessage={rpg.failureMessage} onRetry={() => void rpg.retry()} onEquip={(id) => void rpg.equip(id)} inventoryNote={t("rewardInInventory")} />
          </div>
        ) : rpg.failureMessage ? (
          <div role="alert" className="shrink-0 p-2 text-sm"><p>{rpg.failureMessage}</p><button type="button" className="min-h-12 underline" onClick={() => void rpg.retry()}>{t("retry")}</button></div>
        ) : null
      ) : null}
      {ready && phase === "results" && ownerKey && (rpg.failureMessage || rpg.newlyUnlockedCosmetics.length > 0) ? (
        <div className="shrink-0 overflow-y-auto p-2">
          <RpgUnlockNotice cosmetics={rpg.newlyUnlockedCosmetics} assetUrls={rewardIconUrls} credit={null} pendingCosmeticId={rpg.pendingCosmeticId} failureMessage={rpg.failureMessage} onRetry={() => void rpg.retry()} onEquip={(id) => void rpg.equip(id)} inventoryNote={t("rewardInInventory")} />
        </div>
      ) : null}
      {ready && game && cartridge && run ? (
        <div className="relative min-h-0 flex-1">
          <StoryGameHost
            cartridge={cartridge}
            input={run.input}
            seed={run.seed}
            replay={!launch}
            icon={game.icon}
            assetBase="/"
            helper={false}
            avatar={avatar}
            setting={setting}
            catalogs={[hostStrings]}
            className="h-full w-full"
            {...(answerAudio ? { answerAudio } : {})}
            onComplete={onComplete}
            onExit={exit}
            onPhase={onPhase}
          />
          {saveState !== "idle" ? (
            <p role="status" className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-black/70 px-3 py-1 text-sm text-white">{tStory(`save.${saveState}`)}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
