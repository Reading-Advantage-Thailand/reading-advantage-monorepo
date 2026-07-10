"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RuntimeCartridge } from "@reading-advantage/advantage-play-kit";
import {
  cartridgeLoaders,
  type CartridgeId,
} from "@reading-advantage/game-cartridges/catalog";
import {
  primaryChibiEdition,
  resolveCartridgeEdition,
  secondaryEpicEdition,
} from "@reading-advantage/game-cartridges/editions";
import {
  mapGameResultsToCompletionInput,
  type GameResults,
} from "@reading-advantage/game-contracts";

import { getArcadeContent, getNextCartridgeId } from "./content";
import { useArcadeSession } from "./use-arcade-session";

const APKGameHost = dynamic(
  () =>
    import("@reading-advantage/advantage-play-kit/react").then(
      (module) => module.APKGameHost,
    ),
  {
    ssr: false,
    loading: () => <p className="p-6 text-sm text-cyan-100">Loading game…</p>,
  },
);

type APKArcadeHostProps = {
  /** Package-owned cartridge identifier. */
  cartridgeId: CartridgeId;
  /** Active URL locale. */
  locale: string;
  /** Product-facing cartridge title. */
  title: string;
  /** Educational content mode declared by the cartridge. */
  inputMode: "vocabulary" | "sentence";
};

type SavedCompletion = {
  xpEarned: number;
  duplicate: boolean;
};

function createIdempotencyKey(): string {
  return globalThis.crypto?.randomUUID?.() ??
    "00000000-0000-4000-8000-000000000000";
}

/** Renders the authenticated, generic production host for one APK cartridge.
 * @param props Published cartridge metadata and the active locale.
 * @returns A single responsive game host with edition and continuation controls.
 */
export function APKArcadeHost({
  cartridgeId,
  locale,
  title,
  inputMode,
}: APKArcadeHostProps) {
  const session = useArcadeSession();
  const [editionId, setEditionId] = useState(primaryChibiEdition.id);
  const [launchNonce, setLaunchNonce] = useState(0);
  const [cartridge, setCartridge] = useState<RuntimeCartridge>();
  const [loadError, setLoadError] = useState<string>();
  const [saveError, setSaveError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<GameResults>();
  const [saved, setSaved] = useState<SavedCompletion>();
  const startedAt = useRef(Date.now());
  const idempotencyKey = useRef(createIdempotencyKey());

  const input = useMemo(() => getArcadeContent(inputMode), [inputMode]);
  const edition = resolveCartridgeEdition(editionId);
  const nextCartridgeId = getNextCartridgeId(cartridgeId);

  useEffect(() => {
    if (session.status !== "authenticated") return;
    let active = true;
    setCartridge(undefined);
    setLoadError(undefined);

    void cartridgeLoaders[cartridgeId]()
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
  }, [cartridgeId, editionId, launchNonce, session.status]);

  const replay = useCallback(() => {
    setResult(undefined);
    setSaved(undefined);
    setSaveError(undefined);
    startedAt.current = Date.now();
    idempotencyKey.current = createIdempotencyKey();
    setLaunchNonce((value) => value + 1);
  }, []);

  const changeEdition = useCallback((nextEditionId: string) => {
    setEditionId(nextEditionId);
    setResult(undefined);
    setSaved(undefined);
    setSaveError(undefined);
    startedAt.current = Date.now();
    idempotencyKey.current = createIdempotencyKey();
  }, []);

  const saveResult = useCallback(
    async (nextResult: GameResults) => {
      setResult(nextResult);
      setSaved(undefined);
      setSaveError(undefined);
      setSaving(true);

      try {
        const payload = mapGameResultsToCompletionInput(nextResult, {
          gameType: cartridgeId,
          difficulty: "medium",
          duration: Math.max(0, Date.now() - startedAt.current),
          victory:
            nextResult.correctAnswers > 0 && nextResult.accuracy >= 0.5,
          idempotencyKey: idempotencyKey.current,
          clientTimestamp: Date.now(),
          metadata: { editionId },
        });
        const response = await fetch("/api/v1/apk/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = (await response.json()) as Partial<SavedCompletion> & {
          message?: string;
        };
        if (!response.ok) {
          throw new Error(body.message ?? "The result could not be saved.");
        }
        if (typeof body.xpEarned !== "number" || typeof body.duplicate !== "boolean") {
          throw new Error("The completion response was invalid.");
        }
        setSaved({ xpEarned: body.xpEarned, duplicate: body.duplicate });
      } catch (error: unknown) {
        setSaveError(
          error instanceof Error ? error.message : "The result could not be saved.",
        );
      } finally {
        setSaving(false);
      }
    },
    [cartridgeId, editionId],
  );

  if (session.status === "loading") {
    return <p className="p-6">Checking your student session…</p>;
  }

  if (!session.session?.user || session.session.user.role !== "STUDENT") {
    return (
      <div role="alert" className="mx-auto max-w-xl border border-amber-400 p-6">
        <p>Sign in with a student account to play.</p>
        <Link
          className="mt-4 inline-flex min-h-11 items-center border border-current px-4"
          href={`/login?redirect=/${locale}/student/arcade/${cartridgeId}`}
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-950 px-3 py-4 text-slate-100 sm:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Advantage Arcade</p>
            <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
          </div>
          <Link className="inline-flex min-h-11 items-center border border-slate-600 px-4" href="/">
            Catalog
          </Link>
        </header>

        <fieldset className="my-4 flex min-w-0 flex-wrap gap-2">
          <legend className="mb-2 w-full text-sm text-slate-300">Theme pack</legend>
          {[primaryChibiEdition, secondaryEpicEdition].map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              aria-pressed={editionId === candidate.id}
              onClick={() => changeEdition(candidate.id)}
              className="min-h-11 border border-slate-600 px-4 aria-pressed:border-cyan-300 aria-pressed:bg-cyan-300/10"
            >
              {candidate.title}
            </button>
          ))}
        </fieldset>

        <section aria-label={`${title} play surface`} className="min-h-[320px] w-full min-w-0 overflow-hidden border border-slate-700 bg-black p-2 sm:p-4">
          {loadError && <p role="alert" className="p-4 text-red-200">{loadError}</p>}
          {!loadError && !cartridge && <p className="p-6 text-cyan-100">Loading game…</p>}
          {cartridge && !result && (
            <APKGameHost
              key={`${cartridgeId}-${editionId}-${launchNonce}`}
              cartridge={cartridge}
              input={input}
              edition={edition}
              seed={29}
              onComplete={saveResult}
              instructions={<p className="sr-only">Use the controls displayed in the game. Host pause, mute, and restart controls follow the canvas.</p>}
              className="flex min-w-0 max-w-full flex-col gap-2 overflow-hidden [&_[data-apk-canvas-host]]:min-h-0 [&_[data-apk-canvas-host]]:w-full [&_[data-apk-canvas-host]]:max-w-full [&_[data-apk-canvas-host]]:overflow-hidden [&_[data-apk-canvas-host]_canvas]:mx-auto [&_[data-apk-canvas-host]_canvas]:!h-auto [&_[data-apk-canvas-host]_canvas]:!max-w-full [&_[data-apk-canvas-host]_canvas]:!w-full [&_[role=group]]:flex [&_[role=group]]:flex-wrap [&_[role=group]]:gap-2 [&_button]:min-h-11"
            />
          )}
        </section>

        {result && (
          <section aria-live="polite" className="mt-4 border border-emerald-400/50 bg-emerald-950/30 p-4">
            <h2 className="text-xl font-semibold">Session complete</h2>
            {saving && <p className="mt-2">Saving result…</p>}
            {saved && (
              <p className="mt-2 text-emerald-200">
                Saved · {saved.xpEarned} XP earned{saved.duplicate ? " · already recorded" : ""}
              </p>
            )}
            {saveError && <p role="alert" className="mt-2 text-red-200">{saveError}</p>}
            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <div><dt className="text-slate-400">Score</dt><dd>{result.score}</dd></div>
              <div><dt className="text-slate-400">Accuracy</dt><dd>{Math.round(result.accuracy * 100)}%</dd></div>
              <div><dt className="text-slate-400">Correct</dt><dd>{result.correctAnswers}/{result.totalAttempts}</dd></div>
            </dl>
            <nav aria-label="Continue playing" className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={replay} className="min-h-11 border border-slate-500 px-4">Replay</button>
              <Link href="/" className="inline-flex min-h-11 items-center border border-slate-500 px-4">Catalog</Link>
              {saved && (
                <Link href={`/${locale}/student/arcade/${nextCartridgeId}`} className="inline-flex min-h-11 items-center border border-cyan-400 px-4 text-cyan-100">
                  Next Game
                </Link>
              )}
            </nav>
          </section>
        )}
      </div>
    </main>
  );
}
