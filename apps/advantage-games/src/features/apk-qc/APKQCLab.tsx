"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Bug,
  Gamepad2,
  MonitorCog,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type {
  APKDiagnosticEvent,
  RuntimeCartridge,
} from "@reading-advantage/advantage-play-kit";
import {
  cartridgeCatalog,
  cartridgeLoaders,
} from "@reading-advantage/game-cartridges/catalog";
import {
  primaryChibiEdition,
  resolveCartridgeEdition,
  secondaryEpicEdition,
} from "@reading-advantage/game-cartridges/editions";
import {
  mapGameResultsToCompletionInput,
  type GameCompletionInput,
  type GameResults,
} from "@reading-advantage/game-contracts";

import { APK_QC_FIXTURES } from "./fixtures";
import { useFrameDiagnostics } from "./use-frame-diagnostics";

const APKGameHost = dynamic(
  () =>
    import("@reading-advantage/advantage-play-kit/react").then(
      (module) => module.APKGameHost,
    ),
  {
    ssr: false,
    loading: () => <p className="p-8 font-mono text-sm text-cyan-200">Loading Phaser runtime…</p>,
  },
);

type CartridgeId = keyof typeof cartridgeLoaders;
type Difficulty = "easy" | "medium" | "hard" | "extreme";

const difficultySeeds: Record<Difficulty, number> = {
  easy: 11,
  medium: 29,
  hard: 47,
  extreme: 83,
};

/**
 * Renders the local workshop for loading, testing, and inspecting APK cartridges.
 * @returns The accessible cartridge catalog, launch surface, and diagnostics panels.
 */
export function APKQCLab() {
  const [cartridgeId, setCartridgeId] = useState<CartridgeId>("dragon-flight");
  const [editionId, setEditionId] = useState(primaryChibiEdition.id);
  const [fixtureId, setFixtureId] = useState(APK_QC_FIXTURES[0].id);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [debug, setDebug] = useState(true);
  const [launchNonce, setLaunchNonce] = useState(0);
  const [cartridge, setCartridge] = useState<RuntimeCartridge>();
  const [loadError, setLoadError] = useState<string>();
  const [result, setResult] = useState<GameResults>();
  const [completion, setCompletion] = useState<GameCompletionInput>();
  const [diagnostics, setDiagnostics] = useState<APKDiagnosticEvent[]>([]);
  const [viewport, setViewport] = useState("—");
  const frame = useFrameDiagnostics(debug);

  const catalogEntry = cartridgeCatalog.find((entry) => entry.id === cartridgeId)!;
  const fixtures = useMemo(
    () => APK_QC_FIXTURES.filter((fixture) => fixture.inputMode === catalogEntry.inputMode),
    [catalogEntry.inputMode],
  );
  const fixture = fixtures.find((candidate) => candidate.id === fixtureId) ?? fixtures[0]!;
  const edition = resolveCartridgeEdition(editionId);

  useEffect(() => {
    if (!fixtures.some((candidate) => candidate.id === fixtureId)) {
      setFixtureId(fixtures[0]!.id);
    }
  }, [fixtureId, fixtures]);

  useEffect(() => {
    let active = true;
    setCartridge(undefined);
    setLoadError(undefined);
    setResult(undefined);
    setCompletion(undefined);
    setDiagnostics([]);
    void cartridgeLoaders[cartridgeId]()
      .then((loaded) => {
        if (active) setCartridge(loaded);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : "Cartridge failed to load");
      });
    return () => {
      active = false;
    };
  }, [cartridgeId, launchNonce]);

  useEffect(() => {
    const updateViewport = () => setViewport(`${window.innerWidth}×${window.innerHeight}`);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const resetSession = () => {
    setResult(undefined);
    setCompletion(undefined);
    setDiagnostics([]);
    setLaunchNonce((value) => value + 1);
  };

  const recordResult = useCallback((nextResult: GameResults) => {
    setResult(nextResult);
    setCompletion(
      mapGameResultsToCompletionInput(nextResult, {
        gameType: cartridgeId,
        difficulty,
        duration: 0,
        victory: nextResult.correctAnswers > 0 && nextResult.accuracy >= 0.5,
        idempotencyKey: crypto.randomUUID(),
        clientTimestamp: Date.now(),
        metadata: { editionId, fixtureId: fixture.id, mockHost: true },
      }),
    );
  }, [cartridgeId, difficulty, editionId, fixture.id]);

  const recordDiagnostic = useCallback((event: APKDiagnosticEvent) => {
    setDiagnostics((events) => [...events.slice(-19), event]);
  }, []);

  return (
    <main className="min-h-screen bg-[#071017] text-slate-100">
      <header className="border-b border-cyan-300/20 bg-[#091923] px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.26em] text-cyan-300">Advantage Play Kit / QC-01</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Cartridge proving ground</h1>
          </div>
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 border border-slate-600 px-4 py-2 text-sm hover:border-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">
            <ArrowLeft aria-hidden="true" className="size-4" /> Return to catalog
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-4 p-4 lg:grid-cols-[280px_minmax(0,1fr)_320px] lg:p-6">
        <aside aria-label="APK cartridges" className="border border-slate-700 bg-[#0b1821] p-3">
          <div className="mb-3 flex items-center gap-2 border-b border-slate-700 pb-3">
            <Gamepad2 aria-hidden="true" className="size-4 text-cyan-300" />
            <h2 className="font-mono text-sm uppercase tracking-wider">Cartridges</h2>
          </div>
          <div className="space-y-2">
            {cartridgeCatalog.map((entry, index) => (
              <button
                key={entry.id}
                type="button"
                aria-pressed={cartridgeId === entry.id}
                onClick={() => setCartridgeId(entry.id)}
                className="min-h-16 w-full border border-slate-700 p-3 text-left transition hover:border-cyan-400 aria-pressed:border-cyan-300 aria-pressed:bg-cyan-300/10"
              >
                <span className="font-mono text-[10px] text-slate-500">CART-{String(index + 1).padStart(2, "0")}</span>
                <span className="mt-1 block font-medium">{entry.title}</span>
                <span className="mt-1 block text-xs text-slate-400">{entry.mechanic}</span>
              </button>
            ))}
          </div>
        </aside>

        <section aria-label="Cartridge launch surface" className="min-w-0 border border-slate-700 bg-[#09131b]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3">
            <div>
              <p className="font-mono text-xs text-cyan-300">{cartridgeId} · {catalogEntry.inputMode}</p>
              <h2 className="text-xl font-semibold">{catalogEntry.title}</h2>
            </div>
            <button type="button" onClick={resetSession} className="inline-flex min-h-11 items-center gap-2 border border-slate-600 px-4 text-sm hover:border-cyan-300">
              <RotateCcw aria-hidden="true" className="size-4" /> Clean relaunch
            </button>
          </div>

          <div className="grid gap-3 border-b border-slate-700 bg-[#0d1c26] p-4 sm:grid-cols-3">
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Content fixture
              <select value={fixture.id} onChange={(event) => setFixtureId(event.target.value)} className="mt-2 min-h-11 w-full border border-slate-600 bg-[#071017] px-3 text-sm normal-case text-white">
                {fixtures.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Difficulty seed
              <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)} className="mt-2 min-h-11 w-full border border-slate-600 bg-[#071017] px-3 text-sm normal-case text-white">
                {Object.keys(difficultySeeds).map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <fieldset>
              <legend className="text-xs font-medium uppercase tracking-wider text-slate-400">Audience edition</legend>
              <div className="mt-2 grid grid-cols-2 gap-1">
                {[primaryChibiEdition, secondaryEpicEdition].map((candidate) => (
                  <button key={candidate.id} type="button" aria-pressed={editionId === candidate.id} onClick={() => setEditionId(candidate.id)} className="min-h-11 border border-slate-600 px-2 text-xs hover:border-cyan-300 aria-pressed:border-cyan-300 aria-pressed:bg-cyan-300/10">
                    {candidate.title}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="aspect-[16/9] min-h-[360px] w-full bg-[#050a0e] p-2 md:p-4">
            {loadError && <div role="alert" className="border border-red-400 bg-red-950/40 p-4 text-red-100">Cartridge load failed: {loadError}</div>}
            {!loadError && !cartridge && <p className="p-8 font-mono text-sm text-cyan-200">Resolving cartridge chunk…</p>}
            {cartridge && (
              <APKGameHost
                key={`${cartridgeId}-${editionId}-${fixture.id}-${difficulty}-${launchNonce}`}
                cartridge={cartridge}
                input={fixture.input}
                edition={edition}
                seed={difficultySeeds[difficulty]}
                onComplete={recordResult}
                onDiagnostic={recordDiagnostic}
                instructions={<p className="sr-only">Use the game controls shown inside the play surface. Pause, mute, and restart remain available below the canvas.</p>}
                className="flex h-full min-w-0 flex-col gap-2 [&_[data-apk-canvas-host]]:min-h-0 [&_[data-apk-canvas-host]]:w-full [&_[data-apk-canvas-host]]:flex-1 [&_[data-apk-canvas-host]]:overflow-hidden [&_[data-apk-canvas-host]_canvas]:mx-auto [&_[data-apk-canvas-host]_canvas]:!h-auto [&_[data-apk-canvas-host]_canvas]:!max-w-full [&_[data-apk-canvas-host]_canvas]:!w-full [&_[role=group]]:flex [&_[role=group]]:flex-wrap [&_[role=group]]:gap-2 [&_button]:min-h-11 [&_button]:border [&_button]:border-slate-600 [&_button]:px-3"
              />
            )}
          </div>
        </section>

        <aside aria-label="QC diagnostics" className="space-y-4">
          <section className="border border-slate-700 bg-[#0b1821] p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-mono text-sm uppercase tracking-wider"><MonitorCog aria-hidden="true" className="size-4 text-cyan-300" /> Telemetry</h2>
              <label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={debug} onChange={(event) => setDebug(event.target.checked)} /> Debug</label>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-px bg-slate-700 font-mono text-xs">
              <div className="bg-[#071017] p-3"><dt className="text-slate-500">FPS</dt><dd className="mt-1 text-lg text-cyan-200">{frame.fps || "—"}</dd></div>
              <div className="bg-[#071017] p-3"><dt className="text-slate-500">FRAME</dt><dd className="mt-1 text-lg text-cyan-200">{frame.frameTime || "—"} ms</dd></div>
              <div className="bg-[#071017] p-3"><dt className="text-slate-500">VIEWPORT</dt><dd className="mt-1">{viewport}</dd></div>
              <div className="bg-[#071017] p-3"><dt className="text-slate-500">EVENTS</dt><dd className="mt-1">{diagnostics.length}</dd></div>
            </dl>
            {debug && (
              <div data-testid="diagnostic-log" className="mt-3 max-h-40 overflow-auto border border-slate-700 bg-black/30 p-2 font-mono text-[11px] text-slate-300">
                {diagnostics.length === 0 ? "Waiting for runtime events…" : diagnostics.map((event, index) => <p key={`${event.timestamp}-${index}`}><span className="text-cyan-400">{event.code}</span> {event.message}</p>)}
              </div>
            )}
          </section>

          <section className="border border-slate-700 bg-[#0b1821] p-4">
            <h2 className="flex items-center gap-2 font-mono text-sm uppercase tracking-wider"><Activity aria-hidden="true" className="size-4 text-emerald-300" /> Stable result ABI</h2>
            {result ? <pre className="mt-3 overflow-auto bg-black/30 p-3 text-xs text-emerald-100">{JSON.stringify(result, null, 2)}</pre> : <p className="mt-3 text-sm text-slate-400">Complete the learning loop to inspect its five-field result.</p>}
          </section>

          <section className="border border-amber-300/40 bg-amber-300/5 p-4">
            <h2 className="flex items-center gap-2 font-mono text-sm uppercase tracking-wider text-amber-200"><Bug aria-hidden="true" className="size-4" /> Mock host mapping</h2>
            <p className="mt-2 text-xs leading-5 text-slate-400">QC only. Nothing is authenticated or persisted, and display XP is deliberately excluded from server input.</p>
            {completion && <pre className="mt-3 max-h-64 overflow-auto bg-black/30 p-3 text-xs text-amber-100">{JSON.stringify(completion, null, 2)}</pre>}
          </section>

          <section className="border border-slate-700 bg-[#0b1821] p-4 text-xs text-slate-400">
            <p className="flex items-center gap-2 text-slate-200"><Sparkles aria-hidden="true" className="size-4 text-violet-300" /> {edition.title}</p>
            <p className="mt-2">{Object.keys(edition.assets).length} semantic slots · runtime {edition.runtimeApiVersion}</p>
          </section>
        </aside>
      </div>
    </main>
  );
}
