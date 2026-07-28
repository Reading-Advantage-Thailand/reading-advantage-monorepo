"use client";

import { useMemo, useState } from "react";
import {
  buildExemplarPublicApiSurface,
  runExemplarSimulation,
} from "@reading-advantage/advantage-play-kit/scaffolding";
import {
  OWNER_APPROVED_CANONICAL_BINDINGS,
} from "@reading-advantage/advantage-play-kit/assets";
import {
  createResponsiveDebugOverlays,
  type LayoutProfile,
  type ResponsiveInputMode,
} from "@reading-advantage/advantage-play-kit/responsive";
import {
  EducationalPrompt,
  GameFeedback,
  GameNavigationControls,
  GameProgress,
  GameResultPanel,
} from "@reading-advantage/advantage-play-kit/presentation";
import { parseQcControls } from "@reading-advantage/advantage-play-kit/qc";

import { ExistingCoreCartridgeQc } from "./ExistingCoreCartridgeQc";
import { StandardPackQc, type StandardPackQcPreview } from "./StandardPackQc";

const CONTENT_FIXTURES = {
  "english-short": [
    { term: "river", translation: "แม่น้ำ" },
    { term: "bright", translation: "สว่าง" },
  ],
  "english-long": [
    { term: "extraordinary", translation: "ไม่ธรรมดา" },
    { term: "environmental responsibility", translation: "ความรับผิดชอบต่อสิ่งแวดล้อม" },
  ],
  "thai-short": [
    { term: "ใจดี", translation: "kind" },
    { term: "แม่น้ำ", translation: "river" },
  ],
  "thai-long": [
    { term: "การเรียนรู้ผ่านการผจญภัย", translation: "learning through adventure" },
    { term: "ความรับผิดชอบต่อสิ่งแวดล้อม", translation: "environmental responsibility" },
  ],
  duplicates: [
    { term: "light", translation: "แสง" },
    { term: "light", translation: "เบา" },
  ],
} as const;

/** Props for the Advantage Games APK authoring and quality-control surface. */
export interface AdvantageGamesAuthoringQcProps {
  /** Generated selected-output preview bound to the accepted standard-pack release. */
  readonly preview: StandardPackQcPreview;
}

function capabilitiesFor(inputMode: ResponsiveInputMode) {
  if (inputMode === "touch") return { touch: true, pointer: false, keyboard: false };
  if (inputMode === "hybrid") return { touch: true, pointer: true, keyboard: true };
  return { touch: false, pointer: true, keyboard: true };
}

/**
 * Renders the working authoring/QC field lab for the public APK exemplar and canonical pack.
 * @param props Pinned finite canonical-pack preview.
 * @returns Responsive controls, diagnostics, result inspection, and searchable release QC.
 */
export function AdvantageGamesAuthoringQc({ preview }: AdvantageGamesAuthoringQcProps) {
  const exemplar = useMemo(() => buildExemplarPublicApiSurface(), []);
  const [profile, setProfile] = useState<"auto" | LayoutProfile>("auto");
  const [inputMode, setInputMode] = useState<ResponsiveInputMode>("pointer-keyboard");
  const [fixture, setFixture] = useState<keyof typeof CONTENT_FIXTURES>("english-short");
  const [textScale, setTextScale] = useState(1);
  const [safeRegions, setSafeRegions] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [restartCount, setRestartCount] = useState(0);
  const [operatorMessage, setOperatorMessage] = useState("Exemplar ready for inspection.");

  const viewport = profile === "wide"
    ? { width: 1440, height: 900 }
    : { width: 390, height: 844 };
  const controls = parseQcControls({
    fixture,
    difficulty: "standard",
    profile,
    inputMode,
    textScale,
    touchScale: inputMode === "pointer-keyboard" ? 1 : 1.15,
    safeRegions,
  });
  const composition = exemplar.resolveComposition({
    viewport,
    safeArea: { top: 16, right: 12, bottom: 16, left: 12 },
    inputCapabilities: capabilitiesFor(inputMode),
    accessibility: { textScale: controls.textScale, touchScale: controls.touchScale },
    ...(profile === "auto" ? {} : { preferredProfile: profile }),
  });
  const simulation = useMemo(
    () => runExemplarSimulation(CONTENT_FIXTURES[fixture]),
    [fixture],
  );
  const overlays = composition.supported ? createResponsiveDebugOverlays(composition) : [];
  const selectedUnion = exemplar.definition.manifest.semanticAssetRequirements;

  return (
    <main className="min-h-screen bg-[#07110e] text-[#f4f0dc]">
      <header className="border-b border-[#335c4b] bg-[#0c1b16] px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#8ce0b8]">Advantage Play Kit / Authoring station 11</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-4xl font-black tracking-tight sm:text-5xl">Cartridge Field Lab</h1>
              <p className="mt-2 max-w-3xl text-sm text-[#b9c9bf]">Exercise the complete public exemplar, recompose compact and wide layouts, inspect semantic selected outputs, and verify accessible results before a cartridge reaches a host.</p>
            </div>
            <div className="rounded border border-[#4f806a] bg-[#102820] px-4 py-3 font-mono text-xs text-[#b9f6d5]">
              release {preview.version}<br />restart {restartCount}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 xl:grid-cols-[20rem_minmax(0,1fr)_20rem] sm:px-8">
        <aside aria-label="Authoring controls" className="space-y-5 rounded border border-[#335c4b] bg-[#0c1b16] p-5">
          <div>
            <h2 className="font-serif text-xl font-bold">Composition console</h2>
            <p className="mt-1 text-xs text-[#8fa99b]">Geometry, not user agent or CSS breakpoint, selects the runtime profile.</p>
          </div>

          <fieldset>
            <legend className="text-xs font-bold uppercase tracking-widest text-[#8ce0b8]">Profile request</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["auto", "compact", "wide"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={profile === value}
                  onClick={() => setProfile(value)}
                  className="min-h-11 rounded border border-[#426b59] px-2 text-xs font-bold capitalize hover:bg-[#16372b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3c969] aria-pressed:bg-[#8ce0b8] aria-pressed:text-[#07110e]"
                >
                  {value}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block text-xs font-bold uppercase tracking-widest text-[#8ce0b8]">
            Input mode
            <select
              className="mt-2 min-h-11 w-full rounded border border-[#426b59] bg-[#07110e] px-3 text-sm text-[#f4f0dc]"
              value={inputMode}
              onChange={(event) => setInputMode(event.target.value as ResponsiveInputMode)}
            >
              <option value="pointer-keyboard">Pointer + keyboard</option>
              <option value="touch">Touch</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </label>

          <label className="block text-xs font-bold uppercase tracking-widest text-[#8ce0b8]">
            Content fixture
            <select
              className="mt-2 min-h-11 w-full rounded border border-[#426b59] bg-[#07110e] px-3 text-sm text-[#f4f0dc]"
              value={fixture}
              onChange={(event) => setFixture(event.target.value as keyof typeof CONTENT_FIXTURES)}
            >
              {Object.keys(CONTENT_FIXTURES).map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>

          <label className="block text-xs font-bold uppercase tracking-widest text-[#8ce0b8]">
            Text scale {textScale.toFixed(2)}×
            <input
              className="mt-2 h-6 min-h-6 w-full accent-[#f3c969]"
              type="range"
              min="1"
              max="1.5"
              step="0.25"
              value={textScale}
              onChange={(event) => setTextScale(Number(event.target.value))}
            />
          </label>

          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <span className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[#426b59] bg-[#07110e]">
              <input
                type="checkbox"
                checked={safeRegions}
                onChange={(event) => setSafeRegions(event.target.checked)}
                className="peer h-full w-full cursor-pointer appearance-none rounded border-0 bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3c969]"
              />
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute h-4 w-4 text-[#8ce0b8] opacity-0 peer-checked:opacity-100"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            Safe-region overlays
          </label>

          <GameNavigationControls
            className="grid grid-cols-2 gap-2 [&_button]:min-h-11 [&_button]:rounded [&_button]:border [&_button]:border-[#426b59] [&_button]:px-2 [&_button]:text-xs [&_button]:font-bold [&_button]:hover:bg-[#16372b] [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-2 [&_button]:focus-visible:outline-[#f3c969]"
            paused={paused}
            muted={muted}
            onPauseChange={setPaused}
            onMutedChange={setMuted}
            onRestart={() => setRestartCount((count) => count + 1)}
            onExit={() => setOperatorMessage("Exit request captured by the QC host adapter.")}
          />
        </aside>

        <section aria-label="Composition preview" className="min-w-0 rounded border border-[#335c4b] bg-[#0c1b16] p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#29483c] pb-4">
            <div>
              <h2 className="font-serif text-2xl font-bold">Responsive stage</h2>
              <p className="font-mono text-xs text-[#8fa99b]">{composition.supported ? `${composition.profile} · ${composition.inputMode}` : composition.code}</p>
            </div>
            <p role="status" className="rounded bg-[#132f25] px-3 py-2 text-xs text-[#b9f6d5]">{paused ? "Simulation paused" : operatorMessage}</p>
          </div>

          {composition.supported ? (
            <div
              className="relative mx-auto mt-5 overflow-hidden rounded border-2 border-[#4f806a] bg-[#07110e]"
              style={{ aspectRatio: `${viewport.width} / ${viewport.height}`, maxHeight: "38rem" }}
            >
              <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(#28493c_1px,transparent_1px),linear-gradient(90deg,#28493c_1px,transparent_1px)] [background-size:24px_24px]" />
              <div className="absolute inset-[12%] grid place-items-center rounded-full border border-dashed border-[#f3c969]/70 text-center text-xs text-[#f3c969]">
                Gameplay viewport<br />{Math.round(composition.regions.gameplay.width)} × {Math.round(composition.regions.gameplay.height)}
              </div>
              {safeRegions ? overlays.filter((overlay) => overlay.rect.width > 0 && overlay.rect.height > 0).map((overlay) => (
                <div
                  key={overlay.id}
                  data-testid="safe-region-overlay"
                  className="absolute border border-[#8ce0b8]/70 bg-[#8ce0b8]/5 p-1 font-mono text-[8px] text-[#b9f6d5]"
                  style={{
                    left: `${(overlay.rect.x / viewport.width) * 100}%`,
                    top: `${(overlay.rect.y / viewport.height) * 100}%`,
                    width: `${(overlay.rect.width / viewport.width) * 100}%`,
                    height: `${(overlay.rect.height / viewport.height) * 100}%`,
                  }}
                >{overlay.id}</div>
              )) : null}
            </div>
          ) : (
            <div role="alert" className="mt-5 rounded border border-[#cc6b5a] bg-[#3a1712] p-4">{composition.guidance}</div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded border border-[#29483c] bg-[#091713] p-4">
              <EducationalPrompt prompt={CONTENT_FIXTURES[fixture][0].term} instruction={`Match: ${CONTENT_FIXTURES[fixture][0].translation}`} />
              <GameProgress className="mt-4" current={simulation.results.correctAnswers} total={simulation.results.totalAttempts} />
              <GameFeedback className="mt-4 text-[#8ce0b8]" kind="correct">Deterministic result accepted exactly once.</GameFeedback>
            </div>
            <GameResultPanel
              className="rounded border border-[#29483c] bg-[#091713] p-4 [&_button]:mr-2 [&_button]:mt-3 [&_button]:min-h-11 [&_button]:rounded [&_button]:border [&_button]:border-[#426b59] [&_button]:px-3"
              outcome="complete"
              score={simulation.results.score}
              accuracy={simulation.results.accuracy}
              correctAnswers={simulation.results.correctAnswers}
              totalAttempts={simulation.results.totalAttempts}
              xp={simulation.results.xp}
              requiredCredit="Pixel art assets by ElvGames"
              onReplay={() => setRestartCount((count) => count + 1)}
              onExit={() => setOperatorMessage("Result exit request captured.")}
            />
          </div>
        </section>

        <aside aria-label="Semantic release inspection" className="space-y-5 rounded border border-[#335c4b] bg-[#0c1b16] p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#8ce0b8]">Selected union</p>
            <h2 className="mt-1 font-serif text-xl font-bold">Exemplar bindings</h2>
          </div>
          <ul className="space-y-3">
            {exemplar.semanticAssetRequirements.map((requirement) => {
              const binding = OWNER_APPROVED_CANONICAL_BINDINGS.bindings.find((candidate) => candidate.role === requirement.role && candidate.state === requirement.state);
              return (
                <li key={`${requirement.role}:${requirement.state}`} className="border-l-2 border-[#f3c969] pl-3">
                  <span className="block text-xs font-bold">{requirement.role} / {requirement.state}</span>
                  <span className="mt-1 block break-all font-mono text-[10px] text-[#8fa99b]">{binding?.semanticKey ?? "unmapped"}</span>
                </li>
              );
            })}
          </ul>
          <dl className="space-y-3 border-t border-[#29483c] pt-4 text-xs">
            <div><dt className="font-bold text-[#8ce0b8]">Materialization</dt><dd>accepted-cartridge-selected-union-only</dd></div>
            <div><dt className="font-bold text-[#8ce0b8]">Mappings</dt><dd>Owner-approved forward product bindings; not legacy evidence.</dd></div>
            <div><dt className="font-bold text-[#8ce0b8]">Requested keys</dt><dd>{selectedUnion.length}</dd></div>
          </dl>
        </aside>
      </div>

      <ExistingCoreCartridgeQc preview={preview} />

      <section aria-label="Canonical pack release gallery" className="border-t border-[#335c4b] bg-[#07110e] px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <StandardPackQc preview={preview} />
        </div>
      </section>
    </main>
  );
}
