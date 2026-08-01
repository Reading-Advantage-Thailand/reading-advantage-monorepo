"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  inspectCompositionGeometry,
  type ResponsiveComposition,
} from "@reading-advantage/advantage-play-kit/responsive";
import {
  PUZZLE_QC_REGISTRY,
  getPuzzleQcRegistryEntry,
  loadPuzzleQcCartridge,
  type PuzzleQcCartridge,
  type PuzzleQcInputModality,
  type PuzzleQcSelectedUnion,
  type PuzzleQcSession,
  type PuzzleQcSessionSnapshot,
} from "@reading-advantage/game-cartridges/puzzle-qc";

import type { StandardPackQcAsset, StandardPackQcPreview } from "./StandardPackQc";

const EMPTY_SNAPSHOT: PuzzleQcSessionSnapshot = Object.freeze({
  inputCounts: Object.freeze({ keyboard: 0, pointer: 0, touch: 0 }),
  lastActions: Object.freeze([]),
  claimIds: Object.freeze([]),
});

/** Props for the Legacy Puzzle cohort's isolated Advantage Games QC surface. */
export interface LegacyPuzzleCartridgeQcProps {
  /** Generated, finite preview media bound to the accepted standard-pack release. */
  readonly preview: StandardPackQcPreview;
  /** Server-issued descriptor-aware selected unions for precisely the five puzzle titles. */
  readonly selections: readonly PuzzleQcSelectedUnion[];
}

/** Draws one compact native-input and selected-union diagnostic without creating a production game host. */
function drawPuzzleQcCanvas(
  canvas: HTMLCanvasElement,
  cartridge: PuzzleQcCartridge,
  snapshot: PuzzleQcSessionSnapshot,
  profile: "compact" | "wide" | "unsupported",
): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  const { width, height } = canvas;
  context.clearRect(0, 0, width, height);
  context.fillStyle = profile === "compact" ? "#163327" : "#17314a";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#8ce0b8";
  context.strokeRect(18, 18, width - 36, height - 36);
  context.textAlign = "center";
  context.fillStyle = "#f4f0dc";
  context.font = "700 26px sans-serif";
  context.fillText(cartridge.manifest.title, width / 2, 62);
  context.fillStyle = "#b9f6d5";
  context.font = "600 16px sans-serif";
  context.fillText(`${profile} / source-bound mechanic evidence`, width / 2, 94);
  context.fillStyle = "#f3c969";
  context.font = "700 18px sans-serif";
  context.fillText("Native input and selected media / QC only", width / 2, 154, width - 80);
  context.fillStyle = "#b9c9bf";
  context.font = "12px monospace";
  context.fillText(`keyboard ${snapshot.inputCounts.keyboard} · pointer ${snapshot.inputCounts.pointer} · touch ${snapshot.inputCounts.touch}`, width / 2, 204, width - 72);
  context.fillText(`claims ${snapshot.claimIds.join(", ")}`, width / 2, 235, width - 72);
  context.fillStyle = "#8ce0b8";
  context.beginPath();
  context.arc(width * 0.72, height * 0.72, 38, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#07110e";
  context.font = "700 14px sans-serif";
  context.fillText("INPUT", width * 0.72, height * 0.72 + 5);
}

/** Maps a browser pointer event type to the explicit QC input counter. */
function modalityFromPointer(pointerType: string): PuzzleQcInputModality {
  return pointerType === "touch" ? "touch" : "pointer";
}

/** Resolves only the title-selected preview assets and rejects any missing selected media output. */
function selectedAssetsFor(
  cartridge: PuzzleQcCartridge | undefined,
  preview: StandardPackQcPreview,
): readonly StandardPackQcAsset[] {
  if (!cartridge) return [];
  return cartridge.descriptorSelection.semanticKeys.map((key) => {
    const asset = preview.assets.find((candidate) => candidate.key === key);
    if (!asset) throw new Error(`Legacy Puzzle QC preview does not contain selected media ${key}`);
    return asset;
  });
}

/**
 * Renders the five accepted Legacy Puzzle cartridges solely in Advantage Games `/qc`.
 * @param props Pinned preview media and server-issued title selections.
 * @returns One persistent canvas, responsive native-input diagnostics, claims, and selected media inspection.
 */
export function LegacyPuzzleCartridgeQc({ preview, selections }: LegacyPuzzleCartridgeQcProps) {
  const [selectedId, setSelectedId] = useState(PUZZLE_QC_REGISTRY[0].id);
  const [cartridge, setCartridge] = useState<PuzzleQcCartridge>();
  const [snapshot, setSnapshot] = useState<PuzzleQcSessionSnapshot>(EMPTY_SNAPSHOT);
  const [composition, setComposition] = useState<ResponsiveComposition>();
  const [viewport, setViewport] = useState({ width: 390, height: 844 });
  const [loadError, setLoadError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<PuzzleQcSession | undefined>(undefined);
  const selectionById = useMemo(() => new Map(selections.map((selection) => [selection.titleId, selection])), [selections]);

  useEffect(() => {
    const updateViewport = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    const selection = selectionById.get(selectedId);
    if (!selection) {
      setLoadError(`Puzzle QC selection is missing resolver-issued registration for ${selectedId}`);
      return undefined;
    }
    let active = true;
    void loadPuzzleQcCartridge(selectedId, selection)
      .then((loaded) => {
        if (!active) return;
        const session = loaded.createQcSession();
        sessionRef.current = session;
        setCartridge(loaded);
        setSnapshot(session.snapshot());
        setLoadError("");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "Puzzle QC cartridge failed to load");
      });
    return () => {
      active = false;
    };
  }, [selectedId, selectionById]);

  useEffect(() => {
    const session = sessionRef.current;
    if (!session || cartridge?.manifest.id !== selectedId) return;
    setComposition(session.resize(viewport));
    setSnapshot(session.snapshot());
  }, [cartridge, selectedId, viewport]);

  const selectedAssets = useMemo(() => selectedAssetsFor(cartridge, preview), [cartridge, preview]);
  const profile = composition?.supported ? composition.profile : "unsupported";
  const geometryIssues = composition?.supported ? inspectCompositionGeometry(composition) : [];

  useEffect(() => {
    if (!canvasRef.current || !cartridge) return;
    drawPuzzleQcCanvas(canvasRef.current, cartridge, snapshot, profile);
  }, [cartridge, profile, snapshot]);

  const dispatch = (modality: PuzzleQcInputModality) => {
    sessionRef.current?.dispatch(modality);
    const session = sessionRef.current;
    if (session) setSnapshot(session.snapshot());
  };

  const selectCartridge = (candidate: string) => {
    const entry = getPuzzleQcRegistryEntry(candidate);
    if (entry) setSelectedId(entry.id);
  };

  return (
    <section aria-label="Legacy Puzzle cartridge QC" className="border-t border-[#335c4b] bg-[#081510] px-4 py-8 text-[#f4f0dc] sm:px-8" data-loaded-cartridge={cartridge?.manifest.id ?? ""}>
      <div className="mx-auto max-w-7xl">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#8ce0b8]">Legacy Puzzle / Advantage Games QC only</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-serif text-3xl font-black">Legacy Puzzle cartridge QC</h2>
            <p className="mt-2 max-w-3xl text-sm text-[#b9c9bf]">Accepted v2 dossiers bind source-shaped mechanics, selected media, and native input here only. Production catalog exposure, Reading, Primary, legacy reuse/ingestion, retirement, cutover, and deployment remain blocked.</p>
          </div>
          <p className="rounded border border-[#4f806a] bg-[#102820] px-3 py-2 font-mono text-xs text-[#b9f6d5]">selected union / QC only</p>
        </div>

        <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[18rem_minmax(0,1fr)_20rem]">
          <aside aria-label="Legacy Puzzle QC controls" className="min-w-0 space-y-5 rounded border border-[#335c4b] bg-[#0c1b16] p-5">
            <label className="block text-xs font-bold uppercase tracking-widest text-[#8ce0b8]">
              QC cartridge
              <select className="mt-2 min-h-11 w-full rounded border border-[#426b59] bg-[#07110e] px-3 text-sm text-[#f4f0dc]" onChange={(event) => selectCartridge(event.target.value)} value={selectedId}>
                {PUZZLE_QC_REGISTRY.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}
              </select>
            </label>
            <dl className="space-y-2 text-xs">
              <div><dt className="font-bold text-[#8ce0b8]">Layout</dt><dd data-testid="legacy-puzzle-layout-profile">{profile}</dd></div>
              <div><dt className="font-bold text-[#8ce0b8]">Geometry issues</dt><dd data-testid="legacy-puzzle-geometry-issues">{geometryIssues.length}</dd></div>
              <div><dt className="font-bold text-[#8ce0b8]">Input counts</dt><dd data-testid="legacy-puzzle-input-counts">keyboard {snapshot.inputCounts.keyboard} · pointer {snapshot.inputCounts.pointer} · touch {snapshot.inputCounts.touch}</dd></div>
              <div><dt className="font-bold text-[#8ce0b8]">Last actions</dt><dd data-testid="legacy-puzzle-last-actions">{snapshot.lastActions.join(", ") || "none"}</dd></div>
            </dl>
            <p className="rounded border border-[#426b59] bg-[#102820] p-3 text-xs text-[#b9c9bf]">Focus the canvas, then press Enter or Space. Pointer and touch presses are dispatched through the selected cartridge’s physical-input normalizer. This route is an accessibility and media inspection surface, not a host.</p>
          </aside>

          <div className="min-w-0 rounded border border-[#335c4b] bg-[#0c1b16] p-4 sm:p-5">
            {loadError ? <p role="alert" className="rounded border border-[#cc6b5a] bg-[#3a1712] p-4">{loadError}</p> : null}
            {cartridge ? (
              <>
                <canvas
                  aria-label={`${cartridge.manifest.title} puzzle QC canvas`}
                  className="block aspect-[12/7] h-auto w-full rounded border-2 border-[#4f806a] bg-[#102820] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3c969]"
                  data-testid="legacy-puzzle-qc-canvas"
                  height={420}
                  onKeyDown={(event) => {
                    if (["Enter", "Space", "ArrowRight"].includes(event.code)) dispatch("keyboard");
                  }}
                  onPointerDown={(event) => dispatch(modalityFromPointer(event.pointerType))}
                  ref={canvasRef}
                  role="img"
                  tabIndex={0}
                  width={720}
                >
                  {cartridge.manifest.title} source-bound puzzle QC canvas
                </canvas>
                <pre className="mt-4 max-w-full overflow-x-auto rounded border border-[#29483c] bg-[#07110e] p-3 text-[10px] text-[#b9c9bf]" data-testid="legacy-puzzle-claim-ids">{JSON.stringify(snapshot.claimIds)}</pre>
              </>
            ) : <p role="status">Loading Legacy Puzzle QC cartridge…</p>}
          </div>

          <aside aria-label="Legacy Puzzle selected media" className="min-w-0 rounded border border-[#335c4b] bg-[#0c1b16] p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-[#8ce0b8]">Selected media only</p>
            <p className="mt-2 font-mono text-xs text-[#b9c9bf]" data-testid="legacy-puzzle-delivery-count">{selectedAssets.length} of {preview.assets.length} QC assets</p>
            <ul className="mt-4 space-y-3">
              {selectedAssets.map((asset) => (
                <li className="min-w-0 rounded border border-[#29483c] bg-[#091713] p-3" data-selected-asset-key={asset.key} data-testid="legacy-puzzle-selected-asset" key={asset.key}>
                  <span className="block break-all font-mono text-[10px] text-[#8ce0b8]">{asset.key}</span>
                  {asset.mediaType === "image" ? <Image alt={`Selected Legacy Puzzle QC asset ${asset.key}`} className="mt-2 h-12 w-12 object-contain [image-rendering:pixelated]" height={48} src={asset.previewUrl} unoptimized width={48} /> : null}
                  {asset.mediaType === "audio" ? <audio aria-label={`Selected Legacy Puzzle QC audio ${asset.key}`} className="mt-2 w-full max-w-full" controls preload="metadata" src={asset.previewUrl} /> : null}
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-[#29483c] pt-4 text-xs text-[#8fa99b]">{preview.requiredCredit}</p>
          </aside>
        </div>
      </div>
    </section>
  );
}
